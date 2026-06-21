# SceneArc — Project Status

_Last updated: 2026-06-21_

**Current phase:** Phase One — Web application foundation
**Overall Phase One status:** 🟡 In progress — scaffolding

---

## Quick summary (plain English)

We are at the very beginning of Phase One. The environment has been inspected
and the planning documents are written. Next we build the project skeleton, the
database, the script-analysis "mock mode," and the eight Phase One pages.

You do **not** need to do anything yet. The first time I will pause for you is
when the code is ready to run live and I need you to create a free **Supabase**
project (for login + database + file storage). I'll give you exact steps then.

---

## Phase One progress checklist

- [x] Inspect environment
- [x] Create PROJECT_PLAN.md, ARCHITECTURE.md, PROJECT_STATUS.md, NONCODER_GUIDE.md
- [ ] Monorepo scaffold (pnpm workspace, packages, apps)
- [ ] Shared types + zod schemas (script analysis, prompt package)
- [ ] LLM provider interface + mock provider
- [ ] Prompt compiler
- [ ] Database schema + Row Level Security migrations
- [ ] Web app: design system + layout
- [ ] Page: Sign in
- [ ] Page: Project dashboard
- [ ] Page: Create project
- [ ] Page: Project intake
- [ ] Page: Script breakdown (review + edit + approve)
- [ ] Page: Scene workspace
- [ ] Page: Prompt-package viewer
- [ ] Page: Settings
- [ ] Real LLM provider (after mock works)
- [ ] Automated tests
- [ ] Typecheck passes
- [ ] Production build passes
- [ ] Live browser workflow tested
- [ ] NONCODER_GUIDE.md finalized for Phase One testing

---

## Phase One acceptance criteria (tracking)

| # | Criterion | Status |
|---|---|---|
| 1 | Create an account | ⬜ Not yet |
| 2 | Sign in and sign out | ⬜ Not yet |
| 3 | Create a project | ⬜ Not yet |
| 4 | Paste a short script | ⬜ Not yet |
| 5 | Enter creative direction | ⬜ Not yet |
| 6 | Mock analysis returns a valid breakdown | ⬜ Not yet |
| 7 | Real LLM analysis works after a key is added | ⬜ Not yet |
| 8 | Edit the breakdown | ⬜ Not yet |
| 9 | Approve the breakdown | ⬜ Not yet |
| 10 | Open one scene | ⬜ Not yet |
| 11 | View characters, location, beats, props, continuity | ⬜ Not yet |
| 12 | SceneArc creates a prompt package | ⬜ Not yet |
| 13 | View and copy the prepared prompt | ⬜ Not yet |
| 14 | Refreshing the browser does not lose state | ⬜ Not yet |
| 15 | One user cannot access another user's project | ⬜ Not yet |
| 16 | Tests pass | ⬜ Not yet |
| 17 | Type checking passes | ⬜ Not yet |
| 18 | Production build passes | ⬜ Not yet |
| 19 | PROJECT_STATUS.md is current | 🟡 Ongoing |
| 20 | NONCODER_GUIDE.md explains how to test | ⬜ Not yet |

---

## What I need from you right now

Nothing yet. I'll ask when I reach the live-testing step.

## Known limitations so far

- Nothing is runnable yet; this is the scaffolding stage.
