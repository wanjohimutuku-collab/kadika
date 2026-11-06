# Harusi Pass — Claude Code instructions

> Working name: **Harusi Pass**. A Tanzanian wedding invitation, RSVP, contribution (michango) and gate-check-in platform. Mobile-first, offline-capable, Swahili-first.

Full spec lives in `docs/spec/`. Read **only** what the task needs — this root file stays minimal on purpose.

## Spec map (load on demand)

- [docs/spec/product.md](docs/spec/product.md) — Goal, user problems (P1–P11), roles, success metrics, open decisions, out-of-scope.
- [docs/spec/stack.md](docs/spec/stack.md) — Stack choices and rejections.
- [docs/spec/schema.md](docs/spec/schema.md) — Postgres domain model.
- [docs/spec/qr.md](docs/spec/qr.md) — QR payload, signing, print spec, revocation.
- [docs/spec/flows.md](docs/spec/flows.md) — Onboarding, delivery, RSVP, pledges, gate, dashboards.
- [docs/spec/api.md](docs/spec/api.md) — Hono REST endpoints under `/v1`.
- [docs/spec/security.md](docs/spec/security.md) — Security, performance budgets, localisation.
- [docs/spec/devops.md](docs/spec/devops.md) — Environments, Docker, CI, backups, env vars.
- [docs/spec/phases.md](docs/spec/phases.md) — Build phases 0–7 and acceptance criteria.
- [docs/spec/ui.md](docs/spec/ui.md) — Full UI/UX spec: principles, tokens, navigation, every screen, states, microcopy, a11y.

Also: `docs/adr/` for decisions, `docs/ui/PLAN.md` and `docs/ui/HANDOFF.md` for current UI status.

## Monorepo layout

```
harusi-pass/
├─ CLAUDE.md                  # this file
├─ docs/spec/                 # full build spec (load on demand)
├─ package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
├─ apps/
│  ├─ api/                    # Hono API + BullMQ workers
│  ├─ web/                    # Next.js: guest card, RSVP, pay, organizer console
│  └─ mobile/                 # Expo app: organizer + gate scanner
├─ packages/
│  ├─ db/                     # Drizzle schema + migrations + seed
│  ├─ schemas/                # zod schemas (shared)
│  ├─ api-client/             # generated typed client
│  ├─ crypto/                 # QR payload sign/verify (isomorphic, works in RN)
│  ├─ messaging/              # WhatsApp + SMS provider adapters
│  ├─ payments/               # PaymentProvider adapters
│  ├─ ui-tokens/              # colors, spacing
│  └─ i18n/                   # sw.json, en.json
├─ infra/
│  ├─ docker/                 # Dockerfile.api, Dockerfile.web
│  └─ coolify/                # env templates, deploy notes
└─ .github/workflows/         # ci.yml, build-push.yml, mobile-eas.yml
```

## Engineering conventions (apply to every change)

- TypeScript strict, ESLint + Prettier, `no-explicit-any`.
- Conventional Commits; small PRs; one branch per phase.
- Every external provider behind an interface (`MessagingProvider`, `PaymentProvider`) with a **fake in-memory implementation** for tests and local dev.
- Business logic in service modules, not route handlers.
- Money in integer TZS; times stored UTC; timezone `Africa/Dar_es_Salaam`; currency formatting via `CurrencyText`.
- Tests alongside features; minimum unit tests for crypto, code generation, phone normalisation, pledge math, scan conflict resolution.
- Never log tokens, OTPs, private keys, or full phone numbers.
- Never send attachments/APKs; never ask guests for passwords or OTPs. Landing pages show sender + domain.
- Record non-trivial decisions in `docs/adr/NNN-title.md`.

## When to open which spec file

| Doing | Open |
|---|---|
| Schema / migration change | `schema.md` |
| QR, signing, short codes, print PDF | `qr.md` |
| New endpoint or route change | `api.md` |
| UI work (any screen) | `ui.md` + relevant ADRs |
| CI, Docker, Coolify, env vars | `devops.md` |
| Feature flow / behaviour | `flows.md` |
| New phase or acceptance check | `phases.md` |
| Scope / roles / product questions | `product.md` |
| Rate-limit, auth, PDPA, performance | `security.md` |


