# Build, push and deploy

> **Releases deploy from GitHub Actions again** (`.github/workflows/build-push.yml`): push a `v*` tag on a commit
> that is green on `main`. The images build while the run checks CI, become `:production` only once CI has
> passed, and the run waits until the site reports the new commit (about 7 minutes from tag to live).
> `./scripts/deploy.sh` ([ADR 037](../../docs/adr/037-local-deploys.md)) is the fallback when Actions cannot run,
> for example when the account's Actions budget is used up; see "Deploying without GitHub Actions" below.
>
> The API's public addresses come from the Coolify variables `PUBLIC_WEB_URL` and `PUBLIC_API_URL`
> (`docker-compose.coolify.yml`). Coolify's own `SERVICE_URL_*` stay empty on this stack.

How a commit becomes a running server: the release workflow (or `scripts/deploy.sh`) builds the API and web
images, pushes them to GitHub Container Registry (GHCR), then moves a deploy branch to that commit. Each Coolify stack tracks its deploy branch with **Auto Deploy** on, so Coolify's own GitHub push webhook
redeploys it, and only once the new images exist ([ADR 034](../../docs/adr/034-deploy-branch-webhook.md)). The run
then waits until the live API and web app report the new commit, so a green run means the deploy is live
([ADR 035](../../docs/adr/035-confirm-deploys-went-live.md)).

## The flow

| You do                               | Images are tagged                    | Branch moved                           | Coolify deploys |
| ------------------------------------ | ------------------------------------ | -------------------------------------- | --------------- |
| Merge or push to `main`              | `staging`, `main`, `sha-<short>`     | `deploy/staging`                       | staging         |
| Push a tag such as `v1.2.3`          | `production`, `1.2.3`, `sha-<short>` | `deploy/production`                    | production      |
| Run the workflow by hand on `main`   | `staging`, `main`, `sha-<short>`     | `deploy/staging` if "deploy" is ticked | staging         |
| Run the workflow by hand on a branch | `<branch>`, `sha-<short>`            | none                                   | nothing         |

- A release tag only builds if CI already passed on that commit, so tag a commit that is green on `main`.
- The images are `ghcr.io/<owner>/<repo>-api` and `ghcr.io/<owner>/<repo>-web` (lower case).
- `staging` and `production` move with each build. `sha-<short>` and the version tag never move, so use them to
  pin or roll back.
- One Coolify stack per environment ([`docker-compose.coolify.yml`](../../docker-compose.coolify.yml)) runs api,
  web, postgres and redis, so one push to its deploy branch redeploys it. The API (and its migrations) starts
  before the web app.
- The branch moves only after both images are pushed and pass the smoke test. The stack never tracks `main`
  directly: a push to `main` reaches Coolify minutes before the new images exist, so it would redeploy the old ones.
- Never commit to `deploy/*` by hand. The workflow force-moves them, and nothing else should.
- The images are built for `linux/amd64`.

## One-time setup

### 1. GitHub environments

Create two environments, `staging` and `production`, under Settings → Environments. On `production`, add a
required reviewer and limit it to `v*` tags. The workflow reads these from the environment it deploys to:

| Kind     | Name                        | Value                                                                                                                                                                        |
| -------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variable | `NEXT_PUBLIC_API_URL`       | Public `https://` address of that environment's API. **Required**; the build stops without it.                                                                               |
| Variable | `NEXT_PUBLIC_APP_DOMAIN`    | Optional. The official link domain; when set it also turns on host routing (below). Set it on `production` only, to `kadisasa.com`. Defaults to `kadisasa.com`, no routing.  |
| Variable | `NEXT_PUBLIC_SITE_URL`      | Optional. Defaults to `https://<app domain>`.                                                                                                                                |
| Variable | `NEXT_PUBLIC_KENYA_ENABLED` | Optional. `1` turns Kenya support on. Defaults to `0`.                                                                                                                       |
| Variable | `DEPLOY_WEB_URL`            | Optional. Public `https://` address of that environment's web app, used to confirm the deploy. Defaults to `NEXT_PUBLIC_SITE_URL`; without either only the API is confirmed. |

