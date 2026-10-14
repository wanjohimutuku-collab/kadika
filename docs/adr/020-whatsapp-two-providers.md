# 020 — WhatsApp: official Cloud API and Evolution API, chosen by config

Status: accepted (extends ADR 018; both are supported, one is active per deployment)

## Decision

`WHATSAPP_PROVIDER` selects the provider behind `MessagingProvider`:

| Value | Provider | Use when |
|---|---|---|
| `fake` | in-memory | tests, local dev (default) |
| `evolution` | `EvolutionWhatsAppProvider` | self-hosted Evolution API, no Meta approval needed, higher ban risk |
| `cloud` | `WhatsAppCloudProvider` | official WhatsApp Business Cloud API, needs a verified Meta business, approved templates |

The delivery service always hands the provider both the plain text and a structured `MessageTemplate` (`kind`, `locale`, positional `params`). Evolution and the fake send the text; the Cloud provider sends the configured approved template with the params, because a business-initiated message (every invitation and reminder) is rejected unless it uses a template.

## Cloud API setup

1. Create a Meta app with the WhatsApp product, a business phone number, and a system-user token (`WHATSAPP_TOKEN`) and the phone number id (`WHATSAPP_PHONE_ID`).
2. Create two **utility** templates in Swahili and English (same names, one per language `sw` and `en`) and set `WHATSAPP_TEMPLATE_INVITE` / `WHATSAPP_TEMPLATE_REMINDER`. Suggested bodies (variables must be numbered, and cannot start or end the text):
   - invite: `Karibu kwenye harusi ya {{1}} & {{2}}, {{3}}. Kadi yako: {{4}} Namba: {{5}}. Asante.`
   - reminder: `Kumbukumbu: harusi ya {{1}} & {{2}} ni baada ya siku {{3}}. Kadi yako: {{4}} Namba: {{5}}. Asante.`
3. Webhook: callback URL `https://<api>/v1/webhooks/whatsapp-cloud`, verify token = `WHATSAPP_VERIFY_TOKEN`, app secret = `WHATSAPP_APP_SECRET`, subscribe to `messages`. `GET` answers Meta's handshake; `POST` requires a valid `X-Hub-Signature-256` and maps `sent/delivered/read/failed` to our statuses.
4. Without a template name the provider sends plain text, which only works inside the 24-hour customer window; first contact then fails and the SMS fallback takes over.

## Unverified

Request and webhook shapes follow Meta's documented Cloud API and were tested against fake HTTP only, not a live Meta account. Template approval and the exact variable rules are Meta's and can change. The link in the template is a card link, not a URL button.
