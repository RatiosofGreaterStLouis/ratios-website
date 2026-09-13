const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });

const scalarFields = new Set([
  'preferred_name',
  'communication_method',
  'communication_notes',
  'sensory_triggers',
  'calming_supports',
  'touch_preference',
  'safety_risk_level',
  'known_destinations',
  'safe_approach',
  'emergency_contact_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
  'alternate_contact_name',
  'alternate_contact_phone',
  'responder_notes'
]);

const structuredFields = new Set([
  'participant_photo',
  'additional_photos',
  'physical_description',
  'diagnoses',
  'medications',
  'allergies'
]);

function parsePublicFields(value) {
  try {
    const parsed = JSON.parse(value || '[]');

    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter(
        field =>
          scalarFields.has(field) ||
          structuredFields.has(field)
      )
    );
  } catch {
    return new Set();
  }
}

function photoUrl(code, photoId) {
  return `/api/identifier-photo?code=${encodeURIComponent(
    code
  )}&photo=${encodeURIComponent(photoId)}`;
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.ONEPROFILE_DB) {
      return json({ error: 'Profile unavailable.' }, 500);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code') || '';

    if (code.length < 16) {
      return json({ error: 'Profile unavailable.' }, 404);
    }

    const identifier = await env.ONEPROFILE_DB
      .prepare(`
        SELECT
          id,
          enrollment_id,
          product_type
        FROM oneprofile_identifiers
        WHERE identifier_token = ?
          AND status = 'active'
        LIMIT 1
      `)
      .bind(code)
      .first();

    if (!identifier) {
      return json({ error: 'Profile unavailable.' }, 404);
    }

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
      return json({ error: 'Profile unavailable.' }, 404);
    }

    const details = await env.ONEPROFILE_DB
      .prepare(`
        SELECT *
        FROM oneprofile_profile_details
        WHERE enrollment_id = ?
        LIMIT 1
      `)
      .bind(identifier.enrollment_id)
      .first();

    if (!details) {
      return json({ error: 'Profile unavailable.' }, 404);
    }

    const fields = parsePublicFields(publicProfile.public_fields);
    const profile = {};

    /*
     * Existing OneProfile™ responder fields
     */
    for (const field of fields) {
      if (scalarFields.has(field)) {
        profile[field] = details[field] ?? '';
      }
    }

    /*
     * Physical / identifying description
     */
    if (fields.has('physical_description')) {
      const physical = await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            height_inches,
            approximate_weight_lbs,
            build_description,
            hair_color,
            hair_style,
            eye_color,
            complexion,
            wears_glasses,
            mobility_aids,
            identifying_features,
            description_notes
          FROM oneprofile_physical_description
          WHERE enrollment_id = ?
          LIMIT 1
        `)
        .bind(identifier.enrollment_id)
        .first();

      if (physical) {
        profile.physical_description = {
          height_inches:
            physical.height_inches === null
              ? null
              : Number(physical.height_inches),

          approximate_weight_lbs:
            physical.approximate_weight_lbs === null
              ? null
              : Number(physical.approximate_weight_lbs),

          build_description:
            physical.build_description || '',

          hair_color:
            physical.hair_color || '',

          hair_style:
            physical.hair_style || '',

          eye_color:
            physical.eye_color || '',

          complexion:
            physical.complexion || '',

          wears_glasses:
            Boolean(physical.wears_glasses),

          mobility_aids:
            physical.mobility_aids || '',

          identifying_features:
            physical.identifying_features || '',

          description_notes:
            physical.description_notes || ''
        };
      }
    }

    /*
     * Medical profile status
     */
    let medicalStatus = null;

    if (
      fields.has('diagnoses') ||
      fields.has('medications') ||
      fields.has('allergies')
    ) {
      medicalStatus = await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            no_current_medications,
            no_known_allergies,
            no_known_diagnoses
          FROM oneprofile_medical_profile_status
          WHERE enrollment_id = ?
          LIMIT 1
        `)
        .bind(identifier.enrollment_id)
        .first();
    }

    /*
     * Diagnoses / conditions
     */
    if (fields.has('diagnoses')) {
      const result = await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            diagnosis_name,
            diagnosis_notes
          FROM oneprofile_diagnoses
          WHERE enrollment_id = ?
            AND active = 1
          ORDER BY id ASC
        `)
        .bind(identifier.enrollment_id)
        .all();

      profile.diagnoses = {
        none_known: Boolean(
          medicalStatus?.no_known_diagnoses
        ),
        items: (result.results || []).map(item => ({
          diagnosis_name:
            item.diagnosis_name || '',
          diagnosis_notes:
            item.diagnosis_notes || ''
        }))
      };
    }

    /*
     * Current medications
     */
    if (fields.has('medications')) {
      const result = await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            medication_name,
            dose,
            route,
            frequency,
            purpose,
            medication_notes
          FROM oneprofile_medications
          WHERE enrollment_id = ?
            AND active = 1
          ORDER BY id ASC
        `)
        .bind(identifier.enrollment_id)
        .all();

      profile.medications = {
        none_current: Boolean(
          medicalStatus?.no_current_medications
        ),
        items: (result.results || []).map(item => ({
          medication_name:
            item.medication_name || '',
          dose:
            item.dose || '',
          route:
            item.route || '',
          frequency:
            item.frequency || '',
          purpose:
            item.purpose || '',
          medication_notes:
            item.medication_notes || ''
        }))
      };
    }

    /*
     * Allergies
     */
    if (fields.has('allergies')) {
      const result = await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            allergen,
            allergy_type,
            reaction,
            severity,
            allergy_notes
          FROM oneprofile_allergies
          WHERE enrollment_id = ?
            AND active = 1
          ORDER BY id ASC
        `)
        .bind(identifier.enrollment_id)
        .all();

      profile.allergies = {
        none_known: Boolean(
          medicalStatus?.no_known_allergies
        ),
        items: (result.results || []).map(item => ({
          allergen:
            item.allergen || '',
          allergy_type:
            item.allergy_type || '',
          reaction:
            item.reaction || '',
          severity:
            item.severity || '',
          allergy_notes:
            item.allergy_notes || ''
        }))
      };
    }

    /*
     * Primary participant photo
     *
     * We only return photo metadata here.
     * The actual image will be streamed securely through
     * /api/identifier-photo after that endpoint independently
     * verifies this identifier, enrollment and sharing permission.
     */
    if (fields.has('participant_photo')) {
      const primaryPhoto = await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            id,
            caption
          FROM oneprofile_photos
          WHERE enrollment_id = ?
            AND status = 'active'
            AND is_primary = 1
          ORDER BY id ASC
          LIMIT 1
        `)
        .bind(identifier.enrollment_id)
        .first();

      if (primaryPhoto) {
        profile.participant_photo = {
          id: primaryPhoto.id,
          caption:
            primaryPhoto.caption || '',
          url: photoUrl(
            code,
            primaryPhoto.id
          )
        };
      }
    }

    /*
     * Additional identifying photos
     */
    if (fields.has('additional_photos')) {
      const result = await env.ONEPROFILE_DB
        .prepare(`
          SELECT
            id,
            caption
          FROM oneprofile_photos
          WHERE enrollment_id = ?
            AND status = 'active'
            AND is_primary = 0
          ORDER BY id ASC
        `)
        .bind(identifier.enrollment_id)
        .all();

      profile.additional_photos =
        (result.results || []).map(photo => ({
          id: photo.id,
          caption:
            photo.caption || '',
          url: photoUrl(
            code,
            photo.id
          )
        }));
    }

    /*
     * Count the QR / identifier scan only after the
     * responder profile resolves successfully.
     */
    await env.ONEPROFILE_DB
      .prepare(`
        UPDATE oneprofile_identifiers
        SET
          scan_count = scan_count + 1,
          last_scanned_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(identifier.id)
      .run();

    return json({
      profile,
      identifier: {
        product_type:
          identifier.product_type
      }
    });
  } catch (error) {
    console.error(
      'identifier-profile error:',
      error
    );

    return json(
      { error: 'Profile unavailable.' },
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