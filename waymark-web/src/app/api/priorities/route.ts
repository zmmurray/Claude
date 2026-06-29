import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loadContext } from "@/lib/data";
import { buildContext, STRATEGIST_PERSONA } from "@/lib/strategy";
import { callModel } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A short, real reason WHY the top project is the priority — for the Projects page.
export async function POST() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const ctx = await loadContext(supabase, user.id);
  if (!ctx.projects.length) return NextResponse.json({ reason: "" });

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const prompt = `Today is ${today}.
${buildContext(ctx)}

In ONE or TWO short, concrete sentences, explain WHY the top-priority project right now is the priority — the real reason: what it unlocks, a deadline, income/money pressure, or how it moves their main goal forward. Name the project. Do NOT say "because it's important" or just restate the ranking — give the actual reason. Plain and specific. No preamble — just the explanation.`;

  const reason = (await callModel(STRATEGIST_PERSONA, [{ role: "user", content: prompt }], 220)).trim();
  return NextResponse.json({ reason });
}
