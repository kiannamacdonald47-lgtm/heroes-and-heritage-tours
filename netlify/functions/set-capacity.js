const tours = require("../../src/_data/tours.js");
const { bookingsStore, setDateClosed } = require("./lib/bookings");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: "Please log in to change availability." };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid request body." };
  }

  const { tourSlug, dateISO, closed } = data;
  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateISO || "");
  const tour = tours.find((t) => t.slug === tourSlug);

  if (!tour || !isIsoDate || typeof closed !== "boolean") {
    return { statusCode: 400, body: "Invalid tourSlug, dateISO, or closed." };
  }

  try {
    const store = bookingsStore();
    const record = await setDateClosed(store, tourSlug, dateISO, closed);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    };
  } catch (err) {
    console.error("set-capacity (close/reopen date) error:", err);
    return { statusCode: 500, body: "Could not update availability." };
  }
};
