const { Resend } = require("resend");
const { balanceStore, listBalanceRecords, markReminderSent } = require("./lib/bookings");

// Balance is due 21 days before the tour. Reminder 1 fires a week
// before that deadline (28 days out); reminder 2 (a follow-up, only if
// still unpaid) fires 3 days before the deadline (24 days out).
const BALANCE_DUE_DAYS_BEFORE_TOUR = 21;
const REMINDER_1_WINDOW_DAYS = 28;
const REMINDER_2_WINDOW_DAYS = 24;
const BUSINESS_EMAIL = "Bookings@heroesandheritagetours.ca";
const FROM_ADDRESS = "Heroes and Heritage Tours <bookings@heroesandheritagetours.ca>";

function daysUntil(dateISO) {
  const target = new Date(`${dateISO}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function dueDateDisplay(tourDateISO) {
  const due = new Date(`${tourDateISO}T00:00:00`);
  due.setDate(due.getDate() - BALANCE_DUE_DAYS_BEFORE_TOUR);
  return due.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function payLink(sessionId) {
  const siteUrl = process.env.URL || "https://heroesandheritagetours.ca";
  return `${siteUrl}/.netlify/functions/create-balance-checkout-session?ref=${encodeURIComponent(sessionId)}`;
}

function emailHtml({ heading, intro, record, payUrl, due }) {
  return `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #211C15; line-height: 1.6;">
    <h1 style="font-size: 20px; color: #8A1C24; margin-bottom: 16px;">${heading}</h1>
    <p>Hi ${record.fullName},</p>
    <p>${intro}</p>
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr><td style="padding: 6px 0; color: #56503F;">Tour</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${record.tourName}</td></tr>
      <tr><td style="padding: 6px 0; color: #56503F;">Date</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${record.preferredDate}</td></tr>
      <tr><td style="padding: 6px 0; color: #56503F;">Guests</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${record.guests}</td></tr>
      <tr><td style="padding: 6px 0; color: #56503F;">Balance due</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">$${record.balanceCad} CAD</td></tr>
      <tr><td style="padding: 6px 0; color: #56503F;">Due date</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${due}</td></tr>
    </table>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${payUrl}" style="background: #8A1C24; color: #F4EEE1; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: bold; display: inline-block;">Pay Your Balance Now</a>
    </p>
    <p>If you've already arranged payment another way, please disregard this email. If you have any questions, just reply to this email.</p>
    <p>Thank you,<br>Heroes and Heritage Tours</p>
  </div>`;
}

async function sendReminder(resend, record, which) {
  const due = dueDateDisplay(record.preferredDateISO);
  const payUrl = payLink(record.sessionId);
  const heading = which === 1 ? "Your balance payment is due soon" : "Reminder: your balance payment is still due";
  const intro = which === 1
    ? `Just a friendly reminder that the remaining balance for your upcoming tour is due on ${due}.`
    : `This is a follow-up: your balance is due on ${due}, and we haven't received it yet. Please arrange payment as soon as you can so your booking stays confirmed.`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: record.email,
    cc: BUSINESS_EMAIL,
    subject: which === 1 ? `Balance payment due soon: ${record.tourName}` : `Follow-up: balance payment due for ${record.tourName}`,
    html: emailHtml({ heading, intro, record, payUrl, due }),
  });
}

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error("send-balance-reminders: RESEND_API_KEY is not configured.");
    return { statusCode: 200, body: "Resend not configured, skipping." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const store = balanceStore();
  const records = await listBalanceRecords(store);

  let sent1 = 0;
  let sent2 = 0;
  let errors = 0;

  for (const record of records) {
    if (record.balancePaid) continue;

    const days = daysUntil(record.preferredDateISO);
    if (days < 0) continue; // tour already happened; not this function's problem

    try {
      if (!record.reminder2SentAt && days <= REMINDER_2_WINDOW_DAYS) {
        await sendReminder(resend, record, 2);
        await markReminderSent(store, record.sessionId, 2);
        if (!record.reminder1SentAt) await markReminderSent(store, record.sessionId, 1);
        sent2 += 1;
      } else if (!record.reminder1SentAt && days <= REMINDER_1_WINDOW_DAYS) {
        await sendReminder(resend, record, 1);
        await markReminderSent(store, record.sessionId, 1);
        sent1 += 1;
      }
    } catch (err) {
      console.error(`send-balance-reminders: failed for session ${record.sessionId}:`, err);
      errors += 1;
    }
  }

  const summary = `Checked ${records.length} balance record(s). Sent ${sent1} first reminder(s), ${sent2} follow-up(s). ${errors} error(s).`;
  console.log(summary);
  return { statusCode: 200, body: summary };
};
