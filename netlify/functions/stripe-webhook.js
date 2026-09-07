const Stripe = require("stripe");
const { bookingsStore, addBooking } = require("./lib/bookings");

const encodeForm = (data) =>
  Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join("&");

// Relays a confirmed booking into Netlify Forms so it reaches the same
// inbox as the contact form, without needing a separate email service.
async function notifyBooking(siteUrl, metadata) {
  const specialRequest = [metadata.familyResearch, metadata.notes].filter(Boolean).join(" | ") || "None";
  const guestWord = metadata.guests === "1" ? "guest" : "guests";
  const summary = `${metadata.tourName || ""} · ${metadata.guests || "0"} ${guestWord} · ${metadata.preferredDate || ""}`;
  const body = encodeForm({
    "form-name": "booking-notification",
    summary,
    tourName: metadata.tourName || "",
    preferredDate: metadata.preferredDate || "",
    fullName: metadata.fullName || "",
    email: metadata.email || "",
    phone: metadata.phone || "",
    guests: metadata.guests || "",
    specialRequest,
  });

  const res = await fetch(siteUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("booking-notification form submission failed:", res.status, await res.text());
  }
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
    return { statusCode: 400, body: `Webhook signature verification failed.` };
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: "Ignored (not a completed checkout)." };
  }

  const session = stripeEvent.data.object;
  const metadata = session.metadata || {};
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

    const siteUrl = process.env.URL || "https://heroesandheritagetours.ca";
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
