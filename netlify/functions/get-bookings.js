const { CAPACITY_PER_DATE, bookingsStore } = require("./lib/bookings");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: "Please log in to view bookings." };
  }

  try {
    const store = bookingsStore();
    const { blobs } = await store.list();

    const entries = [];
    for (const { key } of blobs) {
      const separatorIndex = key.lastIndexOf("__");
      const tourSlug = key.slice(0, separatorIndex);
      const date = key.slice(separatorIndex + 2);
      const record = await store.get(key, { type: "json" });
      if (!record) continue;
      entries.push({
        tourSlug,
        date,
        totalGuests: record.totalGuests || 0,
        manualBlock: record.manualBlock || 0,
        remaining: Math.max(0, CAPACITY_PER_DATE - (record.totalGuests || 0) - (record.manualBlock || 0)),
        bookings: record.bookings || [],
      });
    }

    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ capacity: CAPACITY_PER_DATE, entries }),
    };
  } catch (err) {
    console.error("get-bookings error:", err);
    return { statusCode: 500, body: "Could not load bookings." };
  }
};
