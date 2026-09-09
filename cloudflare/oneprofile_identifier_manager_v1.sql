CREATE TABLE IF NOT EXISTS oneprofile_identifiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier_token TEXT NOT NULL UNIQUE,
  enrollment_id TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'digital_qr',
  label TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oneprofile_identifiers_enrollment_idx
ON oneprofile_identifiers(enrollment_id);

CREATE INDEX IF NOT EXISTS oneprofile_identifiers_token_idx
ON oneprofile_identifiers(identifier_token);
