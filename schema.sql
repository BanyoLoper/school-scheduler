-- =============================================================
-- School Schedule — D1 Database Schema
-- =============================================================

CREATE TABLE IF NOT EXISTS careers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  description      TEXT,
  code             TEXT,
  total_semesters  INTEGER NOT NULL DEFAULT 9
);

CREATE TABLE IF NOT EXISTS coordinators (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL UNIQUE,
  career_id  INTEGER,
  role       TEXT    NOT NULL DEFAULT 'coordinator' CHECK(role IN ('admin','coordinator')),
  FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS coordinator_careers (
  coordinator_id INTEGER NOT NULL,
  career_id      INTEGER NOT NULL,
  PRIMARY KEY (coordinator_id, career_id),
  FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE CASCADE,
  FOREIGN KEY (career_id)      REFERENCES careers(id)      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  type       TEXT    NOT NULL CHECK(type IN ('lab','theory')),
  capacity   INTEGER NOT NULL,
  is_blocked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS room_equipment (
  room_id         INTEGER PRIMARY KEY,
  has_board       INTEGER NOT NULL DEFAULT 1,
  has_computers   INTEGER NOT NULL DEFAULT 0,
  total_computers INTEGER NOT NULL DEFAULT 0,
  computer_tier   TEXT    NOT NULL DEFAULT 'none' CHECK(computer_tier IN ('none','basic','high')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS software (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  version      TEXT NOT NULL,
  category     TEXT NOT NULL CHECK(category IN ('design','development','cybersecurity','networking','none')),
  license_type TEXT NOT NULL DEFAULT 'free' CHECK(license_type IN ('free','commercial','edu'))
);

CREATE TABLE IF NOT EXISTS room_software (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id         INTEGER NOT NULL,
  software_id     INTEGER NOT NULL,
  installed_count INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  FOREIGN KEY (room_id)     REFERENCES rooms(id)    ON DELETE CASCADE,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
  UNIQUE(room_id, software_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  career_id INTEGER NOT NULL,
  semester  INTEGER NOT NULL,
  needs_lab INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subject_software_requirements (
  subject_id  INTEGER NOT NULL,
  software_id INTEGER NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (subject_id, software_id),
  FOREIGN KEY (subject_id)  REFERENCES subjects(id)  ON DELETE CASCADE,
  FOREIGN KEY (software_id) REFERENCES software(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS groups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id   INTEGER NOT NULL,
  group_number INTEGER NOT NULL,
  students     INTEGER NOT NULL,
  is_priority  INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS professors (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  career_id INTEGER NOT NULL,
  FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS professor_subjects (
  professor_id INTEGER NOT NULL,
  subject_id   INTEGER NOT NULL,
  PRIMARY KEY (professor_id, subject_id),
  FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id)   REFERENCES subjects(id)   ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  professor_id INTEGER NOT NULL,
  day          TEXT    NOT NULL CHECK(day IN ('monday','tuesday','wednesday','thursday','friday','saturday')),
  start_time   TEXT    NOT NULL,
  end_time     TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id     INTEGER NOT NULL,
  room_id      INTEGER NOT NULL,
  professor_id INTEGER,
  day          TEXT    NOT NULL CHECK(day IN ('monday','tuesday','wednesday','thursday','friday','saturday')),
  start_time   TEXT    NOT NULL,
  end_time     TEXT    NOT NULL,
  is_confirmed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (group_id)     REFERENCES groups(id)     ON DELETE CASCADE,
  FOREIGN KEY (room_id)      REFERENCES rooms(id)      ON DELETE RESTRICT,
  FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS negotiations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL,
  target_id    INTEGER NOT NULL,
  assignment_a INTEGER NOT NULL,
  assignment_b INTEGER NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (requester_id) REFERENCES coordinators(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id)    REFERENCES coordinators(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_a) REFERENCES assignments(id)  ON DELETE CASCADE,
  FOREIGN KEY (assignment_b) REFERENCES assignments(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS computer_reports (
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

-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_coordinator_careers_coord ON coordinator_careers(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_careers_career ON coordinator_careers(career_id);
CREATE INDEX IF NOT EXISTS idx_assignments_room_day      ON assignments(room_id, day);
CREATE INDEX IF NOT EXISTS idx_assignments_professor_day ON assignments(professor_id, day);
CREATE INDEX IF NOT EXISTS idx_availability_professor    ON availability(professor_id, day);
CREATE INDEX IF NOT EXISTS idx_groups_subject            ON groups(subject_id);
CREATE INDEX IF NOT EXISTS idx_subjects_career_semester  ON subjects(career_id, semester);
CREATE INDEX IF NOT EXISTS idx_room_software_room        ON room_software(room_id);
CREATE INDEX IF NOT EXISTS idx_reports_room_status       ON computer_reports(room_id, status);
CREATE INDEX IF NOT EXISTS idx_negotiations_requester    ON negotiations(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_negotiations_target       ON negotiations(target_id, status);
