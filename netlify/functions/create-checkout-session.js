const Stripe = require("stripe");
const tours = require("../../src/_data/tours.json");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, body: "Stripe is not configured on this site yet." };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid request body." };
  }

  const tour = tours.find((t) => t.slug === data.tourSlug);
  if (!tour || tour.bookingMethod === "email") {
    return { statusCode: 400, body: "This tour isn't available for online booking." };
  }

  const guests = Math.max(1, Math.min(8, parseInt(data.guests, 10) || 1));
  const fullName = (data.fullName || "").trim();
  const email = (data.email || "").trim();
  if (!fullName || !email || !data.preferredDate) {
    return { statusCode: 400, body: "Missing required booking details." };
  }

  const subtotal = tour.price * guests;

  // Tours departing within 21 days must be paid in full — there's no
  // time left to collect a balance payment before departure.
  let fullPaymentRequired = false;
  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(data.preferredDateISO || "");
  const parsedDate = isIsoDate ? new Date(`${data.preferredDateISO}T00:00:00`) : new Date(data.preferredDate);
  if (!isNaN(parsedDate)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilTour = Math.round((parsedDate - today) / 86400000);
    fullPaymentRequired = daysUntilTour < 21;
  }
  const deposit = fullPaymentRequired ? subtotal : Math.round(subtotal * 0.3);

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.URL || "https://heroesandheritagetours.ca";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: deposit * 100,
            product_data: {
              name: `${tour.name}: ${fullPaymentRequired ? "full payment" : "30% deposit"}`,
              description: `${guests} guest${guests > 1 ? "s" : ""} · Preferred date: ${data.preferredDate}`,
            },
          },
        },
      ],
      metadata: {
        tourSlug: tour.slug,
        tourName: tour.name,
        guests: String(guests),
        preferredDate: data.preferredDate,
        fullName,
        phone: data.phone || "",
        age: data.age || "",
        country: data.country || "",
        familyResearch: (data.familyResearch || "").slice(0, 400),
        notes: (data.notes || "").slice(0, 400),
        subtotalCad: String(subtotal),
        depositCad: String(deposit),
        fullPaymentRequired: String(fullPaymentRequired),
      },
      success_url: `${siteUrl}/booking-confirmed.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/booking.html?canceled=true&tour=${encodeURIComponent(tour.slug)}`,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe Checkout Session error:", err);
    return { statusCode: 502, body: "Could not start checkout. Please try again or contact us directly." };
  }
};
