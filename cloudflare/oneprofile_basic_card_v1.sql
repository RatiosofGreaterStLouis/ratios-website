-- Run ONCE in the Cloudflare D1 database bound as ONEPROFILE_DB, BEFORE deploying.
-- Existing profiles remain unchanged until their caregiver explicitly saves the new choice.
ALTER TABLE oneprofile_profiles ADD COLUMN basic_card_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE oneprofile_profiles ADD COLUMN basic_photo_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE oneprofile_profiles ADD COLUMN basic_help_note TEXT NOT NULL DEFAULT '';
ALTER TABLE oneprofile_profiles ADD COLUMN basic_card_consented_at TEXT;
