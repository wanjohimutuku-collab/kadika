# 011 — Storybook and test tooling

Status: accepted

- **Storybook 8.6 with the Vite builder** (`@storybook/react-vite` + `@tailwindcss/vite`), not `@storybook/nextjs`: the shared components in `src/components/ui` are framework-agnostic (strings come in as props), which keeps them reusable by the Expo app's design later and avoids Next-specific mocking. Components that depend on next-intl or the Next router (`LanguageChip`, `ConsoleShell`, headers) are covered by Playwright screenshots and `/dev/states` instead of stories.
- Newer majors exist (Storybook 10, Vitest 5, Next 16); pinned versions match ADR 001.
- **Playwright** runs against a production build (`NEXT_DIST_DIR=.next-prod`) because the service worker is only registered in production. Browsers are installed into `.tooling/ms-playwright` locally; CI uses the default cache.
- **axe** via `@axe-core/playwright` on every route in both locales; serious/critical violations fail the run.
- **Lighthouse CI** (`@lhci/cli`) runs `/` and a sample `/c/[token]` on the mobile throttled preset.
