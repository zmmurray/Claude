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
    const note = p.notes ? p.notes.replace(/\s+/g, " ").slice(0, 200) : "";
    lines.push(`- ${p.name} [importance ${p.importance}/5, ${due}]${note ? ` — ${note}` : ""}`);
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
- Anything marked URGENT is time-sensitive — lead with it. A task the user wants done imminently
  (a short timeframe like "in 2 min", "right now", "before noon") is the SINGLE most time-sensitive
  thing and goes FIRST — above important long-horizon work and deadlines that are days out. They
  told you to do it now; honor that. Never skip or demote a task for being tiny, quick, or "just
  personal." If a tiny urgent task is #1, that's correct.
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
Help the user turn vague goals into concrete projects, each with 2–4 small first tasks that are the
real next steps (not restated goals). Propose structure rather than waiting for tidy input.

Anything you and the user discuss or decide is recorded automatically — so talk as if it's already
done ("Got it — added that to University"). You never need to mention saving, JSON, or doing things
"later"; just have the conversation.

Always be accommodating. If the user wants something tracked — even a tiny or trivial task ("eat a
snack in 5 min") — treat it as added and confirm briefly ("Got it — added."). NEVER say something
isn't worth tracking, and never talk them out of capturing it. Some people want every little thing
logged, and supporting that is the job.

Keep replies short and plain — no bullet-point essays unless asked. When the user simply gives you
an update or new info (not asking for your analysis), reply with ONE short line ("Got it — updated
University.") — don't write a long take. Only write more if they asked for your read, or you need
to ask ONE clarifying question to get it right (then ask it and wait).

Deadlines — never invent false precision. Clearly firm dates are hard ("due Friday at 5"); hedged
timing ("around Friday", "tomorrow or so") is soft, using the later end; otherwise none. When you
set or change a deadline, briefly say what you set so they can correct it.

When you know their main projects and roughly what matters, add a line with exactly "<<READY>>" at
the very end — it becomes a button to their Right now focus. Add it once you have the basics.`;
}

/** A dedicated pass that pulls structured updates out of the conversation, so saving never
 *  depends on the chat model remembering to emit a side-channel block. Always returns JSON. */
export function extractUpdatePrompt(context: string, today?: string): string {
  return `${today ? `Today is ${today}.\n` : ""}You read a conversation between a user and their strategist and output any changes to record in their planner. Be thorough — capture every project the user introduces or updates.

The user's current world:
${context}

From the conversation — especially the user's most recent messages — output what should be saved:
- Capture EVERY task the user mentions — even tiny ones, and even when they DON'T say "add this."
  Treat natural statements of intent as tasks: "I need to eat a snack in 2 min", "I have to call
  the bank", "I should email Sam", "gotta pick up milk" all become tracked tasks. Never decide
  something isn't "worth tracking."
- Mark a task "urgent": true ONLY when the user wants it done imminently — a very short timeframe
  like "in 2 minutes", "in the next hour", "right now". Do NOT mark things urgent for general
  importance, "today", "this week", or future deadlines. Almost all tasks are NOT urgent; default
  to false.
- A standalone task that doesn't fit an existing project goes under a project named "Personal"
  (create it if it doesn't exist yet).
- To UPDATE an existing project, use its EXACT name from above; add or adjust its tasks, set
  importance (1–5) or a deadline.
- "notes" is a SHORT current status for a project (one line) — it REPLACES the old note, so keep it
  brief; don't write a running log.
- Create a NEW project only when the user clearly introduces a real project; for loose tasks use
  "Personal" instead.
- Set "context" only if their overall situation or priorities changed (it REPLACES the old one, so
  make it complete).

Deadlines: "hard" only for firm dates; hedged timing → "soft" using the later end; else "none".
Convert to YYYY-MM-DD using today's date.

Example — if the user says "I need to eat a snack in two minutes" (note: not an explicit "add
this" — still a task), output exactly:
{"projects":[{"name":"Personal","importance":2,"tasks":[{"title":"Eat a snack","urgent":true}]}]}

Output ONLY JSON (no prose, no code fences). If nothing should change, output exactly {}.
{
  "context": "concise complete about-me — only if it changed",
  "goals": [{"name":"..."}],
  "projects": [{"name":"...","goal":"matching goal name","importance":1-5,"deadlineType":"none|soft|hard","deadline":"YYYY-MM-DD","notes":"...","tasks":[{"title":"...","urgent":false}]}]
}`;
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
