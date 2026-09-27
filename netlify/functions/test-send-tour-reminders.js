// Temporary manual-trigger wrapper for verifying send-tour-reminders.js —
// scheduled functions reject direct HTTP invocation, so this exists only
// to test the same handler on demand. Delete after verification.
exports.handler = require("./send-tour-reminders").handler;
