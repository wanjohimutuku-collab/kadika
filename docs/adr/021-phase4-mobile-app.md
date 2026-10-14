# 021 — Phase 4 organizer app (Expo)

Status: accepted

## What was built

`apps/mobile` is an Expo SDK 53 / Expo Router app that talks to the real API through the shared `HttpRepository` (`@harusi/api-client`). Screens: welcome → phone → OTP (+ name for new users), wedding list, create wedding, and per wedding the five tabs (Muhtasari with KPI tiles, funnel and "next step" card; Wageni with search, filters and add; Tuma with audience, channel, preview, cost, confirm and result with retry-failed; Lango and Michango as honest placeholders), guest detail (timeline, copy code, reissue, delete with confirm sheets), paste-list import (source → preview → confirm, nothing saved until confirmed), print-PDF download/share, team (invite/revoke) and settings (sender, committee phone, language). Swahili first, English one tap away, strings from `packages/i18n`; a test fails the build if a screen uses a key missing in either language.

## Decisions

- **Plain `StyleSheet` instead of NativeWind** (CLAUDE.md §3 suggests NativeWind). The shared tokens in `@harusi/ui-tokens` are used directly, light and dark. NativeWind needs a Tailwind/Babel setup that is fragile in a hoisted pnpm monorepo; it can be added later without changing screens' behaviour.
- **react-query for data**, `networkMode: 'offlineFirst'` for reads (last answer stays on screen), writes pause while offline and resume when `NetInfo` reports a connection. The queue lives in memory: closing the app while offline loses unsent writes (the Tuma tab refuses to send offline and says so). A persisted queue is a follow-up.
- **Session tokens** go to the OS keystore (`expo-secure-store`); on web (dev only) to `localStorage`.
- **Role shell:** the API's `myRole` is read per wedding. `gate` sees only the Lango tab (tab bar hidden); committee does not see cards, team or settings (owner only here).
- **How it was verified:** typecheck, eslint, unit tests, and the Expo **web** export driven in a browser at 375 × 812 against the real API (PGlite dev server, `apps/api/src/dev-pglite.ts`): sign-in with an OTP, create a wedding, paste-import with a bad number and a duplicate, send (fake providers; the WhatsApp/SMS bodies appeared in the API log), overview funnel updates, guest detail, team. This catches logic and layout bugs but is not a device test.

## Not verified / still open for Phase 4's "done when"

- No Android device or emulator was available: not run on a low-end Android, no EAS preview build installed, APK size (< 40 MB) and 2 GB RAM behaviour unmeasured.
- Usable at 1.5× font scale on 360 × 640, the gate role's kiosk shell and the committee role are implemented but untested.
- Contacts picker import, CSV file import and bulk actions from §17.4 are not built (paste import only). Guest swipe/long-press actions, the pledge screens (Phase 6) and the gate scanner (Phase 5) are not built.
- Create-wedding takes a typed date (`2027-03-20`) and time; a native date picker is a follow-up.
