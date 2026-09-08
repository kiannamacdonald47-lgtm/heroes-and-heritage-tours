// One-off cleanup for the test bookings created while verifying the
// balance-reminder system. Delete this file after running once.
const { bookingsStore, balanceStore, bookingKey } = require("./lib/bookings");

exports.handler = async () => {
  const bStore = bookingsStore();
  const balStore = balanceStore();

  const bookingKeys = [bookingKey("vimy-to-victory", "2026-10-06"), bookingKey("vimy-to-victory", "2026-10-02")];
  const deleted = { bookings: [], balances: [] };

  for (const key of bookingKeys) {
    await bStore.delete(key);
    deleted.bookings.push(key);
  }

  const { blobs } = await balStore.list();
  for (const { key } of blobs) {
    if (key.startsWith("cs_test_simulated_")) {
      await balStore.delete(key);
      deleted.balances.push(key);
    }
  }

  return { statusCode: 200, body: JSON.stringify(deleted) };
};
