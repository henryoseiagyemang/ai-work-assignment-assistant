/*
# Add Projects Table and Project Grouping

1. New Tables
- `projects`
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, not null) — the project name
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `requirements` — add `project_id` (uuid, references projects, ON DELETE CASCADE)
- `work_items` — add `project_id` (uuid, references projects, ON DELETE CASCADE)

When a project is deleted, all its requirements and work_items are cascaded.
Work_items deletion cascades to assignments via the existing ON DELETE CASCADE
on the assignments.work_item_id foreign key, so deleting a project also
removes all its assignments.

3. Indexes
- `requirements_project_id_idx` on requirements.project_id
- `work_items_project_id_idx` on work_items.project_id

4. Security
- Enable RLS on `projects`.
- Add anon, authenticated CRUD policies (single-tenant, no-auth app).
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

-- Add project_id to requirements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requirements' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE requirements ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS requirements_project_id_idx ON requirements(project_id);

-- Add project_id to work_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE work_items ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS work_items_project_id_idx ON work_items(project_id);
