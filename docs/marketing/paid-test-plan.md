# 4-Week Small Paid Acquisition Test Plan (Prompt 12)

> **STOP / DO NOT LAUNCH CHECKLIST**: Do **NOT** launch any paid campaign until:
> 1. `ANALYTICS_ENABLED=1` and `/v1/ops/growth-report` attribution are live and verified in production.
> 2. Native Kiswahili reviewer and Kenyan reviewer have signed off [human-review-checklist.md](file:///c:/Users/yusuf/Documents/github/kadika/docs/marketing/human-review-checklist.md).
> 3. Business verifies any production `pricing_settings` DB override matches `DEFAULT_PRICING.free.cards = 5`, and fills in daily test budgets and target cost per event created below.

---

## 1. Test Parameters & Placeholders

- **Duration**: 4 weeks (2 × 14-day learning/decision cycles).
- **Channels**:
  1. **Meta (Facebook & Instagram — Click-to-WhatsApp + Website Conversions)**
  2. **TikTok (Spark / In-Feed Video — Website Signups)**
- **Target Cities**: Dar es Salaam, Arusha, Mwanza (Tanzania — primary paid conversion) and Nairobi (Kenya — pilot waitlist / early free test notice, no unconfirmed KES billing claims).
- **Core Offer**: **"Anza bure na kadi 5" / "Start with 5 free cards"** (for Nairobi: *"Join our Kenya pilot — start free while KES pricing finalises"*).
- **Business-Owned Budget & Target Placeholders (Fill Before Launch)**:
  - `DAILY_BUDGET_META_TZ`: `[BUSINESS_TO_FILL — e.g. TZS ... / day]`
  - `DAILY_BUDGET_TIKTOK_TZ`: `[BUSINESS_TO_FILL — e.g. TZS ... / day]`
  - `DAILY_BUDGET_META_KE`: `[BUSINESS_TO_FILL — e.g. KES ... / day]`
  - `DAILY_BUDGET_TIKTOK_KE`: `[BUSINESS_TO_FILL — e.g. KES ... / day]`
  - `TARGET_COST_PER_EVENT_CREATED_TZ`: `[BUSINESS_TO_FILL — TZS]`
  - `TARGET_COST_PER_EVENT_CREATED_KE`: `[BUSINESS_TO_FILL — KES]`
  - `MAX_SPEND_NO_EVENTS_PAUSE_THRESHOLD`: `[BUSINESS_TO_FILL — e.g. 2× TARGET_COST_PER_EVENT_CREATED without an event created]`

---

## 2. Three Target Audiences

1. **Audience A — Engaged Couples & Family Hosts (`Dar, Arusha, Mwanza, Nairobi`)**
   - Age: 23–38.
   - Interests / Signals: Engagement, wedding planning, bridal fashion, send-off/ruracio, reception venues.
   - Pain point: Cost & rework of paper cards, lost WhatsApp RSVPs, elders without smartphones.
2. **Audience B — Kamati Chairs, Treasurers & Event Organisers (`Dar, Arusha, Mwanza, Nairobi`)**
   - Age: 26–50.
   - Interests / Signals: Community events, event management, mobile money / SACCO / church & community organisation leadership.
   - Pain point: Chasing pledges (`michango` / `harambee`) in WhatsApp chats, 0% commission transparency, gate crashes.
3. **Audience C — Broad Short-Form Event Planners & Wedding Vendors (`Lookalike / Interest Broad` on TikTok & Reels)**
   - Age: 21–45 in target metros.
   - Hook angle: Offline gate QR scanner demo + screenshot rejection (`Tayari ameingia`).

---

## 3. Optimization Conversion Events

- **Meta Click-to-WhatsApp**: Optimize ad delivery for **Conversations Started** → track downstream `signup_completed` & `event_created` in `/v1/ops/growth-report` using pre-filled UTM landing links shared inside the WhatsApp welcome reply.
- **Website Conversion (Meta Web & TikTok)**: Primary optimization / attribution milestone = **`signup_completed`** leading to **`event_created`** (recorded via `utm_source`, `utm_medium`, `utm_campaign` stored on `users` at OTP/Firebase signup — zero third-party ad tracking cookies unless explicitly consented & configured).
- **UTM Naming Convention**:
  - `utm_source`: `meta` or `tiktok`
  - `utm_medium`: `ctwa` (Click-to-WhatsApp) or `paid_social`
  - `utm_campaign`: `test_w1_c1_tz_couple`, `test_w1_c2_tz_michango`, etc.

---

## 4. Six Ad Creatives (Kiswahili + English)

### Creative 1 — "Bibi Hana Smartphone" (Audience A · Meta Reels + TikTok · TZ/KE)
- **Visual / Video Brief (25s Vertical 9:16)**: Split screen — young friend tapping a WhatsApp wedding card + grandmother receiving a plain SMS (`KH-4826`) on a keypad phone, then both admitted at the gate.
- **Swahili Primary Copy**: *"Wageni wako wengine wako WhatsApp, wazazi kijijini hawana smartphone? Kwenye Kadi Sasa wote wanapata mwaliko: WhatsApp, SMS yenye namba fupi, na PDF ya kuchapisha yenye QR. Anza bure na kadi 5 — hakuna ada ya siri."*
- **English Primary Copy (Nairobi)**: *"Send WhatsApp wedding cards to friends and plain SMS codes or printed QR PDFs to elders without smartphones. Try Kadi Sasa free in our Nairobi pilot."*
- **Destination**:
  - TZ Web: `https://kadisasa.com/mwaliko-bila-smartphone?utm_source=tiktok&utm_medium=paid_social&utm_campaign=test_c1_elders_tz`
  - Click-to-WhatsApp Opening Message: `"Habari Kadi Sasa! Nataka kuanza bure (kadi 5) na kuona mfano wa kadi ya WhatsApp na SMS kwa wazee. [c1_elders]"`

### Creative 2 — "Lango Bila Mtandao / Already Admitted" (Audience C · TikTok + Meta CTWA · TZ/KE)
- **Visual / Video Brief (20–30s Vertical 9:16)**: Usher at evening garden entrance holding Android phone scanning a paper/phone QR → green pass; second phone walks up with a screenshot of the same QR → red **"Tayari ameingia / Already admitted"** screen! Show airplane-mode / no-bars indicator.
- **Swahili Primary Copy**: *"Mtandao ukikatika ukumbini au mtu akija na screenshot ya kadi, lango la Android la Kadi Sasa linasimamisha papo hapo — hata bila intaneti. Jaribu kadi 5 za kwanza bure."*
- **English Primary Copy (Nairobi)**: *"Garden reception with weak signal? Our Android gate app scans QR & short codes offline and stops duplicate screenshots instantly. Test free with our Kenya pilot."*
- **Destination**:
  - TZ Web: `https://kadisasa.com/kadi-za-harusi-online?utm_source=meta&utm_medium=paid_social&utm_campaign=test_c2_gate_tz`
  - Click-to-WhatsApp Opening Message: `"Habari! Nimeona video ya geti linalofanya kazi bila mtandao. Nataka kujaribu kadi 5 bure. [c2_gate]"`

### Creative 3 — "Mweka Hazina & 0% Makato ya Michango" (Audience B · Meta CTWA · TZ)
- **Visual / Video Brief (Static Carousel 3 Slides or 25s Screen Motion)**: Slide 1: Messy WhatsApp chat crossed out vs clean ledger (`Ahadi / Imelipwa / Salio`); Slide 2: Direct M-Pesa / Mixx / Airtel / HaloPesa payment options with **0% Makato** badge; Slide 3: Starter offer **Kadi 5 Bure**.
- **Swahili Primary Copy**: *"Kamati bado inatafuta ahadi za michango juu ya WhatsApp? Weka daftari moja la wazi la ahadi na malipo — wageni wanalipa moja kwa moja kwa kamati (0% makato ya Kadi Sasa). Anza bure na kadi 5."*
- **English Primary Copy (Nairobi Harambee/Ruracio)**: *"Track Ruracio and Harambee pledges against M-Pesa Paybill/Till receipts in one transparent committee ledger — 0% platform cut. Request pilot access."*
- **Destination**:
  - TZ Web: `https://kadisasa.com/michango-ya-harusi?utm_source=meta&utm_medium=paid_social&utm_campaign=test_c3_michango_tz`
  - KE Web: `https://kadisasa.com/ke/ruracio-harambee-invitations-contributions?utm_source=meta&utm_medium=paid_social&utm_campaign=test_c3_harambee_ke`
  - Click-to-WhatsApp Opening Message: `"Habari kamati ya Kadi Sasa! Tunataka mfumo wa michango (0% makato) na kadi za kamati — anza bure na kadi 5. [c3_michango]"`

### Creative 4 — "Send-off & Kitchen Party Fast Setup" (Audience A · Meta Reels + TikTok · TZ)
- **Visual / Video Brief (20s Video)**: Fast step-by-step phone recording: pick Send-off theme -> add guests -> preview card with committee phone -> click edit venue once, all links update instantly.
- **Swahili Primary Copy**: *"Ukibadilisha ukumbi au saa ya Send-off au Kitchen Party, huchapishi tena — unasasisha mara moja kwenye kadi zote. Anza leo na kadi 5 za kwanza bure."*
- **English Primary Copy (Kenya)**: *"Update send-off or ruracio venue times once and every guest link updates automatically. Join the Kenya pilot free."*
- **Destination**:
  - TZ Web: `https://kadisasa.com/kadi-ya-send-off-kitchen-party?utm_source=tiktok&utm_medium=paid_social&utm_campaign=test_c4_sendoff_tz`
  - Click-to-WhatsApp Opening Message: `"Habari! Ninaanda Send-off/Kitchen Party naomba maelezo ya kuanza bure (kadi 5). [c4_sendoff]"`

### Creative 5 — "Ukweli Kuhusu Gharama (/bei)" (Audience A & B · Meta Static + Carousel · TZ)
- **Visual / Video Brief (Clean Typography Card matching `.ks` green/gold)**: *"Kadi za Mwanzo: Bure (Kadi 5) · 1–99: TZS 2,400/kadi · 100–499: TZS 2,200/kadi · 500+: TZS 1,950/kadi · Makato ya Michango: 0%"*.
- **Swahili Primary Copy**: *"Unajua gharama halisi ya kadi zako kabla hujaanza: kadi 5 za kwanza bure, kisha TZS 1,950–2,400 kwa kadi na 0% makato kwenye michango. Linganisha na karatasi leo."*
- **English Primary Copy**: *"Clear pricing with zero surprises: 5 free starter cards, TZS 1,950–2,400/card, and 0% commission on contributions."*
- **Destination**:
  - TZ Web: `https://kadisasa.com/gharama-halisi-za-huduma-ya-mialiko?utm_source=meta&utm_medium=paid_social&utm_campaign=test_c5_cost_tz`
  - Click-to-WhatsApp Opening Message: `"Habari! Nimeona gharama zenu kwenye /bei, nataka kujaribu kadi 5 bure. [c5_cost]"`

### Creative 6 — "Usalama: Hakuna PIN, Namba ya Kamati Wazi" (Audience A & B · Meta CTWA + IG · KE & TZ)
- **Visual / Video Brief (20s Clean Explainer)**: Highlighting the trust strip at the top of a Kadi Sasa guest card: committee name, green verified phone button, and bold overlay **"No PIN / Password Ever Asked"**.
- **Swahili Primary Copy**: *"Kadi ya mwaliko haipaswi kumtia hofu mgeni. Kadi ya Kadi Sasa inaonyesha jina na simu ya kamati yako, wala haiombi PIN yoyote. Anza na kadi 5 bure."*
- **English Primary Copy (Nairobi)**: *"Digital wedding cards Kenyan guests actually trust: your committee's name and phone on every card, zero PINs or logins needed to RSVP."*
- **Destination**:
  - KE Web: `https://kadisasa.com/ke/digital-wedding-invitations-kenya?utm_source=meta&utm_medium=paid_social&utm_campaign=test_c6_trust_ke`
  - Click-to-WhatsApp Opening Message (KE): `"Hi Kadi Sasa! I'm planning an event in Kenya and would like to test your pilot cards. [c6_trust_ke]"`

---

## 5. Weekly Decision Rules (Check Every Monday in `/v1/ops/growth-report`)

1. **Data Hygiene Gate (Day 1–3)**: Verify UTMs (`utm_source=meta|tiktok`, `utm_campaign=...`) appear in `/v1/ops/growth-report` (`signupsBySource`). Pause spend immediately if attribution drops >10% due to link stripping.
2. **Pause Rule (Cut Losers)**:
   - After spending `[PAUSE_SPEND_CAP = 2 × TARGET_COST_PER_EVENT_CREATED]` on an ad set with **`0 events_created`**, pause that ad set and reallocate budget to the best creative.
   - If Click-to-WhatsApp produces conversations below `[MIN_REPLY_RATE = 15%]` converting to `signup_completed` after 50 conversations, replace the opening reply script with a shorter 1-tap `kadisasa.com/login?...` link.
3. **Iterate Rule (Fix Drop-off)**:
   - High CTR / conversations but low `signup_completed` → test simpler Kiswahili greeting or direct `/login` landing page instead of long guide pages.
   - Good `signup_completed` but low `event_created` (<40%) → review onboarding friction before scaling spend.
4. **Scale Rule (Boost Winners)**:
   - Any creative + audience achieving `cost_per_event_created <= TARGET_COST_PER_EVENT_CREATED` AND at least `5 events_created` in a rolling 7-day window (with TZ events progressing toward `first_payment`): increase daily budget by at most **+20% every 3 days** so algorithm delivery stays stable.
5. **End-of-Test Review (Day 28)**:
   - Compare Customer Acquisition Cost per **Event Created** and per **Event Reached First Payment** by city (`Dar es Salaam`, `Arusha`, `Mwanza`, `Nairobi` pilot conversions) and channel (`Meta CTWA` vs `Meta Web` vs `TikTok`). Only move a channel to ongoing spend if payback fits unit economics on `/bei`.
