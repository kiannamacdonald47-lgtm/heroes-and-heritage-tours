const { Resend } = require("resend");
const { tourReminderStore, listTourReminderRecords, markTourReminderSent } = require("./lib/bookings");

// Reminders fire 5 days out, then a final reminder 1 day out. Uses <=
// window comparisons (not exact matches) so a missed daily run never
// silently skips a guest — same pattern as send-balance-reminders.js.
const REMINDER_5DAY_WINDOW_DAYS = 5;
const REMINDER_1DAY_WINDOW_DAYS = 1;
const BUSINESS_EMAIL = "Bookings@heroesandheritagetours.ca";
const FROM_ADDRESS = "Heroes and Heritage Tours <bookings@heroesandheritagetours.ca>";

// These are the only tours with an Arras/Paris departure choice — every
// other tour gets the generic fallback instructions below.
const WESTERN_FRONT_DAY_TOUR_SLUGS = ["vimy-to-victory", "in-flanders-fields", "somme-front"];

function daysUntil(dateISO) {
  const target = new Date(`${dateISO}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function meetingInstructions(record) {
  const isWesternFrontDayTour = WESTERN_FRONT_DAY_TOUR_SLUGS.includes(record.tourSlug);
  if (isWesternFrontDayTour && record.departureCity === "Paris") {
    return "Please arrive at Paris Gare du Nord for the morning TGV train to Arras. Once you arrive at Arras, proceed to the main entrance of the train station, where your battlefield guide will meet you.";
  }
  if (isWesternFrontDayTour) {
    return "Pick up is in front of the Arras train station at 9:00 A.M.";
  }
  return "Please see your booking confirmation email for meeting details, or get in touch if you have any questions.";
}

function emailHtml({ heading, intro, record }) {
  return `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #211C15; line-height: 1.6;">
    <h1 style="font-size: 20px; color: #8A1C24; margin-bottom: 16px;">${heading}</h1>
    <p>Hi ${record.fullName},</p>
    <p>${intro}</p>
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr><td style="padding: 6px 0; color: #56503F;">Tour</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${record.tourName}</td></tr>
      <tr><td style="padding: 6px 0; color: #56503F;">Date</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${record.preferredDate}</td></tr>
      <tr><td style="padding: 6px 0; color: #56503F;">Guests</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${record.guests}</td></tr>
    </table>
    <p style="background: #F4EEE1; border-left: 3px solid #8A1C24; padding: 14px 18px; font-weight: 600;">${meetingInstructions(record)}</p>
    <p>If you have any questions, just reply to this email.</p>
    <p>Thank you,<br>Heroes and Heritage Tours</p>
  </div>`;
}

async function sendReminder(resend, record, which) {
  const heading = which === 5 ? "Your tour is coming up" : "Your tour is tomorrow";
  const intro = which === 5
    ? `Just a friendly reminder that your tour is coming up on ${record.preferredDate}.`
    : `Your tour is tomorrow, ${record.preferredDate}. We're looking forward to seeing you.`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: record.email,
    cc: BUSINESS_EMAIL,
    subject: which === 5 ? `Your tour is coming up: ${record.tourName}` : `Your tour is tomorrow: ${record.tourName}`,
    html: emailHtml({ heading, intro, record }),
  });
}

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error("send-tour-reminders: RESEND_API_KEY is not configured.");
    return { statusCode: 200, body: "Resend not configured, skipping." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const store = tourReminderStore();
  const records = await listTourReminderRecords(store);

  let sent5d = 0;
  let sent1d = 0;
  let errors = 0;

  for (const record of records) {
    const days = daysUntil(record.preferredDateISO);
    if (days < 0) continue; // tour already happened; not this function's problem

    try {
      if (!record.reminder1dSentAt && days <= REMINDER_1DAY_WINDOW_DAYS) {
        await sendReminder(resend, record, 1);
        await markTourReminderSent(store, record.sessionId, 1);
        if (!record.reminder5dSentAt) await markTourReminderSent(store, record.sessionId, 5);
        sent1d += 1;
      } else if (!record.reminder5dSentAt && days <= REMINDER_5DAY_WINDOW_DAYS) {
        await sendReminder(resend, record, 5);
        await markTourReminderSent(store, record.sessionId, 5);
        sent5d += 1;
      }
    } catch (err) {
      console.error(`send-tour-reminders: failed for session ${record.sessionId}:`, err);
      errors += 1;
    }
  }

  const summary = `Checked ${records.length} tour-reminder record(s). Sent ${sent5d} 5-day reminder(s), ${sent1d} 1-day reminder(s). ${errors} error(s).`;
  console.log(summary);
  return { statusCode: 200, body: summary };
};
