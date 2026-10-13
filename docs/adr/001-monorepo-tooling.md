# 001 — Monorepo tooling choices

Status: accepted (Phase 0)

- **Versions:** Node 22, pnpm 9.15.9 (pinned via `packageManager`), TypeScript 5.9, ESLint 9 (flat config), Vitest 3, Next 15, Expo SDK 53 (React 19.0.0, RN 0.79). Newer majors exist (TS 7, ESLint 10, Vitest 5, Next 16, Expo 57) but the surrounding ecosystem (typescript-eslint, Expo's bundled module versions) is validated against the pinned ones. Revisit after v1.
- **`node-linker=hoisted`** in `.npmrc`: Metro/Expo is unreliable with pnpm's symlinked layout.
- **Internal packages ship TypeScript source** (`main: ./src/index.ts`); no build step. Next uses `transpilePackages`, Expo/Metro transpiles natively, the API bundles them with `tsup` (`noExternal: @harusi/*`).
- **Package scope:** `@harusi/*`.
- **Lint** is per-package (`eslint .`) with one root `eslint.config.mjs`, run through Turborepo.
- **Mobile `build`:** none in Phase 0 (EAS builds arrive in Phase 4).
- **Tailwind / NativeWind:** listed in §3 but deferred; the Phase 0 shells use plain styles and `@harusi/ui-tokens`. Add with the first real UI (Phase 2).
- **Next ESLint plugin:** not added in Phase 0; `next build` skips its own lint step.
