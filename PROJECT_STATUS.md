# SceneArc — Project Status

_Last updated: 2026-06-21_

**Current phase:** Phase One — Web application foundation
**Overall Phase One status:** ✅ Complete — deployed and verified live by the owner

---

## Quick summary (plain English)

Phase One is done. The app is deployed (Vercel + Supabase) and the owner has
run the full workflow live: create account → sign in → create project → paste
script → analyze (free mock mode) → edit & approve breakdown → open a scene →
create and copy a prompt package, with data surviving refreshes.

Automated checks all pass: 26 tests, type checking, and the production build.

Phase Two (Chrome extension) has **not** been started and will not begin until
the owner approves it.

---

## Phase One progress checklist

- [x] Inspect environment
- [x] Create PROJECT_PLAN.md, ARCHITECTURE.md, PROJECT_STATUS.md, NONCODER_GUIDE.md
- [x] Monorepo scaffold (pnpm workspace, packages, apps)
- [x] Shared types + zod schemas (script analysis, prompt package)
- [x] LLM provider interface + mock provider
- [x] Prompt compiler
- [x] Database schema + Row Level Security migrations
- [x] Web app: design system + layout
- [x] Page: Sign in
- [x] Page: Project dashboard
- [x] Page: Create project
- [x] Page: Project intake
- [x] Page: Script breakdown (review + edit + approve)
- [x] Page: Scene workspace
- [x] Page: Prompt-package viewer
- [x] Page: Settings
- [x] Real LLM provider (Anthropic, behind the provider interface)
- [x] Automated tests (23 passing)
- [x] Typecheck passes
- [x] Production build passes
- [x] Live browser workflow tested (deployed; owner verified end-to-end)
- [x] NONCODER_GUIDE.md finalized for Phase One testing

---

## Phase One acceptance criteria (tracking)

| # | Criterion | Status |
|---|---|---|
| 1 | Create an account | ✅ Verified live |
| 2 | Sign in and sign out | ✅ Verified live |
| 3 | Create a project | ✅ Verified live |
| 4 | Paste a short script | ✅ Verified live |
| 5 | Enter creative direction | ✅ Verified live |
| 6 | Mock analysis returns a valid breakdown | ✅ Verified live + tests |
| 7 | Real LLM analysis works after a key is added | 🟡 Built; not yet exercised with a real key (still on mock) |
| 8 | Edit the breakdown | ✅ Verified live |
| 9 | Approve the breakdown | ✅ Verified live |
| 10 | Open one scene | ✅ Verified live |
| 11 | View characters, location, beats, props, continuity | ✅ Verified live |
| 12 | SceneArc creates a prompt package | ✅ Verified live + tests |
| 13 | View and copy the prepared prompt | ✅ Verified live |
| 14 | Refreshing the browser does not lose state | ✅ Verified live |
| 15 | One user cannot access another user's project | 🟡 Enforced by RLS; optional 2-account spot check recommended |
| 16 | Tests pass | ✅ 26 passing |
| 17 | Type checking passes | ✅ Passing |
| 18 | Production build passes | ✅ Passing |
| 19 | PROJECT_STATUS.md is current | ✅ |
| 20 | NONCODER_GUIDE.md explains how to test | ✅ |

---

## Deployment (live)

- **Hosting:** Vercel, Root Directory `apps/web`, branch `claude/scenearc-phase-one-qdndr3`.
- **Backend:** Supabase project `scenearc` (auth + Postgres + storage).
- **Migrations applied:** `0001_init.sql`, `0002_add_dialogue.sql`.
- **Auth:** email confirmation turned OFF for frictionless testing.
- **Analyzer:** free mock mode (`LLM_PROVIDER` unset).

## Optional follow-ups (owner's choice, not blockers)

- **Two-account privacy check** (criterion 15): sign up a second account and
  confirm it cannot see the first account's project.
- **Turn on real AI analysis** (criterion 7): add an Anthropic API key in Vercel
  for richer extraction (props inference, deeper descriptions).
- Re-enable email confirmation and set the Supabase Site URL before any public launch.

## Known limitations

- Mock mode is a simple pattern-matcher: it reads parenthetical descriptions and
  dialogue, but does not infer props/wardrobe/continuity — that needs the real AI.
- Script file upload supports plain-text scripts (.txt/.fountain/.md); PDF/Final
  Draft import is out of scope for Phase One.
- Reference-image upload is wired to Supabase Storage but hasn't been exercised
  in the live click-through.
