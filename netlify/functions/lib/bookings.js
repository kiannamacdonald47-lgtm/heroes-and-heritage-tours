const { getStore } = require("@netlify/blobs");

// Tours have no guest limit; a date is only unavailable when an admin
// closes it. Records saved while there was an 8-guest limit closed a date
// by blocking spots up to that number, so those are still honoured.
const LEGACY_CAPACITY = 8;

function isClosed(record) {
  if (!record) return false;
  if (typeof record.closed === "boolean") return record.closed;
  const block = record.manualBlock || 0;
  return block > 0 && block + (record.totalGuests || 0) >= LEGACY_CAPACITY;
}

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

function balanceStore() {
  if (process.env.SITE_ID && process.env.NETLIFY_JOE_TOKEN) {
    return getStore({
      name: "balance-tracking",
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_JOE_TOKEN,
    });
  }
  return getStore("balance-tracking");
}

function bookingKey(tourSlug, dateISO) {
  return `${tourSlug}__${dateISO}`;
}

async function getRecord(store, tourSlug, dateISO) {
  return (await store.get(bookingKey(tourSlug, dateISO), { type: "json" })) || { totalGuests: 0, bookings: [] };
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
  // Fix the open/closed state before the count changes, so a new booking
  // can never flip a legacy partial block into a closed date.
  existing.closed = isClosed(existing);
  existing.totalGuests += entry.guests;
  existing.bookings.push(entry);
  await store.setJSON(key, existing);
  return existing;
}

// Closes or reopens a tour+date, independent of paid bookings.
async function setDateClosed(store, tourSlug, dateISO, closed) {
  const key = bookingKey(tourSlug, dateISO);
  const existing = await getRecord(store, tourSlug, dateISO);
  existing.closed = closed;
  delete existing.manualBlock;
  await store.setJSON(key, existing);
  return existing;
}

// ============================================================
// Balance-payment tracking — separate from the capacity store
// above (which is keyed by tourSlug+date and only cares about
// guest counts). This is keyed by the original deposit session's
// ID, one record per individual booking, and drives the balance
// reminder emails and the "pay your balance" link.
// ============================================================

async function createBalanceRecord(store, sessionId, data) {
  const record = {
    ...data,
    balancePaid: false,
    balanceSessionId: null,
    reminder1SentAt: null,
    reminder2SentAt: null,
    createdAt: new Date().toISOString(),
  };
  await store.setJSON(sessionId, record);
  return record;
}

async function getBalanceRecord(store, sessionId) {
  return store.get(sessionId, { type: "json" });
}

async function markBalancePaid(store, sessionId, balanceSessionId) {
  const record = await getBalanceRecord(store, sessionId);
  if (!record) return null;
  record.balancePaid = true;
  record.balanceSessionId = balanceSessionId;
  await store.setJSON(sessionId, record);
  return record;
}

async function markReminderSent(store, sessionId, which) {
  const record = await getBalanceRecord(store, sessionId);
  if (!record) return null;
  record[which === 1 ? "reminder1SentAt" : "reminder2SentAt"] = new Date().toISOString();
  await store.setJSON(sessionId, record);
  return record;
}

async function listBalanceRecords(store) {
  const { blobs } = await store.list();
  const records = [];
  for (const { key } of blobs) {
    const record = await store.get(key, { type: "json" });
    if (record) records.push({ sessionId: key, ...record });
  }
  return records;
}

// ============================================================
// Tour-start reminder tracking — a third, separate store from
// balance-tracking above. Balance records only get created for
// deposit bookings (see stripe-webhook.js), so a last-minute
// full-payment booking would otherwise never get a pre-tour
// reminder if this reused that store. Populated unconditionally
// for every completed booking, every payment type.
// ============================================================

function tourReminderStore() {
  if (process.env.SITE_ID && process.env.NETLIFY_JOE_TOKEN) {
    return getStore({
      name: "tour-reminders",
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_JOE_TOKEN,
    });
  }
  return getStore("tour-reminders");
}

async function createTourReminderRecord(store, sessionId, data) {
  const record = {
    ...data,
    reminder5dSentAt: null,
    reminder1dSentAt: null,
    createdAt: new Date().toISOString(),
  };
  await store.setJSON(sessionId, record);
  return record;
}

async function markTourReminderSent(store, sessionId, which) {
  const record = await store.get(sessionId, { type: "json" });
  if (!record) return null;
  record[which === 5 ? "reminder5dSentAt" : "reminder1dSentAt"] = new Date().toISOString();
  await store.setJSON(sessionId, record);
  return record;
}

async function listTourReminderRecords(store) {
  const { blobs } = await store.list();
  const records = [];
  for (const { key } of blobs) {
    const record = await store.get(key, { type: "json" });
    if (record) records.push({ sessionId: key, ...record });
  }
  return records;
}

module.exports = {
  isClosed,
  bookingsStore,
  balanceStore,
  bookingKey,
  getRecord,
  addBooking,
  setDateClosed,
  createBalanceRecord,
  getBalanceRecord,
  markBalancePaid,
  markReminderSent,
  listBalanceRecords,
  tourReminderStore,
  createTourReminderRecord,
  markTourReminderSent,
  listTourReminderRecords,
};
