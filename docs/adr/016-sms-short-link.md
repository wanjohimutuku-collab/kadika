# 016 — SMS short link carries the card token

Status: accepted (answers the `/s/[code]` gap in the Phase 2 TODO)

## Context

The API stores only a hash of each card token (§9), so it cannot turn a short code such as `KH-4821` back into a card link. Short codes are also unique only per event (`guests_event_short_code_uq`), so a global lookup by code alone is ambiguous.

## Decision

- The SMS/WhatsApp link is `https://<SHORT_BASE_URL>/s/<card-token>`. The token is 128-bit and about 22 characters, so the 160-character SMS budget still holds. `/s/<token>` redirects to `/c/<token>`; no lookup and no extra table.
- A `/s/<value>` that looks like a short code (2 letters, dash, 4 digits) is only resolved in mock mode. In real mode it shows the "enter your card number" page (`/k`), because the code alone cannot identify a guest across events. Gate lookup by code stays per event and is unaffected.
- Revisit if links must be shorter than the token (a per-guest `short_links` table with a 6-character slug would then be added in Phase 3).

## Consequences

Phase 3 builds SMS text from the token returned at send time. Nothing about the hash-only storage changes.