# KadiSasa.com
# Website Redesign, SEO & Growth Implementation Specification

Version: 1.0
Date: 6 November 2026
Project: KadiSasa
Primary markets: Tanzania and Kenya
Implementation agent: Claude Code

---

# 1. PROJECT OBJECTIVE

Transform KadiSasa into a modern, premium East African event invitation and guest-management platform.

The website must communicate the complete product experience:

1. Create personalised digital invitations.
2. Distribute invitations through WhatsApp, SMS and print.
3. Manage guest lists and RSVPs.
4. Track event contributions and pledges.
5. Verify guests through QR codes and guest numbers.
6. Support offline event admission.
7. Provide organisers and committees with useful reporting.

Primary positioning:

"From invitation to arrival."

Supporting message:

"Every guest invited. Every contribution tracked. Every arrival accounted for."

The website must attract visitors through organic search, explain the product clearly and convert qualified visitors into registered event organisers.

# 2. CRITICAL DEVELOPMENT RULES

Before changing code, inspect the complete existing application.

Do not assume the application framework, database structure, routing system, authentication provider or payment integrations.

The development agent must:

- Identify the existing technology stack.
- Inspect the current directory structure.
- Inspect existing routes and page templates.
- Identify reusable components.
- Inspect existing metadata and SEO implementation.
- Inspect the current authentication flow.
- Inspect payment and messaging integrations.
- Inspect event creation and invitation workflows.
- Identify existing analytics integrations.
- Review mobile responsiveness.
- Identify existing tests and build commands.

Preservation requirements:

1. Do not remove existing application functionality.
2. Do not rename existing routes without a migration plan.
3. Do not break authentication.
4. Do not change payment processing logic.
5. Do not modify invitation generation logic unless explicitly required.
6. Do not remove existing SEO landing pages.
7. Preserve existing database records and schemas.
8. Preserve existing integrations.
9. Maintain backward compatibility.
10. Do not deploy without explicit approval.

All changes must be incremental and testable.

# 3. BRAND POSITIONING

## Primary positioning

KadiSasa is an East African digital invitation and event guest-management platform.

It helps organisers create personalised invitations, manage RSVPs, track contributions and verify guest admission using QR codes and guest numbers.

## Target audiences

### Tanzania

- Wedding organisers.
- Wedding committees.
- Families organising celebrations.
- Send-off organisers.
- Kitchen party organisers.
- Engagement ceremonies.
- Birthday organisers.
- Churches and religious organisations.
- Corporate event organisers.

### Kenya

- Wedding organisers.
- Ruracio organisers.
- Harambee committees.
- Kitchen party organisers.
- Family celebration organisers.
- Corporate event organisers.

## Competitive differentiation

KadiSasa should compete through:

- Personalised invitations.
- Guest-linked contribution tracking.
- Offline QR verification.
- Guest number verification.
- Support for guests without smartphones.
- WhatsApp and SMS distribution.
- Printed invitation compatibility.
- Committee reporting.

Do not position KadiSasa as merely an online invitation card designer.

# 4. UI/UX DESIGN DIRECTION

## Design philosophy

Create a premium SaaS experience with an editorial event-design aesthetic.

The website should feel:

- Modern.
- Trustworthy.
- Elegant.
- Simple.
- Mobile-first.
- Locally relevant.
- Professionally designed.

## Visual direction

Use:

- Warm cream backgrounds.
- Deep charcoal typography.
- Muted burgundy or terracotta accents.
- Soft neutral surfaces.
- Restrained borders.
- Generous whitespace.
- Elegant typography.
- Consistent rounded corners.
- High-quality invitation previews.

Avoid:

- Excessive gradients.
- Overly colourful dashboards.
- Generic stock photography.
- Excessive animations.
- Crowded layouts.
- Large blocks of unnecessary text.

## Design tokens

Establish a central design-token system.

Suggested starting palette:

Primary background: #F7F4EE
Secondary background: #EFE9DF
Primary text: #24231F
Secondary text: #706D66
Primary accent: #873F48
Secondary accent: #B77B68
Border: #E5DED3
Success: #287A55
Warning: #B7791F
Error: #B54747
White: #FFFFFF

