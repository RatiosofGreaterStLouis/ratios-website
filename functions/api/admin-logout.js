const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extra
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

export async function onRequestPost({
  request,
  env
}) {

  try {

    if (!env.ONEPROFILE_DB) {
      return json(
        { error: 'Sign out is temporarily unavailable.' },
        503
      );
    }

    const token =
      cookieValue(
        request,
        'oneprofile_admin_session'
      );

    if (token) {

      const tokenHash =
        await hash(token);

      await env.ONEPROFILE_DB.prepare(`
        DELETE FROM oneprofile_admin_sessions
        WHERE token_hash = ?
      `)
        .bind(tokenHash)
        .run();
    }

    const clearCookie =
      'oneprofile_admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';

    return json(
      { ok: true },
      200,
      {
        'Set-Cookie': clearCookie
      }
    );

  } catch (error) {

    console.error(
      'Admin logout error:',
      error
    );

    return json(
      { error: 'Unable to sign out.' },
      500
    );
  }
}

export async function onRequest(context) {

  if (context.request.method !== 'POST') {
    return json(
      { error: 'Method not allowed' },
      405
    );
  }

  return onRequestPost(context);
}