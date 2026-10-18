# Builds the API and web images in one BuildKit run, in parallel (.github/workflows/build-push.yml).
# Tags and labels come from docker/metadata-action (targets meta-api / meta-web); the layer cache
# lives in the GitHub Actions cache, one scope per image, so the dependency install is reused
# until the lockfile or a package.json changes.

# Baked into the web bundle at build time (see Dockerfile.web). Read from the environment.
variable "NEXT_PUBLIC_API_URL" { default = "" }
variable "NEXT_PUBLIC_APP_DOMAIN" { default = "" }
variable "NEXT_PUBLIC_SITE_URL" { default = "" }
variable "NEXT_PUBLIC_KENYA_ENABLED" { default = "0" }

# The commit being built, reported by each image's /health (ADR 035).
variable "GIT_SHA" { default = "dev" }

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
  cache-from = ["type=gha,scope=api"]
  cache-to   = ["type=gha,scope=api,mode=max"]
  args = {
    GIT_SHA = GIT_SHA
  }
}

target "web" {
  inherits   = ["meta-web"]
  context    = "."
  dockerfile = "infra/docker/Dockerfile.web"
  platforms  = ["linux/amd64"]
  cache-from = ["type=gha,scope=web"]
  cache-to   = ["type=gha,scope=web,mode=max"]
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
