# SceneArc — Non-Coder Guide

This guide is written for you, the owner of SceneArc, who does not code. It
explains what SceneArc is, what's been built, and exactly what to click to test
it — in plain English. No prior knowledge of terminals, databases, or
deployment is assumed.

---

## What SceneArc is, in one paragraph

SceneArc is professional software for AI filmmakers. You give it a script and
your creative direction; it reads the script and organizes everything a film
needs — characters, locations, scenes, who appears where, time of day, wardrobe,
props, and continuity. It then prepares carefully written prompts you can take
to the AI image/video tools you already use. SceneArc never generates images
itself and never spends money on generation — **you** stay in control and run
generation yourself.

---

## Where things stand

We are building in four phases. **We are in Phase One**, which builds the web
app foundation. See `PROJECT_STATUS.md` for the live checklist.

This guide's "How to test" section will be filled in completely once Phase One
is runnable. For now it explains the few things only you can set up.

---

## Words you'll see, in plain English

- **Repository / repo** — the folder that holds all of SceneArc's files.
- **Supabase** — a free online service we use for three things: letting people
  log in, storing your projects in a database, and storing uploaded files.
- **LLM** — the "AI brain" (a large language model) that reads your script. It
  costs a tiny amount of money per use, so during building we use a free
  **"mock mode"** that returns realistic fake results.
- **Mock mode** — a pretend version of the script analyzer that needs no API key
  and costs nothing. It lets us test the whole app for free.
- **API key** — a secret password-like string that lets our app use a paid
  service (like the LLM). You create these in the service's website. We store
  them safely on the server, never in your browser.
- **Environment variables** — a list of settings and secret keys the app reads
  when it runs. They live in a file the public never sees.
- **Deploy** — putting the app online so you can use it in a browser.

---

## Accounts you will eventually need (not yet)

1. **Supabase** (free) — for login, database, and file storage. Required to run
   the live app.
2. **Anthropic** (pay-as-you-go, optional at first) — the AI brain for *real*
   script analysis. Not needed while we use mock mode.
3. **Vercel** (free, optional) — the simplest way to put the app online.

I will give you click-by-click instructions for each of these at the moment we
actually need it. You do not need to do anything in advance.

---

## How to test Phase One

> ⏳ **Coming soon.** This section will contain exact, click-by-click steps once
> the app is runnable. It will cover: creating your account, signing in, making
> a project, pasting a script, running mock analysis, editing and approving the
> breakdown, opening a scene, and viewing/copying a prompt package — plus how to
> confirm that one account cannot see another account's projects.

---

## If something goes wrong

You won't be asked to fix code. If a step fails, tell me what you saw on screen
and I'll investigate and fix it. I will only ask you for things that genuinely
require you — like creating an account, adding an API key, or approving a
charge.
