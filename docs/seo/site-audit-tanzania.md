# Site audit and Tanzania SEO / AI-citation build

Date: 2026-10-15. Scope: public site (`apps/web`) for Tanzanian searches, Swahili first. Companion to
`keyword-and-geo-plan.md` (market research and keyword hypotheses).

## 1. Audit of what existed

| Area | Finding | Effect |
|---|---|---|
| Pages | Only `/`, `/privacy`, `/terms` were indexable. Nothing could rank for "kadi ya harusi mtandaoni", "michango ya harusi", "send-off", "uchumba". | No pages for the queries in the plan |
| Landing copy | Wedding-only wording; no plain definition of the product; no mention of send-off, uchumba or kitchen party; six FAQs but no FAQ markup; no internal links | Weak topical match, nothing for AI to quote |
| Title and description | Title was a slogan with no location or keyword; description reused the hero line | Poor snippet, no "Tanzania" |
| Legal | Privacy and terms were short drafts (about 8 and 5 short paragraphs) with no controller identity, retention limit, transfers, children, complaint route, cookies, data-request or acceptable-use pages | Weak trust signals; gaps a lawyer must fill |
| Technical | No robots, sitemap, canonicals or hreflang; cookie-only language switching meant crawlers only ever saw Swahili | Fixed in the previous change (robots, sitemap, `?lang=` URLs) |
| Trust / E-E-A-T | No about, contact or authorship; no company details | Still open (section 5) |

## 2. What was built

Content system: `apps/web/src/content` (typed pages, Swahili and English), rendered by
`components/public/content-page.tsx` at `app/(public)/[slug]`. Server-rendered, no client JS beyond the
language chip. Each page has: an answer-first "Jibu fupi / Short answer" box (25 to 75 words), sectioned
content with tables and lists, an FAQ, related links, breadcrumbs and JSON-LD (`WebPage` or `Article`,
`BreadcrumbList`, `FAQPage`). A unit test (`content.test.ts`) checks title and description length, answer
length, both languages complete, matching section and FAQ counts, unique slugs and valid related links.

| Slug | Purpose | Main query theme |
|---|---|---|
| `/kadi-ya-harusi-mtandaoni` | Product | digital wedding card Tanzania |
| `/michango-ya-harusi` | Product | michango, pledges, committee |
| `/kadi-ya-send-off` | Product | send-off invitation |
| `/kadi-ya-uchumba` | Product | engagement / uchumba |
| `/kadi-ya-harusi-bila-smartphone` | Guide | guests without smartphones |
| `/usalama-wa-kadi-za-mtandaoni` | Guide | is a digital card a scam |
| `/lango-la-harusi-qr` | Guide | gate check-in, offline QR |
| `/maneno-ya-kadi-ya-harusi` | Guide | invitation wording, 8 samples |
| `/maswali` | Company | FAQ hub (15 questions) |
| `/kuhusu`, `/mawasiliano` | Company | about, contact |
| `/privacy`, `/terms` | Legal | rewritten, fuller |
| `/cookies`, `/ombi-la-data`, `/matumizi-yanayokubalika` | Legal | cookies, data requests, acceptable use |

Also: home page now has a definition block, event-type links, FAQ markup, a keyworded title and
description, and "Tanzania" as the area served; footer lists every page by group; sitemap lists all pages
with `lastModified`; `/llms.txt` summarises the site for AI assistants (unproven convention, harmless).

Language: Swahili has the clean URL, English is `?lang=en`, each with canonical and hreflang.

## 3. Why these choices (Tanzania)

- Google has about 99% of Tanzanian mobile search (Statcounter), so classic on-page SEO comes first.
- Competitors (Envaita, Ekadi, M-Kadi) have product pages but little Swahili guide content; the trust and
  wording pages target queries nobody answers well. One SERP check only; verify per query.
- AI answers quote short, direct, structured passages. Every page opens with a self-contained answer,
  uses tables and numbered steps, states facts plainly, and carries dates and FAQ pairs.
- Claims on pages follow what the product does (checked against the codebase). Things not decided are
  stated as not yet decided (payout to committees, pricing, hosting location), not promised.

## 4. Legal pages: what is and is not done

Drafts, flagged with a banner on the page, and written to match actual behaviour (data collected, device
storage, 30-day deletion, hashed and encrypted tokens, no ad cookies). A Tanzanian lawyer must still:

1. Add the legal entity name, registration number and address; state controller/processor roles.
2. Confirm the lawful basis for each processing purpose under the Personal Data Protection Act, 2022, and
   whether registration with the data protection authority is required; add the authority's name and
   complaint route (left as a visible placeholder).
3. Set the maximum retention period after an event, and where servers are located and any cross-border
   transfer.
4. Set liability cap, governing courts, and payout, fee and refund terms once real payments start.
5. Review the cookies page again if analytics is added (consent).

## 5. Open items (not done here, with reasons)

- **Native Swahili review** of all pages (also required by the project spec). Wording samples, legal text
  and idioms need a native editor before launch.
- **Company identity** for the About page and structured data (name, address, phone, social profiles):
  not invented. Add when real, then extend `Organization` JSON-LD with `sameAs` and `contactPoint`.
- **Pricing page**: pricing is an open decision. FAQs say "free during pilot".
- **Original data pages** (wedding costs, guest statistics): need real pilot data.
- **Off-site**: Search Console and Bing Webmaster Tools set-up, press outreach, directory listings,
  Google Business Profile, and a monthly AI-citation check. These need accounts and real-world action.
- **Kenya pages** (`/ke/...`) wait for the domain decision; these pages are Tanzania-focused
  (`en_TZ`, TZS-free, Tanzanian mobile money).
- **Performance check** on a production build (Lighthouse) before launch.

## 6. How to measure

Search Console queries per page; Bing Webmaster for ChatGPT visibility; referral sessions from AI
assistants; a monthly list of 20 questions run in ChatGPT, Perplexity, Gemini and Claude, noting whether
we are cited. Update `updated` dates in `src/content/pages/*.ts` when a page changes materially.
