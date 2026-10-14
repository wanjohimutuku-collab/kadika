import { expect, type Page } from '@playwright/test';
import { createSeedState, sampleCardToken, type MockState } from '@harusi/api-client/mock';

export const UPCOMING = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001';
export const PAST = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0002';
export const OWNER_PHONE = '0712000001';
const CONTROLS_KEY = 'harusi.mock.controls.v1';

let seed: MockState | null = null;
export function seedState(): MockState {
  return (seed ??= createSeedState());
}

/** A valid card token from today's deterministic seed. */
export function token(status: Parameters<typeof sampleCardToken>[1] = 'delivered'): string {
  return sampleCardToken(seedState(), status);
}

export function retiredToken(): string {
  return Object.keys(seedState().retiredTokens)[0]!;
}

/** Sets dev-panel controls (network, failures, pay outcome, role) before the app reads them. */
export async function setControls(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(
    ({ key, patch }) => {
      const cur = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(
        key,
        JSON.stringify({
          role: 'owner',
          network: 'online',
          failureRate: 0,
          payOutcome: 'success',
          pending: [],
          lastSyncAt: null,
          ...cur,
          ...patch,
        }),
      );
    },
    { key: CONTROLS_KEY, patch },
  );
}

/** Collects console errors so specs can assert there are none. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      !/Failed to load resource.*(404|ERR_INTERNET_DISCONNECTED)|net::ERR/.test(m.text())
    )
      errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Namba ya simu').fill(OWNER_PHONE);
  await page.getByTestId('send-code').click();
  await page.waitForURL(/\/login\/otp/);
  await page.getByLabel('Tarakimu 1 kati ya 6').fill('123456');
  await page.waitForURL(/\/app$/);
  await expect(page.getByTestId('event-list')).toBeVisible();
}

export async function shot(page: Page, name: string) {
  const vp = page.viewportSize();
  const tag = vp && vp.width < 768 ? '360' : '1280';
  await page.addStyleTag({ content: '[data-testid="dev-panel-launcher"]{display:none!important}' });
  await page.screenshot({ path: `../../docs/ui/screenshots/${name}-${tag}.png`, fullPage: false });
}

/** Staff sign-in: SMS code, then the second factor (mock 654321). Lands on /ops. */
export async function loginStaff(page: Page, phone = '0700000999') {
  await page.goto('/login');
  await page.evaluate(() => sessionStorage.clear());
  await page.locator('input[type="tel"]').fill(phone);
  await page.getByTestId('send-code').click();
  await page.waitForURL(/\/login\/otp/);
  await page.locator('input[autocomplete="one-time-code"]').fill('123456');
  await expect(page.getByTestId('second-factor')).toBeVisible();
  await page.locator('input[autocomplete="one-time-code"]').fill('654321');
  await page.waitForURL(/\/ops$/);
}
