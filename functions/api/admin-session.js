const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });

const hex = (buf) =>
  [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
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

  const raw =
    request.headers.get('Cookie') || '';

  for (const part of raw.split(';')) {

    const [key, ...value] =
      part.trim().split('=');

    if (key === name) {
      return value.join('=');
    }
  }

  return '';
}

function adminEmails(env) {
  return String(env.ONEPROFILE_ADMIN_EMAILS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

export async function onRequestGet({
  request,
  env
}) {

  try {

    if (!env.ONEPROFILE_DB) {
      return json(
        { authenticated: false },
        503
      );
    }

    const token =
      cookieValue(
        request,
        'oneprofile_admin_session'
      );

    if (!token) {
      return json(
        { authenticated: false },
        401
      );
    }

    const now =
      Math.floor(Date.now() / 1000);

    const tokenHash =
      await hash(token);

    const session =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          staff_email,
          expires_at
        FROM oneprofile_admin_sessions
        WHERE token_hash = ?
        LIMIT 1
      `)
        .bind(tokenHash)
        .first();

    if (
      !session ||
      Number(session.expires_at) < now
    ) {
      return json(
        { authenticated: false },
        401
      );
    }

    const email =
      String(session.staff_email || '')
        .toLowerCase();

    const allowed =
      adminEmails(env);

    if (!allowed.includes(email)) {

      await env.ONEPROFILE_DB.prepare(`
        DELETE FROM oneprofile_admin_sessions
        WHERE token_hash = ?
      `)
        .bind(tokenHash)
        .run();

      return json(
        { authenticated: false },
        401
      );
    }

    return json({
      authenticated: true,
      staff: {
        email
      }
    });

  } catch (e) {

    console.error(e);

    return json(
      {
        authenticated: false,
        error:
          'Unable to load admin session.'
      },
      500
    );
  }
}

export async function onRequest(context) {

  if (context.request.method !== 'GET') {
    return json(
      { error: 'Method not allowed' },
      405
    );
  }

  return onRequestGet(context);
}