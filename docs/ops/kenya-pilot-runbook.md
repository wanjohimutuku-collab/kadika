# Kenya pilot runbook and launch gates

Phase 5 of `docs/plan/kenya-product-support.md`. Owner of this document: the Kenya support owner named in
section 2. Everything here assumes Phases 1 to 4 are deployed with `KENYA_ENABLED` on in the pilot
environment only.

Status of the numbers in this file: the targets for the gate, the scan and the reach come from the
project spec (section 14). The payment and SMS limits are proposals for the owner to confirm; they are
marked as such. They live in one place, `evaluateGates` in `packages/schemas/src/pilot.ts`, which the staff
dashboard (`/ops/pilot`) and the tests use, so change the code and this table together.

## 1. Before the first pilot event (pre-flight)

Do not start a Kenyan event until every line is ticked and dated.

| #   | Check                                                                                                                                                                             | How to verify                                                                        | Owner         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| 1   | Counsel's memo received: data protection registration, lawful bases, cross-border transfer, SMS consent and sender rules, whether holding or passing on funds needs authorisation | Written memo filed                                                                   | Owner         |
| 2   | ODPC registration done if required, and the privacy page states it                                                                                                                | Certificate; `/ke/privacy` updated                                                   | Owner         |
| 3   | SMS provider account live; sender ID approved on Safaricom and Airtel                                                                                                             | Test message to a real Safaricom and a real Airtel number arrives with the sender ID | Support owner |
| 4   | WhatsApp templates (`docs/ops/whatsapp-templates-kenya.md`) approved; names set in `WHATSAPP_TEMPLATE_*_KE`                                                                       | Test invite to a real number                                                         | Support owner |
| 5   | Payment provider agreement signed; credentials, callback URL and webhook secret in place; `PAYMENT_PROVIDER_KE=aggregator`                                                        | One real payment of KES 10 to a team member's M-Pesa, then refunded by the provider  | Owner         |
| 6   | Delivery-report callbacks reach the API: `POST /v1/webhooks/sms/africastalking?secret=...` and `/v1/payments/webhook/aggregator-ke`                                               | A test message and a test payment both update their status                           | Engineer      |
| 7   | `KENYA_ENABLED=1`, `NEXT_PUBLIC_KENYA_ENABLED=1`, `EXPO_PUBLIC_KENYA_ENABLED=1` only on the pilot environment; `SHORT_BASE_URL_KE` set                                            | `/ops/pilot` shows Kenya; a test event can be created                                | Engineer      |
| 8   | Rollback levers rehearsed (section 5) on the pilot environment                                                                                                                    | Dated note of the rehearsal                                                          | Engineer      |
| 9   | Backup taken; restore drill current (`infra/coolify/RESTORE.md`)                                                                                                                  | Backup file listed                                                                   | Engineer      |
| 10  | Native Kenyan review of all Kenya text done                                                                                                                                       | Reviewer's note                                                                      | Owner         |
| 11  | Pilot committees chosen (2 or 3), briefed, and have agreed to be a pilot in writing                                                                                               | Signed note per committee                                                            | Owner         |
| 12  | Pricing decided (free for the pilot is fine) and stated on the `/ke` pages                                                                                                        | Page text                                                                            | Owner         |

## 2. Roles

| Role                | Does                                                                                                                         | Named person |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Kenya support owner | The single contact for pilot committees; watches `/ops/pilot` every day from T-14; decides pause and rollback with the owner | to fill in   |
| Engineer on call    | Fixes faults, runs rollback levers, restores from backup                                                                     | to fill in   |
| Owner               | Decides go and no-go, signs off launch, talks to counsel and providers                                                       | to fill in   |
| Committee contact   | One person per pilot event who the support owner can phone                                                                   | per event    |

Support owner checklist, per pilot event:

- [ ] T-21: call the committee, confirm the date, venue, guest count and who runs the gate; agree what the committee will do if the network fails.
- [ ] T-14: invitations out. Check the reach number and any failed messages the same day.
- [ ] T-14, T-7, T-1: reminders go out automatically; confirm they did (messages tab) and nobody complained.
- [ ] T-7: gate rehearsal with two real phones, a paper card and a failed QR; fix whatever fails.
- [ ] T-1: confirm the gate link, PIN and gate agents' phones (charged, Android, camera permission, list downloaded online).
- [ ] Day: be reachable from 2 hours before to 2 hours after; watch `/ops/pilot` scans and sync.
- [ ] T+1: confirm all offline scans synced; export the scan list and payments (KES) for the committee.
- [ ] T+7: close the event review (section 4), thank the committee, record support contacts.

## 3. The numbers and the launch gates

Window: the last 30 days, per country, on `/ops/pilot` (`GET /v1/ops/pilot-metrics`, staff only, no guest names
or phone numbers). A gate with too little data shows "not enough data" and never counts as met.

| Gate                 | Measure                                                                                             | Target                           | Blocks launch | Source of the target             |
| -------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------- | ------------- | -------------------------------- |
| Reach                | Guests with a phone who were reached by any channel (delivered, opened, replied or checked in)      | at least 95% (sample: 20 guests) | Yes           | Spec section 14                  |
| First-scan success   | ok / (ok + invalid + wrong event + not found)                                                       | at least 95% (20 scans)          | Yes           | Spec section 14                  |
| Gate speed           | Median seconds between consecutive admissions at one gate, within bursts (proxy for time per guest) | at most 8 s (20 admissions)      | Yes           | Spec section 14                  |
| Lost scans           | Offline scans still unsynced after 1 hour                                                           | 0                                | Yes           | Spec section 14                  |
| Duplicate admissions | Guests admitted more than once without a committee override                                         | 0                                | Yes           | Spec section 14                  |
| SMS delivery         | Delivery rate of the weakest operator with at least 20 messages                                     | at least 90%                     | Yes           | Proposal                         |
| Payment success      | Succeeded / started provider payments                                                               | at least 90% (10 payments)       | Yes           | Proposal                         |
| Payment speed        | Median seconds from prompt to confirmation                                                          | at most 90 s (10 payments)       | No, watch     | Proposal                         |
| Manual admissions    | Manual admissions / all admissions                                                                  | at most 10% (20 admissions)      | No, watch     | Spec section 14 asks to track it |

