# 005 — Full organizer console on the web (UI built ahead of the API)

Status: accepted

## Context

The web MVP UI brief asks for a complete organizer console at `/app` in `apps/web`, running on mock data, before Phases 1–7 deliver the backend. `CLAUDE.md` says:

- §15 open decision 6: "Organizer web dashboard in v1 (default: mobile only; web card + minimal admin)".
- §17.8: a _minimal_ web admin at `apps/web/admin`.
- §13: build in phase order.

## Decision

- The brief is treated as the owner's answer to open decision 6: **v1 ships a full responsive organizer console on the web** in addition to the Expo app (Phase 4). The §17.8 rule still holds: no feature may exist only in the web console that the mobile app needs.
- The console lives at **`/app`** (not `/admin`) because the brief specifies those routes. §17.8 and §17.3 in `CLAUDE.md` are updated to match.
- Building the UI on a `MockRepository` before the API does not break the phase order for backend work: no backend code is written, and the mock is a drop-in for the later `HttpRepository` (see ADR 006).
- The gate role has no console access. The web gets a **manual check-in + live monitor** (`/app/e/[id]/gate`); the camera scanner stays in the Android app (§16: no iOS/web scanner in v1).

## Consequences

Two organizer UIs (web + mobile) to keep in sync; shared schemas, i18n strings and tokens reduce the cost. Phase 4 should reuse the web's information architecture and copy.
