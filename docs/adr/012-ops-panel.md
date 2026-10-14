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

## Staff roles and second factor (added)

- **Three staff levels** (`users.staff_role`): **support** (lookups, phone reveals, data requests), **billing** (plan changes) and **admin** (everything, including suspending customers). Aggregate dashboards are readable by all staff. The data layer enforces this (`forbidden` with `missing_permission`); the UI hides actions a role cannot use.
- **Second factor for staff**: after the SMS code, staff enter a second code (authenticator app in production, `654321` in mocks). Until then the session has no data access (`getSession()` returns null). Customers are unaffected.
- Mock staff logins: `0700 000 999` admin, `0700 000 998` support, `0700 000 997` billing.
- Production needs: TOTP enrolment and recovery, session expiry for staff, and the `staff_role` column (Phase 1).

## Not covered (needs decisions or later phases)

Pricing/plans and invoicing, refunds, provider cost reconciliation, alerting, and CSV export of operational reports.
