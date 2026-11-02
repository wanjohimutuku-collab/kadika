# Kumbukumbu: a photo memories page for guests

Date: 2026-11-03. Status: design approved, not built. Record the decision as ADR 050 when it is built.

## Goal

After a host has paid for cards, they get a page of past photo memories (a story timeline: "Tulipokutana,
2019") that their guests open from a link received on WhatsApp. Only guests can open it; only the host
and committee add photos.

## Decisions

| Question | Decision |
|---|---|
| What unlocks it | Any **paid card order**: a row in `event_purchases` with `kind = 'cards'` and `status = 'paid'`. Reminder packs and staff grants do not unlock it. No new price. |
| Who views | **Guests only.** Access is by the guest's existing card token. No new link, no login. |
| Who uploads | Owner and committee, from the web console and the mobile app. Gate agents: no access. Guests: view only. |
| What a memory holds | One photo, an optional caption (≤ 140 characters), an optional date (`taken_on`, day precision). |
| How many | Up to **30** per event by default; staff can change it per event in `/ops`. |
| How the link travels | Both: the host shares it from their own WhatsApp (free), or we send it (spends credits). |
| Where photos live | Files on a persistent volume, behind a `PhotoStore` interface. |

## Storage

- `PhotoStore` interface: `put(key, bytes, contentType)`, `get(key)` (stream + content type + size),
  `delete(key)`. Two implementations: `DiskPhotoStore` (root from `PHOTO_FILES_DIR`, default
  `data/photo-files`, a persistent Coolify volume like `APP_FILES_DIR` in ADR 047) and `MemoryPhotoStore`
  for tests and local dev.
- Keys: `events/<eventId>/<memoryId>.webp` and `events/<eventId>/<memoryId>.thumb.webp`. Keys are never
  built from user input.
- The volume must be added to the nightly backup alongside `pg_dump` (note in `infra/coolify/`).
- Rejected: MinIO/R2 now (new service and credentials for a small feature; a later S3 adapter only needs
  a new implementation of the interface), Postgres `bytea` (bloats the database and its backups).

## Data model

New table `memories`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid v7 | |
| `event_id` | uuid, FK `events` on delete cascade | |
| `photo_key` | text | full-size WebP |
| `thumb_key` | text | thumbnail WebP |
| `width`, `height` | integer | of the full-size image, so the page reserves space and does not jump |
| `caption` | text, nullable | ≤ 140 characters |
| `taken_on` | date, nullable | |
| `sort_order` | integer | |
| `created_by` | uuid, FK `users` on delete set null | |
| `created_at`, `updated_at` | timestamptz | |

Index `memories(event_id, sort_order)`.

New columns on `events`:

- `memories_enabled` boolean, default `true`. The host can switch the page off without deleting photos.
- `memories_limit` integer, default `30`.

Order on the page: `taken_on` ascending (memories without a date last), then `sort_order`. Reordering in
the console changes `sort_order`, which only matters among memories with the same date or none.

## Image processing

Done in the API on upload with `sharp`:

- Accept JPEG, PNG, WebP and HEIC, up to 8 MB. Check the real type from the bytes, not the file name or
  the browser's header.
- Rotate according to EXIF orientation, then **remove all metadata** (EXIF, GPS, XMP) so a phone photo
  never reveals where it was taken.
- Write a full-size WebP (longest side 1280 px, quality 78) and a thumbnail (longest side 320 px,
  quality 70).
- If decoding fails, return `400 invalid_image`; nothing is stored.

## API (`/v1`)

Organizer (Bearer JWT, owner or committee; `gate` gets 403):

```
GET    /v1/events/:id/memories              list + { unlocked, enabled, limit, count }
POST   /v1/events/:id/memories              multipart: photo, caption?, takenOn?
PATCH  /v1/memories/:mid                    caption?, takenOn?, sortOrder?
DELETE /v1/memories/:mid                    deletes the row and both files
PATCH  /v1/events/:id                       accepts memoriesEnabled
POST   /v1/events/:id/memories/send         send the link to guests (see Delivery)
GET    /v1/guests/:gid/memories-link        that guest's link + wa.me URL (see Delivery)
```

Guest (card token):

```
GET    /v1/c/:token/memories                event names + theme + trust data + memories (no keys exposed)
GET    /v1/c/:token/memories/:mid/:size     size = thumb | full; streams the WebP
```

Rules:

- Uploading while the event is not unlocked returns **402 `payment_required`** with
  `details: { reason: 'feature_locked', feature: 'memories' }`; at the limit it returns 402 with
  `details: { reason: 'quota_exceeded', resource: 'memories', remaining: 0, needed: 1 }`. The console
  already turns 402 into a toast linking to the Plan page.
- Guest routes check the token exactly like `/v1/c/:token` (hash compare, current `token_version`). A
  reissued card's old token is refused. If the page is switched off or not unlocked, the guest route
  returns 404 `memories_unavailable` (the guest is never told about payments). A token found in
  `retired_card_tokens` gets the card's existing "card reissued" response.
- Photo responses: `Cache-Control: private, max-age=86400`, `Content-Type: image/webp`,
  `X-Content-Type-Options: nosniff`. Never served from a public static folder.
- Rate-limit the guest routes with the existing token-lookup limiter.
- Audit log: memory created, edited, deleted; page switched on/off.

## Screens

**Organizer, web console** (`/app/e/:id/kumbukumbu`, in the "Zaidi" sheet on small screens) and
**mobile app** (`event/[id]/memories`, reached from Overview and guest detail):

- Locked state: icon, "Kumbukumbu zinapatikana baada ya kununua kadi", button to the Plan page.
- Unlocked: counter "12 / 30", an **Ongeza picha** button, a list of memories (thumbnail, caption, date)
  with edit, delete (confirmation sheet naming the photo) and move up/down. An on/off switch for the
  page. A preview button opens the guest page as a sample guest would see it.
- Upload shows per-photo progress and a queued state when offline (mobile); a failed upload shows
  *Jaribu tena* for that photo only.
- Committee members see and edit everything here; nothing on this screen is financial.

**Guest page**, web, `/c/<token>/kumbukumbu`:

- Header with the couple's names in the display serif and the event's theme; the trust strip (sender,
  committee phone, domain) as on the card.
- A single-column timeline: date label, photo (thumbnail first, lazy-loaded, `width`/`height` set), caption.
  Tap opens the full-size photo; back closes it.
- Footer: language chip, privacy link, "Rudi kwenye kadi" back to `/c/<token>`.
- `<meta name="robots" content="noindex,nofollow">`; OG tags with the couple's names but no photo.
- States (§17.10): skeleton while loading; empty "Hakuna kumbukumbu bado"; invalid token (the card's
  invalid-token message); unavailable ("Ukurasa huu haupatikani kwa sasa"); offline banner, showing
  thumbnails the service worker already cached.
- Budget: the page itself within the card's JS budget; thumbnails ≈ 20–30 KB each.
- The card page `/c/<token>` shows a **Kumbukumbu** button when the page is unlocked, enabled and has at
  least one memory.

## Delivery on WhatsApp

1. **Host shares it (free).** Guest detail and the guest list row menu get **Shiriki WhatsApp**, which
   opens `https://wa.me/<phone digits>?text=<message>` with that guest's own link,
   `https://<domain>/c/<token>/kumbukumbu`. Only for guests with a phone. Nothing goes through our
   providers and no credits are spent.
   - The API builds the link: `GET /v1/guests/:gid/memories-link` returns `{ url, waUrl }`, decrypting
     the token from `invitations.token_enc` the way delivery's `cardToken(inv)` already does. Owner and
     committee only; the response is never logged. A guest with no invitation yet gets 409
     `no_invitation`.
2. **We send it.** On Tuma, a new message type **Kumbukumbu** with the existing targets (all, group,
   selected). Message kind `memories`:
   - WhatsApp template `kumbukumbu_link` (Swahili and English), SMS fallback for guests without
     WhatsApp or when WhatsApp fails, ≤ 160 characters:
     `{A} & {B} wameshiriki kumbukumbu zao nawe: {shortlink}`. The short link is
     `<short base>/s/<token>/k`, a new variant of the existing `/s/<token>` redirect that lands on
     `/c/<token>/kumbukumbu`.
   - Spends **1 reminder credit per message that is not a failure**, under ADR 042 rules (402 up front
     when enforcement is on and credits are short).
   - Refused with 402 `feature_locked` if not unlocked, and with 400 `no_memories` when the page is empty
     or switched off.
   - Until Meta approves the template, the WhatsApp leg runs through the fake provider and SMS is used
     in production.

## Privacy and deletion

- Deleting a memory deletes both files. Deleting an event deletes all its memory files (a cleanup
  step in the event-delete service, then the cascade removes the rows). A PDPA erasure of the event
  owner covers their events' photos.
- Photos are personal data of the couple; the privacy page gets one sentence that hosts may share
  photos with their guests and that location data is removed.
- Logs never contain guest tokens or the links built from them.

## Tests

- Unlock: none → locked; pack only → locked; grant only → locked; pending card order → locked; paid card
  order → unlocked.
- Limit: the 31st upload returns 402 `quota_exceeded`; staff raising the limit allows it.
- Image: a JPEG with GPS EXIF comes out with no metadata; a rotated photo comes out upright; a text file
  renamed `.jpg` returns `invalid_image`; > 8 MB is refused.
- Access: owner and committee can upload; gate gets 403; a guest of another event's token gets 404 for
  this event's photo; a reissued token is refused; page switched off returns 404 to guests.
- Delivery: send spends one credit per delivered message, none for failures; WhatsApp failure falls
  back to SMS; locked event and empty page are refused.
- Deletion: deleting a memory and deleting an event remove files from `MemoryPhotoStore`.
- Web: Playwright on `/c/<token>/kumbukumbu` at 360 px for the empty, list and unavailable states; axe
  with zero serious issues. Add the states to `/dev/states`.

## Out of scope

Guest uploads, comments or likes, video, albums, downloading all photos as a zip, a public share link
that works for non-guests, a separate paid "memories" package.
