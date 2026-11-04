# SEO Audit: kadisasa.com

Audit date: 2026-11-04. Scope: all 64 sitemap URLs (sw, en, ke editions) fetched as raw HTML, plus `robots.txt`, sitemaps, `llms.txt`, redirects, response headers and a brand-mention search. Business type: **SaaS / service** (pricing page, sign-up, app download), not a local business, so no local or maps audit was run.

Not measured: Core Web Vitals (the PageSpeed API returned 429 without a key; no CrUX or Search Console access), rankings, backlinks, visual rendering at multiple sizes. Companion report: [GEO-ANALYSIS.md](GEO-ANALYSIS.md).

## SEO Health Score

| Category                              | Weight | Live site  | After the fixes below ship |
| ------------------------------------- | ------ | ---------- | -------------------------- |
| Technical SEO                         | 22%    | 35         | 78                         |
| Content quality                       | 23%    | 62         | 62                         |
| On-page SEO                           | 20%    | 82         | 84                         |
| Schema                                | 10%    | 60         | 80                         |
| Performance (not measured, TTFB only) | 10%    | 65         | 65                         |
| AI search readiness                   | 10%    | 48         | 62                         |
| Images                                | 5%     | 30         | 60                         |
| **Total**                             |        | **57/100** | **72/100**                 |

The fixes are in the working tree on `feat/kadisasa-site`, not deployed. The live site keeps its current score until they ship.

## What is already good

- Every page is server-rendered: full text, headings, FAQ answers and JSON-LD are in the first HTML response.
- Every content page has a unique title and description, a self-referencing canonical, correct `sw-TZ` / `en-TZ` / `en-KE` / `x-default` hreflang, breadcrumbs and a visible "updated" date.
- Answer-first layout: each guide opens with a 40 to 60 word "Jibu fupi" (short answer).
- 62 of 64 URLs returned 200 on the first try (the other 2 on retry); unknown paths return a real 404; trailing slashes 308 to the slash-less URL; HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` are set.

## Findings and status

### Critical

**1. robots.txt blocked 34 of 64 sitemap URLs. Fixed.**
`Disallow: /k` is a prefix rule, so it blocked `/ke`, every `/kadi-…` and `/ku…` page, and the main product page `/kadi-ya-harusi-mtandaoni`; `Disallow: /en/k` did the same in English. Every crawler was affected, including Googlebot.

- Change: [robots.ts](../../apps/web/app/robots.ts) now uses `/k$` and `/en/k$` (exact page only). `/k` also keeps its `noindex`.
- Guard: [robots.test.ts](../../apps/web/src/lib/robots.test.ts) parses the generated rules the way Google does (longest match wins) and asserts every sitemap URL is crawlable for every named bot, and that `/app`, `/ops`, `/c/`, `/s/`, `/k`, `/login`, `/api/` stay blocked. It fails against the old rules.
- How we would know it failed: Search Console "Blocked by robots.txt" count for these URLs stays above 0 two weeks after deploy.
- Leading indicator: Search Console > Pages > "Blocked by robots.txt" falling to 0; `/ke` and `/kadi-ya-harusi-mtandaoni` showing "URL is available to Google" in URL Inspection.

### High

**2. Organization logo blocked by robots.txt. Fixed.** `Disallow: /icons/` blocked `/icons/512.png`, the logo every page's schema names. The rule is removed (the folder only holds app icons).

**3. No link-preview image on any page. Fixed.** No `og:image`, and the Twitter card was `summary`. WhatsApp shares, which is how these pages travel, showed no picture.

- Change: new build-time route [app/og/[file]/route.tsx](../../apps/web/app/og/[file]/route.tsx) renders `/og/sw.png`, `/og/en.png`, `/og/ke.png` (1200×630: brand, headline, a sample card with a QR-like pattern that encodes nothing). `ogImages()` in [seo.ts](../../apps/web/src/lib/seo.ts) is added to every public page's metadata, including privacy and terms, which now use the shared metadata builder. The Twitter card becomes `summary_large_image` automatically.
- How we would know it failed: a WhatsApp or Facebook Sharing Debugger preview of `https://kadisasa.com/` still shows no image after deploy.

**4. `www.kadisasa.com` served a full duplicate of the site. Fixed.** It answered 200 (canonicals pointed at the bare domain, which limited the damage). The [middleware](../../apps/web/middleware.ts) now sends `www` to the bare domain with a permanent 308, path and query kept, after the surface rules so `www/login` still goes to the console host in one hop. Test added in [surfaces.test.ts](../../apps/web/src/lib/surfaces.test.ts).

**5. Plain `http://` redirects with a temporary 302. Open (infrastructure).** Permanent (301) is expected. This comes from the proxy, not the app: turn on Cloudflare "Always Use HTTPS" (301) or set the Coolify/Traefik HTTP→HTTPS redirect to permanent.

