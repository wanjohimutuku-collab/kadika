import { expect, test } from '@playwright/test';

/**
 * The hero on `/` is interactive: typing names into the input personalises the phone-frame
 * preview within one debounce frame, and the "See the full card" button deep-links `/jaribu`
 * with those values. Default locale is EN after the locale flip; the main e2e fixture pins
 * NEXT_LOCALE=sw, so the EN test clears cookies for its context and the SW test uses the
 * fixture as is.
 */
test.describe('home hero · English default', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('inputs personalise the preview and link to /jaribu', async ({ page, context }) => {
    await page.goto('/');

    const names = page.getByLabel(/Couple names/);
    await names.fill('Zuhura & Khalid');

    await expect(page.locator('section').first()).toContainText('Zuhura', { timeout: 1000 });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: /See the full card/ }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/\/jaribu\?names=Zuhura%20%26%20Khalid/);
    await expect(popup.locator('body')).toContainText(/This is a demo card/);
  });
});

test.describe('home hero · Swahili', () => {
  test('/sw inputs personalise the preview and link to /jaribu (SW banner)', async ({
    page,
    context,
  }) => {
    await page.goto('/sw');

    const names = page.getByLabel(/Majina ya wana-ndoa/);
    await names.fill('Zuhura & Khalid');

    await expect(page.locator('section').first()).toContainText('Zuhura', { timeout: 1000 });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: /Tazama kadi kamili/ }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('body')).toContainText(/Hii ni kadi ya majaribio/);
  });
});
