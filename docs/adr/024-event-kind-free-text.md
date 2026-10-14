# ADR 024: free-text event kind

Status: accepted

## Context

The product was wedding-only. Organisers also need engagement parties (uchumba), send-offs and
occasionally other private celebrations. Corporate events, trips, tours and paid ticketing were
considered and set aside: they need ticket sales, inventory and manifests, which is a different product.

## Decision

- `events.event_kind` is a nullable free-text label (max 40 characters) that the organiser writes
  or picks from three suggestions: Harusi, Send-off, Uchumba (`EVENT_KIND_SUGGESTIONS`).
- It is display only. It does not change any behaviour, so there is no enum, no presets and no
  per-type feature switches. Pledges stay governed by the existing `pledges_enabled` flag.
- The second host name (`partnerB`) is optional so a send-off or a single host works. The host names
  are still stored in `events.couple_names`, joined with ` & `. Renaming that column would touch ~40
  files for no behavioural gain.
- The default "sent by" line is `Kamati ya {kind} ya {hosts}` and falls back to `Kamati ya {hosts}`.

## Wording that follows the kind

Guest card eyebrow, page title and calendar entry, link preview image, PWA name, SMS invite and
reminder texts, the pledge reminder, the default sender line and the print and preview cards all use
the kind (`eventKindLabel`, default Harusi/Wedding). Organiser screens, settings and privacy text say
"event / tukio" instead of "wedding / harusi". The marketing landing page still talks about weddings.

## Consequences

- Existing events have a null kind and behave as before (the UI treats it as Harusi).
- WhatsApp templates are approved by Meta with fixed wording and two name slots; the kind and a
  single host are not reflected there until the templates are re-registered.
- Not built: pass types, capacities, multi-session events, ticket sales. Revisit with a separate spec.
