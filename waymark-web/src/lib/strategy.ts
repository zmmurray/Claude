import type { Goal, Project, TaskItem, FocusItem, ContextUpdate } from "./types";

/** Render the user's world into a compact brief the model can reason over. */
export function buildContext(opts: {
  profileContext: string;
  goals: Goal[];
  projects: Project[];
  tasks: TaskItem[];
}): string {
  const { profileContext, goals, projects, tasks } = opts;
  const lines: string[] = [];
  if (profileContext.trim()) lines.push(`About me / how I work:\n${profileContext.trim()}`);

  if (goals.length) {
    lines.push("\nMy goals (the big why):");
    for (const g of goals) lines.push(`- ${g.name}${g.notes ? ` — ${g.notes}` : ""}`);
  }

  lines.push("\nMy projects (open):");
  if (!projects.length) lines.push("- (none yet)");
  for (const p of projects) {
    const due =
      p.deadline_type === "none" || !p.deadline
        ? "no deadline"
        : `${p.deadline_type} deadline ${p.deadline}`;
    const ts = tasks.filter((t) => t.project_id === p.id && !t.done);
    lines.push(`- ${p.name} [importance ${p.importance}/5, ${due}]${p.notes ? ` — ${p.notes}` : ""}`);
    for (const t of ts) {
      const tags = [t.urgent ? "urgent" : "", t.effort].filter(Boolean).join(", ");
      lines.push(`    • ${t.title}${tags ? ` (${tags})` : ""}`);
    }
    if (!ts.length) lines.push("    • (no tasks yet)");
  }
  return lines.join("\n");
}

export const STRATEGIST_PERSONA = `You are Waymark — the user's personal strategist, like a sharp chief-of-staff.
Your job: given everything they're juggling, tell them what to focus on RIGHT NOW and why.
You optimize for what truly moves their goals forward — not busywork — but you respect
that some small, urgent things have to get done first. You are warm, direct, and brief.
You speak plainly, like a smart friend. The goal is a good life now, not after every box
is ticked — so when the important thing is handled, you tell them they're good and to stop.`;

/** Prompt for producing the "Right now" focus. The model must return JSON. */
export function focusPrompt(context: string, steer?: string): string {
  return `${context}

${steer ? `Right now, the user says: "${steer}". Factor that in.\n` : ""}
Decide what they should focus on right now. Lead with anything small and urgent that
truly must happen first, then the highest-leverage work toward their goals. Keep the list
SHORT (1–4 items) — overwhelm is failure. If there's genuinely nothing pressing, return an
empty items list and say so warmly in the gist.

Return ONLY JSON in this shape (no prose, no code fences):
{
  "gist": "one or two warm sentences on where things stand and the play right now",
  "items": [
    { "title": "the concrete thing to do", "why": "one short, plain reason", "kind": "needle | quick | admin", "project": "which project it's part of" }
  ]
}`;
}

export function parseFocus(raw: string): { gist: string; items: FocusItem[] } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    const items: FocusItem[] = Array.isArray(obj.items)
      ? obj.items.slice(0, 5).map((i: any) => ({
          title: String(i.title ?? "").trim(),
          why: String(i.why ?? "").trim(),
          kind: ["needle", "quick", "admin"].includes(i.kind) ? i.kind : "needle",
          project: i.project ? String(i.project) : undefined,
        })).filter((i: FocusItem) => i.title)
      : [];
    return { gist: String(obj.gist ?? "").trim(), items };
  } catch {
    return null;
  }
}

/** System prompt for the conversational strategist. */
export function chatSystem(context: string): string {
  return `${STRATEGIST_PERSONA}

Here is everything you currently know about the user:
${context}

Have a natural conversation. Ask clarifying questions when it helps you prioritize well.
Keep replies short and plain — no bullet-point essays unless asked.

IMPORTANT — capturing their world: when the user tells you about goals, projects, or
to-dos (or asks you to add/change them), append to the very end of your reply a line with
exactly "<<UPDATE>>" followed by JSON describing what to save, in this shape:

<<UPDATE>>
{ "goals": [{"name":"..."}], "projects": [{"name":"...","goal":"matching goal name","importance":1-5,"deadlineType":"none|soft|hard","deadline":"YYYY-MM-DD","tasks":[{"title":"...","urgent":false,"effort":"quick|medium|deep"}]}] }

Only include the parts that are new or changed. Never show the user the <<UPDATE>> block or
mention JSON — it's stripped out automatically. If nothing needs saving, don't add it.

WHEN YOU HAVE ENOUGH to recommend where they should focus (you know their main projects and
roughly what matters), add a line with exactly "<<READY>>" at the very end. It's stripped out
and turns into a button that takes them to their focus. Don't add it until you genuinely have
enough; once they've given you the basics, do add it.`;
}

const UPDATE_MARK = "<<UPDATE>>";

/** Split a chat reply into the visible text and any context update. */
export function splitChatReply(raw: string): { text: string; update: ContextUpdate | null } {
  const idx = raw.indexOf(UPDATE_MARK);
  if (idx < 0) return { text: raw.trim(), update: null };
  const text = raw.slice(0, idx).trim();
  const after = raw.slice(idx + UPDATE_MARK.length);
  const start = after.indexOf("{");
  const end = after.lastIndexOf("}");
  if (start < 0 || end <= start) return { text, update: null };
  try {
    return { text, update: JSON.parse(after.slice(start, end + 1)) as ContextUpdate };
  } catch {
    return { text, update: null };
  }
}
