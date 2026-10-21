# ADR 040: sending by card type, and wording that follows the reader's language

Status: accepted. API, client, web console, mobile app and guest card are built.

## Context

Two things came up together once contribution cards (ADR 029) were in use.

Organisers wanted to ask some people for a contribution first and invite them later, without the other group
getting anything. `guests.card_kind` already existed, but every send, preview and reminder went to everyone.

Cards and messages also mixed languages. A known kind such as Uchumba was shown as typed, so an English guest saw
"Uchumba". The Swahili "of" was hard-coded as "ya", which is wrong for "uchumba" ("uchumba wa"). The default
sender, stored in Swahili, appeared untranslated in English previews and on English guest cards. The Swahili
contribution greeting said "yetu", which does not agree with every kind.

## Decision

### Sending by card type

1. **A send can name one card type.** `SendInput.cardKind` is `invitation` or `contribution` (also on the preview
   and on a scheduled send). When it is left out, a send reaches both types, as before. `pick` filters guests on
   `guests.card_kind` only when a type is given.
2. **Older schedules keep going to both.** Migration 0021 adds `scheduled_sends.card_kind` as a nullable column.
   Rows made before it have `null`, which `run` passes on as "no type", so they send to both types.
3. **Reminders are for invitations.** A reminder with `cardKind: contribution` is a `validation` error
   (`assertCardKindFits`): contribution cards are followed up with pledge reminders, which know who still owes.
4. **Contributions off blocks contribution sends.** With `pledges_enabled` off, a contribution send, and
   scheduling one, is a `conflict` with reason `contributions_off` (`assertContributionsOpen`). The card would only
   say "closed". The console and the mobile app explain this and disable the send.
5. **Preview.** `POST /v1/events/:id/invitations/preview` returns the count, the split by channel and the guests
   without a phone number, using the same audience and skip rules as `run`, so the numbers match the send.
6. **Changing a guest's type resets them to "not sent".** In `GuestService.update`, when `cardKind` changes, an
   invitation in `sent`, `delivered` or `opened` goes back to `created` and its timestamps are cleared, so the new
   card can be sent. A guest who already answered (`confirmed`, `declined`) keeps the answer. This is how a person
   gets a contribution card first and an invitation later.
7. **Contribution guests are unchanged from ADR 029:** no RSVP, no QR, no gate admission, outside the invitation
   funnel and the automatic reminders.

### Wording that follows the reader's language

1. **Known kinds are named in the reader's language.** `EVENT_KINDS` lists Harusi/Wedding, Send-off/Send-off and
   Uchumba/Engagement with aliases in both languages. `eventKindLabel(kind, locale)` returns the name in the
   reader's language for a known kind and the text as written for anything else. The new-event form, suggestions
   (`eventKindSuggestions`) and default title (`defaultEventTitle`) follow the interface language too.
2. **The small word agrees with the kind.** `eventKindOf(kind, locale)` returns the kind with its "of": "Uchumba
   wa", "Harusi ya", "Send-off ya" in Swahili, "Wedding of" in English. A kind the organiser typed is assumed to
   take "ya", the most common ending. The SMS texts (invitation, reminder, contribution, pledge reminder), the guest
   card's eyebrow, title and calendar entry, the console card and print previews, the web manifest, the
   link-preview image and the default sender use it.
3. **The default sender is re-worded for English readers.** The stored `senderName` is the organiser's own text or
   the Swahili default. `senderNameFor(event, locale)` (`packages/api-client/src/domain/sender.ts`) returns the
   organiser's own sender name if there is one. If the stored name is only the Swahili default it builds the default
   for the locale asked for ("The Asha & Juma family", "The engagement committee of …"). Any other stored text is
   kept. The console preview (web and mobile send screens) and the guest card use it.
4. **No possessives that must agree with the kind.** Swahili strings avoid words like "yetu" that would need to
   agree with the noun. `contribGreeting` reads "Tunakuomba uchangie katika {kindOf} {couple}", and the English
   pledge reminder says "contribution" like the rest of the English text.

## Consequences

- A contribution campaign can run ahead of invitations and then be followed by invitations to the same people,
  with no change to guests who were not chosen.
- The type is chosen per send. A send that names none still reaches everyone, so existing clients and schedules
  behave as before.
- Tests cover the particle for all three kinds, the sender wording, sending by type through the API and the HTTP
  client, and the card render of an engagement in both languages.

## Known limitations

- **The guest card ignores the guest's stored language.** `apps/web/app/c/[token]/route.ts` takes the language from
  the locale cookie and falls back to Swahili. `guests.language` is used only for SMS. An English-speaking guest
  who opens the link with no cookie sees Swahili until they tap EN. Passing the guest's language to the card is
  not done.
- **The API's SMS sender is not re-worded.** `senderOf` in `apps/api/src/services/messages.ts` uses a stored
  `senderName` as it is. If the Swahili default was saved (the console settings form writes back what it shows),
  an English guest's contribution SMS names that sender in Swahili. Only the console preview and the guest card
  call `senderNameFor`.
- **The link-preview image and the web manifest are Swahili only.** They are built with the `sw` locale, so they get
  the right "wa"/"ya" but not English words.
- A typed kind that takes "wa" in Swahili is not detected; only Uchumba is special-cased.
- WhatsApp templates keep the wording Meta approved (ADR 024, 029), so the agreement applies to SMS and the card.
