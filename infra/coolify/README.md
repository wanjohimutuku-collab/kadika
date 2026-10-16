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
- The API is deployed before the web app, so new migrations are in place before the new web app calls it.
- The images are built for `linux/amd64`.

## One-time setup

### 1. GitHub environments

Create two environments, `staging` and `production`, under Settings → Environments. On `production`, add a
required reviewer and limit it to `v*` tags. The workflow reads these from the environment it deploys to:

| Kind     | Name                        | Value                                                                                                                                                                                                  |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Variable | `NEXT_PUBLIC_API_URL`       | Public `https://` address of that environment's API. **Required**; the build stops without it.                                                                                                         |
| Variable | `NEXT_PUBLIC_APP_DOMAIN`    | Optional. The domain shown as the official link, and when set it also turns on the host routing below. Set it on `production` only, to `kadisasa.com`. Defaults to `harusipass.co.tz` with no routing. |
| Variable | `NEXT_PUBLIC_SITE_URL`      | Optional. Defaults to `https://<app domain>`.                                                                                                                                                          |
| Variable | `NEXT_PUBLIC_KENYA_ENABLED` | Optional. `1` turns Kenya support on. Defaults to `0`.                                                                                                                                                 |
| Secret   | `COOLIFY_TOKEN`             | A Coolify API token that is allowed to deploy.                                                                                                                                                         |
| Secret   | `COOLIFY_API_DEPLOY_URL`    | The deploy webhook URL of the API application in Coolify.                                                                                                                                              |
| Secret   | `COOLIFY_WEB_DEPLOY_URL`    | The deploy webhook URL of the web application in Coolify.                                                                                                                                              |

The `NEXT_PUBLIC_*` values are baked into the web image when it is built, so changing one needs a new build, not
just a restart. Images are never built in mock mode. If the Coolify secrets are missing, the images are still
pushed and the deploy step is skipped with a warning.

### 2. GHCR access

The first push creates the two packages, private by default. Either make them public, or give Coolify a GitHub
personal access token with the `read:packages` scope as a registry credential so it can pull them.

### 3. Coolify

Create these services for each environment (staging before production):

- `api`: a Docker image application running `ghcr.io/<owner>/<repo>-api:staging` (or `:production`), port 3001.
  Environment: see [`/.env.example`](../../.env.example). The image's health check calls `/health`.
- `web`: a Docker image application running the `-web` image, port 3000. Its health check calls `/api/health`.
- `postgres`, `redis` and S3-compatible storage.

Each application's deploy webhook URL and a Coolify API token go into the GitHub secrets above. The menu names
differ a little between Coolify versions; look for the application's Webhooks section and the API tokens page.

**Migrations.** Run `node dist/migrate.js` in the new API image before it starts serving (`MIGRATIONS_DIR` is
already set to the bundled migration files). Check which Coolify hook runs a command in the new image rather than
the container being replaced, and use that one.

## Production hostnames (kadisasa.com)

One web image serves three surfaces, and the hostname decides which one a request reaches
([ADR 032](../../docs/adr/032-host-routing.md)). A request for a surface that lives on another host is redirected
there, so the staff panel never answers on the public host.

| Host                               | Serves                                            | Where                 |
| ---------------------------------- | ------------------------------------------------- | --------------------- |
| `kadisasa.com`, `www.kadisasa.com` | Public site and the guest card (`/c`, `/s`, `/k`) | the `web` application |
| `app.kadisasa.com`                 | Customer and reseller console (`/app`)            | the `web` application |
| `my.kadisasa.com`                  | Staff panel (`/ops`)                              | the `web` application |
| `api.kadisasa.com`                 | The API                                           | the `api` application |
| `blog.kadisasa.com`                | Nothing yet: there is no blog in this repo        | not deployed          |
| `mail.kadisasa.com`                | Nothing yet: there is no mail server in this repo | not deployed          |

In Coolify, give the **one** `web` application all four web domains (`kadisasa.com`, `www.kadisasa.com`,
`app.kadisasa.com`, `my.kadisasa.com`) and the `api` application `api.kadisasa.com`. Build the production image
with `NEXT_PUBLIC_APP_DOMAIN=kadisasa.com` and `NEXT_PUBLIC_API_URL=https://api.kadisasa.com`.

Settings for the `api` application in Coolify (see [`/.env.example`](../../.env.example) for the rest):

| Variable         | Value                                                                                            | Why                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `CORS_ORIGINS`   | `https://kadisasa.com,https://www.kadisasa.com,https://app.kadisasa.com,https://my.kadisasa.com` | The browser calls the API from all four web hosts.               |
| `SHORT_BASE_URL` | `https://kadisasa.com`                                                                           | Card links in SMS and WhatsApp messages open on the public host. |
| `APP_BASE_URL`   | `https://app.kadisasa.com`                                                                       | Used for the gate-join link and as the default allowed origin.   |

A staff member signs in at `my.kadisasa.com` and a customer at `app.kadisasa.com`. The session belongs to the host,
so signing in on the wrong one sends you to the right host to sign in again.

**DNS (Cloudflare).** `kadisasa.com`, `www`, `app`, `my` and `mail` already have records. `api` and `blog` do not;
add `api` before the first deploy, or the web app has no API to call. Turn the Cloudflare proxy off for anything
that carries mail (the `MX` target and the SMTP and IMAP hosts), because the proxy only carries web traffic. The
free Cloudflare certificate covers `kadisasa.com` and `*.kadisasa.com` only, so a name two levels down, such as
`api.staging.kadisasa.com`, will not get a valid certificate while it is proxied. For staging use a single-level
name such as `staging-api.kadisasa.com`.

## Rolling back

Point the Coolify application at an earlier `sha-<short>` or version tag and redeploy. Database migrations do not
roll back with the image, so check an old image still works with the current schema first.

## Not covered yet

- The workflow has not run end to end. It needs the environments, variables and secrets above, and Coolify
  services to deploy to.
- The images are not cached between builds: both Dockerfiles copy the whole repo before installing, so every
  build installs from scratch. Copying the lockfile and manifests first would let the install layer be reused.
- Backups, restore and uptime checks: see [`RESTORE.md`](RESTORE.md) and [`UPTIME.md`](UPTIME.md).