**6. No off-site brand presence. Open (outside the code).** A web search found no mentions of Kadi Sasa; it found a competitor, M-Kadi, with press coverage. Create and link a Google Business Profile, LinkedIn page, Instagram and a short Swahili YouTube demo; then add their URLs to `sameAs` in `organizationNode()` in [seo.ts](../../apps/web/src/lib/seo.ts). (No profile URLs exist yet, so none were added.)

### Medium

**7. Structured data improved. Fixed.**

- One shared Organization entity (`#org`) with logo size, `areaServed` and a `contactPoint` (the public `faragha@kadisasa.com` address) on every page, instead of an anonymous copy per guide. Articles now reference it as author and publisher.
- `/bei`: `Service` schema, plus an `AggregateOffer` with one `Offer` per price tier (TZS, quantity range) from the live price catalogue, **only when charging is switched on**, so the markup never quotes prices that don't apply.
- `/programu`: `SoftwareApplication` (Android, free), **only when a download exists**.
- Existing `FAQPage` markup is kept. Google retired FAQ rich results in May 2026, so expect no SERP feature from it.

**8. `/maswali` repeated its H1 as its only H2, and FAQ questions had no headings. Fixed.** The FAQ section skips the duplicate heading on the FAQ page itself, and every question on every content page is now an `<h3>` inside its `<summary>` (looks the same).

**9. Thin occasion pages. Open (content).** In `<main>`: `/kadi-ya-kitchen-party` 190 words, `/kadi-za-mwaliko-biashara` 179, `/kadi-ya-mahafali` 202, `/kadi-ya-kuzaliwa` 208, `/kusimamia-majibu-ya-rsvp` 237, and their English copies. Each needs a worked example, a wording sample and 2 to 3 FAQ answers specific to that occasion (aim for about 500 useful words). Content lives in `apps/web/src/content/pages/`.

**10. Pages are never cached. Open (deliberate trade-off).** Public pages return `Cache-Control: private, no-store` and Cloudflare reports `DYNAMIC`, because they read live prices and branding per request (`connection()`). Origin TTFB measured 0.4 to 0.7 s. Short ISR (for example `revalidate = 300`) on content pages would cut this without stale prices on `/bei`.

**11. No named author and no original data. Open (content).** Every article's author is the organisation. Add a named author or reviewer with a short bio on `/kuhusu`, and publish pilot results (CLAUDE.md §14 metrics: share of guests on the SMS path, median gate time, first-scan success) as one dated page. Detail in GEO-ANALYSIS.md §8.

### Low

**12. `llms.txt` listed none of the guides. Fixed.** It now lists the product page, the no-smartphone guide, the safety guide and the FAQ. (No ranking weight for Google; may help other assistants.)

**13. Titles over 60 characters. Open.** Home sw (65), `/en` (64), `/ke` (72), `/ke/data-requests` (65), `/en/ombi-la-data` (63), `/ke/wedding-invitation-wording` (62), `/ke/is-a-digital-wedding-invitation-safe` (61). Google truncates around 60; trim the tail ("| Kadi Sasa" or the second clause).

**14. Short titles and descriptions.** `/mawasiliano` title is 22 characters ("Mawasiliano | Kadi Sasa"); add what the page offers. Three Kenya descriptions run 165 to 168 characters.

**15. English pages use Swahili slugs** (`/en/kadi-ya-harusi-mtandaoni`). Acceptable; revisit if English search traffic matters.

**16. `Host:` directive in robots.txt** is Yandex-only. Harmless.

## Changed files

- `apps/web/app/robots.ts`, new `apps/web/src/lib/robots.test.ts`
- new `apps/web/app/og/[file]/route.tsx`; `apps/web/src/lib/seo.ts` (`ogImages`, `organizationNode`, `ORG_ID`)
- metadata: `apps/web/src/content/metadata.ts`, `app/(public)/page.tsx`, `bei/page.tsx`, `ke/page.tsx`, `programu/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`
- schema and headings: `apps/web/src/components/public/content-page.tsx`, `src/components/site/home-page.tsx`
- `apps/web/middleware.ts`, `apps/web/src/lib/surfaces.ts`, `src/lib/surfaces.test.ts`
- `apps/web/app/llms.txt/route.ts`

## After deploying

1. Open `https://kadisasa.com/robots.txt` and confirm `Disallow: /k$`.
2. In Search Console and Bing Webmaster Tools, resubmit `https://kadisasa.com/sitemap.xml` and request indexing for `/kadi-ya-harusi-mtandaoni`, `/kuhusu` and `/ke`.
3. Check `https://www.kadisasa.com/bei` returns 308 to `https://kadisasa.com/bei`.
4. Paste `https://kadisasa.com/` into WhatsApp and confirm the preview image.
5. Run the Rich Results Test on `/bei` (offers appear only while charging is on).
