# 008 — Formatting, locale and print-rule interpretations

Status: accepted

- **Locale**: Swahili unless the `NEXT_LOCALE` cookie says otherwise (set by the SW | EN chip, 1 year). `Accept-Language` is ignored on purpose — §10 is Swahili-first. No locale prefix in URLs, so SMS links stay short.
- **Time**: Africa/Dar_es_Salaam is UTC+3 with no DST. Display formatting shifts by +3 h without a timezone library (keeps the guest card small); calendar maths in the console (`daysUntil`) uses `date-fns` + `@date-fns/tz`. Swahili month and weekday names are built in (date-fns has no `sw` locale).
- **Swahili time** is shown with the 24-hour clock: `Saa 10:00 jioni (16:00)`. Swahili clock time is ambiguous to some readers; showing both avoids missed weddings.
- **Short-code example**: §6.1 says `KH-4821`, but its own alphabet excludes `1`. Examples and seeds use `KH-4826`.
- **Print QR size** (§6.4): "minimum printed size 25 mm" is read as the QR _symbol_ (without its quiet zone) and "module ≥ 0.8 mm" as symbol size ÷ module count. A 29-module (version 3) code therefore needs ≥ 25 mm; a 37-module code needs ≥ 29.6 mm. The Kadi page blocks PDF downloads that break either rule.
- **Phone display**: `0712 345 678`; stored as E.164. The phone field shows a fixed `+255` prefix and accepts any Tanzanian format.
- **Display serif** (Cormorant Garamond 600, latin) only on the guest card, the print card and their console previews; system fonts everywhere else, including the landing page.
