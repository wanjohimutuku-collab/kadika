# Production-readiness audit (2026-10-21)

Scope: the API (`apps/api/src`), the BullMQ worker and scheduler, `packages/db`, `packages/messaging`,
`packages/payments`, the GitHub workflows, `docker-compose*.yml` and `infra/`. I read the code and config.
I did not log in to the live database, Coolify, Sentry or the provider dashboards. Anything that depends
on those is listed under **Owner actions**.

Severity: **High** means money, data loss or a wrong gate admission is possible today. **Medium** is a
real risk with a narrower trigger or a workaround. **Low** is hygiene.

Line numbers refer to this branch (`xpressdev/prod-readiness-audit`).

## Summary

| #   | Area            | Finding                                                                                                           | Severity | Status                              |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- |
| 1   | Race            | Idempotency-Key was checked, then stored after the work ran: concurrent retries both ran                          | High     | **Fixed**                           |
| 2   | Race            | Two sends at once texted every remaining guest twice                                                              | High     | **Fixed**                           |
| 3   | Race            | Two gate devices syncing the same guest at once could both admit them                                             | High     | **Fixed**                           |
| 4   | Rate limits     | Client IP came from the first X-Forwarded-For entry, which the client controls                                    | High     | **Fixed**                           |
| 5   | Spend           | No per-IP or total limit on login codes (SMS pumping)                                                             | High     | **Fixed**                           |
| 6   | Race            | Gate PIN lockout: parallel wrong guesses lost updates and skipped the lockout                                     | High     | **Fixed**                           |
| 7   | Backups         | No backup job runs anywhere in the stack; no heartbeat                                                            | High     | **Fixed** + owner action            |
| 8   | Error tracking  | Worker/tick failures and errors outside requests never reached Sentry; no DSN set                                 | High     | **Fixed** + owner action            |
| 9   | Spend           | Nothing alerts on message volume; no provider balance alerts                                                      | High     | **Fixed** (in-app) + owner action   |
| 10  | Background jobs | Redis had no `maxmemory`/`noeviction`; BullMQ can lose jobs or Redis gets OOM-killed                              | Medium   | **Fixed**                           |
| 11  | Rollback        | No graceful shutdown: a redeploy cut a send off mid-way                                                           | Medium   | **Fixed**                           |
| 12  | Race            | Billing allowance counted per send run in memory: two sends at once can overspend it                              | Medium   | Open                                |
| 13  | Background jobs | Queued `send` jobs retry 3× and a stalled job re-runs: explicit-guest resends can repeat                          | Medium   | Open (mitigated by #2)              |
| 14  | Auth            | OTP state is in process memory: lost on restart, wrong with >1 API replica, grows without bound                   | Medium   | Open                                |
| 15  | Rate limits     | OG-image previews come from the web server's IP and share one per-IP card budget                                  | Medium   | Open                                |
| 16  | Rollback        | Migrations are forward-only and take no lock; rolling back the image after a destructive migration breaks the API | Medium   | Open (documented)                   |
| 17  | Error tracking  | The web app and the mobile app report no errors at all                                                            | Medium   | Open                                |
| 18  | N+1             | CSV import runs about 8 queries and one transaction per row                                                       | Medium   | Open                                |
| 19  | N+1             | Reminder and fallback ticks scan every active event's guests every 15 min                                         | Low      | Open                                |
| 20  | Webhooks        | Delivery-webhook secret travels in a query string for Africa's Talking                                            | Low      | Accepted (provider limit)           |
| 21  | Live DB         | Postgres has no `statement_timeout` / `idle_in_transaction_session_timeout`                                       | Low      | Open                                |
| 22  | CI              | Trivy image scan is report-only                                                                                   | Low      | Open (by design)                    |
| 23  | Spend           | Firebase sign-in (ADR 048, added after this audit) sent codes from the client, outside our OTP caps               | Medium   | **Fixed** (our apps) + owner action |

What I checked and found sound: payment webhooks verify HMAC (Snippe also checks a ±5-minute
timestamp window), and the payment is applied in one conditional `UPDATE … WHERE status = 'pending'`,
so a replayed webhook records nothing new (`apps/api/src/services/pledges.ts:539`). The same holds for
billing orders (`services/billing.ts:507`). `provider_ref` is unique. Meta webhooks are HMAC-verified
and the other delivery webhooks compare a shared secret in constant time (`app.ts:395`). Every provider
call has an `AbortSignal.timeout`. Scheduled sends are claimed with a conditional update
(`services/scheduled.ts:217`). The release pipeline requires green CI for the exact file tree, smoke-tests
the images and waits for `/health` to report the new commit (`.github/workflows/build-push.yml`).

## Findings

### 1. Idempotency-Key race (High, fixed)

`apps/api/src/idempotency.ts` used to `SELECT` the key, run the request, and only then `INSERT` the
response. A retry arriving while the first request was still running found nothing and ran again. That
is the normal case for `POST /invitations/send`: a 500-guest send takes longer than Cloudflare's 100 s
timeout, the client sees a 524 and retries, and every guest is texted twice. It also applied to guest
create/import, reissue and manual payments.

**Fix:** the key is claimed first, with an `INSERT … ON CONFLICT DO NOTHING` row whose `response_status`
is `0` (in flight). A retry during the run gets `409 { reason: 'in_progress' }`. A finished 2xx is stored
and replayed. A non-2xx frees the key. A claim older than 15 minutes, left by a crashed request, is
released. No migration was needed.
Tests: `prod-readiness.test.ts` › "an Idempotency-Key retry … does not send again", "a request that
failed frees its key".

### 2. Concurrent invitation sends double-text guests (High, fixed)

`DeliveryService.run` (`services/delivery.ts`) picked `created` invitations, sent to each one, and only
then set `sent`. Two runs at once both sent to everyone. That happens with a retried request without a
key, a scheduled send firing next to a manual one, two committee members pressing Tuma, or a scheduled
send re-run after `STUCK_AFTER_MS` (`services/scheduled.ts:24`). Each duplicate is a paid SMS and a
confused guest.

**Fix:** each first invitation is claimed (`created → queued`, conditional `UPDATE … RETURNING`) just
before it is sent (`delivery.ts:620`, `:745`). A run that loses the claim skips that guest. A failed send
puts it back to `created`. A `queued` claim older than 15 minutes counts as unsent again, so a crash
cannot strand guests. Resends to guests already invited (explicit `guestIds`) are unchanged.
Tests: "two sends to the remaining guests at once reach each guest exactly once", "a guest left `queued`
… is picked up again", "a send that fails gives the guest back".

### 3. Gate multi-device double admission (High, fixed)

`GateService.sync` (`services/gate.ts`) inserts a batch of scans and then re-orders each guest's claims
in its own transaction. Postgres runs at READ COMMITTED, so two devices syncing the same guest at the
same moment each saw only their own uncommitted claim. Both kept `ok`, and the guest was admitted twice.
That breaks the Phase 5 rule "two devices scanning the same guest yield one admit + one duplicate".

**Fix:** `pg_advisory_xact_lock(hashtextextended(guestId))` per touched guest, taken in sorted order,
before the re-order (`gate.ts:341`). The second transaction waits and then sees the first one's claim.
Test: "admits the guest once; the later scan is a duplicate". **Caveat:** PGlite has a single connection,
so the unit test cannot reproduce the race. It only proves the locked path gives the right result.
Verify this once against real Postgres with two parallel `scans/sync` calls; it belongs in the Phase 5
multi-device check.

### 4. Spoofable client IP (High, fixed)

`app.ts` keyed every rate limit (card reads, RSVP, pay, gate join, staff 2FA) on the **first**
`X-Forwarded-For` entry. Cloudflare appends to whatever the client sends, so an attacker could put a
fresh value there on every request and bypass every limit, including the card-token and PIN brute-force
limits.

**Fix:** `clientIp()` (`rate-limit.ts`) uses `CLIENT_IP_HEADER` when it is set and present (the Coolify
stack sets `cf-connecting-ip`). Otherwise it uses the **last** X-Forwarded-For hop, the one our own proxy
added. Tests: "client IP for rate limits".
**Owner action:** firewall the origin to Cloudflare's IP ranges. Otherwise a client that reaches the VPS
directly can set `cf-connecting-ip` itself.

### 5. SMS pumping through the login-code endpoint (High, fixed)

`POST /v1/auth/otp/request` was limited only per phone number (`auth/otp.ts:9`, 5 per hour). One client
could request codes for thousands of different numbers, and each one is a paid SMS. This is the classic
"SMS pumping" fraud.

**Fix:** a per-IP limit (`OTP_IP_HOURLY_LIMIT`, default 20/h) and a total limit (`OTP_GLOBAL_HOURLY_LIMIT`,
default 500/h) in `app.ts`. When the total trips, Sentry is told, at most once per 10 minutes.
Tests: "login code limits (SMS pumping)".

### 6. Gate PIN lockout lost updates (High, fixed)

`GateService.join` read `failed_attempts`, compared the PIN, and wrote back `attempts + 1`. N parallel
wrong guesses all read the same count, so a burst of guesses never reached the lockout. Combined with #4,
the 6-digit PIN could be brute-forced.

**Fix:** each guess takes an attempt in one statement **before** the PIN is checked
(`UPDATE … SET failed_attempts = failed_attempts + 1 WHERE … failed_attempts < 5 RETURNING`,
`gate.ts:147`). With no attempt left, the link locks. Test: "a burst of wrong PINs locks the link".

### 7. No backups are actually running (High, fixed in the stack + owner action)

`infra/backup/pg-backup.sh` exists, but nothing schedules it. The Coolify stack has no backup service,
the API image has neither `pg_dump` nor an S3 client, and Coolify's built-in backups do not cover a
Postgres that lives inside a compose stack (`infra/coolify/README.md:98`). Unless someone set up a cron
on the VPS by hand, **the live database has no backup**. UPTIME.md also expects a backup heartbeat that
the script never sent.

**Fix:** a `backup` service in `docker-compose.coolify.yml`. It uses the same pinned Postgres image and
writes a nightly `pg_dump | gzip` into a `pgbackups` volume (14 days kept). It skips dumps that fail or
are too small, uploads to S3/R2 when `BACKUP_S3_BUCKET` is set, and pings `BACKUP_HEARTBEAT_URL` after a
good dump. A first dump runs as soon as the service starts. I tested the loop in bash with a stubbed
`pg_dump`, both the success path and the failure path. Docker wasn't running on this machine, so it has
not run as a container yet. `pg-backup.sh` gained the same heartbeat.
**Owner action:** set the off-site bucket (a dump on the same VPS does not survive losing the VPS), add
the heartbeat monitor, then run the drill in `RESTORE.md` and fill in its log.

### 8. Errors that never reach Sentry (High, fixed in code + owner action)

Only request 5xx errors (`app.ts` `onError`) and scheduler failures were reported. BullMQ job failures
(`worker.ts`) were only logged: a failed tick (reminders, WhatsApp→SMS fallback, payment reconciliation)
or a failed queued send went unnoticed. There were no `unhandledRejection` or `uncaughtException`
handlers either. `SENTRY_DSN` is empty by default in the stack.

**Fix:** `worker.on('failed')` and `worker.on('error')` call `reportError`, and `index.ts` reports
unhandled rejections and uncaught exceptions. It also logs a warning at start when production has no DSN.
**Owner action:** create the Sentry project and set `SENTRY_DSN` on the api service.

### 9. No spend alerts (High, fixed in-app + owner action)

Nothing watched SMS or WhatsApp volume. A runaway loop, a bad scheduled send or pumping would only show
up on the provider invoice.

**Fix:** `spend-alert.ts` counts SMS + WhatsApp messages in the last 24 h on every tick (15 min) and
reports an error past `MESSAGE_DAILY_ALERT` (default 5,000). Test: "message volume alert".
**Owner action:** set low-balance and daily-spend alerts in each provider's dashboard (NextSMS,
Africa's Talking, Meta WhatsApp, Snippe). The in-app counter only sees what went through this API.

### 10. Redis memory policy (Medium, fixed)

Redis ran without `maxmemory`, under a 256 MB container limit. When full it would be OOM-killed, and an
evicting policy would silently drop BullMQ jobs. The stack now runs `--maxmemory 200mb
--maxmemory-policy noeviction`. Full means refused writes, visible as errors, never lost jobs.

### 11. No graceful shutdown (Medium, fixed)

On redeploy, Docker sends SIGTERM and then SIGKILL after 10 s. The API ignored SIGTERM, so a send in
progress stopped half way and its BullMQ job only came back after the stalled-job timeout. `index.ts` now
stops the scheduler, closes the HTTP server and the worker, and exits within 9 s.

### 12. Billing allowance race (Medium, open)

`BillingService.budget` (`services/billing.ts:261`) takes a snapshot of the remaining cards and messages
and counts it down in memory for one run. Two runs at once each start with the full remainder, so an
event can generate cards or send reminders past what it paid for. #2 removes the most common trigger
(two runs to the same guests), but two sends to different groups can still overspend. **Fix:** reserve
credits atomically in the database (a counter row per event with
`UPDATE … SET used = used + 1 WHERE used < allowance`), or take a per-event advisory lock around
`assertCanUse` and the run. This needs a migration, so it should wait until PR #58 (migration 0024) has
merged.

### 13. Queued send retries (Medium, open, mitigated)

`enqueueSend` uses `attempts: 3` (`worker.ts:81`), and BullMQ re-runs a stalled job. For `remaining` or a
group, #2 now makes a re-run skip guests already sent. For an explicit `guestIds` resend, a retry texts
them again. **Fix:** set `attempts: 1` for sends (delivery already retries each message 3×), or record a
per-job checkpoint.

### 14. OTP state in memory (Medium, open)

`OtpService` keeps codes, attempt counts and lockouts in a `Map` (`auth/otp.ts:28`). A restart (every
deploy) wipes lockouts. A second API replica would fail every verify that lands on the other one. The map
also never shrinks, so pumping grows memory. **Fix:** move it to Redis (the limiter already has a client)
or Postgres, with TTLs. Until then, keep exactly one api replica, which the stack already requires for
migrations.

### 15. OG previews share one IP budget (Medium, open)

`apps/web/src/lib/server-card.ts:12` fetches card previews from the web server, so every WhatsApp
link-preview crawl counts against that one IP's `CARD_READ_LIMIT` (120/min). A 500-guest WhatsApp send
can exhaust it, and previews fall back to the generic image. **Fix:** let the web server send a shared
secret header that the API exempts from the per-IP card limit (the per-token limit still applies), or
raise `CARD_READ_LIMIT`.

### 16. Rollback and migrations (Medium, open, documented)

Rolling back means setting `IMAGE_TAG` to an older `sha-<short>` (README "Rolling back"). Migrations run
on start, cannot be undone and take no lock (`docker-compose.coolify.yml:22`). An image older than a
migration that drops or renames a column will fail. **Rule to keep:** make migrations expand-only (add
columns or tables, never drop or rename in the same release that stops using them). Take a dump before
tagging a release that migrates, which the new `backup` service makes easy.

### 17. No error tracking in web and mobile (Medium, open)

Neither `apps/web` nor `apps/mobile` has an error reporter, so guest-card and gate-app crashes are
invisible. **Fix:** `@sentry/nextjs` with the same scrubbing rules as `observability.ts`, and
`sentry-expo` / `@sentry/react-native` for the gate app. Card tokens must stay scrubbed.

### 18. CSV import N+1 (Medium, open)

`GuestService.importCsv` calls `create()` per row (`services/guests.ts:444`). Each call re-checks the
role and country, looks for duplicates, generates ids and short codes, and opens a transaction: about 8
queries per row, so a 1,000-guest import is about 8,000 queries in one HTTP request. **Fix:** batch the
inserts in one transaction, with short codes pre-generated against one `SELECT` of existing codes.
`guests.ts` is being changed in PR #58, so do this after it merges.

### 19. Tick scans (Low, open)

`sendReminders` and `fallbackUndelivered` (`services/delivery.ts`) load every active event's open
invitations every 15 minutes, and `fallbackUndelivered` loads every `fallback` message_log row with no
time bound. That is fine at pilot scale. Add a time bound and an index on `message_log(kind, guest_id)`
as volume grows.

### 20. Africa's Talking secret in the query string (Low, accepted)

That provider cannot send custom headers. The route pattern, not the URL, is logged, and Sentry strips
query strings. Rotate `WEBHOOK_SECRET` if a URL ever leaks.

### 21. Postgres timeouts (Low, open)

No `statement_timeout` or `idle_in_transaction_session_timeout` is set. One runaway query or a leaked
transaction holds locks indefinitely. **Fix:** `ALTER DATABASE harusi SET statement_timeout = '30s';
SET idle_in_transaction_session_timeout = '60s'` once migrations are confirmed to finish inside it (or
set them on the app role only).

### 22. Image scan is report-only (Low, by design)

`build-push.yml` runs Trivy with `exit-code: '0'`. Flip it to `1` once the list is clean. `pnpm audit
--prod --audit-level=high` already blocks CI.

### 23. Firebase sign-in codes bypassed the OTP caps (Medium, fixed for our apps + owner action)

Re-checked on 2026-10-29, after PRs #61 and #62. With `AUTH_OTP_PROVIDER=firebase` the web and mobile apps asked
Firebase Phone Auth for the code straight from the client, so `/v1/auth/otp/request` and its per-IP and hourly caps
(#5) were not in the path. The SMS is billed to the Google Cloud project instead. The token check itself is sound:
`auth/firebase.ts` checks RS256 against Google's keys, `aud`/`iss` for our project, a 10-minute `auth_time` and
`sign_in_provider = phone`, and staff still need their authenticator.

**Fix:** `POST /v1/auth/firebase/start` (`app.ts`) normalises the number and refuses countries that are not
enabled. It spends the same per-IP and hourly code budget as SMS codes (one shared `codeBudget`, which still
alerts when the hourly total trips) and caps codes at 5 per number per hour. `startPhoneSignIn` in
`apps/web/src/lib/firebase-phone.ts` and `apps/mobile/src/lib/firebase-phone.ts` calls it before Firebase is asked to
text, and a refusal shows as "too many" or "invalid number". Tests: `prod-readiness.test.ts` › "Firebase code
go-ahead". **Still open:** the Firebase web config is public by design, so a script that calls Firebase directly
skips our check. Only Firebase's own settings stop that (owner action 6).

## Owner actions

These cannot be done from the repository. In order of urgency:

1. **Backups.** Redeploy the stack so the new `backup` service starts. Check its log for the first
   `[backup] wrote …` line. Set `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID` and
   `BACKUP_S3_SECRET_ACCESS_KEY` (plus `BACKUP_S3_ENDPOINT` for R2) so dumps leave the VPS. Give the
   bucket a lifecycle rule that deletes objects after 30 days. Run the `RESTORE.md` drill and record it.
   Production is a pasted compose (README "Not covered yet"), so paste the new `backup` service and the
   `pgbackups` volume into it by hand.
2. **Sentry.** Create a project and set `SENTRY_DSN` on the api service in staging and production.
   Add an alert rule for new issues and for "Message volume alert" / "OTP hourly limit reached".
3. **Provider spend alerts.** NextSMS and Africa's Talking: low-balance email or SMS. Meta WhatsApp:
   a spending limit and billing alerts in Business Manager. Snippe: payout and failed-payment
   notifications. Keep prepaid balances only as large as one busy week.
4. **Uptime + heartbeat.** Add the monitors in `UPTIME.md`, including the backup heartbeat (set
   `BACKUP_HEARTBEAT_URL` to the monitor's push URL, expect a ping every 24 h).
5. **Origin firewall.** Allow ports 80 and 443 only from Cloudflare's IP ranges, so
   `cf-connecting-ip` cannot be forged. If staging is not behind Cloudflare, set `CLIENT_IP_HEADER` to
   an empty value there.
6. **Firebase (if `AUTH_OTP_PROVIDER=firebase`).** In Firebase Authentication → Settings → SMS region policy,
   allow only Tanzania (+255) and, when Kenya is on, Kenya (+254). Turn on App Check (reCAPTCHA Enterprise for the
   web, Play Integrity for Android) for Identity Platform. Add a budget alert on the Google Cloud billing account.
7. **Check the limits** after the first week in Sentry and the logs: `OTP_IP_HOURLY_LIMIT` (20),
   `OTP_GLOBAL_HOURLY_LIMIT` (500), `MESSAGE_DAILY_ALERT` (5,000). Raise them before a large launch.

## Verification

- `pnpm --filter @harusi/api test` runs the 12 new tests in `apps/api/src/prod-readiness.test.ts` along
  with the existing suite.
- The four race tests (idempotency, concurrent sends, stale claim, PIN burst) **fail on the previous
  code** and pass with the fixes. I checked this by running them against the old `idempotency.ts`,
  `delivery.ts` and `gate.ts`.
- The backup loop ran in bash with a stubbed `pg_dump` (a good dump writes, prunes and pings; a failed
  dump keeps nothing and does not ping). It has not yet run as a container.
