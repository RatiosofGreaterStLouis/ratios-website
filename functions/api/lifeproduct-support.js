const json = (
  body,
  status = 200
) =>
  new Response(
    JSON.stringify(
      body
    ),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',

        'Cache-Control':
          'no-store'
      }
    }
  );


const hex =
  buffer =>
    [
      ...new Uint8Array(
        buffer
      )
    ]
      .map(
        value =>
          value
            .toString(16)
            .padStart(
              2,
              '0'
            )
      )
      .join('');


async function hash(
  value
) {

  return hex(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder()
        .encode(
          value
        )
    )
  );

}


function cookieValue(
  request,
  name
) {

  const cookieHeader =
    request.headers.get(
      'Cookie'
    ) ||
    '';


  for (
    const part
    of cookieHeader.split(';')
  ) {

    const [
      key,
      ...value
    ] =
      part
        .trim()
        .split('=');


    if (
      key ===
      name
    ) {

      return value.join('=');

    }

  }


  return '';

}


async function auth(
  request,
  env
) {

  const token =
    cookieValue(
      request,
      'oneprofile_session'
    );


  if (!token) {
    return null;
  }


  const tokenHash =
    await hash(
      token
    );


  const now =
    Math.floor(
      Date.now() /
      1000
    );


  const session =
    await env.ONEPROFILE_DB
      .prepare(`
        SELECT
          enrollment_id,
          expires_at
        FROM oneprofile_sessions
        WHERE token_hash = ?
        LIMIT 1
      `)
      .bind(
        tokenHash
      )
      .first();


  if (
    !session ||
    Number(
      session.expires_at
    ) < now
  ) {

    return null;

  }


  return session;

}


const PHYSICAL_PRODUCTS =
  new Set([
    'lifepatch',
    'lifeband',
    'lifecard',
    'lifetag'
  ]);


const REQUEST_TYPES =
  new Set([
    'lost',
    'damaged',
    'not_scanning',
    'fit_or_usability',
    'replacement_requested',
    'other'
  ]);


const normalize =
  value =>
    String(
      value ?? ''
    )
      .trim()
      .toLowerCase();


/* -----------------------------------------
   Load caregiver LifeProduct requests
   ----------------------------------------- */