Also watched, with no target: share of guests reached by SMS (the feature-phone path), payment timeouts, late
successes, amount differences, duplicate scans, and support contacts per event (counted by hand in the
event review, since the system cannot see phone calls).

To open Kenya to more committees, all blocking gates are met on at least 2 pilot events (at least 150 guests
and 10 payments in total), no severity-1 issue is open, the legal items in section 1 are closed, and the owner
signs the launch note. If a blocking gate is not met, the owner decides between fixing and re-running, or
extending the pilot; do not lower a gate to pass.

How each number is measured (so nobody argues about it later):

- **Reach.** Denominator: guests with a phone number who are not deleted, in events of the country. Print-only
  guests are excluded because delivery cannot be measured for paper. Numerator: invitation status delivered,
  opened, confirmed, declined or checked in.
- **SMS by operator.** From the network code (MCC+MNC) the provider's delivery report names, stored on the
  message. Messages whose report names no network show as "unknown"; a high "unknown" share means the
  reports are incomplete and the operator numbers cannot be trusted. Operator labels are from public
  numbering lists; confirm with the provider.
- **Payments.** Provider payments only (manual cash and bank entries are not measured). The start time is the
  end of the 60 second prompt window minus 60 seconds. A timeout means we gave up after 30 minutes; a late
  success is money that arrived after a timeout and was still credited (`docs/adr/027-kenya-payments.md`).
- **Gate.** From the scan log. Offline scans are those taken without a network.
- **Gate speed** is a proxy. It measures gaps between consecutive admissions at one device within a burst
  (gaps over 60 seconds count as idle time). Treat a value near the limit as unproven and time it with a
  stopwatch at the next event.

## 4. Event review (T+7)

One page per pilot event, filed with the pilot notes: guests, reach, SMS and WhatsApp counts and failures
per operator, first-scan success and manual share, scans lost or duplicated (must be zero), payments
started, succeeded, timed out, late, amount differences, collected in KES, support contacts and their causes,
what the committee said, what we changed. The review decides whether the same event type needs a code or
copy change before the next one.

## 5. Rollback plan

Levers, in the order to use them. Each is an environment variable followed by an API restart; no deploy or
migration is needed. All are covered by `apps/api/src/kenya-rollback.test.ts`.

| Level                        | When                                                        | Lever                                                                       | What happens                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Pause new Kenyan messages | SMS or WhatsApp is failing, or a template or sender problem | `KENYA_SENDING_PAUSED=1`                                                    | No new Kenyan invitations, reminders or fallbacks leave; invitations stay "created" and go out when the pause is lifted. Sign-in codes, the gate, payments and Tanzania are unaffected                            |
| 2. Pause new Kenyan payments | The provider is failing, or an amount or currency problem   | `KENYA_PAYMENTS_PAUSED=1`                                                   | No new payment prompts (403 `payments_paused`); callbacks and the reconciliation job keep settling payments already started, so no money is lost track of                                                         |
| 3. Switch Kenya off          | A serious fault, or a legal stop                            | `KENYA_ENABLED=0` and the same for the web and mobile flags                 | New `+254` numbers and Kenyan events are rejected; the Kenyan SMS and payment routes are not built; existing Kenyan events and guests stay readable and exportable; nothing is sent through the Tanzanian gateway |
| 4. Hand over by hand         | Pilot event cannot continue on the system                   | Export guests, scans and payments (CSV, KES) and give them to the committee | The committee runs the gate from the exported list                                                                                                                                                                |

Rules:

- Before level 3, first use level 2 and wait until no payment is pending (the reconciliation job settles them within about 30 minutes), otherwise a late callback finds no provider and is rejected.
- Levels 1 and 2 do not need a lawyer; level 3 for a legal reason is the owner's call.
- After any level, tell the committee contacts within 30 minutes (suggested text: "We have paused X while we fix a problem; your guest list and cards are safe; we will tell you when it is back"), and record the time, reason, who decided and when it was lifted.
- Data is never deleted as part of a rollback.
- Rehearse levels 1 to 3 on the pilot environment before the first event, and again after any change to messaging or payments.

## 6. Severity and escalation

| Severity | Examples                                                                                             | Response                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1        | Money credited wrongly, a payment taken twice, guests admitted twice at scale, personal data exposed | Pause (level 2 or 3), engineer and owner within 15 minutes, counsel if data is involved, notify the committee |
| 2        | One operator's SMS not arriving, payments slow, gate sync delayed                                    | Support owner acts within 1 hour; engineer within 4 hours                                                     |
| 3        | Wording, layout, a single guest's problem                                                            | Next working day                                                                                              |

Personal data incidents: follow the privacy page; the notification period to the ODPC and affected people is
to be confirmed by counsel (item 1 of section 1) and put in this table.

## 7. What this runbook does not cover

Custody of funds, refunds and disputes (not built, ADR 027), a ledger, billing, and countries other than
Kenya and Tanzania.
