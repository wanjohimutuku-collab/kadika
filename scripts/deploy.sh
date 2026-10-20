#!/usr/bin/env bash
# Deploys without GitHub Actions: builds the API and web images on this machine, smoke-tests them,
# pushes them to GHCR, then moves the deploy branch so Coolify's push webhook redeploys the stack.
# It does the same job as .github/workflows/build-push.yml (ADR 034, 035, 037).
#
#   ./scripts/deploy.sh staging              HEAD must be on main, clean and pushed
#   ./scripts/deploy.sh production           HEAD must carry a v1.2.3 tag (the tag is pushed too)
#   ./scripts/deploy.sh staging --skip-wait  do not wait for /health to report the new commit
#   ./scripts/deploy.sh staging --dry-run    build and smoke-test only; push and deploy nothing
#
# Needs Docker (running), git, curl and node. Settings live in .deploy.env (see .deploy.env.example).
set -euo pipefail

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in staging | production) shift ;; *)
  echo "Usage: $0 staging|production [--skip-wait] [--dry-run]" >&2
  exit 2
  ;;
esac
SKIP_WAIT=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --skip-wait) SKIP_WAIT=1 ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

say() { printf '\n== %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# ---- settings -------------------------------------------------------------------------------
[ -f .deploy.env ] || die "Missing .deploy.env. Copy .deploy.env.example and fill it in."
# shellcheck disable=SC1091
set -a; . ./.deploy.env; set +a

suffix=""
[ "$ENVIRONMENT" = production ] && suffix="_PRODUCTION"
pick() { # $1 = name; prefers NAME_PRODUCTION when deploying production
  local v="${1}${suffix}"
  printf '%s' "${!v:-${!1:-}}"
}
API_URL="$(pick NEXT_PUBLIC_API_URL)"
APP_DOMAIN="$(pick NEXT_PUBLIC_APP_DOMAIN)"
SITE_URL="$(pick NEXT_PUBLIC_SITE_URL)"
KENYA="$(pick NEXT_PUBLIC_KENYA_ENABLED)"
WEB_URL="$(pick DEPLOY_WEB_URL)"
[ -n "$WEB_URL" ] || WEB_URL="$SITE_URL"
[ -n "$API_URL" ] || die "NEXT_PUBLIC_API_URL is empty. The web image bakes it in at build time."
: "${GHCR_USER:?Set GHCR_USER in .deploy.env}"
: "${GHCR_TOKEN:?Set GHCR_TOKEN in .deploy.env (a token with write:packages)}"

command -v docker >/dev/null || die "Docker is not installed."
docker info >/dev/null 2>&1 || die "Docker is not running. Start Docker Desktop and try again."
command -v node >/dev/null || die "node is required to read the health responses."

# ---- the commit to ship ---------------------------------------------------------------------
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "Uncommitted changes. Commit or stash them first."
git fetch -q origin
SHA="$(git rev-parse HEAD)"
SHORT="${SHA:0:7}"
REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##' | tr '[:upper:]' '[:lower:]')"
PREFIX="ghcr.io/${REPO_SLUG}"

if [ "$ENVIRONMENT" = production ]; then
  TAG="$(git tag --points-at HEAD | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 || true)"
  [ -n "$TAG" ] || die "HEAD has no v1.2.3 tag. Tag the release first: git tag v1.2.3"
  git merge-base --is-ancestor "$SHA" origin/main || die "Production must be built from a commit that is on origin/main."
  VERSION="${TAG#v}"
else
  if [ "$(git rev-parse --abbrev-ref HEAD)" != main ] || [ "$SHA" != "$(git rev-parse origin/main)" ]; then
    msg="HEAD is not origin/main. Staging deploys what the team sees on main, so push (or pull) first."
    if [ "$DRY_RUN" = 1 ]; then echo "Note: $msg"; else die "$msg"; fi
  fi
fi
say "Deploying ${SHORT} to ${ENVIRONMENT}"

# ---- tags and build -------------------------------------------------------------------------
tags_for() { # $1 = image suffix (api|web)
  local base="${PREFIX}-$1" t="${PREFIX}-$1:sha-${SHORT},${PREFIX}-$1:${ENVIRONMENT}"
  if [ "$ENVIRONMENT" = production ]; then t="$t,${base}:${VERSION}"; else t="$t,${base}:main"; fi
  printf '%s' "$t"
}
API_TAGS="$(tags_for api)"
WEB_TAGS="$(tags_for web)"
SOURCE_URL="https://github.com/${REPO_SLUG}"
CACHE_DIR="${DEPLOY_CACHE_DIR:-$ROOT/.docker-cache}"
mkdir -p "$CACHE_DIR"

say "Building both images (the builder keeps its own layer cache; set DEPLOY_LOCAL_CACHE=1 for an on-disk one)"
# A docker-container builder is needed for the local layer cache; it is created once and reused.
docker buildx inspect kadi-deploy >/dev/null 2>&1 || docker buildx create --name kadi-deploy --driver docker-container >/dev/null

# Several tags per image cannot go through --set (it splits on commas), so write an override file.
OVERRIDE="$CACHE_DIR/bake-override.json"
API_TAGS="$API_TAGS" WEB_TAGS="$WEB_TAGS" SOURCE_URL="$SOURCE_URL" CACHE_DIR="$CACHE_DIR" LOCAL_CACHE="${DEPLOY_LOCAL_CACHE:-0}" node -e '
const e = process.env;
const target = (name, tags) => ({
  tags: tags.split(","),
  labels: { "org.opencontainers.image.source": e.SOURCE_URL },
  ...(e.LOCAL_CACHE === "1" ? {
    "cache-from": ["type=local,src=" + e.CACHE_DIR + "/" + name],
    "cache-to": ["type=local,dest=" + e.CACHE_DIR + "/" + name + ",mode=max"],
  } : { "cache-from": [], "cache-to": [] }),
});
const out = { target: { api: target("api", e.API_TAGS), web: target("web", e.WEB_TAGS) } };
console.log(JSON.stringify(out, null, 2));
' > "$OVERRIDE"
NEXT_PUBLIC_API_URL="$API_URL" NEXT_PUBLIC_APP_DOMAIN="$APP_DOMAIN" NEXT_PUBLIC_SITE_URL="$SITE_URL" \
NEXT_PUBLIC_KENYA_ENABLED="${KENYA:-0}" GIT_SHA="$SHA" \
  docker buildx bake --builder kadi-deploy -f infra/docker/docker-bake.hcl -f "$OVERRIDE" --load

# ---- smoke test (same checks as CI) ---------------------------------------------------------
say "Smoke-testing the images"
cleanup() { docker rm -f kadi-smoke-api kadi-smoke-web >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup
docker run -d --name kadi-smoke-api -p 127.0.0.1::3001 \
  -e JWT_SECRET="smoke-$$-secret" -e KEY_ENC_SECRET="$(openssl rand -base64 32)" \
  -e DATABASE_URL=postgres://smoke:smoke@127.0.0.1:1/smoke -e LOG_REQUESTS=0 \
  "${PREFIX}-api:sha-${SHORT}" >/dev/null
docker run -d --name kadi-smoke-web -p 127.0.0.1::3000 "${PREFIX}-web:sha-${SHORT}" >/dev/null

version_of() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).version||"")}catch{console.log("")}})'; }
check() { # $1 = container, $2 = URL
  local i body
  for i in $(seq 1 30); do
    if body="$(curl -sf "$2")"; then
      [ "$(printf '%s' "$body" | version_of)" = "$SHA" ] && { echo "$1 is up on ${SHORT}."; return 0; }
      die "$1 reports version '$(printf '%s' "$body" | version_of)', expected ${SHA}"
    fi
    sleep 2
  done
  docker logs "$1" || true
  die "$1 did not answer $2"
}
API_PORT="$(docker port kadi-smoke-api 3001/tcp | head -n1 | sed "s/.*://")"
WEB_PORT="$(docker port kadi-smoke-web 3000/tcp | head -n1 | sed "s/.*://")"
check kadi-smoke-api "http://127.0.0.1:$API_PORT/health"
check kadi-smoke-web "http://127.0.0.1:$WEB_PORT/api/health"
curl -sf "http://127.0.0.1:$WEB_PORT/sw.js" >/dev/null || die "web is missing /sw.js"
cleanup

