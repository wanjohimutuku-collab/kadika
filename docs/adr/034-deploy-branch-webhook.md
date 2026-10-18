# ADR 034: deploy through Coolify's push webhook on a deploy branch

Status: accepted. Built in `.github/workflows/build-push.yml`; setup in `infra/coolify/README.md`.

## Context

The workflow built and pushed the images, then called the Coolify stack's deploy endpoint with `COOLIFY_TOKEN` and
`COOLIFY_DEPLOY_URL`. Those secrets were never stored in GitHub, so every run skipped the deploy with a warning and
nothing reached staging or production. We would rather not keep a Coolify API token in GitHub at all.

Coolify already receives the repository's push events through its GitHub App (the repository is private and has no
repository webhooks of its own), and a stack with **Auto Deploy** on redeploys when its tracked branch is pushed.
But the stack pulls prebuilt images (`:staging`, `:production`) and builds nothing. If it tracked `main`, the push
would reach Coolify a few minutes before GitHub Actions has built the new images, and every deploy would run the
previous build.

## Decision

- Each stack tracks a branch that only the workflow moves: `deploy/staging` (pushes to `main`, and manual runs on
  `main` with "deploy" ticked) and `deploy/production` (`v*` tags).
- The last step of the build job force-pushes the built commit to that branch with the workflow's own
  `GITHUB_TOKEN` (`contents: write`). It runs only after both images are pushed and passed the smoke test, so the
  push webhook fires only when the images Coolify pulls are the new ones.
- A manual run on any other branch never moves a deploy branch: its images are tagged `<branch>` and `sha-<short>`,
  not `staging`, so the stack would redeploy the old image.
- `COOLIFY_TOKEN` and `COOLIFY_DEPLOY_URL` are no longer read.

## Consequences

- No Coolify credential lives in GitHub. Revoking access is done in the Coolify GitHub App installation.
- Pushes made with `GITHUB_TOKEN` do not start other workflows, but GitHub still delivers them to apps and
  webhooks, so Coolify sees them. `build-push.yml` and `ci.yml` do not run on `deploy/*` either way.
- The deploy branch's history is rewritten on each deploy. Nobody should commit to it.
- Rolling back is still done by setting `IMAGE_TAG` in Coolify; moving `deploy/*` back alone redeploys the same
  `:staging`/`:production` image.
- The older `kadika-api-*` / `kadika-web-*` Coolify applications that build from `main` on the VPS should have Auto
  Deploy turned off, as the README already asks, or each merge triggers them too.