export async function onRequestGet({
  request,
  env
}) {

  try {

    if (
      !env.ONEPROFILE_DB
    ) {

      return json(
        {
          authenticated:
            false,

          error:
            'OneProfile™ service is temporarily unavailable.'
        },
        503
      );

    }


    const session =
      await auth(
        request,
        env
      );


    if (!session) {

      return json(
        {
          authenticated:
            false
        },
        401
      );

    }


    const {
      results
    } =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT

            r.id,

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

            i.label
              AS identifier_label,

            i.status
              AS identifier_status

          FROM
            oneprofile_lifeproduct_requests
              AS r

          INNER JOIN
            oneprofile_identifiers
              AS i

            ON
              i.id =
              r.identifier_id

          WHERE
            r.enrollment_id = ?

            AND
            i.enrollment_id = ?

          ORDER BY
            r.created_at DESC,
            r.id DESC
        `)
        .bind(
          session.enrollment_id,
          session.enrollment_id
        )
        .all();


    const requests =
      (
        results || []
      )
        .filter(
          item =>
            PHYSICAL_PRODUCTS.has(
              normalize(
                item.product_type
              )
            )
        )
        .map(
          item => ({

            id:
              item.id,

            identifier_id:
              item.identifier_id,

            request_type:
              item.request_type,

            caregiver_note:
              item.caregiver_note,

            request_status:
              item.request_status,

            submitted_by:
              item.submitted_by,

            reviewed_by:
              item.reviewed_by,

            staff_note:
              item.staff_note,

            reviewed_at:
              item.reviewed_at,

            resolved_at:
              item.resolved_at,

            created_at:
              item.created_at,

            updated_at:
              item.updated_at,

            product_type:
              item.product_type,

            identifier_label:
              item.identifier_label,

            identifier_status:
              item.identifier_status

          })
        );


    return json({
      authenticated:
        true,

      requests
    });


  } catch (
    error
  ) {

    console.error(
      'LifeProduct support GET error:',
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


/* -----------------------------------------
   Submit caregiver LifeProduct request
   ----------------------------------------- */

export async function onRequestPost({
  request,
  env
}) {

  try {

    if (
      !env.ONEPROFILE_DB
    ) {

      return json(
        {
          authenticated:
            false,

          error:
            'OneProfile™ service is temporarily unavailable.'
        },
        503
      );

    }


    const session =
      await auth(
        request,
        env
      );


    if (!session) {

      return json(
        {
          authenticated:
            false
        },
        401
      );

    }


    let body;


    try {

      body =
        await request.json();

    } catch (_) {

      return json(
        {
          error:
            'Invalid request.'
        },
        400
      );

    }


    const identifierId =
      Number(
        body.identifier_id
      );


    const requestType =
      normalize(
        body.request_type
      );


    const caregiverNote =
      String(
        body.caregiver_note ??
        ''
      ).trim();


    if (
      !Number.isInteger(
        identifierId
      ) ||
      identifierId < 1
    ) {

      return json(
        {
          error:
            'Please select a valid LifeProduct.'
        },
        400
      );

    }


    if (
      !REQUEST_TYPES.has(
        requestType
      )
    ) {

      return json(
        {
          error:
            'Please select a valid request reason.'
        },
        400
      );

    }


    if (
      caregiverNote.length >
      1000
    ) {

      return json(
        {
          error:
            'Caregiver note must be 1,000 characters or fewer.'
        },
        400
      );

    }


    /*
      Resolve the identifier by BOTH:

      - identifier id
      - signed-in caregiver enrollment

      This prevents a caregiver from creating
      a support request for someone else's
      identifier by changing identifier_id
      in the browser.
    */

    const identifier =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT

            id,

            enrollment_id,

            product_type,

            label,

            status

          FROM
            oneprofile_identifiers

          WHERE
            id = ?

            AND
            enrollment_id = ?

          LIMIT 1
        `)
        .bind(
          identifierId,
          session.enrollment_id
        )
        .first();


    if (!identifier) {

      return json(
        {
          error:
            'This LifeProduct could not be found.'
        },
        404
      );

    }


    const productType =
      normalize(
        identifier.product_type
      );


    /*
      Digital QR support stays in the
      caregiver-managed identifier workflow.

      This endpoint handles only physical
      RATIOS-issued LifeProducts.
    */

    if (
      !PHYSICAL_PRODUCTS.has(
        productType
      )
    ) {

      return json(
        {
          error:
            'LifeProduct support requests are available only for RATIOS-issued physical products.'
        },
        403
      );

    }


    /*
      New caregiver requests may only be
      submitted against an ACTIVE physical
      identifier.

      Historical requests remain visible
      even if staff later deactivates or
      archives the product.
    */

    if (
      normalize(
        identifier.status
      ) !==
      'active'
    ) {

      return json(
        {
          error:
            'This LifeProduct is not currently active. Please contact RATIOS for assistance.'
        },
        409
      );

    }


    /*
      Prevent accidental duplicate open
      requests for the same exact issue on
      the same physical identifier.

      A caregiver may still submit a
      different request type if another
      problem exists.
    */

    const duplicate =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            id
          FROM
            oneprofile_lifeproduct_requests
          WHERE
            enrollment_id = ?
            AND identifier_id = ?
            AND request_type = ?
            AND request_status = 'open'
          LIMIT 1
        `)
        .bind(
          session.enrollment_id,
          identifierId,
          requestType
        )
        .first();


    if (duplicate) {

      return json(
        {
          error:
            'An open request for this same LifeProduct issue already exists.'
        },
        409
      );

    }


    const result =
      await env.ONEPROFILE_DB
        .prepare(`
          INSERT INTO
            oneprofile_lifeproduct_requests
            (
              enrollment_id,
              identifier_id,
              request_type,
              caregiver_note,
              request_status,
              submitted_by,
              created_at,
              updated_at
            )

          VALUES
            (
              ?,
              ?,
              ?,
              ?,
              'open',
              'caregiver',
              datetime('now'),
              datetime('now')
            )
        `)
        .bind(
          session.enrollment_id,
          identifierId,
          requestType,
          caregiverNote ||
          null
        )
        .run();


    return json(
      {

        ok:
          true,

        request: {

          id:
            result?.meta
              ?.last_row_id ||
            null,

          identifier_id:
            identifierId,

          request_type:
            requestType,

          request_status:
            'open',

          product_type:
            productType,

          identifier_label:
            identifier.label ||
            null

        },

        message:
          'LifeProduct support request submitted.'

      },
      201
    );


  } catch (
    error
  ) {

    console.error(
      'LifeProduct support POST error:',
      error
    );


    return json(
      {
        error:
          'Unable to submit this LifeProduct support request.'
      },
      500
    );

  }

}


/* -----------------------------------------
   Request router
   ----------------------------------------- */

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
        'Method not allowed.'
    },
    405
  );

}