/* =========================================================
   OneProfile™ Profile V2
   RATIOS of Greater St. Louis

   Adds:
   - Physical / identifying description
   - Multiple participant photos
   - Diagnoses / conditions
   - Medications
   - Allergies
   - LifeProduct support requests
   - LifeProduct replacement history

   Existing V1 tables remain unchanged.

   Emergency sharing permissions continue to be stored in:
   oneprofile_profiles.public_fields

   New responder-share section keys will be enforced
   server-side later:

   participant_photo
   physical_description
   diagnoses
   medications
   allergies
   ========================================================= */


/* =========================================================
   PHYSICAL / IDENTIFYING DESCRIPTION
   One row per OneProfile™ enrollment
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_physical_description (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL UNIQUE,

  height_inches INTEGER,

  approximate_weight_lbs INTEGER,

  build_description TEXT,

  hair_color TEXT,

  hair_style TEXT,

  eye_color TEXT,

  complexion TEXT,

  wears_glasses INTEGER NOT NULL DEFAULT 0,

  mobility_aids TEXT,

  identifying_features TEXT,

  description_notes TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_physical_description_enrollment_idx
ON oneprofile_physical_description(enrollment_id);


/*
  Create an empty physical-description record
  for every existing OneProfile™ enrollment.
*/

INSERT OR IGNORE INTO oneprofile_physical_description (
  enrollment_id
)
SELECT
  enrollment_id
FROM oneprofile_enrollments;



/* =========================================================
   PARTICIPANT PHOTOS

   Actual image bytes should NOT be stored in D1.

   storage_key will later point to the private object
   stored in Cloudflare R2 or another approved object store.
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_photos (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL,

  storage_key TEXT NOT NULL UNIQUE,

  original_filename TEXT,

  content_type TEXT,

  size_bytes INTEGER,

  photo_type TEXT NOT NULL DEFAULT 'additional',

  caption TEXT,

  is_primary INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'active',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_photos_enrollment_idx
ON oneprofile_photos(enrollment_id);


CREATE INDEX IF NOT EXISTS oneprofile_photos_status_idx
ON oneprofile_photos(enrollment_id, status);


/*
  Only one active primary profile photo may exist
  for an enrollment at a time.

  Additional active photos are still allowed.
*/

CREATE UNIQUE INDEX IF NOT EXISTS oneprofile_photos_primary_idx
ON oneprofile_photos(enrollment_id)
WHERE is_primary = 1
  AND status = 'active';



/* =========================================================
   DIAGNOSES / MEDICAL CONDITIONS

   Multiple records may belong to one participant.
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_diagnoses (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL,

  diagnosis_name TEXT NOT NULL,

  diagnosis_notes TEXT,

  active INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_diagnoses_enrollment_idx
ON oneprofile_diagnoses(enrollment_id);


CREATE INDEX IF NOT EXISTS oneprofile_diagnoses_active_idx
ON oneprofile_diagnoses(enrollment_id, active);



/* =========================================================
   MEDICATION PROFILE

   Multiple medications may belong to one participant.

   "No current medications" should later be represented
   in the caregiver UI as an explicit profile setting,
   rather than inferred from an empty list.
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_medications (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL,

  medication_name TEXT NOT NULL,

  dose TEXT,

  route TEXT,

  frequency TEXT,

  purpose TEXT,

  medication_notes TEXT,

  active INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_medications_enrollment_idx
ON oneprofile_medications(enrollment_id);


CREATE INDEX IF NOT EXISTS oneprofile_medications_active_idx
ON oneprofile_medications(enrollment_id, active);



/* =========================================================
   MEDICAL PROFILE FLAGS

   These make "none" explicit rather than ambiguous.

   Example:
   no_current_medications = 1
   means the caregiver intentionally reported that
   there are currently no medications.
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_medical_profile_status (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL UNIQUE,

  no_current_medications INTEGER NOT NULL DEFAULT 0,

  no_known_allergies INTEGER NOT NULL DEFAULT 0,

  no_known_diagnoses INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_medical_profile_status_enrollment_idx
ON oneprofile_medical_profile_status(enrollment_id);


INSERT OR IGNORE INTO oneprofile_medical_profile_status (
  enrollment_id
)
SELECT
  enrollment_id
FROM oneprofile_enrollments;



/* =========================================================
   ALLERGIES

   allergy_type examples:
   - medication
   - food
   - environmental
   - latex
   - other

   severity examples:
   - mild
   - moderate
   - severe
   - life_threatening
   - unknown

   These values will be validated by the API rather than
   trusted directly from the browser.
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_allergies (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL,

  allergen TEXT NOT NULL,

  allergy_type TEXT,

  reaction TEXT,

  severity TEXT,

  allergy_notes TEXT,

  active INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_allergies_enrollment_idx
ON oneprofile_allergies(enrollment_id);


CREATE INDEX IF NOT EXISTS oneprofile_allergies_active_idx
ON oneprofile_allergies(enrollment_id, active);



/* =========================================================
   LIFEPRODUCT SUPPORT REQUESTS

   Caregivers may REPORT a problem.

   Reporting does NOT automatically deactivate,
   archive, replace, or otherwise modify the identifier.

   Physical LifeProduct status remains controlled
   by authorized RATIOS staff.
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_lifeproduct_requests (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL,

  identifier_id INTEGER NOT NULL,

  request_type TEXT NOT NULL,

  caregiver_note TEXT,

  request_status TEXT NOT NULL DEFAULT 'open',

  submitted_by TEXT NOT NULL DEFAULT 'caregiver',

  reviewed_by TEXT,

  staff_note TEXT,

  reviewed_at TEXT,

  resolved_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_lifeproduct_requests_enrollment_idx
ON oneprofile_lifeproduct_requests(enrollment_id);


CREATE INDEX IF NOT EXISTS oneprofile_lifeproduct_requests_identifier_idx
ON oneprofile_lifeproduct_requests(identifier_id);


CREATE INDEX IF NOT EXISTS oneprofile_lifeproduct_requests_status_idx
ON oneprofile_lifeproduct_requests(request_status, created_at);



/* =========================================================
   LIFEPRODUCT REPLACEMENT HISTORY

   Preserves the relationship between an old identifier
   and the new identifier issued to replace it.

   The old identifier record remains in
   oneprofile_identifiers for historical tracking.
   ========================================================= */

CREATE TABLE IF NOT EXISTS oneprofile_identifier_replacements (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  enrollment_id TEXT NOT NULL,

  original_identifier_id INTEGER NOT NULL,

  replacement_identifier_id INTEGER NOT NULL,

  request_id INTEGER,

  replacement_reason TEXT,

  replaced_by TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))

);


CREATE INDEX IF NOT EXISTS oneprofile_identifier_replacements_enrollment_idx
ON oneprofile_identifier_replacements(enrollment_id);


CREATE INDEX IF NOT EXISTS oneprofile_identifier_replacements_original_idx
ON oneprofile_identifier_replacements(original_identifier_id);


CREATE INDEX IF NOT EXISTS oneprofile_identifier_replacements_replacement_idx
ON oneprofile_identifier_replacements(replacement_identifier_id);


/*
  One physical identifier should not be recorded as
  having multiple replacement identifiers accidentally.

  If a later business workflow requires multiple sequential
  replacements, each new replacement becomes the original
  identifier in the next relationship.
*/

CREATE UNIQUE INDEX IF NOT EXISTS oneprofile_identifier_replacements_original_unique_idx
ON oneprofile_identifier_replacements(original_identifier_id);