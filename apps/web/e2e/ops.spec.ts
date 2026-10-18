import { expect, test } from '@playwright/test';
import { loginStaff, shot, SW_COOKIE } from './helpers';

test.use({ storageState: { cookies: [SW_COOKIE], origins: [] } });

test('customers are refused from /ops; staff land there after login', async ({ page, browser }) => {
  await page.goto('/login');
  await page.getByLabel('Namba ya simu').fill('0712000001');
  await page.getByTestId('send-code').click();
  await page.getByLabel('Tarakimu 1 kati ya 6').fill('123456');
  await page.waitForURL(/\/app$/);
  await page.goto('/ops');
  await expect(page.getByTestId('ops-refused')).toBeVisible();
  const staff = await browser.newPage();
  await loginStaff(staff);
  await expect(staff.getByTestId('ops-overview')).toBeVisible();
  await shot(staff, 'ops-overview');
  await staff.close();
});

test('staff: lookup masks phones, reveal needs a reason and is audited', async ({ page }) => {
  await loginStaff(page);
  await page.goto('/ops/support');
  await page.getByTestId('ops-search').fill('Neema');
  await page.getByRole('button', { name: 'Tafuta', exact: true }).click();
  await expect(page.getByTestId('ops-results')).toContainText('Neema Lyimo');
  await expect(page.getByTestId('ops-results')).toContainText('•••');
  await shot(page, 'ops-support');
  await page.getByRole('button', { name: 'Onyesha simu kamili' }).first().click();
  await page.getByTestId('reveal-reason').fill('Mteja alipiga simu kuomba msaada');
  await page.getByRole('dialog').getByRole('button', { name: 'Onyesha', exact: true }).click();
  await expect(page.getByTestId('ops-results')).toContainText('0715 330 112');
  await page.goto('/ops/audit');
  await expect(page.getByTestId('audit-row').first()).toContainText('Alionyesha simu');
});

test('staff: suspend a customer, who then cannot log in', async ({ page, browser }) => {
  await loginStaff(page);
  await page.goto('/ops/organizers');
  const row = page.getByTestId('organizer-row').filter({ hasText: 'Hassani Omari' });
  await row.getByRole('button', { name: 'Simamisha' }).click();
  await page.getByRole('dialog').getByLabel('Sababu').fill('Matumizi mabaya ya mialiko');
  await page.getByRole('dialog').getByRole('button', { name: 'Simamisha' }).click();
  await expect(row).toContainText('Amesimamishwa');
  const state = await page.context().storageState();
  const ctx = await browser.newContext({
    storageState: { cookies: [SW_COOKIE], origins: state.origins },
  });
  const p2 = await ctx.newPage();
  await p2.goto('/login');
  await p2.evaluate(() => sessionStorage.clear());
  await p2.getByLabel('Namba ya simu').fill('0762114508');
  await p2.getByTestId('send-code').click();
  await p2.getByLabel('Tarakimu 1 kati ya 6').fill('123456');
  await expect(p2.getByText('Akaunti hii imesimamishwa')).toBeVisible();
  await ctx.close();
});

test('staff: resolve a data request and mark a wedding paid', async ({ page }) => {
  await loginStaff(page);
  await page.goto('/ops/requests');
  await page
    .getByTestId('request-row')
    .filter({ hasText: 'Linasubiri' })
    .first()
    .getByRole('button', { name: 'Shughulikia' })
    .click();
  await page.getByTestId('request-done').click();
  await expect(page.getByText('Ombi limeshughulikiwa').first()).toBeVisible();
  await page.goto('/ops/events');
  const row = page.getByTestId('ops-event-row').filter({ hasText: 'Mwanaidi' });
  await row.getByRole('button', { name: 'Weka imelipiwa' }).click();
  await expect(row).toContainText('Imelipiwa');
  await shot(page, 'ops-events');
});

