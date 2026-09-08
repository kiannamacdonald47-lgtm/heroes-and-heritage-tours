const Stripe = require("stripe");
const { bookingsStore, addBooking, balanceStore, createBalanceRecord, markBalancePaid } = require("./lib/bookings");

const encodeForm = (data) =>
  Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join("&");

// Relays a form submission into Netlify Forms so it reaches the same
// inbox as the contact form, without needing a separate email service
// for internal (business-facing) notifications.
async function relayToNetlifyForms(siteUrl, formName, fields) {
  const body = encodeForm({ "form-name": formName, ...fields });
  const res = await fetch(siteUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error(`${formName} form submission failed:`, res.status, await res.text());
  }
}

async function notifyBooking(siteUrl, metadata) {
  const specialRequest = [metadata.familyResearch, metadata.notes].filter(Boolean).join(" | ") || "None";
  const guestWord = metadata.guests === "1" ? "guest" : "guests";
  const summary = `${metadata.tourName || ""} · ${metadata.guests || "0"} ${guestWord} · ${metadata.preferredDate || ""}`;
  await relayToNetlifyForms(siteUrl, "booking-notification", {
    summary,
    tourName: metadata.tourName || "",
    preferredDate: metadata.preferredDate || "",
    fullName: metadata.fullName || "",
    email: metadata.email || "",
    phone: metadata.phone || "",
    guests: metadata.guests || "",
    specialRequest,
  });
}

async function notifyBalancePaid(siteUrl, record) {
  const summary = `BALANCE PAID: ${record.tourName || ""} · ${record.fullName || ""} · ${record.preferredDate || ""}`;
  await relayToNetlifyForms(siteUrl, "booking-notification", {
    summary,
    tourName: record.tourName || "",
    preferredDate: record.preferredDate || "",
    fullName: record.fullName || "",
    email: record.email || "",
    phone: record.phone || "",
    guests: String(record.guests || ""),
    specialRequest: `Remaining balance of $${record.balanceCad} CAD received.`,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 500, body: "Stripe webhook is not configured on this site yet." };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = event.headers["stripe-signature"];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    const crypto = require("crypto");
    const rawBodyBase64 = Buffer.from(rawBody).toString("base64");
    const rawBodySha256 = crypto.createHash("sha256").update(rawBody).digest("hex");
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err.message,
        isBase64Encoded: event.isBase64Encoded,
        bodyLength: (event.body || "").length,
        sigHeader: signature,
        rawBodySha256,
        rawBodyBase64,
        secretLength: (process.env.STRIPE_WEBHOOK_SECRET || "").length,
        secretFirst10: (process.env.STRIPE_WEBHOOK_SECRET || "").slice(0, 10),
        secretLast6: (process.env.STRIPE_WEBHOOK_SECRET || "").slice(-6),
        secretSha256: crypto.createHash("sha256").update(process.env.STRIPE_WEBHOOK_SECRET || "").digest("hex"),
      }),
    };
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: "Ignored (not a completed checkout)." };
  }

  const session = stripeEvent.data.object;
  const metadata = session.metadata || {};
  const siteUrl = process.env.URL || "https://heroesandheritagetours.ca";

  // A balance payment (created by create-balance-checkout-session.js)
  // carries balanceRef pointing back to the original deposit session's
  // ID, rather than a fresh tourSlug/preferredDateISO/guests booking.
  if (metadata.balanceRef) {
    try {
      const store = balanceStore();
      const record = await markBalancePaid(store, metadata.balanceRef, session.id);
      if (record) await notifyBalancePaid(siteUrl, record);
      return { statusCode: 200, body: "OK (balance payment recorded)" };
    } catch (err) {
      console.error("stripe-webhook balance-payment processing error:", err);
      return { statusCode: 200, body: "Logged error, not retried." };
    }
  }

  const { tourSlug, preferredDateISO, guests } = metadata;
  if (!tourSlug || !preferredDateISO || !guests) {
    console.error("checkout.session.completed missing required metadata:", metadata);
    return { statusCode: 200, body: "Ignored (missing booking metadata)." };
  }

  try {
    const store = bookingsStore();
    await addBooking(store, tourSlug, preferredDateISO, {
      guests: parseInt(guests, 10) || 0,
      fullName: metadata.fullName || "",
      email: metadata.email || "",
      sessionId: session.id,
      bookedAt: new Date().toISOString(),
    });

    // A deposit booking (not full payment) leaves a balance due 21 days
    // before the tour — track it so the reminder emails know about it.
    if (metadata.fullPaymentRequired !== "true") {
      const subtotalCad = parseInt(metadata.subtotalCad, 10) || 0;
      const depositCad = parseInt(metadata.depositCad, 10) || 0;
      const bStore = balanceStore();
      await createBalanceRecord(bStore, session.id, {
        tourSlug,
        tourName: metadata.tourName || "",
        preferredDate: metadata.preferredDate || "",
        preferredDateISO,
        guests: parseInt(guests, 10) || 0,
        fullName: metadata.fullName || "",
        email: metadata.email || "",
        phone: metadata.phone || "",
        subtotalCad,
        depositCad,
        balanceCad: Math.max(0, subtotalCad - depositCad),
      });
    }

    await notifyBooking(siteUrl, metadata);

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("stripe-webhook processing error:", err);
    // Return 200 anyway: Stripe retries on non-2xx, and retried delivery
    // would double-count this booking against capacity since it isn't
    // idempotent per session ID yet. A logged failure here is safer to
    // investigate manually than a silent double-booking.
    return { statusCode: 200, body: "Logged error, not retried." };
  }
};
