-- Manual drag-to-reorder, synced across devices.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
alter table projects add column if not exists sort_order int;
alter table tasks add column if not exists sort_order int;
