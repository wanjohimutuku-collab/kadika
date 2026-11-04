# ADR 053: Release every green merge to main

Date: 2026-11-04 · Status: accepted

## Context

Production only deployed when someone pushed a `v*` tag (build-push.yml). Pushes to main did not build, to save
Actions minutes while the repository was private. Merges were regularly left untagged, so they never went live
(PRs #78 and #79 sat on main after v0.7.6). There is one Coolify stack, production, tracking `deploy/production`;
no staging stack exists. The repository is now public, so standard GitHub-hosted runners cost nothing.

## Decision

- `.github/workflows/release.yml` runs when CI completes successfully for a push to main. It tags the commit with
  the next patch version and starts build-push.yml on that tag with `workflow_dispatch` (`deploy=true`). A tag
  pushed with `GITHUB_TOKEN` does not trigger workflows, but a dispatch does, so no personal token is stored.
- build-push.yml treats a dispatched run on a `v*` tag like a tag push: verify-ci, build, smoke test, promote
  `:production`, move `deploy/production`, wait for `/health` to report the commit.
- Merges that change nothing shipped (Markdown, unit tests, stories, e2e, the Expo app) are not released.
- A commit that already has a version tag is skipped, so a hand-pushed tag (for a minor or major version) still
  works and is not tagged twice.
- The GHCR packages `kadika-api` and `kadika-web` are public: free storage and transfer with no quota, and Coolify
  pulls without credentials. They hold only what the public repository builds; secrets are runtime variables.

## Consequences

- Merging a green PR is the release. Roll back by re-running build-push on an older tag (forced branch move).
- Every release gets a patch number automatically; version numbers no longer mark feature size.
- GitHub cost for this pipeline is zero while the repository stays public.
