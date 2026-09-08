# RATIOS OneProfile™ — Cloudflare-Only Database Setup

This version removes Supabase completely. OneProfile Enrollment 1.0 uses:

- Existing RATIOS site on Cloudflare Pages
- Cloudflare Pages Functions for secure server-side processing
- Cloudflare D1 for enrollment storage
- Brevo for confirmation + RATIOS notification emails

## What is already built

- `oneprofile-enroll.html` — public enrollment form
- `oneprofile-success.html` — confirmation page and enrollment ID display
- `assets/js/oneprofile-enroll.js` — form submission client
- `functions/api/oneprofile-enroll.js` — validates submissions, creates the OneProfile ID, saves to D1, and sends emails
- `cloudflare/oneprofile_schema.sql` — D1 database schema
- `oneprofile.html` — OneProfile enrollment entry point

## Important security rule

Never paste API keys into HTML files or anything under `assets/`. The Brevo API key belongs only in Cloudflare's encrypted environment-variable settings.

## Step 1 — Create the D1 database in Cloudflare

1. Open the Cloudflare dashboard for the account that hosts `ratiossaveslives.org`.
2. Go to **Workers & Pages** > **D1 SQL Database** (Cloudflare may label this simply **D1** or **Storage & databases > D1**).
3. Create a database named: `ratios-oneprofile`
4. Open its SQL console and run everything inside `cloudflare/oneprofile_schema.sql`.

## Step 2 — Bind D1 to the RATIOS Pages project

In the Cloudflare Pages project that serves `ratiossaveslives.org`:

1. Open **Settings** > **Bindings** (or **Variables and Secrets / Bindings**, depending on dashboard layout).
2. Add a **D1 database binding**.
3. Variable/binding name MUST be exactly: `ONEPROFILE_DB`
4. Select the `ratios-oneprofile` D1 database.
5. Add the binding for Production. Add it to Preview too if you want preview deployments to submit test enrollments.

There is no D1 database password or database API key to paste into the website.

## Step 3 — Create/keep Brevo free account

1. Create/sign into the RATIOS Brevo account.
2. Verify `info@ratiossaveslives.org` as a sender. Domain authentication is recommended.
3. Create a Brevo API key under SMTP & API > API Keys.
4. Keep that key private.

## Step 4 — Add Cloudflare environment variables

In the same Cloudflare Pages project, add these encrypted secrets/variables for Production:

- `BREVO_API_KEY` = your private Brevo API key
- `ONEPROFILE_SENDER_EMAIL` = `info@ratiossaveslives.org`
- `ONEPROFILE_SENDER_NAME` = `OneProfile™ by RATIOS`

Supabase variables are no longer used.

## Step 5 — Deploy and test

After the D1 binding and Brevo variables exist, deploy this website version from GitHub.

Use your own email address for the first enrollment test and verify:

1. The enrollment form submits successfully.
2. The browser redirects to `oneprofile-success.html`.
3. An ID like `RAT-OP-12AB34CD` appears.
4. The family confirmation email arrives.
5. `info@ratiossaveslives.org` receives the new-enrollment email.
6. The enrollment appears in Cloudflare D1 table `oneprofile_enrollments`.

## Privacy boundary for Enrollment 1.0

This first enrollment form intentionally does not collect detailed diagnoses, medication lists, Social Security numbers, insurance records, medical documents, or other high-sensitivity records. Add those only after the authenticated caregiver profile system has been designed with appropriate privacy/security controls.

## Next phase

After Enrollment 1.0 works, build caregiver authentication, email verification, loved-one profiles, emergency-view permissions, QR/NFC profile links, and an admin dashboard. Cloudflare D1 can remain the core database for that phase.
