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

  for (
    const part of cookieHeader.split(';')
  ) {

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

  /*
    Support both likely staff cookie names so this
    endpoint can work with the existing RATIOS admin
    authentication without exposing request data to
    caregiver sessions.
  */

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

  /*
    The existing admin portal owns the exact staff
    session implementation. Try the established
    admin-session table names without ever falling
    back to caregiver authentication.
  */

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

      /*
        A missing alternate table is expected when
        only one admin-session schema exists.
      */

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


  if (request.method !== 'GET') {

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


  try {

    const result =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            r.id,
            r.enrollment_id,
            r.identifier_id,
            r.request_type,
            r.caregiver_note,
            r.request_status,
            r.submitted_by,
            r.reviewed_by,
            r.staff_note,
            r.reviewed_at,
            r.resolved_at,
            r.created_at,
            r.updated_at,

            i.product_type,
            i.label AS identifier_label,
            i.status AS identifier_status,

            e.participant_first_name,
            e.caregiver_first_name,
            e.caregiver_last_name,
            e.caregiver_email

          FROM oneprofile_lifeproduct_requests r

          INNER JOIN oneprofile_identifiers i
            ON i.id = r.identifier_id
           AND i.enrollment_id = r.enrollment_id

          INNER JOIN oneprofile_enrollments e
            ON e.enrollment_id = r.enrollment_id

          WHERE i.product_type IN (
            'lifepatch',
            'lifeband',
            'lifecard',
            'lifetag'
          )

          ORDER BY
            CASE
              WHEN r.request_status = 'open'
                THEN 0
              WHEN r.request_status = 'reviewed'
                THEN 1
              WHEN r.request_status = 'resolved'
                THEN 2
              ELSE 3
            END,
            r.created_at DESC
        `)
        .all();


    const requests =
      Array.isArray(result.results)
        ? result.results
        : [];


    const stats = {

      total:
        requests.length,

      open:
        requests.filter(
          item =>
            String(
              item.request_status || ''
            ).toLowerCase() === 'open'
        ).length,

      reviewed:
        requests.filter(
          item =>
            String(
              item.request_status || ''
            ).toLowerCase() === 'reviewed'
        ).length,

      resolved:
        requests.filter(
          item =>
            String(
              item.request_status || ''
            ).toLowerCase() === 'resolved'
        ).length

    };


    return json({
      authenticated: true,
      requests,
      stats
    });


  } catch (error) {

    console.error(
      'Admin LifeProduct requests error:',
      error
    );

    return json(
      {
        error:
          'Unable to load LifeProduct support requests.'
      },
      500
    );
  }
}