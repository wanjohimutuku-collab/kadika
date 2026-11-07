# Security, performance, localisation

## 9. Security and trust

- Guest tokens: 128-bit random; store only the **hash**; constant-time compare.
- Private signing keys encrypted at rest (AES-GCM, key from env/secret store); never leave the server.
- Redis rate limiting on OTP, RSVP, pay, token lookup.
- Phone numbers are personal data: collect minimum, support deletion/export, follow Tanzania's Personal Data Protection Act; link a privacy notice from every card.
- Never send attachments/APKs; never ask guests for passwords or OTPs. Landing pages show sender + domain.
- Verify signatures on WhatsApp, SMS and payment webhooks.
- Audit log for admin actions, manual overrides, payment changes.
- Gate PIN brute-force lockout; device registration for gate agents.
- CSP, HSTS, secure cookies; dependency audit in CI.

## 10. Performance, connectivity, localisation

- Swahili default; English toggle; strings in `packages/i18n`. Timezone `Africa/Dar_es_Salaam`; currency `TZS`.
- Guest web: LCP < 2.5 s on throttled Slow 4G; JS budget < 120 KB gz; AVIF/WebP images with fallback.
- Mobile: Android 8+ (API 26), test on 2 GB RAM devices; APK < 40 MB.
- Gate is offline-first; organizer actions use optimistic UI + sync queue.
- Short links on our own short domain, under our control.
