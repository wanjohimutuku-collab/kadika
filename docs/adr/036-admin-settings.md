# ADR 036: Settings in the staff panel: branding, SMS and WhatsApp, payments (Snippe), checkout

Status: accepted. API, database, staff panel, guest checkout and tests are built. Snippe has not yet been
exercised against Snippe's own sandbox (see "To confirm with Snippe").

## Context

Three things lived in server environment variables or in code: the business name and logo, the SMS and
WhatsApp credentials (ADR 031 already made them editable, but on a page of their own), and the payment
provider (only a fake existed, ADR 023). Changing any of them meant someone with server access editing
Coolify variables and redeploying. The guest checkout also asked for a mobile network the guest often
cannot name, and rejected phone numbers written any way but a few.

## Decision

1. **A Settings section in `/ops`** (`/ops/settings`), admin staff only (`staff_role = admin`, permission
   `settings`), with three tabs: Branding, SMS and WhatsApp (the page from ADR 031, moved; the old address
   redirects), and Payments. Support and billing staff get no menu entry and a refusal.
2. **Branding** (`brand_settings`, one row): business name, tagline, primary and accent colour, a body font
   and a heading font, and a logo.
   - **Colours** must clear the same contrast bars as an event theme (ADR 006): text on the primary at 4.5:1,
     the accent at 3:1. The text colour on the primary (white or near-black) is chosen automatically.
     Unreadable colours are refused with the pair and the ratio.
   - **Fonts** are presets of fonts already on the guest's device (system, humanist, geometric, rounded,
     classical, transitional) plus the one display serif the site already ships. Nothing is downloaded, so
     there is no cost on 3G (§10) and no font CDN.
   - **Logo**: SVG (recommended), PNG, JPEG or WebP, at most 200 KB. SVG is **rejected, never rewritten,**
     if it holds scripts, `foreignObject`, event handlers, DOCTYPE/ENTITY, animation, `javascript:` URLs, CSS
     `@import`, or any link that leaves the file. Rasters must match their declared type by magic bytes.
     Defence in depth: the logo is only ever shown through `<img>` (where browsers run no script) and is
     served from `/v1/branding/logo?v=<n>` with `Content-Security-Policy: default-src 'none'; style-src
'unsafe-inline'; img-src data:; frame-ancestors 'none'; sandbox`, `nosniff`, and a versioned immutable
     cache. That route is exempt from the global security-headers middleware, which would otherwise overwrite
     its policy (a test pins this).
   - **Applied everywhere**: the root layout fetches `/v1/branding` (cached 60 s; the API being down shows
     the default brand, never an error), sanitises it to known-safe shapes (`#RRGGBB`, allow-listed fonts, a
     logo URL that is the API's logo route or an inline image) and sets CSS variables on `<html>`. An event's
     own theme on the guest card still wins inside the card. A save shows at once in the saving tab.
3. **SMS and WhatsApp** stay as ADR 031 designed them. New: **Move settings**, one button that copies the
   working environment settings into encrypted saved settings (never overwriting what staff saved), after
   which the variables can be deleted from the server. The variables remain a **first-start fallback** and
   are still passed in `docker-compose.coolify.yml`: the first staff sign-in needs an SMS provider before
   anyone can open `/ops`, so the very first SMS credentials must come from the environment (or a database
   row written by hand, `infra/ops/create-admin.sh` covers the account).
4. **Payments**: `payment_settings` (same encrypted storage and live reload as messaging). Providers: `fake`
   (unchanged) and `snippe`. Fields: API key and webhook signing key (secrets, shown only as `…abcd`),
   environment (production or sandbox) and a receipt email (Snippe requires a payer email; guests are not
   asked). A save builds the provider first and is refused if it cannot work, including when `API_PUBLIC_URL`
   is unset. **Test connection** calls Snippe's balance endpoint, so it checks the key without moving money.
   The page shows the exact webhook URL to register in Snippe.
   - `SnippePaymentProvider` implements `PaymentProvider`: `POST /v1/payments` (mobile), `GET
/v1/payments/{reference}`, and webhooks verified as HMAC-SHA256 over `<timestamp>.<raw body>` with
     `X-Webhook-Signature` and `X-Webhook-Timestamp`, constant-time, refused when older than five minutes.
     Snippe assigns its own reference, so ours travels in `metadata.reference`; reconciliation passes the
     provider's reference back to `queryCollection` (a new optional argument). TZS only.
5. **Checkout** (`/c/<token>/pay`): one screen, with the amount and the number. One-tap amounts (the open
   balance first), the network guessed from the number (only prefixes whose owner is certain; the guest can
   always change it), a pay button in the thumb zone that states the amount, an immediate status check when
   the guest returns from entering their PIN, and the business logo.
6. **Phone numbers**: the reader accepts any way of writing a Tanzanian or Kenyan mobile number and always
   stores E.164: local, national, international, `00` prefix, the local `0` left in after the country code
   (`+255 (0) 712…`), any separators, digits in other scripts, invisible marks from contacts apps, a letter
   O for zero, and text or a `wa.me` / `tel:` link around the number. Two numbers in one box are refused
   (`multiple_numbers`). The field tidies a pasted number at once and shows how it was understood.
7. **Audit**: every save, reset, test and logo change is written to `audit_log` (`ops.branding.*`,
   `ops.payments.*`, `ops.messaging.import_env`) with the names of changed fields, never their values.

## Found and fixed on the way

- The API's CORS allow-list had no `PUT`, but the settings screens save with `PUT` from another origin, so
  saving SMS/WhatsApp settings from the browser would fail the preflight. Server tests cannot see this; a test
  now asserts it.
- The staff-admin check was copied into each settings service; it is now one function.

## To confirm with Snippe before the first live payment

The wire format is taken from Snippe's published SDKs (API version 2026-01-25), not from Snippe's own
reference, which could not be fetched. Confirm in the sandbox:

- the payer fields (`customer.firstname`, `lastname`, `email`) and that a plain email is accepted;
- that `metadata.reference` is returned in callbacks (it is how our payment is found);
- the sandbox host (`sandbox.snippe.sh` is the SDK's convention);
- the exact set of event names sent to the webhook.

## Not done

- A second payment route (Kenya stays on the environment-configured aggregator, ADR 027).
- Per-event branding of the print card (events keep their own themes, ADR 006).
- Letting staff set the very first SMS credentials without the environment (needs a one-time setup flow).
