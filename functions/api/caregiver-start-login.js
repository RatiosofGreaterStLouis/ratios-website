const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hash(value) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
function code6() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, '0');
}
const htmlSafe = (v) => clean(v, 500).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ONEPROFILE_DB || !env.BREVO_API_KEY) return json({ error: 'Caregiver sign-in is temporarily unavailable.' }, 503);
    const body = await request.json();
    const email = clean(body.email, 160).toLowerCase();
    const enrollmentId = clean(body.enrollment_id, 40).toUpperCase();
    if (!emailOk(email) || !/^RAT-OP-[A-Z0-9]{8}$/.test(enrollmentId)) return json({ error: 'Enter the email used to enroll and your OneProfile™ enrollment ID.' }, 400);

    const now = Math.floor(Date.now() / 1000);
    await env.ONEPROFILE_DB.prepare('DELETE FROM oneprofile_login_codes WHERE expires_at < ? OR used = 1').bind(now - 3600).run();
    await env.ONEPROFILE_DB.prepare('DELETE FROM oneprofile_sessions WHERE expires_at < ?').bind(now).run();

    const match = await env.ONEPROFILE_DB.prepare(`
      SELECT caregiver_first_name, caregiver_email, participant_first_name
      FROM oneprofile_enrollments
      WHERE enrollment_id = ? AND lower(caregiver_email) = ?
      LIMIT 1
    `).bind(enrollmentId, email).first();

    // Always return the same success shape to reduce account enumeration.
    if (!match) return json({ ok: true, message: 'If the information matches an enrollment, a sign-in code has been sent.' });

    const recent = await env.ONEPROFILE_DB.prepare(`
      SELECT COUNT(*) AS n FROM oneprofile_login_codes
      WHERE caregiver_email = ? AND enrollment_id = ? AND created_at >= datetime('now','-15 minutes')
    `).bind(email, enrollmentId).first();
    if (Number(recent?.n || 0) >= 5) return json({ error: 'Too many sign-in codes were requested. Please wait 15 minutes and try again.' }, 429);

    const code = code6();
    const codeHash = await hash(`${code}|${email}|${enrollmentId}|${env.BREVO_API_KEY}`);
    await env.ONEPROFILE_DB.prepare(`
      INSERT INTO oneprofile_login_codes (caregiver_email, enrollment_id, code_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(email, enrollmentId, codeHash, now + 600).run();

    const senderEmail = env.ONEPROFILE_SENDER_EMAIL || 'info@ratiossaveslives.org';
    const senderName = env.ONEPROFILE_SENDER_NAME || 'OneProfile™ by RATIOS';
    const emailPayload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email, name: match.caregiver_first_name || 'Caregiver' }],
      subject: 'Your OneProfile™ sign-in code',
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#10243a"><h1 style="color:#3b176b">OneProfile™ caregiver sign-in</h1><p>Hello ${htmlSafe(match.caregiver_first_name || 'there')},</p><p>Use this code to sign in to the caregiver portal for ${htmlSafe(match.participant_first_name)}.</p><div style="background:#07172e;color:#f6be4b;border-radius:16px;padding:22px;text-align:center;font-size:34px;font-weight:800;letter-spacing:.18em">${code}</div><p>This code expires in 10 minutes and can be used only once.</p><p>If you did not request this code, you can ignore this email.</p><p>RATIOS OneProfile™<br><a href="https://ratiossaveslives.org/caregiver-login.html">ratiossaveslives.org</a></p></div>`
    };
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(emailPayload)
    });
    if (!res.ok) {
      console.error('Portal code email failed', res.status, await res.text());
      return json({ error: 'We could not send the sign-in code. Please try again.' }, 502);
    }
    return json({ ok: true, message: 'If the information matches an enrollment, a sign-in code has been sent.' });
  } catch (e) {
    console.error(e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  return onRequestPost(context);
}
