# ADR 038: Coolify builds the images on the server

Status: accepted. Supersedes the registry step of ADR 034 and 037 for the default deploy path.

## Context

With GitHub Actions removed (ADR 037) the images had to be pushed to GHCR from a developer machine, which needs a
personal access token with `write:packages`. None was available, and the Docker login on the machine was denied.
ADR 035 had rejected server-side builds because `pnpm install` and `next build` on the VPS that also runs the apps
caused 504s, but that trade-off is acceptable compared with having no working deploy.

## Decision

- `docker-compose.coolify.yml` builds `api` and `web` from the repo (`build:` with the existing Dockerfiles)
  instead of pulling from GHCR. `GIT_SHA` is Coolify's `SOURCE_COMMIT`, so `/health` still reports the commit.
- The `NEXT_PUBLIC_*` values the web bundle bakes in are now variables on the Coolify resource
  (`NEXT_PUBLIC_API_URL` is required and blocks the deploy if missing).
- `scripts/deploy.sh staging|production` checks the commit, force-moves `deploy/<environment>`, and waits for the
  live `/health` endpoints to report the commit. `--registry` keeps the build-here-and-push-to-GHCR flow for when a
  token exists; that flow needs the compose file's `image:` lines pointed back at GHCR.

## Consequences

- No registry and no token. The only credential is push access to the repository.
- Builds run on the VPS: a deploy takes several minutes and uses its CPU and memory while it runs. Watch the first
  few deploys, and move to `--registry` if the apps degrade during a build.
- A failed build leaves the previous containers running; Coolify only swaps them once the new ones are healthy.
