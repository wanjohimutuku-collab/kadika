import { test as setup } from '@playwright/test';
import { login } from './helpers';

/** Logs in once (mock OTP 123456) and saves localStorage (mock state + session) for the specs. */
setup('owner signs in', async ({ page }) => {
  await login(page);
  await page.context().storageState({ path: 'e2e/.auth/owner.json' });
});