These are proposed starting values. Inspect the existing brand identity before implementation.

## Typography

Use a refined editorial heading typeface paired with a highly readable sans-serif body typeface.

Suggested combinations:

- DM Sans + Playfair Display.
- Inter + Lora.
- Manrope + DM Serif Display.

Use a consistent type scale.

Body text: 16px.
Small text: 14px.
Section headings: 28px to 40px.
Hero heading: 44px to 64px on desktop.
Mobile hero heading: 34px to 42px.

## Responsive requirements

Desktop:
- Maximum content width around 1200px.
- Consistent navigation.
- Two-column hero layout.
- Clear visual hierarchy.

Tablet:
- Simplified navigation.
- Reduced spacing.
- Responsive image layouts.

Mobile:
- Single-column layouts.
- Readable typography.
- Large touch targets.
- Compact navigation.
- Persistent primary action where appropriate.
- No horizontal overflow.
- Forms optimised for mobile keyboards.

# 5. HOMEPAGE REDESIGN

The homepage is the primary conversion page.

## Section 1: Header

Navigation:

Logo: KadiSasa

Main links:
- Platform
- Occasions
- How It Works
- Pricing
- Resources

Additional controls:
- Country selector.
- Language selector.
- Login.
- Create Your Event.

On mobile, use a compact navigation drawer and a prominent event-creation action.

## Section 2: Hero

Eyebrow:

EVENT INVITATIONS & GUEST MANAGEMENT

H1:

Every guest invited. Every contribution tracked. Every arrival accounted for.

Description:

Create personalised digital invitations, manage your guest list, track contributions and welcome guests with QR admission.

Primary CTA:

Create Your Event

Secondary CTA:

See How It Works

Supporting text:

Start with 5 free invitation cards.

Visual:

Show a realistic smartphone mockup displaying an actual KadiSasa invitation.

Include supporting previews of the guest dashboard and QR check-in experience.

Do not use generic illustrations as substitutes for actual product screenshots.

## Section 3: Trust and feature summary

Heading:

Everything your event needs in one place.

Features:

- Personalised invitations.
- WhatsApp and SMS sharing.
- Guest RSVP management.
- Contribution tracking.
- QR code admission.
- Offline gate verification.

Use concise descriptions and clear icons.

## Section 4: How KadiSasa works

Heading:

From creating your invitation to welcoming your guests.

Four steps:

01. Create your event.

Choose your occasion and personalise your invitation.

02. Invite your guests.

Share individual invitations through WhatsApp, SMS or printed cards.

03. Manage responses.

Track confirmations, guest numbers, pledges and payments.

04. Welcome your guests.

Scan QR codes or verify guest numbers at the entrance.

Each step should have a genuine product screenshot.

## Section 5: Invitation gallery

Heading:

An invitation worth opening.

Display actual invitation templates.

Categories:

- Weddings.
- Send-offs.
- Kitchen parties.
- Engagements.
- Birthdays.
- Graduations.
- Corporate events.

Each preview should have:

- Image.
- Category.
- Short description.
- Preview action.

Allow visitors to inspect an invitation before registration.

## Section 6: Guest management

Heading:

Know who's coming before your event begins.

Explain:

- Guest lists.
- RSVP responses.
- Guest categories.
- Individual invitation tracking.
- Accompanying guests.
- Attendance reports.

Show an actual guest-management interface.

## Section 7: Contributions

Heading:

Keep your event contributions organised.

Explain:

- Guest-linked pledges.
- Payment records.
- Outstanding balances.
- Contribution reports.
- Committee visibility.

Clearly distinguish pledged amounts from confirmed payments.

Never imply KadiSasa holds or processes money unless the existing payment architecture supports the claim.

## Section 8: QR gate admission

Heading:

A smoother entrance for every guest.

Explain:

- Unique QR invitations.
- QR scanning.
- Duplicate admission prevention.
- Guest number verification.
- Offline verification.
- Attendance reporting.

Show a real scanner interface.

Explain exactly which functions work offline.

## Section 9: Occasions

Heading:

One platform for every celebration.

Dedicated cards for:

- Weddings.
- Send-offs.
- Kitchen parties.
- Engagements.
- Birthdays.
- Graduations.
- Corporate events.
- Church events.

