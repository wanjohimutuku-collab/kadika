import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { token, SW_COOKIE } from './helpers';

// §17.14: the guest card must match §17.6 at 360 px and 412 px.
test.describe('guest card at 412 px', () => {
  test.use({
    storageState: { cookies: [SW_COOKIE], origins: [] },
    viewport: { width: 412, height: 892 },
  });

  test('no horizontal scroll, QR visible and large, zero serious axe issues', async ({ page }) => {
    await page.goto(`/c/${token('delivered')}`);
    await expect(page.locator('[data-testid="guest-card"][data-ready="true"]')).toBeVisible();
    await expect(page.getByTestId('trust-strip')).toBeVisible();
    const qr = await page.getByTestId('qr-block').locator('svg').boundingBox();
    expect(qr!.width).toBeGreaterThanOrEqual(220);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
