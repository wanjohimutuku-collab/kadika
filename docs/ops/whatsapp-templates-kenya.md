# WhatsApp templates for Kenya (to submit to Meta)

Category: Utility for `invite`, `reminder` and `pledge` (confirm the category with Meta; invitations to
a private event a guest has not opted into may be reviewed as Marketing). Languages: `en` and `sw`. Names
below are suggestions; set them in `WHATSAPP_TEMPLATE_INVITE_KE`, `WHATSAPP_TEMPLATE_REMINDER_KE` and
`WHATSAPP_TEMPLATE_PLEDGE_KE`. The API sends parameters in this order (ADR 026). Have native Kenyan
speakers review the wording before submission.

## invite (`harusi_invite_ke`), 4 parameters

| #     | Meaning                                |
| ----- | -------------------------------------- |
| {{1}} | Hosts (one name, or two joined with &) |
| {{2}} | Date, for example 16 Jan 2027          |
| {{3}} | Card link                              |
| {{4}} | Card number, for example KH-4821       |

- en: `Hello! {{1}} invite you to their celebration on {{2}}. Open your invitation here: {{3}} Your card number is {{4}}.`
- sw: `Habari! {{1}} wanakualika kwenye sherehe yao tarehe {{2}}. Fungua mwaliko wako hapa: {{3}} Namba ya kadi yako ni {{4}}.`

## reminder (`harusi_reminder_ke`), 4 parameters

| #     | Meaning                  |
| ----- | ------------------------ |
| {{1}} | Hosts                    |
| {{2}} | Days left, for example 7 |
| {{3}} | Card link                |
| {{4}} | Card number              |

- en: `Reminder: the celebration hosted by {{1}} is in {{2}} days. Your invitation: {{3}} Card number: {{4}}.`
- sw: `Ukumbusho: sherehe ya {{1}} ni baada ya siku {{2}}. Mwaliko wako: {{3}} Namba ya kadi: {{4}}.`

## pledge (`harusi_pledge_ke`), 5 parameters

| #     | Meaning                                             |
| ----- | --------------------------------------------------- |
| {{1}} | Guest name                                          |
| {{2}} | Hosts                                               |
| {{3}} | Pledged amount with currency, for example KES 5,000 |
| {{4}} | Balance with currency                               |
| {{5}} | Card link to pay                                    |

- en: `Hello {{1}}, your pledge for the celebration of {{2}} is {{3}}, balance {{4}}. You can pay from your card: {{5}}`
- sw: `Habari {{1}}, ahadi yako kwa sherehe ya {{2}} ni {{3}}, salio {{4}}. Unaweza kulipa kwenye kadi yako: {{5}}`

Notes: parameters cannot be empty, which is why Kenya uses one `hosts` field instead of two names. Do not
put a PIN, password or payment request in any template. Until these are approved, Kenyan invitations fall
back to SMS.
