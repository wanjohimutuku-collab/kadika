# ADR 040: The business name everywhere, and an Android app page

Status: accepted. Strings, API messages, page, links and tests are built.

## Context

The product is live as **Kadi Sasa**, but the working name "Harusi Pass" (CLAUDE.md) was still on
user-facing surfaces: the sign-in title and heading, the staff panel title and sidebar, the OTP SMS, the
test message staff send from /ops, the mobile app name and camera prompt, the home page, the SEO and legal
pages, link previews and calendar files. Staff can already rename the business in /ops/settings (ADR 036),
so a second hard-coded name was also wrong whenever they do.

Visitors also had no way to get the Android app (organizers, committee and gate staff use it; §2), and no
store listing exists yet.

## Decision

- **Strings that name the business take `{brand}`** (`auth.title`, `auth.suspended`, `auth.staffHint`,
  `landing.metaTitle`, `landing.definitionTitle`, `landing.definition`, `nav.gateNoConsole`,
  `ops.staffOnly`, `gateApp.reason.malformed`, the new `appDownload.*`). The web app passes the saved
  business name (`useBrand()` in client components, `getBrandingOnServer()` on the server). The mobile app
  has no runtime branding, so its translator fills `{brand}` with `common.appName` ("Kadi Sasa").
- `ops.title` no longer names the business ("Dashibodi ya wafanyakazi" / "Staff operations"): the sidebar
  shows the logo above it, and the page title becomes "Staff operations · Kadi Sasa" through the root
  layout's title template. The sign-in title is absolute, so it is not "Sign in to Kadi Sasa · Kadi Sasa".
- **The API reads the name** through `BrandingService.businessName()` for the OTP SMS and the /ops test
  message. A database error falls back to the default name; branding never stops a code going out.
- **Long-form content pages, llms.txt, JSON-LD and OG fallbacks say "Kadi Sasa"** (`DEFAULT_BRANDING`).
  They are static SEO text written about this product; rewriting them at runtime is not worth the risk.
- The privacy contact becomes `faragha@kadisasa.com` and `APP_DOMAIN` defaults to `kadisasa.com`. The
  mailbox must exist before these pages are relied on.
- **Unchanged on purpose:** `@harusi/*` package names, the database name, env variables, code identifiers
  and storage keys, and the Expo `slug`, deep-link `scheme` (`harusipass`) and Android `package`
  (`app.harusipass.mobile`). Changing the package id would make a new app that cannot update installed
  ones, and changing the scheme would break gate-join links already sent.
- **`/programu`** (Android app page; `/app-download` redirects to it) is linked from the public header,
  the site footer and the guest card footer. Its two links are runtime settings on the `web` service,
  `ANDROID_PLAY_URL` and `ANDROID_APK_URL`, accepted only as absolute `https://` URLs. They are not
  `NEXT_PUBLIC_*`, so adding the store link later needs a restart in Coolify, not a new build; the page
  renders per request for that reason. With neither set the page says the app is coming soon and points to
  the browser console and to "open my card", never to a dead button. The APK button names the host it
  downloads from, and the page says no password, PIN or payment is ever asked to download.

## Consequences

- A business renamed in /ops shows the new name on sign-in, the home page, the staff panel, OTP texts and
  the app page within the branding cache (about a minute); the SEO pages keep "Kadi Sasa" until edited.
- The guest card footer gains one quiet link. Guests need no app (§2); the page tells them so and links
  to /k.
