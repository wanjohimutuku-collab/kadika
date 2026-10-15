# ADR 027: Kenyan mobile-money payments through an aggregator (Phase 3 of Kenya support)

Status: accepted. Builds on ADR 023 (pledges and payments), 025 and 026, and
`docs/plan/kenya-product-support.md`.

## Context

Kenya needs M-Pesa (and Airtel Money) collection in KES. The plan lists three models: A (we hold the
money), B (each committee's own Paybill or Till) and C (a licensed aggregator). The request for this
phase is an adapter "shaped for an aggregator", which is model C.

## Decision

1. **Model C: no custody.** An aggregator collects from the guest's wallet and settles to the committee.
   Harusi Pass records pledges, payments and balances; it never holds or disburses funds. If we ever want
   to hold funds (model A) that needs counsel first (plan, Phase 0). No aggregator is chosen yet, so the
   wire format below is our own assumption (a plain REST/JSON shape most aggregators resemble); choosing
   one means a thin adapter, not a redesign.
2. **Provider per country.** `paymentsFor(deps, country)`: Tanzania uses `deps.payments` as before; Kenya
   uses `deps.paymentsByCountry.KE` and is off without it (`payments_disabled`). Providers have unique
   names (`fake`, `fake-ke`, `aggregator-ke`) because the payment row stores the name and webhooks and
   reconciliation look the provider up by it.
3. **Adapter** (`AggregatorPaymentProvider`): `startCollection` sends `{reference, amount, currency,
phone, method, description, callbackUrl}` with `Authorization: Bearer` and our reference as the
   provider's `Idempotency-Key`; `queryCollection(reference)` reads the current state; callbacks are
   JSON signed with HMAC-SHA256 of the raw body (`x-signature`), verified in constant time before the body
   is parsed. The interface gains an optional `queryCollection` and a `currency` on the request.
4. **Idempotency.** Unchanged from ADR 023: the payment reference derives from the guest and the
   idempotency key, the row is inserted once, and a callback is applied by one atomic update that only the
   first caller can win. Five replays record one payment (tested for Kenya too).
5. **Currency and amount guards.** A callback whose currency differs from the event's is rejected (400)
   and audited, never credited as another currency. If the provider reports a different amount from the one
   requested, the provider's amount is recorded (money truth) and the difference is kept in the payment's
   data. Online limits are per country in `COUNTRY_INFO` (`onlinePayment`): Tanzania 1,000 to 100,000,000
   (unchanged); Kenya 10 to 250,000 (assumptions: a small floor, and the commonly quoted M-Pesa
   per-transaction ceiling; confirm with the aggregator).
6. **Reconciliation.** A scheduled job (`reconcilePending`, in the worker tick) finds provider payments
   still `pending` past their prompt window, asks the provider (`queryCollection`) and applies the answer
   through the same atomic step as a callback. A payment the provider no longer knows about, or that is
   still pending after 30 minutes, becomes `failed` with reason `timeout`. Money wins over a timeout: a
   success callback or query result arriving later upgrades a `failed/timeout` payment to `success`.
7. **Exports.** CSV headers already carry the event currency (Phase 1b); Kenya statements are in KES.

## Consequences

- Kenya payments work end to end with fakes and in tests; a real aggregator needs credentials, KYC,
  sandbox testing and, for the live path, a small real-money test (plan, Phase 3 exit).
- Settlement, fees and refunds are the aggregator's and the committee's agreement; the terms page says so
  and must be updated when a provider is chosen.
- The callback URL must be public HTTPS and reach `POST /v1/payments/webhook/<provider name>`.
- Not built: refunds, partial reversals, disputes, a ledger, and a committee payout flow (model A).
