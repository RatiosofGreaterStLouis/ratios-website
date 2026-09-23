const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });

const clean = (value, max = 250) =>
  String(value ?? '').trim().slice(0, max);

const emailOk = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const htmlSafe = (value) =>
  clean(value, 2000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.BREVO_API_KEY) {
      return json(
        {
          error:
            'Volunteer submissions are temporarily unavailable. Please contact info@ratiossaveslives.org.'
        },
        503
      );
    }

    const body = await request.json();

    // Honeypot spam protection
    if (clean(body.website, 120)) {
      return json({ ok: true });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 40);
    const interest = clean(body.interest, 120);
    const message = clean(body.message, 1500);

    if (!name || !emailOk(email) || !interest) {
      return json(
        {
          error: 'Please complete your name, email, and area of interest.'
        },
        400
      );
    }

    const senderEmail =
      env.ONEPROFILE_SENDER_EMAIL || 'info@ratiossaveslives.org';

    const senderName =
      env.ONEPROFILE_SENDER_NAME || 'RATIOS';

    const brevoHeaders = {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json'
    };

    const nameSafe = htmlSafe(name);
    const emailSafe = htmlSafe(email);
    const phoneSafe = htmlSafe(phone || 'Not provided');
    const interestSafe = htmlSafe(interest);
    const messageSafe = htmlSafe(message || 'No additional message.');

    const adminEmail = {
      sender: {
        name: senderName,
        email: senderEmail
      },

      to: [
        {
          email: 'info@ratiossaveslives.org',
          name: 'RATIOS'
        }
      ],

      replyTo: {
        email,
        name
      },

      subject: `New RATIOS Volunteer Interest — ${name}`,

      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#10243a">

          <div style="background:#06285a;padding:26px 30px;border-radius:16px 16px 0 0;">
            <div style="color:#ffffff;font-size:26px;font-weight:800;">
              New Volunteer Interest
            </div>
            <div style="color:#f6be4b;font-size:14px;font-weight:700;margin-top:6px;">
              RATIOS • Stronger Communities. Safer Lives.
            </div>
          </div>

          <div style="border:1px solid #dce7ef;border-top:0;padding:30px;border-radius:0 0 16px 16px;">

            <p>
              A new volunteer interest form has been submitted through
              ratiossaveslives.org.
            </p>

            <table style="width:100%;border-collapse:collapse;margin-top:22px;">

              <tr>
                <td style="padding:10px 0;font-weight:700;width:180px;">
                  Name
                </td>
                <td style="padding:10px 0;">
                  ${nameSafe}
                </td>
              </tr>

              <tr>
                <td style="padding:10px 0;font-weight:700;">
                  Email
                </td>
                <td style="padding:10px 0;">
                  ${emailSafe}
                </td>
              </tr>

              <tr>
                <td style="padding:10px 0;font-weight:700;">
                  Phone
                </td>
                <td style="padding:10px 0;">
                  ${phoneSafe}
                </td>
              </tr>

              <tr>
                <td style="padding:10px 0;font-weight:700;">
                  Area of Interest
                </td>
                <td style="padding:10px 0;">
                  ${interestSafe}
                </td>
              </tr>

            </table>

            <div style="margin-top:24px;">
              <div style="font-weight:700;margin-bottom:8px;">
                Message
              </div>

              <div style="background:#f4f9fc;padding:18px;border-radius:12px;line-height:1.6;">
                ${messageSafe}
              </div>
            </div>

            <p style="margin-top:28px;font-size:13px;color:#66788a;">
              Reply directly to this email to contact ${nameSafe}.
            </p>

          </div>

        </div>
      `
    };

    const endpoint = 'https://api.brevo.com/v3/smtp/email';

    const emailResponse = await fetch(endpoint, {
      method: 'POST',
      headers: brevoHeaders,
      body: JSON.stringify(adminEmail)
    });

    if (!emailResponse.ok) {
      console.error(
        'Volunteer email failed',
        emailResponse.status,
        await emailResponse.text()
      );

      return json(
        {
          error:
            'We could not submit your volunteer interest right now. Please try again.'
        },
        500
      );
    }

    return json({
      ok: true
    });

  } catch (error) {
    console.error('Volunteer submission error', error);

    return json(
      {
        error:
          'Something went wrong. Please try again or contact info@ratiossaveslives.org.'
      },
      500
    );
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  return onRequestPost(context);
}