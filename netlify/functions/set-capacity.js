const tours = require("../../src/_data/tours.js");
const { bookingsStore, setManualBlock } = require("./lib/bookings");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: "Please log in to change capacity." };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid request body." };
  }

  const { tourSlug, dateISO, manualBlock } = data;
  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateISO || "");
  const tour = tours.find((t) => t.slug === tourSlug);
  const blockValue = parseInt(manualBlock, 10);

  if (!tour || !isIsoDate || isNaN(blockValue) || blockValue < 0) {
    return { statusCode: 400, body: "Invalid tourSlug, dateISO, or manualBlock." };
  }

  try {
    const store = bookingsStore();
    const record = await setManualBlock(store, tourSlug, dateISO, blockValue);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    };
  } catch (err) {
    console.error("set-capacity error:", err);
    return { statusCode: 500, body: "Could not update capacity." };
  }
};
