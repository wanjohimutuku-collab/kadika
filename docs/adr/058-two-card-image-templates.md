# ADR 058 — Two universal card-image templates, no buttons in images

Date: 2026-11-18 · Status: accepted

## Context

The card is sent in two forms: a **PNG image** (WhatsApp media, downloads) and the **digital card**
at `/c/[token]` that the message link opens. Four renderers drew the image separately
(`/api/card-image`, `card-canvas.ts`, the guest page's canvas, the console/mobile previews), and
most drew fake "Ndio, Nitafika / Hapana, Sitafika" pills. Guests tapped pills that do nothing.

## Decision

- Two designs, `classic` and `modern`, serve every occasion (wedding, send-off, engagement,
  contribution…). Only the wording changes per occasion; the layout does not.
  - **Classic**: cream paper, double hairline frame in the event colours, everything centred, QR
    and guest number at the foot.
  - **Modern**: colour block with left-aligned names and a calendar date tile, white sheet with
    label/value rows, QR as a dashed ticket stub.
- The choice is stored in `cardContent.design.template` (JSON, no migration); absent = `classic`.
  Picked on the console Cards page.
- **Images never contain buttons.** RSVP, pay, share and calendar actions exist only on the digital
  card. The image says "reply through the link you were sent" as plain text instead.
- `/api/card-image` (satori) is the single source of the image. The console preview shows that PNG
  directly; console and guest-page downloads fetch it and fall back to the local canvas only when
  offline (the canvas no longer draws pills).
- Fonts: `apps/web/assets/card-fonts/` (Playfair Display, DM Sans; Latin WOFF, SIL OFL, copied into the
  Docker image) are used when present,
  otherwise satori's built-in sans.

## Consequences

- One place to change the image design; previews match what guests receive.
- The offline canvas fallback is a simpler single layout, not a third template.

## Update — four templates, custom text, API send (2026-11-18)

- Two more designs: **script** (white card, signature-script names in Mrs Saint Delafield, small
  capitals left-aligned, QR in the corner) and **botanical** (cream card, drawn leaf-and-flower
  garlands, centred text, QR in the middle). Both print the organiser's own `design.title`,
  `design.message` and `design.footer` (per language); `design.showQr: false` hides the QR on any
  template.
- Every preview (Cards page phone view, Karibu, new-event wizard, Send page WhatsApp preview,
  mobile Send screen) shows the `/api/card-image` PNG of the selected template, so none can drift.
- "Send image to WhatsApp" no longer opens a browser share. It sets the channel to WhatsApp and
  opens the normal send confirmation; the API sends to each guest's own number with the card image
  (`mediaUrl`). Evolution sends it as media; WhatsApp Cloud sends it as the template's IMAGE header
  when `WHATSAPP_TEMPLATE_IMAGE_HEADER=1` (only once the templates are approved with that header).
