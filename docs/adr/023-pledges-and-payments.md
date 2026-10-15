# 023 — Pledges and payments (Phase 6)

Status: accepted. The aggregator (§15.4) is **not chosen**; everything runs on a fake behind the interface.

## Decisions

- **`PaymentProvider` interface** (`packages/payments`): `startCollection` (push request to the guest's phone), `verifyWebhook(rawBody, headers)` and `parseWebhook`. Only `FakePaymentProvider` exists. `PAYMENT_PROVIDER` accepts `fake` and the API refuses any other value; payments are off unless `PAYMENT_WEBHOOK_SECRET` is set. When an aggregator (Selcom, AzamPay, ClickPesa) is chosen, add one adapter with its own signature check and request format; nothing else changes.
- **Money rules.** Integer TZS. A pledge's status is derived from successful payments (`pledged` → `partial` → `paid`); `waived` is the committee's explicit choice and owes nothing. A balance never goes negative. Only `success` payments count; pending, failed and expired requests are never money. When the aggregator reports an amount, that amount is recorded, not what the guest typed (the difference is kept in `raw.amountMismatch`).
- **Webhook idempotency.** The signature is checked on the raw body first. Applying a webhook is one atomic `UPDATE … WHERE status = 'pending'`, so only the call that finds the payment pending can settle it; replays (including five at once) change nothing and only bump a duplicate counter. A "success" after a "failed" never becomes money.
- **Pay from the card.** `POST /v1/c/:token/pay` (the card token is the credential, rate-limited) needs an `Idempotency-Key`; our reference (`HP` + 10 characters) is derived from it, so a retry returns the same payment and never asks the phone twice. `GET /v1/payments/:reference/status` is what the waiting screen polls; an unconfirmed request reads as `expired` after 60 seconds.
- **Who sees money.** Owner and committee only. Gate agents get 403 on pledges, payments and exports, the event stats omit money for them, and their guest detail carries no pledge.
- **Manual payments** (cash, bank, or a transfer the committee confirmed) are written as `success` straight away with the recorder's id and an audit row; a reused receipt reference is a 409.
- **CSV exports** are quoted, start with a byte-order mark so Excel shows Swahili names correctly, and neutralise cells that begin with `= + - @` or a control character (formula injection).

## Not built

- A real aggregator adapter and its sandbox run (needs the choice and credentials).
- The policy toggle "require minimum pledge before the card is issued" (§7.5). It stays off, which is the specified default.
- A PDF export (CSV only), and sending pledge reminders (`sendPledgeReminders`) from the console.
- The web card's pay screen was not re-run against the real API in a browser; its repository calls are covered by an end-to-end test.
