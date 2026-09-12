const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers
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


function clean(value, max = 500) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}


function positiveId(value) {
  const number =
    Number(value);

  if (
    !Number.isInteger(number) ||
    number < 1
  ) {
    return null;
  }

  return number;
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
        caregiver_email,
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


  const enrollment =
    await env.ONEPROFILE_DB.prepare(`
      SELECT
        enrollment_id,
        participant_first_name,
        caregiver_email
      FROM oneprofile_enrollments
      WHERE enrollment_id = ?
        AND lower(caregiver_email) = ?
      LIMIT 1
    `)
      .bind(
        session.enrollment_id,
        String(
          session.caregiver_email
        ).toLowerCase()
      )
      .first();


  if (!enrollment) {
    return null;
  }


  return {
    session,
    enrollment
  };
}


function imageTypeFromBytes(bytes) {

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return {
      contentType: 'image/jpeg',
      extension: 'jpg'
    };
  }


  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return {
      contentType: 'image/png',
      extension: 'png'
    };
  }


  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return {
      contentType: 'image/webp',
      extension: 'webp'
    };
  }


  return null;
}


async function getOwnedPhoto(
  env,
  enrollmentId,
  photoId
) {

  return env.ONEPROFILE_DB.prepare(`
    SELECT
      id,
      enrollment_id,
      storage_key,
      original_filename,
      content_type,
      size_bytes,
      photo_type,
      caption,
      is_primary,
      status,
      created_at,
      updated_at
    FROM oneprofile_photos
    WHERE id = ?
      AND enrollment_id = ?
      AND status = 'active'
    LIMIT 1
  `)
    .bind(
      photoId,
      enrollmentId
    )
    .first();
}


