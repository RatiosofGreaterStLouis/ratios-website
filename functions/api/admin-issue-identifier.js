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


async function requireAdmin(
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
    String(
      session.staff_email || ''
    )
      .trim()
      .toLowerCase();


  if (
    !adminEmails(env).includes(email)
  ) {

    await env.ONEPROFILE_DB.prepare(`
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


function randomToken() {

  const bytes =
    new Uint8Array(24);

  crypto.getRandomValues(bytes);

  return [...bytes]
    .map(byte =>
      byte
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
}


function formatProductType(value) {

  const labels = {
    lifepatch: 'LifePatch™',
    lifeband: 'LifeBand™',
    lifecard: 'LifeCard™',
    lifetag: 'LifeTag™'
  };

  return labels[value] || 'OneProfile™ identifier';
}


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
            'Admin service is temporarily unavailable.'
        },
        503
      );
    }


    const admin =
      await requireAdmin(
        request,
        env
      );


    if (!admin) {

      return json(
        {
          authenticated: false,
          error: 'Unauthorized.'
        },
        401
      );
    }


    const body =
      await request.json();


    const enrollmentId =
      String(
        body.enrollment_id || ''
      )
        .trim()
        .toUpperCase();


    const productType =
      String(
        body.product_type || ''
      )
        .trim()
        .toLowerCase();


    const label =
      String(
        body.label || ''
      )
        .trim();


    if (
      !/^RAT-OP-[A-Z0-9]{8}$/.test(
        enrollmentId
      )
    ) {

      return json(
        {
          authenticated: true,
          error:
            'A valid enrollment ID is required.'
        },
        400
      );
    }


    const allowedProducts = [
      'lifepatch',
      'lifeband',
      'lifecard',
      'lifetag'
    ];


    if (
      !allowedProducts.includes(
        productType
      )
    ) {

      return json(
        {
          authenticated: true,
          error:
            'RATIOS staff may issue only LifePatch™, LifeBand™, LifeCard™, or LifeTag™ identifiers.'
        },
        400
      );
    }


    if (label.length > 80) {

      return json(
        {
          authenticated: true,
          error:
            'Identifier label must be 80 characters or fewer.'
        },
        400
      );
    }


    const enrollment =
      await env.ONEPROFILE_DB.prepare(`
        SELECT enrollment_id
        FROM oneprofile_enrollments
        WHERE enrollment_id = ?
        LIMIT 1
      `)
        .bind(enrollmentId)
        .first();


    if (!enrollment) {

      return json(
        {
          authenticated: true,
          error:
            'This OneProfile™ enrollment could not be found.'
        },
        404
      );
    }


    const activeIdentifiers =
      await env.ONEPROFILE_DB.prepare(`
        SELECT COUNT(*) AS total
        FROM oneprofile_identifiers
        WHERE enrollment_id = ?
          AND status = 'active'
      `)
        .bind(enrollmentId)
        .first();


    const activeCount =
      Number(
        activeIdentifiers?.total || 0
      );


    if (activeCount >= 10) {

      return json(
        {
          authenticated: true,
          error:
            'This enrollment already has the maximum of 10 active identifiers.'
        },
        409
      );
    }


    let identifierToken = '';
    let insertResult = null;


    for (
      let attempt = 0;
      attempt < 3;
      attempt++
    ) {

      identifierToken =
        randomToken();


      try {

        insertResult =
          await env.ONEPROFILE_DB.prepare(`
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
              enrollmentId,
              productType,
              label || null
            )
            .run();

        break;

      } catch (error) {

        if (attempt === 2) {
          throw error;
        }
      }
    }


    const identifierId =
      Number(
        insertResult?.meta?.last_row_id || 0
      );


    if (!identifierId) {

      throw new Error(
        'Identifier record was created without an ID.'
      );
    }


    const productName =
      formatProductType(
        productType
      );


    const details =
      JSON.stringify({
        product_type:
          productType,

        product_name:
          productName,

        label:
          label || null,

        status:
          'active',

        issued_by:
          'ratios_staff'
      });


    try {

      await env.ONEPROFILE_DB.prepare(`
        INSERT INTO oneprofile_admin_audit_log (
          staff_email,
          action,
          enrollment_id,
          identifier_id,
          details
        )
        VALUES (?, ?, ?, ?, ?)
      `)
        .bind(
          admin.email,
          'identifier_issued',
          enrollmentId,
          identifierId,
          details
        )
        .run();

    } catch (auditError) {

      await env.ONEPROFILE_DB.prepare(`
        DELETE FROM oneprofile_identifiers
        WHERE id = ?
          AND enrollment_id = ?
      `)
        .bind(
          identifierId,
          enrollmentId
        )
        .run();

      throw auditError;
    }


    const scanUrl =
      `${new URL(request.url).origin}/scan.html?code=${encodeURIComponent(identifierToken)}`;


    return json(
      {
        authenticated: true,
        ok: true,

        identifier: {
          id:
            identifierId,

          enrollment_id:
            enrollmentId,

          product_type:
            productType,

          product_name:
            productName,

          label:
            label || null,

          status:
            'active',

          issued_by:
            'ratios_staff'
        },

        scan_url:
          scanUrl
      },
      201
    );


  } catch (error) {

    console.error(
      'Admin issue identifier error:',
      error
    );


    return json(
      {
        authenticated: true,
        error:
          'Unable to issue the identifier.'
      },
      500
    );
  }
}


export async function onRequest(context) {

  if (
    context.request.method !== 'POST'
  ) {

    return json(
      {
        error: 'Method not allowed'
      },
      405
    );
  }


  return onRequestPost(context);
}