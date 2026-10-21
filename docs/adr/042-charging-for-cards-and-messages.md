# ADR 042: Charging for cards, SMS and WhatsApp messages

Status: accepted. API, database, console, staff panel and tests are built. Prices are placeholders until
the business confirms them; enforcement is **off** by default.

## Context

Billing was a manual flag (ADR 012): staff marked an event `free` or `paid`, and nothing limited what an
event used. Every card, SMS and WhatsApp message costs the business money (ADR 007, 026). The business
wants to sell **bundles priced by the number of cards**, and let hosts **buy more SMS and WhatsApp
messages** when the bundle's run out (open decision 5 in CLAUDE.md §15).

## Decision

1. **Catalogue** (`pricing_settings`, one row, shape in `@harusi/schemas/billing`): an `enforced` switch,
   a free allowance every event gets, card bundles (`cards`, included `sms` and `whatsapp`, price in TZS
   and KES) and message packs (one channel, a number of messages, price). No row = `DEFAULT_PRICING`.
   Edited at `/ops/billing` by billing and admin staff (`plan` permission); every staff level can read it.
   Saving is audited (`ops.pricing`).
2. **Orders** (`event_purchases`): the owner orders a bundle or pack from the event's **Kifurushi** page
   (`/app/e/:id/billing`). The cards, messages and price are copied onto the row, so a later price change
   never alters an order. Only `paid` rows count.
   - **Pay by phone**: a mobile-money prompt through the same gateway as ADR 036 (`paymentsFor`), our
     reference `HB…` (pledge payments use `HP…`). The payment webhook asks billing first and falls back to
     pledges, so one gateway URL serves both; a reference is applied at most once (replays are reported
     as duplicates). Credit follows what the gateway says it took: a short amount leaves the order
     pending for staff. Orders still pending after the prompt window are reconciled on the worker tick.
   - **Bank or cash**: the order stays pending with its reference; staff confirm it with a note
     (`ops.purchase_paid`). Staff can also **grant** free credit with a reason (`ops.grant`), e.g. for an
     event already billed by hand before this ADR.
   - A paid bundle also sets `events.plan = 'paid'`, so the existing dashboards keep working.
3. **Allowance and usage**: allowance = free allowance + every paid order. Usage = cards on the guest
   list (not deleted) and messages per channel in `message_log` that did not fail. A failed message is not
   charged. SMS are counted per message, not per segment: our templates are written to fit one segment
   (§7.2); revisit if long texts become common.
4. **Enforcement** (only with `enforced` on): adding a guest or importing a list past the card allowance,
   and a send that needs more messages on its first-choice channel than remain, are refused with HTTP
   **402 `payment_required`** and `details: { reason: 'quota_exceeded', resource, remaining, needed }`.
   An import is refused whole, never half-saved. During a run each message takes one credit from a
   per-run budget (refunded on failure); a guest whose WhatsApp credit is gone falls back to SMS, and
   with neither the attempt is recorded as `quota_exceeded`. Scheduled sends and automatic reminders use
   the same budget. The console turns a 402 into a toast with a **Nunua zaidi** link to the billing page.
5. OTP and staff messages are the business's own cost and are never counted.

## Consequences

- Turning enforcement on affects every event at once; events that already used more than their allowance
  see 0 left and need a bundle or a staff grant. Staff should grant existing paid events before switching.
- Two sends running at the same moment can each see the same remaining credit and together exceed it by
  up to one send's size. Acceptable for v1; a row lock on the event would close it.
- The mobile app has no buying screen yet: owners buy from the web console, and the app shows the 402
  message. Follow-up.
- Prices in `DEFAULT_PRICING` are assumptions (messages priced above the TZS 25 / KES 1 SMS segment cost)
  and must be confirmed before enforcement is switched on.
