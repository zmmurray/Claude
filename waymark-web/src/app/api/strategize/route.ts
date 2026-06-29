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

  // Guarantee open URGENT tasks lead the focus — don't rely on the model alone.
  // Skip when the user explicitly steered (e.g. "I need a break").
  let items = parsed.items;
  if (!steer) {
    const projName = (pid: string) => ctx.projects.find((p) => p.id === pid)?.name;
    const urgent = ctx.tasks
      .filter((t) => t.urgent)
      .map((t) => ({ title: t.title, why: "You wanted this done now.", kind: "quick" as const, project: projName(t.project_id) }));
    if (urgent.length) {
      const seen = new Set(urgent.map((i) => i.title.toLowerCase()));
      items = [...urgent, ...parsed.items.filter((i) => !seen.has(i.title.toLowerCase()))].slice(0, 6);
    }
  }

  const { data: inserted } = await supabase
    .from("focus_snapshots")
    .insert({ user_id: user.id, gist: parsed.gist, items })
    .select("id")
    .single();

  return NextResponse.json({ gist: parsed.gist, items, snapshotId: inserted?.id ?? null });
}
