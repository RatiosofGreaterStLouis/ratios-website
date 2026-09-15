const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });

const hex = buffer =>
  [...new Uint8Array(buffer)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

async function hash(value) {
  return hex(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value)
    )
  );
}

function cookieValue(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

function adminEmails(env) {
  return String(env.ONEPROFILE_ADMIN_EMAILS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(request, env) {
  const token = cookieValue(request, 'oneprofile_admin_session');
  if (!token) return null;

  const tokenHash = await hash(token);
  const now = Math.floor(Date.now() / 1000);

  const session = await env.ONEPROFILE_DB.prepare(`
    SELECT staff_email, expires_at
    FROM oneprofile_admin_sessions
    WHERE token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!session || Number(session.expires_at) < now) return null;

  const email = String(session.staff_email || '')
    .trim()
    .toLowerCase();

  if (!adminEmails(env).includes(email)) {
    await env.ONEPROFILE_DB.prepare(`
      DELETE FROM oneprofile_admin_sessions
      WHERE token_hash = ?
    `).bind(tokenHash).run();
    return null;
  }

  return { email };
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.ONEPROFILE_DB) {
      return json({
        authenticated: false,
        error: 'Admin service is temporarily unavailable.'
      }, 503);
    }

    const admin = await requireAdmin(request, env);
    if (!admin) {
      return json({ authenticated: false, error: 'Unauthorized.' }, 401);
    }

    const url = new URL(request.url);
    const enrollmentId = String(url.searchParams.get('id') || '')
      .trim()
      .toUpperCase();

    if (!/^RAT-OP-[A-Z0-9]{8}$/.test(enrollmentId)) {
      return json({
        authenticated: true,
        error: 'A valid enrollment ID is required.'
      }, 400);
    }

    const result = await env.ONEPROFILE_DB.prepare(`
      SELECT
        rep.id,
        rep.enrollment_id,
        rep.original_identifier_id,
        rep.replacement_identifier_id,
        rep.request_id,
        rep.replacement_reason,
        rep.replaced_by,
        rep.created_at AS replaced_at,
        original.product_type AS original_product_type,
        original.label AS original_identifier_label,
        original.status AS original_identifier_status,
        replacement.product_type AS replacement_product_type,
        replacement.label AS replacement_identifier_label,
        replacement.status AS replacement_identifier_status
      FROM oneprofile_identifier_replacements rep
      INNER JOIN oneprofile_identifiers original
        ON original.id = rep.original_identifier_id
       AND original.enrollment_id = rep.enrollment_id
      INNER JOIN oneprofile_identifiers replacement
        ON replacement.id = rep.replacement_identifier_id
       AND replacement.enrollment_id = rep.enrollment_id
      WHERE rep.enrollment_id = ?
      ORDER BY rep.created_at DESC, rep.id DESC
    `).bind(enrollmentId).all();

    return json({
      authenticated: true,
      staff: { email: admin.email },
      replacements: Array.isArray(result.results) ? result.results : []
    });

  } catch (error) {
    console.error('Admin replacement history error:', error);
    return json({
      authenticated: true,
      error: 'Unable to load LifeProduct replacement history.'
    }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ error: 'Method not allowed.' }, 405);
  }
  return onRequestGet(context);
}
