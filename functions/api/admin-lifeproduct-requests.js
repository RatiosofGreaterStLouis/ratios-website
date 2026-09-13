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


export async function onRequestGet({
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

            rep.id AS replacement_record_id,
            rep.replacement_identifier_id,
            rep.replacement_reason,
            rep.replaced_by,
            rep.created_at AS replaced_at,

            replacement.product_type AS replacement_product_type,
            replacement.label AS replacement_identifier_label,
            replacement.status AS replacement_identifier_status,

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

          LEFT JOIN oneprofile_identifier_replacements rep
            ON rep.original_identifier_id = r.identifier_id
           AND rep.enrollment_id = r.enrollment_id

          LEFT JOIN oneprofile_identifiers replacement
            ON replacement.id = rep.replacement_identifier_id
           AND replacement.enrollment_id = r.enrollment_id

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
        requests.filter(item =>
          String(
            item.request_status || ''
          ).toLowerCase() === 'open'
        ).length,

      reviewed:
        requests.filter(item =>
          String(
            item.request_status || ''
          ).toLowerCase() === 'reviewed'
        ).length,

      resolved:
        requests.filter(item =>
          String(
            item.request_status || ''
          ).toLowerCase() === 'resolved'
        ).length

    };


    return json({
      authenticated: true,
      staff: {
        email: staff.email
      },
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
        authenticated: false,
        error:
          'Unable to load LifeProduct support requests.'
      },
      500
    );
  }
}


export async function onRequest(context) {

  if (context.request.method !== 'GET') {

    return json(
      {
        error:
          'Method not allowed.'
      },
      405
    );
  }

  return onRequestGet(context);
}