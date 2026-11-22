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
- `extractShortCodeFromOcr` (`@harusi/schemas/short-code`) takes the code from the text. Links are
  removed first, so a code-like run inside the card token is never taken. Look-alike characters
  (`5`↔`S`, `8`↔`B`, …) are repaired **only** directly after a label (`Namba`, `Code`, `Kadi`,
  `Card`, …), so a status bar such as `4G 85%` cannot turn into a code.
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
