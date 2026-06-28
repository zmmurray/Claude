# Waymark (web)

A strategy engine for people juggling many projects: tell it your goals and what
you're working on, and it tells you **what to focus on right now and why** — steerable
through a built-in chat, in a deliberately plain, friendly voice.

Stack: **Next.js** (App Router) · **Supabase** (Postgres + magic-link auth) · **Vercel** ·
Claude (default) or GPT for the strategist. See `PLAN.md` for the full blueprint.

---

## One-time setup (≈10 minutes, mostly clicking)

You'll need free accounts at **Supabase** and **Vercel**, and an **Anthropic API key**
(small usage cost — a few $/mo at personal use).

### 1. Supabase — database + login
1. Create a project (or use an existing one).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
3. **Settings → API** — copy these three:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. **Authentication → URL Configuration** — after you have your Vercel URL (step 3),
   set **Site URL** to it and add `https://YOUR-APP.vercel.app/auth/callback` under
   **Redirect URLs**. (Email/magic-link sign-in is on by default.)

### 2. Anthropic — the strategist
- console.anthropic.com → **API keys** → create one → `ANTHROPIC_API_KEY`.
- (To use GPT instead, set `OPENAI_API_KEY` and `LLM_PROVIDER=openai`.)

### 3. Vercel — hosting
1. **Add New → Project → Import** this GitHub repo.
2. Set **Root Directory** to `waymark-web`.
3. Add **Environment Variables** (the five from above; `LLM_PROVIDER` optional).
4. **Deploy.** You'll get a URL like `https://waymark-xxxx.vercel.app`.
5. Put that URL back into Supabase step 1.4, then open it and sign in.

Every push to the repo auto-deploys.

## Local dev (optional)
```bash
cd waymark-web
cp .env.example .env.local   # fill in your keys
npm install
npm run dev
```

## Layout
```
supabase/schema.sql      database + row-level security
src/app/                 routes (login, today, chat, plate, account, api/*)
src/components/          TodayClient, ChatClient, PlateClient, AppShell
src/lib/                 supabase clients, llm provider, strategy prompts, data, copy
```
