import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loadContext, applyUpdate } from "@/lib/data";
import { buildContext, chatSystem, splitChatReply } from "@/lib/strategy";
import { callModel, type ChatTurn } from "@/lib/llm";

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
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const isNew = ctx.projects.length === 0;
  const raw = await callModel(chatSystem(buildContext(ctx), today, isNew), turns, 1500);
  const ready = raw.includes("<<READY>>");
  const cleaned = raw.split("<<READY>>").join("").trim();
  const { text, update } = splitChatReply(cleaned);

  let changed = false;
  let saved = "";
  if (update) {
    const counts = await applyUpdate(supabase, user.id, update);
    changed = counts.names.length > 0 || counts.tasks > 0 || counts.goals > 0 || counts.context;
    const parts: string[] = [];
    if (counts.names.length) parts.push(counts.names.join(", "));
    if (counts.tasks) parts.push(`${counts.tasks} to-do${counts.tasks > 1 ? "s" : ""}`);
    saved = parts.length ? `Saved — ${parts.join(" · ")}` : counts.context ? "Noted." : "";
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