Each card links to its dedicated landing page.

## Section 10: Pricing

Heading:

Simple pricing for your event.

Explain the five free invitation cards and the applicable paid-card pricing.

Show:

- Free trial allowance.
- Paid invitation prices.
- Reminder allowances.
- Additional messaging costs.
- Available payment methods.
- Applicable country and currency.

All pricing must come from the existing pricing configuration or verified commercial rules.

Do not hardcode unverified prices.

## Section 11: Testimonials

Display genuine customer feedback.

Include:

- Event type.
- Customer-approved name or organisation.
- Experience.
- Relevant product features.

Do not fabricate testimonials.

## Section 12: FAQ

Include questions covering:

- What is KadiSasa?
- How do digital invitations work?
- How do guests RSVP?
- How do contributions work?
- How does QR admission work?
- What happens when guests lack smartphones?
- Does QR verification work offline?
- Can I use printed invitations?
- How much does KadiSasa cost?
- Is KadiSasa available in Kenya?
- How is guest information protected?

## Section 13: Final CTA

Heading:

Your event deserves better organisation.

Description:

Create your invitation, organise your guests and prepare for a smoother event.

CTA:

Create Your Event

# 6. WEBSITE INFORMATION ARCHITECTURE

Maintain existing URLs wherever possible.

Recommended structure:

/
 
/platform/

/digital-invitations/

/guest-management/

/wedding-rsvp-management/

/event-contribution-tracking/

/qr-code-event-check-in/

/digital-invitations-whatsapp/

/printed-qr-invitation-cards/

/pricing/

/how-it-works/

/occasions/

/weddings/

/send-offs/

/kitchen-parties/

/engagements/

/birthdays/

/graduations/

/corporate-events/

/resources/

/help/

/about/

/contact/

/privacy-policy/

/terms/

Before creating a route, check whether an equivalent existing route already exists.

Avoid duplicate pages targeting identical search intent.

# 7. SEO STRATEGY

## Priority keyword clusters

### Main product

- Digital invitation cards Tanzania.
- Online invitation cards Tanzania.
- Digital event invitations.
- Event management software Tanzania.
- Wedding invitation platform Tanzania.

### Wedding

- Digital wedding cards Tanzania.
- Wedding guest management Tanzania.
- Wedding RSVP management.
- Wedding contribution tracking.
- WhatsApp wedding invitations.

### QR admission

- QR code event check-in.
- QR wedding invitations.
- Wedding guest verification.
- Event attendance management.

### Swahili

- Kadi za harusi mtandaoni.
- Kadi za mwaliko za kidigitali.
- Kusimamia wageni wa harusi.
- Kufuatilia michango ya harusi.
- QR code za kuingiza wageni.

### Kenya

- Digital wedding invitations Kenya.
- Wedding guest management Kenya.
- Ruracio invitations.
- Harambee contribution management.
- Kitchen party invitations Kenya.

## Landing page requirements

Every priority landing page should contain:

1. Unique SEO title.
2. Unique meta description.
3. One descriptive H1.
4. Clear introductory paragraph.
5. Explanation of the customer problem.
6. Product demonstration.
7. Benefits.
8. Step-by-step workflow.
9. Relevant screenshots.
10. FAQs.
11. Internal links.
12. Relevant CTA.
13. Appropriate structured data.

## Suggested metadata

Homepage:

Title:
KadiSasa | Digital Invitations & Event Guest Management

Description:
Create digital invitations, manage RSVPs, track event contributions and verify guests with QR codes. Organise your event with KadiSasa.

Guest management:

Title:
Wedding Guest Management & RSVP Platform | KadiSasa

Description:
Organise wedding guest lists, manage RSVPs, track confirmations and prepare your event attendance reports with KadiSasa.

QR check-in:

Title:
QR Code Event Check-In & Guest Verification | KadiSasa

Description:
Verify event guests using unique QR invitations and guest numbers. Manage attendance and simplify event admission with KadiSasa.

Contributions:

Title:
Wedding Contribution Tracking & Management | KadiSasa

Description:
Track wedding pledges, payments and outstanding contributions with an organised guest-linked reporting system.

WhatsApp:

Title:
Send Personalised Digital Invitations on WhatsApp | KadiSasa

