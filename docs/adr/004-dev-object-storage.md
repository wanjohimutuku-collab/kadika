# 004 — Dev object storage: SeaweedFS instead of MinIO

Status: accepted

CLAUDE.md §3/§11 call for MinIO in local compose. MinIO no longer publishes images to Docker Hub, and its quay.io images return 401 (checked 2026-10-13). The compose service `s3` therefore runs SeaweedFS (`chrislusf/seaweedfs`, S3 API on :8333, no auth in dev). Application code only depends on the S3 API (`S3_*` env vars), so production can use Cloudflare R2 or a self-built MinIO. Revisit if an official MinIO image becomes available again.