if [ "$DRY_RUN" = 1 ]; then
  say "Dry run: images built and smoke-tested. Nothing pushed, nothing deployed."
  exit 0
fi

# ---- push images, then hand the commit to Coolify -------------------------------------------
say "Pushing images to ghcr.io"
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
for t in ${API_TAGS//,/ } ${WEB_TAGS//,/ }; do docker push "$t" >/dev/null && echo "pushed $t"; done

say "Handing ${SHORT} to Coolify (deploy/${ENVIRONMENT})"
if [ "$ENVIRONMENT" = production ]; then git push origin "refs/tags/${TAG}"; fi
git push --force origin "${SHA}:refs/heads/deploy/${ENVIRONMENT}"

if [ "$SKIP_WAIT" = 1 ]; then
  say "Deploy requested. Not waiting (--skip-wait)."
  exit 0
fi

# ---- wait for the new version to go live ----------------------------------------------------
live() { curl -sf --max-time 10 -H 'Cache-Control: no-cache' "$1?v=${SHA}" | version_of; }
targets="api=${API_URL%/}/health"
if [ -n "$WEB_URL" ]; then targets="$targets web=${WEB_URL%/}/api/health"; else echo "Set DEPLOY_WEB_URL to also confirm the web app."; fi
say "Waiting for the new version to answer (up to ${DEPLOY_WAIT_MINUTES:-15} minutes)"
deadline=$(( $(date +%s) + ${DEPLOY_WAIT_MINUTES:-15} * 60 ))
for target in $targets; do
  name="${target%%=*}"; url="${target#*=}"
  until [ "$(live "$url")" = "$SHA" ]; do
    [ "$(date +%s)" -lt "$deadline" ] || die "$name never reported ${SHORT}. Check the stack's Deployments tab in Coolify."
    sleep 10
    echo "Waiting for $name ($url): live version is '$(live "$url")'"
  done
  echo "$name is live on ${SHORT}."
done
say "Live on ${ENVIRONMENT}: ${SHORT}"
