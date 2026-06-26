# Waymark — Design

*A calm, light command center for the projects that make up a life.*

---

## Who this build is for

**This version is for me, on my own Mac.** It is local-only, single-user, no
accounts, no cloud, no network. Whether Waymark ever becomes a wider product is
a **later decision — one to be made by *living with it***, not by guessing now.

---

## Philosophy (this drives every decision)

- Waymark ranks by **importance to my real life**, not by efficiency or
  throughput. Its job is to cut through a pile of competing projects and tell me
  the one thing that deserves my focus *today*.
- **The goal is a good life now, not after all the work is done.** So the app
  recognizes an **"enough for today"** state and stops pushing once I've done
  the important thing. It is **ignorable by design.** It never nags, never
  rewards busyness.
- It is **not** a generic productivity app. No streaks, no infinite progress
  bars, no box-counting, no "do more" mechanic. It rewards **meaningful
  progress only** — a step completed, a stage advanced — never the volume of
  tasks cleared.
- **Resting is a valid way to win the day.**

## The three people it's designed for (a design lens)

1. **Me** — juggling many concurrent creative + work projects.
2. **A person with ADHD** — lots of interests, easily distracted, gets stuck on
   *direction*. Needs near-zero friction and exactly one focal thing on screen.
3. **A stay-at-home parent with side projects** — wants to feel *real* progress
   on what matters, in the margins of a full day.

Shared need: **see what matters, feel progress on it, never feel overwhelmed.**
Design for the ADHD case and it works for all three: open the app and instantly
know the single next step — never a wall of tasks.

## Aesthetic

**Light, fresh, and questy.** A pale-green canvas, near-white cards, forest-green
accents, friendly **rounded sans-serif** type. Generous whitespace, soft shadows,
one clear thing at a time. Each project is a **quest**; its **next step** is the
active objective. Gamification stays light and tasteful — progress is a quest
advancing through its stages, not points or badges.

## Data model

- **Quest (project):** name, **`nextStep`** (the single concrete next step — *the
  most important field*), `importance` (1–5, set by me — how much it matters,
  shown as leaves), `deadline` (none / target date / hard deadline), `stage`
  (idea → planning → underway → delivered → done), optional `notes`.
- **ProgressEvent:** a log of meaningful progress (step completed / stage
  advanced). Powers the "what I moved today" recap and a quiet weekly tally.

> Earlier drafts had *strategic axes* and per-axis *tracks*. They were cut: too
> abstract, and the main source of confusion. Ranking now rests on importance +
> deadline urgency alone, which is simpler and just as truthful.

## Ranking logic

- Blend **deadline urgency** (hard + nearer weighs more; soft less; none least)
  with **importance**. Importance leads; urgency makes things *today*-relevant.
- Surface a **short** list — usually just one focal step; runners-up are hidden
  behind a deliberate tap so the screen stays calm.
- Every focal item carries **one plain-sentence reason** so I trust the ranking.
- **Never** rank by number of tasks or "what's quickest to clear."

## The "Enough" state

Reached when I complete today's leading step (or consciously declare the day
done). Today then becomes a calm recap and tells me to go live my life. "More"
exists but **never dangles** — revealing it takes a deliberate tap.

## Views

1. **Today** — the home and the soul. The single next step worth doing, with a
   big primary action and a one-line reason; a friendly first-run welcome; the
   Enough state.
2. **Quests** — every quest: name, importance, stage, next step, deadline.
   Add / edit / advance. A gentle weekly progress line, never a scoreboard.

## Later, by living with it

- A weekly review. Customizable stages. A menu-bar quick-glance. Optionally
  reading a separate timer app's hours. Kept out of v1 to stay tight.
