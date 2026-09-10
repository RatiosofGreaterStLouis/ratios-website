const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extra
    }
  });

const clean = (v, max = 200) =>
  String(v ?? '').trim().slice(0, max);

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

function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);

  let s = '';

  for (const b of a) {
    s += String.fromCharCode(b);
  }

  return btoa(s)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function adminEmails(env) {
  return String(env.ONEPROFILE_ADMIN_EMAILS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

export async function onRequestPost({ request, env }) {

  try {

    if (
      !env.ONEPROFILE_DB ||
      !env.BREVO_API_KEY
    ) {
      return json(
        {
          error:
            'Admin sign-in is temporarily unavailable.'
        },
        503
      );
    }

    const body = await request.json();

    const email =
      clean(body.email, 160).toLowerCase();

    const code =
      clean(body.code, 6);

    if (!/^\d{6}$/.test(code)) {
      return json(
        {
          error:
            'Enter the 6-digit code from your email.'
        },
        400
      );
    }

    const allowed = adminEmails(env);

    if (!allowed.includes(email)) {
      return json(
        {
          error:
            'That sign-in code is not valid.'
        },
        401
      );
    }

    const now =
      Math.floor(Date.now() / 1000);

    const row =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          id,
          code_hash,
          expires_at,
          attempts
        FROM oneprofile_admin_login_codes
        WHERE staff_email = ?
          AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `)
        .bind(email)
        .first();

    if (
      !row ||
      Number(row.expires_at) < now
    ) {
      return json(
        {
          error:
            'That code has expired. Request a new admin sign-in code.'
        },
        401
      );
    }

    if (Number(row.attempts) >= 5) {
      return json(
        {
          error:
            'Too many incorrect attempts. Request a new admin sign-in code.'
        },
        429
      );
    }

    const expected =
      await hash(
        `${code}|${email}|admin|${env.BREVO_API_KEY}`
      );

    if (expected !== row.code_hash) {

      await env.ONEPROFILE_DB.prepare(`
        UPDATE oneprofile_admin_login_codes
        SET attempts = attempts + 1
        WHERE id = ?
      `)
        .bind(row.id)
        .run();

      return json(
        {
          error:
            'That code is not correct. Please try again.'
        },
        401
      );
    }

    await env.ONEPROFILE_DB.prepare(`
      UPDATE oneprofile_admin_login_codes
      SET used = 1
      WHERE id = ?
    `)
      .bind(row.id)
      .run();

    const token =
      randomToken(32);

    const tokenHash =
      await hash(token);

    const expires =
      now + (8 * 60 * 60);

    await env.ONEPROFILE_DB.prepare(`
      INSERT INTO oneprofile_admin_sessions
        (
          token_hash,
          staff_email,
          expires_at
        )
      VALUES (?, ?, ?)
    `)
      .bind(
        tokenHash,
        email,
        expires
      )
      .run();

    const cookie =
      `oneprofile_admin_session=${token}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict`;

    return json(
      {
        ok: true
      },
      200,
      {
        'Set-Cookie': cookie
      }
    );

  } catch (e) {

    console.error(e);

    return json(
      {
        error:
          'Something went wrong. Please try again.'
      },
      500
    );
  }
}

export async function onRequest(context) {

  if (context.request.method !== 'POST') {
    return json(
      {
        error:
          'Method not allowed'
      },
      405
    );
  }

  return onRequestPost(context);
}