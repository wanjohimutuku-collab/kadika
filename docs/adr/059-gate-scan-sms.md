# 059 — Gate "Scan SMS": read the card number off the guest's phone screen

Status: accepted

## Context

Guests without smartphones get their invitation by SMS (§7.2, ADR 016). The SMS has no QR; it
ends with the card number (`Namba: KH-4823` / `Code: KH-4823`). At the gate the agent had to read
the number off the guest's screen and type it, which is slow in a queue and error-prone. The
scanner already let the agent paste an SMS, but the SMS is on the guest's phone, not the agent's.

## Decision

- The web gate scanner gets a **Scan SMS** button next to torch/flip. It takes the current camera
  frame (or a photo, when the live camera is unavailable), converts it to high-contrast greyscale
  and runs text recognition **on the device**. The image is never uploaded or stored.
- Readers are tried in order: the browser's own `TextDetector` (offline, where it exists), then
  `tesseract.js` (WebAssembly, English model). Tesseract is imported only on the first tap, so it
  adds nothing to the scanner's normal load. Its engine and model come from the jsDelivr CDN once and
  are then served from the browser cache; the first scan of a session therefore needs a connection.
  Offline without a cached model the agent sees "SMS reading unavailable — type the number".
- `extractShortCodeFromOcr` (`@harusi/schemas/short-code`) takes the code from the text. Links are
  removed first, so a code-like run inside the card token is never taken. Look-alike characters
  (`5`↔`S`, `8`↔`B`, …) are repaired **only** directly after a label (`Namba`, `Code`, `Kadi`,
  `Card`, …), so a status bar such as `4G 85%` cannot turn into a code.
- A code read from an SMS is checked exactly like a typed code (method `code`): no signature, logged
  as manual, with the usual duplicate and revocation checks. It is no stronger than a typed number.
- The strict console CSP adds `'wasm-unsafe-eval'` so WebAssembly can compile. It does not allow
  JavaScript `eval`.
- `extractShortCode` also learned the `Namba:` label used by the current Swahili SMS templates.

## Consequences

- One new web dependency (`tesseract.js`), lazy-loaded.
- The Expo gate app is unchanged: on-device OCR there needs a native ML Kit module and a new EAS
  build. Revisit if the native app becomes the main gate device.
- Revisit self-hosting the Tesseract engine/model under `/public` if gates often start offline.
