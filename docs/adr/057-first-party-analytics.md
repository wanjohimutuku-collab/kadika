# ADR 057: First-party, cookieless analytics for conversion events

Status: accepted (2026-11-07). Implementation: tracked separately; not part of the redesign PR.

## Context

ADR 056 chose first-party server-side analytics over any third-party pixel. The privacy page
(`src/content/pages/legal.ts`) promises no advertising or analytics cookies and no consent banner.
We still need to know whether the redesign improves conversion (sign-in → event created → first
invitation sent → first guest added → first RSVP received), as CLAUDE.md §13 requires.

No cookies, no fingerprinting, no third-party scripts, no guest PII. Logs must be useful for product
decisions, not for targeting people.

## Decision

1. **Events table.** New `analytics_events` (`packages/db/src/schema.ts`): `id uuid`, `name text`
   (one of a fixed enum), `occurred_at timestamptz default now()`, `session_hash bytea` (32 bytes,
   see §2), `market text` (`tz` | `ke`), `locale text` (`sw` | `en`), `edition text` (`sw` | `en` |
   `ke`), `path text` (public page path, stripped of query, max 160 chars), `referrer_host text`
   (host only, no path/query, max 80 chars), `device text` (`mobile` | `tablet` | `desktop`),
   `properties jsonb` (whitelisted small values only, see §3). Index on `(name, occurred_at)` and
   `(occurred_at)` for retention sweep. No user id, no event id of ours, no phone, no amount.
2. **Session hash.** Per request, we derive `session_hash = BLAKE2b-256(ip || user_agent ||
date_bucket || secret)` where `date_bucket` is the UTC date and `secret` is
   `ANALYTICS_SESSION_SECRET` rotated weekly. This is an anonymous grouping key, not a cookie; the
   same visitor gets a different hash tomorrow and at a different IP, which is exactly what we want.
   The IP and user agent are never stored, only consumed by the hash. `date_bucket` and the secret
   make the hash un-joinable with logs from other systems.
3. **Property whitelist.** `properties` only accepts: `country` (`TZ` | `KE`), `source`
   (`direct` | `search` | `social` | `referral`, derived from the referrer host), `landing_path`,
   `invitation_channel` (`whatsapp` | `sms` | `print`), `occasion_kind` (free text, hashed to 1-of-20
   buckets client-side on the API so we never store free text), `step_name` (for registration /
   event-setup progression). Any other key is dropped by the ingest zod schema.
4. **Event names (fixed enum, matches CLAUDE.md §13 minus PII).**
   - `page_view` (every public page render, server-side)
   - `start_registration`, `complete_registration`
   - `create_event`, `complete_event_setup`
   - `create_invitation`, `share_invitation`
   - `add_guest`, `receive_rsvp`
   - `record_contribution` (no amount, no guest id)
   - `scan_qr`, `complete_checkin` (no guest id, no event id)
     Any new name requires an ADR amendment. Unknown names are rejected `400 unknown_event`.
5. **Ingest.** Internal only; the web app emits events server-side inside its route handlers (the
   RSC render or a server action), never from the browser. The API exposes no public ingest
   endpoint, so no bot traffic reaches the table. Guest surfaces (`/c`, `/s`, `/k`) emit nothing
   (they are private per-guest URLs).
6. **Retention.** 180 days, trimmed by a daily BullMQ job (`analyticsSweep`). Longer-range roll-ups
   live in a materialised view (daily counts per event × market × edition × source). Backups keep
   only the roll-ups, not the raw events.
7. **Access.** Staff see the dashboard at `/ops/analytics` (reports role or higher, ADR 040 roles).
   No export endpoint, no CSV download, no API access from outside staff. The table is encrypted at
   rest with the same key-at-rest helper as `message_log`.
8. **Privacy page.** One new paragraph in both markets' privacy pages: Kadi Sasa keeps anonymous
   page-view and conversion counts to improve the service, stored for 180 days, with no cookie, no
   personal data and no third party. The "we do not use advertising or analytics cookies" line
   stays; it is still true. The new paragraph is marked `draft` until legal signs it off.
9. **Feature flag.** `ANALYTICS_ENABLED` env var, default `0`. CI runs with it off. Switching on is
   a deploy decision.

## Consequences

- One new table, one new worker job, one new staff page, one privacy paragraph. No browser JS, no
  banner, no third-party domain.
- Session hashes rotate daily, so returning-visitor metrics are not possible — this is by design.
- The redesign PR does not block on this. ADR 057 is a separate PR with its own schema migration,
  tests and feature flag.
- If product ever wants cross-day attribution, the next ADR must weigh a signed first-party cookie
  with explicit consent against product value; this ADR does not open that door.
