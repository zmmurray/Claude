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

  // Two passes in parallel: the conversational reply (full history), and a dedicated
  // extraction that only looks at the LATEST exchange — so it captures what's new in
  // this message instead of re-deriving (and re-adding) the whole conversation.
  const recentTurns = turns.slice(-2);
  const [raw, extractRaw] = await Promise.all([
    callModel(chatSystem(contextText, today, isNew), turns, 1500),
    callModel(extractUpdatePrompt(contextText, today), recentTurns, 1000),
  ]);

  const ready = raw.includes("<<READY>>");
  const cleaned = raw.split("<<READY>>").join("").trim();
  const { text } = splitChatReply(cleaned);
  const update = extractJSON<ContextUpdate>(extractRaw);

  let changed = false;
  let saved = "";
  let applied = { goals: 0, projects: 0, tasks: 0, context: false, names: [] as string[] };
  if (update && (typeof update.context === "string" || update.goals?.length || update.projects?.length)) {
    applied = await applyUpdate(supabase, user.id, update);
    changed = applied.names.length > 0 || applied.tasks > 0 || applied.goals > 0 || applied.context;
    const parts: string[] = [];
    if (applied.names.length) parts.push(applied.names.join(", "));
    if (applied.tasks) parts.push(`${applied.tasks} to-do${applied.tasks > 1 ? "s" : ""}`);
    saved = parts.length ? `Saved — ${parts.join(" · ")}` : applied.context ? "Noted." : "";
    // Data changed → drop the old focus so Right Now regenerates fresh next visit.
    if (changed) await supabase.from("focus_snapshots").delete().eq("user_id", user.id);
  }

  const reply = text || "Got it.";
  await supabase.from("chat_messages").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: reply },
  ]);

  return NextResponse.json({ reply, changed, ready, saved });
}
