// Temporary manual-trigger wrapper for testing send-balance-reminders.js,
// which is locked against direct HTTP invocation as a scheduled
// function. Delete this file once testing is done.
const scheduled = require("./send-balance-reminders");

exports.handler = scheduled.handler;
