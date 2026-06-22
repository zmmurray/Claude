# SceneArc — Project Status

_Last updated: 2026-06-21_

**Current phase:** Phase Three — first real platform (Freepik)
**Phase One status:** ✅ Complete — deployed and verified live by the owner
**Phase Two status:** ✅ Complete — extension loaded, paired, and full workflow verified live
**Phase Three status:** 🟡 Built (Freepik: Nano Banana + Seedance) — awaiting owner's Freepik key to test live

---

## Quick summary (plain English)

Phase One is done. The app is deployed (Vercel + Supabase) and the owner has
run the full workflow live: create account → sign in → create project → paste
script → analyze (free mock mode) → edit & approve breakdown → open a scene →
create and copy a prompt package, with data surviving refreshes.

Phase Two (Chrome extension + mock generator) is **complete and verified live**.

Phase Three (first real platform — **Freepik**, with Nano Banana images and
Seedance video, via your own API key) is now **built** and passing all automated
checks (41 tests, type checking, web build). It needs the owner to apply
migration `0004` and add a Freepik API key to test live. See the Phase Three
section below.

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

---

# Phase Two — Chrome extension & mock generator

**Status:** ✅ Complete — verified live on desktop Chrome (loaded, paired, full
insert → generate → select → import → approve/reject/revise workflow).

## What was built
- Manifest V3 extension (`apps/extension`): background service worker, content
  script, React **side panel**, built with esbuild to `apps/extension/dist`
  (committed so it can be loaded without a build step).
- **Secure pairing:** one-time codes (10-min expiry, single use) exchanged for a
  hashed bearer token; disconnect/revoke from Settings.
- **Web API** for the extension: `/api/extension/pair`, `/context`, `/results`,
  `/results/[id]/decision` (CORS-enabled, Bearer-auth, RLS-safe).
- **Generation task flow:** "Send to extension" from a prompt package creates an
  active task the extension picks up.
- **Dev-only mock generator** at `/dev/mock-generator` (fake image + video
  results, selection, download).
- **Platform-adapter architecture** (`src/adapters`) with the mock adapter; real
  platforms slot in for Phase Three.
- Result import (auto + manual upload), approve / reject / request revision, both
  in the extension and on the web package page.

## Migrations to apply
- `0003_extension.sql` — pairing, tokens, results; task columns.

## Phase Two acceptance criteria
| # | Criterion | Status |
|---|---|---|
| 1 | Extension loads into Chrome | ✅ Verified live |
| 2 | Pairs with the correct account | ✅ Verified live |
| 3 | Shows active project and scene | ✅ Verified live |
| 4 | Recognizes the mock generator | ✅ Verified live |
| 5 | Inserts the prompt after Insert Prompt | ✅ Verified live |
| 6 | User manually clicks Generate | ✅ By design (never auto-clicked) |
| 7 | Detects fake results | ✅ Verified live |
| 8 | User selects one result | ✅ Verified live |
| 9 | Result imported into SceneArc | ✅ Verified live |
| 10 | Attaches to project/scene/task/package | ✅ Verified live |
| 11 | Approve / reject / request revision | ✅ Verified live |
| 12 | Manual upload fallback works | ✅ Built (verified path available) |
| 13 | Refresh doesn't lose state | ✅ Verified live (chrome.storage) |
| 14 | Tests pass | ✅ 34 passing |
| 15 | Extension build succeeds | ✅ Passing |
| 16 | Plain-English install/test instructions | ✅ apps/extension/README.md |

## Migrations applied
- `0003_extension.sql` — applied in Supabase.

---

# Phase Three — First real platform (Freepik)

**Status:** 🟡 Built and passing all automated checks (41 tests, typecheck, web
build). Needs the owner to apply migration `0004` and add a Freepik API key to
test live. (This build sandbox cannot reach api.freepik.com, so live calls are
verified on Vercel by the owner.)

## Platform decision
- **Freepik API** chosen as the first real integration — it's an official,
  multi-model gateway using the user's own key. Models wired: **Nano Banana**
  (Google Gemini image) for stills and **Seedance** (video). Reviewed terms:
  programmatic API use is supported; paid plans include a commercial license;
  inputs/outputs are not used for training; no IP indemnification (noted).

## What was built
- **Replaceable generation-provider interface** (`src/server/generation`)
  mirroring the LLM provider pattern; `FreepikProvider` is the first.
- **Encrypted credential storage** (`provider_credentials`, AES-256-GCM) so each
  user stores their own Freepik key; server-side only, with a `FREEPIK_API_KEY`
  env fallback.
- **Settings → Generation:** save / replace / remove the Freepik key.
- **Prompt package → Generate directly (Freepik):** pick Nano Banana (image) or
  Seedance 2.0 (video), confirm the paid notice, generate; async video is polled
  via "Check status"; results auto-import and show in the results grid for
  approve / reject / revise.
- Seedance (image-to-video) uses a recent approved image of the scene as its
  source; the model slugs live in one place in `freepik.ts` for easy updates.
- Tests: Freepik response parsing + model registry; credential encryption
  round-trip.

## Migrations to apply
- `0004_generation.sql` — `provider_credentials` + generation_tasks provider columns.

## Guardrails honored
- Official API + the user's own key; no bypassing anything; no third-party
  passwords stored; costs surfaced with a confirm-before-paid notice.

## What the owner needs to do to test
1. Apply `0004_generation.sql` in Supabase (SQL Editor).
2. (Optional) set `CREDENTIALS_SECRET` in Vercel; otherwise the service-role key
   is used to encrypt stored keys.
3. Get a Freepik API key (Freepik plan with API access), add it in
   **Settings → Generation**, then use **Generate directly (Freepik)** on a
   scene's prompt package.

## Known limitations / to confirm live
- Exact Freepik model slugs/response shapes are coded defensively from the docs;
  if Freepik renames a model, update `FREEPIK_MODELS` in `freepik.ts` (one place).
- Video is async; status is checked on demand (no background worker yet).
