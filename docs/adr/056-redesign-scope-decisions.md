# ADR 056: Redesign scope decisions

Status: accepted (2026-11-07).

## Context

The root CLAUDE.md "KadiSasa Website Redesign, SEO & Growth" spec arrived after ADR 054's redesign
landed. Several items in the spec conflicted with the current brand, tokens, content and privacy
posture. The Phase 0 discovery report (`docs/plan/redesign-phase0-discovery.md`) raised six open
decisions; this ADR records how they were resolved before Phase 2 opens.

## Decision

1. **Palette: keep emerald + gold.** The brand tokens (`--ks-green-700 #0F5C4D`, `--ks-gold-500
   #D9A441`) stay. Burgundy / terracotta would break the logo, the mobile app, the printed card and
   every guest-card surface, which all share the same tokens. CLAUDE.md §4's "warm cream backgrounds"
   and "soft neutral surfaces" are already met by `--ks-paper #FBFAF7` and `--ks-line #E4E1DA`.
2. **Header groups: keep the current five-slot nav.** Huduma (dropdown of products), Miongozo
   (dropdown of guides), Bei, Kuhusu, plus the "Nina namba ya kadi" link and the "Anza bure" CTA.
   CLAUDE.md §5.1's Platform / Occasions / How It Works / Pricing / Resources is not adopted — the
   current labels are Swahili-first and match the content tree. A future `Matukio` (Occasions)
   dropdown may be added if occasion pages grow past six.
3. **Hero visual: keep markup mockups.** `CardAndSms`, `AppMockup`, `MichangoBar`, `GateChip`,
   `TrustStrip` render crisply at any width in both languages and do not rot when the UI changes.
   One real screenshot is added: the gate scanner's "admit / duplicate / deny" result, which is
   hard to mock convincingly. That screenshot is captured against a seeded demo event, stored as a
   static asset under `apps/web/public/site/`, and swapped only when the scanner UI changes.
4. **New occasion page: add `/kadi-za-kanisa` (TZ only).** One `ContentPageDef` in
   `src/content/pages/occasions.ts`, same shape as the existing occasion pages. Church events are
   the only one of CLAUDE.md §5.9's eight categories without a page. Corporate events already
   have `/kadi-za-mwaliko-biashara`; no further occasion pages are in scope.
5. **Analytics: first-party server-side events only, no cookies.** CLAUDE.md Prompt 8 is implemented
   as server-side logging of `page_view`, `start_registration`, `complete_registration`,
   `create_event`, `complete_event_setup`, `create_invitation`, `share_invitation`, `add_guest`,
   `receive_rsvp`, `record_contribution`, `scan_qr`, `complete_checkin` to a new `analytics_events`
   table, keyed by an anonymous per-request session id (rotating, never a cookie). No guest PII, no
   phone numbers, no payment data in events. No third-party analytics scripts (no gtag, no
   Plausible, no PostHog, no fbq). The privacy page gets a one-paragraph update describing the
   anonymous metrics. Details, retention and the schema live in ADR 057.
6. **Testimonials: out of scope until a real pilot has agreed to be quoted.** ADR 054 already
   excluded them. The Section 11 slot is replaced by a factual "Built in Tanzania, in pilot" trust
   strip (country, year founded, markets served, how long we have been in pilot) using data in
   `TrustStrip`.

## Consequences

- No palette-wide change, no token rename in `ui-tokens` or `.ks`. Phase 1 is a small contrast
  audit instead of a rebuild.
- The redesign PR touches the home page, `TrustStrip` (new factual contents), `occasions.ts` (one
  new page), and the privacy page (one paragraph). No existing slug changes.
- Analytics requires its own database table, API routes, worker and feature flag — tracked in
  ADR 057 separately so the redesign PR stays small.
- CLAUDE.md §5.11 and §12 asks for testimonials and conversion dashboards; both are deferred to
  after the first real pilot sign-off.
- Every other preservation rule in CLAUDE.md §2 (keep routes, authentication, payment logic, QR
  verification, invitation generation) is still honoured — this ADR only narrows the design scope.
