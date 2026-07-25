# Booking platform comparison

Prepared as deliverable 2 of the "practical calendar booking system" request. The site
now has a real interactive calendar (deliverable 1, live on `/booking.html`) that shows
guests exactly which dates each tour runs, but bookings still route to your team by
email/contact for manual confirmation and payment. This doc compares the realistic
next-step platforms if/when you want guests to book and pay a deposit online without
your team touching each request.

All are third-party paid services — none of this requires rebuilding the site, but each
does require creating an account (and, for the paid ones, a subscription) directly with
the client.

## The short version

**Recommendation: FareHarbor**, if/when you're ready for online payment. It's built
specifically for small tour operators, has no monthly fee (commission-only), and its
recurring-schedule and deposit features match this business almost exactly. Checkfront
is the fallback if you'd rather pay a flat fee than a per-booking commission. Cal.com is
not a good fit — it's built for 1:1 meeting scheduling, not multi-guest paid tours.

## Comparison

| | **FareHarbor** | **Checkfront** | **Bokun** | **Cal.com** |
|---|---|---|---|---|
| **Built for** | Tours & activities | Tours & rentals | Tours & activities (owned by Tripadvisor) | Meeting scheduling |
| **Cost** | Free to start — ~6% commission per booking | From ~$50–100 USD/mo, tiered by booking volume | Free tier available; commission or subscription tiers | Free tier; paid from ~$15 USD/user/mo |
| **Recurring schedules (e.g. "every Tue/Fri/Sun")** | Yes — native recurring availability rules, exactly this pattern | Yes — recurring availability with day-of-week rules | Yes | Partial — built for weekly 1:1 slots, not multi-day tour patterns |
| **Per-person pricing & guest counts** | Yes, native | Yes, native | Yes, native | No — not designed for this |
| **Deposit / partial payment** | Yes, native (e.g. 30% now, balance later) | Yes, native | Yes, native | No |
| **Multi-day tours (2/3/5-day)** | Yes | Yes | Yes | Not really |
| **Collects guest demographics (age, country, etc.)** | Yes, via custom booking questions | Yes, via custom fields | Yes | Limited |
| **Embeds in an Eleventy/static site** | Yes — booking widget script embed, or "Powered by FareHarbor" hosted page | Yes — similar embed/hosted page model | Yes — embed or hosted page | Yes — simple embed, but wrong tool for this job |
| **Integration effort** | Low–medium: create tours/schedules in their dashboard, drop an embed script into `booking.njk`, done | Same shape as FareHarbor | Same shape as FareHarbor | Low, but doesn't solve the actual problem |

## Why FareHarbor specifically

- No monthly fee — you only pay when a booking actually happens, which matters for a
  seasonal, guide-led business like this one.
- Its "recurring departure" model maps almost exactly onto what's already in
  `tours.json` (`runDays`, price, group size cap of 8) — very little re-modelling of
  the tour data needed.
- Handles the 30%-deposit-now / balance-later structure that's already in your Terms &
  Conditions natively, instead of needing custom logic.
- Widely used by small/independent battlefield and heritage tour operators already, so
  there's good precedent for exactly this use case.

## What switching would actually involve

1. Create a FareHarbor account and set up each tour (name, price, recurring days, max 8
   guests) in their dashboard — this duplicates some of what's in `tours.json`, so the
   CMS-managed price/schedule fields would need to be updated in both places going
   forward, or the FareHarbor data treated as the source of truth for booking-specific
   fields.
2. FareHarbor gives you an embed snippet (a `<script>` + a `<div>`) or a hosted checkout
   URL.
3. On the site, `booking.html` would either embed that widget directly in place of the
   current custom form, or the "Book This Tour" buttons on each tour page would link out
   to FareHarbor's hosted checkout instead of `/booking.html`.
4. Deposits get collected by FareHarbor directly (Stripe under the hood); payouts land
   in your connected bank account on their schedule.

None of this is large, but it's a real integration step involving a live account and
real payments — worth doing once you're ready to actually take bookings online rather
than by email, not before.
