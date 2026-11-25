# WhatsApp Cloud API templates

Every business-initiated WhatsApp message (invitations, reminders, pledge reminders, contribution
cards, kumbukumbu, login codes) must use a template Meta has approved. Without one the Cloud provider
sends plain text, which WhatsApp only delivers inside a 24-hour customer window, so the guest gets the
SMS fallback instead (ADR 020).

Source of truth: [`infra/whatsapp/templates.json`](../../infra/whatsapp/templates.json). Submit them
with [`infra/ops/whatsapp-templates.ps1`](../../infra/ops/whatsapp-templates.ps1). Each template is
created in Swahili (`sw`) and English (`en`) under the same name; the API picks the guest's language.

## The 8 templates (16 with both languages)

| Name                    | Kind         | Category       | Image header | Env var(s)                                                    |
| ----------------------- | ------------ | -------------- | ------------ | ------------------------------------------------------------- |
| `kadisasa_card`         | invite       | Utility        | yes          | `WHATSAPP_TEMPLATE_INVITE`                                    |
| `kadisasa_reminder`     | reminder     | Utility        | yes          | `WHATSAPP_TEMPLATE_REMINDER`                                  |
| `kadisasa_card_ke`      | invite       | Utility        | yes          | `WHATSAPP_TEMPLATE_INVITE_KE`                                 |
| `kadisasa_reminder_ke`  | reminder     | Utility        | yes          | `WHATSAPP_TEMPLATE_REMINDER_KE`                               |
| `kadisasa_pledge`       | pledge       | Utility        | no           | `WHATSAPP_TEMPLATE_PLEDGE`, `WHATSAPP_TEMPLATE_PLEDGE_KE`     |
| `kadisasa_contribution` | contribution | Utility        | yes          | `WHATSAPP_TEMPLATE_CONTRIBUTION`, `..._CONTRIBUTION_KE`       |
| `kadisasa_memories`     | memories     | Utility        | no           | `WHATSAPP_TEMPLATE_MEMORIES`, `WHATSAPP_TEMPLATE_MEMORIES_KE` |
| `kadisasa_otp`          | otp          | Authentication | no           | `WHATSAPP_TEMPLATE_OTP`, `WHATSAPP_TEMPLATE_OTP_KE`           |

Only invite and reminder differ by country: Tanzania sends two host names, Kenya one `hosts` field
(ADR 026). Pledge, contribution, memories and OTP have the same parameters in both countries, so one
template serves both. Set the `_KE` variables to the same names: once any `_KE` variable is set, Kenya
uses only its own list, and an empty entry there means plain text, then SMS.

## Parameters and wording

Order must match `apps/api/src/services/delivery.ts` and `auth/otp.ts`.

**invite** (TZ, `kadisasa_card`): {{1}} host A, {{2}} host B, {{3}} date, {{4}} card link, {{5}} card number

- sw: Kadi yako ya mwaliko wa sherehe ya {{1}} na {{2}} tarehe {{3}} iko tayari. Ifungue hapa: {{4}} Namba ya kadi yako ni {{5}}. Ionyeshe getini siku ya sherehe.
- en: Your invitation card for the celebration of {{1}} and {{2}} on {{3}} is ready. Open it here: {{4}} Your card number is {{5}}. Show it at the entrance on the day.

**reminder** (TZ): {{1}} host A, {{2}} host B, {{3}} days left, {{4}} card link, {{5}} card number

- sw: Ukumbusho: sherehe ya {{1}} na {{2}} imebaki siku {{3}}. Kadi yako ya mwaliko: {{4}} Namba ya kadi: {{5}}. Tunakusubiri.
- en: Reminder: the celebration of {{1}} and {{2}} is in {{3}} days. Your invitation card: {{4}} Card number: {{5}}. We look forward to seeing you.

**invite_ke** (`kadisasa_card_ke`): {{1}} hosts, {{2}} date, {{3}} card link, {{4}} card number

- sw: Kadi yako ya mwaliko kutoka kwa {{1}} kwa sherehe ya tarehe {{2}} iko tayari. Ifungue hapa: {{3}} Namba ya kadi yako ni {{4}}. Ionyeshe getini siku ya sherehe.
- en: Your invitation card from {{1}} for the celebration on {{2}} is ready. Open it here: {{3}} Your card number is {{4}}. Show it at the entrance on the day.

