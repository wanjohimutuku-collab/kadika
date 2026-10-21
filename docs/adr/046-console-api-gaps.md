# ADR 046: The last console features on the real API, and deleting an event

Status: accepted. Built with tests.

## Context

The web console was built against the mock repository (ADR 005). On production, nine features had no
API route and answered `not_implemented`: the Overview's recent activity, the Reports page (also used
by Michango), a guest's message history, history and notes, the test message, moving guests to a
group, undoing a guest delete, and deleting an event.

## Decision

1. **Routes.** `GET /v1/events/:id/activity`, `GET /v1/events/:id/report`,
   `POST /v1/events/:id/messages/test`, `DELETE /v1/events/:id`, `POST /v1/guests/restore`,
   `POST /v1/guests/group`, `POST /v1/guests/:id/notes`, `GET /v1/guests/:id/history` and
   `GET /v1/guests/:id/messages`. The HTTP repository calls them, so the same pages work on the mock
   and the API.
2. **Roles.** Gate agents get none of these except the activity feed, and that feed leaves out
   payments (§2). History, messages, notes, groups and undo follow guest management (owner and
   committee). Deleting the event is owner-only.
3. **Activity** is built from what is already stored: answers and opens (invitations), arrivals and
   duplicate scans (scan log), failed messages (message log) and confirmed payments (decrypted per
   ADR 043). There is no separate activity table.
4. **Guest history** reads the audit log for that guest and writes one Swahili line per entry, as
   the console shows it. Notes are audit entries (`guest.note`). The history never contains a
   phone number or token (§12).
5. **The test message** goes only to the caller's own phone, is free, is limited to five per ten
   minutes per person, and is audit-logged with the last three digits only.
6. **Undo** does not bring a guest back when the same phone is already on the list again, so the
   list never holds one number twice.
7. **Deleting an event is a soft delete** (`events.deleted_at`, migration 0024). From that moment
   the event is "not found" to every member, its card links read as invalid, its gate links are
   revoked, scheduled sends are cancelled and reminders stop (status `archived`). The rows stay,
   because purchases and PDPA requests still refer to them; for the host the delete cannot be undone,
   as the Settings page says.

## Consequences

- The console has no `not_implemented` screens left. The only `not_implemented` method is
  `getGuestCardLink`, which is mock-only by design: the API never hands out raw card tokens.
- Staff can restore a deleted event by clearing `deleted_at` in the database; there is no /ops
  button for it yet.
