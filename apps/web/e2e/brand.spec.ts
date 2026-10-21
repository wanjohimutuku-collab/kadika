import { expect, test } from '@playwright/test';
import { shot, token, SW_COOKIE } from './helpers';

test.use({ storageState: { cookies: [SW_COOKIE], origins: [] } });

// The business logo is the built-in /brand/logo.svg until staff save their own (ADR 036), so it must
// show on every surface from the first deploy.
test.describe('the business logo is reflected across the app', () => {
  test('the logo file is served as an SVG image', async ({ request }) => {
    const res = await request.get('/brand/logo.svg');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/svg+xml');
    expect(await res.text()).toContain('<svg');
  });

  test('the favicon and the home-screen icons are the emblem, not a letter', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    const icon = await page.locator('link[rel="icon"]').first().getAttribute('href');
    expect(icon).toMatch(/icon\.svg/);
    expect((await request.get('/icons/192.png')).headers()['content-type']).toContain('image/png');
    expect((await request.get('/icons/512.png')).headers()['content-type']).toContain('image/png');
    expect((await request.get('/apple-icon')).headers()['content-type']).toContain('image/png');
  });

  test('public site header shows the logo and links home', async ({ page }) => {
    await page.goto('/login');
    const logo = page.getByTestId('brand-mark-logo').first();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', '/brand/logo.svg');
    await expect(logo).toHaveAttribute('alt', 'Kadi Sasa');
    // the image actually decoded (a broken file would have zero natural width)
    expect(await logo.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await shot(page, 'brand-public-header');
  });

  test('guest card footer and its problem pages show the logo', async ({ page }) => {
    await page.goto(`/c/${token('delivered')}`);
    await expect(page.locator('[data-testid="guest-card"][data-ready="true"]')).toBeVisible();
    const brand = page.getByTestId('card-brand');
    await expect(brand).toBeVisible();
    await expect(brand.locator('img')).toHaveAttribute('src', '/brand/logo.svg');
    await page.goto('/c/not-a-real-token');
    await expect(page.getByTestId('card-brand')).toBeVisible();
  });

  test('checkout shows the logo', async ({ page }) => {
    await page.goto(`/c/${token('confirmed')}/pay`);
    await expect(page.getByTestId('pay-flow')).toBeVisible();
    await expect(page.getByTestId('pay-flow').getByTestId('brand-mark-logo')).toBeVisible();
  });
});
