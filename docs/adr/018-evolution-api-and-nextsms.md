# 018 — WhatsApp via Evolution API, SMS via NextSMS, BullMQ for scheduled work

Status: accepted (answers open decisions §15.2 and §15.3; replaces the WhatsApp Cloud API default)

## Decision

- **WhatsApp:** a self-hosted Evolution API v2 instance. `EvolutionWhatsAppProvider` calls `POST {EVOLUTION_BASE_URL}/message/sendText/{instance}` with the instance token in the `apikey` header and `{ number, text }` (digits only, no `+`, no JID). The message id is `key.id`.
- **SMS:** NextSMS (`POST https://messaging-service.co.tz/api/sms/v1/text/single`, HTTP Basic, `{ from, to, text }`, response `messages[0].messageId`). Delivery is read by polling `/api/sms/v1/reports?messageId=`; `POST /v1/webhooks/sms` also accepts `{ messageId, status }` if a callback is configured.
- **Delivery webhooks:** `POST /v1/webhooks/whatsapp` accepts Evolution `messages.update` bodies (`DELIVERY_ACK` → delivered, `READ` → read). Both webhook routes require the `x-webhook-secret` header (`WEBHOOK_SECRET`), compared in constant time, and are off when the secret is unset.
- **Scheduled work:** one BullMQ repeatable `tick` job (every 15 minutes, Redis) runs the WhatsApp→SMS fallback for invitations undelivered after `WHATSAPP_FALLBACK_HOURS`, the T-14/T-7/T-1 reminders (08:00–20:00 Dar es Salaam only, each guest once per milestone, respecting the card-page opt-out) and the SMS report poll. `POST …/invitations/send?async=1` queues a send with retries when Redis is configured; otherwise sends run inline.

## Risks and what is unverified

- Evolution runs the unofficial WhatsApp Web protocol (Baileys): numbers can be banned for bulk messaging. Mitigations: SMS fallback, per-guest (not blast) sending, a dedicated number. Moving to the official Cloud API later only needs a new provider.
- The Evolution and NextSMS request shapes were taken from public client libraries and docs, not tested against live accounts. NextSMS's response and report formats in particular should be confirmed with a real sandbox account before launch.
- The BullMQ wiring (`worker.ts`) is covered by unit tests of the jobs it runs, not by a test against a live Redis.
