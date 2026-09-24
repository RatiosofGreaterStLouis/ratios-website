const json = (body, status = 200) =>

  new Response(JSON.stringify(body), {

    status,

    headers: {

      "Content-Type": "application/json",

      "Cache-Control": "no-store",

    },

  });

 

const encoder = new TextEncoder();

 

function escapeHtml(value = "") {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}

 

function formatMoney(amount, currency = "usd") {

  return new Intl.NumberFormat("en-US", {

    style: "currency",

    currency: String(currency || "usd").toUpperCase(),

  }).format((Number(amount) || 0) / 100);

}

 

function parseStripeSignature(header) {

  const parts = String(header || "").split(",");

 

  let timestamp = "";

  const signatures = [];

 

  for (const part of parts) {

    const [key, value] = part.split("=");

 

    if (key === "t") timestamp = value;

    if (key === "v1") signatures.push(value);

  }

 

  return { timestamp, signatures };

}

 

function hexToBytes(hex) {

  if (!hex || hex.length % 2 !== 0) return null;

 

  const bytes = new Uint8Array(hex.length / 2);

 

  for (let i = 0; i < hex.length; i += 2) {

    const value = Number.parseInt(hex.slice(i, i + 2), 16);

    if (Number.isNaN(value)) return null;

    bytes[i / 2] = value;

  }

 

  return bytes;

}

 

function constantTimeEqual(a, b) {

  if (!a || !b || a.length !== b.length) return false;

 

  let result = 0;

 

  for (let i = 0; i < a.length; i++) {

    result |= a[i] ^ b[i];

  }

 

  return result === 0;

}

 

async function verifyStripeSignature(payload, header, secret) {

  const { timestamp, signatures } = parseStripeSignature(header);

 

  if (!timestamp || !signatures.length) return false;

 

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));

 

  // Reject webhook signatures older than 5 minutes.

  if (!Number.isFinite(age) || age > 300) return false;

 

  const key = await crypto.subtle.importKey(

    "raw",

    encoder.encode(secret),

    { name: "HMAC", hash: "SHA-256" },

    false,

    ["sign"]

  );

 

  const expected = new Uint8Array(

    await crypto.subtle.sign(

      "HMAC",

      key,

      encoder.encode(`${timestamp}.${payload}`)

    )

  );

 

  return signatures.some((signature) => {

    const actual = hexToBytes(signature);

    return constantTimeEqual(expected, actual);

  });

}

 

async function stripeGet(path, secretKey) {

  const response = await fetch(`https://api.stripe.com${path}`, {

    headers: {

      Authorization: `Bearer ${secretKey}`,

    },

  });

 

  const data = await response.json();

 

  if (!response.ok) {

    throw new Error(

      data?.error?.message || "Unable to retrieve Stripe order information."

    );

  }

 

  return data;

}

 

async function sendBrevoEmail(apiKey, payload) {

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {

    method: "POST",

    headers: {

      "api-key": apiKey,

      "Content-Type": "application/json",

      Accept: "application/json",

    },

    body: JSON.stringify(payload),

  });

 

  if (!response.ok) {

    const errorText = await response.text();

    throw new Error(`Brevo email failed: ${errorText}`);

  }

}

 

function buildAddress(address) {

  if (!address) return "";

 

  return [

    address.line1,

    address.line2,

    [address.city, address.state].filter(Boolean).join(", "),

    address.postal_code,

    address.country,

  ]

    .filter(Boolean)

    .join("<br>");

}

 

function getOrderItems(session, lineItems) {

  const metadata = session.metadata || {};

 

  return (lineItems.data || []).map((item, index) => {

    const savedVariant = metadata[`item_${index + 1}`] || "";

    const name =

      item.description ||

      item.price?.product?.name ||

      "RATIOS Shop Item";

 

    return {

      name,

      variant: savedVariant,

      quantity: item.quantity || 1,

      amount: item.amount_total || 0,

      currency: item.currency || session.currency || "usd",

    };

  });

}

 

