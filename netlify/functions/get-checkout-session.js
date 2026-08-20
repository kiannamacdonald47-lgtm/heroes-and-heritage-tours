const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, body: "Stripe is not configured on this site yet." };
  }

  const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
  if (!sessionId) {
    return { statusCode: 400, body: "Missing session_id." };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentStatus: session.payment_status,
        tourName: session.metadata.tourName,
        guests: session.metadata.guests,
        preferredDate: session.metadata.preferredDate,
        depositCad: session.metadata.depositCad,
        fullPaymentRequired: session.metadata.fullPaymentRequired === "true",
        fullName: session.metadata.fullName,
      }),
    };
  } catch (err) {
    console.error("Stripe session retrieval error:", err);
    return { statusCode: 404, body: "Booking session not found." };
  }
};
