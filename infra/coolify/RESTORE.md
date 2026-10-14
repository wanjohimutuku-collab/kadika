# Restore drill (Phase 7, §11)

A backup you have never restored is a hope, not a backup. Run this drill once before launch and after any change to the schema or the backup job, then record the date and the result in the table at the bottom.

## What is backed up

`infra/backup/pg-backup.sh` writes `harusi-<UTC timestamp>.sql.gz` (plain SQL, gzip) to the S3-compatible bucket nightly and keeps 14 days. It covers Postgres only. These live elsewhere and need their own care:

- **Redis** (queues, nothing durable: safe to lose; unsent queued messages are re-run by retrying failed sends).
- **Object storage** (card images, PDFs): replicate the bucket or accept that PDFs are regenerated on demand.
- **Secrets** (`KEY_ENC_SECRET`, `JWT_SECRET`, aggregator keys): in the secret store. **Without `KEY_ENC_SECRET` the event signing keys in a restored database cannot be decrypted and every printed QR becomes unverifiable**, so keep that secret backed up separately and never in the same place as the dumps.

## Drill (about 20 minutes)

1. **Pick a dump:** `aws s3 ls s3://$BACKUP_S3_BUCKET/harusi/postgres/` and download the newest: `aws s3 cp s3://…/harusi-<stamp>.sql.gz .`
2. **Start an empty Postgres 16** somewhere that is not production: `docker run --rm -d --name restore-test -e POSTGRES_PASSWORD=x -p 55432:5432 postgres:16`
3. **Restore:** `gunzip -c harusi-<stamp>.sql.gz | psql postgres://postgres:x@localhost:55432/postgres`
4. **Check the data**, comparing with the live numbers from the day of the dump:
   ```sql
   select count(*) from events;  select count(*) from guests where deleted_at is null;
   select count(*) from payments where status = 'success';  select count(*) from scan_log;
   select max(created_at) from audit_log;
   ```
5. **Boot the API against it** with the production `KEY_ENC_SECRET`: `DATABASE_URL=postgres://postgres:x@localhost:55432/postgres … pnpm --filter @harusi/api start`, then `GET /ready` must answer `ready`.
6. **Prove the signing keys survived:** fetch any guest's card (`GET /v1/c/<token>`) and verify its `qrPayload` with the event's public key (`GET /v1/events/:id/public-key`). If verification fails, `KEY_ENC_SECRET` is wrong.
7. **Clean up:** `docker rm -f restore-test`, delete the downloaded dump.

## Recovering production

1. Stop the API and web in Coolify (so nothing writes during the restore).
2. Restore into a **new** database first, run the checks above, then point `DATABASE_URL` at it. Do not restore over the live database until the copy is verified.
3. Run `drizzle-kit migrate` (the release step does this on start) so a dump from before a migration catches up.
4. Start the API. Gate devices keep their local scans and re-sync; guests' cards and QR codes keep working because they are signed, not stored.
5. Tell the committee which window of data was lost (everything after the dump's timestamp) so they can re-enter manual payments and check-ins.

## Drill log

| Date | Dump used | Restored OK | Counts matched | QR verified | By |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
