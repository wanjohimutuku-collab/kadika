import { expect, test } from '@playwright/test';
import { PAST, UPCOMING, seedState, shot, trackConsoleErrors } from './helpers';

function seedGuest(status: string) {
  return seedState().guests.find(
    (g) => g.eventId === UPCOMING && g.status === status && g.tokenVersion === 1 && g.phoneE164,
  )!;
}

function guestList(): string {
  const lines: string[] = [];
  for (let i = 0; i < 46; i++)
    lines.push(
      `Mgeni Majaribio ${i + 1}, 07${String(80_000_000 + i * 37).padStart(8, '0')}, Marafiki`,
    );
  lines.push('Namba Fupi, 0712 34');
  lines.push('Namba Kenya, +254 712 345 678');
  lines.push('Rudia Moja, 0780000000');
  lines.push('Rudia Mbili, 0780000037');
  return lines.join('\n');
}

test('owner creates an event, imports 50 guests with errors, sends, retries failures', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/app');
  await shot(page, 'events');
  await page.getByRole('link', { name: 'Harusi mpya' }).first().click();
  await page.getByLabel('Jina la Bibi Harusi').fill('Neema');
  await page.getByLabel('Jina la Bwana Harusi').fill('Daudi');
  await page.getByLabel('Tarehe na saa').fill('2027-03-20T15:00');
  await page.getByTestId('wizard-next').click();
  await page.getByLabel('Ukumbi', { exact: true }).fill('Mlimani City Hall');
  await page.getByTestId('wizard-next').click();
  await page.getByText('Bluu & Fedha').click();
  await page.getByTestId('wizard-next').click();
  await shot(page, 'wizard-review');
  await page.getByTestId('wizard-create').click();
  await expect(page.getByTestId('overview')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Neema & Daudi' })).toBeVisible();
  const eventUrl = page.url();

  // Import with errors: 46 valid, 2 invalid phones, 2 duplicates.
  await page.goto(`${eventUrl}/guests/import`);
  await page.getByTestId('import-paste').fill(guestList());
  await page.getByTestId('import-read').click();
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await expect(page.getByTestId('import-preview')).toContainText('Zina makosa');
  await shot(page, 'import-preview');
  await page.getByTestId('import-continue').click();
  await page.getByTestId('import-commit').click();
  await expect(page.getByTestId('import-done')).toContainText('Wageni 46 wameingizwa');

  // Send with injected failures, watch progress, retry failures.
  await page.goto(`${eventUrl}/send`);
  await expect(page.getByTestId('send-summary')).toContainText('wageni 46');
  // Inject failures only now, so the page's own reads are not affected.
  await page.evaluate(() => window.__harusiMock?.controls.set({ failureRate: 0.3 }));
  await shot(page, 'send');
  await page.getByTestId('send-now').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tuma sasa' }).click();
  await expect(page.getByTestId('send-progress')).toBeVisible();
  await expect(page.getByTestId('send-progress')).toContainText('Utumaji umekamilika', {
    timeout: 30_000,
  });
  await shot(page, 'send-progress');
  await page.evaluate(() => window.__harusiMock?.controls.set({ failureRate: 0 }));
  const retry = page.getByTestId('retry-failed');
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.getByTestId('send-progress')).toContainText('Utumaji umekamilika', {
    timeout: 30_000,
  });
  expect(errors).toEqual([]);
});

test('records a cash payment and the balance updates', async ({ page }) => {
  await page.goto(`/app/e/${UPCOMING}/pledges?tab=unpaid`);
  await expect(page.getByRole('tab', { name: /Hawajalipa/ })).toHaveAttribute(
    'data-state',
    'active',
  );
  await shot(page, 'pledges');
  await page.getByTestId('record-payment-open').click();
  const sheet = page.getByTestId('record-payment');
  await sheet.getByTestId('payment-guest-search').fill('a');
  await sheet.locator('ul button').first().click();
  await sheet.getByLabel('Kiasi (TZS)').fill('10000');
  await sheet.getByText('Taslimu').click();
  await page.getByTestId('payment-save').click();
  await expect(page.getByText(/TZS 10,000 kutoka kwa .* yamerekodiwa/).first()).toBeVisible();
  await page.getByRole('tab', { name: /Historia ya malipo/ }).click();
  await expect(page.getByTestId('payment-history')).toContainText('TZS 10,000');
});

test('manual check-in, then duplicate handling', async ({ page }) => {
  const firstName = seedGuest('confirmed').displayName;
  await page.goto(`/app/e/${UPCOMING}/gate`);
  await page.getByTestId('gate-search').fill(firstName);
  await page.getByTestId('gate-result').first().click();
  await page.getByTestId('gate-admit').click();
  await expect(page.getByTestId('gate-outcome-ok')).toBeVisible();
  await shot(page, 'gate-admit');
  await page.getByRole('button', { name: 'Imekamilika' }).click();
  await page.getByTestId('gate-search').fill(firstName);
  await page.getByTestId('gate-result').first().click();
  await page.getByTestId('gate-admit').click();
  await expect(page.getByRole('dialog')).toContainText('Tayari ameingia');
  await expect(page.getByTestId('gate-outcome-duplicate')).toContainText(firstName);
});

