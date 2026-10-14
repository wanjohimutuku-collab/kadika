# Print test (Phase 3 acceptance)

Automated checks (`apps/api/src/print.test.ts`) prove the PDF generator refuses a QR under 25 mm or with modules under 0.8 mm, always uses a 4-module quiet zone, error correction M, and prints the short code at 12 pt or more. They cannot prove a printer and a phone can read the result. Do this by hand before each print run.

## Steps

1. In the console (Kadi → Kipimo cha majaribio) or with `POST /v1/events/:id/cards/pdf {"format":"test"}`, download the test sheet. It has the same code at 20, 25 and 30 mm plus the size actually used on cards (about 48 mm square including the quiet zone, because the signed payload is dense and modules must be at least 0.8 mm).
2. Print it on the shop's actual printer and paper at **100 % scale** (no "fit to page").
3. Scan each code with **at least three different phones** (one low-end Android, one iPhone or mid-range Android, one older Android 8). Use the normal camera app and the gate app.
4. Record the result below. The **card-size** code must scan first time on all phones. The 20, 25 and 30 mm codes have modules under 0.8 mm; they are comparison rows and are expected to fail first on a poor printer.
5. If the card-size code fails anywhere: do not print the batch. Try a better paper (matte, not glossy), a higher-quality print setting, or a different printer.
6. Print one real A6 card (`format: a6`) and scan it the same way before sending the whole batch.

## Result log

| Date | Printer / paper | Phone | 20 mm | 25 mm | 30 mm | Card size | Real card |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |

## Print shop settings

- A6 (default) or A5, PDF has 3 mm bleed and crop marks; cut-and-collate sheet is A4 with 4 × A6.
- Colours are CMYK; the QR is pure black on white.
- File name: `{event}-{guest-code}.pdf` for a single card, `{event}-{format}-batch.pdf` for a batch.
