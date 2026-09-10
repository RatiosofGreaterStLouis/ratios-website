const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });

const clean = (v, max = 200) =>
  String(v ?? '').trim().slice(0, max);

const emailOk = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

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

function code6() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);

  return String(a[0] % 1000000).padStart(6, '0');
}

function adminEmails(env) {
  return String(env.ONEPROFILE_ADMIN_EMAILS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

function htmlSafe(v) {
  return clean(v, 500)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

    if (!emailOk(email)) {
      return json(
        {
          error:
            'Enter a valid RATIOS staff email address.'
        },
        400
      );
    }

    const allowed = adminEmails(env);

    /*
      Always use a generic response for unauthorized
      addresses so the page does not reveal which
      staff accounts are authorized.
    */

    if (!allowed.includes(email)) {
      return json({
        ok: true,
        message:
          'If this email is authorized for RATIOS Admin, a sign-in code has been sent.'
      });
    }

    const now =
      Math.floor(Date.now() / 1000);

    await env.ONEPROFILE_DB.prepare(`
      DELETE FROM oneprofile_admin_login_codes
      WHERE expires_at < ? OR used = 1
    `)
      .bind(now - 3600)
      .run();

    await env.ONEPROFILE_DB.prepare(`
      DELETE FROM oneprofile_admin_sessions
      WHERE expires_at < ?
    `)
      .bind(now)
      .run();

    const recent =
      await env.ONEPROFILE_DB.prepare(`
        SELECT COUNT(*) AS n
        FROM oneprofile_admin_login_codes
        WHERE staff_email = ?
          AND created_at >= datetime('now','-15 minutes')
      `)
        .bind(email)
        .first();

    if (Number(recent?.n || 0) >= 5) {
      return json(
        {
          error:
            'Too many sign-in codes were requested. Please wait 15 minutes and try again.'
        },
        429
      );
    }

    const code = code6();

    const codeHash =
      await hash(
        `${code}|${email}|admin|${env.BREVO_API_KEY}`
      );

    await env.ONEPROFILE_DB.prepare(`
      INSERT INTO oneprofile_admin_login_codes
        (
          staff_email,
          code_hash,
          expires_at
        )
      VALUES (?, ?, ?)
    `)
      .bind(
        email,
        codeHash,
        now + 600
      )
      .run();

    const senderEmail =
      env.ONEPROFILE_SENDER_EMAIL ||
      'info@ratiossaveslives.org';

    const senderName =
      env.ONEPROFILE_SENDER_NAME ||
      'OneProfile™ by RATIOS';

    const emailPayload = {

      sender: {
        name: senderName,
        email: senderEmail
      },

      to: [
        {
          email,
          name: 'RATIOS Staff'
        }
      ],

      subject:
        'Your OneProfile™ Admin sign-in code',

      htmlContent: `
        <div
          style="
            font-family:Arial,sans-serif;
            max-width:620px;
            margin:auto;
            color:#10243a;
          "
        >

          <h1 style="color:#07172e;">
            OneProfile™ Admin
          </h1>

          <p>
            A secure sign-in was requested for
            <strong>${htmlSafe(email)}</strong>.
          </p>

          <p>
            Use this code to access the RATIOS
            OneProfile™ administrative portal.
          </p>

          <div
            style="
              background:#07172e;
              color:#f6be4b;
              border-radius:16px;
              padding:22px;
              text-align:center;
              font-size:34px;
              font-weight:800;
              letter-spacing:.18em;
            "
          >
            ${code}
          </div>

          <p>
            This code expires in 10 minutes and
            can be used only once.
          </p>

          <p>
            If you did not request this code,
            you can ignore this email.
          </p>

          <p>
            RATIOS OneProfile™
          </p>

        </div>
      `
    };

    const res =
      await fetch(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',

          headers: {
            'api-key': env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            accept: 'application/json'
          },

          body:
            JSON.stringify(emailPayload)
        }
      );

    if (!res.ok) {

      console.error(
        'Admin code email failed',
        res.status,
        await res.text()
      );

      return json(
        {
          error:
            'We could not send the admin sign-in code. Please try again.'
        },
        502
      );
    }

    return json({
      ok: true,
      message:
        'If this email is authorized for RATIOS Admin, a sign-in code has been sent.'
    });

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
      { error: 'Method not allowed' },
      405
    );
  }

  return onRequestPost(context);
}