async function processPaidOrder(context, event, stripeSecretKey) {

  const session = event.data.object;

 

  /*

   * checkout.session.completed can also be sent for payment methods

   * that have not finished clearing.

   *

   * We only fulfill a completed event when Stripe says it is paid.

   * Delayed methods will be handled by

   * checkout.session.async_payment_succeeded.

   */

  if (

    event.type === "checkout.session.completed" &&

    session.payment_status !== "paid"

  ) {

    return {

      processed: false,

      reason: "Payment is not paid yet.",

    };

  }

 

  if (

    event.type !== "checkout.session.completed" &&

    event.type !== "checkout.session.async_payment_succeeded"

  ) {

    return {

      processed: false,

      reason: "Event does not require fulfillment.",

    };

  }

 

  const fullSession = await stripeGet(

    `/v1/checkout/sessions/${encodeURIComponent(

      session.id

    )}?expand[]=customer&expand[]=payment_intent`,

    stripeSecretKey

  );

 

  const lineItems = await stripeGet(

    `/v1/checkout/sessions/${encodeURIComponent(

      session.id

    )}/line_items?limit=100&expand[]=data.price.product`,

    stripeSecretKey

  );

 

  const customer = fullSession.customer_details || {};

  const metadata = fullSession.metadata || {};

 

  const deliveryMethod =

    metadata.delivery_method === "pickup" ? "pickup" : "shipping";

 

  const items = getOrderItems(fullSession, lineItems);

 

  const orderNumber = fullSession.id;

  const customerName = customer.name || "Customer";

  const customerEmail = customer.email || "";

  const customerPhone = customer.phone || "";

 

  const shippingDetails =

    fullSession.collected_information?.shipping_details ||

    fullSession.shipping_details ||

    null;

 

  const shippingAddress =

    shippingDetails?.address || customer.address || null;

 

  const itemRows = items

    .map(

      (item) => `

        <tr>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">

            <strong>${escapeHtml(item.name)}</strong>

            ${

              item.variant

                ? `<br><span style="color:#64748b;">${escapeHtml(

                    item.variant

                  )}</span>`

                : ""

            }

          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">

            ${escapeHtml(item.quantity)}

          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">

            ${escapeHtml(formatMoney(item.amount, item.currency))}

          </td>

        </tr>

      `

    )

    .join("");

 

  const deliveryText =

    deliveryMethod === "pickup"

      ? "Local Pickup"

      : "Flat-Rate Shipping";

 

  const internalEmailHtml = `

    <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;color:#17233c;">

      <h1 style="margin-bottom:4px;">New RATIOS Shop Order</h1>

 

      <p style="margin-top:0;color:#64748b;">

        A paid order is ready for processing.

      </p>

 

      <div style="background:#f8fafc;padding:18px;border-radius:10px;margin:20px 0;">

        <strong>Stripe Order:</strong> ${escapeHtml(orderNumber)}<br>

        <strong>Amount Paid:</strong>

        ${escapeHtml(

          formatMoney(fullSession.amount_total, fullSession.currency)

        )}<br>

        <strong>Delivery:</strong> ${escapeHtml(deliveryText)}

      </div>

 

      <h2>Customer</h2>

 

      <p>

        <strong>Name:</strong> ${escapeHtml(customerName)}<br>

        <strong>Email:</strong> ${escapeHtml(customerEmail || "Not provided")}<br>

        <strong>Phone:</strong> ${escapeHtml(customerPhone || "Not provided")}

      </p>

 

      ${

        deliveryMethod === "shipping"

          ? `

            <h2>Shipping Address</h2>

            <p>

              ${

                shippingAddress

                  ? buildAddress(shippingAddress)

                  : "Shipping address not available."

              }

            </p>

          `

          : `

            <h2>Local Pickup</h2>

            <p>

              Customer selected <strong>FREE local pickup</strong>.

              Contact the customer using the email or phone number above

              to coordinate pickup details.

            </p>

          `

      }

 

      <h2>Order Items</h2>

 

      <table style="width:100%;border-collapse:collapse;">

        <thead>

          <tr>

            <th style="padding:12px;text-align:left;border-bottom:2px solid #17233c;">Item</th>

            <th style="padding:12px;text-align:center;border-bottom:2px solid #17233c;">Qty</th>

            <th style="padding:12px;text-align:right;border-bottom:2px solid #17233c;">Amount</th>

          </tr>

        </thead>

        <tbody>

          ${itemRows}

        </tbody>

      </table>

 

      <p style="margin-top:24px;">

        <strong>Total Paid:</strong>

        ${escapeHtml(

          formatMoney(fullSession.amount_total, fullSession.currency)

        )}

      </p>

    </div>

  `;

 

  await sendBrevoEmail(context.env.BREVO_API_KEY, {

    sender: {

      name: "RATIOS Shop",

      email:

        context.env.ONEPROFILE_SENDER_EMAIL ||

        "info@ratiossaveslives.org",

    },

    to: [

      {

        email: "info@ratiossaveslives.org",

        name: "RATIOS",

      },

    ],

    subject: `PAID RATIOS Order - ${customerName}`,

    htmlContent: internalEmailHtml,

  });

 

  /*

   * Send the customer a RATIOS confirmation as well.

   * We intentionally do NOT include a private pickup address.

   */

  if (customerEmail) {

    const customerDeliveryMessage =

      deliveryMethod === "pickup"

        ? `

          <h2>Local Pickup Selected</h2>

          <p>

            Thank you for your order! RATIOS will contact you using

            the email or phone number provided at checkout to

            coordinate pickup details.

          </p>

        `

        : `

          <h2>Your Order Will Be Shipped</h2>

          <p>

            Thank you for your order! Your RATIOS order has been

            received and will be prepared for shipment.

          </p>

        `;

 

    const customerItems = items

      .map(

        (item) => `

          <li style="margin-bottom:10px;">

            <strong>${escapeHtml(item.name)}</strong>

            ${

              item.variant

                ? `<br>${escapeHtml(item.variant)}`

                : ""

            }

            <br>Quantity: ${escapeHtml(item.quantity)}

          </li>

        `

      )

      .join("");

 

    const customerEmailHtml = `

      <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#17233c;">

        <h1>Thank You for Supporting RATIOS!</h1>

 

        <p>Hi ${escapeHtml(customerName)},</p>

 

        <p>

          Your payment was received successfully. We have your order

          and will begin processing it.

        </p>

 

        ${customerDeliveryMessage}

 

        <h2>Your Order</h2>

        <ul>

          ${customerItems}

        </ul>

 

        <p>

          <strong>Total Paid:</strong>

          ${escapeHtml(

            formatMoney(fullSession.amount_total, fullSession.currency)

          )}

        </p>

 

        <p style="margin-top:28px;">

          Your purchase helps support RATIOS disability-safety

          education, identification resources, caregiver support,

          and community outreach.

        </p>

 

        <p>

          Thank you for supporting the mission.<br>

          <strong>RATIOS of Greater St. Louis</strong>

        </p>

      </div>

    `;

 

    await sendBrevoEmail(context.env.BREVO_API_KEY, {

      sender: {

        name: "RATIOS",

        email:

          context.env.ONEPROFILE_SENDER_EMAIL ||

          "info@ratiossaveslives.org",

      },

      to: [

        {

          email: customerEmail,

          name: customerName,

        },

      ],

      subject: "Your RATIOS Order Is Confirmed",

      htmlContent: customerEmailHtml,

    });

  }

 

  return {

    processed: true,

    sessionId: fullSession.id,

  };

}

 

