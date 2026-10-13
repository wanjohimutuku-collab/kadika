/**
 * Lighthouse CI (§10, brief): mobile throttled profile on the landing page and a sample guest card.
 * Runs against the production build started by `lhci autorun` (NEXT_DIST_DIR=.next-prod).
 */
const { execSync } = require('node:child_process');

// A valid card token from today's deterministic mock seed.
const token = execSync('pnpm exec tsx scripts-sample-token.ts', { encoding: 'utf8' }).trim();

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'NEXT_DIST_DIR=.next-prod pnpm exec next start -p 3200',
      startServerReadyPattern: 'Ready',
      url: ['http://localhost:3200/', `http://localhost:3200/c/${token}`],
      numberOfRuns: 3,
      settings: {
        preset: 'perf',
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2,
          disabled: false,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '../../docs/ui/lighthouse' },
  },
};
