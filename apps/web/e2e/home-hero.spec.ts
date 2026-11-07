import { expect, test } from '@playwright/test';

/**
 * The hero on `/` is interactive: typing names into the input personalises the phone-frame
 * preview within one debounce frame, and the "See the full card" button deep-links `/jaribu`
 * with those values. Default locale is EN after ADR-locale-flip, so the labels are English.
 */
test('hero inputs personalise the preview and link to /jaribu', async ({ page, context }) => {
  await page.goto('/');

  const names = page.getByLabel(/Couple names/);
  await names.fill('Zuhura & Khalid');

  // Preview updates within ~200 ms (100 ms debounce + render cost).
  await expect(page.locator('section').first()).toContainText('Zuhura', { timeout: 1000 });

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: /See the full card/ }).click(),
  ]);
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/\/jaribu\?names=Zuhura%20%26%20Khalid/);
  await expect(popup.locator('body')).toContainText(/This is a demo card/);
});

test('/sw hero shows the Swahili labels and SW banner on /jaribu', async ({ page, context }) => {
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
