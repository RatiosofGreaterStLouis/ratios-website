const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff'
    }
  });


function safeFields(value) {

  let parsed = [];

  try {
    parsed = JSON.parse(value || '[]');
  } catch {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (field) =>
      typeof field === 'string'
  );

}


function unavailable() {

  return json(
    {
      error:
        'Photo unavailable.'
    },
    404
  );

}


export async function onRequestGet({
  request,
  env
}) {

  try {

    /*
      This endpoint serves responder-facing participant
      photos from the PRIVATE OneProfile™ R2 bucket.

      An R2 object is never returned merely because
      somebody knows its object key or photo ID.

      Access requires:
      1. A valid enabled emergency-profile token.
      2. The photo to belong to that same enrollment.
      3. The photo to still be active.
      4. The caregiver to have explicitly authorized
         the appropriate photo-sharing permission.
    */


    if (
      !env.ONEPROFILE_DB ||
      !env.ONEPROFILE_PHOTOS
    ) {

      console.error(
        'Emergency photo dependencies unavailable.'
      );

      return json(
        {
          error:
            'Photo service unavailable.'
        },
        503
      );

    }


    const url =
      new URL(request.url);


    const publicToken =
      url.searchParams.get('id') || '';


    const rawPhotoId =
      url.searchParams.get('photo') || '';


    const photoId =
      Number(rawPhotoId);


    if (
      publicToken.length < 16 ||
      !Number.isInteger(photoId) ||
      photoId <= 0
    ) {

      return unavailable();

    }


    /*
      Resolve the emergency token first.

      The emergency profile must currently be enabled.
    */

    const profile =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          enrollment_id,
          public_fields
        FROM oneprofile_profiles
        WHERE public_token = ?
          AND public_profile_enabled = 1
        LIMIT 1
      `)
        .bind(publicToken)
        .first();


    if (!profile) {

      return unavailable();

    }


    const fields =
      safeFields(
        profile.public_fields
      );


    /*
      Locate the requested photo only within the
      participant enrollment resolved from the token.

      storage_key remains server-side and is never sent
      to the responder.
    */

    const photo =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          id,
          storage_key,
          content_type,
          is_primary,
          status
        FROM oneprofile_photos
        WHERE id = ?
          AND enrollment_id = ?
          AND status = 'active'
        LIMIT 1
      `)
        .bind(
          photoId,
          profile.enrollment_id
        )
        .first();


    if (!photo) {

      return unavailable();

    }


    /*
      Primary and additional photos have separate
      caregiver permissions.

      Sharing the primary participant photo does NOT
      automatically authorize optional additional
      identifying photos.
    */

    const isPrimary =
      Number(photo.is_primary) === 1;


    if (
      isPrimary &&
      !fields.includes(
        'participant_photo'
      )
    ) {

      return unavailable();

    }


    if (
      !isPrimary &&
      !fields.includes(
        'additional_photos'
      )
    ) {

      return unavailable();

    }


    /*
      Retrieve the actual image from the private
      Cloudflare R2 bucket only after authorization
      has succeeded.
    */

    const object =
      await env.ONEPROFILE_PHOTOS.get(
        photo.storage_key
      );


    if (!object) {

      console.error(
        'Authorized emergency photo missing from R2:',
        photo.id
      );

      return unavailable();

    }


    const contentType =
      photo.content_type ||
      object.httpMetadata?.contentType ||
      'application/octet-stream';


    /*
      Images are intentionally not publicly cached.

      The responder receives the bytes through this
      permission-gated endpoint, not through a public
      R2 URL.
    */

    return new Response(
      object.body,
      {
        status: 200,

        headers: {
          'Content-Type':
            contentType,

          'Cache-Control':
            'private, no-store, max-age=0',

          'Pragma':
            'no-cache',

          'Expires':
            '0',

          'X-Robots-Tag':
            'noindex, nofollow, noimageindex',

          'X-Content-Type-Options':
            'nosniff',

          'Content-Disposition':
            'inline'
        }
      }
    );


  } catch (error) {

    console.error(
      'Emergency photo error:',
      error
    );


    return json(
      {
        error:
          'Photo unavailable.'
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


  return json(
    {
      error:
        'Method not allowed'
    },
    405
  );

}