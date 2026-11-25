const { bookingsStore, isClosed } = require("./lib/bookings");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const tourSlug = event.queryStringParameters && event.queryStringParameters.tourSlug;
  if (!tourSlug) {
    return { statusCode: 400, body: "Missing tourSlug." };
  }

  try {
    const store = bookingsStore();
    const { blobs } = await store.list({ prefix: `${tourSlug}__` });

    const closed = [];
    for (const { key } of blobs) {
      const record = await store.get(key, { type: "json" });
      if (isClosed(record)) closed.push(key.slice(tourSlug.length + 2));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ closed }),
    };
  } catch (err) {
    console.error("get-availability error:", err);
    return { statusCode: 500, body: "Could not load availability." };
  }
};
