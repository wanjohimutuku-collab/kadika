## 15. Open decisions (default shown; confirm before Phase 3 and 6)

1. Brand name and domains (default: placeholder `harusipass.*` plus a short domain).
2. WhatsApp: Cloud API directly vs via a BSP (default: Cloud API).
3. SMS gateway for v1 (default: Beem or Africa's Talking behind the adapter).
4. Payment aggregator for v1 (default: one with M-Pesa, Mixx, Airtel Money push + webhooks, behind `PaymentProvider`).
5. Pricing model (per event vs per card); keep billing out of v1 except an event `plan` field.
6. Organizer web dashboard in v1 (default: mobile only; web card + minimal admin).

When a default is unconfirmed, implement behind the interface, use the fake provider, and note it in `docs/adr/`.

---