**reminder_ke**: {{1}} hosts, {{2}} days left, {{3}} card link, {{4}} card number

- sw: Ukumbusho: sherehe ya {{1}} ni baada ya siku {{2}}. Kadi yako ya mwaliko: {{3}} Namba ya kadi: {{4}}. Tunakusubiri.
- en: Reminder: the celebration hosted by {{1}} is in {{2}} days. Your invitation card: {{3}} Card number: {{4}}. We look forward to seeing you.

**pledge**: {{1}} guest name, {{2}} hosts, {{3}} pledged (with currency), {{4}} balance, {{5}} card link

- sw: Habari {{1}}, huu ni ukumbusho wa ahadi yako ya mchango kwa sherehe ya {{2}}. Ahadi: {{3}}. Salio: {{4}}. Angalia kadi yako hapa: {{5}} Asante kwa mchango wako.
- en: Hello {{1}}, this is a reminder of your pledge to the celebration of {{2}}. Pledged: {{3}}. Balance: {{4}}. View your card here: {{5}} Thank you for your support.

**contribution**: {{1}} hosts, {{2}} sender or committee, {{3}} card link

- sw: Habari! Unakaribishwa kuchangia sherehe ya {{1}}. Mwaliko huu umetumwa na {{2}}. Fungua kadi yako ya mchango hapa: {{3}} Asante.
- en: Hello! You are invited to contribute to the celebration of {{1}}. This invitation is sent by {{2}}. Open your contribution card here: {{3}} Thank you.

**memories** (ADR 050): {{1}} hosts, {{2}} link

- sw: Habari! {{1}} wameshiriki nawe kumbukumbu za sherehe yao. Ziangalie hapa: {{2}} Asante kwa kuwa sehemu ya siku yao.
- en: Hello! {{1}} have shared memories of their celebration with you. See them here: {{2}} Thank you for being part of their day.

**otp**: {{1}} 6-digit code. Authentication templates use Meta's fixed wording ("{{1}} is your
verification code", security note, "expires in 5 minutes" to match `CODE_TTL_MS`) and a copy-code
button. The provider retries with the button parameter automatically.

Wording choices: "sherehe/celebration", not "harusi/wedding", because the same templates serve
send-offs, kitchen parties, birthdays and the rest. The pledge template says "view your card", never
"pay here": KadiSasa does not collect guests' contributions. No variable starts or ends a body and
numbering runs in order, which Meta requires.

## Submitting

1. In Meta Business Manager, note the WhatsApp Business Account id (WABA id) and, for image headers,
   the Meta app id. Use the system-user token (`WHATSAPP_TOKEN`) with `whatsapp_business_management`.
2. Preview, then submit:

   ```powershell
   $env:WHATSAPP_TOKEN = '<token>'
   .\infra\ops\whatsapp-templates.ps1 -WabaId <waba id>
   .\infra\ops\whatsapp-templates.ps1 -WabaId <waba id> -Apply -ImageHeader -AppId <app id> -SampleImage .\sample-card.png
   ```

   `-ImageHeader` uploads the sample card so reviewers see it, and adds an IMAGE header to invite,
   reminder and contribution. Leave it off for text-only templates.

3. Check review: `.\infra\ops\whatsapp-templates.ps1 -WabaId <waba id> -Status`.
4. Once approved, set the env vars from the table (Coolify), plus `WHATSAPP_TEMPLATE_IMAGE_HEADER=1`
   only if you submitted with `-ImageHeader`. The flag must match: a template approved with a header
   rejects a message sent without one.
5. Send a test from Ops → Messaging settings.

## Review risks

- Meta may recategorise invitations as **Marketing** (higher price, and guests can opt out). The
  wording is transactional on purpose; if Meta changes the category, the template still works.
- A rejected template can be edited and resubmitted under the same name; a deleted name cannot be
  reused for 30 days.
- Tanzanian invite/reminder take two host names. A single-host event sends "—" in place of the second
  name. Moving Tanzania to the one `hosts` field (like Kenya) would fix this but needs a code change.
- Have native speakers (Tanzanian and Kenyan Swahili) read the wording before submitting.
