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
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const raw = await callModel(STRATEGIST_PERSONA, [{ role: "user", content: focusPrompt(contextText, steer, today) }]);
  const parsed = parseFocus(raw) ?? { gist: "I couldn't read the plan just now — try again in a sec.", items: [] };

  const { data: inserted } = await supabase
    .from("focus_snapshots")
    .insert({ user_id: user.id, gist: parsed.gist, items: parsed.items })
    .select("id")
    .single();

  return NextResponse.json({ ...parsed, snapshotId: inserted?.id ?? null });
}
