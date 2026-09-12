const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });


const hex = (buffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) =>
      byte.toString(16).padStart(2, '0')
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


async function auth(request, env) {

  const token =
    cookieValue(
      request,
      'oneprofile_session'
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
        enrollment_id,
        expires_at
      FROM oneprofile_sessions
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


  return session;
}


/*
  These are the ONLY emergency-sharing permissions
  that a caregiver may save.

  Private profile data is not responder-visible merely
  because it exists in OneProfile™.

  The responder-facing APIs will separately enforce
  these permissions before returning any information.
*/

const allowed = new Set([

  /* Identity & communication */
  'preferred_name',
  'communication_method',
  'communication_notes',

  /* Participant identification */
  'participant_photo',
  'additional_photos',
  'physical_description',

  /* Sensory support */
  'sensory_triggers',
  'calming_supports',
  'touch_preference',

  /* Safety / wandering */
  'safety_risk_level',
  'known_destinations',
  'safe_approach',

  /* Medical */
  'diagnoses',
  'medications',
  'allergies',

  /* Emergency contacts */
  'emergency_contact_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
  'alternate_contact_name',
  'alternate_contact_phone',

  /* Responder note */
  'responder_notes'

]);


function token() {

  const bytes =
    new Uint8Array(18);

  crypto.getRandomValues(bytes);

  return btoa(
    String.fromCharCode(...bytes)
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

}


function safeFields(value) {

  let parsed = [];

  try {

    parsed =
      JSON.parse(value || '[]');

  } catch {

    parsed = [];

  }


  if (!Array.isArray(parsed)) {
    return [];
  }


  return [
    ...new Set(
      parsed.filter(
        (field) =>
          allowed.has(field)
      )
    )
  ];

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
            'Database unavailable.'
        },
        503
      );
    }


    const account =
      await auth(
        request,
        env
      );


    if (!account) {
      return json(
        {
          authenticated: false
        },
        401
      );
    }


    const profile =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          public_profile_enabled,
          public_token,
          public_fields
        FROM oneprofile_profiles
        WHERE enrollment_id = ?
        LIMIT 1
      `)
        .bind(
          account.enrollment_id
        )
        .first();


    return json({
      authenticated: true,

      enabled:
        !!profile?.public_profile_enabled,

      public_token:
        profile?.public_token || '',

      fields:
        safeFields(
          profile?.public_fields
        )
    });


  } catch (error) {

    console.error(error);

    return json(
      {
        error:
          'Unable to load sharing settings.'
      },
      500
    );

  }

}


export async function onRequestPost({
  request,
  env
}) {

  try {

    if (!env.ONEPROFILE_DB) {
      return json(
        {
          error:
            'Database unavailable.'
        },
        503
      );
    }


    const account =
      await auth(
        request,
        env
      );


    if (!account) {
      return json(
        {
          authenticated: false
        },
        401
      );
    }


    const body =
      await request.json();


    const requestedFields =
      Array.isArray(body.fields)
        ? body.fields
        : [];


    const fields = [
      ...new Set(
        requestedFields.filter(
          (field) =>
            allowed.has(field)
        )
      )
    ];


    const enabled =
      !!body.enabled;


    if (
      enabled &&
      !fields.length
    ) {

      return json(
        {
          error:
            'Choose at least one item to share.'
        },
        400
      );

    }


    const existing =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          public_token
        FROM oneprofile_profiles
        WHERE enrollment_id = ?
        LIMIT 1
      `)
        .bind(
          account.enrollment_id
        )
        .first();


    const publicToken =
      existing?.public_token ||
      token();


    await env.ONEPROFILE_DB.prepare(`
      UPDATE oneprofile_profiles

      SET
        public_profile_enabled = ?,
        public_token = ?,
        public_fields = ?,

        public_enabled_at =
          CASE
            WHEN ? = 1
            THEN COALESCE(
              public_enabled_at,
              datetime('now')
            )
            ELSE public_enabled_at
          END,

        updated_at =
          datetime('now')

      WHERE enrollment_id = ?
    `)
      .bind(
        enabled ? 1 : 0,
        publicToken,
        JSON.stringify(fields),
        enabled ? 1 : 0,
        account.enrollment_id
      )
      .run();


    return json({
      ok: true,
      enabled,
      public_token:
        publicToken,
      fields,

      url:
        `/emergency.html?id=${encodeURIComponent(publicToken)}`
    });


  } catch (error) {

    console.error(error);

    return json(
      {
        error:
          'Unable to save sharing settings.'
      },
      500
    );

  }

}


export async function onRequest(
  context
) {

  if (
    context.request.method ===
    'GET'
  ) {
    return onRequestGet(
      context
    );
  }


  if (
    context.request.method ===
    'POST'
  ) {
    return onRequestPost(
      context
    );
  }


  return json(
    {
      error:
        'Method not allowed'
    },
    405
  );

}