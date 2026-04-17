-- =============================================================
-- Migration: Admin roles + multi-career coordinators
-- Apply to existing D1 database with:
--   npx wrangler d1 execute school-schedule-db --file=schema.migration.sql
-- =============================================================

-- 1. Add role column to coordinators
ALTER TABLE coordinators ADD COLUMN role TEXT NOT NULL DEFAULT 'coordinator'
  CHECK(role IN ('admin','coordinator'));

-- 2. Make career_id nullable (SQLite: recreate table)
-- SQLite does not support DROP COLUMN or ALTER COLUMN constraints,
-- but we can leave career_id as-is (already nullable via no NOT NULL in new schema).
-- If your existing DB has NOT NULL on career_id, run the block below instead.
-- (Skip if already nullable or freshly created from updated schema.sql)

-- 3. Add code and total_semesters to careers
ALTER TABLE careers ADD COLUMN total_semesters INTEGER NOT NULL DEFAULT 9;
ALTER TABLE careers ADD COLUMN code TEXT;

-- 4. Create M:M coordinator ↔ career table
CREATE TABLE IF NOT EXISTS coordinator_careers (
  coordinator_id INTEGER NOT NULL,
  career_id      INTEGER NOT NULL,
  PRIMARY KEY (coordinator_id, career_id),
  FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE CASCADE,
  FOREIGN KEY (career_id)      REFERENCES careers(id)      ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coordinator_careers_coord  ON coordinator_careers(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_careers_career ON coordinator_careers(career_id);

-- 5. Backfill coordinator_careers from existing career_id values
INSERT OR IGNORE INTO coordinator_careers (coordinator_id, career_id)
SELECT id, career_id FROM coordinators WHERE career_id IS NOT NULL;
