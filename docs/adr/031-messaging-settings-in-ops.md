# ADR 031: SMS and WhatsApp settings move to the staff panel

Status: accepted. API, database, web panel (`/ops/messaging`) and tests are built.

## Context

SMS (NextSMS, Africa's Talking) and WhatsApp (Evolution API, Cloud API) were configured only through
environment variables (ADR 017, 018, 020, 026). Changing a sender ID, rotating a token or adding a newly
approved template meant editing Coolify variables and redeploying, which only someone with server access
could do.

## Decision

1. **Staff edit providers in `/ops/messaging`.** One card per route: SMS Tanzania (`fake | nextsms`),
   SMS Kenya (`fake | africastalking`, shown only with `KENYA_ENABLED`) and WhatsApp
   (`fake | evolution | cloud`, with the approved template names for both countries). The field list lives in
   `@harusi/schemas/messaging-settings` so the API and the panel cannot disagree.
2. **Admin staff only** (`staff_role = admin`, new permission `settings`): these hold provider secrets.
   Support and billing staff see a refusal.
3. **Stored encrypted.** Table `messaging_settings` (one row per route). The whole provider config is
   AES-GCM encrypted with `KEY_ENC_SECRET`, like event signing keys (§9).
4. **Secrets never go back to the browser.** The panel shows `…abcd` (last four characters). Leaving a secret
   empty keeps the saved one; changing provider drops the old provider's secrets.
5. **Applies without a restart.** A save builds the providers first: if a required field is missing the save
   is refused (`validation`, with `details.missing`) and nothing is stored. Otherwise the live `deps.sms`,
   `deps.whatsapp`, `deps.smsByCountry.KE` and the webhook secrets in `deps.config` are swapped. Every API
   instance re-reads the table each minute, so a save on one reaches the others within 60 s.
6. **Environment variables stay as the fallback.** A route with no saved row uses the env variables as
   before, so existing deployments keep working unchanged. "Back to env" deletes the row.
7. **Audit.** Saves, resets and test messages are written to `audit_log` (`ops.messaging.*`) with the names
   of the fields that changed, never their values, and only the last three digits of a test number (§12).
8. **Test message.** Each card can send one test message through the live provider to a number of that
   route's country.

## Not moved

`WEBHOOK_SECRET`, `WHATSAPP_FALLBACK_HOURS`, `KENYA_*` flags and payment providers stay in the environment:
they are infrastructure or rollout levers, not provider credentials.
