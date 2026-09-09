ALTER TABLE oneprofile_profiles ADD COLUMN public_token TEXT;
ALTER TABLE oneprofile_profiles ADD COLUMN public_fields TEXT NOT NULL DEFAULT '[]';
ALTER TABLE oneprofile_profiles ADD COLUMN public_enabled_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS oneprofile_profiles_public_token_idx ON oneprofile_profiles(public_token);