test('reissue a card from the console; the old link then shows "imebadilishwa"', async ({
  page,
}) => {
  await page.goto(`/app/e/${UPCOMING}/guests/${seedGuest('delivered').id}`);
  await expect(page.getByTestId('detail-code')).toBeVisible();
  await shot(page, 'guest-detail');
  await page.getByRole('button', { name: 'Onyesha QR' }).click();
  const oldHref = await page
    .getByRole('link', { name: 'Fungua kadi ya mgeni' })
    .getAttribute('href');
  await page.keyboard.press('Escape');
  await page.getByTestId('reissue').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Toa kadi mpya' }).click();
  await expect(page.getByText(/Kadi mpya imetolewa/).first()).toBeVisible();
  await expect(page.getByTestId('audit')).toContainText('Kadi mpya imetolewa');
  await page.goto(new URL(oldHref!).pathname);
  await expect(page.getByTestId('card-reissued')).toBeVisible();
});

test('past event: gate monitor and reports render', async ({ page }) => {
  await page.goto(`/app/e/${PAST}/gate`);
  await expect(page.getByTestId('scan-log')).toBeVisible();
  await shot(page, 'gate-monitor');
  await page.goto(`/app/e/${PAST}/reports`);
  await expect(page.getByText('Utendaji wa njia')).toBeVisible();
  await shot(page, 'reports');
});

test('overview, cards, team, settings render', async ({ page }) => {
  await page.goto(`/app/e/${UPCOMING}`);
  await expect(page.getByTestId('next-step')).toBeVisible();
  await shot(page, 'overview');
  await page.goto(`/app/e/${UPCOMING}/cards`);
  await expect(page.getByTestId('download-pdf')).toBeEnabled();
  await page.getByTestId('qr-size').fill('20');
  await expect(page.getByTestId('download-pdf')).toBeDisabled();
  await shot(page, 'cards');
  await page.goto(`/app/e/${UPCOMING}/team`);
  await page.getByTestId('generate-gate-link').click();
  await expect(page.getByTestId('gate-pin')).toHaveText(/^\d{6}$/);
  await page.goto(`/app/e/${UPCOMING}/settings`);
  await expect(page.getByTestId('settings-save')).toBeVisible();
});

test('owner recolours the card: live preview, unreadable colours block saving, answer persists', async ({
  page,
}) => {
  await page.goto(`/app/e/${UPCOMING}/cards`);
  const save = page.getByRole('button', { name: 'Hifadhi mabadiliko' });
  await expect(page.getByTestId('palette-editor')).toBeVisible();
  await expect(save).toBeEnabled();

  // a readable custom colour shows up in the live preview straight away
  await page.getByTestId('palette-hex-primary').fill('#7A1F3D');
  await expect(page.locator('[style*="--hp-primary: #7A1F3D"]').first()).toBeAttached();

  // text that cannot be read on the card paper blocks saving and says which pair
  await page.getByTestId('palette-hex-ink').fill('#EEEEEE');
  await expect(page.getByTestId('palette-issues')).toContainText('Maandishi na Karatasi ya kadi');
  await expect(save).toBeDisabled();
  await page.getByTestId('palette-hex-ink').fill('#1B1B1F');
  await expect(page.getByTestId('palette-issues')).toHaveCount(0);
  await expect(save).toBeEnabled();

  // a half-typed colour is flagged but never applied
  await page.getByTestId('palette-hex-accent').fill('#12');
  await expect(page.getByText('Tumia msimbo kama #0F5C4D')).toBeVisible();

  await page.getByTestId('palette-hex-accent').blur();
  await save.click();
  await expect(page.getByText('Kadi imehifadhiwa').first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('palette-hex-primary')).toHaveValue('#7A1F3D');

  await page.getByTestId('palette-reset-all').click();
  await expect(page.getByTestId('palette-hex-primary')).not.toHaveValue('#7A1F3D');
});

test.describe('keyboard', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'table is desktop-only');
  test('keyboard-only run through the guests table', async ({ page }) => {
    await page.goto(`/app/e/${UPCOMING}/guests`);
    await page.getByTestId('guest-search').focus();
    await page.keyboard.type('Asha');
    // Wait for the filtered rows (150 ms debounce) before tabbing into the table.
    await expect(
      page.getByTestId('guest-list').getByRole('link', { name: /Asha/ }).first(),
    ).toBeVisible();
    // Tab into the table: select-all checkbox, sortable headers, then the first row's checkbox and name link.
    let reachedLink = false;
    const trail: string[] = [];
    for (let i = 0; i < 60 && !reachedLink; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return {
          href: el?.getAttribute('href') ?? '',
          label: `${el?.tagName}:${(el?.getAttribute('aria-label') ?? el?.textContent ?? '').slice(0, 30)}`,
        };
      });
      trail.push(info.label);
      reachedLink = /\/guests\/[^/]+$/.test(info.href);
    }
    if (!reachedLink) console.log(trail.join(' > '));
    expect(reachedLink).toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/guests\/[^/]+$/);
    await expect(page.getByTestId('detail-code')).toBeVisible();
  });
});
