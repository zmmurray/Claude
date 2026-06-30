import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loadContext, applyUpdate } from "@/lib/data";
import { buildContext, chatSystem, splitChatReply, extractUpdatePrompt } from "@/lib/strategy";
import { callModel, extractJSON, type ChatTurn } from "@/lib/llm";
import type { ContextUpdate } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The model call can take longer than Vercel's default 10s function limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let message = "";
  try { message = String((await req.json())?.message ?? "").trim(); } catch {}
  if (!message) return NextResponse.json({ error: "empty message" }, { status: 400 });

  // Recent history (oldest → newest)
  const { data: history } = await supabase
    .from("chat_messages").select("role,content")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(12);
  const turns: ChatTurn[] = (history ?? []).reverse().map((m: any) => ({ role: m.role, content: m.content }));
  turns.push({ role: "user", content: message });

  const ctx = await loadContext(supabase, user.id);
  const contextText = buildContext(ctx);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const isNew = ctx.projects.length === 0;

  // Two passes in parallel: the conversational reply, and a dedicated extraction
  // that pulls structured updates out of the conversation (so saving never depends
  // on the chat model remembering to emit anything). Finished tasks are guarded
  // against re-adding in applyUpdate, so we can safely read the full conversation.
  const [raw, extractRaw] = await Promise.all([
    callModel(chatSystem(contextText, today, isNew), turns, 1500),
    callModel(extractUpdatePrompt(contextText, today), turns, 1000),
  ]);

  const ready = raw.includes("<<READY>>");
  const cleaned = raw.split("<<READY>>").join("").trim();
  const { text } = splitChatReply(cleaned);
  const update = extractJSON<ContextUpdate>(extractRaw);

  let changed = false;
  let saved = "";
  let applied = {
    goals: 0, projects: 0, tasks: 0, context: false, names: [] as string[],
    completed: [] as { id: string; project_id: string; title: string }[],
    added: [] as { id: string; project_id: string; project: string; title: string; urgent: boolean }[],
  };
  const hasUpdate = !!update && (
    typeof update.context === "string" || !!update.goals?.length || !!update.projects?.length || !!update.completedTasks?.length
  );
  if (hasUpdate) {
    // The user's current focus BEFORE we change anything — so we can patch it in
    // place rather than wiping and re-deciding the whole "Right now" from scratch.
    const { data: snap } = await supabase
      .from("focus_snapshots").select("id,items").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    applied = await applyUpdate(supabase, user.id, update!);
    changed = applied.names.length > 0 || applied.tasks > 0 || applied.goals > 0 || applied.context || applied.completed.length > 0;

    const parts: string[] = [];
    if (applied.completed.length) parts.push(`${applied.completed.length} done`);
    if (applied.names.length) parts.push(applied.names.join(", "));
    if (applied.tasks) parts.push(`${applied.tasks} to-do${applied.tasks > 1 ? "s" : ""}`);
    saved = parts.length ? `Saved — ${parts.join(" · ")}` : applied.context ? "Noted." : "";

    // Keep Right Now stable: don't reshuffle. Remove finished items, swap in the
    // next step for the same project when there is one, and lead with any brand-new
    // urgent task. Only fully regenerate when there's no focus to patch.
    if (snap && (applied.completed.length || applied.added.length)) {
      const completedIds = new Set(applied.completed.map((c) => c.id));
      const pool = [...applied.added];
      let items: any[] = (Array.isArray(snap.items) ? snap.items : []).flatMap((it: any) => {
        if (it.taskId && completedIds.has(it.taskId)) {
          const projId = applied.completed.find((c) => c.id === it.taskId)?.project_id;
          const repIdx = pool.findIndex((a) => a.project_id === projId && !a.urgent);
          if (repIdx >= 0) {
            const rep = pool.splice(repIdx, 1)[0];
            return [{ title: rep.title, why: "The next step here.", kind: "needle", project: rep.project, taskId: rep.id }];
          }
          return [];
        }
        return [it];
      });
      const present = new Set(items.map((i) => i.taskId).filter(Boolean));
      const urgentNew = applied.added
        .filter((a) => a.urgent && !present.has(a.id))
        .map((a) => ({ title: a.title, why: "You wanted this done now.", kind: "quick", project: a.project, taskId: a.id }));
      items = [...urgentNew, ...items];

      if (items.length === 0) await supabase.from("focus_snapshots").delete().eq("user_id", user.id);
      else await supabase.from("focus_snapshots").update({ items }).eq("id", snap.id);
    } else if (changed && !snap) {
      // No existing focus to preserve → let Right Now build fresh on next visit.
      await supabase.from("focus_snapshots").delete().eq("user_id", user.id);
    }
  }

  const reply = text || "Got it.";
  await supabase.from("chat_messages").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: reply },
  ]);

  return NextResponse.json({ reply, changed, ready, saved });
}
