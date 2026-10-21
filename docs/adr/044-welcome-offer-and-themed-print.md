# ADR 044: Buying cards at sign-up, and printed cards in the card's own theme

Status: accepted. Built with tests; the welcome flow is web only (the mobile app keeps its own event
creation until it gets a buying screen).

## Context

ADR 042 lets hosts buy cards from the Plan page, but a new host only finds that page after they hit a
limit. To sell, the offer has to come at the moment the host is most invested: right after creating
their event, with their own card in front of them. Separately, printed cards were drawn in fixed green
and gold, so a host who chose Navy & Silver for the digital card got a different-looking printed card.

## Decision

1. **Welcome flow** (`/app/e/:id/karibu`). Creating an event in the web wizard now leads here instead of
   the overview.
   - **Anticipation first.** The host's own card (their names, date, venue and theme) is shown slightly
     blurred while four steps tick off about every 0.85 s: design and colours, names and date, each
     guest's QR and card number, ready to send and print. A progress bar and the step list sit in a
     `role="status"` region with `aria-busy` until done. With `prefers-reduced-motion` the steps are
     complete at once and nothing animates. On small screens the preview is capped and faded so the
     progress stays visible.
   - **Then the offer.** "How many guests will you invite?": quick picks (50–500), a quantity field, the
     live tier price and total (ADR 042 tiers), the reminders included, and three reassurances: a card
     counts once, 4 reminders per card, and contributions go straight to the host. **Buy** opens the same
     purchase sheet as the Plan page (pay by phone or by bank or cash). Once paid, the host goes to
     importing guests.
   - **Soft paywall.** "Start with N free cards" is always offered: a host can try the product first.
     Once charging is enforced (ADR 042), sending or printing beyond the free cards asks them to buy.
2. **One purchase sheet** (`BuySheet`), shared by the Plan page and the welcome flow, so both pay the
   same way and poll a pending phone payment the same way.
3. **Printed cards follow the digital theme.** The print PDF resolves the event's `brand_theme`
   (`themeId` plus any custom palette) exactly as the digital card does, and draws the paper colour,
   the ornament band and diamonds, the couple's names, the text and the rule above the QR band in those
   colours, converted to CMYK. The QR block stays pure black on white whatever the theme (§6.4).

## Consequences

- A host who skips the offer can still buy at any time from the Plan page.
- The welcome flow shows once, right after creation; returning to `/app/e/:id/karibu` shows it again,
  which is harmless.
- Very dark custom paper colours print as dark paper; the contrast rules on palettes (ADR 006) keep the
  text readable.
