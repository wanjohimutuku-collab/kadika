# Build, push and deploy

How a commit becomes a running server: [`.github/workflows/build-push.yml`](../../.github/workflows/build-push.yml)
builds the API and web images, pushes them to GitHub Container Registry (GHCR) and asks Coolify to redeploy.

## The flow

| You do                               | Images are tagged                                  | Coolify deploys |
| ------------------------------------ | -------------------------------------------------- | --------------- |
| Merge or push to `main`              | `staging`, `main`, `sha-<short>`                   | staging         |
| Push a tag such as `v1.2.3`          | `production`, `1.2.3`, `sha-<short>`               | production      |
| Run the workflow by hand on a branch | `<branch>`, `sha-<short>` (deploys only if ticked) | staging         |

- A release tag only builds if CI already passed on that commit, so tag a commit that is green on `main`.
- The images are `ghcr.io/<owner>/<repo>-api` and `ghcr.io/<owner>/<repo>-web` (lower case).
- `staging` and `production` move with each build. `sha-<short>` and the version tag never move, so use them to
  pin or roll back.
- One Coolify stack per environment ([`docker-compose.coolify.yml`](../../docker-compose.coolify.yml)) runs api,
  web, postgres and redis, so one webhook call redeploys it. The API (and its migrations) starts before the web app.
- The images are built for `linux/amd64`.

## One-time setup

### 1. GitHub environments

Create two environments, `staging` and `production`, under Settings → Environments. On `production`, add a
required reviewer and limit it to `v*` tags. The workflow reads these from the environment it deploys to:

| Kind     | Name                        | Value                                                                                                                                                                           |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variable | `NEXT_PUBLIC_API_URL`       | Public `https://` address of that environment's API. **Required**; the build stops without it.                                                                                  |
| Variable | `NEXT_PUBLIC_APP_DOMAIN`    | Optional. The official link domain; when set it also turns on host routing (below). Set it on `production` only, to `kadisasa.com`. Defaults to `harusipass.co.tz`, no routing. |
| Variable | `NEXT_PUBLIC_SITE_URL`      | Optional. Defaults to `https://<app domain>`.                                                                                                                                   |
| Variable | `NEXT_PUBLIC_KENYA_ENABLED` | Optional. `1` turns Kenya support on. Defaults to `0`.                                                                                                                          |
| Secret   | `COOLIFY_TOKEN`             | A Coolify API token that is allowed to deploy.                                                                                                                                  |
| Secret   | `COOLIFY_DEPLOY_URL`        | The stack's "Deploy Webhook" URL in Coolify (Webhooks tab).                                                                                                                     |

The `NEXT_PUBLIC_*` values are baked into the web image when it is built, so changing one needs a new build, not
just a restart. Images are never built in mock mode. If the Coolify secrets are missing, the images are still
pushed and the deploy step is skipped with a warning.

### 2. GHCR access

The first push creates the two packages, private by default. Either make them public, or give Coolify a GitHub
personal access token with the `read:packages` scope as a registry credential so it can pull them.

### 3. Coolify (one stack per environment)

On coolify.korahost.com, for staging (production is the same with the production values):

1. **+ New → Application → Public/Private GitHub repository**, branch `main`, build pack **Docker Compose**.
   Base directory `/`, Docker Compose location `/docker-compose.coolify.yml`. Coolify only reads the compose file
   from the repo; it pulls the prebuilt GHCR images and builds nothing on the VPS.
2. **Domains.** Coolify lists `api` and `web`. Set e.g. `https://api.staging.<domain>` on `api` and
   `https://staging.<domain>` on `web`. The `api` domain must equal the `NEXT_PUBLIC_API_URL` GitHub variable.
   DNS: an A record per domain pointing at the VPS. Behind Cloudflare's proxy, set SSL/TLS to **Full (strict)**.
3. **Environment variables.** Coolify generates the database and Redis passwords, `JWT_SECRET`,
   `KEY_ENC_SECRET` and `WEBHOOK_SECRET` (the `SERVICE_*` magic variables) and keeps them. Fill in:
   - `SHORT_BASE_URL` (required; the short link domain, or the web URL),
   - `IMAGE_TAG`: leave `staging`; use `production` on the production stack,
   - the SMS, WhatsApp and payment provider values when they are chosen (all default to `fake`).

   Never regenerate or edit `KEY_ENC_SECRET` once events exist: it decrypts every event's signing key.

4. **GHCR pull access** (step 2) on the server, then **Deploy** once by hand.
5. **Webhooks tab → Deploy Webhook** URL goes into the `COOLIFY_DEPLOY_URL` secret, and a token from
   **Keys & Tokens → API tokens** (deploy permission) into `COOLIFY_TOKEN`.

**Migrations.** The stack's `api` command runs `node dist/migrate.js` before the server starts, in the new
image, so no Coolify pre-deployment hook is needed. Keep one `api` container: the migrator takes no lock.

**Backups.** Postgres lives in the stack's `pgdata` volume. Schedule `infra/backup/pg-backup.sh` (see
[`RESTORE.md`](RESTORE.md)); Coolify's built-in scheduled backups only cover standalone database resources.

## Production hostnames (kadisasa.com)

