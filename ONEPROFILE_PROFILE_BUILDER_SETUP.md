# OneProfile™ Private Profile Builder V1

1. In Cloudflare D1 (`ratios-oneprofile`) Console, run `cloudflare/oneprofile_profile_builder_v1.sql`.
2. Confirm `oneprofile_profile_details` appears in `/tables`.
3. Copy this package into the existing GitHub repo and commit all new/changed files (do not commit old ZIP archives).
4. Cloudflare Pages should auto-deploy.
5. Sign in through `caregiver-login.html`, open the dashboard, then click **Complete OneProfile™**.

## Scope
This release stores private caregiver-entered communication, sensory, safety/wandering, emergency-contact, and responder-note information. It intentionally does not collect diagnoses, medications, Social Security numbers, insurance information, or medical records. Public QR/NFC sharing remains disabled.
