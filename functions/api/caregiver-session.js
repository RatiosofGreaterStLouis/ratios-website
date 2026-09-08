const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hash(value) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
function cookieValue(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}
export async function onRequestGet({ request, env }) {
  try {
    if (!env.ONEPROFILE_DB) return json({ authenticated: false }, 503);
    const token = cookieValue(request, 'oneprofile_session');
    if (!token) return json({ authenticated: false }, 401);
    const now = Math.floor(Date.now() / 1000);
    const tokenHash = await hash(token);
    const session = await env.ONEPROFILE_DB.prepare(`
      SELECT caregiver_email, enrollment_id, expires_at
      FROM oneprofile_sessions WHERE token_hash = ? LIMIT 1
    `).bind(tokenHash).first();
    if (!session || Number(session.expires_at) < now) return json({ authenticated: false }, 401);

    const enrollment = await env.ONEPROFILE_DB.prepare(`
      SELECT enrollment_id, caregiver_first_name, caregiver_last_name, caregiver_email,
             relationship, preferred_contact, participant_first_name, participant_age_range,
             city, state, created_at
      FROM oneprofile_enrollments
      WHERE enrollment_id = ? AND lower(caregiver_email) = ? LIMIT 1
    `).bind(session.enrollment_id, String(session.caregiver_email).toLowerCase()).first();
    if (!enrollment) return json({ authenticated: false }, 401);

    const profile = await env.ONEPROFILE_DB.prepare(`
      SELECT profile_status, public_profile_enabled, created_at, updated_at
      FROM oneprofile_profiles WHERE enrollment_id = ? LIMIT 1
    `).bind(session.enrollment_id).first();

    await env.ONEPROFILE_DB.prepare("UPDATE oneprofile_sessions SET last_seen_at = datetime('now') WHERE token_hash = ?").bind(tokenHash).run();
    return json({ authenticated: true, enrollment, profile: profile || { profile_status: 'setup_needed', public_profile_enabled: 0 } });
  } catch (e) {
    console.error(e);
    return json({ authenticated: false, error: 'Unable to load caregiver session.' }, 500);
  }
}
export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  return onRequestGet(context);
}
