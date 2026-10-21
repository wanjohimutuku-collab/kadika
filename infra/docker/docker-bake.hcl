# Builds the API and web images in one BuildKit run, in parallel (.github/workflows/build-push.yml).
# Tags and labels come from docker/metadata-action (targets meta-api / meta-web). The layer cache
# lives in GHCR next to each image (:buildcache), so the dependency install is reused until the
# lockfile or a package.json changes. Not the GitHub Actions cache: releases build on tags, and a tag
# cannot read a cache another tag wrote, so every release used to start cold.

# Baked into the web bundle at build time (see Dockerfile.web). Read from the environment.
variable "NEXT_PUBLIC_API_URL" { default = "" }
variable "NEXT_PUBLIC_APP_DOMAIN" { default = "" }
variable "NEXT_PUBLIC_SITE_URL" { default = "" }
variable "NEXT_PUBLIC_KENYA_ENABLED" { default = "0" }

# The commit being built, reported by each image's /health (ADR 035).
variable "GIT_SHA" { default = "dev" }

# Image name prefix for the registry layer cache, e.g. ghcr.io/owner/repo. Empty: no shared cache.
variable "CACHE_PREFIX" { default = "" }

group "default" {
  targets = ["api", "web"]
}

# Filled in by the metadata-action bake files; empty when building by hand.
target "meta-api" {}
target "meta-web" {}

target "api" {
  inherits   = ["meta-api"]
  context    = "."
  dockerfile = "infra/docker/Dockerfile.api"
  platforms  = ["linux/amd64"]
  cache-from = CACHE_PREFIX == "" ? [] : ["type=registry,ref=${CACHE_PREFIX}-api:buildcache"]
  cache-to   = CACHE_PREFIX == "" ? [] : ["type=registry,ref=${CACHE_PREFIX}-api:buildcache,mode=max,image-manifest=true,oci-mediatypes=true"]
  args = {
    GIT_SHA = GIT_SHA
  }
}

target "web" {
  inherits   = ["meta-web"]
  context    = "."
  dockerfile = "infra/docker/Dockerfile.web"
  platforms  = ["linux/amd64"]
  cache-from = CACHE_PREFIX == "" ? [] : ["type=registry,ref=${CACHE_PREFIX}-web:buildcache"]
  cache-to   = CACHE_PREFIX == "" ? [] : ["type=registry,ref=${CACHE_PREFIX}-web:buildcache,mode=max,image-manifest=true,oci-mediatypes=true"]
  args = {
    # Never a mock build. Empty optional values are ignored by the Dockerfile.
    NEXT_PUBLIC_USE_MOCKS     = "0"
    NEXT_PUBLIC_API_URL       = NEXT_PUBLIC_API_URL
    NEXT_PUBLIC_APP_DOMAIN    = NEXT_PUBLIC_APP_DOMAIN
    NEXT_PUBLIC_SITE_URL      = NEXT_PUBLIC_SITE_URL
    NEXT_PUBLIC_KENYA_ENABLED = NEXT_PUBLIC_KENYA_ENABLED
    GIT_SHA                   = GIT_SHA
  }
}
