const { CAPACITY_PER_DATE, bookingsStore } = require("./lib/bookings");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const tourSlug = event.queryStringParameters && event.queryStringParameters.tourSlug;
  if (!tourSlug) {
    return { statusCode: 400, body: "Missing tourSlug." };
  }

  if (event.queryStringParameters && event.queryStringParameters.debugEnv) {
    const keys = Object.keys(process.env).filter((k) => /SITE|BLOB|NETLIFY|URL|DEPLOY|CONTEXT/i.test(k)).sort();
    return {
      statusCode: 200,
      body: JSON.stringify({ matchingKeys: keys }),
    };
  }

  try {
    const store = bookingsStore();
    const { blobs } = await store.list({ prefix: `${tourSlug}__` });

    const remaining = {};
    for (const { key } of blobs) {
      const date = key.slice(tourSlug.length + 2);
      const record = await store.get(key, { type: "json" });
      const booked = (record && record.totalGuests ? record.totalGuests : 0) + (record && record.manualBlock ? record.manualBlock : 0);
      remaining[date] = Math.max(0, CAPACITY_PER_DATE - booked);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ capacity: CAPACITY_PER_DATE, remaining }),
    };
  } catch (err) {
    console.error("get-availability error:", err);
    return { statusCode: 500, body: "Could not load availability. DEBUG: " + (err && err.stack ? err.stack : String(err)) };
  }
};
