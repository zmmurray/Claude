# SceneArc — Project Status

_Last updated: 2026-06-21_

**Current phase:** Phase One — Web application foundation
**Overall Phase One status:** 🟡 Code complete & verified locally — waiting on your Supabase project to run the live click-through

---

## Quick summary (plain English)

The entire Phase One application is built. All the automated checks pass:
tests (23), type checking, and the production build. Mock mode works, so the
whole workflow can run without spending a cent.

**What's left needs you:** the app stores logins and data in a service called
**Supabase**. To run the real click-through (create account → project → analyze
→ approve → prompt package), I need you to create a free Supabase project and
share its keys. Step-by-step instructions are in NONCODER_GUIDE.md and in my
chat message. Once you do that, I'll connect it, load the database, and verify
everything end-to-end.

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
- [ ] Live browser workflow tested ← **needs your Supabase project**
- [ ] NONCODER_GUIDE.md finalized for Phase One testing (in progress)

---

## Phase One acceptance criteria (tracking)

| # | Criterion | Status |
|---|---|---|
| 1 | Create an account | 🟡 Built — needs live test |
| 2 | Sign in and sign out | 🟡 Built — needs live test |
| 3 | Create a project | 🟡 Built — needs live test |
| 4 | Paste a short script | 🟡 Built — needs live test |
| 5 | Enter creative direction | 🟡 Built — needs live test |
| 6 | Mock analysis returns a valid breakdown | ✅ Verified by automated tests |
| 7 | Real LLM analysis works after a key is added | 🟡 Built — needs live test with a key |
| 8 | Edit the breakdown | 🟡 Built — needs live test |
| 9 | Approve the breakdown | 🟡 Built — needs live test |
| 10 | Open one scene | 🟡 Built — needs live test |
| 11 | View characters, location, beats, props, continuity | 🟡 Built — needs live test |
| 12 | SceneArc creates a prompt package | ✅ Logic verified by tests; live UI needs test |
| 13 | View and copy the prepared prompt | 🟡 Built — needs live test |
| 14 | Refreshing the browser does not lose state | 🟡 Built (data persists in Supabase) — needs live test |
| 15 | One user cannot access another user's project | 🟡 Built (RLS policies) — needs live test |
| 16 | Tests pass | ✅ 23 passing |
| 17 | Type checking passes | ✅ Passing |
| 18 | Production build passes | ✅ Passing |
| 19 | PROJECT_STATUS.md is current | ✅ |
| 20 | NONCODER_GUIDE.md explains how to test | 🟡 In progress |

---

## What I need from you right now

A free **Supabase** project, so I can connect login + database + storage and run
the live click-through. See my chat message and NONCODER_GUIDE.md for exact
steps. (Optional, later: an Anthropic API key to switch from free mock analysis
to real AI analysis.)

## Known limitations so far

- The live click-through has not been run yet (it needs your Supabase project).
  Everything that can be verified without it — schema validation, mock analysis,
  real-response parsing, prompt compilation, type checking, and the production
  build — passes.
- Script file upload supports plain-text scripts (.txt/.fountain/.md). PDF/Final
  Draft parsing is out of scope for Phase One.
- Reference-image upload is wired to Supabase Storage but, like all data
  features, is only verifiable once the live project is connected.
