import { expect, test } from '@playwright/test';

/**
 * The home page is split into a non-interactive marketing Hero (top) and an interactive Demo
 * Studio island below. Typing names into the Studio personalises the phone-frame preview inside
 * the same `#jaribu-mwenyewe` section within one debounce frame, and the "See the full card"
 * link deep-links `/jaribu` with those values. The main e2e fixture pins NEXT_LOCALE=sw, so the
 * EN test clears cookies and the SW test uses the fixture as is.
 */
test.describe('home demo studio · English default', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('inputs personalise the preview and link to /jaribu', async ({ page, context }) => {
    await page.goto('/');

    const studio = page.locator('#jaribu-mwenyewe');
    const names = studio.getByLabel(/Couple names/);
    await names.fill('Zuhura & Khalid');

    await expect(studio).toContainText('Zuhura', { timeout: 1000 });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      studio.getByRole('link', { name: /See the full card/ }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/\/jaribu\?names=Zuhura%20%26%20Khalid/);
    await expect(popup.locator('body')).toContainText(/This is a demo card/);
  });
});

test.describe('home demo studio · Swahili', () => {
  test('/sw inputs personalise the preview and link to /jaribu (SW banner)', async ({
    page,
    context,
  }) => {
    await page.goto('/sw');

    const studio = page.locator('#jaribu-mwenyewe');
    const names = studio.getByLabel(/Majina ya wana-ndoa/);
    await names.fill('Zuhura & Khalid');

    await expect(studio).toContainText('Zuhura', { timeout: 1000 });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      studio.getByRole('link', { name: /Tazama kadi kamili/ }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('body')).toContainText(/Hii ni kadi ya majaribio/);
  });
});