async function onGet({
  request,
  env
}) {

  try {

    if (
      !env.ONEPROFILE_DB ||
      !env.ONEPROFILE_PHOTOS
    ) {
      return json(
        {
          error:
            'Photo storage is unavailable.'
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


    const enrollmentId =
      account.enrollment
        .enrollment_id;


    const url =
      new URL(request.url);


    const requestedPhotoId =
      positiveId(
        url.searchParams.get('id')
      );


    /*
      If an ID is supplied, return the actual
      private photo bytes.

      R2 itself remains private. The caregiver
      must have a valid authenticated session
      before this function retrieves the object.
    */

    if (requestedPhotoId) {

      const photo =
        await getOwnedPhoto(
          env,
          enrollmentId,
          requestedPhotoId
        );


      if (!photo) {
        return json(
          {
            error:
              'Photo not found.'
          },
          404
        );
      }


      const object =
        await env.ONEPROFILE_PHOTOS.get(
          photo.storage_key
        );


      if (!object) {
        return json(
          {
            error:
              'Photo file is unavailable.'
          },
          404
        );
      }


      const headers =
        new Headers();


      headers.set(
        'Content-Type',
        photo.content_type ||
        object.httpMetadata
          ?.contentType ||
        'application/octet-stream'
      );


      headers.set(
        'Cache-Control',
        'private, no-store, max-age=0'
      );


      headers.set(
        'X-Content-Type-Options',
        'nosniff'
      );


      headers.set(
        'Content-Disposition',
        'inline'
      );


      return new Response(
        object.body,
        {
          status: 200,
          headers
        }
      );
    }


    /*
      Otherwise return the caregiver's active
      photo records and authenticated image URLs.
    */

    const result =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          id,
          original_filename,
          content_type,
          size_bytes,
          photo_type,
          caption,
          is_primary,
          created_at,
          updated_at
        FROM oneprofile_photos
        WHERE enrollment_id = ?
          AND status = 'active'
        ORDER BY
          is_primary DESC,
          created_at ASC,
          id ASC
      `)
        .bind(enrollmentId)
        .all();


    const photos =
      (result?.results || [])
        .map((photo) => ({
          id:
            Number(photo.id),

          original_filename:
            photo.original_filename || '',

          content_type:
            photo.content_type || '',

          size_bytes:
            Number(
              photo.size_bytes || 0
            ),

          photo_type:
            photo.photo_type ||
            'additional',

          caption:
            photo.caption || '',

          is_primary:
            !!photo.is_primary,

          created_at:
            photo.created_at || null,

          updated_at:
            photo.updated_at || null,

          url:
            `/api/caregiver-photos?id=${encodeURIComponent(photo.id)}`
        }));


    return json({
      authenticated: true,
      max_photos: 4,
      photos
    });

  } catch (error) {

    console.error(error);

    return json(
      {
        error:
          'Unable to load participant photos.'
      },
      500
    );
  }
}


async function onPost({
  request,
  env
}) {

  let uploadedStorageKey =
    null;


  try {

    if (
      !env.ONEPROFILE_DB ||
      !env.ONEPROFILE_PHOTOS
    ) {
      return json(
        {
          error:
            'Photo storage is unavailable.'
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


    const enrollmentId =
      account.enrollment
        .enrollment_id;


    const contentType =
      request.headers.get(
        'Content-Type'
      ) || '';


    if (
      !contentType
        .toLowerCase()
        .includes(
          'multipart/form-data'
        )
    ) {
      return json(
        {
          error:
            'Photo uploads must use multipart form data.'
        },
        400
      );
    }


    const formData =
      await request.formData();


    const file =
      formData.get('photo');


    if (
      !file ||
      typeof file.arrayBuffer !==
        'function'
    ) {
      return json(
        {
          error:
            'Choose a photo to upload.'
        },
        400
      );
    }


    /*
      Limit each uploaded image to 5 MB.

      OneProfile currently allows:
      - 1 primary photo
      - up to 3 additional photos
    */

    const maxBytes =
      5 * 1024 * 1024;


    if (
      !file.size ||
      file.size < 1
    ) {
      return json(
        {
          error:
            'The selected photo is empty.'
        },
        400
      );
    }


    if (
      file.size > maxBytes
    ) {
      return json(
        {
          error:
            'Each photo must be 5 MB or smaller.'
        },
        400
      );
    }


    const countRow =
      await env.ONEPROFILE_DB.prepare(`
        SELECT
          COUNT(*) AS count
        FROM oneprofile_photos
        WHERE enrollment_id = ?
          AND status = 'active'
      `)
        .bind(enrollmentId)
        .first();


    const activeCount =
      Number(
        countRow?.count || 0
      );


    if (
      activeCount >= 4
    ) {
      return json(
        {
          error:
            'OneProfile™ allows one primary photo and up to three additional photos.'
        },
        400
      );
    }


    const buffer =
      await file.arrayBuffer();


    const bytes =
      new Uint8Array(buffer);


    const detectedType =
      imageTypeFromBytes(
        bytes
      );


    if (!detectedType) {
      return json(
        {
          error:
            'Use a JPEG, PNG, or WebP image.'
        },
        400
      );
    }


    const caption =
      clean(
        formData.get('caption'),
        160
      );


    const requestedPrimary =
      String(
        formData.get('is_primary') ??
        ''
      ).toLowerCase();


    let makePrimary =
      requestedPrimary === '1' ||
      requestedPrimary === 'true' ||
      requestedPrimary === 'yes' ||
      requestedPrimary === 'on';


    /*
      The first active photo automatically becomes
      the participant's primary photo.
    */

    if (
      activeCount === 0
    ) {
      makePrimary =
        true;
    }


    const randomId =
      crypto.randomUUID();


    const storageKey =
      `participants/${enrollmentId}/${randomId}.${detectedType.extension}`;


    uploadedStorageKey =
      storageKey;


    await env.ONEPROFILE_PHOTOS.put(
      storageKey,
      buffer,
      {
        httpMetadata: {
          contentType:
            detectedType.contentType
        },

        customMetadata: {
          enrollment:
            enrollmentId,

          purpose:
            'oneprofile-participant-photo'
        }
      }
    );


    /*
      If this upload is becoming primary,
      demote any existing primary photo first.
    */

    if (makePrimary) {

      await env.ONEPROFILE_DB.prepare(`
        UPDATE oneprofile_photos
        SET
          is_primary = 0,
          photo_type = 'additional',
          updated_at = datetime('now')
        WHERE enrollment_id = ?
          AND status = 'active'
          AND is_primary = 1
      `)
        .bind(enrollmentId)
        .run();
    }


    let result;


    try {

      result =
        await env.ONEPROFILE_DB.prepare(`
          INSERT INTO oneprofile_photos (
            enrollment_id,
            storage_key,
            original_filename,
            content_type,
            size_bytes,
            photo_type,
            caption,
            is_primary,
            status,
            updated_at
          )
          VALUES (
            ?,?,?,?,?,?,?,?,
            'active',
            datetime('now')
          )
        `)
          .bind(
            enrollmentId,
            storageKey,
            clean(
              file.name,
              180
            ),
            detectedType.contentType,
            Number(file.size),
            makePrimary
              ? 'primary'
              : 'additional',
            caption,
            makePrimary
              ? 1
              : 0
          )
          .run();

    } catch (databaseError) {

      /*
        If the D1 record cannot be created,
        remove the uploaded R2 object so we
        do not leave an orphaned private file.
      */

      await env.ONEPROFILE_PHOTOS.delete(
        storageKey
      );

      uploadedStorageKey =
        null;

      throw databaseError;
    }


    uploadedStorageKey =
      null;


    const photoId =
      Number(
        result?.meta
          ?.last_row_id || 0
      );


    return json(
      {
        ok: true,

        message:
          makePrimary
            ? 'Primary participant photo uploaded.'
            : 'Participant photo uploaded.',

        photo: {
          id:
            photoId || null,

          caption,

          is_primary:
            makePrimary,

          content_type:
            detectedType.contentType,

          size_bytes:
            Number(file.size),

          url:
            photoId
              ? `/api/caregiver-photos?id=${encodeURIComponent(photoId)}`
              : ''
        }
      },
      201
    );

  } catch (error) {

    console.error(error);


    if (
      uploadedStorageKey &&
      env.ONEPROFILE_PHOTOS
    ) {

      try {
        await env.ONEPROFILE_PHOTOS.delete(
          uploadedStorageKey
        );
      } catch (
        cleanupError
      ) {
        console.error(
          cleanupError
        );
      }

    }


    return json(
      {
        error:
          'Unable to upload participant photo.'
      },
      500
    );
  }
}


async function onPatch({
  request,
  env
}) {

  try {

    if (
      !env.ONEPROFILE_DB ||
      !env.ONEPROFILE_PHOTOS
    ) {
      return json(
        {
          error:
            'Photo storage is unavailable.'
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


    const enrollmentId =
      account.enrollment
        .enrollment_id;


    const body =
      await request.json();


    const photoId =
      positiveId(
        body.id
      );


    if (!photoId) {
      return json(
        {
          error:
            'A valid photo ID is required.'
        },
        400
      );
    }


    const photo =
      await getOwnedPhoto(
        env,
        enrollmentId,
        photoId
      );


    if (!photo) {
      return json(
        {
          error:
            'Photo not found.'
        },
        404
      );
    }


    const action =
      clean(
        body.action,
        40
      ).toLowerCase();


    if (
      action ===
      'set_primary'
    ) {

      if (photo.is_primary) {
        return json({
          ok: true,
          changed: false,
          message:
            'This is already the primary participant photo.'
        });
      }


      await env.ONEPROFILE_DB.batch([
        env.ONEPROFILE_DB.prepare(`
          UPDATE oneprofile_photos
          SET
            is_primary = 0,
            photo_type = 'additional',
            updated_at = datetime('now')
          WHERE enrollment_id = ?
            AND status = 'active'
            AND is_primary = 1
        `)
          .bind(enrollmentId),

        env.ONEPROFILE_DB.prepare(`
          UPDATE oneprofile_photos
          SET
            is_primary = 1,
            photo_type = 'primary',
            updated_at = datetime('now')
          WHERE id = ?
            AND enrollment_id = ?
            AND status = 'active'
        `)
          .bind(
            photoId,
            enrollmentId
          )
      ]);


      return json({
        ok: true,
        changed: true,
        message:
          'Primary participant photo updated.'
      });
    }


    if (
      action ===
      'update_caption'
    ) {

      const caption =
        clean(
          body.caption,
          160
        );


      await env.ONEPROFILE_DB.prepare(`
        UPDATE oneprofile_photos
        SET
          caption = ?,
          updated_at = datetime('now')
        WHERE id = ?
          AND enrollment_id = ?
          AND status = 'active'
      `)
        .bind(
          caption,
          photoId,
          enrollmentId
        )
        .run();


      return json({
        ok: true,
        changed: true,
        caption
      });
    }


    return json(
      {
        error:
          'Unsupported photo action.'
      },
      400
    );

  } catch (error) {

    console.error(error);

    return json(
      {
        error:
          'Unable to update participant photo.'
      },
      500
    );
  }
}


async function onDelete({
  request,
  env
}) {

  try {

    if (
      !env.ONEPROFILE_DB ||
      !env.ONEPROFILE_PHOTOS
    ) {
      return json(
        {
          error:
            'Photo storage is unavailable.'
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


    const enrollmentId =
      account.enrollment
        .enrollment_id;


    let photoId =
      null;


    const url =
      new URL(request.url);


    photoId =
      positiveId(
        url.searchParams.get('id')
      );


    if (!photoId) {

      try {

        const body =
          await request.json();

        photoId =
          positiveId(
            body.id
          );

      } catch {
        photoId =
          null;
      }

    }


    if (!photoId) {
      return json(
        {
          error:
            'A valid photo ID is required.'
        },
        400
      );
    }


    const photo =
      await getOwnedPhoto(
        env,
        enrollmentId,
        photoId
      );


    if (!photo) {
      return json(
        {
          error:
            'Photo not found.'
        },
        404
      );
    }


    /*
      Archive the D1 record first.

      This immediately prevents the caregiver
      photo endpoint from serving the image,
      even if an R2 cleanup operation encounters
      a temporary problem.
    */

    await env.ONEPROFILE_DB.prepare(`
      UPDATE oneprofile_photos
      SET
        status = 'archived',
        is_primary = 0,
        updated_at = datetime('now')
      WHERE id = ?
        AND enrollment_id = ?
        AND status = 'active'
    `)
      .bind(
        photoId,
        enrollmentId
      )
      .run();


    /*
      Remove the actual image object from R2.
    */

    try {

      await env.ONEPROFILE_PHOTOS.delete(
        photo.storage_key
      );

    } catch (storageError) {

      console.error(
        'R2 photo cleanup failed:',
        storageError
      );

    }


    /*
      If the removed image was the primary photo,
      automatically promote another active image.
    */

    if (photo.is_primary) {

      const replacement =
        await env.ONEPROFILE_DB.prepare(`
          SELECT id
          FROM oneprofile_photos
          WHERE enrollment_id = ?
            AND status = 'active'
          ORDER BY
            created_at ASC,
            id ASC
          LIMIT 1
        `)
          .bind(enrollmentId)
          .first();


      if (replacement?.id) {

        await env.ONEPROFILE_DB.prepare(`
          UPDATE oneprofile_photos
          SET
            is_primary = 1,
            photo_type = 'primary',
            updated_at = datetime('now')
          WHERE id = ?
            AND enrollment_id = ?
            AND status = 'active'
        `)
          .bind(
            replacement.id,
            enrollmentId
          )
          .run();

      }

    }


    return json({
      ok: true,
      message:
        'Participant photo removed.'
    });

  } catch (error) {

    console.error(error);

    return json(
      {
        error:
          'Unable to remove participant photo.'
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
    return onGet(context);
  }


  if (
    context.request.method ===
    'POST'
  ) {
    return onPost(context);
  }


  if (
    context.request.method ===
    'PATCH'
  ) {
    return onPatch(context);
  }


  if (
    context.request.method ===
    'DELETE'
  ) {
    return onDelete(context);
  }


  return json(
    {
      error:
        'Method not allowed'
    },
    405
  );
}