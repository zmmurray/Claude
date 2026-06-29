import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loadContext } from "@/lib/data";
import { buildContext, focusPrompt, parseFocus, STRATEGIST_PERSONA } from "@/lib/strategy";
import { callModel } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The model call can take longer than Vercel's default 10s function limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let steer: string | undefined;
  try { steer = (await req.json())?.steer; } catch {}

  const ctx = await loadContext(supabase, user.id);
  const contextText = buildContext(ctx);
  const projName = (pid: string) => ctx.projects.find((p) => p.id === pid)?.name;

  // Give the model short refs (t1, t2…) for real tasks, so picked items can link back.
  const refToTaskId = new Map<string, string>();
  const taskList = ctx.tasks
    .map((t, i) => {
      const ref = `t${i + 1}`;
      refToTaskId.set(ref, t.id);
      return `[${ref}] (${projName(t.project_id) ?? "—"}) ${t.title}${t.urgent ? " — urgent" : ""}`;
    })
    .join("\n");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const raw = await callModel(STRATEGIST_PERSONA, [{ role: "user", content: focusPrompt(contextText, steer, today, taskList) }]);
  const parsed = parseFocus(raw) ?? { gist: "I couldn't read the plan just now — try again in a sec.", items: [] };

  // Map the model's refs to real task ids, then drop the transient ref.
  for (const it of parsed.items) {
    if (it.ref && refToTaskId.has(it.ref)) it.taskId = refToTaskId.get(it.ref);
    delete it.ref;
  }

  // Guarantee open URGENT tasks lead the focus — don't rely on the model alone.
  // Skip when the user explicitly steered (e.g. "I need a break").
  let items = parsed.items;
  if (!steer) {
    const urgent = ctx.tasks
      .filter((t) => t.urgent)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1)) // in the order they were added
      .slice(0, 4)
      .map((t) => ({ title: t.title, why: "You wanted this done now.", kind: "quick" as const, project: projName(t.project_id), taskId: t.id }));
    if (urgent.length) {
      const seenIds = new Set(urgent.map((i) => i.taskId));
      const seenTitles = new Set(urgent.map((i) => i.title.toLowerCase()));
      items = [...urgent, ...parsed.items.filter((i) => !(i.taskId && seenIds.has(i.taskId)) && !seenTitles.has(i.title.toLowerCase()))].slice(0, 6);
    }
  }

  const { data: inserted } = await supabase
    .from("focus_snapshots")
    .insert({ user_id: user.id, gist: parsed.gist, items })
    .select("id")
    .single();

  return NextResponse.json({ gist: parsed.gist, items, snapshotId: inserted?.id ?? null });
}
