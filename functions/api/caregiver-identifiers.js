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
    .map(x => x.toString(16).padStart(2, '0'))
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

  for (
    const part of (request.headers.get('Cookie') || '').split(';')
  ) {

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
    await env.ONEPROFILE_DB
      .prepare(`
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


function makeToken() {

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


function isDigitalQr(productType) {

  return String(
    productType || ''
  )
    .trim()
    .toLowerCase() === 'digital_qr';

}


/* -----------------------------------------
   Load caregiver identifiers
   ----------------------------------------- */

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
          authenticated: false
        },
        401
      );

    }


    const profile =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            public_profile_enabled
          FROM oneprofile_profiles
          WHERE enrollment_id = ?
          LIMIT 1
        `)
        .bind(
          session.enrollment_id
        )
        .first();


    const { results } =
      await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            id,
            identifier_token,
            product_type,
            label,
            status,
            scan_count,
            last_scanned_at,
            created_at
          FROM oneprofile_identifiers
          WHERE enrollment_id = ?
          ORDER BY created_at DESC
        `)
        .bind(
          session.enrollment_id
        )
        .all();


    const identifiers =
      (results || []).map(item => {

        const digitalQr =
          isDigitalQr(
            item.product_type
          );


        return {

          id:
            item.id,

          product_type:
            item.product_type,

          label:
            item.label,

          status:
            item.status,

          scan_count:
            item.scan_count,

          last_scanned_at:
            item.last_scanned_at,

          created_at:
            item.created_at,

          issued_by:
            digitalQr
              ? 'caregiver'
              : 'ratios_staff',

          caregiver_managed:
            digitalQr,

          identifier_token:
            digitalQr
              ? item.identifier_token
              : null

        };

      });


    return json({

      authenticated:
        true,

      sharing_enabled:
        !!profile?.public_profile_enabled,

      identifiers

    });


  } catch (error) {

    console.error(
      'Caregiver identifier load error:',
      error
    );


    return json(
      {
        error:
          'Unable to load identifiers.'
      },
      500
    );

  }

}


/* -----------------------------------------
   Update caregiver identifiers
   ----------------------------------------- */

export async function onRequestPost({
  request,
  env
}) {

  try {

    if (!env.ONEPROFILE_DB) {

      return json(
        {
          authenticated: false,
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
          authenticated: false
        },
        401
      );

    }


    const body =
      await request.json();


    /* -----------------------------------------
       Create caregiver Digital QR
       ----------------------------------------- */

    if (body.action === 'create') {

      /*
        Caregivers may create Digital QR identifiers only.

        Physical RATIOS products:
        - LifePatch™
        - LifeBand™
        - LifeCard™
        - LifeTag™

        must be issued through the RATIOS
        staff/admin workflow.
      */


      const requestedProductType =
        String(
          body.product_type || ''
        )
          .trim()
          .toLowerCase();


      if (
        requestedProductType !==
        'digital_qr'
      ) {

        return json(
          {
            error:
              'Physical OneProfile™ LifeProducts must be issued by RATIOS staff.'
          },
          403
        );

      }


      const rawLabel =
        String(
          body.label || ''
        )
          .trim();


      if (rawLabel.length > 80) {

        return json(
          {
            error:
              'Identifier label must be 80 characters or fewer.'
          },
          400
        );

      }


      const label =
        rawLabel;


      const count =
        await env.ONEPROFILE_DB
          .prepare(`
            SELECT
              COUNT(*) AS n
            FROM oneprofile_identifiers
            WHERE enrollment_id = ?
              AND status = 'active'
          `)
          .bind(
            session.enrollment_id
          )
          .first();


      if (
        Number(
          count?.n || 0
        ) >= 10
      ) {

        return json(
          {
            error:
              'This profile already has the maximum number of active identifiers.'
          },
          409
        );

      }


      let identifierToken =
        makeToken();


      for (
        let attempt = 0;
        attempt < 3;
        attempt++
      ) {

        try {

          await env.ONEPROFILE_DB
            .prepare(`
              INSERT INTO oneprofile_identifiers (
                identifier_token,
                enrollment_id,
                product_type,
                label,
                status
              )
              VALUES (?, ?, ?, ?, 'active')
            `)
            .bind(
              identifierToken,
              session.enrollment_id,
              'digital_qr',
              label || null
            )
            .run();


          return json(
            {

              ok:
                true,

              product_type:
                'digital_qr',

              identifier_token:
                identifierToken,

              url:
                `/scan.html?code=${encodeURIComponent(
                  identifierToken
                )}`

            },
            201
          );


        } catch (error) {

          if (attempt === 2) {
            throw error;
          }


          identifierToken =
            makeToken();

        }

      }

    }


    /* -----------------------------------------
       Activate / deactivate Digital QR
       ----------------------------------------- */

    if (body.action === 'status') {

      const id =
        Number(
          body.id
        );


      if (
        !Number.isInteger(id) ||
        id < 1
      ) {

        return json(
          {
            error:
              'Invalid identifier.'
          },
          400
        );

      }


      const identifier =
        await env.ONEPROFILE_DB
          .prepare(`
            SELECT
              id,
              product_type,
              label,
              status
            FROM oneprofile_identifiers
            WHERE id = ?
              AND enrollment_id = ?
            LIMIT 1
          `)
          .bind(
            id,
            session.enrollment_id
          )
          .first();


      if (!identifier) {

        return json(
          {
            error:
              'This identifier could not be found.'
          },
          404
        );

      }


      if (
        !isDigitalQr(
          identifier.product_type
        )
      ) {

        return json(
          {
            error:
              'RATIOS-issued LifeProducts cannot be activated or deactivated from the caregiver portal.'
          },
          403
        );

      }


      const status =
        body.active
          ? 'active'
          : 'inactive';


      await env.ONEPROFILE_DB
        .prepare(`
          UPDATE oneprofile_identifiers
          SET
            status = ?,
            updated_at = datetime('now')
          WHERE id = ?
            AND enrollment_id = ?
            AND product_type = 'digital_qr'
        `)
        .bind(
          status,
          id,
          session.enrollment_id
        )
        .run();


      return json({

        ok:
          true,

        status

      });

    }


    return json(
      {
        error:
          'Unsupported action.'
      },
      400
    );


  } catch (error) {

    console.error(
      'Caregiver identifier update error:',
      error
    );


    return json(
      {
        error:
          'Unable to update identifiers.'
      },
      500
    );

  }

}


/* -----------------------------------------
   Request router
   ----------------------------------------- */

export async function onRequest(context) {

  if (
    context.request.method === 'GET'
  ) {

    return onRequestGet(
      context
    );

  }


  if (
    context.request.method === 'POST'
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