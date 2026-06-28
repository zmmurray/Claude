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
export function focusPrompt(context: string, steer?: string, today?: string): string {
  return `${today ? `Today is ${today}.\n` : ""}${context}

${steer ? `The user just told you: "${steer}". Weigh this heavily — it changes the answer:
- If they're WIPED / low on energy: rest comes FIRST. Lead by telling them it's okay to take
  a short break or call it for now. Return an empty items list (or at most ONE small, genuinely
  low-effort thing if they clearly want a little momentum) — never deep or heavy work. Only push
  a task if a HARD deadline is truly due today and skipping it would cause real harm — and even
  then, suggest a short rest first. A soft deadline, or anything a day or two out, does NOT
  override rest.
- If they're SHORT ON TIME: give the single highest-leverage thing that fits a small window.
- If something BLEW UP: focus on the fire; let the rest wait.
` : ""}
Decide what they should focus on right now. Lead with anything small and urgent that
truly must happen first, then the highest-leverage work toward their goals. Keep the list
SHORT (1–4 items) — overwhelm is failure.

Ordering rules:
- A project with a SOONER deadline should generally rank ABOVE one with a later deadline or
  no deadline, unless the deadline-free one is clearly far more important.
- If a note implies a time-based follow-up is due (e.g. "emailed the lead a week ago"),
  you may gently surface it.

If there's genuinely nothing pressing — or the user needs rest — return an empty items list
and say so warmly in the gist.

Return ONLY JSON in this shape (no prose, no code fences):
{
  "gist": "one or two warm sentences on where things stand and the play right now",
  "items": [
    { "title": "the concrete thing to do", "why": "one short, plain reason", "project": "which project it's part of" }
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
export function chatSystem(context: string, today?: string, isNew = false): string {
  return `${STRATEGIST_PERSONA}
${today ? `\nToday is ${today}.` : ""}

Here is everything you currently know about the user:
${context}
${isNew ? `
This is a first-time setup — you barely know them yet. Gently guide them through it, asking
ONE or TWO questions at a time (never a wall), warm and conversational:
1. The big picture — what they're ultimately working toward and why (e.g. "leave my full-time
   job and build steady income from a lifestyle business").
2. Their situation and constraints — current job, how much time and energy they realistically
   have, any money/runway pressure.
3. Each project on their plate — what it is, which goal it serves, any deadline, how big.
4. What would make the next stretch feel like a win.
Don't interrogate — react like a person, reflect back what you hear, and move on once you have
the big picture plus their main projects.
` : ""}
Have a natural conversation. Keep replies short and plain — no bullet-point essays unless asked.

Saving what you learn — append a line with exactly "<<UPDATE>>" then JSON at the END of your
reply whenever there's anything to save (the user never sees it):

<<UPDATE>>
{
  "context": "a concise, COMPLETE 'about me': their situation, life goals, constraints, and what they're working toward",
  "goals": [{"name":"..."}],
  "projects": [{"name":"...","goal":"matching goal name","importance":1-5,"deadlineType":"none|soft|hard","deadline":"YYYY-MM-DD","notes":"...","tasks":[{"title":"...","urgent":false}]}]
}

Include only what's new or changed. "context" is REPLACED each time, so keep it concise but
complete — it shapes every future recommendation, so put their real priorities there (e.g. that
income-generating work matters most right now while they're trying to leave their job).

Deadlines — never invent false precision:
- "hard" ONLY for clearly firm dates ("hard deadline", "due Friday at 5", "must submit by the 14th").
- Fuzzy/hedged timing ("tomorrow or the next day", "around Friday", "soon") → "soft", using the
  LATER end of any range. When unsure, prefer "soft". Convert to YYYY-MM-DD using today's date.
- After recording/changing a deadline, briefly tell the user what you set so they can correct it.
- Record dated facts ("emailed the lead Thursday") in that project's notes for soft follow-ups.
- To change something that exists, reuse its exact name.

Never show the user the <<UPDATE>> block or mention JSON.

When you have enough to recommend where to focus (you know their main projects and roughly what
matters), add a line with exactly "<<READY>>" at the very end — it becomes a button to their
focus. Don't add it until you genuinely have the basics; once you do, add it.`;
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
