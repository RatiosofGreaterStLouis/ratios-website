CREATE TABLE IF NOT EXISTS oneprofile_login_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caregiver_email TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oneprofile_login_codes_lookup_idx
ON oneprofile_login_codes (caregiver_email, enrollment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS oneprofile_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  caregiver_email TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oneprofile_sessions_expiry_idx
ON oneprofile_sessions (expires_at);

CREATE TABLE IF NOT EXISTS oneprofile_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id TEXT NOT NULL UNIQUE,
  profile_status TEXT NOT NULL DEFAULT 'setup_needed',
  public_profile_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO oneprofile_profiles (enrollment_id)
SELECT enrollment_id FROM oneprofile_enrollments;
