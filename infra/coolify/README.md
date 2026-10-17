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

| Kind     | Name                        | Value                                                                                          |
| -------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| Variable | `NEXT_PUBLIC_API_URL`       | Public `https://` address of that environment's API. **Required**; the build stops without it. |
| Variable | `NEXT_PUBLIC_APP_DOMAIN`    | Optional. The domain shown as the official link. Defaults to `harusipass.co.tz`.               |
| Variable | `NEXT_PUBLIC_SITE_URL`      | Optional. Defaults to `https://<app domain>`.                                                  |
| Variable | `NEXT_PUBLIC_KENYA_ENABLED` | Optional. `1` turns Kenya support on. Defaults to `0`.                                         |
| Secret   | `COOLIFY_TOKEN`             | A Coolify API token that is allowed to deploy.                                                 |
| Secret   | `COOLIFY_DEPLOY_URL`        | The stack's "Deploy Webhook" URL in Coolify (Webhooks tab).                                    |

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

## Rolling back

Set the stack's `IMAGE_TAG` to an earlier `sha-<short>` or version tag and redeploy. Database migrations do not
roll back with the image, so check an old image still works with the current schema first.

## Not covered yet

- The stack has not been deployed yet: it needs the Coolify setup and the secrets above.
- The images are not cached between builds: both Dockerfiles copy the whole repo before installing, so every
  build installs from scratch. Copying the lockfile and manifests first would let the install layer be reused.
- Backups, restore and uptime checks: see [`RESTORE.md`](RESTORE.md) and [`UPTIME.md`](UPTIME.md).
