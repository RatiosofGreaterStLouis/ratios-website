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
    .map(b =>
      b.toString(16).padStart(2, '0')
    )
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


async function authenticateAdmin(
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


  const now =
    Math.floor(Date.now() / 1000);

  const tokenHash =
    await hash(token);


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
    Number(session.expires_at) < now
  ) {
    return null;
  }


  const email =
    String(
      session.staff_email || ''
    ).toLowerCase();


  const allowed =
    adminEmails(env);


  if (!allowed.includes(email)) {

    await env.ONEPROFILE_DB
      .prepare(`
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
            'Database binding unavailable.'
        },
        503
      );
    }


    const staff =
      await authenticateAdmin(
        request,
        env
      );


    if (!staff) {

      return json(
        {
          authenticated: false,
          error:
            'Staff authentication required.'
        },
        401
      );
    }


    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          error:
            'Invalid request.'
        },
        400
      );
    }


    const requestId =
      Number(body.request_id);

    const action =
      String(
        body.action || ''
      )
        .trim()
        .toLowerCase();

    const staffNote =
      String(
        body.staff_note || ''
      ).trim();


    if (
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {

      return json(
        {
          error:
            'Invalid support request ID.'
        },
        400
      );
    }


    if (
      action !== 'review' &&
      action !== 'resolve'
    ) {

      return json(
        {
          error:
            'Invalid request action.'
        },
        400
      );
    }


    if (staffNote.length > 1500) {

      return json(
        {
          error:
            'Staff note must be 1,500 characters or fewer.'
        },
        400
      );
    }


    const existing =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            r.id,
            r.enrollment_id,
            r.identifier_id,
            r.request_status,
            i.product_type

          FROM oneprofile_lifeproduct_requests r

          INNER JOIN oneprofile_identifiers i
            ON i.id = r.identifier_id
           AND i.enrollment_id = r.enrollment_id

          WHERE r.id = ?
            AND i.product_type IN (
              'lifepatch',
              'lifeband',
              'lifecard',
              'lifetag'
            )

          LIMIT 1
        `)
        .bind(requestId)
        .first();


    if (!existing) {

      return json(
        {
          error:
            'LifeProduct support request not found.'
        },
        404
      );
    }


    const currentStatus =
      String(
        existing.request_status || ''
      ).toLowerCase();


    if (currentStatus === 'resolved') {

      return json(
        {
          error:
            'This support request has already been resolved.'
        },
        409
      );
    }


    if (action === 'review') {

      await env.ONEPROFILE_DB
        .prepare(`
          UPDATE oneprofile_lifeproduct_requests

          SET
            request_status = 'reviewed',
            staff_note = ?,
            reviewed_by = ?,
            reviewed_at =
              COALESCE(
                reviewed_at,
                datetime('now')
              ),
            updated_at = datetime('now')

          WHERE id = ?
        `)
        .bind(
          staffNote || null,
          staff.email,
          requestId
        )
        .run();


      return json({
        authenticated: true,
        success: true,
        request_id: requestId,
        request_status: 'reviewed'
      });
    }


    await env.ONEPROFILE_DB
      .prepare(`
        UPDATE oneprofile_lifeproduct_requests

        SET
          request_status = 'resolved',
          staff_note = ?,
          reviewed_by =
            COALESCE(
              reviewed_by,
              ?
            ),
          reviewed_at =
            COALESCE(
              reviewed_at,
              datetime('now')
            ),
          resolved_at = datetime('now'),
          updated_at = datetime('now')

        WHERE id = ?
      `)
      .bind(
        staffNote || null,
        staff.email,
        requestId
      )
      .run();


    return json({
      authenticated: true,
      success: true,
      request_id: requestId,
      request_status: 'resolved'
    });


  } catch (error) {

    console.error(
      'Admin LifeProduct request update error:',
      error
    );

    return json(
      {
        error:
          'Unable to update LifeProduct support request.'
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
          'Method not allowed.'
      },
      405
    );
  }

  return onRequestPost(context);
}