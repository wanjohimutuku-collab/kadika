# ADR 055: SMS reminders only, a second product with its own console

Status: accepted. API, database, web console, staff panel and tests are built. The Android app does not
have the SMS console yet (see Consequences).

## Context

Some customers do not want invitation cards. They already printed cards, or the occasion is a committee
meeting, and they only want to buy SMS in bulk and remind their own people. The card console (guests,
RSVP, gate, contributions, card design) is the wrong screen for them, but they should be managed in the
same staff panel, with the same packs and prices (ADR 042).

## Decision

1. **A product per event.** `events.product` is `cards` (default, everything before this ADR) or `sms`.
   It is chosen when the account is created (`POST /v1/events` with `product: 'sms'`) and the owner
   cannot change it (`PATCH` drops the field). The first wizard step shows both products; the SMS one
   goes to `/app/events/new/sms` (name, sender, date, language).
2. **Different UI.** For an `sms` event the console shows its own navigation and screens:
   Muhtasari (SMS left, contacts, next and recent messages), **Wapokeaji** (`/sms/contacts`: add one,
   paste a list, search, pick, remove), **Tuma SMS** (`/sms/compose`: own text, part counter, phone
   preview, everyone / a group / picked contacts, now or later, cost in SMS before confirming),
   **Historia** (`/sms/history`: outcome per send, cancel a scheduled one, use a text again),
   **Vifurushi** (`/billing`: SMS left and the SMS packs only, no card bundles) and **Mipangilio**.
   Card routes redirect an SMS event to its overview, and `/sms/*` redirects a card event.
3. **Contacts are guests.** No new contact table: the event's guests, created with
   `inviteChannelPref: 'sms'`, `printCard: false`. Guests who opted out of reminders are skipped.
4. **Campaigns** (`sms_campaigns`): body, audience rule (`all` | `{ group }` | `{ guestIds }`), status
   `scheduled → running → done | cancelled`, counts. The audience is resolved when it runs (as ADR 030).
   `POST /v1/events/:id/sms/campaigns` (Idempotency-Key), `POST …/sms/preview`, `GET …/sms/campaigns`,
   `DELETE …/sms/campaigns/:cid`. Only `sms` events may use them (`409 not_sms_product`); card-only
   actions (invitations, scheduled card sends, card PDFs) refuse an `sms` event (`409 sms_only`). The
   T-14/7/1 card reminders skip `sms` events. Scheduled campaigns run on the same one-minute scheduler as
   scheduled sends; one more than a day late is marked `missed`, not sent.
5. **Billing: one credit per SMS part.** `message_log.segments` (default 1) records the parts each SMS
   took; usage is now the sum of parts, so a 2-part text to 100 people spends 200 reminder credits. A
   text may be at most 3 parts (`SMS_MAX_SEGMENTS`). With enforcement on, a send needing more credits than
   remain is refused up front with the ADR 042 `402 quota_exceeded`; failed SMS are refunded. SMS
   customers buy the existing credit packs; staff price them at `/ops/billing`.
6. **Staff panel.** `/ops/sms` (Wateja wa SMS) lists every SMS customer with contacts, SMS sent (all
   time and 30 days), credits left of total, last send and scheduled sends, with filters (running low,
   active) and **Add SMS** (an ADR 042 grant of messages, `plan` permission, reason required). The events
   table gains a Service column. `GET /v1/ops/sms-customers` is readable by every staff level; owner
   phones are masked.

## Consequences

- Message counting changed from rows to parts. Every older message has `segments = 1`, so existing
  usage numbers do not move.
- The mobile (Expo) app still shows card screens for an `sms` event; its API calls are refused with
  `409 sms_only`. Until the app gets the SMS screens, SMS customers use the web console.
- A campaign sends inside the request, like card sends; a very large list takes as long as the gateway
  does. Moving campaign sends to the BullMQ worker is the next step if lists grow past a few thousand.
- The free allowance (ADR 042) applies to SMS events too; their free cards are unused.
