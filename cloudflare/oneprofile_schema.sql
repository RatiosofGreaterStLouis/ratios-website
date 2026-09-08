CREATE TABLE IF NOT EXISTS oneprofile_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id TEXT NOT NULL UNIQUE,
  caregiver_first_name TEXT NOT NULL,
  caregiver_last_name TEXT NOT NULL,
  caregiver_email TEXT NOT NULL,
  caregiver_phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  preferred_contact TEXT NOT NULL,
  participant_first_name TEXT NOT NULL,
  participant_age_range TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  interests TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  program_consent INTEGER NOT NULL DEFAULT 0,
  email_consent INTEGER NOT NULL DEFAULT 0,
  form_version TEXT NOT NULL DEFAULT '1.0',
  source TEXT NOT NULL DEFAULT 'ratiossaveslives.org',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oneprofile_enrollments_email_idx
  ON oneprofile_enrollments (caregiver_email);

CREATE INDEX IF NOT EXISTS oneprofile_enrollments_created_idx
  ON oneprofile_enrollments (created_at DESC);
