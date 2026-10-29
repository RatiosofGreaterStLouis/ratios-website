// Shared server-side permissions for both OneProfile scan routes and photo routes.
export const basicFields = [
  'preferred_name', 'emergency_contact_name', 'emergency_contact_relationship',
  'emergency_contact_phone', 'alternate_contact_name', 'alternate_contact_phone'
];
export const allowedFields = new Set([
  ...basicFields, 'communication_method', 'communication_notes', 'participant_photo',
  'additional_photos', 'physical_description', 'sensory_triggers', 'calming_supports',
  'touch_preference', 'safety_risk_level', 'known_destinations', 'safe_approach',
  'diagnoses', 'medications', 'allergies', 'responder_notes'
]);
export function safeFields(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter(field => allowedFields.has(field)))] : [];
  } catch { return []; }
}
export function hasBasicCard(settings) {
  return Number(settings?.basic_card_enabled) === 1 && Boolean(settings?.basic_card_consented_at);
}
export function accessFor(settings, basicPreview = false) {
  const basic = hasBasicCard(settings);
  const full = Number(settings?.public_profile_enabled) === 1 && !basicPreview;
  const fields = new Set(full ? safeFields(settings.public_fields) : []);
  if (basic) {
    basicFields.forEach(field => fields.add(field));
    if (Number(settings.basic_photo_enabled) === 1) fields.add('participant_photo');
  }
  return { basic, full, fields, mode: full ? 'full' : basic ? 'basic' : 'unavailable' };
}
export async function addBasicIdentity(env, settings, details, profile, access) {
  if (!access.basic) return;
  const enrollment = await env.ONEPROFILE_DB.prepare(`
    SELECT participant_first_name FROM oneprofile_enrollments
    WHERE enrollment_id = ? LIMIT 1
  `).bind(settings.enrollment_id).first();
  profile.participant_name = enrollment?.participant_first_name || '';
  profile.preferred_name = details?.preferred_name || profile.participant_name;
  profile.basic_help_note = settings.basic_help_note || '';
}
