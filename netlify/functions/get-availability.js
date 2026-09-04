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
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasSiteId: !!process.env.NETLIFY_SITE_ID,
        siteIdLength: (process.env.NETLIFY_SITE_ID || "").length,
        hasBlobsToken: !!process.env.NETLIFY_BLOBS_TOKEN,
        blobsTokenLength: (process.env.NETLIFY_BLOBS_TOKEN || "").length,
        hasBlobsContext: !!process.env.NETLIFY_BLOBS_CONTEXT,
      }),
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
