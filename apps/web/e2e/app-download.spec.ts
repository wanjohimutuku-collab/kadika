import { expect, test } from '@playwright/test';
import { loginStaff, shot, token, SW_COOKIE } from './helpers';

test.use({ storageState: { cookies: [SW_COOKIE], origins: [] } });

// The e2e server sets no ANDROID_PLAY_URL / ANDROID_APK_URL, so the page is in its "coming soon" state;
// the link checks for the published state are unit tests (src/lib/app-download.test.ts).
test.describe('Android app page', () => {
  test('says the app is coming soon and points to the browser and the card', async ({ page }) => {
    await page.goto('/programu');
    const main = page.getByTestId('app-download');
    await expect(main).toHaveAttribute('data-state', 'soon');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kadi Sasa mfukoni mwako');
    await expect(page.getByTestId('app-download-soon')).toContainText('Inakuja hivi karibuni');
    // no dead store buttons while nothing is published
    await expect(page.getByTestId('app-download-play')).toHaveCount(0);
    await expect(page.getByTestId('app-download-apk')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Tumia kwenye kivinjari' })).toHaveAttribute(
      'href',
      '/login',
    );
    await expect(page.getByRole('link', { name: 'Fungua kadi yangu' })).toHaveAttribute(
      'href',
      '/k',
    );
    await expect(page).toHaveTitle('Pakua programu ya Kadi Sasa ya Android');
    // nothing overflows the 360 px baseline
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth),
    );
    await shot(page, 'app-download-soon');
  });

  test('is linked from the site footer, and /app-download redirects to it', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('footer-app-download').click();
    await expect(page).toHaveURL(/\/programu/);
    await page.goto('/app-download');
    await expect(page).toHaveURL(/\/programu$/);
    await expect(page.getByTestId('app-download')).toBeVisible();
  });

  test('is linked from the guest card footer', async ({ page }) => {
    await page.goto(`/c/${token('delivered')}`);
    await expect(page.locator('[data-testid="guest-card"][data-ready="true"]')).toBeVisible();
    await expect(page.getByTestId('card-app-link')).toHaveAttribute('href', '/programu');
  });
});

test.describe('the business name replaces the old working name', () => {
  test('sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle('Ingia kwenye Kadi Sasa');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ingia kwenye Kadi Sasa');
  });

  test('staff panel', async ({ page }) => {
    await loginStaff(page);
    await page.goto('/ops');
    await expect(page).toHaveTitle(/Dashibodi ya wafanyakazi · Kadi Sasa/);
    await expect(page.locator('body')).not.toContainText('Harusi Pass');
  });
});
