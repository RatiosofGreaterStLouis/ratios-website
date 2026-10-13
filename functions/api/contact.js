const RATIOS_EMAIL = "info@ratiossaveslives.org";

const ALLOWED_TOPICS = [
  "General Inquiry",
  "Caregiver or Family Support",
  "OneProfile",
  "Safety Kits and Identification",
  "First Responder Outreach",
  "Community Partnership",
  "Ready, Set, Save!",
  "Donations and Sponsorships",
  "Media or Press Inquiry",
  "Other"
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function onRequestPost({ request, env }) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return jsonResponse({
        ok: false,
        error: "Invalid request format."
      }, 415);
    }

    const rawBody = await request.text();

    if (rawBody.length > 15000) {
      return jsonResponse({
        ok: false,
        error: "Your message is too large."
      }, 413);
    }

    let data;

    try {
      data = JSON.parse(rawBody);
    } catch {
      return jsonResponse({
        ok: false,
        error: "Invalid message data."
      }, 400);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonResponse({
        ok: false,
        error: "Invalid message data."
      }, 400);
    }

    // Honeypot spam protection
    if (data.website) {
      return jsonResponse({ ok: true });
    }

    const name = clean(data.name, 120);
    const email = clean(data.email, 254);
    const phone = clean(data.phone, 40);
    const organization = clean(data.organization, 150);
    const topic = clean(data.topic, 100);
    const message = clean(data.message, 4000);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !name ||
      !emailPattern.test(email) ||
      !ALLOWED_TOPICS.includes(topic) ||
      !message
    ) {
      return jsonResponse({
        ok: false,
        error: "Please complete all required fields."
      }, 400);
    }

    if (!env.BREVO_API_KEY) {
      console.error("BREVO_API_KEY is not configured.");

      return jsonResponse({
        ok: false,
        error: "The contact service is temporarily unavailable."
      }, 503);
    }

    const htmlContent = `
      <div style="
        font-family:Arial,sans-serif;
        max-width:650px;
        margin:auto;
        color:#183047;
      ">

        <div style="
          background:#071527;
          color:white;
          padding:25px;
          border-radius:12px 12px 0 0;
        ">
          <h1 style="margin:0;">RATIOS</h1>
          <p style="margin:5px 0;">New Website Contact Message</p>
        </div>

        <div style="
          padding:25px;
          border:1px solid #d9e2ea;
          border-top:0;
        ">

          <h2>Contact Form Submission</h2>

          <p><strong>Name:</strong>
            ${escapeHtml(name)}
          </p>

          <p><strong>Email:</strong>
            ${escapeHtml(email)}
          </p>

          <p><strong>Phone:</strong>
            ${escapeHtml(phone || "Not provided")}
          </p>

          <p><strong>Organization:</strong>
            ${escapeHtml(organization || "Not provided")}
          </p>

          <p><strong>Topic:</strong>
            ${escapeHtml(topic)}
          </p>

          <h3>Message</h3>

          <div style="
            background:#f4f7fa;
            padding:18px;
            border-radius:10px;
            white-space:pre-wrap;
            overflow-wrap:anywhere;
          ">${escapeHtml(message)}</div>

          <p style="margin-top:25px;">
            Reply to this email to respond directly
            to the person who submitted the form.
          </p>

        </div>
      </div>
    `;

    const emailPayload = {
      sender: {
        name: "RATIOS Website",
        email: RATIOS_EMAIL
      },

      to: [
        {
          email: RATIOS_EMAIL,
          name: "RATIOS"
        }
      ],

      replyTo: {
        email,
        name
      },

      subject: `RATIOS Contact Form: ${topic}`,

      htmlContent
    };

    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": env.BREVO_API_KEY
        },
        body: JSON.stringify(emailPayload)
      }
    );

    if (!brevoResponse.ok) {
      console.error(
        "Brevo contact email error:",
        brevoResponse.status,
        await brevoResponse.text()
      );

      return jsonResponse({
        ok: false,
        error: "Unable to send your message right now."
      }, 502);
    }

    return jsonResponse({
      ok: true,
      message: "Your message was sent to RATIOS."
    });

  } catch (error) {
    console.error("RATIOS contact function error:", error);

    return jsonResponse({
      ok: false,
      error: "An unexpected error occurred."
    }, 500);
  }
}

export function onRequestGet() {
  return jsonResponse({
    ok: false,
    error: "Use the RATIOS contact form to send a message."
  }, 405);
}