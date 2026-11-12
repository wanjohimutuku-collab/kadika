import { expect, test } from '@playwright/test';

/**
 * Verifies the English-default locale routing after the 2026-11-07 flip:
 * - `/` serves EN; `/sw` serves SW.
 * - `/en` and `/en/<slug>` 301 to the canonical.
 * - A TZ URL with the wrong-locale slug 301s to the right-locale slug.
 * - `/ke` is untouched.
 */

test('legacy /en lands at /', async ({ page }) => {
  const res = await page.goto('/en', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/$/);
  expect(res?.status()).toBe(200);
});

test('legacy /en/<slug> lands at the EN slug', async ({ page }) => {
  await page.goto('/en/kadi-ya-harusi-mtandaoni', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/online-wedding-invitation$/);
  expect(page.url()).not.toMatch(/\/en\//);
});

test('legacy SW root slug lands at the EN canonical (EN is default)', async ({ page }) => {
  await page.goto('/kadi-ya-harusi-mtandaoni', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/online-wedding-invitation$/);
});

test('wrong-locale slug under /sw lands at the SW canonical', async ({ page }) => {
  await page.goto('/sw/online-wedding-invitation', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/sw\/kadi-ya-harusi-mtandaoni$/);
});

test('?lang=sw on / lands at /sw without the query param', async ({ page }) => {
  await page.goto('/?lang=sw', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/sw$/);
});

test('/ke is unchanged', async ({ page }) => {
  await page.goto('/ke', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/ke$/);
});

test('an identical slug stays on the typed path', async ({ page }) => {
  await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/privacy$/);
  expect(page.url()).not.toMatch(/\/sw\//);
});
