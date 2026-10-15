# 017 — Phase 3 delivery: encrypted card token, provider-agnostic send

Status: accepted (open decisions §15.2–15.3 stay on defaults behind the interface, with fakes)

## Context

Sending an invitation needs the raw card link `…/c/<token>`, but only the SHA-256 hash is stored (§9), so a resend or a later batch send could not rebuild the link.

## Decision

- `invitations.token_enc` stores the card token encrypted with AES-GCM (the same `KEY_ENC_SECRET` used for signing keys). The hash stays the lookup key for guests; the encrypted copy is only read by the delivery service. Rows created before migration 0006 have no copy: the first send rotates their token once (the old hash is retired, so an old link says "replaced").
- `DeliveryService` sends through `MessagingProvider` interfaces (`whatsapp`, `sms`), records every attempt in `message_log`, retries with backoff, and falls back from WhatsApp to SMS on failure. It is queue-agnostic: it takes a `run` function per guest so a BullMQ worker (Redis) can wrap it later without changing the logic.
- Real gateways (WhatsApp Cloud API, Beem / Africa's Talking) are not chosen yet; the fakes are the default in every environment.
- Link in the message: `${SHORT_BASE_URL}/s/<token>` (ADR 016).

## Consequences

A database leak plus the encryption key would expose card links, not signed QR keys' plaintext beyond what the key already protects. Reissue overwrites the encrypted copy. The Phase 3 TODO items (BullMQ, delivery webhooks, reminders, PDF batch) build on this service.
