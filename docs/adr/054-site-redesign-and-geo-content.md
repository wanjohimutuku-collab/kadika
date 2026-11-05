# ADR 054: Site redesign, AI-search content and the app on the website

Status: accepted (2026-11-05).

## Context

The Kadi Sasa marketing site (ADR 005, kit `brand.md`) was correct but plain, and the SEO audit
(`docs/seo/SEO-AUDIT.md`) left content items open: thin occasion pages, long titles, an `llms.txt` that listed
a handful of pages. The 2026-10-20 SEO and AI SEO strategy also named pages that did not exist yet
(nikah/walima, a Tanzania market page). Several pages still said guests pay contributions "from the card",
which ADR 043 turned off.

## Decision

1. **Look.** Same brand tokens and fonts (Figtree, Fraunces italic), new layer in `globals.css`: warm mesh
   light behind heroes, nested "bezel" cards (outer tray + inner core), pill buttons with the arrow in its own
   circle, eyebrow tags, a floating glass pill header with a morphing menu button, and an asymmetric bento for
   the home page features. Scroll reveals use the CSS view timeline only (no JavaScript), animate transform
   and opacity only, and switch off under `prefers-reduced-motion`; browsers without view timelines show the
   content as is. The axe e2e run uses reduced motion so it judges the settled page.
2. **The app on the site.** The home page has an Android app section (organizer dashboard and offline gate,
   drawn in markup, not screenshots) linking to `/programu`, which gets the same treatment. The app's own
   welcome screen shows a sample guest card and the three things the app does, with the actions in the thumb
   zone.
3. **Content for search and AI answers.** Four new pages in `content/pages/geo.ts`: nikah and walima, digital
   invitations in Tanzania, how to choose an invitation service (buyer's checklist), and a wedding glossary.
   Worked examples, wording samples and occasion-specific answers for the five thin pages live in
   `content/pages/expansions.ts` and are appended at load. Home pages add `WebPage` (with `speakable`) and
   `HowTo` nodes. `llms.txt` is generated from the content (key facts plus every page), and `/llms-full.txt`
   serves every guide as Markdown.
4. **Truthful claims.** Contribution copy now says guests pay the hosts directly and Kadi Sasa keeps only the
   records (ADR 043). Titles over 60 characters were shortened.

## Consequences

- One CSS layer to maintain beside the §17.2 tokens; it is scoped to `.ks`, so the console, guest card and
  gate are unaffected.
- Content pages stay data (`ContentPageDef`), so the sitemap, hreflang, JSON-LD and `llms*.txt` pick up new
  pages without extra wiring.
- Off-site authority (Google Business Profile, social profiles, `sameAs`), named authors and real pilot
  numbers are still open and cannot be solved in code.
