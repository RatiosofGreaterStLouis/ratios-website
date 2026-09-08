const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hash(value) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
function cookieValue(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) { const [k, ...v] = part.trim().split('='); if (k === name) return v.join('='); }
  return '';
}
export async function onRequestPost({ request, env }) {
  const token = cookieValue(request, 'oneprofile_session');
  if (token && env.ONEPROFILE_DB) {
    try { await env.ONEPROFILE_DB.prepare('DELETE FROM oneprofile_sessions WHERE token_hash = ?').bind(await hash(token)).run(); } catch (e) { console.error(e); }
  }
  return json({ ok: true }, 200, { 'Set-Cookie': 'oneprofile_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' });
}
export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  return onRequestPost(context);
}
