import { defineConfig } from 'vitest/config';

// Each test file boots an in-process Postgres (PGlite) and runs all migrations; under CI or a busy
// machine that can take longer than vitest's 10 s default.
export default defineConfig({ test: { hookTimeout: 90_000, testTimeout: 30_000 } });
