# 012 — Staff (ops) panel at `/ops`

Status: accepted

## Context

`CLAUDE.md` has no panel for running the business itself; §5 only reserves `users.role_global` (`user | admin`) and `events.plan`, and Phase 7 mentions "audit views". Customers (couples, committees) only ever see their own weddings.

## Decision

- A staff-only area at **`/ops`**, separate from the customer console (`/app`), gated by `role_global = 'admin'`. Customers get an explanatory refusal page; the data layer rejects ops calls from non-staff (`forbidden`), so hiding the links is never the only protection.
- v1 scope: **overview** (customers, weddings, guests, messages, failure rate, SMS cost, contributions, open requests, "needs attention"), **customers** (search, suspend/reactivate with a mandatory reason), **weddings** (usage, cost, mark as paid/free), **usage and costs** (per channel, per day, heaviest weddings, failure reasons), **payments** (read-only list), **support** (lookup by name, phone digits, card code or payment reference), **data requests** (PDPA export/deletion queue), **staff audit log**.
- **Personal data rules** (§9, PDPA): lookups return masked phones (`+255•••••678`). Revealing a full number needs a written reason (≥ 5 chars) and is recorded in the audit log with the staff member's name. Every lookup is logged too. Staff cannot suspend other staff.
- **Suspension** blocks dashboard login (`forbidden`) but guests' cards keep working, so a suspended organizer cannot silently break a wedding that is already in progress.
- **Data requests**: customers file them from Akaunti; staff resolve them in `/ops/requests`. Completing a deletion removes the account and soft-deletes the weddings they own.
- **Billing stays manual** (open decision 5 is unanswered): staff mark a wedding as paid/free. No pricing, invoices or provider reconciliation yet; refunds and disputes belong to Phase 6 with the real payment provider.
- Staff accounts: in mocks the staff login is `0700 000 999` + `123456` and lands on `/ops`. In production, staff accounts are created by direct database/CLI action, never by self-signup.

## Also fixed (found while designing this)

- A team invitation was never linked to the invitee's account. The mock now accepts pending invitations when the invited phone logs in (status `invited` → `active`, weddings appear in their list), and links an existing account at invite time. The real API must do the same matching in the OTP verify step.
- Account state (`status`, `last_login_at`, `created_at`) was missing from `users`; the mock now carries them. `users` needs matching columns (or an `accounts` status table) in Phase 1.

## Not covered (needs decisions or later phases)

Pricing/plans and invoicing, refunds, provider cost reconciliation, staff roles beyond one `admin` level (e.g. read-only support vs. billing), SSO/2FA for staff, alerting, and CSV export of operational reports.
