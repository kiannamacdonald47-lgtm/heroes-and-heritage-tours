const Stripe = require("stripe");
const { balanceStore, getBalanceRecord } = require("./lib/bookings");

// A plain-language error page rather than a raw error string, since
// this is reached by a customer clicking a link in an email, not by
// the site's own JS handling a fetch() response.
function errorPage(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `<!doctype html><html><head><meta charset="utf-8"><title>Heroes and Heritage Tours</title></head>
      <body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #211C15;">
        <p>${message}</p>
        <p><a href="https://heroesandheritagetours.ca/contact.html">Contact us</a> if you need help.</p>
      </body></html>`,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return errorPage("Payments are not configured on this site yet.");
  }

  const ref = event.queryStringParameters && event.queryStringParameters.ref;
  if (!ref) {
    return errorPage("This payment link is missing its reference and can't be used.");
  }

  const store = balanceStore();
  const record = await getBalanceRecord(store, ref);
  if (!record) {
    return errorPage("We couldn't find this booking. The link may have expired or been mistyped.");
  }
  if (record.balancePaid) {
    return {
      statusCode: 302,
      headers: { Location: "https://heroesandheritagetours.ca/booking-confirmed.html?balance=already-paid" },
    };
  }
  if (!record.balanceCad || record.balanceCad <= 0) {
    return errorPage("There's no outstanding balance on this booking.");
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.URL || "https://heroesandheritagetours.ca";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: record.email,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: record.balanceCad * 100,
            product_data: {
              name: `${record.tourName}: remaining balance`,
              description: `${record.guests} guest${record.guests > 1 ? "s" : ""} · ${record.preferredDate}`,
            },
          },
        },
      ],
      metadata: { balanceRef: ref },
      payment_intent_data: {
        description: `${record.tourName} · balance · ${record.guests} guest${record.guests > 1 ? "s" : ""} · ${record.preferredDate}`,
        metadata: {
          balanceRef: ref,
          tourName: record.tourName,
          fullName: record.fullName,
          email: record.email,
          phone: record.phone || "",
        },
      },
      success_url: `${siteUrl}/booking-confirmed.html?balance=paid`,
      cancel_url: `${siteUrl}/booking-confirmed.html?balance=canceled`,
    });

    return { statusCode: 302, headers: { Location: session.url } };
  } catch (err) {
    console.error("create-balance-checkout-session error:", err);
    return errorPage("We couldn't start checkout for your balance payment just now. Please try again shortly or contact us directly.");
  }
};
