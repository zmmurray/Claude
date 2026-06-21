-- =============================================================================
-- SceneArc — add dialogue to scenes
-- =============================================================================
-- Stores each scene's dialogue lines as JSON: [{ "characterKey": "...", "line": "..." }]
-- =============================================================================

alter table public.scenes
  add column if not exists dialogue jsonb not null default '[]'::jsonb;
