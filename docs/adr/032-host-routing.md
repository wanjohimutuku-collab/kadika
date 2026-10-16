# ADR 032: one web image, three surfaces, chosen by hostname

Status: accepted. Built in `apps/web/middleware.ts` and `apps/web/src/lib/surfaces.ts`.

## Context

The web app holds three surfaces under one set of routes: the public site and the guest card (`/`, `/privacy`,
`/c`, `/s`, `/k`), the customer and reseller console (`/app`), and the staff panel (`/ops`). In production they
are meant to live on separate hosts:

- `kadisasa.com` and `www.kadisasa.com`: the public site and the guest card
- `app.kadisasa.com`: the console
- `my.kadisasa.com`: the staff panel

Pointing all four hostnames at the same image would show the whole app on every host, including the staff panel's
sign-in on the public domain. Building three images from one codebase would triple the build for no gain, since
the surfaces share components, strings and the API client.

## Decision

Keep one image and decide per request, in middleware, which surface a hostname may reach.

- The rules are a small pure module (`surfaces.ts`): a host maps to a surface, a path maps to an area, and a table
  says what each surface does with each area. A path that belongs to another surface is redirected to that host,
  keeping path and query; `/` on a private host goes to its own home (`/app` or `/ops`).
- The public host redirects `/login` to the console host. Both private hosts serve `/login`, because the session
  belongs to the host (tokens are kept in `localStorage`, which is per origin). Staff sign in at `my.`, customers at
  `app.`.
- Assets, the API routes and any path with a file extension are served on every host.
- The rules switch on only when `NEXT_PUBLIC_APP_DOMAIN` is set at build time, and only for that domain and its
  `www.`, `app.` and `my.` subdomains. Local development, the end-to-end tests, staging and preview hosts are never
  gated, so they keep working with no configuration. Only the production build sets the variable.
- Redirects are 307, not 308, so a browser does not remember one that a later change to the rules could undo.
- The language and market handling that middleware already did for public pages is unchanged.

## Consequences

- One image and one Coolify application serve all four web hosts. Each host is added as a domain on that
  application.
- The staff panel can no longer be reached on the public or the console host, and its sign-in lives on its own
  origin, so a customer-side script cannot read a staff session.
- `NEXT_PUBLIC_APP_DOMAIN` now has two jobs: the official link shown on cards, and the host rules. It is baked in
  at build time, so changing it needs a new build.
- Staff who open `/ops` after signing in on `app.` are sent to `my.` and sign in again there. Signing in on the
  right host first avoids it.
- `blog.` and `mail.` are not part of this image. A blog and a mail server are separate pieces of work.
- A host that is not one of ours is passed through untouched, so a mistyped domain setting fails open, not closed.
  The check that guards against it is the unit test for look-alike hosts and the production request check in the
  pull request that introduced this.
