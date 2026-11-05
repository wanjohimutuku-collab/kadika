## 1. Product goal

Replace fragile "QR code on a card" and "link in WhatsApp" invitations with one robust flow that works for **smartphone and feature-phone guests**, **online and offline venues**, and ties **the card to pledges/payments and to gate entry**.

### Problems this must solve (from research)

| ID | Problem | Required behaviour |
|----|---------|--------------------|
| P1 | Guests distrust digital cards (think scam) | Verified-sender landing page, couple/committee name, call-back option, no attachments, no OTP/password requests |
| P2 | Elders expect printed cards | Hybrid: printable card PDF with same QR + human code per guest |
| P3 | Feature-phone guests (~83% feature-phone penetration vs ~45% smartphone) | SMS with short code; gate lookup by code/phone/name; no smartphone needed |
| P4 | QR fails at gate (low brightness, screenshot, no internet) | Offline-validating signed QR, manual fallback, brightness hint |
| P5 | Low contrast / small / blurry printed QR | Print spec enforced by the PDF generator |
| P6 | Link rot / free QR provider outages | Own domain, own short links, own redirect layer, never third-party QR services |
| P7 | Phishing/fake card fear | Always show sender + domain; never ask for credentials |
| P8 | No RSVP tracking | Per-guest link/code; states: created → sent → delivered → opened → confirmed → checked-in |
| P9 | Michango (contribution) separate from card | Pledge + payment status attached to guest; mobile-money payment |
| P10 | Duplicate/forwarded/screenshot cards | Per-guest ID, entry count, scan log, duplicate detection |
| P11 | Gate staffing friction | Any committee member can run the gate from their phone |

---

