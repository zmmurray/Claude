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

## Setup — do this once (about 15 minutes)

The app is fully built. To run it live you'll create a free Supabase project
(the login + database + storage) and put the app online with Vercel (free). I'll
handle all the technical wiring — you just create the accounts and paste me the
keys.

### Step 1 — Create a Supabase project

1. Go to **https://supabase.com** and click **Start your project** / **Sign in**
   (you can sign in with GitHub or email).
2. Click **New project**.
3. Pick any **Organization** (create one if asked).
4. **Name:** `scenearc`.
5. **Database Password:** click **Generate a password**, then click the copy
   icon and paste it somewhere safe. (You won't need to type it often, but keep
   it.)
6. **Region:** choose the one closest to you.
7. Click **Create new project** and wait ~2 minutes for it to finish setting up.

### Step 2 — Copy your three keys

1. In your project, click the **gear icon (Project Settings)** in the left
   sidebar, then **API**.
2. You'll see:
   - **Project URL** — copy it.
   - **Project API keys → `anon` `public`** — copy it.
   - **Project API keys → `service_role` `secret`** — click **Reveal**, copy it.
3. Paste all three to me in the chat. (These belong to *your* project. The
   secret one is sensitive — only share it here with me; I'll store it as a
   protected setting, never in the code.)

### Step 3 — Turn off email confirmation (so testing is instant)

1. In Supabase, go to **Authentication → Sign In / Providers** (or
   **Authentication → Providers → Email**).
2. Find **Confirm email** and turn it **OFF**, then **Save**.
   - This lets you sign up and use the app immediately without clicking an email
     link. You can turn it back on later for real users.

### Step 4 — Load the database

Tell me when Steps 1–3 are done. I'll give you a single block of text to paste
into Supabase's **SQL Editor** (I'll show you exactly where), which creates all
the tables and the security rules. It takes about 30 seconds. (If you prefer, I
can walk you through it click by click.)

### Step 5 — Put the app online (Vercel)

So you can use SceneArc in your browser, we host it on Vercel's free tier:

1. Go to **https://vercel.com** and **Sign up** with the same GitHub account
   that holds this project.
2. Click **Add New… → Project**, find the **Claude** repository, and click
   **Import**.
3. Under **Root Directory**, click **Edit** and choose **`apps/web`**.
4. Expand **Environment Variables** and add these (I'll give you the exact
   values from your Supabase keys):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (Leave the language-model ones unset for now — the app uses free mock mode.)
5. Click **Deploy** and wait a couple of minutes. Vercel gives you a web address
   like `your-project.vercel.app`.

I'll give you the precise values to paste in Step 4. If anything looks off,
screenshot it and send it to me.

---

## How to test Phase One

Once the app is online, open your Vercel web address and check each item:

1. **Create an account** — click **Create account**, enter an email + a password
   (8+ characters), submit. You should land on the empty **Projects** dashboard.
2. **Sign out and back in** — click **Sign out** (top right), then **Sign in**
   with the same details. Your session should restore.
3. **Create a project** — click **New project**, give it a title, continue.
4. **Add a script + creative direction** — on the intake page, paste a short
   script (even a few scenes). Try this format so the analyzer has something to
   work with:
   ```
   INT. KITCHEN - NIGHT

   MAYA pours coffee. Rain taps the window.

   MAYA
   You're late.

   EXT. STREET - DAY

   LEO hurries past shop fronts.
   ```
   Fill in a genre, period, style, etc. Then click **Analyze script**.
   - With **mock mode** (the default, free), you'll get a realistic breakdown
     drawn from your script — no charge.
5. **Review & edit the breakdown** — change a character description or a scene
   summary, click **Save changes**. Your edit should stick.
6. **Approve the breakdown** — click **Approve breakdown**. The scenes below
   become clickable.
7. **Open a scene** — click a scene card. You should see its characters,
   location, beats, props, wardrobe, and continuity.
8. **Create a prompt package** — in the right-hand panel, optionally pick a beat
   and add direction, then click **Create prompt package**.
9. **View & copy the prompt** — on the prompt-package page, read the prepared
   prompt and click **Copy prompt**. Paste it anywhere to confirm it copied.
10. **Refresh test** — reload the browser on any project page. Nothing should be
    lost.
11. **Privacy test (two accounts)** — sign out, create a *second* account, and
    confirm its dashboard is empty (it cannot see the first account's project).

If every step works, Phase One is proven. Tell me how it went — if anything
fails, describe what you saw and I'll fix it.

### Optional — turn on real AI analysis later

Mock mode is great for testing for free. When you want real analysis:

1. Create an **Anthropic** account at **https://console.anthropic.com**, add a
   payment method, and create an **API key**.
2. In Vercel → your project → **Settings → Environment Variables**, add:
   - `LLM_PROVIDER` = `anthropic`
   - `LLM_API_KEY` = your Anthropic key
   - (optional) `LLM_MODEL` = a model name I'll recommend
3. Redeploy. Now **Analyze script** uses real AI. The app will warn you before
   each paid call, and records an estimated cost.

---

## If something goes wrong

You won't be asked to fix code. If a step fails, tell me what you saw on screen
and I'll investigate and fix it. I will only ask you for things that genuinely
require you — like creating an account, adding an API key, or approving a
charge.
