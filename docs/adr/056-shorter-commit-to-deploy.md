# ADR 056: Shorten the path from commit to production

Date: 2026-11-05 · Status: accepted

## Context

Measured on the releases v0.7.9 to v0.7.12: a green merge took 14 to 15 minutes to go live, and 38 to 59 minutes
when Lighthouse flaked and someone had to press re-run. The time went to `web-e2e` (8 to 9.5 minutes, run once on
the PR and again on main), then the image build (3 to 6 minutes) and the Coolify deploy (2 minutes). 18 of the last
21 PR merges produced a commit with exactly the files of the PR head, so the second CI run proved nothing new.

## Decision

- A `changes` job classifies each CI run. A merge whose files match a PR head that passed CI skips the rest, so the
  release starts at once. A PR that cannot affect the web app skips the browser checks, and docs or deploy config
  get Prettier only. Anything it cannot classify runs everything.
- The Playwright suite runs in three shards, and the axe tests run in parallel mode so they can spread over them.
  Lighthouse has its own job and retries once automatically. The required `web-e2e` check is now a job that fails
  unless every browser job passed or was skipped by `changes`. `pnpm audit` has its own job.
- `warm-caches.yml` refreshes main's caches, because a skipped CI run saves none and PRs can only read main's.
- Trivy runs beside the deploy instead of before it: it reports and blocks nothing.
- Each image copies only the packages it is built from, so an unrelated change reuses its build. The API's
  `node_modules` layer comes from the manifests alone, so a release that changes no dependency neither pushes nor
  pulls it. Next's compile cache no longer goes into the registry layer cache.
- Health checks poll every 2 seconds during the start period (`--start-interval`).

## Consequences

- Safety is unchanged: required checks still report, migrations still run before the API starts, images are still
  smoke-tested before they are promoted, and the deploy still waits for `/health` to report the commit.
- A merge that changes files compared with its PR head (the PR was behind main) still gets a full CI run first.
- A new workspace package must be added to the `COPY` lines of each Dockerfile that uses it. The build fails until
  it is, so this cannot ship broken.
- The scan's result can arrive after the deploy. It was report-only already.
