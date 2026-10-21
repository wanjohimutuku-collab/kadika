import { expect, test } from '@playwright/test';
import { retiredToken, setControls, shot, token, trackConsoleErrors, SW_COOKIE } from './helpers';

test.describe('guest card', () => {
  test.use({ storageState: { cookies: [SW_COOKIE], origins: [] } });

  test('open card → RSVP → download QR → offline → QR still visible', async ({ page, context }) => {
    const errors = trackConsoleErrors(page);
    const tk = token('delivered');
    await page.goto(`/c/${tk}`);
    await expect(page.locator('[data-testid="guest-card"][data-ready="true"]')).toBeVisible();
    await expect(page.getByTestId('trust-strip')).toContainText('Mwaliko huu umetumwa na');
    await expect(page.getByTestId('qr-block').locator('svg')).toBeVisible();
    await shot(page, 'guest-card');

    await page.getByTestId('rsvp-yes').click();
    const submit = page.getByTestId('rsvp-submit');
    if (await submit.isVisible().catch(() => false)) await submit.click();
    await expect(page.getByTestId('rsvp-summary')).toContainText('Umethibitisha');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-qr').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^kadi-[A-Z]{2}-\d{4}\.png$/);

    // Let the service worker take control and cache the page, then go offline and reload.
    await page
      .waitForFunction(
        () => navigator.serviceWorker?.controller !== null || !('serviceWorker' in navigator),
        null,
        { timeout: 15_000 },
      )
      .catch(() => undefined);
    await page.reload();
    await page.waitForTimeout(1500);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('qr-block').locator('svg')).toBeVisible();
    await expect(page.getByTestId('short-code')).toBeVisible();
    await context.setOffline(false);
    expect(errors).toEqual([]);
  });

  test('RSVP is idempotent and can be changed', async ({ page }) => {
    await page.goto(`/c/${token('opened')}`);
    await expect(page.locator('[data-testid="guest-card"][data-ready="true"]')).toBeVisible();
    await page.getByTestId('rsvp-no').click();
    await expect(page.getByTestId('rsvp-summary')).toContainText('Hutahudhuria');
    await page.reload();
    await expect(page.getByTestId('rsvp-summary')).toContainText('Hutahudhuria');
    await page.getByRole('button', { name: 'Badilisha' }).click();
    await page.getByTestId('rsvp-yes').click();
    const submit = page.getByTestId('rsvp-submit');
    if (await submit.isVisible().catch(() => false)) await submit.click();
    await expect(page.getByTestId('rsvp-summary')).toContainText('Umethibitisha');
  });

  for (const outcome of ['success', 'declined', 'timeout'] as const) {
    test(`guest pays — ${outcome}`, async ({ page }) => {
      const tk = token('confirmed');
      await page.goto(`/c/${tk}`);
      // Pay-from-card is off by default (ADR 043); these tests cover the kept-for-later flow.
      await setControls(page, { payOutcome: outcome, guestPayments: true });
      if (outcome === 'timeout') await page.clock.install();
      await page.goto(`/c/${tk}/pay`);
      await page.getByLabel('Kiasi (TZS)').fill('5000');
      await page.getByLabel('Namba ya simu ya kulipia').fill('0712345678');
      // 071 is Mixx by Yas: the network is guessed, and the guest can still change it
      await expect(page.getByTestId('pay-network-detected')).toContainText('Mixx by Yas');
      await page.getByRole('button', { name: 'Badilisha' }).click();
      await page.getByText('Airtel Money').click();
      await page.getByTestId('pay-submit').click();
      await expect(page.getByTestId('pay-waiting')).toBeVisible();
      if (outcome === 'success') {
        await expect(page.getByTestId('pay-success')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId('pay-reference')).toHaveText(/^HP[0-9A-F]{10}$/);
        await shot(page, 'pay-success');
      } else if (outcome === 'declined') {
        await expect(page.getByTestId('pay-declined')).toBeVisible({ timeout: 20_000 });
      } else {
        await page.clock.fastForward(62_000);
        await expect(page.getByTestId('pay-timeout')).toBeVisible();
      }
    });
  }

  test('checkout: one-tap amounts fill the amount and the button says how much', async ({
    page,
  }) => {
    await page.goto(`/c/${token('confirmed')}/pay`);
    await expect(page.getByTestId('pay-flow')).toBeVisible();
    // the amount starts at the pledge balance (§17.6), so the button already names it
    await expect(page.getByTestId('pay-submit')).toHaveText(/^Lipa TZS [\d,]+$/);
    await page
      .getByTestId('pay-quick')
      .getByRole('button', { name: /^20,000/ })
      .click();
    await expect(page.getByLabel('Kiasi (TZS)')).toHaveValue('20000');
    await expect(page.getByTestId('pay-submit')).toContainText('Lipa TZS 20,000');
    // an unknown prefix (TTCL, 073) gives no guess, so the network choice stays visible
    await page.getByLabel('Namba ya simu ya kulipia').fill('0732345678');
    await expect(page.getByTestId('pay-network-detected')).toHaveCount(0);
    await expect(page.getByText('Airtel Money')).toBeVisible();
    // a Vodacom number is recognised as M-Pesa
    await page.getByLabel('Namba ya simu ya kulipia').fill('0744123456');
    await expect(page.getByTestId('pay-network-detected')).toContainText('M-Pesa');
    // any way of writing the number is understood, and shown back in one clean form
    for (const messy of [
      '+255 (0) 744-123-456',
      '255744123456',
      'Simu: 0744.123.456',
      '00255 744 123 456',
    ]) {
      await page.getByLabel('Namba ya simu ya kulipia').fill(messy);
      await expect(page.getByTestId('phone-understood')).toContainText('+255 744 123 456');
      await expect(page.getByTestId('pay-network-detected')).toContainText('M-Pesa');
    }
    // two numbers in one box is refused with a clear reason
    await page.getByLabel('Namba ya simu ya kulipia').fill('0744123456 / 0754123456');
    await page.getByTestId('pay-submit').click();
    await expect(page.getByText('Weka namba moja tu ya simu')).toBeVisible();
  });

  test('reissued card shows "imebadilishwa"', async ({ page }) => {
    await page.goto(`/c/${retiredToken()}`);
    await expect(page.getByTestId('card-reissued')).toContainText('Kadi hii imebadilishwa');
  });

  test('invalid link and /k code entry', async ({ page }) => {
    await page.goto('/c/not-a-real-token');
    await expect(page.getByTestId('card-invalid')).toBeVisible();
    await page.goto('/k');
    await page.getByLabel('Namba ya kadi').fill('kh 4');
    await page.getByRole('button', { name: 'Fungua kadi' }).click();
    await expect(page.getByText('Namba ya kadi si sahihi')).toBeVisible();
  });

  test('short link /s/[code] redirects to the card', async ({ page }) => {
    const { seedState } = await import('./helpers');
    const g = seedState().guests.find((x) => x.token === token('delivered'))!;
    await page.goto(`/s/${g.shortCode}`);
    await expect(page).toHaveURL(new RegExp(`/c/${g.token}$`));
  });

  test('language switch persists', async ({ page }) => {
    await page.goto(`/c/${token('delivered')}`);
    await expect(page.locator('[data-testid="guest-card"][data-ready="true"]')).toBeVisible();
    await page
      .getByRole('button', { name: /Badili lugha kuwa English/ })
      .first()
      .click();
    await expect(page.getByText('Will you attend?')).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Get started' }).first()).toBeVisible();
    await page
      .getByRole('button', { name: /Switch language to Kiswahili/ })
      .first()
      .click();
    await expect(page.getByRole('link', { name: 'Anza' }).first()).toBeVisible();
  });
});
