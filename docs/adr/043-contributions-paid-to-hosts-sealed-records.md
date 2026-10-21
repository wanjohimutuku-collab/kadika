# ADR 043: Contributions are paid to the hosts; we keep only sealed records

Status: accepted. Supersedes the pay-from-card part of ADR 023, 027 and 036 for guest contributions.

## Context

The business does not want to collect or hold guests' contribution money (michango) for hosts. Collection
happens between the guest and the hosts; what we keep is the committee's record of who pledged and paid.
Those records are the customer's private data and should be visible only to the customer, not to staff.

## Decision

1. **No collection through us.** `POST /v1/c/:token/pay` is refused with `forbidden`, `reason:
collected_by_host`, unless `GUEST_PAYMENTS_ENABLED=1` (off by default, kept only so payments already in
   flight can still settle: webhooks and reconciliation keep working). The card API exposes
   `event.onlinePay`; with it off the guest card shows **where to send the contribution** instead of a pay
   button, and `/c/:token/pay` redirects to the card.
2. **The hosts' own accounts on the card.** `cardContent.contribution.payTo` holds up to four
   `{ label, account, name? }` entries (M-Pesa number, Lipa Namba, bank account), edited under Mipangilio.
   The card says the money goes straight to the hosts and reminds guests never to share their PIN.
3. **Sealed records.** Pledge amount and note, and payment amount, note and payer phone, are stored
   AES-256-GCM encrypted (`amount_enc`, `note_enc`, `phone_enc`) with `KEY_ENC_SECRET`, each bound to its
   table, row id and column as additional data, so a ciphertext copied elsewhere does not decrypt. The
   plain columns hold `0` / `null`. Totals are summed after decryption in `ContributionRecords`; there is
   nothing left to sum in SQL. Rows written before this ADR are sealed in the background when the API starts
   (`sealLegacy`), and reads accept either form meanwhile.
4. **Only the event team reads them.** Owner and committee get clear values through the event routes
   (pledges, payments, reports, exports, PDPA export); gate agents still get nothing. Staff routes no longer
   carry contribution money: `/v1/ops/payments` is gone (the page redirects to the billing orders, ADR 042),
   the overview has no contributions tile, the weddings list has no "collected" column, support lookup
   finds billing orders instead of contribution payments, and pilot metrics report payment counts but no
   amounts. Audit log entries for pledges and payments no longer include amounts.

## Consequences

- This is **encryption at rest on the server**, not end-to-end: the API holds the key, so it protects
  against database dumps, backups and the staff panel, not against someone who controls the server and its
  secrets. End-to-end encryption would need keys held by the hosts' devices and shared across the
  committee; revisit if customers ask for it.
- Losing `KEY_ENC_SECRET` loses the contribution records, as it already loses the event signing keys.
- Contribution totals cost one decryption per payment; fine at wedding scale (hundreds of rows).
- The pay-from-card tests still run with `GUEST_PAYMENTS_ENABLED=1` in the test context; a test without it
  asserts the default.
