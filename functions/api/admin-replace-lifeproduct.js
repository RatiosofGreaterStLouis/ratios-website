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
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

function adminEmails(env) {
  return String(env.ONEPROFILE_ADMIN_EMAILS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(request, env) {
  const token = cookieValue(request, 'oneprofile_admin_session');
  if (!token) return null;

  const tokenHash = await hash(token);
  const now = Math.floor(Date.now() / 1000);

  const session = await env.ONEPROFILE_DB.prepare(`
    SELECT staff_email, expires_at
    FROM oneprofile_admin_sessions
    WHERE token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!session || Number(session.expires_at) < now) {
    return null;
  }

  const email = String(session.staff_email || '')
    .trim()
    .toLowerCase();

  if (!adminEmails(env).includes(email)) {
    await env.ONEPROFILE_DB.prepare(`
      DELETE FROM oneprofile_admin_sessions
      WHERE token_hash = ?
    `).bind(tokenHash).run();
    return null;
  }

  return { email };
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function productName(value) {
  return ({
    lifepatch: 'LifePatch™',
    lifeband: 'LifeBand™',
    lifecard: 'LifeCard™',
    lifetag: 'LifeTag™'
  })[value] || 'LifeProduct';
}

const PHYSICAL_PRODUCTS = new Set([
  'lifepatch',
  'lifeband',
  'lifecard',
  'lifetag'
]);

function replacementLabel(originalLabel, productType) {
  const base = String(
    originalLabel || productName(productType)
  ).trim();

  const suffix = ' — Replacement';
  const maxBase = 80 - suffix.length;
  return `${base.slice(0, Math.max(1, maxBase))}${suffix}`;
}

export async function onRequestPost({ request, env }) {
  let newIdentifierId = 0;
  let original = null;
  let supportRequest = null;

  try {
    if (!env.ONEPROFILE_DB) {
      return json({
        authenticated: false,
        error: 'Admin service is temporarily unavailable.'
      }, 503);
    }

    const admin = await requireAdmin(request, env);
    if (!admin) {
      return json({
        authenticated: false,
        error: 'Unauthorized.'
      }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({
        authenticated: true,
        error: 'Invalid request.'
      }, 400);
    }

    const requestId = Number(body.request_id);
    const staffNote = String(body.staff_note || '').trim();

    if (!Number.isInteger(requestId) || requestId < 1) {
      return json({
        authenticated: true,
        error: 'A valid LifeProduct support request is required.'
      }, 400);
    }

    if (staffNote.length > 1500) {
      return json({
        authenticated: true,
        error: 'Staff note must be 1,500 characters or fewer.'
      }, 400);
    }

    supportRequest = await env.ONEPROFILE_DB.prepare(`
      SELECT
        r.id,
        r.enrollment_id,
        r.identifier_id,
        r.request_type,
        r.request_status,
        r.staff_note,
        r.reviewed_by,
        r.reviewed_at,
        r.resolved_at,
        i.product_type,
        i.label,
        i.status
      FROM oneprofile_lifeproduct_requests r
      INNER JOIN oneprofile_identifiers i
        ON i.id = r.identifier_id
       AND i.enrollment_id = r.enrollment_id
      WHERE r.id = ?
      LIMIT 1
    `).bind(requestId).first();

    if (!supportRequest) {
      return json({
        authenticated: true,
        error: 'This LifeProduct support request could not be found.'
      }, 404);
    }

    const productType = String(supportRequest.product_type || '')
      .trim()
      .toLowerCase();

    if (!PHYSICAL_PRODUCTS.has(productType)) {
      return json({
        authenticated: true,
        error: 'Only RATIOS-issued physical LifeProducts can be replaced here.'
      }, 403);
    }

    if (String(supportRequest.request_status || '').toLowerCase() === 'resolved') {
      return json({
        authenticated: true,
        error: 'This support request is already resolved.'
      }, 409);
    }

    const originalStatus = String(supportRequest.status || '')
      .trim()
      .toLowerCase();

    if (originalStatus !== 'active') {
      return json({
        authenticated: true,
        error: 'The original LifeProduct must be active before this replacement workflow can retire it.'
      }, 409);
    }

    const existingReplacement = await env.ONEPROFILE_DB.prepare(`
      SELECT replacement_identifier_id
      FROM oneprofile_identifier_replacements
      WHERE original_identifier_id = ?
      LIMIT 1
    `).bind(supportRequest.identifier_id).first();

    if (existingReplacement) {
      return json({
        authenticated: true,
        error: 'This LifeProduct already has a recorded replacement.'
      }, 409);
    }

    const activeIdentifiers = await env.ONEPROFILE_DB.prepare(`
      SELECT COUNT(*) AS total
      FROM oneprofile_identifiers
      WHERE enrollment_id = ?
        AND status = 'active'
    `).bind(supportRequest.enrollment_id).first();

    const activeCount = Number(activeIdentifiers?.total || 0);
    if (activeCount > 10) {
      return json({
        authenticated: true,
        error: 'This enrollment exceeds the supported active identifier limit. Review the identifier record before replacing this product.'
      }, 409);
    }

    const newLabel = replacementLabel(
      supportRequest.label,
      productType
    );

    let identifierToken = '';
    let insertResult = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      identifierToken = randomToken();
      try {
        insertResult = await env.ONEPROFILE_DB.prepare(`
          INSERT INTO oneprofile_identifiers (
            identifier_token,
            enrollment_id,
            product_type,
            label,
            status
          )
          VALUES (?, ?, ?, ?, 'active')
        `).bind(
          identifierToken,
          supportRequest.enrollment_id,
          productType,
          newLabel
        ).run();
        break;
      } catch (error) {
        if (attempt === 2) throw error;
      }
    }

    newIdentifierId = Number(insertResult?.meta?.last_row_id || 0);
    if (!newIdentifierId) {
      throw new Error('Replacement identifier was created without an ID.');
    }

    original = {
      id: Number(supportRequest.identifier_id),
      status: originalStatus
    };

    await env.ONEPROFILE_DB.prepare(`
      UPDATE oneprofile_identifiers
      SET status = 'inactive'
      WHERE id = ?
        AND enrollment_id = ?
        AND status = 'active'
    `).bind(
      supportRequest.identifier_id,
      supportRequest.enrollment_id
    ).run();

    await env.ONEPROFILE_DB.prepare(`
      INSERT INTO oneprofile_identifier_replacements (
        enrollment_id,
        original_identifier_id,
        replacement_identifier_id,
        request_id,
        replacement_reason,
        replaced_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      supportRequest.enrollment_id,
      supportRequest.identifier_id,
      newIdentifierId,
      requestId,
      supportRequest.request_type || null,
      admin.email
    ).run();

    const resolvedNote =
      staffNote ||
      supportRequest.staff_note ||
      `RATIOS replaced this ${productName(productType)}. The previous identifier was retired and a new active identifier was assigned.`;

    await env.ONEPROFILE_DB.prepare(`
      UPDATE oneprofile_lifeproduct_requests
      SET
        request_status = 'resolved',
        staff_note = ?,
        reviewed_by = COALESCE(reviewed_by, ?),
        reviewed_at = COALESCE(reviewed_at, datetime('now')),
        resolved_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
        AND enrollment_id = ?
    `).bind(
      resolvedNote,
      admin.email,
      requestId,
      supportRequest.enrollment_id
    ).run();

    const details = JSON.stringify({
      product_type: productType,
      product_name: productName(productType),
      label: newLabel,
      original_identifier_id: Number(supportRequest.identifier_id),
      replacement_identifier_id: newIdentifierId,
      previous_status: 'active',
      new_status: 'inactive',
      request_id: requestId,
      replacement_reason: supportRequest.request_type || null,
      replaced_by: 'ratios_staff'
    });

    await env.ONEPROFILE_DB.prepare(`
      INSERT INTO oneprofile_admin_audit_log (
        staff_email,
        action,
        enrollment_id,
        identifier_id,
        details
      )
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      admin.email,
      'identifier_replaced',
      supportRequest.enrollment_id,
      newIdentifierId,
      details
    ).run();

    const scanUrl =
      `${new URL(request.url).origin}/scan.html?code=${encodeURIComponent(identifierToken)}`;

    return json({
      authenticated: true,
      ok: true,
      original_identifier: {
        id: Number(supportRequest.identifier_id),
        status: 'inactive'
      },
      replacement: {
        id: newIdentifierId,
        enrollment_id: supportRequest.enrollment_id,
        product_type: productType,
        product_name: productName(productType),
        label: newLabel,
        status: 'active'
      },
      request: {
        id: requestId,
        request_status: 'resolved'
      },
      scan_url: scanUrl
    }, 201);

  } catch (error) {
    console.error('Admin LifeProduct replacement error:', error);

    if (env.ONEPROFILE_DB && supportRequest && newIdentifierId) {
      try {
        await env.ONEPROFILE_DB.prepare(`
          DELETE FROM oneprofile_admin_audit_log
          WHERE action = 'identifier_replaced'
            AND enrollment_id = ?
            AND identifier_id = ?
        `).bind(
          supportRequest.enrollment_id,
          newIdentifierId
        ).run();

        await env.ONEPROFILE_DB.prepare(`
          DELETE FROM oneprofile_identifier_replacements
          WHERE original_identifier_id = ?
            AND replacement_identifier_id = ?
        `).bind(
          supportRequest.identifier_id,
          newIdentifierId
        ).run();

        await env.ONEPROFILE_DB.prepare(`
          UPDATE oneprofile_identifiers
          SET status = 'active'
          WHERE id = ?
            AND enrollment_id = ?
        `).bind(
          supportRequest.identifier_id,
          supportRequest.enrollment_id
        ).run();

        await env.ONEPROFILE_DB.prepare(`
          UPDATE oneprofile_lifeproduct_requests
          SET
            request_status = ?,
            staff_note = ?,
            reviewed_by = ?,
            reviewed_at = ?,
            resolved_at = ?,
            updated_at = datetime('now')
          WHERE id = ?
            AND enrollment_id = ?
        `).bind(
          supportRequest.request_status,
          supportRequest.staff_note || null,
          supportRequest.reviewed_by || null,
          supportRequest.reviewed_at || null,
          supportRequest.resolved_at || null,
          supportRequest.id,
          supportRequest.enrollment_id
        ).run();

        await env.ONEPROFILE_DB.prepare(`
          DELETE FROM oneprofile_identifiers
          WHERE id = ?
            AND enrollment_id = ?
        `).bind(
          newIdentifierId,
          supportRequest.enrollment_id
        ).run();
      } catch (rollbackError) {
        console.error('LifeProduct replacement rollback error:', rollbackError);
      }
    }

    return json({
      authenticated: true,
      error: 'Unable to replace this LifeProduct. No replacement should be distributed until the staff record confirms success.'
    }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  return onRequestPost(context);
}
