/*
# Work Assignment Assistant — Core Schema

1. Overview
This migration creates four tables for the Work Assignment Assistant app:
- `people` — seed directory of team members (not user-editable in v1).
- `requirements` — extracted requirement lines from source documents.
- `work_items` — work items generated from requirements, with difficulty, skills, and theme.
- `assignments` — proposed/approved/overridden assignment of a person to a work item, with reasoning.

This is a single-tenant app with NO sign-in screen. All policies use
`TO anon, authenticated` so the anon-key frontend can read and write its own data.

2. New Tables

### people
- `id` (text, primary key) — e.g. "P1", "P2".
- `name` (text, not null).
- `role` (text, not null) — one of 'employee', 'contractor', 'freelancer'.
- `skills` (text[], not null, default '{}') — list of skill names.
- `level` (int, not null) — 1-5 proficiency level.
- `availability` (text, not null) — one of 'available', 'partially', 'unavailable'.
- `created_at` (timestamptz, default now()).

### requirements
- `id` (text, primary key) — e.g. "R1", "R2".
- `text` (text, not null) — the requirement text.
- `source` (text, not null) — source document name.

### work_items
- `id` (text, primary key) — e.g. "W1", "W2".
- `title` (text, not null).
- `description` (text, not null).
- `difficulty` (int, not null) — 1-5.
- `required_skills` (text[], not null, default '{}').
- `requirement_ids` (text[], not null, default '{}') — links back to requirement IDs.
- `theme` (text, not null) — grouping label.

### assignments
- `id` (uuid, primary key, default gen_random_uuid()).
- `work_item_id` (text, not null) — references work_items(id).
- `proposed_person_id` (text, nullable) — null means "no suitable match".
- `reason` (text, not null) — plain-English explanation.
- `status` (text, not null, default 'proposed') — one of 'proposed', 'approved', 'overridden'.
- `final_person_id` (text, nullable) — the person actually assigned (may differ from proposed if overridden).
- `overridden_reason` (text, nullable) — reason given when manually reassigned.
- `created_at` (timestamptz, default now()).
- `updated_at` (timestamptz, default now()).

3. Indexes
- `assignments_work_item_id_idx` — index on assignments.work_item_id for fast lookups.
- `work_items_theme_idx` — index on work_items.theme for grouping queries.

4. Security
- RLS enabled on all four tables.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant, no-auth app where the data is intentionally shared/public.
*/

-- People table
CREATE TABLE IF NOT EXISTS people (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('employee', 'contractor', 'freelancer')),
  skills text[] NOT NULL DEFAULT '{}',
  level int NOT NULL CHECK (level >= 1 AND level <= 5),
  availability text NOT NULL CHECK (availability IN ('available', 'partially', 'unavailable')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_people" ON people;
CREATE POLICY "anon_select_people" ON people FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_people" ON people;
CREATE POLICY "anon_insert_people" ON people FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_people" ON people;
CREATE POLICY "anon_update_people" ON people FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_people" ON people;
CREATE POLICY "anon_delete_people" ON people FOR DELETE
  TO anon, authenticated USING (true);

-- Requirements table
CREATE TABLE IF NOT EXISTS requirements (
  id text PRIMARY KEY,
  text text NOT NULL,
  source text NOT NULL
);

ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_requirements" ON requirements;
CREATE POLICY "anon_select_requirements" ON requirements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_requirements" ON requirements;
CREATE POLICY "anon_insert_requirements" ON requirements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_requirements" ON requirements;
CREATE POLICY "anon_update_requirements" ON requirements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_requirements" ON requirements;
CREATE POLICY "anon_delete_requirements" ON requirements FOR DELETE
  TO anon, authenticated USING (true);

-- Work items table
CREATE TABLE IF NOT EXISTS work_items (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  difficulty int NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  required_skills text[] NOT NULL DEFAULT '{}',
  requirement_ids text[] NOT NULL DEFAULT '{}',
  theme text NOT NULL
);

CREATE INDEX IF NOT EXISTS work_items_theme_idx ON work_items(theme);

ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_work_items" ON work_items;
CREATE POLICY "anon_select_work_items" ON work_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_work_items" ON work_items;
CREATE POLICY "anon_insert_work_items" ON work_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_work_items" ON work_items;
CREATE POLICY "anon_update_work_items" ON work_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_work_items" ON work_items;
CREATE POLICY "anon_delete_work_items" ON work_items FOR DELETE
  TO anon, authenticated USING (true);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id text NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  proposed_person_id text REFERENCES people(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'overridden')),
  final_person_id text REFERENCES people(id) ON DELETE SET NULL,
  overridden_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignments_work_item_id_idx ON assignments(work_item_id);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_assignments" ON assignments;
CREATE POLICY "anon_select_assignments" ON assignments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_assignments" ON assignments;
CREATE POLICY "anon_insert_assignments" ON assignments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_assignments" ON assignments;
CREATE POLICY "anon_update_assignments" ON assignments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_assignments" ON assignments;
CREATE POLICY "anon_delete_assignments" ON assignments FOR DELETE
  TO anon, authenticated USING (true);
