const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });


const allowed = new Set([

  /* Identity & communication */
  'preferred_name',
  'communication_method',
  'communication_notes',

  /* Identification */
  'participant_photo',
  'additional_photos',
  'physical_description',

  /* Sensory & calming support */
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

  return [
    ...new Set(
      parsed.filter(
        (field) =>
          allowed.has(field)
      )
    )
  ];

}


function has(fields, name) {
  return fields.includes(name);
}


function photoUrl(publicToken, photoId) {

  return (
    `/api/emergency-photo` +
    `?id=${encodeURIComponent(publicToken)}` +
    `&photo=${encodeURIComponent(photoId)}`
  );

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
            'Profile unavailable.'
        },
        503
      );
    }


    const publicToken =
      new URL(request.url)
        .searchParams
        .get('id') || '';


    if (publicToken.length < 16) {

      return json(
        {
          error:
            'Profile unavailable.'
        },
        404
      );

    }


    const profileSettings =
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


    if (!profileSettings) {

      return json(
        {
          error:
            'Profile unavailable.'
        },
        404
      );

    }


    const fields =
      safeFields(
        profileSettings.public_fields
      );


    const enrollmentId =
      profileSettings.enrollment_id;


    const details =
      await env.ONEPROFILE_DB.prepare(`
        SELECT *
        FROM oneprofile_profile_details
        WHERE enrollment_id = ?
        LIMIT 1
      `)
        .bind(enrollmentId)
        .first();


    if (!details) {

      return json(
        {
          error:
            'Profile unavailable.'
        },
        404
      );

    }


    const out = {};


    /*
      Existing scalar responder fields.
      These remain backward-compatible with the
      current emergency-view interface.
    */

    for (const field of fields) {

      if (
        scalarFields.has(field)
      ) {

        out[field] =
          details[field] ?? '';

      }

    }


    /*
      Physical / identifying description
    */

    if (
      has(
        fields,
        'physical_description'
      )
    ) {

      const physical =
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
            description_notes
          FROM oneprofile_physical_description
          WHERE enrollment_id = ?
          LIMIT 1
        `)
          .bind(enrollmentId)
          .first();


      if (physical) {

        out.physical_description = {

          height_inches:
            physical.height_inches ?? null,

          approximate_weight_lbs:
            physical.approximate_weight_lbs ?? null,

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
            !!physical.wears_glasses,

          mobility_aids:
            physical.mobility_aids || '',

          identifying_features:
            physical.identifying_features || '',

          description_notes:
            physical.description_notes || ''

        };

      } else {

        out.physical_description = null;

      }

    }


    /*
      Diagnoses / conditions
    */

    if (
      has(
        fields,
        'diagnoses'
      )
    ) {

      const result =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            id,
            diagnosis_name,
            diagnosis_notes
          FROM oneprofile_diagnoses
          WHERE enrollment_id = ?
            AND active = 1
          ORDER BY id ASC
        `)
          .bind(enrollmentId)
          .all();


      const status =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            no_known_diagnoses
          FROM oneprofile_medical_profile_status
          WHERE enrollment_id = ?
          LIMIT 1
        `)
          .bind(enrollmentId)
          .first();


      out.diagnoses = {

        none_known:
          !!status?.no_known_diagnoses,

        items:
          (result.results || []).map(
            (item) => ({
              id: item.id,
              diagnosis_name:
                item.diagnosis_name || '',
              diagnosis_notes:
                item.diagnosis_notes || ''
            })
          )

      };

    }


    /*
      Medications
    */

    if (
      has(
        fields,
        'medications'
      )
    ) {

      const result =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            id,
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
          .bind(enrollmentId)
          .all();


      const status =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            no_current_medications
          FROM oneprofile_medical_profile_status
          WHERE enrollment_id = ?
          LIMIT 1
        `)
          .bind(enrollmentId)
          .first();


      out.medications = {

        none_current:
          !!status?.no_current_medications,

        items:
          (result.results || []).map(
            (item) => ({
              id: item.id,

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
            })
          )

      };

    }


    /*
      Allergies
    */

    if (
      has(
        fields,
        'allergies'
      )
    ) {

      const result =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            id,
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
          .bind(enrollmentId)
          .all();


      const status =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            no_known_allergies
          FROM oneprofile_medical_profile_status
          WHERE enrollment_id = ?
          LIMIT 1
        `)
          .bind(enrollmentId)
          .first();


      out.allergies = {

        none_known:
          !!status?.no_known_allergies,

        items:
          (result.results || []).map(
            (item) => ({
              id: item.id,

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
            })
          )

      };

    }


    /*
      Primary participant photo.

      The R2 object itself is NOT exposed here.

      This only returns an authenticated/gated
      responder-photo API URL.

      We will create /api/emergency-photo next.
    */

    if (
      has(
        fields,
        'participant_photo'
      )
    ) {

      const primary =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            id,
            caption
          FROM oneprofile_photos
          WHERE enrollment_id = ?
            AND status = 'active'
            AND is_primary = 1
          LIMIT 1
        `)
          .bind(enrollmentId)
          .first();


      if (primary) {

        out.participant_photo = {

          id:
            primary.id,

          caption:
            primary.caption || '',

          url:
            photoUrl(
              publicToken,
              primary.id
            )

        };

      } else {

        out.participant_photo =
          null;

      }

    }


    /*
      Optional additional identifying photos.
    */

    if (
      has(
        fields,
        'additional_photos'
      )
    ) {

      const result =
        await env.ONEPROFILE_DB.prepare(`
          SELECT
            id,
            caption
          FROM oneprofile_photos
          WHERE enrollment_id = ?
            AND status = 'active'
            AND is_primary = 0
          ORDER BY id ASC
        `)
          .bind(enrollmentId)
          .all();


      out.additional_photos =
        (result.results || []).map(
          (photo) => ({

            id:
              photo.id,

            caption:
              photo.caption || '',

            url:
              photoUrl(
                publicToken,
                photo.id
              )

          })
        );

    }


    return json({
      profile: out
    });


  } catch (error) {

    console.error(error);

    return json(
      {
        error:
          'Profile unavailable.'
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