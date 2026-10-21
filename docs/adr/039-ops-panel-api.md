# ADR 039: Staff panel on the real API

Status: accepted. API routes, service, migration, client wiring and tests are built.

## Context

The staff panel (ADR 012) was built against the mock repository. On the real API only Settings and
Pilot worked: Overview, Customers, Events, Usage and costs, Payments, Support, Data requests and the
staff audit log failed with `not_implemented`, because `HttpRepository` had no methods for them and
the API had no `/v1/ops/...` routes. Customers could not file PDPA requests from Akaunti either, and the
database had no table for them.

## Decision

- **Routes** (`apps/api/src/app.ts`, logic in `services/ops.ts`):
  `GET /v1/ops/overview | organizers | events | usage | payments | audit | data-requests`,
  `GET /v1/ops/lookup?q=`, `POST /v1/ops/reveal-phone`, `PATCH /v1/ops/organizers/:id/status`,
  `PATCH /v1/ops/events/:id/plan`, `POST /v1/ops/data-requests/:id/resolve`, and for customers
  `POST /v1/me/data-requests` (`{ kind: export | deletion }`; a repeat returns the open request).
- **Staff levels** are checked in the service with the same table as `STAFF_PERMISSIONS` in the client
  (`requireStaff` in `services/staff-guard.ts`): reads for all staff, `lookup`/`reveal`/`requests` for
  support and admin, `plan` for billing and admin, `suspend` for admin only. A staff member without a
  level counts as support, as `/v1/me` already reports.
- **Audit**: every staff action writes `audit_log` with `action = ops.<what>`, no event id, and
  `diff = { target, details }`. The staff audit page lists every `ops.%` row, including the settings
  entries ADR 031/036 already write. Searches are logged too, with any run of five or more digits cut
  to its last three (§12).
- **Phones**: every list and lookup masks phones (`+255•••••678`), customers' phones included (the mock
  returned them whole on the customer list). Only `reveal-phone` returns a full number; it needs a reason
  of at least five characters and only reveals guests or customers, never staff.
- **Suspension**: the auth middleware already refuses suspended accounts on every request; suspending
  also revokes the account's refresh tokens. Staff accounts cannot be suspended here (`not_found`).
- **Data requests** live in a new `data_requests` table (migration 0020). Completing a deletion wipes the
  account in place rather than deleting the row (events, payments and audit rows reference it): name
  emptied, phone replaced by `deleted:<id>`, status `suspended`, `users.deleted_at` set, sessions revoked,
  team places and pending invitations to that phone removed, and the weddings it owns archived. Guests'
  cards keep working, as with a suspension. The phone copy on the request is cleared too. The same phone
  can sign up again as a new, empty account.

## Not covered

Producing the export file for an `export` request is still manual (staff mark it done). Deleting a
customer does not erase their guests' personal data; that stays with the existing per-guest erase
(§9) until a policy for a whole wedding is decided.