The `NEXT_PUBLIC_*` values are baked into the web image when it is built, so changing one needs a new build, not
just a restart. Images are never built in mock mode. No Coolify secret is needed in GitHub: the workflow's own
token moves the deploy branch, and Coolify hears about it through its GitHub App.

### 2. GHCR access

The first push creates the two packages, private by default. Either make them public, or give Coolify a GitHub
personal access token with the `read:packages` scope as a registry credential so it can pull them.

### 3. Coolify (one stack per environment)

On **coolify.kadisasa.com** (the kadisasa VPS; not the older coolify.korahost.com), project
`kadika`, for staging (production is the same with the production values):

1. **+ New → Application → Private Repository (with GitHub App)**, branch **`deploy/staging`** (`deploy/production`
   for production), build pack **Docker Compose**. Base directory `/`, Docker Compose location
   `/docker-compose.coolify.yml`. Coolify only reads the compose file from the repo; it pulls the prebuilt GHCR
   images and builds nothing on the VPS. The branch exists after the first workflow run that deploys; run the
   workflow on `main` with "deploy" ticked if it does not exist yet.
2. **Domains.** Coolify lists `api` and `web`. Staging uses `https://staging-api.kadisasa.com` (port 3001) on
   `api` and `https://staging.kadisasa.com` (port 3000) on `web`; single-level names, so Cloudflare's free
   certificate covers them. The `api` domain must equal the `NEXT_PUBLIC_API_URL` GitHub variable.
   DNS: an A record per domain pointing at the VPS. Behind Cloudflare's proxy, set SSL/TLS to **Full (strict)**.
3. **Environment variables.** Coolify generates the database and Redis passwords, `JWT_SECRET`,
   `KEY_ENC_SECRET` and `WEBHOOK_SECRET` (the `SERVICE_*` magic variables) and keeps them. Fill in:
   - `SHORT_BASE_URL` (required; the short link domain, or the web URL),
   - `IMAGE_TAG`: leave `staging`; use `production` on the production stack,
   - the SMS, WhatsApp and payment provider values when they are chosen (all default to `fake`),
   - `ANDROID_PLAY_URL` and `ANDROID_APK_URL` (optional, `https://` only): the Google Play listing and a direct
     APK download shown on `/programu`. Leave both empty until the app is published and the page says it is
     coming soon. They are read by the running `web` service, so a change needs a restart, not a new build.

   Never regenerate or edit `KEY_ENC_SECRET` once events exist: it decrypts every event's signing key.

4. **GHCR pull access** (step 2) on the server, then **Deploy** once by hand.
5. **Configuration → General → Auto Deploy: on.** The GitHub App already delivers push events, so there is no
   webhook to add in GitHub. To check it: run the workflow on `main` with "deploy" ticked, look for
   `Deploy requested: deploy/staging -> <sha>` in the run summary, and a new deployment in Coolify's Deployments tab
   a few seconds later. If nothing arrives, open the GitHub App's **Advanced → Recent Deliveries** in GitHub
   (Settings → Developer settings → GitHub Apps) and check the `push` delivery for `deploy/staging`.

**Migrations.** The stack's `api` command runs `node dist/migrate.js` before the server starts, in the new
image, so no Coolify pre-deployment hook is needed. Keep one `api` container: the migrator takes no lock.

**Backups.** Postgres lives in the stack's `pgdata` volume. Coolify's built-in scheduled backups only cover
standalone database resources, so the stack has its own `backup` service: a nightly `pg_dump` (23:00 UTC, 02:00
in Dar es Salaam) into the `pgbackups` volume, 14 days kept, plus a first dump when it starts. Set
`BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` (and `BACKUP_S3_ENDPOINT` for R2) so
each dump is also copied off the server, and `BACKUP_HEARTBEAT_URL` to a monitor's push URL (see
[`UPTIME.md`](UPTIME.md)). Restore steps: [`RESTORE.md`](RESTORE.md).

## Owner actions (production readiness)

From the audit in [`docs/ops/production-readiness-audit.md`](../../docs/ops/production-readiness-audit.md). None of
these can be done from the repository.

