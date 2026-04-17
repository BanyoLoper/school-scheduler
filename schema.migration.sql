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

-- 7. Recreate computer_reports with new status values
CREATE TABLE computer_reports_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id      INTEGER NOT NULL,
  computer_tag TEXT    NOT NULL,
  reported_by  TEXT    NOT NULL CHECK(reported_by IN ('teacher','student')),
  description  TEXT    NOT NULL,
  photo_url    TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','fixed','false-alarm','duplicate')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at  TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
INSERT INTO computer_reports_new (id, room_id, computer_tag, reported_by, description, photo_url, status, created_at, resolved_at)
SELECT id, room_id, computer_tag, reported_by, description, photo_url,
  CASE status WHEN 'resolved' THEN 'fixed' ELSE 'pending' END,
  created_at, resolved_at FROM computer_reports;
DROP TABLE computer_reports;
ALTER TABLE computer_reports_new RENAME TO computer_reports;
CREATE INDEX IF NOT EXISTS idx_reports_room_status ON computer_reports(room_id, status);

-- 6. Professor subject preferences
CREATE TABLE IF NOT EXISTS professor_subjects (
  professor_id INTEGER NOT NULL,
  subject_id   INTEGER NOT NULL,
  PRIMARY KEY (professor_id, subject_id),
  FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id)   REFERENCES subjects(id)   ON DELETE CASCADE
);

-- 5. Backfill coordinator_careers from existing career_id values
INSERT OR IGNORE INTO coordinator_careers (coordinator_id, career_id)
SELECT id, career_id FROM coordinators WHERE career_id IS NOT NULL;
