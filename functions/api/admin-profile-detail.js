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
      SELECT staff_email, expires_at
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

  return { email };
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


    const url =
      new URL(request.url);

    const enrollmentId =
      String(
        url.searchParams.get('id') || ''
      )
        .trim()
        .toUpperCase();

    if (
      !/^RAT-OP-[A-Z0-9]{8}$/.test(
        enrollmentId
      )
    ) {
      return json(
        {
          error:
            'A valid enrollment ID is required.'
        },
        400
      );
    }


    const profile =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          e.enrollment_id,
          e.participant_first_name,
          e.participant_age_range,
          e.caregiver_first_name,
          e.caregiver_last_name,
          e.caregiver_email,
          e.relationship,
          e.preferred_contact,
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

          p.updated_at AS profile_updated_at

        FROM oneprofile_enrollments e

        LEFT JOIN oneprofile_profiles p
          ON p.enrollment_id =
            e.enrollment_id

        WHERE e.enrollment_id = ?

        LIMIT 1
      `)
        .bind(enrollmentId)
        .first();


    if (!profile) {
      return json(
        {
          error:
            'OneProfile™ enrollment not found.'
        },
        404
      );
    }


    const identifiersResult =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          id,
          product_type,
          label,
          status,
          scan_count,
          last_scanned_at,
          created_at,
          updated_at

        FROM oneprofile_identifiers

        WHERE enrollment_id = ?

        ORDER BY created_at DESC
      `)
        .bind(enrollmentId)
        .all();


    const identifiers =
      identifiersResult.results || [];


    const auditResult =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          staff_email,
          action,
          identifier_id,
          details,
          created_at

        FROM oneprofile_admin_audit_log

        WHERE enrollment_id = ?

        ORDER BY id DESC

        LIMIT 25
      `)
        .bind(enrollmentId)
        .all();


    return json({
      authenticated: true,

      staff: {
        email: admin.email
      },

      profile: {
        enrollment_id:
          profile.enrollment_id,

        participant_first_name:
          profile.participant_first_name,

        participant_age_range:
          profile.participant_age_range,

        caregiver_first_name:
          profile.caregiver_first_name,

        caregiver_last_name:
          profile.caregiver_last_name,

        caregiver_email:
          profile.caregiver_email,

        relationship:
          profile.relationship,

        preferred_contact:
          profile.preferred_contact,

        city:
          profile.city,

        state:
          profile.state,

        created_at:
          profile.created_at,

        profile_status:
          profile.profile_status,

        public_profile_enabled:
          Number(
            profile.public_profile_enabled || 0
          ),

        profile_updated_at:
          profile.profile_updated_at || null
      },

      identifiers:
        identifiers.map(item => ({
          id: Number(item.id),

          product_type:
            item.product_type,

          label:
            item.label,

          status:
            item.status,

          scan_count:
            Number(item.scan_count || 0),

          last_scanned_at:
            item.last_scanned_at || null,

          created_at:
            item.created_at,

          updated_at:
            item.updated_at
        })),

      audit_log:
        auditResult.results || []
    });

  } catch (error) {

    console.error(
      'Admin profile detail error:',
      error
    );

    return json(
      {
        error:
          'Unable to load this OneProfile™ record.'
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