Description:
Create personalised event invitations and share them with guests through WhatsApp. Manage responses and keep your guest list organised.

# 8. MULTILINGUAL SEO ARCHITECTURE

Tanzania is the immediate commercial priority.

Kenya is the secondary expansion market.

Implement language and country architecture based on existing routes.

Suggested structure:

/en-tz/
/sw-tz/
/en-ke/

If the current application already uses a different structure, retain existing URLs and implement the appropriate mapping.

Requirements:

- Correct hreflang tags.
- Correct canonical URLs.
- Language-specific metadata.
- Language-specific navigation.
- Translated page content.
- Localised currencies.
- Localised payment information.
- Country-specific availability disclosures.
- Language switcher preserving the current page where a translation exists.

Suggested hreflang values:

en-TZ
sw-TZ
en-KE
x-default

Do not translate English content mechanically.

Swahili content must read naturally to Tanzanian audiences.

Kenyan content should address relevant local event traditions and terminology.

Do not advertise unavailable payment integrations or unsupported services.

# 9. GEO AND AI SEARCH OPTIMISATION

Optimise the website for search engines and AI-powered answer systems.

## Consistent entity definition

Use this description consistently:

"KadiSasa is an East African digital invitation and event guest-management platform that helps organisers create personalised invitations, manage RSVPs, track contributions and verify guest admission through QR codes and guest numbers."

## Structured data

Implement and validate:

Organization
WebSite
SoftwareApplication
BreadcrumbList
Article
Product, where appropriate
Service, where appropriate
Event, where appropriate

Only publish properties supported by visible content and verified product information.

Do not create fake aggregate ratings or customer reviews.

## AI-friendly content

Each important feature page should answer:

- What is the feature?
- Who needs it?
- How does it work?
- What problem does it solve?
- What does the customer need?
- What are its limitations?
- How does the feature compare with traditional methods?

Use descriptive headings and direct answers.

Include original screenshots and product demonstrations.

Maintain an accessible sitemap and crawlable HTML content.

Consider llms.txt as an optional supplementary resource. Do not treat it as a replacement for normal SEO implementation.

# 10. CONTENT MARKETING PLAN

Create five initial articles:

1. How to Create Digital Wedding Invitations in Tanzania.
2. How to Manage Wedding Guests Using QR Codes.
3. How to Track Wedding Contributions and Pledges.
4. Digital vs Printed Wedding Invitations: Which Is Better?
5. How to Send Personalised Wedding Invitations on WhatsApp.

Additional content:

6. How to Organise a Wedding Committee in Tanzania.
7. What Happens When Wedding Guests Have No Smartphones?
8. How QR Codes Prevent Duplicate Wedding Entry.
9. How to Manage Wedding RSVPs.
10. How Much Does a Digital Wedding Invitation Cost in Tanzania?

Each article must:

- Solve a specific user problem.
- Include original explanations.
- Use locally relevant examples.
- Link to relevant KadiSasa features.
- Include a useful CTA.
- Have unique metadata.
- Avoid keyword stuffing.
- Avoid repetitive AI-generated paragraphs.

# 11. TECHNICAL SEO

Audit and implement the following:

- XML sitemap.
- robots.txt.
- Canonical URLs.
- Hreflang.
- Metadata.
- Open Graph.
- Twitter cards.
- JSON-LD validation.
- Image optimisation.
- Descriptive image alt text.
- Internal linking.
- Broken-link checks.
- Redirect validation.
- 404 page.
- Mobile responsiveness.
- HTTPS.
- Crawl accessibility.
- Search Console verification.
- Analytics verification.

## Core Web Vitals

Measure:

LCP: Target 2.5 seconds or less.

INP: Target 200 milliseconds or less.

CLS: Target 0.1 or less.

Use real measurements where available.

Optimise images, fonts, JavaScript and unnecessary third-party scripts.

Do not sacrifice essential product functionality for performance scores.

# 12. CONVERSION OPTIMISATION

Primary conversion:

Successful event creation.

Secondary conversions:

- Registration.
- Invitation preview.
- First invitation generated.
- First invitation shared.
- Guest added.
- First RSVP received.
- First QR admission verified.

Improve:

