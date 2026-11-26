# Growth Funnel Analytics & Attribution Dashboard Spec

## 1. Privacy & Cookie-Consent Compliance

- **Zero analytics cookies**: Neither client telemetry (`apps/web/src/lib/analytics-client.ts`) nor attribution capture (`apps/web/src/lib/attribution.ts`) nor guest card referral links (`apps/web/src/lib/light-card/client-script.ts`) write cookies. Attribution uses `sessionStorage` (`ks.attribution.v1`) so UTM parameters and referral codes survive navigation to `/login` within the tab only.
- **Zero guest personal data**: Guest names, guest phone numbers, card tokens, pledge amounts, and guest IDs are never written to `analytics_events`, URL parameters on referral links, or growth report outputs.
- **Fail-closed telemetry**: `POST /v1/analytics` and server-side `analyticsSvc.record()` write nothing unless both `ANALYTICS_ENABLED=1` and `ANALYTICS_SESSION_SECRET` are set. Client scripts also respect `navigator.doNotTrack === '1'`.
- **Daily session hash & retention**: `analytics_events.session_hash` is a daily rotating BLAKE2b-256 digest of `(ip, userAgent, utcDate, secret)` and rows are purged after `180` days via `sweepOld()`.

## 2. Funnel Events Catalog

| Event Name                  | Trigger Location                                                                    | Allow-listed Properties                                     |
| --------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `signup_started`            | `POST /v1/auth/otp/request`, `POST /v1/auth/firebase/start`                         | `country`, `channel` (`whatsapp`/`sms`/`firebase`)          |
| `signup_completed`          | `POST /v1/auth/otp/verify`, `POST /v1/auth/firebase` (new user only)                | `country`, `utm_source`, `utm_medium`, `utm_campaign`       |
| `referral_signup`           | `POST /v1/auth/otp/verify`, `POST /v1/auth/firebase` (new user matched valid `ref`) | `country`, `referral_code`, `utm_source`                    |
| `event_created`             | `POST /v1/events`                                                                   | `country`, `event_kind`                                     |
| `michango_enabled`          | `POST /v1/events` (default on) or `PATCH /v1/events/:id` (`false` → `true`)         | `country`                                                   |
| `guests_added`              | `POST /v1/events/:id/guests`, `POST /v1/events/:id/guests/import`                   | `count_bucket` (`1`, `2_10`, `11_50`, `51_150`, `151_plus`) |
| `cards_sent`                | `POST /v1/events/:id/invitations/send`, `POST /v1/events/:id/cards/pdf`             | `channel` (`whatsapp`, `sms`, `pdf`)                        |
| `first_payment`             | `BillingService.afterPaid` (first paid non-grant `cards`/`pack` purchase per event) | `country`, `event_kind`                                     |
| `gate_app_installed`        | `GET /v1/app/android.apk` & Play/APK button clicks on `/programu`                   | `channel` (`play`, `apk`)                                   |
| `gate_scan_session_started` | `POST /v1/gate/join`                                                                | `country`                                                   |
| `referral_link_clicked`     | Guest card footer & post-RSVP referral click via `POST /v1/analytics`               | `source` (`guest_card`), `event_kind`, `referral_code`      |

## 3. Account Attribution Columns (`users`)

Captured once at account creation by `ReferralService.attachAttributionOnSignup()`:

- `users.referral_code` — unique host code (`KSxxxxxx`) generated for every host
- `users.referred_by_user_id` — nullable UUID of referring host (self-referral blocked)
- `users.signup_utm_source`, `users.signup_utm_medium`, `users.signup_utm_campaign`
- `users.signup_referrer_host` — external referrer hostname only (path/query stripped)
- `users.signup_referral_code` — matched referrer code

## 4. Reporting Endpoint & SQL

- **API Endpoint**: `GET /v1/ops/growth-report?country=all|TZ|KE|UG&weeks=12` (staff-authenticated via `requireStaff`).
- **Response (`GrowthReport`)**:
  - `weekly[]`: `{ weekStart, country, signups, eventsCreated, eventsReachedPayment }`
  - `signupsBySource[]`: `{ weekStart, country, source, signups }`
- **Direct PostgreSQL Queries**: [growth-report.sql](file:///c:/Users/yusuf/Documents/github/kadika/docs/analytics/growth-report.sql).

## 5. Recommended Dashboard Layout (Staff `/ops` Growth View)

1. **Top KPI Tiles (Last 4 Weeks vs Prior 4 Weeks, filterable by `TZ` / `KE` / `UG`)**:
   - New host signups (`signup_completed`)
   - Signup → Event Created conversion rate (`eventsCreated / signups`)
   - Event Created → First Payment conversion rate (`eventsReachedPayment / eventsCreated`)
   - Referral share of signups (`source = 'referral'`)
2. **Stacked Weekly Funnel Table**: `weekStart × country` showing Signups, Events Created, Events Reached Payment, and Payment Conversion %.
3. **Acquisition Source Breakdown**: Weekly signups grouped by `source` (`guest_card`, `tiktok`, `meta`, `google`, `referral`, `direct`, partner UTMs).
4. **Channel & Feature Adoption (`analytics_events`)**: Weekly split of `cards_sent` by `channel` (`whatsapp`, `sms`, `pdf`), `michango_enabled`, and offline gate adoption (`gate_app_installed` → `gate_scan_session_started`).
