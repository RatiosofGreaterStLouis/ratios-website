const json = (body, status = 200) =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );


const hex = buffer =>
  [...new Uint8Array(buffer)]
    .map(value =>
      value
        .toString(16)
        .padStart(2, '0')
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

  const cookieHeader =
    request.headers.get('Cookie') || '';

  for (const part of cookieHeader.split(';')) {

    const [
      key,
      ...value
    ] = part.trim().split('=');

    if (key === name) {
      return value.join('=');
    }
  }

  return '';
}


async function authenticateAdmin(
  request,
  env
) {

  const token =
    cookieValue(
      request,
      'oneprofile_admin_session'
    ) ||
    cookieValue(
      request,
      'oneprofile_staff_session'
    );

  if (!token) {
    return null;
  }

  const tokenHash =
    await hash(token);

  const now =
    Math.floor(Date.now() / 1000);


  const attempts = [

    {
      sql: `
        SELECT
          s.staff_id,
          s.expires_at,
          a.email
        FROM oneprofile_admin_sessions s
        LEFT JOIN oneprofile_admin_users a
          ON a.id = s.staff_id
        WHERE s.token_hash = ?
        LIMIT 1
      `
    },

    {
      sql: `
        SELECT
          s.staff_id,
          s.expires_at,
          a.email
        FROM oneprofile_staff_sessions s
        LEFT JOIN oneprofile_staff a
          ON a.id = s.staff_id
        WHERE s.token_hash = ?
        LIMIT 1
      `
    }

  ];


  for (const attempt of attempts) {

    try {

      const session =
        await env.ONEPROFILE_DB
          .prepare(attempt.sql)
          .bind(tokenHash)
          .first();

      if (
        session &&
        Number(session.expires_at) >= now
      ) {
        return session;
      }

    } catch (error) {
      // Alternate schema may not exist.
    }
  }

  return null;
}


export async function onRequest(context) {

  const {
    request,
    env
  } = context;


  if (!env.ONEPROFILE_DB) {

    return json(
      {
        error:
          'Database binding unavailable.'
      },
      500
    );
  }


  if (request.method !== 'POST') {

    return json(
      {
        error:
          'Method not allowed.'
      },
      405
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

    body =
      await request.json();

  } catch (error) {

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


  try {

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


    const staffIdentity =
      String(
        staff.email ||
        staff.staff_id ||
        'RATIOS staff'
      );


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
          staffIdentity,
          requestId
        )
        .run();


      return json({
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
        staffIdentity,
        requestId
      )
      .run();


    return json({
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