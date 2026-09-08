const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

const clean = (v, max = 250) => String(v ?? '').trim().slice(0, max);
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const htmlSafe = (v) => clean(v, 1000)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.ONEPROFILE_DB || !env.BREVO_API_KEY) {
      return json({ error: 'OneProfile enrollment is being finalized. Please contact info@ratiossaveslives.org for assistance.' }, 503);
    }

    const body = await request.json();
    if (clean(body.website, 120)) return json({ ok: true }); // honeypot

    const first = clean(body.caregiver_first_name, 80);
    const last = clean(body.caregiver_last_name, 80);
    const email = clean(body.caregiver_email, 160).toLowerCase();
    const phone = clean(body.caregiver_phone, 30);
    const relationship = clean(body.relationship, 80);
    const preferredContact = clean(body.preferred_contact, 30);
    const participant = clean(body.participant_first_name, 80);
    const ageRange = clean(body.participant_age_range, 30);
    const city = clean(body.city, 100);
    const state = clean(body.state, 60);
    const notes = clean(body.notes, 700);
    const interests = Array.isArray(body.interests)
      ? body.interests.map(v => clean(v, 80)).filter(Boolean).slice(0, 12)
      : [];

    if (!first || !last || !emailOk(email) || !phone || !relationship || !preferredContact ||
        !participant || !ageRange || !city || !state || body.program_consent !== 'yes' || body.email_consent !== 'yes') {
      return json({ error: 'Please complete all required enrollment fields.' }, 400);
    }

    const enrollmentId = `RAT-OP-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

    try {
      await env.ONEPROFILE_DB.prepare(`
        INSERT INTO oneprofile_enrollments (
          enrollment_id, caregiver_first_name, caregiver_last_name, caregiver_email,
          caregiver_phone, relationship, preferred_contact, participant_first_name,
          participant_age_range, city, state, interests, notes, program_consent,
          email_consent, form_version, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
      `).bind(
        enrollmentId, first, last, email, phone, relationship, preferredContact,
        participant, ageRange, city, state, JSON.stringify(interests), notes,
        clean(body.form_version, 20) || '1.0', 'ratiossaveslives.org'
      ).run();
    } catch (dbErr) {
      console.error('Cloudflare D1 error', dbErr);
      return json({ error: 'We could not save your enrollment. Please try again.' }, 500);
    }

    const brevoHeaders = {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    };
    const senderEmail = env.ONEPROFILE_SENDER_EMAIL || 'info@ratiossaveslives.org';
    const senderName = env.ONEPROFILE_SENDER_NAME || 'OneProfile™ by RATIOS';

    const firstSafe = htmlSafe(first);
    const lastSafe = htmlSafe(last);
    const participantSafe = htmlSafe(participant);
    const phoneSafe = htmlSafe(phone);
    const relationshipSafe = htmlSafe(relationship);
    const preferredSafe = htmlSafe(preferredContact);
    const ageSafe = htmlSafe(ageRange);
    const citySafe = htmlSafe(city);
    const stateSafe = htmlSafe(state);
    const notesSafe = htmlSafe(notes || 'None');
    const interestsSafe = interests.length ? interests.map(htmlSafe).join(', ') : 'None selected';

    const familyEmail = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email, name: `${first} ${last}` }],
      subject: 'Welcome to OneProfile™ — Enrollment Received',
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#10243a"><h1 style="color:#3b176b">Welcome to OneProfile™</h1><p>Hello ${firstSafe},</p><p>Thank you for enrolling with RATIOS. Your OneProfile™ enrollment for <strong>${participantSafe}</strong> has been received successfully.</p><div style="background:#07172e;color:white;border-radius:14px;padding:20px;margin:22px 0"><div style="font-size:13px;opacity:.8">Your enrollment ID</div><div style="font-size:26px;font-weight:800;color:#f6be4b">${enrollmentId}</div></div><p>Please keep this ID for your records. We will contact you as caregiver profile tools and OneProfile™ safety features become available.</p><p><strong>Recognized. Protected. Connected.</strong></p><p>RATIOS<br>OneProfile™<br><a href="mailto:info@ratiossaveslives.org">info@ratiossaveslives.org</a></p><hr><p style="font-size:12px;color:#66788a">For your privacy, please do not email Social Security numbers, insurance records, or detailed medical records to RATIOS.</p></div>`
    };

    const adminEmail = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: 'info@ratiossaveslives.org', name: 'RATIOS' }],
      replyTo: { email, name: `${first} ${last}` },
      subject: `New OneProfile™ Enrollment — ${enrollmentId}`,
      htmlContent: `<div style="font-family:Arial,sans-serif;color:#10243a"><h2>New OneProfile™ enrollment</h2><p><strong>Enrollment ID:</strong> ${enrollmentId}</p><p><strong>Caregiver:</strong> ${firstSafe} ${lastSafe}<br><strong>Email:</strong> ${htmlSafe(email)}<br><strong>Phone:</strong> ${phoneSafe}<br><strong>Relationship:</strong> ${relationshipSafe}<br><strong>Preferred contact:</strong> ${preferredSafe}</p><p><strong>Participant:</strong> ${participantSafe}<br><strong>Age range:</strong> ${ageSafe}<br><strong>Location:</strong> ${citySafe}, ${stateSafe}</p><p><strong>Interests:</strong> ${interestsSafe}</p><p><strong>Notes:</strong> ${notesSafe}</p></div>`
    };

    const endpoint = 'https://api.brevo.com/v3/smtp/email';
    const [familyRes, adminRes] = await Promise.all([
      fetch(endpoint, { method: 'POST', headers: brevoHeaders, body: JSON.stringify(familyEmail) }),
      fetch(endpoint, { method: 'POST', headers: brevoHeaders, body: JSON.stringify(adminEmail) })
    ]);

    if (!familyRes.ok) console.error('Family email failed', familyRes.status, await familyRes.text());
    if (!adminRes.ok) console.error('Admin email failed', adminRes.status, await adminRes.text());

    return json({ ok: true, enrollment_id: enrollmentId });
  } catch (err) {
    console.error(err);
    return json({ error: 'Something went wrong. Please try again or contact info@ratiossaveslives.org.' }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  return onRequestPost(context);
}
