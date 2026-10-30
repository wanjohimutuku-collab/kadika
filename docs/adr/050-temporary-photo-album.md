# ADR 050: A temporary photo album per event

Status: accepted. Built with tests. Overrides §16 ("photo galleries" out of scope for v1) for this
limited, temporary album only; there is still no permanent gallery.

## Context

Hosts asked for a place where guests and the committee can share photo memories around the event.
Guests are mostly on mid-range Android phones and slow data, so a camera photo (4–8 MB) must not cost
them that much to send or to view. Photos of people are personal data (PDPA), so they should not be
kept longer than the event needs. Production has no object storage; files live on the API's
persistent volume (ADR 047).

## Decision

1. **Off by default; the owner turns it on** in the console (Albamu). Settings are on the event:
   `album_enabled`, `album_guest_uploads` (default on) and `album_keep_days` (1, 7 or 30 offered; 1 by
   default). The album closes `album_keep_days` after the event's start date.
2. **Who can add and see photos.** Owner and committee from the console; guests from their card
   (`/c/<token>/album`, the card token is the only credential) when guest uploads are on. Gate agents
   have no access. Guests see uploaders' first names only and may delete only their own photos; owner
   and committee may delete any photo (audit-logged); only the owner can empty the album at once.
   Limits: 20 photos per guest, 500 per event, 15 MB per file.
3. **Compression, twice.** The browser shrinks a photo to at most 2560 px (JPEG, quality 0.9) before
   upload, so a 6 MB camera photo costs well under 1 MB of data. The API (sharp) then makes the stored
   copies: turned upright from EXIF, converted to sRGB, **all metadata stripped** (no GPS position
   leaks), fitted within 2048 px, a light unsharp mask only when it was scaled down, saved as WebP
   quality 82 (typically 200–500 KB), plus a 480 px WebP thumbnail for the grid. Small photos are
   never enlarged. Anything sharp cannot decode is refused (`album.not_image`); decompression bombs
   are refused by a 60-megapixel input limit.
4. **Storage and links.** Files are at `$APP_FILES_DIR/albums/<eventId>/<photoId>.webp` (and
   `.t.webp`), written atomically; only details are in `event_photos`. `<img>` cannot send a bearer
   token, so the album lists HMAC-signed links (`/v1/album-photos/:id?s=&e=&k=`) that expire when the
   album closes. The image response is `image/webp`, `nosniff`, sandboxed CSP, `private` cache and a
   cross-origin resource policy so the web app's origin can show it.
5. **Deletion.** The scheduler (every minute, ADR 030) deletes the rows and files of every album that
   has closed and of every deleted event. This is a hard delete; there is no copy to restore.
6. **The card stays light** (ADR 014): it only shows a short "Photo memories" section linking to the
   album page while it is open. The album page itself is a small React page like `/pay`.

## Consequences

- Disk use is bounded: about 500 × ~0.5 MB per event while open, then nothing.
- No mobile (Expo) album screen yet; the console and the guest card cover it. Add one if hosts ask.
- PDPA export does not include album photos; they are deleted soon after the event anyway.
- The demo (mock) backend keeps album photos in memory only, so they vanish on reload.
- Swahili strings need the usual native-speaker review before launch.
