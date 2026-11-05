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

---