- [ ] **Backups off the server.** Redeploy so the `backup` service starts, and check its log for
      `[backup] wrote …`. Set the `BACKUP_S3_*` variables, with a 30-day lifecycle rule on the bucket. Run the
      drill in `RESTORE.md` and fill in its log. Production is a pasted compose: paste the `backup` service and
      the `pgbackups` volume into it by hand.
- [ ] **Sentry.** Create a project, set `SENTRY_DSN` on the api service (staging and production), and add alert
      rules for new issues, "Message volume alert" and "OTP hourly limit reached".
- [ ] **Provider spend alerts.** Low-balance alerts in NextSMS and Africa's Talking; a spending limit and billing
      alerts for WhatsApp in Meta Business Manager; failed-payment and payout notifications in Snippe. Keep prepaid
      balances to about one busy week.
- [ ] **Uptime and backup heartbeat.** The monitors in `UPTIME.md`, with `BACKUP_HEARTBEAT_URL` set to the
      heartbeat monitor's push URL.
- [ ] **Origin firewall.** Allow 80/443 only from Cloudflare's IP ranges, so `cf-connecting-ip` (the
      `CLIENT_IP_HEADER` rate limits key on) cannot be forged. On a stack not behind Cloudflare, set
      `CLIENT_IP_HEADER` empty.
- [ ] **Tune the guards** after the first busy week: `OTP_IP_HOURLY_LIMIT` (20), `OTP_GLOBAL_HOURLY_LIMIT` (500),
      `MESSAGE_DAILY_ALERT` (5,000).

## Switching sign-in codes to Firebase (ADR 048)

Optional. Until `AUTH_OTP_PROVIDER=firebase` is set, login codes go through the SMS route as before.

1. **Firebase console:** create a project (or add Firebase to an existing Google Cloud project) and move it
   to the **Blaze** plan (phone sign-in needs billing). Add a Cloud Billing budget alert.
2. **Authentication → Sign-in method:** enable **Phone**. Under **Settings → SMS region policy** allow only
   Tanzania (and Kenya if `KENYA_ENABLED`).
3. **Authentication → Settings → Authorized domains:** add `kadisasa.com`, `app.kadisasa.com` and
   `my.kadisasa.com` (plus the staging hosts).
4. **Project settings → Your apps → Web app:** register one; copy `apiKey`, `authDomain`, `projectId`, `appId`.
5. **Project settings → Your apps → Android app:** package `app.harusipass.mobile`, and add the release key's
   SHA-256 `77:14:37:3C:EF:5B:E7:A8:FC:EE:53:D8:A2:BF:C5:8A:B7:B3:80:1C:5E:A4:87:F6:E7:81:5E:36:E6:05:F2:2F`
   (and SHA-1 from the same keystore, `keytool -list -v`). Enable the Play Integrity API in the Google Cloud
   project. Download `google-services.json` and store it as an EAS **file** environment variable named
   `GOOGLE_SERVICES_JSON` (never commit it). Build a new APK and upload it in /ops (ADR 047).
6. **Coolify (api service):** set `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`,
   `FIREBASE_WEB_APP_ID`, redeploy, and test sign-in on staging with numbers on each network. Then set
   `AUTH_OTP_PROVIDER=firebase` and redeploy. Apps older than the Firebase APK cannot sign in after this, so
   switch only once organizers have updated.
7. **Rollback:** `AUTH_OTP_PROVIDER=sms` and redeploy the api; nothing else changes.

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

## Did the deploy work?

Look at the run of **Build and push images** for your commit in GitHub → Actions:

| Run ends with                                  | Meaning                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Green, summary says `Live on staging: <sha>`   | The new version is serving on both the API and the web app.                                  |
| Red at **Build and push** or **Smoke-test**    | The images did not build or cannot start. Nothing was deployed; the old version is still up. |
| Red at **Wait for the new version to go live** | Coolify was asked to deploy but the new version never answered within 15 minutes.            |

For the last case, open the stack's **Deployments** tab in Coolify, then the `api` and `web` logs. A failed
migration stops the `api` container, and `web` waits for `api`, so the site may be down until it is fixed.

