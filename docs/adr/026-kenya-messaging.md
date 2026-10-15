# ADR 026: messaging routes by country (Phase 2 of Kenya support)

Status: accepted. Builds on ADR 025 and `docs/plan/kenya-product-support.md`.

## Decision

1. **SMS route follows the number.** `smsFor(deps, country)` picks the provider from the destination
   number's own dial code, falling back to the event country only for numbers we cannot classify.
   Tanzania keeps `deps.sms` (unchanged); every other country needs an entry in `deps.smsByCountry`.
   A Kenyan number is never sent through the Tanzanian gateway. With no route, a sign-in code request
   fails with `503 unavailable` (`sms_route_missing`) and an invitation is logged as failed, so the
   WhatsApp-to-SMS fallback and retry tooling behave as usual.
2. **Sign-in codes by number country.** `+254` numbers get an English text through the Kenyan route;
   `+255` numbers are unchanged.
3. **Kenyan adapter.** `AfricasTalkingProvider` (`POST /version1/messaging`, form-encoded, `apiKey`
   header, E.164 with `+`) behind `MessagingProvider`. It treats a per-recipient rejection code as a
   failure even when HTTP says 201, never echoes response bodies into errors, and rounds the quoted cost
   up to a whole shilling (cost columns hold whole currency units). Delivery reports arrive as
   form-encoded callbacks at `POST /v1/webhooks/sms/africastalking?secret=...` (the provider cannot set
   headers, so the shared secret `WEBHOOK_SECRET` rides in the query string and is compared in constant
   time). Fakes stay the default in tests and local development (`SMS_PROVIDER_KE=fake`).
4. **Link domain per country.** `SHORT_BASE_URL_KE` overrides `SHORT_BASE_URL` for Kenyan events so
   Kenyan guests do not receive a `.co.tz` link (trust, P1 and P7). Unset means the default domain.
5. **WhatsApp templates per country.** Templates are approved by Meta with a fixed number of
   parameters. A country with its own templates (`WHATSAPP_TEMPLATE_*_KE`) uses only those; a country
   without any must not borrow Tanzania's (wrong parameter count is rejected), so it falls back to plain
   text and then to SMS. Kenyan templates take one host field (`hosts`) so a single host works:
   invite = hosts, date, link, code; reminder = hosts, days, link, code; pledge = name, hosts, pledged,
   balance, link. Tanzania's layout (A, B, ...) is unchanged. Wording for submission:
   `docs/ops/whatsapp-templates-kenya.md`.
6. **Cost tables.** `SMS_PRICE_PER_SEGMENT` by currency (TZS 25, KES 1) are assumptions until provider
   contracts exist; clients price estimates in the event's currency.

## Not done here

Sender ID registration, Safaricom and Airtel approval, WhatsApp template approval, a Kenya SMS contract
and consent and sending-hour rules are business and legal steps (plan, Phase 0). Delivery reports for
Africa's Talking are push only; there is no polling lookup. Kenya payments are Phase 3.
