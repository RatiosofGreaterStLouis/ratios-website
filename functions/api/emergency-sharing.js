import { safeFields } from '../_lib/emergency-access.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
async function auth(request, env) {
  const cookies = request.headers.get('Cookie') || '';
  const cookie = cookies.split(';').map(part => part.trim())
    .find(part => part.startsWith('oneprofile_session='));
  if (!cookie) return null;
  const token = cookie.slice('oneprofile_session='.length);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const session = await env.ONEPROFILE_DB.prepare(`
    SELECT enrollment_id, expires_at FROM oneprofile_sessions
    WHERE token_hash = ? LIMIT 1
  `).bind(hash).first();
  return session && Number(session.expires_at) > Math.floor(Date.now() / 1000) ? session : null;
}
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function payload(profile) {
  return {
    enabled: Number(profile?.public_profile_enabled) === 1,
    public_token: profile?.public_token || '',
    fields: safeFields(profile?.public_fields),
    basic_enabled: Number(profile?.basic_card_enabled) === 1 && Boolean(profile?.basic_card_consented_at),
    basic_photo: Number(profile?.basic_photo_enabled) === 1,
    basic_help_note: profile?.basic_help_note || ''
  };
}
async function settings(env, enrollmentId) {
  return env.ONEPROFILE_DB.prepare(`
    SELECT public_profile_enabled, public_token, public_fields, basic_card_enabled,
      basic_photo_enabled, basic_help_note, basic_card_consented_at
    FROM oneprofile_profiles WHERE enrollment_id = ? LIMIT 1
  `).bind(enrollmentId).first();
}
export async function onRequestGet({ request, env }) {
  try {
    if (!env.ONEPROFILE_DB) return json({ error: 'Database unavailable.' }, 503);
    const account = await auth(request, env);
    if (!account) return json({ authenticated: false }, 401);
    return json({ authenticated: true, ...payload(await settings(env, account.enrollment_id)) });
  } catch (error) {
    console.error('Unable to load sharing settings.', error);
    return json({ error: 'Unable to load sharing settings.' }, 500);
  }
}
export async function onRequestPost({ request, env }) {
  try {
    if (!env.ONEPROFILE_DB) return json({ error: 'Database unavailable.' }, 503);
    const origin = request.headers.get('Origin');
    if (origin && origin !== new URL(request.url).origin) {
      return json({ error: 'Request not allowed.' }, 403);
    }
    const account = await auth(request, env);
    if (!account) return json({ authenticated: false }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid settings.' }, 400); }
    if (!body || typeof body !== 'object' || typeof body.enabled !== 'boolean') {
      return json({ error: 'Invalid sharing mode.' }, 400);
    }
    const existing = await settings(env, account.enrollment_id);
    if (!existing) return json({ error: 'Complete profile setup before choosing sharing settings.' }, 409);
    const fields = safeFields(body.fields);
    const hasBasicChoice = Object.prototype.hasOwnProperty.call(body, 'basic_enabled');
    // Older clients may change full sharing but cannot silently enroll a basic card.
    if (hasBasicChoice && (typeof body.basic_enabled !== 'boolean' || typeof body.basic_photo !== 'boolean')) {
      return json({ error: 'Invalid basic card settings.' }, 400);
    }
    const basicEnabled = hasBasicChoice ? body.basic_enabled : payload(existing).basic_enabled;
    const basicPhoto = hasBasicChoice ? body.basic_photo : Number(existing.basic_photo_enabled) === 1;
    const note = hasBasicChoice ? body.basic_help_note : existing.basic_help_note || '';
    if (typeof note !== 'string' || note.length > 300) {
      return json({ error: 'Keep the How to help me note to 300 characters or fewer.' }, 400);
    }
    if (hasBasicChoice && basicEnabled && body.basic_consent !== true) {
      return json({ error: 'Please confirm who can see the basic emergency card.' }, 400);
    }
    if (body.enabled && !basicEnabled && !fields.length) {
      return json({ error: 'Choose at least one item to share.' }, 400);
    }
    const publicToken = existing.public_token || token();
    await env.ONEPROFILE_DB.prepare(`
      UPDATE oneprofile_profiles SET
        public_profile_enabled = ?, public_token = ?, public_fields = ?,
        basic_card_enabled = ?, basic_photo_enabled = ?, basic_help_note = ?,
        basic_card_consented_at = CASE WHEN ? = 1 THEN COALESCE(basic_card_consented_at, datetime('now'))
          ELSE basic_card_consented_at END,
        public_enabled_at = CASE WHEN ? = 1 THEN COALESCE(public_enabled_at, datetime('now'))
          ELSE public_enabled_at END,
        updated_at = datetime('now')
      WHERE enrollment_id = ?
    `).bind(body.enabled ? 1 : 0, publicToken, JSON.stringify(fields), basicEnabled ? 1 : 0,
      basicPhoto ? 1 : 0, note.trim(), hasBasicChoice && basicEnabled ? 1 : 0,
      body.enabled ? 1 : 0, account.enrollment_id).run();
    const saved = payload(await settings(env, account.enrollment_id));
    return json({ ok: true, ...saved, url: `/emergency.html?id=${encodeURIComponent(publicToken)}` });
  } catch (error) {
    console.error('Unable to save sharing settings.', error);
    return json({ error: 'Unable to save sharing settings.' }, 500);
  }
}
export async function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({ error: 'Method not allowed' }, 405);
}
