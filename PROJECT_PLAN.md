# SceneArc — Project Plan

SceneArc is a web application (with a companion Chrome extension coming in a
later phase) for serious AI filmmakers. It takes a film script, creative
direction, and reference images and organizes the tedious parts of the AI
filmmaking workflow: analyzing the script, organizing characters / locations /
scenes / continuity, preparing proprietary prompts, and helping the filmmaker
work inside the AI generation platforms they already use.

**SceneArc does not generate images or video itself, and does not pay for or
resell generation.** The filmmaker stays in creative control and manually runs
generation on outside platforms.

---

## Guardrails (apply to every phase)

SceneArc must **never**:

- Automatically click a third-party "Generate" button
- Bypass captchas, paywalls, limits, or anti-automation systems
- Store passwords for third-party generation platforms
- Scrape private account information
- Use a platform in a way prohibited by its terms
- Hide generation costs from the user

SceneArc must **never expose**: API keys, service-role credentials, proprietary
system prompts, proprietary prompt-building logic, or private user data. All of
those live server-side and are configured through environment variables.

---

## The four build phases

The product is built in four phases, **in order**. We do not start a phase
until the previous one works and the user approves moving on.

### Phase One — Web application foundation  *(current phase)*
Prove this workflow end to end:

> Create account → sign in → create project → paste script → analyze script →
> edit breakdown → approve breakdown → open one scene → create a prompt package.

No Chrome extension, no extension pairing, no mock generator, no real
generation platform in this phase.

### Phase Two — Chrome extension + mock generator  *(not started)*
A Manifest V3 Chrome extension with a side panel, secure pairing to the web
app, a generation-task workflow, a development-only mock generator, result
detection / import, and a modular platform-adapter architecture.

### Phase Three — First real external platform  *(not started)*
A single, deliberately narrow integration with one real generation platform —
chosen only after reviewing that platform's terms and developer docs, and only
with the user's explicit approval. Prefer an official API using the user's own
key. Midjourney will **not** be the first integration.

### Phase Four — Expanded filmmaking workflow  *(not started)*
Character design, canonical selection, location design, scene stills,
frameburst, low-res video drafts, revision workflow, final-resolution package,
and downloadable scene assets.

---

## Phase One scope

### Pages
1. Sign in
2. Project dashboard
3. Create project
4. Project intake
5. Script breakdown (review + edit)
6. Scene workspace
7. Prompt-package viewer
8. Settings

### Core capabilities
- Email/password authentication (Supabase Auth)
- Projects owned by the signed-in user
- Script intake (paste or upload) + creative direction
- Server-side script analysis returning validated, structured data
- **Mock mode** so the whole workflow can be tested without spending money
- A real LLM provider behind a replaceable interface (added after mock works)
- Editable breakdown, then an "approve" step
- Scene workspace showing characters, location, beats, props, continuity
- Server-side prompt compiler that produces a prompt package
- Prompt-package viewer with copy-to-clipboard
- Row Level Security so users cannot see each other's data

### Database tables (Phase One)
`profiles`, `projects`, `scripts`, `characters`, `locations`, `scenes`,
`scene_beats`, `scene_characters`, `assets`, `generation_tasks`,
`prompt_packages`, `approvals`, `revision_requests`.

(Extension-pairing tables are deferred to Phase Two.)

---

## Phase One implementation steps

1. **Environment + planning docs** — inspect the container, create the four
   markdown docs. ✅
2. **Monorepo scaffold** — pnpm workspace, `packages/config` (shared TS/lint
   config), `packages/shared` (types + zod schemas), `apps/web`,
   `apps/extension` (placeholder), `supabase/`, `docs/`.
3. **Shared types + zod schemas** — the script-analysis schema and the
   prompt-package schema, plus their TypeScript types.
4. **LLM provider interface** — `LLMProvider` interface, a `MockLLMProvider`,
   and one real provider. Mock is the default until a key is configured.
5. **Prompt compiler** — server-side compiler that turns project + scene data
   into a prompt package using server-only master instructions.
6. **Database schema + RLS** — SQL migrations for all Phase One tables, with
   Row Level Security policies scoping every row to its owner.
7. **Web app** — Next.js App Router, Supabase auth wiring, the eight pages, the
   cinematic dark/amber design system.
8. **Server actions / route handlers** — analyze script, save/edit breakdown,
   approve breakdown, compile prompt package. All LLM calls server-side.
9. **Automated tests** — Vitest for schema validation, mock analysis, real
   response validation, prompt-package creation, plus documented access-control
   tests.
10. **Quality gates** — typecheck, lint, production build all pass.
11. **Live test + docs** — wire up a Supabase project, run the full browser
    workflow, finalize `NONCODER_GUIDE.md` and `PROJECT_STATUS.md`.

---

## Required accounts (what only the user can provide)

| Account | Why | Cost |
|---|---|---|
| **Supabase** | Authentication, database, file storage | Free tier is enough for Phase One |
| **LLM provider** (Anthropic) | Real script analysis after mock works | Pay-as-you-go; pennies with a small/cheap model. Optional until you want real analysis — mock mode needs no key |
| **Vercel** (optional) | Easiest way to put the app online so you can test it in a browser | Free hobby tier |

Nothing here is needed to write code or run the automated tests. They become
necessary only to run the live browser workflow.

---

## Expected paid services

- **LLM usage**: only when you switch off mock mode. We default to a cheap model
  and show an estimated-cost notice before any paid call during development.
- Everything else in Phase One fits comfortably in free tiers.

---

## Major technical risks

1. **Live testing needs your Supabase keys.** The code and automated tests run
   without them, but the click-through workflow can't be verified until a
   Supabase project exists. This is the one expected pause in Phase One.
2. **LLM output variability.** Models can return malformed JSON. We mitigate
   with strict zod validation and a clear error path; mock mode is always a
   safe fallback.
3. **RLS correctness.** Access control lives in database policies. We write
   them carefully and document how to verify them with two test accounts.
4. **Non-coder deployment.** Putting the app online has several steps. The
   `NONCODER_GUIDE.md` walks through every click.
