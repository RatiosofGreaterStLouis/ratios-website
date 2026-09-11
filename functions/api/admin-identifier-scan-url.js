export async function onRequestPost(context) {

  const {
    request,
    env
  } = context;


  try {

    if (!env.ONEPROFILE_DB) {
      return jsonResponse(
        {
          authenticated: false,
          error: 'Database unavailable.'
        },
        500
      );
    }


    const cookieHeader =
      request.headers.get('Cookie') || '';


    const sessionToken =
      getCookie(
        cookieHeader,
        'oneprofile_admin_session'
      );


    if (!sessionToken) {
      return unauthorized();
    }


    const tokenHash =
      await sha256Hex(
        sessionToken
      );


    const now =
      Date.now();


    const session =
      await env.ONEPROFILE_DB
        .prepare(`
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
      Number(session.expires_at) <= now
    ) {

      if (session) {

        await env.ONEPROFILE_DB
          .prepare(`
            DELETE FROM oneprofile_admin_sessions
            WHERE token_hash = ?
          `)
          .bind(tokenHash)
          .run();
      }

      return unauthorized();
    }


    const allowedEmails =
      parseAllowedEmails(
        env.ONEPROFILE_ADMIN_EMAILS
      );


    const staffEmail =
      normalizeEmail(
        session.staff_email
      );


    if (
      !staffEmail ||
      !allowedEmails.has(staffEmail)
    ) {

      await env.ONEPROFILE_DB
        .prepare(`
          DELETE FROM oneprofile_admin_sessions
          WHERE token_hash = ?
        `)
        .bind(tokenHash)
        .run();


      return unauthorized();
    }


    let body;


    try {

      body =
        await request.json();

    } catch {

      return jsonResponse(
        {
          authenticated: true,
          ok: false,
          error: 'Invalid request.'
        },
        400
      );
    }


    const enrollmentId =
      String(
        body?.enrollment_id || ''
      )
        .trim()
        .toUpperCase();


    const identifierId =
      Number(
        body?.identifier_id
      );


    if (
      !/^RAT-OP-[A-Z0-9]{8}$/.test(
        enrollmentId
      )
    ) {

      return jsonResponse(
        {
          authenticated: true,
          ok: false,
          error: 'Invalid enrollment ID.'
        },
        400
      );
    }


    if (
      !Number.isInteger(identifierId) ||
      identifierId < 1
    ) {

      return jsonResponse(
        {
          authenticated: true,
          ok: false,
          error: 'Invalid identifier ID.'
        },
        400
      );
    }


    const identifier =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            id,
            identifier_token,
            product_type,
            label,
            status
          FROM oneprofile_identifiers
          WHERE id = ?
            AND enrollment_id = ?
          LIMIT 1
        `)
        .bind(
          identifierId,
          enrollmentId
        )
        .first();


    if (!identifier) {

      return jsonResponse(
        {
          authenticated: true,
          ok: false,
          error: 'Identifier not found.'
        },
        404
      );
    }


    if (
      String(identifier.status || '')
        .toLowerCase() !== 'active'
    ) {

      return jsonResponse(
        {
          authenticated: true,
          ok: false,
          error:
            'This identifier is inactive. Reactivate it before accessing its QR code.'
        },
        409
      );
    }


    const scanUrl =
      `${new URL(request.url).origin}` +
      `/scan.html?code=${encodeURIComponent(
        identifier.identifier_token
      )}`;


    return jsonResponse(
      {
        authenticated: true,
        ok: true,

        identifier: {
          id:
            identifier.id,

          product_type:
            identifier.product_type,

          label:
            identifier.label,

          status:
            identifier.status
        },

        scan_url:
          scanUrl
      },
      200
    );


  } catch (error) {

    console.error(
      'Admin identifier QR access error:',
      error
    );


    return jsonResponse(
      {
        authenticated: true,
        ok: false,
        error:
          'Unable to access this identifier QR code.'
      },
      500
    );
  }
}


function normalizeEmail(value) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


function parseAllowedEmails(value) {

  return new Set(
    String(value || '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean)
  );
}


function getCookie(
  cookieHeader,
  name
) {

  const cookies =
    String(cookieHeader || '')
      .split(';');


  for (const cookie of cookies) {

    const parts =
      cookie.trim().split('=');


    const key =
      parts.shift();


    if (key === name) {

      return decodeURIComponent(
        parts.join('=')
      );
    }
  }


  return '';
}


async function sha256Hex(value) {

  const bytes =
    new TextEncoder()
      .encode(value);


  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      bytes
    );


  return Array.from(
    new Uint8Array(digest)
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, '0')
    )
    .join('');
}


function unauthorized() {

  return jsonResponse(
    {
      authenticated: false,
      ok: false,
      error: 'Authentication required.'
    },
    401
  );
}


function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'no-store'
      }
    }
  );
}