- CTA placement.
- Registration flow.
- Pricing transparency.
- Product demonstrations.
- Mobile navigation.
- Form usability.
- Error messages.
- Loading feedback.
- Trust information.

Track where visitors abandon the registration process.

Do not require unnecessary personal information before the user understands the product.

# 13. ANALYTICS AND MEASUREMENT

Inspect existing analytics before adding new tracking systems.

Recommended events:

page_view
view_pricing
view_invitation
start_registration
complete_registration
create_event
complete_event_setup
create_invitation
share_invitation
add_guest
receive_rsvp
record_contribution
scan_qr
complete_checkin

Track:

- Country.
- Language.
- Landing page.
- Traffic source.
- Device category.
- Conversion stage.
- Event type.

Do not send guest names, telephone numbers, payment details or other personal information to advertising or analytics systems.

Create a dashboard showing:

- Organic visitors.
- Registration conversion.
- Event creation conversion.
- Invitation creation.
- Invitation sharing.
- Guest additions.
- RSVP activity.
- Returning organisers.

# 14. DEVELOPMENT PHASES

The agent must implement the project incrementally.

## PHASE 0: DISCOVERY AND BASELINE

Tasks:

1. Inspect project architecture.
2. Map existing routes.
3. Map reusable components.
4. Identify all integrations.
5. Inspect current homepage.
6. Inspect existing landing pages.
7. Inspect current SEO.
8. Test registration.
9. Test event creation.
10. Establish build and test baseline.

Deliverables:

- Architecture report.
- Existing route inventory.
- Feature preservation checklist.
- SEO baseline.
- Risk assessment.
- Implementation plan.

Do not change production functionality during this phase.

## PHASE 1: DESIGN SYSTEM

Tasks:

1. Establish colour tokens.
2. Establish typography.
3. Establish spacing.
4. Establish responsive breakpoints.
5. Create buttons.
6. Create cards.
7. Create navigation.
8. Create section layouts.
9. Create form components.
10. Establish accessibility standards.

Deliverable:

Reusable design system consistent with the existing application.

## PHASE 2: HOMEPAGE

Tasks:

1. Redesign navigation.
2. Implement new hero.
3. Add product demonstration.
4. Add feature summaries.
5. Add workflow sections.
6. Add invitation gallery.
7. Add guest management showcase.
8. Add contribution showcase.
9. Add QR check-in showcase.
10. Add occasion categories.
11. Improve pricing presentation.
12. Add genuine testimonials where available.
13. Improve FAQ.
14. Add final CTA.

Test desktop, tablet and mobile.

## PHASE 3: PRODUCT LANDING PAGES

Implement or improve:

- Digital invitations.
- Guest management.
- RSVP management.
- Contributions.
- QR check-in.
- WhatsApp invitations.
- Printed invitations.

Preserve existing URLs.

## PHASE 4: SEO AND MULTILINGUAL

Implement:

- Metadata.
- Canonical tags.
- Hreflang.
- Structured data.
- Internal linking.
- Sitemap.
- Robots.
- Localised content.
- Country-specific pages.

Validate indexing eligibility.

## PHASE 5: CONTENT AND GEO

Publish the first five priority articles.

Create the public help centre.

Improve product entity descriptions.

Add clear, original product explanations.

## PHASE 6: PERFORMANCE AND QA

Run:

- Production build.
- Unit tests.
- Integration tests.
- Route tests.
- Mobile tests.
- Accessibility tests.
- SEO validation.
- Structured data validation.
- Performance tests.
- Registration workflow tests.
- Event creation tests.
- Invitation sharing tests.
- QR admission tests.

Provide a final report.

# 15. CLAUDE CODE IMPLEMENTATION PROMPTS

Use the following prompts in sequence.

## PROMPT 1: DISCOVERY

You are the senior software architect responsible for KadiSasa.

Inspect the entire existing application.

Identify the framework, architecture, routes, components, database, authentication, payment integrations, messaging integrations, analytics and SEO implementation.

Create an implementation plan for the redesign.

Do not modify application code yet.

Identify every existing feature that must remain functional.

Report architectural risks and recommended implementation order.

## PROMPT 2: DESIGN SYSTEM

Implement a modern responsive design system for KadiSasa.

