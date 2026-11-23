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
  `tesseract.js` (WebAssembly, English LSTM model). The tesseract.js module itself is imported lazily.
- **Self-hosted engine.** `apps/web/scripts/copy-ocr-assets.mjs` runs before `next dev`, `next build`
  and `e2e:build` and copies the worker, the three LSTM cores (plain / SIMD / relaxed-SIMD; the
  device downloads one, about 3.9 MB) and `eng.traineddata.gz` (about 2.9 MB, from
  `@tesseract.js-data/eng`) into `public/ocr/tesseract-<version>/`. The folder is gitignored and
  versioned, so it is served `immutable` and a dependency bump moves it to a new URL. No CDN.
- **Offline.** When the scanner opens online (and not on Data Saver), the engine is warmed up in the
  background. After that Scan SMS keeps working with no connection for as long as the page stays
  open: the engine lives in the worker and the HTTP cache, the model in tesseract's IndexedDB cache.
  A gate that opens the scanner already offline, with nothing cached, sees "SMS reading unavailable
  — type the number".
- `extractShortCodeFromOcr` and `extractShortCodeFromPartialSms` (`@harusi/schemas/short-code`) take
  the code from the text. Links are checked against the event's guest roster when present, and
  look-alike characters (`5`↔`S`, `8`↔`B`, …) are repaired after a label (`Namba`, `Code`, `Kadi`,
  `Card`, …) or across an explicit hyphen (`K5-4B23` → `KS-4823`) so a status bar such as `4G 85%`
  cannot turn into a code.
- **Feature & disposable phones (partial SMS views).** Basic feature phones ("simu ya tochi") have
  small 2–3 line screens that cannot display the whole SMS at once. `extractShortCodeFromPartialSms`
  and `scanSmsFrames` support partial views:
  1. Multi-frame stitching (`combineSmsFragments`) as the guest scrolls through the message.
  2. Unlabelled hyphenated or screen-clipped codes (`Namba: KH-48`, `...mba: -4823`) matched against
     the event's downloaded guest roster.
  3. Visible `/s/<token>` or `/c/<token>` short links in the middle of the message.
  4. Opening greeting + guest display name (`Habari Mwanaidi Salim, unaalikwa...`) when only the top
     lines of the SMS fit on screen.
- **Mobile gate app (`apps/mobile`).** `GateScreen` includes **Scan SMS** (`src/gate/sms-ocr.ts`),
  capturing multi-frame snapshots from the camera (or a photo fallback) and matching partial SMS
  text offline against the downloaded gate bundle, with an uncluttered single-header scanner UI.
- A code read from an SMS is checked exactly like a typed code (method `code`): no signature, logged
  as manual, with the usual duplicate and revocation checks. It is no stronger than a typed number.
- The strict console CSP adds `'wasm-unsafe-eval'` so WebAssembly can compile (it does not allow
  JavaScript `eval`) and `worker-src 'self'` for the same-origin worker (no `blob:` workers).
- `extractShortCode` also learned the `Namba:` label used by the current Swahili SMS templates.

## Consequences

- Web dependencies: `tesseract.js` (lazy-loaded) and, for the build only, `@tesseract.js-data/eng`.
  The web image's `public/` grows by about 15 MB.
- The Expo gate app is unchanged: on-device OCR there needs a native ML Kit module and a new EAS
  build. Revisit if the native app becomes the main gate device.
- Console pages are not cached by the service worker, so a gate cannot reload the scanner offline;
  that limit applies to the whole web gate, not only to Scan SMS.