test('a team invitation is accepted when the invitee logs in', async ({ page, browser }) => {
  await page.goto('/login');
  await page.getByLabel('Namba ya simu').fill('0712000001');
  await page.getByTestId('send-code').click();
  await page.getByLabel('Tarakimu 1 kati ya 6').fill('123456');
  await page.waitForURL(/\/app$/);
  const href = await page.getByTestId('event-list').getByRole('link').first().getAttribute('href');
  await page.goto(`${href}/team`);
  await page.getByRole('button', { name: 'Alika mwanatimu' }).click();
  await page.getByLabel('Jina', { exact: true }).fill('Mjumbe Mpya');
  await page.getByLabel('Namba ya simu').fill('0799123456');
  await page.getByRole('button', { name: 'Tuma mwaliko' }).click();
  await expect(page.getByTestId('members')).toContainText('Mjumbe Mpya');
  const state = await page.context().storageState();
  const ctx = await browser.newContext({
    storageState: { cookies: [SW_COOKIE], origins: state.origins },
  });
  const p2 = await ctx.newPage();
  await p2.goto('/login');
  await p2.evaluate(() => sessionStorage.clear());
  await p2.getByLabel('Namba ya simu').fill('0799123456');
  await p2.getByTestId('send-code').click();
  await p2.getByLabel('Tarakimu 1 kati ya 6').fill('123456');
  await p2.waitForURL(/\/app$/);
  await expect(p2.getByTestId('event-list')).toBeVisible();
  await ctx.close();
});

test('staff must pass the second factor; wrong code is refused', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="tel"]').fill('0700000999');
  await page.getByTestId('send-code').click();
  await page.locator('input[autocomplete="one-time-code"]').fill('123456');
  await expect(page.getByTestId('second-factor')).toBeVisible();
  await page.locator('input[autocomplete="one-time-code"]').fill('000000');
  await expect(page.getByText('Namba si sahihi. Jaribu tena.')).toBeVisible();
  await page.goto('/ops');
  await expect(page).toHaveURL(/\/login/);
});

test('support staff cannot suspend or change plans; billing staff cannot look up', async ({
  page,
}) => {
  await loginStaff(page, '0700000998');
  await page.goto('/ops/organizers');
  await expect(page.getByTestId('organizer-row').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simamisha' })).toHaveCount(0);
  await page.goto('/ops/events');
  await expect(page.getByTestId('ops-event-row').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Weka imelipiwa|Rudisha kuwa bure/ })).toHaveCount(
    0,
  );
  await page.goto('/ops/support');
  await expect(page.getByTestId('ops-search')).toBeVisible();
  const billing = await page.context().newPage();
  await billing.goto('/login');
  await billing.evaluate(() => sessionStorage.clear());
  await billing.locator('input[type="tel"]').fill('0700000997');
  await billing.getByTestId('send-code').click();
  await billing.locator('input[autocomplete="one-time-code"]').fill('123456');
  await expect(billing.getByTestId('second-factor')).toBeVisible();
  await billing.locator('input[autocomplete="one-time-code"]').fill('654321');
  await billing.waitForURL(/\/ops$/);
  await billing.goto('/ops/support');
  await expect(billing.getByText('Huna ruhusa ya kitendo hiki kwa nafasi yako.')).toBeVisible();
  await billing.goto('/ops/events');
  await expect(
    billing.getByRole('button', { name: /Weka imelipiwa|Rudisha kuwa bure/ }).first(),
  ).toBeVisible();
});

test('staff admin: SMS settings are saved with the secret masked, then reset', async ({ page }) => {
  await loginStaff(page);
  await page.goto('/ops/messaging');
  const sms = page.getByTestId('messaging-sms_tz');
  await expect(sms).toContainText('vigezo vya mazingira');
  await sms.getByLabel('Mtoa huduma').selectOption('nextsms');
  await sms.getByRole('button', { name: 'Hifadhi' }).click();
  await expect(sms.getByRole('alert')).toContainText('Nenosiri');
  await sms.getByLabel('Jina la mtumiaji').fill('harusi');
  await sms.getByLabel('Nenosiri').fill('siri-kubwa-1234');
  await sms.getByLabel('Jina la mtumaji (Sender ID)').fill('HARUSI');
  await sms.getByRole('button', { name: 'Hifadhi' }).click();
  await expect(sms).toContainText('Imehifadhiwa (…1234)');
  await expect(sms.getByLabel('Nenosiri')).toHaveValue('');
  await shot(page, 'ops-messaging');
  await sms.getByRole('button', { name: 'Rudi kwenye env' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Rudi kwenye env' }).click();
  await expect(sms).toContainText('vigezo vya mazingira');
});