One web image serves three surfaces, and the hostname decides which one a request reaches
([ADR 032](../../docs/adr/032-host-routing.md)). A request for a surface that lives on another host is redirected
there, so the staff panel never answers on the public host.

| Host                               | Serves                                            | Where             |
| ---------------------------------- | ------------------------------------------------- | ----------------- |
| `kadisasa.com`, `www.kadisasa.com` | Public site and the guest card (`/c`, `/s`, `/k`) | the `web` service |
| `app.kadisasa.com`                 | Customer and reseller console (`/app`)            | the `web` service |
| `my.kadisasa.com`                  | Staff panel (`/ops`)                              | the `web` service |
| `api.kadisasa.com`                 | The API                                           | the `api` service |
| `blog.kadisasa.com`                | Nothing yet: there is no blog in this repo        | not deployed      |
| `mail.kadisasa.com`                | Nothing yet: there is no mail server in this repo | not deployed      |

In the production stack, give the **one** `web` service all four web domains (`kadisasa.com`, `www.kadisasa.com`,
`app.kadisasa.com`, `my.kadisasa.com`), with `https://kadisasa.com` first, and the `api` service `api.kadisasa.com`.
The stack sets `CORS_ORIGINS` and `APP_BASE_URL` from the `web` service's first domain. Build the production image
with `NEXT_PUBLIC_APP_DOMAIN=kadisasa.com` and `NEXT_PUBLIC_API_URL=https://api.kadisasa.com`.

Environment variables for the production stack's `api` service (see [`/.env.example`](../../.env.example) for the rest):

| Variable             | Value                                                                       | Why                                                                                                       |
| -------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `CORS_EXTRA_ORIGINS` | `https://www.kadisasa.com,https://app.kadisasa.com,https://my.kadisasa.com` | The browser calls the API from every web host; the stack already allows the `web` service's first domain. |
| `SHORT_BASE_URL`     | `https://kadisasa.com`                                                      | Card links in SMS and WhatsApp messages open on the public host.                                          |

A staff member signs in at `my.kadisasa.com` and a customer at `app.kadisasa.com`. The session belongs to the host,
so signing in on the wrong one sends you to the right host to sign in again.

**DNS (Cloudflare).** `kadisasa.com`, `www`, `app`, `my` and `mail` already have records. `api` and `blog` do not;
add `api` before the first deploy, or the web app has no API to call. Turn the Cloudflare proxy off for anything
that carries mail (the `MX` target and the SMTP and IMAP hosts), because the proxy only carries web traffic. The
free Cloudflare certificate covers `kadisasa.com` and `*.kadisasa.com` only, so a name two levels down, such as
`api.staging.kadisasa.com`, will not get a valid certificate while it is proxied. For staging use a single-level
name such as `staging-api.kadisasa.com`.

## Rolling back

Set the stack's `IMAGE_TAG` to an earlier `sha-<short>` or version tag and redeploy. Database migrations do not
roll back with the image, so check an old image still works with the current schema first.

## Keeping deploys fast

**The pipeline.** A push to `main` builds both images in parallel in GitHub Actions (`docker buildx bake`,
[`infra/docker/docker-bake.hcl`](../docker/docker-bake.hcl)), with the layer cache in the GitHub Actions cache.
The dependency install is reused until the lockfile or a `package.json` changes, so a code-only change rebuilds
just the app (about a minute, versus about four before). Each image is then booted and its `/health` checked
before Coolify is asked to deploy, so an image that cannot start never reaches the server. Coolify only pulls.

**The server.** Coolify, its deployments and every app share one VPS, so anything that builds on it slows the
rest, including the Coolify UI (504/524 timeouts through Cloudflare).

1. **Never build on the VPS.** The older `kadika-api-*` / `kadika-web-*` applications (Dockerfile build pack, GitHub
   App) rebuild from source, `pnpm install` and `next build` each, on every push to `main`, for staging _and_
   production, which is four builds per merge. The compose stack replaces them: turn off their auto-deploy, or
   delete them once nothing depends on them.
2. **One deployment at a time.** Server → Settings: set concurrent builds to 1, so a burst of deploys queues instead
   of competing for CPU and memory.
3. **Docker cleanup.** Server → Settings → Docker cleanup: enable the scheduled cleanup (e.g. daily) with a disk
   threshold around 80%. Old images and build cache otherwise fill the disk and slow Docker down.
4. **Headroom.** On the VPS check `free -m`, `df -h` and `docker stats --no-stream`. With 4 GB RAM or less, add swap
   (2–4 GB) so a spike swaps instead of freezing; set resource limits on the heaviest stacks.
5. **Real-time service.** The Coolify UI logs "Cannot connect to real-time service": its websocket ports are not
   reachable through Cloudflare, which makes pages slower and status updates stale. Follow Coolify's Cloudflare
   guide for the real-time ports.

## Not covered yet

- The stack has not been deployed yet: it needs the Coolify setup and the secrets above.
- The API image carries React Native and Expo packages (`drizzle-orm`'s optional `expo-sqlite` peer is resolved
  against the mobile app), roughly 300 MB the server never uses. Slimming it would make every pull faster.
- Backups, restore and uptime checks: see [`RESTORE.md`](RESTORE.md) and [`UPTIME.md`](UPTIME.md).
