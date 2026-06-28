import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal, Project, TaskItem, ContextUpdate } from "./types";

/** Load everything the strategist needs for a user. */
export async function loadContext(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, { data: goals }, { data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("context").eq("id", userId).maybeSingle(),
    supabase.from("goals").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("projects").select("*").eq("user_id", userId).eq("is_done", false).order("created_at"),
    supabase.from("tasks").select("*").eq("user_id", userId).eq("done", false).order("created_at"),
  ]);
  return {
    profileContext: profile?.context ?? "",
    goals: (goals ?? []) as Goal[],
    projects: (projects ?? []) as Project[],
    tasks: (tasks ?? []) as TaskItem[],
  };
}

/** Apply a strategist-proposed update: create new goals/projects/tasks. Returns counts. */
export async function applyUpdate(
  supabase: SupabaseClient,
  userId: string,
  update: ContextUpdate
): Promise<{ goals: number; projects: number; tasks: number }> {
  let goalCount = 0, projectCount = 0, taskCount = 0;

  // Existing goals by lowercased name → id.
  const { data: existingGoals } = await supabase.from("goals").select("id,name").eq("user_id", userId);
  const goalIdByName = new Map<string, string>();
  (existingGoals ?? []).forEach((g: any) => goalIdByName.set(String(g.name).toLowerCase(), g.id));

  for (const g of update.goals ?? []) {
    const name = (g.name ?? "").trim();
    if (!name || goalIdByName.has(name.toLowerCase())) continue;
    const { data, error } = await supabase
      .from("goals").insert({ user_id: userId, name, notes: g.notes ?? "" }).select("id").single();
    if (!error && data) { goalIdByName.set(name.toLowerCase(), data.id); goalCount++; }
  }

  // Existing projects by lowercased name → { id, notes }.
  const { data: existingProjects } = await supabase.from("projects").select("id,name,notes").eq("user_id", userId);
  const projByName = new Map<string, { id: string; notes: string }>();
  (existingProjects ?? []).forEach((p: any) => projByName.set(String(p.name).toLowerCase(), { id: p.id, notes: p.notes ?? "" }));

  for (const p of update.projects ?? []) {
    const name = (p.name ?? "").trim();
    if (!name) continue;
    const goalId = p.goal ? goalIdByName.get(p.goal.toLowerCase()) ?? null : null;
    const deadlineType = ["none", "soft", "hard"].includes(p.deadlineType ?? "") ? p.deadlineType! : undefined;
    const existing = projByName.get(name.toLowerCase());
    let projectId: string;

    if (existing) {
      // Merge onto the existing project: set deadline/importance if given, append notes.
      const patch: Record<string, unknown> = {};
      if (typeof p.importance === "number") patch.importance = Math.min(5, Math.max(1, Math.round(p.importance)));
      if (deadlineType) { patch.deadline_type = deadlineType; patch.deadline = deadlineType === "none" ? null : p.deadline ?? null; }
      if (goalId) patch.goal_id = goalId;
      if (p.notes && p.notes.trim()) patch.notes = existing.notes ? `${existing.notes}\n${p.notes.trim()}` : p.notes.trim();
      if (Object.keys(patch).length) await supabase.from("projects").update(patch).eq("id", existing.id);
      projectId = existing.id;
    } else {
      const { data: proj, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId, goal_id: goalId, name,
          importance: Math.min(5, Math.max(1, Math.round(p.importance ?? 3))),
          deadline_type: deadlineType ?? "none",
          deadline: !deadlineType || deadlineType === "none" ? null : p.deadline ?? null,
          notes: p.notes ?? "",
        })
        .select("id").single();
      if (error || !proj) continue;
      projectCount++;
      projectId = proj.id;
      projByName.set(name.toLowerCase(), { id: proj.id, notes: p.notes ?? "" });
    }

    for (const t of p.tasks ?? []) {
      const title = (t.title ?? "").trim();
      if (!title) continue;
      const effort = ["quick", "medium", "deep"].includes(t.effort ?? "") ? t.effort! : "medium";
      const { error: te } = await supabase.from("tasks").insert({
        user_id: userId, project_id: projectId, title, urgent: !!t.urgent, effort,
      });
      if (!te) taskCount++;
    }
  }
  return { goals: goalCount, projects: projectCount, tasks: taskCount };
}
