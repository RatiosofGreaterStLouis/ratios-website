const unavailable = () =>
  new Response(JSON.stringify({ error: 'Photo unavailable.' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Robots-Tag': 'noindex, nofollow, noimageindex',
      'X-Content-Type-Options': 'nosniff'
    }
  });

function parsePublicFields(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.ONEPROFILE_DB || !env.ONEPROFILE_PHOTOS) {
      return unavailable();
    }

    const url = new URL(request.url);

    const code = url.searchParams.get('code') || '';
    const photoIdRaw = url.searchParams.get('photo') || '';
    const photoId = Number(photoIdRaw);

    if (
      code.length < 16 ||
      !Number.isInteger(photoId) ||
      photoId <= 0
    ) {
      return unavailable();
    }

    /*
     * Resolve only an active OneProfile™ identifier.
     */
    const identifier = await env.ONEPROFILE_DB
      .prepare(`
        SELECT
          enrollment_id
        FROM oneprofile_identifiers
        WHERE identifier_token = ?
          AND status = 'active'
        LIMIT 1
      `)
      .bind(code)
      .first();

    if (!identifier) {
      return unavailable();
    }

    /*
     * The caregiver's responder profile must still be enabled.
     */
    const publicProfile = await env.ONEPROFILE_DB
      .prepare(`
        SELECT
          public_fields
        FROM oneprofile_profiles
        WHERE enrollment_id = ?
          AND public_profile_enabled = 1
        LIMIT 1
      `)
      .bind(identifier.enrollment_id)
      .first();

    if (!publicProfile) {
      return unavailable();
    }

    const fields = parsePublicFields(
      publicProfile.public_fields
    );

    /*
     * Make sure this photo:
     * - belongs to this participant
     * - is active
     *
     * storage_key is used internally only and is never
     * returned to the browser.
     */
    const photo = await env.ONEPROFILE_DB
      .prepare(`
        SELECT
          storage_key,
          content_type,
          original_filename,
          is_primary
        FROM oneprofile_photos
        WHERE id = ?
          AND enrollment_id = ?
          AND status = 'active'
        LIMIT 1
      `)
      .bind(
        photoId,
        identifier.enrollment_id
      )
      .first();

    if (!photo) {
      return unavailable();
    }

    /*
     * Server-side sharing enforcement:
     *
     * Primary photo requires participant_photo.
     * Additional photo requires additional_photos.
     */
    if (
      Boolean(photo.is_primary) &&
      !fields.has('participant_photo')
    ) {
      return unavailable();
    }

    if (
      !Boolean(photo.is_primary) &&
      !fields.has('additional_photos')
    ) {
      return unavailable();
    }

    /*
     * Fetch from the private R2 bucket only after
     * all authorization checks have passed.
     */
    const object = await env.ONEPROFILE_PHOTOS.get(
      photo.storage_key
    );

    if (!object) {
      return unavailable();
    }

    const headers = new Headers();

    headers.set(
      'Content-Type',
      photo.content_type ||
        object.httpMetadata?.contentType ||
        'application/octet-stream'
    );

    headers.set(
      'Cache-Control',
      'private, no-store, max-age=0'
    );

    headers.set(
      'Pragma',
      'no-cache'
    );

    headers.set(
      'Expires',
      '0'
    );

    headers.set(
      'X-Robots-Tag',
      'noindex, nofollow, noimageindex'
    );

    headers.set(
      'X-Content-Type-Options',
      'nosniff'
    );

    const safeFilename =
      String(
        photo.original_filename ||
          'participant-photo'
      )
        .replace(/[\r\n"]/g, '')
        .trim() ||
      'participant-photo';

    headers.set(
      'Content-Disposition',
      `inline; filename="${safeFilename}"`
    );

    return new Response(
      object.body,
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    console.error(
      'identifier-photo error:',
      error
    );

    return unavailable();
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed'
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Robots-Tag':
            'noindex, nofollow, noimageindex'
        }
      }
    );
  }

  return onRequestGet(context);
}