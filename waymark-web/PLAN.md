# Waymark (web) — Blueprint

The single source of truth for the web build. Waymark is a **strategy engine**, not
a to-do list: you give it your goals + projects, and it tells you **what to focus on
right now and why** — keeping the big picture in view while still handling urgent
small must-dos.

## Principles

- **Strategy first.** An LLM reasons over your full context to produce a trustworthy
  "do this now," not a formula. Tasks/lists are just raw material.
- **One priority on screen.** Day-to-day you see a single current priority, big and
  calm, with a one-line "why." Everything else is one tap away.
- **Steerable in the moment.** "I've got 90 minutes / I'm wiped / something blew up"
  → it re-prioritizes on the spot.
- **You converse with it.** A built-in chat is how you set up, steer, and realign —
  like a chief-of-staff who knows your world.
- **It knows when to stop.** When the important thing's done, it says you're good.
- **Colloquial voice everywhere.** Talk like a sharp friend, never like software.

## Voice (examples)

- Re-plan → "Anything changed?" / "I've got an update"
- Today's priority → "Right now" / "Here's where I'd put your time"
- Enough for today → "You're good — go live your life"
- Add project → "What else is on your plate?"
- Open chat → "Let's talk it through"
- Onboarding → "Tell me what you're juggling"
- Strategic summary → "The gist"
- Steering → taps: "I'm short on time" · "I'm wiped" · "Something blew up"

## Screens

1. **Sign in** — enter email → magic link → in. No passwords.
2. **Tell me what you're juggling** (first run) — one conversation: you describe (or
   paste) your goals + projects; the strategist asks a couple of clarifying questions
   and builds your context. A "review what I captured" step, then you're in.
3. **Right now** (home, daily driver) — the single current priority, big, with its
   "why." One primary action (Done / Not now). A short "the gist" line above. Buttons:
   "Let's talk it through" and quick steer taps. When the key thing's done → "You're
   good — go live your life."
4. **Talk it through** (strategist chat) — full conversation; set up, steer, realign.
   Produces/updates the focus.
5. **Your plate** (projects) — everything you're working on; light view to edit
   context, mark things done, add what's new.
6. **Account** — sign out, appearance, model choice.

## Data model (Supabase / Postgres) — see supabase/schema.sql

- `profiles` — per user; `context` freeform ("how I work", constraints).
- `goals` — broad, long-term (the why). name + notes.
- `projects` — the irons in the fire. name, importance(1–5), deadline, status, notes.
- `tasks` — small to-dos under a project. title, done, `urgent` (must-do-soon flag),
  effort.
- `chat_messages` — the strategist conversation.
- `focus_snapshots` — the engine's latest output (summary + ordered items + reasons),
  cached so the home screen is instant.

All tables are row-level-secured to the signed-in user.

## The engine

- A server endpoint sends the user's goals + projects + tasks + context (+ any steer
  like "90 minutes") to the model and gets back: a short **gist**, an **ordered focus**
  (each item = what + one-line why, flagged needle-mover vs. quick must-do), and any
  context updates to save.
- **Model-agnostic**: a provider layer supports Claude (default) or GPT via config, so
  we can compare on real prompts and never lock in.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — responsive web, phone + desktop.
- **Supabase** — Postgres + magic-link auth + sync.
- **Vercel** — hosting + auto-deploy from this repo (root: `waymark-web`).
- **Anthropic** (default) / OpenAI — the strategist.

## Setup keys (added at deploy, never committed)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase, server only)
- `ANTHROPIC_API_KEY` (and optionally `OPENAI_API_KEY`)
