CREATE TABLE IF NOT EXISTS oneprofile_profile_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id TEXT NOT NULL UNIQUE,
  preferred_name TEXT,
  communication_method TEXT NOT NULL DEFAULT '',
  communication_notes TEXT,
  sensory_triggers TEXT,
  calming_supports TEXT,
  touch_preference TEXT,
  safety_risk_level TEXT NOT NULL DEFAULT '',
  known_destinations TEXT,
  safe_approach TEXT,
  emergency_contact_name TEXT NOT NULL DEFAULT '',
  emergency_contact_relationship TEXT NOT NULL DEFAULT '',
  emergency_contact_phone TEXT NOT NULL DEFAULT '',
  alternate_contact_name TEXT,
  alternate_contact_phone TEXT,
  responder_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oneprofile_profile_details_enrollment_idx
ON oneprofile_profile_details (enrollment_id);

INSERT OR IGNORE INTO oneprofile_profile_details (enrollment_id)
SELECT enrollment_id FROM oneprofile_enrollments;