export async function onRequestPost(context) {

  try {

    if (!context.env.STRIPE_WEBHOOK_SECRET) {

      console.error("STRIPE_WEBHOOK_SECRET is missing.");

      return json({ error: "Webhook is not configured." }, 500);

    }

 

    if (!context.env.STRIPE_SECRET_KEY) {

      console.error("STRIPE_SECRET_KEY is missing.");

      return json({ error: "Stripe is not configured." }, 500);

    }

 

    if (!context.env.BREVO_API_KEY) {

      console.error("BREVO_API_KEY is missing.");

      return json({ error: "Email is not configured." }, 500);

    }

 

    const signature = context.request.headers.get("Stripe-Signature");

    const rawBody = await context.request.text();

 

    const verifiedLive = await verifyStripeSignature(

      rawBody,

      signature,

      context.env.STRIPE_WEBHOOK_SECRET

    );

 

    const verifiedTest =

      !verifiedLive && context.env.STRIPE_WEBHOOK_TEST_SECRET

        ? await verifyStripeSignature(

            rawBody,

            signature,

            context.env.STRIPE_WEBHOOK_TEST_SECRET

          )

        : false;

 

    if (!verifiedLive && !verifiedTest) {

      console.error("Invalid Stripe webhook signature.");

      return json({ error: "Invalid signature." }, 400);

    }

 

    const stripeSecretKey = verifiedLive

      ? context.env.STRIPE_SECRET_KEY

      : context.env.STRIPE_TEST_SECRET_KEY;

 

    if (!stripeSecretKey) {

      console.error(

        verifiedLive

          ? "STRIPE_SECRET_KEY is missing."

          : "STRIPE_TEST_SECRET_KEY is missing."

      );

      return json({ error: "Stripe environment is not configured." }, 500);

    }

 

    const event = JSON.parse(rawBody);

 

    if (

      event.type !== "checkout.session.completed" &&

      event.type !== "checkout.session.async_payment_succeeded"

    ) {

      return json({ received: true, processed: false });

    }

 

    const result = await processPaidOrder(context, event, stripeSecretKey);

 

    return json({

      received: true,

      ...result,

    });

  } catch (error) {

    console.error("Stripe webhook error:", error);

 

    /*

     * Return an error so Stripe knows delivery was unsuccessful

     * and can retry the webhook.

     */

    return json(

      {

        error: "Unable to process Stripe webhook.",

      },

      500

    );

  }

}

 

export function onRequestGet() {

  return json({

    status: "RATIOS Stripe webhook endpoint is online.",

  });

}