Use the existing framework and component architecture.

Create reusable tokens, typography, spacing, buttons, cards, navigation and responsive layouts.

Follow the approved warm editorial SaaS design direction.

Preserve existing brand assets.

Do not modify business logic.

## PROMPT 3: HOMEPAGE

Redesign the KadiSasa homepage according to this specification.

Use the new positioning:

"Every guest invited. Every contribution tracked. Every arrival accounted for."

Implement all homepage sections.

Prioritise real product screenshots.

Ensure the homepage is fast, responsive, accessible and conversion-focused.

Preserve all existing application routes and integrations.

## PROMPT 4: LANDING PAGES

Audit existing service pages.

Improve their layout, content, metadata and internal linking.

Create missing landing pages for guest management, RSVP, QR admission, contributions, WhatsApp invitations and printed invitations.

Avoid duplicate search intent.

Preserve existing URLs and redirects.

## PROMPT 5: SEO IMPLEMENTATION

Implement technical SEO.

Audit and improve metadata, canonical URLs, hreflang, structured data, sitemap, robots.txt, Open Graph and internal linking.

Ensure all structured data represents genuine visible content.

Validate all important routes.

## PROMPT 6: TANZANIA AND KENYA

Implement the approved multilingual SEO architecture.

Prioritise Tanzania English and Swahili.

Prepare Kenya English pages.

Localise language, currency and relevant event terminology.

Clearly communicate unavailable services.

Do not claim unsupported payment or messaging functionality.

## PROMPT 7: GEO AND CONTENT

Implement AI-friendly content architecture.

Improve feature explanations, FAQs and product descriptions.

Publish the initial five content articles.

Add contextual internal links.

Use original content and genuine product examples.

## PROMPT 8: CONVERSION TRACKING

Audit the existing analytics implementation.

Implement missing conversion events.

Track registration, event creation, invitation creation, sharing and guest-management activity.

Avoid sending personally identifiable information to analytics providers.

Document all events and parameters.

## PROMPT 9: QA AND FINAL REVIEW

Perform a full regression audit.

Test all existing features and all new pages.

Check responsive behaviour, accessibility, SEO, structured data, performance and conversion workflows.

Fix identified defects.

Produce a report listing completed work, outstanding issues and any risks.

Do not deploy without approval.

# 16. ACCEPTANCE CRITERIA

The project is complete when:

[ ] Homepage communicates the complete KadiSasa value proposition.

[ ] Design works on desktop, tablet and mobile.

[ ] Existing authentication remains functional.

[ ] Event creation remains functional.

[ ] Invitation creation remains functional.

[ ] WhatsApp sharing remains functional.

[ ] SMS integration remains functional.

[ ] Guest management remains functional.

[ ] Contribution tracking remains functional.

[ ] QR admission remains functional.

[ ] Offline verification remains functional where previously supported.

[ ] Existing routes are preserved.

[ ] Pricing information is consistent.

[ ] Priority landing pages are implemented.

[ ] English and Swahili content is available as planned.

[ ] Kenya availability is accurately communicated.

[ ] Metadata is unique on all priority pages.

[ ] Canonical URLs are correct.

[ ] Hreflang is validated.

[ ] Structured data passes validation.

[ ] XML sitemap is accessible.

[ ] robots.txt is valid.

[ ] No broken internal links on priority pages.

[ ] Core Web Vitals are measured.

[ ] Conversion events are tested.

[ ] No personal guest information leaks into analytics.

[ ] Existing automated tests pass.

[ ] Production build succeeds.

[ ] Final implementation report is provided.

# 17. FINAL DEVELOPMENT PRINCIPLES

Prioritise:

1. Product clarity.
2. Conversion.
3. Mobile usability.
4. Existing functionality.
5. Search visibility.
6. Local market relevance.
7. Performance.
8. Accessibility.
9. Maintainability.

Do not introduce unnecessary dependencies.

Do not rewrite the entire application.

Do not duplicate existing features.

Do not invent product capabilities.

Do not publish unsupported customer claims.

Do not deploy automatically.

The final website should establish KadiSasa as a credible East African event invitation and guest-management platform, with Tanzania as its immediate commercial market and Kenya as its expansion market.

END OF SPECIFICATION
