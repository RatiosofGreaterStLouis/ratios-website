const LIVE_ALLOWED_PRICES = new Set([

  "price_1UIv6kBEQmRGbpGgZw0UUlnv",

  "price_1UIv6kBEQmRGbpGgJq0nnuZY",

  "price_1UIv6kBEQmRGbpGgXi4mmD2W",

  "price_1UIvK6BEQmRGbpGgxOFdbVuD",

  "price_1UIvK6BEQmRGbpGgiY2KLRxE",

  "price_1UIvK6BEQmRGbpGgP2qkUAz5",

  "price_1UIvP2BEQmRGbpGgUOIZ33xt",

  "price_1UIvP2BEQmRGbpGgO8f6ixBP",

  "price_1UIvP2BEQmRGbpGgPg1x1cft",

  "price_1UIveqBEQmRGbpGg9x566pkY"

]);

 

const TEST_PRICE_ID = "price_1UJ3U0BEQmRGbpGgUiQo1mwk";

 

const json = (body, status = 200) =>

  new Response(JSON.stringify(body), {

    status,

    headers: {

      "Content-Type": "application/json",

      "Cache-Control": "no-store"

    }

  });

 

export async function onRequestPost(context) {

  try {

    const body = await context.request.json();

    const items = Array.isArray(body.items) ? body.items : [];

    const delivery = body.delivery === "pickup" ? "pickup" : "shipping";

 

    /*

     * TEST MODE IS EXPLICIT.

     * The public shop never sends testMode:true, so normal customer orders

     * continue using the live Stripe key and live allowlist.

     */

    const testMode = body.testMode === true;

 

    const stripeSecretKey = testMode

      ? context.env.STRIPE_TEST_SECRET_KEY

      : context.env.STRIPE_SECRET_KEY;

 

    if (!stripeSecretKey) {

      console.error(

        testMode

          ? "STRIPE_TEST_SECRET_KEY is missing."

          : "STRIPE_SECRET_KEY is missing."

      );

      return json({ error: "Stripe is not configured." }, 500);

    }

 

    if (!items.length) {

      return json({ error: "Your cart is empty." }, 400);

    }

 

    for (const item of items) {

      const validPrice = testMode

        ? item.priceId === TEST_PRICE_ID

        : LIVE_ALLOWED_PRICES.has(item.priceId);

 

      if (!validPrice) {

        return json({ error: "Invalid product selection." }, 400);

      }

 

      if (

        !Number.isInteger(item.quantity) ||

        item.quantity < 1 ||

        item.quantity > 20

      ) {

        return json({ error: "Invalid quantity." }, 400);

      }

    }

 

    /*

     * Extra safety:

     * sandbox mode accepts ONLY the dedicated $1 RATIOS test product.

     */

    if (testMode && items.some((item) => item.priceId !== TEST_PRICE_ID)) {

      return json({ error: "Invalid sandbox test product." }, 400);

    }

 

    const origin = new URL(context.request.url).origin;

    const form = new URLSearchParams();

 

    form.set("mode", "payment");

    form.set(

      "success_url",

      `${origin}/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`

    );

    form.set("cancel_url", `${origin}/shop.html?checkout=cancelled`);

    form.set("billing_address_collection", "auto");

    form.set("phone_number_collection[enabled]", "true");

    form.set("metadata[delivery_method]", delivery);

    form.set("metadata[environment]", testMode ? "sandbox" : "live");

 

    items.forEach((item, i) => {

      form.set(`line_items[${i}][price]`, item.priceId);

      form.set(`line_items[${i}][quantity]`, String(item.quantity));

 

      form.set(

        `metadata[item_${i + 1}]`,

        `${item.name || "Item"} | ${item.fit || ""}${

          item.size ? " | Size " + item.size : ""

        }`.slice(0, 500)

      );

    });

 

    if (delivery === "shipping") {

      form.set("shipping_address_collection[allowed_countries][0]", "US");

      form.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");

      form.set(

        "shipping_options[0][shipping_rate_data][fixed_amount][amount]",

        "695"

      );

      form.set(

        "shipping_options[0][shipping_rate_data][fixed_amount][currency]",

        "usd"

      );

      form.set(

        "shipping_options[0][shipping_rate_data][display_name]",

        "Flat-rate shipping"

      );

    } else {

      form.set(

        "metadata[pickup_note]",

        "Local pickup - pickup details provided after order confirmation"

      );

    }

 

    const response = await fetch(

      "https://api.stripe.com/v1/checkout/sessions",

      {

        method: "POST",

        headers: {

          Authorization: `Bearer ${stripeSecretKey}`,

          "Content-Type": "application/x-www-form-urlencoded"

        },

        body: form.toString()

      }

    );

 

    const data = await response.json();

 

    if (!response.ok) {

      console.error("Stripe Checkout error:", data?.error?.message || data);

      return json(

        { error: "Stripe could not start checkout. Please try again." },

        502

      );

    }

 

    return json({

      url: data.url,

      environment: testMode ? "sandbox" : "live"

    });

  } catch (error) {

    console.error("Checkout function error:", error);

    return json({ error: "Checkout could not be started." }, 500);

  }

}

 

export function onRequestGet() {

  return json({ error: "Method not allowed." }, 405);

}