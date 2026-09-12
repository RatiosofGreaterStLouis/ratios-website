const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers
    }
  });

const hex = (buf) =>
  [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
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
    const [k, ...v] = part.trim().split('=');

    if (k === name) {
      return v.join('=');
    }
  }

  return '';
}

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function boolInt(value) {
  return value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
    ? 1
    : 0;
}

function integerOrNull(value, min, max) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const integer = Math.round(number);

  if (integer < min || integer > max) {
    return null;
  }

  return integer;
}

async function auth(request, env) {
  const token = cookieValue(request, 'oneprofile_session');

  if (!token) {
    return null;
  }

  const tokenHash = await hash(token);
  const now = Math.floor(Date.now() / 1000);

  const session = await env.ONEPROFILE_DB.prepare(`
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

  const enrollment = await env.ONEPROFILE_DB.prepare(`
    SELECT
      enrollment_id,
      participant_first_name,
      participant_age_range,
      caregiver_first_name,
      caregiver_email
    FROM oneprofile_enrollments
    WHERE enrollment_id = ?
      AND lower(caregiver_email) = ?
    LIMIT 1
  `)
    .bind(
      session.enrollment_id,
      String(session.caregiver_email).toLowerCase()
    )
    .first();

  if (!enrollment) {
    return null;
  }

  return {
    session,
    enrollment,
    tokenHash
  };
}

async function loadProfile(env, enrollmentId) {
  let details = await env.ONEPROFILE_DB.prepare(`
    SELECT
      preferred_name,
      communication_method,
      communication_notes,
      sensory_triggers,
      calming_supports,
      touch_preference,
      safety_risk_level,
      known_destinations,
      safe_approach,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
      alternate_contact_name,
      alternate_contact_phone,
      responder_notes,
      updated_at
    FROM oneprofile_profile_details
    WHERE enrollment_id = ?
    LIMIT 1
  `)
    .bind(enrollmentId)
    .first();

  if (!details) {
    await env.ONEPROFILE_DB.prepare(`
      INSERT OR IGNORE INTO oneprofile_profile_details (
        enrollment_id
      )
      VALUES (?)
    `)
      .bind(enrollmentId)
      .run();

    details = {};
  }

  let physicalDescription =
    await env.ONEPROFILE_DB.prepare(`
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
        description_notes,
        updated_at
      FROM oneprofile_physical_description
      WHERE enrollment_id = ?
      LIMIT 1
    `)
      .bind(enrollmentId)
      .first();

  if (!physicalDescription) {
    await env.ONEPROFILE_DB.prepare(`
      INSERT OR IGNORE INTO oneprofile_physical_description (
        enrollment_id
      )
      VALUES (?)
    `)
      .bind(enrollmentId)
      .run();

    physicalDescription = {};
  }

  let medicalStatus =
    await env.ONEPROFILE_DB.prepare(`
      SELECT
        no_current_medications,
        no_known_allergies,
        no_known_diagnoses,
        updated_at
      FROM oneprofile_medical_profile_status
      WHERE enrollment_id = ?
      LIMIT 1
    `)
      .bind(enrollmentId)
      .first();

  if (!medicalStatus) {
    await env.ONEPROFILE_DB.prepare(`
      INSERT OR IGNORE INTO oneprofile_medical_profile_status (
        enrollment_id
      )
      VALUES (?)
    `)
      .bind(enrollmentId)
      .run();

    medicalStatus = {
      no_current_medications: 0,
      no_known_allergies: 0,
      no_known_diagnoses: 0
    };
  }

  const diagnosesResult =
    await env.ONEPROFILE_DB.prepare(`
      SELECT
        id,
        diagnosis_name,
        diagnosis_notes,
        active,
        created_at,
        updated_at
      FROM oneprofile_diagnoses
      WHERE enrollment_id = ?
        AND active = 1
      ORDER BY id ASC
    `)
      .bind(enrollmentId)
      .all();

  const medicationsResult =
    await env.ONEPROFILE_DB.prepare(`
      SELECT
        id,
        medication_name,
        dose,
        route,
        frequency,
        purpose,
        medication_notes,
        active,
        created_at,
        updated_at
      FROM oneprofile_medications
      WHERE enrollment_id = ?
        AND active = 1
      ORDER BY id ASC
    `)
      .bind(enrollmentId)
      .all();

  const allergiesResult =
    await env.ONEPROFILE_DB.prepare(`
      SELECT
        id,
        allergen,
        allergy_type,
        reaction,
        severity,
        allergy_notes,
        active,
        created_at,
        updated_at
      FROM oneprofile_allergies
      WHERE enrollment_id = ?
        AND active = 1
      ORDER BY id ASC
    `)
      .bind(enrollmentId)
      .all();

  return {
    details,
    physical_description: {
      ...physicalDescription,
      wears_glasses: !!physicalDescription?.wears_glasses
    },
    medical_profile_status: {
      no_current_medications:
        !!medicalStatus?.no_current_medications,

      no_known_allergies:
        !!medicalStatus?.no_known_allergies,

      no_known_diagnoses:
        !!medicalStatus?.no_known_diagnoses,

      updated_at:
        medicalStatus?.updated_at || null
    },
    diagnoses:
      diagnosesResult?.results || [],
    medications:
      medicationsResult?.results || [],
    allergies:
      allergiesResult?.results || []
  };
}

export async function onRequestGet({
  request,
  env
}) {
  try {
    if (!env.ONEPROFILE_DB) {
      return json(
        {
          error: 'Database unavailable.'
        },
        503
      );
    }

    const a = await auth(request, env);

    if (!a) {
      return json(
        {
          authenticated: false
        },
        401
      );
    }

    const enrollmentId =
      a.enrollment.enrollment_id;

    const profile =
      await loadProfile(
        env,
        enrollmentId
      );

    return json({
      authenticated: true,
      enrollment: a.enrollment,
      ...profile
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        error: 'Unable to load profile.'
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
          error: 'Database unavailable.'
        },
        503
      );
    }

    const a = await auth(request, env);

    if (!a) {
      return json(
        {
          authenticated: false
        },
        401
      );
    }

    const body = await request.json();

    const enrollmentId =
      a.enrollment.enrollment_id;

    const coreFields = [
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
    ];

    const hasCoreProfile =
      coreFields.some((key) =>
        hasOwn(body, key)
      );

    if (hasCoreProfile) {
      const details = {
        preferred_name:
          clean(
            body.preferred_name,
            80
          ),

        communication_method:
          clean(
            body.communication_method,
            80
          ),

        communication_notes:
          clean(
            body.communication_notes,
            700
          ),

        sensory_triggers:
          clean(
            body.sensory_triggers,
            700
          ),

        calming_supports:
          clean(
            body.calming_supports,
            700
          ),

        touch_preference:
          clean(
            body.touch_preference,
            120
          ),

        safety_risk_level:
          clean(
            body.safety_risk_level,
            40
          ),

        known_destinations:
          clean(
            body.known_destinations,
            700
          ),

        safe_approach:
          clean(
            body.safe_approach,
            700
          ),

        emergency_contact_name:
          clean(
            body.emergency_contact_name,
            120
          ),

        emergency_contact_relationship:
          clean(
            body.emergency_contact_relationship,
            80
          ),

        emergency_contact_phone:
          clean(
            body.emergency_contact_phone,
            40
          ),

        alternate_contact_name:
          clean(
            body.alternate_contact_name,
            120
          ),

        alternate_contact_phone:
          clean(
            body.alternate_contact_phone,
            40
          ),

        responder_notes:
          clean(
            body.responder_notes,
            900
          )
      };

      if (
        !details.communication_method ||
        !details.safety_risk_level ||
        !details.emergency_contact_name ||
        !details.emergency_contact_relationship ||
        !details.emergency_contact_phone
      ) {
        return json(
          {
            error:
              'Please complete all required fields.'
          },
          400
        );
      }

      await env.ONEPROFILE_DB.prepare(`
        INSERT INTO oneprofile_profile_details (
          enrollment_id,
          preferred_name,
          communication_method,
          communication_notes,
          sensory_triggers,
          calming_supports,
          touch_preference,
          safety_risk_level,
          known_destinations,
          safe_approach,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_phone,
          alternate_contact_name,
          alternate_contact_phone,
          responder_notes,
          updated_at
        )
        VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
          datetime('now')
        )
        ON CONFLICT(enrollment_id)
        DO UPDATE SET
          preferred_name =
            excluded.preferred_name,

          communication_method =
            excluded.communication_method,

          communication_notes =
            excluded.communication_notes,

          sensory_triggers =
            excluded.sensory_triggers,

          calming_supports =
            excluded.calming_supports,

          touch_preference =
            excluded.touch_preference,

          safety_risk_level =
            excluded.safety_risk_level,

          known_destinations =
            excluded.known_destinations,

          safe_approach =
            excluded.safe_approach,

          emergency_contact_name =
            excluded.emergency_contact_name,

          emergency_contact_relationship =
            excluded.emergency_contact_relationship,

          emergency_contact_phone =
            excluded.emergency_contact_phone,

          alternate_contact_name =
            excluded.alternate_contact_name,

          alternate_contact_phone =
            excluded.alternate_contact_phone,

          responder_notes =
            excluded.responder_notes,

          updated_at =
            datetime('now')
      `)
        .bind(
          enrollmentId,
          details.preferred_name,
          details.communication_method,
          details.communication_notes,
          details.sensory_triggers,
          details.calming_supports,
          details.touch_preference,
          details.safety_risk_level,
          details.known_destinations,
          details.safe_approach,
          details.emergency_contact_name,
          details.emergency_contact_relationship,
          details.emergency_contact_phone,
          details.alternate_contact_name,
          details.alternate_contact_phone,
          details.responder_notes
        )
        .run();
    }

    if (hasOwn(body, 'physical_description')) {
      const source =
        body.physical_description &&
        typeof body.physical_description === 'object'
          ? body.physical_description
          : {};

      const physical = {
        height_inches:
          integerOrNull(
            source.height_inches,
            12,
            120
          ),

        approximate_weight_lbs:
          integerOrNull(
            source.approximate_weight_lbs,
            1,
            1500
          ),

        build_description:
          clean(
            source.build_description,
            100
          ),

        hair_color:
          clean(
            source.hair_color,
            80
          ),

        hair_style:
          clean(
            source.hair_style,
            120
          ),

        eye_color:
          clean(
            source.eye_color,
            80
          ),

        complexion:
          clean(
            source.complexion,
            120
          ),

        wears_glasses:
          boolInt(
            source.wears_glasses
          ),

        mobility_aids:
          clean(
            source.mobility_aids,
            300
          ),

        identifying_features:
          clean(
            source.identifying_features,
            700
          ),

        description_notes:
          clean(
            source.description_notes,
            700
          )
      };

      await env.ONEPROFILE_DB.prepare(`
        INSERT INTO oneprofile_physical_description (
          enrollment_id,
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
          description_notes,
          updated_at
        )
        VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?,
          datetime('now')
        )
        ON CONFLICT(enrollment_id)
        DO UPDATE SET
          height_inches =
            excluded.height_inches,

          approximate_weight_lbs =
            excluded.approximate_weight_lbs,

          build_description =
            excluded.build_description,

          hair_color =
            excluded.hair_color,

          hair_style =
            excluded.hair_style,

          eye_color =
            excluded.eye_color,

          complexion =
            excluded.complexion,

          wears_glasses =
            excluded.wears_glasses,

          mobility_aids =
            excluded.mobility_aids,

          identifying_features =
            excluded.identifying_features,

          description_notes =
            excluded.description_notes,

          updated_at =
            datetime('now')
      `)
        .bind(
          enrollmentId,
          physical.height_inches,
          physical.approximate_weight_lbs,
          physical.build_description,
          physical.hair_color,
          physical.hair_style,
          physical.eye_color,
          physical.complexion,
          physical.wears_glasses,
          physical.mobility_aids,
          physical.identifying_features,
          physical.description_notes
        )
        .run();
    }

    if (
      hasOwn(
        body,
        'medical_profile_status'
      )
    ) {
      const source =
        body.medical_profile_status &&
        typeof body.medical_profile_status ===
          'object'
          ? body.medical_profile_status
          : {};

      const noCurrentMedications =
        boolInt(
          source.no_current_medications
        );

      const noKnownAllergies =
        boolInt(
          source.no_known_allergies
        );

      const noKnownDiagnoses =
        boolInt(
          source.no_known_diagnoses
        );

      await env.ONEPROFILE_DB.prepare(`
        INSERT INTO oneprofile_medical_profile_status (
          enrollment_id,
          no_current_medications,
          no_known_allergies,
          no_known_diagnoses,
          updated_at
        )
        VALUES (
          ?,?,?,?,
          datetime('now')
        )
        ON CONFLICT(enrollment_id)
        DO UPDATE SET
          no_current_medications =
            excluded.no_current_medications,

          no_known_allergies =
            excluded.no_known_allergies,

          no_known_diagnoses =
            excluded.no_known_diagnoses,

          updated_at =
            datetime('now')
      `)
        .bind(
          enrollmentId,
          noCurrentMedications,
          noKnownAllergies,
          noKnownDiagnoses
        )
        .run();
    }

    if (hasOwn(body, 'diagnoses')) {
      if (!Array.isArray(body.diagnoses)) {
        return json(
          {
            error:
              'Diagnoses must be provided as a list.'
          },
          400
        );
      }

      if (body.diagnoses.length > 25) {
        return json(
          {
            error:
              'A maximum of 25 diagnoses may be stored.'
          },
          400
        );
      }

      const diagnoses =
        body.diagnoses
          .map((item) => ({
            diagnosis_name:
              clean(
                item?.diagnosis_name,
                160
              ),

            diagnosis_notes:
              clean(
                item?.diagnosis_notes,
                700
              )
          }))
          .filter(
            (item) =>
              item.diagnosis_name
          );

      const statements = [
        env.ONEPROFILE_DB.prepare(`
          DELETE FROM oneprofile_diagnoses
          WHERE enrollment_id = ?
        `).bind(enrollmentId)
      ];

      for (const diagnosis of diagnoses) {
        statements.push(
          env.ONEPROFILE_DB.prepare(`
            INSERT INTO oneprofile_diagnoses (
              enrollment_id,
              diagnosis_name,
              diagnosis_notes,
              active,
              updated_at
            )
            VALUES (
              ?,?,?,1,
              datetime('now')
            )
          `).bind(
            enrollmentId,
            diagnosis.diagnosis_name,
            diagnosis.diagnosis_notes
          )
        );
      }

      await env.ONEPROFILE_DB.batch(
        statements
      );
    }

    if (hasOwn(body, 'medications')) {
      if (!Array.isArray(body.medications)) {
        return json(
          {
            error:
              'Medications must be provided as a list.'
          },
          400
        );
      }

      if (body.medications.length > 40) {
        return json(
          {
            error:
              'A maximum of 40 medications may be stored.'
          },
          400
        );
      }

      const medications =
        body.medications
          .map((item) => ({
            medication_name:
              clean(
                item?.medication_name,
                160
              ),

            dose:
              clean(
                item?.dose,
                100
              ),

            route:
              clean(
                item?.route,
                80
              ),

            frequency:
              clean(
                item?.frequency,
                120
              ),

            purpose:
              clean(
                item?.purpose,
                200
              ),

            medication_notes:
              clean(
                item?.medication_notes,
                700
              )
          }))
          .filter(
            (item) =>
              item.medication_name
          );

      const statements = [
        env.ONEPROFILE_DB.prepare(`
          DELETE FROM oneprofile_medications
          WHERE enrollment_id = ?
        `).bind(enrollmentId)
      ];

      for (const medication of medications) {
        statements.push(
          env.ONEPROFILE_DB.prepare(`
            INSERT INTO oneprofile_medications (
              enrollment_id,
              medication_name,
              dose,
              route,
              frequency,
              purpose,
              medication_notes,
              active,
              updated_at
            )
            VALUES (
              ?,?,?,?,?,?,?,1,
              datetime('now')
            )
          `).bind(
            enrollmentId,
            medication.medication_name,
            medication.dose,
            medication.route,
            medication.frequency,
            medication.purpose,
            medication.medication_notes
          )
        );
      }

      await env.ONEPROFILE_DB.batch(
        statements
      );
    }

    if (hasOwn(body, 'allergies')) {
      if (!Array.isArray(body.allergies)) {
        return json(
          {
            error:
              'Allergies must be provided as a list.'
          },
          400
        );
      }

      if (body.allergies.length > 25) {
        return json(
          {
            error:
              'A maximum of 25 allergies may be stored.'
          },
          400
        );
      }

      const allowedTypes =
        new Set([
          '',
          'medication',
          'food',
          'environmental',
          'latex',
          'other'
        ]);

      const allowedSeverities =
        new Set([
          '',
          'mild',
          'moderate',
          'severe',
          'life_threatening',
          'unknown'
        ]);

      const allergies =
        body.allergies
          .map((item) => {
            const type =
              clean(
                item?.allergy_type,
                40
              ).toLowerCase();

            const severity =
              clean(
                item?.severity,
                40
              ).toLowerCase();

            return {
              allergen:
                clean(
                  item?.allergen,
                  160
                ),

              allergy_type:
                allowedTypes.has(type)
                  ? type
                  : 'other',

              reaction:
                clean(
                  item?.reaction,
                  300
                ),

              severity:
                allowedSeverities.has(
                  severity
                )
                  ? severity
                  : 'unknown',

              allergy_notes:
                clean(
                  item?.allergy_notes,
                  700
                )
            };
          })
          .filter(
            (item) =>
              item.allergen
          );

      const statements = [
        env.ONEPROFILE_DB.prepare(`
          DELETE FROM oneprofile_allergies
          WHERE enrollment_id = ?
        `).bind(enrollmentId)
      ];

      for (const allergy of allergies) {
        statements.push(
          env.ONEPROFILE_DB.prepare(`
            INSERT INTO oneprofile_allergies (
              enrollment_id,
              allergen,
              allergy_type,
              reaction,
              severity,
              allergy_notes,
              active,
              updated_at
            )
            VALUES (
              ?,?,?,?,?,?,1,
              datetime('now')
            )
          `).bind(
            enrollmentId,
            allergy.allergen,
            allergy.allergy_type,
            allergy.reaction,
            allergy.severity,
            allergy.allergy_notes
          )
        );
      }

      await env.ONEPROFILE_DB.batch(
        statements
      );
    }

    await env.ONEPROFILE_DB.prepare(`
      UPDATE oneprofile_profiles
      SET
        profile_status = 'in_progress',
        updated_at = datetime('now')
      WHERE enrollment_id = ?
    `)
      .bind(enrollmentId)
      .run();

    return json({
      ok: true,
      status: 'in_progress'
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        error: 'Unable to save profile.'
      },
      500
    );
  }
}

export async function onRequest(ctx) {
  if (ctx.request.method === 'GET') {
    return onRequestGet(ctx);
  }

  if (ctx.request.method === 'POST') {
    return onRequestPost(ctx);
  }

  return json(
    {
      error: 'Method not allowed'
    },
    405
  );
}