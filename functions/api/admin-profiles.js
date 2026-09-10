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
  const raw = request.headers.get('Cookie') || '';

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

async function requireAdmin(request, env) {

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
    String(session.staff_email || '')
      .trim()
      .toLowerCase();

  if (!adminEmails(env).includes(email)) {
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
          error:
            'OneProfile™ admin data is temporarily unavailable.'
        },
        503
      );
    }

    const admin =
      await requireAdmin(request, env);

    if (!admin) {
      return json(
        {
          authenticated: false,
          error: 'Unauthorized'
        },
        401
      );
    }

    const profilesResult =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          e.enrollment_id,
          e.participant_first_name,
          e.participant_age_range,
          e.caregiver_first_name,
          e.caregiver_last_name,
          e.caregiver_email,
          e.relationship,
          e.city,
          e.state,
          e.created_at,

          COALESCE(
            p.profile_status,
            'setup_needed'
          ) AS profile_status,

          COALESCE(
            p.public_profile_enabled,
            0
          ) AS public_profile_enabled,

          (
            SELECT COUNT(*)
            FROM oneprofile_identifiers i
            WHERE
              i.enrollment_id =
                e.enrollment_id
              AND i.status = 'active'
          ) AS active_identifier_count,

          (
            SELECT COUNT(*)
            FROM oneprofile_identifiers i
            WHERE
              i.enrollment_id =
                e.enrollment_id
          ) AS total_identifier_count,

          (
            SELECT COALESCE(
              SUM(i.scan_count),
              0
            )
            FROM oneprofile_identifiers i
            WHERE
              i.enrollment_id =
                e.enrollment_id
          ) AS scan_count,

          (
            SELECT MAX(
              i.last_scanned_at
            )
            FROM oneprofile_identifiers i
            WHERE
              i.enrollment_id =
                e.enrollment_id
          ) AS last_scanned_at

        FROM oneprofile_enrollments e

        LEFT JOIN oneprofile_profiles p
          ON p.enrollment_id =
            e.enrollment_id

        ORDER BY e.created_at DESC
      `).all();

    const profileRows =
      profilesResult.results || [];

    const stats =
      await env.ONEPROFILE_DB.prepare(`
        SELECT

          (
            SELECT COUNT(*)
            FROM oneprofile_enrollments
          ) AS total_profiles,

          (
            SELECT COUNT(*)
            FROM oneprofile_identifiers
            WHERE status = 'active'
          ) AS active_identifiers,

          (
            SELECT COALESCE(
              SUM(scan_count),
              0
            )
            FROM oneprofile_identifiers
          ) AS total_scans
      `).first();

    return json({
      authenticated: true,

      staff: {
        email: admin.email
      },

      stats: {
        total_profiles:
          Number(
            stats?.total_profiles || 0
          ),

        active_identifiers:
          Number(
            stats?.active_identifiers || 0
          ),

        total_scans:
          Number(
            stats?.total_scans || 0
          )
      },

      profiles:
        profileRows.map(row => ({
          enrollment_id:
            row.enrollment_id,

          participant_first_name:
            row.participant_first_name,

          participant_age_range:
            row.participant_age_range,

          caregiver_first_name:
            row.caregiver_first_name,

          caregiver_last_name:
            row.caregiver_last_name,

          caregiver_email:
            row.caregiver_email,

          relationship:
            row.relationship,

          city:
            row.city,

          state:
            row.state,

          created_at:
            row.created_at,

          profile_status:
            row.profile_status,

          public_profile_enabled:
            Number(
              row.public_profile_enabled || 0
            ),

          active_identifier_count:
            Number(
              row.active_identifier_count || 0
            ),

          total_identifier_count:
            Number(
              row.total_identifier_count || 0
            ),

          scan_count:
            Number(
              row.scan_count || 0
            ),

          last_scanned_at:
            row.last_scanned_at || null
        }))
    });

  } catch (error) {

    console.error(
      'Admin profiles error:',
      error
    );

    return json(
      {
        error:
          'Unable to load OneProfile™ admin data.'
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