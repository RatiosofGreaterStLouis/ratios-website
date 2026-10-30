// Cloudflare Pages Function: functions/api/resource-request.js
// Set BREVO_API_KEY as a Cloudflare Pages secret before deploying.
// Verify info@ratiossaveslives.org as a Brevo transactional sender.

const EMAIL = 'info@ratiossaveslives.org';

const ROLES = new Set([
  'Caregiver/Family Member',
  'School Representative',
  'First Responder',
  'Community Organization',
  'Other'
]);

const NEEDS = new Set([
  'Safety Kit',
  'Educational Materials',
  'Community Presentation',
  'Ready, Set, Save! Workshop',
  'Partnership Information'
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function clean(value, limit) {
  return typeof value === 'string'
    ? value.trim().slice(0, limit)
    : '';
}

export async function onRequestPost({ request, env }) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({
      ok: false,
      error: 'Invalid form submission.'
    }, 415);
  }

  if (Number(request.headers.get('content-length') || 0) > 12000) {
    return json({
      ok: false,
      error: 'The request is too large.'
    }, 413);
  }

  let input;

  try {
    input = await request.json();
  } catch {
    return json({
      ok: false,
      error: 'Please try submitting the form again.'
    }, 400);
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return json({
      ok: false,
      error: 'Invalid form submission.'
    }, 400);
  }

  // Honeypot: silently accept bot submissions without sending mail.
  if (input.website) {
    return json({ ok: true });
  }

  const name = clean(input.name, 150);
  const email = clean(input.email, 254);
  const phone = clean(input.phone, 50);
  const role = clean(input.role, 100);
  const need = clean(input.need, 100);
  const message = clean(input.message, 4000);
  const address={};
  for(const [key,limit] of Object.entries({individual:100,profileEmail:254,recipient:150,street:200,unit:100,city:100,state:50,zip:10}))address[key]=clean(input[key],limit);
  if(need==='Safety Kit'&&(!address.individual||!address.recipient||!address.street||!address.city||!address.state||!/^\d{5}(-\d{4})?$/.test(address.zip)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.profileEmail)))return json({ok:false,error:'Please complete the OneProfile information and U.S. mailing address.'},400);

  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !ROLES.has(role) ||
    !NEEDS.has(need)
  ) {
    return json({
      ok: false,
      error: 'Please check your name, email, and selections.'
    }, 400);
  }

  if (!env.BREVO_API_KEY) {
    console.error('Missing BREVO_API_KEY Cloudflare secret');

    return json({
      ok: false,
      error: 'The request service is temporarily unavailable.'
    }, 503);
  }

  const body = [
    'New RATIOS Resource Request',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    `Role: ${role}`,
    `Requested resource: ${need}`,
    '',
    ...(need==='Safety Kit'?['Welcome kit / free first ID card request',...Object.entries(address).map(([key,value])=>`${key}: ${value}`),'']:[]),
    'Message:',
    message || 'No additional message',
    '',
    'Reply to the requester using the Reply button in your email.'
  ].join('\n');

  try {
    const result = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'RATIOS Resource Requests',
          email: EMAIL
        },
        to: [{
          email: EMAIL,
          name: 'RATIOS'
        }],
        replyTo: {
          email,
          name
        },
        subject: `RATIOS Resource Request: ${need}`,
        textContent: body
      })
    });

    if (!result.ok) {
      console.error(
        'Brevo rejected resource request:',
        result.status,
        (await result.text()).slice(0, 500)
      );

      return json({
        ok: false,
        error: 'We could not deliver your request right now.'
      }, 502);
    }

    return json({ ok: true });

  } catch (error) {
    console.error('Resource request service error:', error);

    return json({
      ok: false,
      error: 'We could not deliver your request right now.'
    }, 502);
  }
}

export function onRequestGet() {
  return json({
    ok: false,
    error: 'Use the request form to submit a request.'
  }, 405);
}