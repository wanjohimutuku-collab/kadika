# ADR 050: Kumbukumbu, the couple's photo memories for their guests

Status: accepted. API, web console, staff panel, guest page, mobile app and tests are built.
Spec and plan: `docs/superpowers/specs/2026-11-03-memories-page-design.md`,
`docs/superpowers/plans/2026-11-03-memories-page.md`.

## Context

Hosts want to share photos of their journey ("Tulipokutana, 2019") with their guests. It should reward
buying cards, never reveal anything private, and load on slow phones.

## Decision

1. **Unlock:** any paid card order (`event_purchases.kind = 'cards'`, `status = 'paid'`). Message packs and
   staff grants do not unlock it. No separate price.
2. **Content:** up to 30 photos per event (`events.memories_limit`; staff with the `plan` permission change
   it in `/ops/events` with a reason, audited as `ops.memories_limit`). Each has an optional caption
   (≤ 140 characters) and date. Ordered by date (undated last), then the host's order.
3. **Who:** owner and committee manage photos (web console `/app/e/:id/kumbukumbu`, mobile
   `event/[id]/memories`); gate agents get 403; guests only view. Only the owner switches the page off
   (`events.memories_enabled`).
4. **Guest access by card token:** `/c/<token>/kumbukumbu`, plain HTML like the card (ADR 014), with the
   trust strip. Photos come from `GET /v1/c/:token/memories/:mid/thumb|medium|full`, which checks the token
   for every file. Each upload is stored at 320, 640 and 1280 px; the page lists photos with `srcset` so
   2-3x phone screens get the 640 px copy, and photos stored before the 640 px size fall back to the full
   one. A reissued card's old link gets the "replaced" page. A switched-off, locked or empty page
   reads "not available", never mentioning payment. The card shows a Kumbukumbu button only when the page
   has photos (`memoriesAvailable` on the card view).
5. **Storage:** files on a persistent volume (`PHOTO_FILES_DIR`, the `photofiles` volume in
   `docker-compose.coolify.yml`) behind `PhotoStore`; tests use an in-memory store. MinIO or R2 later is a
   new `PhotoStore` only. Photos are served with `cache-control: private, max-age=86400`.
6. **Privacy:** every upload is re-encoded by sharp to WebP (1280 px and 320 px), which drops all metadata,
   so GPS locations never leak. JPEG, PNG and WebP only, up to 8 MB (the prebuilt sharp has no HEIC; phones
   hand browsers and the image picker JPEG). Deleting a photo, the event or the owner's account (PDPA
   erasure, after its transaction commits) deletes the files.
7. **Delivery:** the host shares each guest's link from their own WhatsApp (`wa.me`, free; guest detail on
   web and mobile), or sends it to every guest with a phone from the Kumbukumbu page (message kind
   `memories`, WhatsApp template `WHATSAPP_TEMPLATE_MEMORIES` with parameters hosts and link, SMS fallback).
   Each message that is not a failure spends one reminder credit (ADR 042). Both use the country's short
   link `/s/<token>/k`, which redirects to the page.

## Consequences

- The `photofiles` volume is not in the nightly `pg_dump`; back it up separately (see
  `infra/coolify/RESTORE.md`).
- Until Meta approves the memories template, WhatsApp sends go as plain text (delivered only inside a
  24-hour window) and then fall back to SMS.
- Thumbnails come from the API's origin, so the card's service worker does not cache them (opaque responses
  would cost about 7 MB of quota each); the page itself is cached, and the private HTTP cache keeps photos
  already seen for a day.
- In mock mode the server-rendered guest page cannot see the browser's mock state, so it reads "not
  available"; `/dev/memories` shows the page with sample photos.
- The mobile app adds, reorders and deletes photos; captions are edited on the web.
- The memories send lives on the Kumbukumbu page, not on Tuma, to keep the invitation flow unchanged.
