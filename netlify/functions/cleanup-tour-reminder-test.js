// Temporary one-off cleanup for the send-tour-reminders verification
// test — removes the 3 simulated bookings from every store the webhook
// wrote to (capacity/bookings, balance-tracking, tour-reminders), not
// just tour-reminders, since addBooking() and createBalanceRecord() are
// unconditional. Delete this file after running once.
const { bookingsStore, balanceStore, tourReminderStore } = require("./lib/bookings");

const TEST_SESSION_PREFIX = "cs_test_simulated_tourreminder_";
const TEST_BOOKINGS = [
  { key: "in-flanders-fields__2026-10-02", guests: 1 },
  { key: "vimy-to-victory__2026-09-28", guests: 1 },
  { key: "dieppe-raid__2026-10-02", guests: 1 },
];

exports.handler = async () => {
  const results = [];

  // 1. Capacity/bookings store: remove just the test session's entry
  // from each date's bookings array (not the whole record), in case a
  // real booking ever shares the same tour+date.
  const bStore = bookingsStore();
  for (const { key } of TEST_BOOKINGS) {
    const record = await bStore.get(key, { type: "json" });
    if (!record) { results.push(`bookings/${key}: no record`); continue; }
    const before = record.bookings.length;
    record.bookings = record.bookings.filter((b) => !b.sessionId.startsWith(TEST_SESSION_PREFIX));
    const removed = before - record.bookings.length;
    record.totalGuests = record.bookings.reduce((sum, b) => sum + (b.guests || 0), 0);
    if (record.bookings.length === 0 && !record.manualBlock) {
      await bStore.delete(key);
      results.push(`bookings/${key}: removed ${removed} test booking(s), record now empty, deleted`);
    } else {
      await bStore.setJSON(key, record);
      results.push(`bookings/${key}: removed ${removed} test booking(s), ${record.bookings.length} real booking(s) preserved`);
    }
  }

  // 2. Balance-tracking store: delete by session ID (unique, safe).
  const balStore = balanceStore();
  const { blobs: balBlobs } = await balStore.list({ prefix: TEST_SESSION_PREFIX });
  for (const { key } of balBlobs) {
    await balStore.delete(key);
    results.push(`balance-tracking/${key}: deleted`);
  }

  // 3. Tour-reminders store: delete by session ID.
  const trStore = tourReminderStore();
  const { blobs: trBlobs } = await trStore.list({ prefix: TEST_SESSION_PREFIX });
  for (const { key } of trBlobs) {
    await trStore.delete(key);
    results.push(`tour-reminders/${key}: deleted`);
  }

  const summary = results.join("\n");
  console.log(summary);
  return { statusCode: 200, body: summary };
};
