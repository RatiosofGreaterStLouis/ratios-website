# OneProfile™ Caregiver Portal V1 — Setup

This release adds passwordless caregiver sign-in and a protected enrollment dashboard to the existing Cloudflare Pages + D1 + Brevo OneProfile enrollment system.

## What this release adds

- `caregiver-login.html` — email + enrollment ID sign-in
- 6-digit one-time code delivered through Brevo
- `caregiver-dashboard.html` — protected dashboard displaying basic enrollment data
- HttpOnly, Secure, SameSite=Lax session cookie
- 10-minute one-time codes, maximum 5 verification attempts
- 7-day caregiver sessions
- D1 tables for login codes, sessions, and future profile status
- caregiver portal links on OneProfile and enrollment success pages

## Step 1 — Run the D1 migration

In Cloudflare D1 → `ratios-oneprofile` → Console, run the contents of:

`cloudflare/oneprofile_portal_v1.sql`

This migration does not delete or replace the existing enrollment table.

## Step 2 — Deploy files

Copy/merge this package into the existing `ratios-website` Git repository. Commit the new/changed files and let Cloudflare Pages deploy `main`.

## Step 3 — Test

1. Open `https://ratiossaveslives.org/caregiver-login.html`
2. Enter the email from a real/test enrollment and its `RAT-OP-XXXXXXXX` enrollment ID.
3. Confirm the 6-digit Brevo sign-in email arrives.
4. Enter the code.
5. Confirm the caregiver dashboard loads the matching enrollment information.
6. Sign out and confirm the dashboard redirects back to sign-in.

## Security scope of V1

This version deliberately does **not** collect diagnoses, medications, medical records, Social Security numbers, insurance data, or other detailed health information. It establishes the authenticated caregiver layer before the private emergency profile and public emergency-view layers are added.

The public QR/NFC emergency view should remain a separate data model with explicit caregiver-controlled field sharing.
