# 019 — Print cards: pdf-lib, and why cards print a QR of about 40 mm

Status: accepted

## Decision

- `POST /v1/events/:id/cards/pdf` builds PDFs on the API with `pdf-lib` and the `qrcode` core, drawing the QR as vector squares (CLAUDE.md §3 suggested @react-pdf/renderer or Playwright; pdf-lib needs no browser or React in the API image). Formats: `a6`, `a5` (3 mm bleed, crop marks), `a4x4` (2 × 2 A6 cut-and-collate) and `test`.
- `print/spec.ts` holds the §6.4 limits (25 mm, 0.8 mm module, 4-module quiet zone, 12 pt code) and `planQr` throws instead of producing a smaller or denser code. Tests assert it.
- Standard PDF fonts (Times, Helvetica) are used for now, not embedded custom fonts; characters outside Latin-1 print as `?` rather than failing a batch. Embedding a subsetted font is a follow-up.

## Finding

The signed payload (`v1.<8>.<8>.<n>.<ver>.<86-char signature>`) is about 120 characters, so error-correction M needs a 53–57 module code. At the 0.8 mm minimum module size that is at least 42 mm, not 25 mm, so a "25 mm" QR can only meet the 25 mm rule with modules of about 0.5 mm. Cards use 0.9 mm modules (about 48 mm including the quiet zone). The test sheet prints 20/25/30 mm as the spec asks, plus the card size, and `docs/qa/print-test.md` makes the card-size row the one that must scan everywhere.

If a smaller printed code is ever needed, shorten the payload (e.g. a truncated signature or a server-checked short id) instead of reducing module size.
