# 062 — Brand entity name and search signals

Date: 2026-11-26 · Status: accepted

## Context

The SEO/GEO audit found three problems with how search and answer engines see the business:

- The visible brand is "Kadi Sasa", but the domain and the growth spec say "KadiSasa", so engines may treat them as two entities.
- `sameAs` and the support phone never reached production builds, because the variables were not passed to the image build.
- The structured data listed Uganda as a served country and gave Uganda pages a `Service` node, although Uganda is planned.

## Decision

- **Display name stays "Kadi Sasa".** It is the name in `DEFAULT_BRANDING`, the Swahili copy, the OG images and the ops branding setting. Renaming the visible text is a brand change for the owner to make, not an SEO fix. The shared Organization node lists `alternateName: ["KadiSasa", "kadisasa.com"]`, so all spellings resolve to one entity (`#org`).
- **Profile links, support phone and Google/Bing verification tokens are build variables** (`NEXT_PUBLIC_SOCIAL_URLS`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`) on the GitHub `production` environment (infra/coolify/README.md). None of them is a secret.
- **Only markets served today appear as served.** The Organization lists `areaServed: ["TZ", "KE"]`. Uganda pages keep their WebPage, FAQ and breadcrumb data but have no `Service` node until Uganda launches.
- **Articles credit the Organization as author**, not a `Person` standing in for a team.
- **IndexNow runs after each production deploy.** The public key file lives at `apps/web/public/<key>.txt`, and every sitemap URL is submitted to `api.indexnow.org` (Bing, Yandex, Seznam, Naver). The step is best effort. Google has no ping endpoint, so Google relies on the sitemap submitted once in Search Console.

## Consequences

When Uganda launches, add `UG` to `SERVED_COUNTRIES` (`apps/web/src/lib/seo.ts`) and restore its Service nodes.
