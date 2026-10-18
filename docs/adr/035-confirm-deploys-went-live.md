# ADR 035: confirm each deploy went live

Status: accepted. Built in `.github/workflows/build-push.yml`; setup in `infra/coolify/README.md`.

## Context

After ADR 034 the workflow went green once it had moved the deploy branch. Nobody could tell from GitHub whether
Coolify then deployed, whether the migration passed, or whether the new containers turned healthy. The only way to
know was to open Coolify and look.

We also considered having Coolify track `main` and build the images itself, to make deploys faster. We did not do
that: every build would run `pnpm install` and `next build` on the VPS that also runs Coolify and the apps, which
is what caused the earlier 504s, and it would skip the cached GitHub build, the smoke test and the CI gate before
production. It would not fix the visibility problem either.

## Decision

- Both images are built with `GIT_SHA` (the commit) and report it as `version` on `/health` (API) and
  `/api/health` (web). Outside a release build it is `dev`. The field is optional in `healthResponseSchema`, so
  clients still accept an older server.
- The smoke test checks that each image reports the commit it was built from.
- After moving the deploy branch, the workflow polls the public health endpoints of that environment
  (`NEXT_PUBLIC_API_URL`, and `DEPLOY_WEB_URL` or `NEXT_PUBLIC_SITE_URL` for the web app) until both report the
  commit, for up to 15 minutes. If they never do, the run fails and the summary says where to look.
- GitHub's default notifications email the person who pushed when a run fails. Coolify's own deployment
  notifications are recommended on top (see the README).

## Consequences

- A green run now means the new version is serving. A red run on the last step means Coolify did not deploy it,
  the migration failed, or the containers never became healthy.
- `/health` exposes the commit hash. The repository is private and the hash gives nothing away, so this is fine.
- Without `DEPLOY_WEB_URL` or `NEXT_PUBLIC_SITE_URL` on an environment, only the API is confirmed, with a
  warning.
- A deploy takes as long as before. The wait just makes it visible.
