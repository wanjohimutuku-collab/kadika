import { expect, test } from '@playwright/test';
import { token } from './helpers';

// Kumbukumbu guest page (ADR 050). Mock mode's server seed has no paid orders, so the real route
// reads "not available"; the dev preview renders the page itself with sample photos.
test.describe('Kumbukumbu', () => {
  test('the guest page lists photos and opens one full size', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/dev/memories');
    const items = page.getByTestId('memories-list').locator('li');
    await expect(items).toHaveCount(4);
    await expect(page.getByTestId('trust-strip')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360,
    );
    await items.first().locator('a').click();
    await expect(page.locator('#hp-viewer')).toHaveAttribute('open', '');
    await page.locator('#hp-viewer button').click();
    await expect(page.locator('#hp-viewer')).not.toHaveAttribute('open', '');
  });

  test('a card whose page has no photos says it is not available', async ({ page }) => {
    const res = await page.goto(`/c/${token('delivered')}/kumbukumbu`);
    expect(res?.status()).toBe(404);
    await expect(page.getByTestId('memories-unavailable')).toBeVisible();
  });

  test('the SMS short link opens the memories page', async ({ page }) => {
    await page.goto(`/s/${token('delivered')}/k`);
    await expect(page).toHaveURL(new RegExp(`/c/${token('delivered')}/kumbukumbu$`));
  });
});
