# DevOps

- Environments: `dev` (docker compose) → `staging` (Coolify) → `prod` (Coolify).
- Docker: multi-stage, non-root, healthchecks (`infra/docker/Dockerfile.api`, `Dockerfile.web`). Local compose: postgres, redis, minio, mailpit.
- GitHub Actions: `ci.yml` (install, typecheck, lint, test, build); `build-push.yml` (build images → GHCR → Coolify deploy webhook); `mobile-eas.yml` (EAS preview on PR label, production on tag). Run `drizzle-kit migrate` as a release step before API start.
- Backups: nightly `pg_dump` to object storage, 14-day retention; restore drill in `infra/coolify/RESTORE.md`.
- Env template (`.env.example`): `DATABASE_URL, REDIS_URL, JWT_SECRET, KEY_ENC_SECRET, S3_*, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, SMS_PROVIDER, SMS_API_KEY, SMS_SENDER_ID, PAYMENT_PROVIDER, PAYMENT_API_KEY, PAYMENT_WEBHOOK_SECRET, APP_BASE_URL, SHORT_BASE_URL, SENTRY_DSN`