**Get told instead of checking.**

- GitHub emails whoever pushed when a run fails (GitHub → Settings → Notifications → Actions: "Only notify for
  failed workflows" is the default). The GitHub mobile app can push these too.
- In Coolify, **Notifications** (per team): set up Email, Telegram, Discord or Slack and tick **Deployment
  success** and **Deployment failed**, plus **Container status changes** to hear when a container stops later.
  Telegram is the quickest to set up and reaches your phone.

## Deploying without GitHub Actions

**Default: Coolify builds on the server** ([ADR 038](../../docs/adr/038-server-side-builds.md)). Set these variables on
the Coolify resource first: `NEXT_PUBLIC_API_URL` (required, equal to the api domain, for staging
`https://staging-api.kadisasa.com`), `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_KENYA_ENABLED`.
Then `./scripts/deploy.sh staging` moves `deploy/staging` and waits for the new version to answer. The rest of this
section describes the older build-and-push flow, available as `--registry`.

If the workflow does not run or is red, `scripts/deploy.sh` builds, pushes and deploys from your own machine
([ADR 037](../../docs/adr/037-local-deploys.md)). The result is the same: the same image tags, the same deploy
branch move, and the same wait for the live version.

One-time setup:

1. Install and start Docker Desktop. Run the script from Git Bash (or WSL).
2. Create a GitHub personal access token (classic) with the **write:packages** scope.
3. Copy `.deploy.env.example` to `.deploy.env` and fill in `GHCR_USER`, `GHCR_TOKEN` and the `NEXT_PUBLIC_*`
   values (the same ones as the GitHub environment variables). The file is gitignored.

Then:

```bash
./scripts/deploy.sh staging --dry-run   # build and smoke-test only, nothing leaves your machine
./scripts/deploy.sh staging             # HEAD must be origin/main
git tag v1.2.3 && ./scripts/deploy.sh production
```

The script refuses to run with uncommitted changes or from a commit that is not what the team sees on `main`. To
stop the workflow running on every push, disable it under GitHub → Actions → Build and push images → ⋯ → Disable
workflow.

## Rolling back

Set the stack's `IMAGE_TAG` to an earlier `sha-<short>` or version tag and redeploy. Database migrations do not
roll back with the image, so check an old image still works with the current schema first.

Keep migrations expand-only (add columns and tables; drop or rename only in a later release, once no image in
use reads them), so any recent image can run on the current schema. Before tagging a release that migrates, take
a fresh dump: `docker exec <backup container> sh -c 'pg_dump --no-owner --no-acl | gzip > /backups/pre-release.sql.gz'`.

## Keeping deploys fast

**The pipeline.** A push to `main` builds both images in parallel in GitHub Actions (`docker buildx bake`,
[`infra/docker/docker-bake.hcl`](../docker/docker-bake.hcl)), with the layer cache in the GitHub Actions cache.
The dependency install is reused until the lockfile or a `package.json` changes, so a code-only change rebuilds
just the app (about a minute, versus about four before). Each image is then booted and its `/health` checked
before the deploy branch moves, so an image that cannot start never reaches the server. Coolify only pulls, so the
deploy itself is a pull and a restart; the run reports how long it took to go live.

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

- Staging is set up as above on coolify.kadisasa.com (environment `staging`, tracking `deploy/staging`).
- Production on coolify.kadisasa.com is a Docker Compose **service** pasted into Coolify, not linked to the
  repository, so moving `deploy/production` does not redeploy it. Until it is recreated as a repository resource
  tracking `deploy/production`, redeploy it by hand (**Pull latest and restart**) after a release tag builds; the
  release run's "Wait for the new version" step then confirms it, or times out if nobody redeployed.
- The API image carries React Native and Expo packages (`drizzle-orm`'s optional `expo-sqlite` peer is resolved
  against the mobile app), roughly 300 MB the server never uses. Slimming it would make every pull faster.
- Backups, restore and uptime checks: see [`RESTORE.md`](RESTORE.md) and [`UPTIME.md`](UPTIME.md).
