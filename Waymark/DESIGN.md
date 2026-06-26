# Waymark — Design

*A calm, cinematic command center for the projects that make up a life.*

---

## Who this build is for

**This version is for me, on my own Mac.** It is local-only, single-user, no
accounts, no cloud, no network. Whether Waymark ever becomes a wider product is
a **later decision — one to be made by *living with it***, not by guessing now.
This document exists to preserve the intent so that decision can be made well.

---

## Philosophy (this drives every decision)

- Waymark ranks by **importance to my real life goals**, not by efficiency or
  throughput. Its job is to cut through a pile of competing projects and tell me
  what deserves my focus *today*, given deadlines and long-term goals.
- **The goal is a good life now, not after all the work is done.** So the app
  recognizes an **"enough for today"** state and stops pushing once I've done
  the important thing. It is **ignorable by design.** It never nags, never
  rewards busyness.
- It is **not** a generic productivity app. No streaks-for-streaks, no infinite
  progress bars, no box-counting, no "do more" mechanic. It rewards
  **meaningful progress only** — a project advancing a stage, a real milestone
  hit — never the volume of tasks cleared.
- **Resting is a valid way to win the day.** The Today view will tell me I've
  done enough and send me to live my life rather than surface the next twelve
  tasks. This is the single most important behavior in the app.

## The three people it's designed for (a design lens)

Even though this build is just for me, three people sit at the table as a lens:

1. **Me** — juggling many concurrent creative + work projects, needing to know
   where today's focus belongs.
2. **A person with ADHD** — lots of interests, easily distracted, gets stuck on
   *direction*. Needs near-zero friction and exactly one focal thing on screen.
3. **A stay-at-home parent with side projects** — wants to feel *real* progress
   on what matters, in the margins of a full day.

Shared need: **see what matters, feel progress on it, and never feel
overwhelmed or nagged.** Design for the ADHD case and it works for all three —
so: near-zero friction, one focal thing at a time, a short list never a wall.

## Aesthetic

A **quest log / expedition journal.** Dark, focused, generous whitespace, a
restrained palette with **one warm accent** (amber/brass). Real typographic
hierarchy — a serif display face for headers gives the journal hand. It should
feel like a tool a craftsperson keeps open, not a busy dashboard.

- Each **project is a Quest**; its **next concrete action** is the active step.
- Gamification with **craft and restraint**: progress *grows and advances* (a
  quest reaching a stage, a strategic track gaining ground) — never XP points,
  confetti, badges, or a mascot. If it looks like a kids' app, it's wrong.
- Calm micro-interactions. Completing the day's important thing feels a little
  *weighty*. Small wins land softly. Nothing flashes or demands attention.

## Data model

- **Quest (project):** name, `strategicAxis` (which goal), `strategicWeight`
  (1–5, *I* set it; importance is mine and isn't only career), `deadline`
  (hard / soft / none + optional date), `stage`
  (idea → developing → active → delivered/pitched → done), **`nextAction`**
  (a single concrete step — *the most important field*), optional `notes`.
- **StrategicTrack:** one per axis (Reputation/Rooms, Income, IP/Slate,
  Mission). Each has a level + progress that advances when projects on that axis
  make meaningful progress. Tracks make invisible long-game progress visible:
  the long-horizon axes (Reputation, IP) have no deadlines and no feedback, so
  they always lose to whatever's on fire. The tracks fix that. **A stalled axis
  = a track that isn't moving = the signal I'm neglecting something important**,
  surfaced continuously instead of as a nag.

Tracks are **derived** from a log of meaningful-progress events, so they can
never drift from what actually happened.

## Ranking logic

- Blend **deadline urgency** (hard + nearer weighs more; soft less; none least)
  with **strategic weight**. Weight leads; urgency makes things *today*-relevant.
- Surface a **short** ranked list — err toward fewer. The list collapses to a
  single item when one thing clearly dominates.
- Every ranked item carries **one plain-sentence reason** so I trust the
  ranking instead of re-deciding every morning.
- **Never** rank by number of tasks or "what's quickest to clear." Importance
  only.

## The "Enough" state

Reached when I complete today's **leading** focus item (or consciously declare
the day done — resting counts). The Today view then changes to a calm recap of
what I moved and tells me to go live my life. "More" still exists but **never
dangles** — revealing it takes a deliberate tap.

## Views

1. **Today** — the home screen and the soul. A short ranked focus list, each
   item showing the *next concrete action* + a one-line reason; the Enough state.
2. **Quests** — every project: name, axis (color-coded), stage, next action,
   deadline. Add / edit / advance. Advancing a stage or completing a step is the
   satisfying core interaction and feeds the tracks.
3. **Tracks** — the four strategic tracks, leveling on meaningful progress; a
   stalled track tells me at a glance which goal I'm neglecting.

## Deliberately out of scope for v1 (later, by living with it)

- A dedicated **weekly review** ("did my attention land where my goals are?").
  The Tracks view already gives continuous signal, so this is an enhancement.
- **Customizable stages and axes** — specifically what would let a *different*
  person map the tool to *their* goals instead of mine.
- A lightweight **menu-bar quick-glance** at today's focus.
- Optionally reading a separate project-timer app's data to show hours alongside
  quests.

These are preserved here so the idea isn't lost — but v1 stays tight.
