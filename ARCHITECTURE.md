# SceneArc — Architecture

This document describes the technical architecture. It is written so a
technical reader can understand the system quickly, but the headline decisions
are summarized in plain English in `NONCODER_GUIDE.md`.

---

## High-level shape

SceneArc is a **TypeScript monorepo**. One web application talks to **Supabase**
(authentication, Postgres database, file storage). The heavy/sensitive work —
script analysis and prompt compilation — runs **server-side only**, so API keys
and proprietary prompt logic never reach the browser.

```
Browser (Next.js pages)
   │  signed-in session (Supabase Auth cookie)
   ▼
Next.js server (Server Actions + Route Handlers)   ← server-only secrets live here
   │                         │
   │ LLMProvider interface   │ Prompt compiler (server-only master instructions)
   │   ├─ MockLLMProvider    │
   │   └─ AnthropicProvider  │
   ▼                         ▼
Supabase (Postgres + Row Level Security + Storage)
```

---

## Technology choices and why

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript (strict)** | Required; catches errors early |
| Monorepo | **pnpm workspaces** | Simple, fast, no extra build tool needed for Phase One |
| Web framework | **Next.js (App Router) + React** | Modern, first-class server functions (Server Actions / Route Handlers) so LLM calls stay server-side; trivial to deploy on Vercel |
| Styling | **Tailwind CSS** | Fast to build a consistent, restrained cinematic design system |
| Auth / DB / Storage | **Supabase** | Required; gives auth, Postgres, storage, and Row Level Security in one free tier |
| Supabase ↔ Next.js | **@supabase/ssr** | Official helper for cookie-based auth in the App Router |
| Validation | **zod** | One schema is the single source of truth for both runtime validation and TypeScript types |
| LLM (real) | **Anthropic** via `@anthropic-ai/sdk`, default a cheap model | Affordable; hidden behind an interface so any provider can replace it |
| Tests | **Vitest** | Fast, TypeScript-native, great for the pure-logic units (schemas, mock provider, prompt compiler) |

---

## Repository structure

```
scenearc/
├── apps/
│   ├── web/                  # Next.js application (all Phase One UI + server logic)
│   └── extension/            # Placeholder for the Phase Two Chrome extension
├── packages/
│   ├── shared/               # Shared TypeScript types + zod schemas (no secrets)
│   └── config/               # Shared tsconfig / lint config
├── supabase/
│   └── migrations/           # SQL: tables + Row Level Security policies
├── docs/                     # Supplementary documentation
├── PROJECT_PLAN.md
├── PROJECT_STATUS.md
├── NONCODER_GUIDE.md
├── ARCHITECTURE.md
├── .env.example
├── package.json              # workspace root scripts
└── pnpm-workspace.yaml
```

### What lives where

- **`packages/shared`** — the contract between everything. Contains the
  `ScriptAnalysis` schema (characters, locations, scenes, scene beats, scene
  characters, time of day, props, wardrobe, continuity, suggested stages) and
  the `PromptPackage` schema, expressed once as zod schemas with derived TS
  types. **Contains no secrets and no proprietary prompt text.**
- **`apps/web/src/server`** — server-only code: the LLM provider
  implementations, the prompt compiler with its master instructions, and the
  Supabase service client. Files here are imported only by server code.
- **`supabase/migrations`** — the database schema and RLS policies.

---

## Security model

- **Secrets never reach the browser.** The LLM API key and the Supabase
  service-role key are only read in server code. Client code uses the public
  Supabase URL + anon key, which are safe to expose by design.
- **Proprietary prompt logic stays server-side.** The master instructions used
  by the prompt compiler and by script analysis live in server-only modules,
  never shipped to the client bundle.
- **Row Level Security (RLS).** Every Phase One table has RLS enabled. Policies
  ensure a user can only read/write rows belonging to projects they own. Even
  if a client tried to query another user's data directly, Postgres refuses.
- **Ownership chain.** `projects.user_id` is the anchor. Child tables
  (`scripts`, `characters`, `scenes`, …) link back to a project, and RLS checks
  ownership through that chain.

---

## The LLM provider abstraction

```ts
interface LLMProvider {
  readonly id: string;            // e.g. "mock", "anthropic"
  analyzeScript(input): Promise<{ analysis: ScriptAnalysis; usage: Usage }>;
}
```

- **`MockLLMProvider`** returns realistic, deterministic example data. It is the
  default whenever no API key is configured, so the entire Phase One workflow is
  testable for free.
- **`AnthropicProvider`** calls a real, configurable model. Selected only when
  `LLM_PROVIDER=anthropic` and an API key is present.
- The provider is chosen at runtime from environment variables
  (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`). Swapping providers later means
  adding one file — no UI or schema changes.
- **Cost transparency:** every analysis records estimated token usage / cost,
  and during development the UI warns before a paid call is made.

---

## The prompt compiler

A server-side function that takes project creative direction + a scene (with its
beats, characters, location, wardrobe, props, continuity) + production stage +
target platform + user instructions, and produces a `PromptPackage`:

- final prepared prompt
- short shot summary
- required reference assets
- suggested platform settings
- production stage + target platform
- notes for the user

For Phase One the only target platform is a generic **"Generic Image
Generator."** The compiler is a pure, server-side, replaceable module; its
master instruction text is never exposed to the client.

---

## Data flow: "Analyze script"

1. User submits the intake form (title, script, creative direction).
2. A Server Action stores the project + raw script in Supabase.
3. The server picks the configured `LLMProvider` (mock or real) and calls
   `analyzeScript`.
4. The response is validated against the `ScriptAnalysis` zod schema. Invalid
   responses are rejected with a clear error.
5. Validated entities are written to the relational tables.
6. The user reviews/edits the breakdown, then approves it (recorded in
   `approvals`).

## Data flow: "Create prompt package"

1. User opens a scene in the scene workspace.
2. A Server Action gathers the scene's characters, location, beats, props,
   continuity, plus project creative direction.
3. The prompt compiler produces a `PromptPackage`, validated against its schema.
4. It is stored in `prompt_packages` and shown in the prompt-package viewer.
