import { defineConfig } from 'vitest/config';

// Migrations run once per test run (global setup); each test clones the migrated database. Under CI or a
// busy machine PGlite can still take longer than vitest's 10 s default, so the timeouts stay generous.
export default defineConfig({
  test: {
    globalSetup: ['./src/testing/global-setup.ts'],
    hookTimeout: 90_000,
    testTimeout: 30_000,
  },
});
