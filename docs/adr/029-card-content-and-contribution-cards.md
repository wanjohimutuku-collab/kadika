# ADR 029: organiser-written card content and contribution cards

Status: accepted. The API, schema, card rendering and message wording are built; the editor screens are not.

## Context

Until now every card and SMS used our wording and was sent by "Kamati ya …". Families asked to say their own
words, to be named as the sender, to leave out parts of the card (no QR for a relative who will not attend),
and to ask some people only for a contribution, with no RSVP and no gate entry.

## Decision

1. **One validated document per event.** `events.card_content` (jsonb, migration 0015, default `{}`) holds
   everything the organiser can change, checked by `cardContentSchema` (`packages/schemas/src/card-content.ts`)
   on every write: strict objects, length limits, no unknown keys. Every field is optional; what is not set
   falls back to the built-in wording. A text exists per language; a language left empty falls back to the other
   one, then to the built-in text (`pick`).
2. **Sender.** `sender.kind` is `family | committee | couple | host | custom`, with an optional name, phone and
   a replacement trust line (`{sender}` is filled in). New events start as `family`; events made before this
   keep `committee` so their cards do not change.
3. **Invitation card.** Eyebrow, greeting (`{guest}`), main message, programme (up to 12 lines), venue and dress
   notes, RSVP question and button labels, closing and footer notes, and on/off switches for the map, dress code,
   calendar, QR, RSVP and pledge sections. The QR block stays black on white whatever the organiser writes.
4. **Contribution cards.** `guests.card_kind` is `invitation` (default) or `contribution`. A contribution guest
   gets a card that asks for a contribution and nothing else: no RSVP, no QR. They are therefore left out of the
   gate bundle, the print PDF, the invitation funnel (counted separately as `contributionGuests`) and the
   automatic T-14/7/1 reminders. The card has its own texts, suggested amounts (up to six), a last day to
   contribute, and switches for the goal, the event details and the amount raised so far. **Progress is off
   unless the organiser turns it on**, because everyone holding a contribution card would see the total.
5. **Message wording.** The organiser may replace the invitation, reminder, contribution and pledge-reminder SMS.
   Templates use a fixed list of placeholders per message (`TEMPLATE_VARS`), must keep `{link}` so the guest can
   open the card, and are at most 480 characters. `services/messages.ts` (`composeSms`) is the one place that
   builds a message: the organiser's template wins, else the built-in text. WhatsApp keeps the wording Meta
   approved, so custom text applies to SMS only; contribution messages have their own WhatsApp template
   (`WHATSAPP_TEMPLATE_CONTRIBUTION`, `_KE`).

## Not done

- The editor screens in the console and the mobile app. Their Swahili and English strings are already in
  `packages/i18n` under `content.*`, and the API accepts `cardContent` on create and update.
- A native-speaker review of the new Swahili strings (`sw.json` is still marked unreviewed).
- Cover photo and per-section reordering stay as they were.

## Addendum: card categories (occasions)

`occasionOf(kind)` (`packages/schemas/src/domain.ts`) maps the free-text event kind to `wedding | engagement |
sendoff | other` (Harusi, Uchumba/engagement, Send-off). It only picks built-in wording; the kind stays free
text (ADR 024). Each category has a default invitation message (`card.occWeddingBody`, `occEngagementBody`,
`occSendoffBody`) and engagement/send-off have their own contribution-card message
(`occEngagementContrib`, `occSendoffContrib`). The organiser's own text always wins. Events with no kind keep
their cards exactly as before. The three categories are therefore: invitation cards for wedding, engagement and
send-off, and contribution cards for each of those occasions (a guest with `card_kind = contribution`).

## Addendum: English is the default language

`defaultLocale` is now `en` everywhere (web, mobile, SEO alternates, sitemap, new events and guests; migration
0018 changes the column defaults, existing rows keep their language). Swahili stays one tap away. To stop
languages mixing on one card, the three known kinds (Wedding/Harusi, Engagement/Uchumba, Send-off) are shown
in the reader's language by `eventKindLabel`; a kind the organiser typed themselves is shown as written. The
default "sent by" line is also localised (`defaultSender`).
