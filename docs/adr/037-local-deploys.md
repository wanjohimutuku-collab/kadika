# ADR 037: deploy from a local machine when Actions is unavailable

Status: accepted. Built in `scripts/deploy.sh`; setup in `infra/coolify/README.md`.

## Context

The deploy path depended entirely on GitHub Actions (`build-push.yml`). When that workflow does not run or goes
red, for example a missing environment variable, an Actions outage or a billing limit, nothing moves
`deploy/staging`, Coolify never redeploys, and the only recourse is to debug CI first.

## Decision

`scripts/deploy.sh staging|production` does the same job from a developer machine:

1. Checks the commit (staging: HEAD is `origin/main`; production: HEAD carries a `v1.2.3` tag and is on `main`).
2. Builds both images with the existing bake file, using a local layer cache instead of the Actions cache.
3. Boots them and checks `/health` reports the commit, plus `/sw.js`, before anything leaves the machine.
4. Pushes the tags to GHCR with a personal access token (`write:packages`).
5. Force-moves `deploy/<environment>`; Coolify's own push webhook redeploys, exactly as in ADR 034.
6. Polls the live health endpoints until they report the commit (ADR 035).

Settings and the token live in the gitignored `.deploy.env`. `--dry-run` builds and smoke-tests only.

## Consequences

- Deploys no longer need Actions. The workflow stays as the default path; a local deploy and a workflow run
  produce the same tags and branch moves, so they can be mixed.
- The build runs on the developer's machine, so it needs Docker and a decent connection to push the layers.
- A personal token with package write access sits on that machine. Treat `.deploy.env` like a password.
- The CI gate before production (ADR 034) is replaced by the script's own checks; run the tests first.
