const { getStore } = require("@netlify/blobs");

const CAPACITY_PER_DATE = 8;

// Netlify's automatic Blobs environment injection (NETLIFY_BLOBS_CONTEXT)
// isn't reaching this site's functions for reasons unrelated to bundler
// choice, so credentials are supplied explicitly instead of relying on
// getStore("bookings") to auto-detect them. SITE_ID is provided
// automatically by Netlify's function runtime (note: not NETLIFY_SITE_ID,
// which isn't present here); NETLIFY_JOE_TOKEN is a manually-created
// Personal Access Token set as a site environment variable.
function bookingsStore() {
  if (process.env.SITE_ID && process.env.NETLIFY_JOE_TOKEN) {
    return getStore({
      name: "bookings",
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_JOE_TOKEN,
    });
  }
  return getStore("bookings");
}

function bookingKey(tourSlug, dateISO) {
  return `${tourSlug}__${dateISO}`;
}

async function getRecord(store, tourSlug, dateISO) {
  return (await store.get(bookingKey(tourSlug, dateISO), { type: "json" })) || { totalGuests: 0, bookings: [], manualBlock: 0 };
}

// Booked count plus any manual block an admin has set for this date
// (e.g. reserving spots for a private group, or closing the date
// entirely by setting manualBlock to the full capacity).
async function getBookedCount(store, tourSlug, dateISO) {
  const record = await getRecord(store, tourSlug, dateISO);
  return (record.totalGuests || 0) + (record.manualBlock || 0);
}

// Adds a confirmed booking to the store for a tour+date, returning the
// updated record. Skips silently if this Stripe session was already
// recorded, since Stripe retries webhook delivery on any non-2xx (or
// timed-out) response and this must not double-count capacity.
// Not concurrency-safe against truly simultaneous deliveries for the
// same date, but Stripe webhook volume for a small tour operator makes
// that an acceptable risk versus the complexity of distributed locking.
async function addBooking(store, tourSlug, dateISO, entry) {
  const key = bookingKey(tourSlug, dateISO);
  const existing = await getRecord(store, tourSlug, dateISO);
  if (existing.bookings.some((b) => b.sessionId === entry.sessionId)) {
    return existing;
  }
  existing.totalGuests += entry.guests;
  existing.bookings.push(entry);
  await store.setJSON(key, existing);
  return existing;
}

// Sets (not adds to) the manual block for a tour+date — an admin
// reserving/closing capacity independent of paid bookings. Pass 0 to
// clear a previously set block.
async function setManualBlock(store, tourSlug, dateISO, manualBlock) {
  const key = bookingKey(tourSlug, dateISO);
  const existing = await getRecord(store, tourSlug, dateISO);
  existing.manualBlock = Math.max(0, manualBlock);
  await store.setJSON(key, existing);
  return existing;
}

module.exports = { CAPACITY_PER_DATE, bookingsStore, bookingKey, getRecord, getBookedCount, addBooking, setManualBlock };
