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

  return String(
    env.ONEPROFILE_ADMIN_EMAILS || ''
  )
    .split(',')
    .map(value =>
      value.trim().toLowerCase()
    )
    .filter(Boolean);
}


async function requireAdmin(
  request,
  env
) {

  const token =
    cookieValue(
      request,
      'oneprofile_admin_session'
    );

  if (!token) {
    return null;
  }


  const tokenHash =
    await hash(token);

  const now =
    Math.floor(Date.now() / 1000);


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
    return null;
  }


  const email =
    String(
      session.staff_email || ''
    )
      .trim()
      .toLowerCase();


  if (
    !adminEmails(env).includes(email)
  ) {

    await env.ONEPROFILE_DB.prepare(`
      DELETE FROM oneprofile_admin_sessions
      WHERE token_hash = ?
    `)
      .bind(tokenHash)
      .run();

    return null;
  }


  return {
    email
  };
}


export async function onRequestPost({
  request,
  env
}) {

  try {

    if (!env.ONEPROFILE_DB) {

      return json(
        {
          authenticated: false,
          error:
            'Admin service is temporarily unavailable.'
        },
        503
      );
    }


    const admin =
      await requireAdmin(
        request,
        env
      );


    if (!admin) {

      return json(
        {
          authenticated: false,
          error: 'Unauthorized.'
        },
        401
      );
    }


    const body =
      await request.json();


    const enrollmentId =
      String(
        body.enrollment_id || ''
      )
        .trim()
        .toUpperCase();


    const identifierId =
      Number(
        body.identifier_id
      );


    const requestedStatus =
      String(
        body.status || ''
      )
        .trim()
        .toLowerCase();


    if (
      !/^RAT-OP-[A-Z0-9]{8}$/.test(
        enrollmentId
      )
    ) {

      return json(
        {
          authenticated: true,
          error:
            'A valid enrollment ID is required.'
        },
        400
      );
    }


    if (
      !Number.isInteger(identifierId) ||
      identifierId < 1
    ) {

      return json(
        {
          authenticated: true,
          error:
            'A valid identifier ID is required.'
        },
        400
      );
    }


    if (
      requestedStatus !== 'active' &&
      requestedStatus !== 'inactive'
    ) {

      return json(
        {
          authenticated: true,
          error:
            'Identifier status must be active or inactive.'
        },
        400
      );
    }


    const identifier =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          id,
          enrollment_id,
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

      return json(
        {
          authenticated: true,
          error:
            'Identifier could not be found for this enrollment.'
        },
        404
      );
    }


    const oldStatus =
      String(
        identifier.status || ''
      )
        .trim()
        .toLowerCase();


    if (
      oldStatus === requestedStatus
    ) {

      return json({
        authenticated: true,
        ok: true,
        changed: false,

        identifier: {
          id:
            Number(identifier.id),

          enrollment_id:
            identifier.enrollment_id,

          status:
            oldStatus
        }
      });
    }


    const action =
      requestedStatus === 'active'
        ? 'identifier_reactivated'
        : 'identifier_deactivated';


    const details =
      JSON.stringify({
        previous_status:
          oldStatus,

        new_status:
          requestedStatus,

        product_type:
          identifier.product_type || null,

        label:
          identifier.label || null
      });


    await env.ONEPROFILE_DB.batch([

      env.ONEPROFILE_DB.prepare(`
        UPDATE oneprofile_identifiers
        SET
          status = ?,
          updated_at = datetime('now')
        WHERE id = ?
          AND enrollment_id = ?
      `)
        .bind(
          requestedStatus,
          identifierId,
          enrollmentId
        ),


      env.ONEPROFILE_DB.prepare(`
        INSERT INTO oneprofile_admin_audit_log (
          staff_email,
          action,
          enrollment_id,
          identifier_id,
          details
        )
        VALUES (?, ?, ?, ?, ?)
      `)
        .bind(
          admin.email,
          action,
          enrollmentId,
          identifierId,
          details
        )

    ]);


    return json({
      authenticated: true,
      ok: true,
      changed: true,

      identifier: {
        id:
          Number(identifier.id),

        enrollment_id:
          enrollmentId,

        status:
          requestedStatus
      }
    });


  } catch (error) {

    console.error(
      'Admin identifier status error:',
      error
    );


    return json(
      {
        error:
          'Unable to update the identifier status.'
      },
      500
    );
  }
}


export async function onRequest(context) {

  if (
    context.request.method !== 'POST'
  ) {

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