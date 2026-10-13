#!/bin/sh
# Runs API + web dev servers. Uses the repo-local toolchain in .tooling/ when present.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for d in "$ROOT"/.tooling/node-*/bin "$ROOT"/.tooling/bin; do
  [ -d "$d" ] && PATH="$d:$PATH"
done
export PATH
cd "$ROOT" && exec pnpm exec turbo run dev --filter=@harusi/web --filter=@harusi/api
