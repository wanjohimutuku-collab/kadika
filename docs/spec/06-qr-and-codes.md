## 6. QR and code design (critical)

### 6.1 Payload

Signed, compact, verifiable **offline**. Format (base64url, no padding):

```
v1.<eventId8>.<guestId8>.<partySize>.<ver>.<sigB64u>
```

- `sig = Ed25519(privateKey, "v1|" + eventId + "|" + guestId + "|" + partySize + "|" + ver)`.
- The mobile gate app stores the event **public key** and verifies signatures locally.
- The QR content is the signed token (not a URL). A **separate "open card" URL** (`https://<domain>/c/<token>`) is used in SMS/WhatsApp/print text.
- Print cards also show the **short code** (e.g. `KH-4821`): 2 letters + 4 digits, alphabet excludes `0 O 1 I L`.

### 6.2 Lookup fallbacks at the gate (all must work)

1. Scan QR (offline verify)
2. Type short code
3. Search by name or last 4 phone digits (local SQLite FTS)
4. Manual override with reason (logged; requires owner/committee role)

### 6.3 Duplicate and revocation

- First successful scan → mark admitted with `party_admitted`.
- Second scan → `duplicate` result, show who/when/where scanned first.
- Organizer can **reissue** a guest: increments `token_version`; old QR becomes invalid. Revocation list is synced to gate devices.

### 6.4 Print spec (enforced in PDF generator)

- Black modules on white background only; no gradients, logos, or patterned areas behind QR.
- Error correction **M**.
- Quiet zone ≥ 4 modules.
- Minimum printed size **25 mm** square; module size ≥ **0.8 mm**. Fail the build of the PDF if a template would shrink below.
- Always print the short code in ≥ 12 pt beside the QR.
- Provide a "Print test sheet" with QR at 20/25/30 mm.

---

