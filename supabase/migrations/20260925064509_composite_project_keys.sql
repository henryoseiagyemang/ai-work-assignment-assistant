/*
# Composite Primary Keys for Multi-Project Support

1. Problem
   The `requirements` and `work_items` tables use simple text IDs (e.g. "R1", "W1")
   as their PRIMARY KEY. When the projects feature was added, a `project_id` column
   was added but NOT included in the primary key. This means "R1" can only exist
   once in the entire table — a second project cannot reuse "R1" without hitting
   a duplicate key violation.

2. Changes
   - Drop the FK from `assignments.work_item_id` → `work_items(id)` first
     (it depends on the existing PK).
   - Drop the single-column primary key on `requirements` and replace with a
     composite PRIMARY KEY (project_id, id).
   - Drop the single-column primary key on `work_items` and replace with a
     composite PRIMARY KEY (project_id, id).
   - Add `project_id` column to `assignments` (nullable initially, backfilled,
     then NOT NULL) so each assignment knows which project it belongs to.
   - Recreate the FK as composite: `assignments(project_id, work_item_id)`
     → `work_items(project_id, id)` ON DELETE CASCADE.
   - Recreate the assignments index with project_id.

3. Data Safety
   - No data is deleted. Existing rows are preserved. `project_id` on
     `requirements` and `work_items` is already populated. `assignments.project_id`
     is backfilled from the linked `work_items` row before being made NOT NULL.

4. Security
   - RLS already enabled on all tables. No policy changes needed.
*/

-- ── Step 1: Drop the existing FK from assignments → work_items ──
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_work_item_id_fkey;

-- ── Step 2: Drop old index on assignments.work_item_id ──
DROP INDEX IF EXISTS assignments_work_item_id_idx;

-- ── Step 3: requirements → composite PK ──
ALTER TABLE requirements DROP CONSTRAINT requirements_pkey;
ALTER TABLE requirements ADD PRIMARY KEY (project_id, id);

-- ── Step 4: work_items → composite PK ──
ALTER TABLE work_items DROP CONSTRAINT work_items_pkey;
ALTER TABLE work_items ADD PRIMARY KEY (project_id, id);

-- ── Step 5: assignments → add project_id column ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN project_id uuid;
  END IF;
END $$;

-- Backfill assignments.project_id from the linked work_items row
UPDATE assignments a
SET project_id = wi.project_id
FROM work_items wi
WHERE a.work_item_id = wi.id
  AND a.project_id IS NULL;

-- Make it NOT NULL
ALTER TABLE assignments ALTER COLUMN project_id SET NOT NULL;

-- ── Step 6: Recreate composite FK ──
ALTER TABLE assignments
  ADD CONSTRAINT assignments_project_work_item_fkey
  FOREIGN KEY (project_id, work_item_id)
  REFERENCES work_items(project_id, id)
  ON DELETE CASCADE;

-- ── Step 7: Recreate index ──
CREATE INDEX IF NOT EXISTS assignments_project_work_item_idx
  ON assignments(project_id, work_item_id);