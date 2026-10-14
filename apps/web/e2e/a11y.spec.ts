import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PAST, UPCOMING, loginStaff, token } from './helpers';

const ROUTES = [
  '/',
  '/privacy',
  '/terms',
  '/k',
  `/c/${'TOKEN'}`,
  `/c/${'TOKEN'}/pay`,
  '/app',
  '/app/events/new',
  `/app/e/${UPCOMING}`,
  `/app/e/${UPCOMING}/guests`,
  `/app/e/${UPCOMING}/guests/new`,
  `/app/e/${UPCOMING}/guests/import`,
  `/app/e/${UPCOMING}/send`,
  `/app/e/${UPCOMING}/cards`,
  `/app/e/${UPCOMING}/pledges`,
  `/app/e/${PAST}/gate`,
  `/app/e/${UPCOMING}/team`,
  `/app/e/${PAST}/reports`,
  `/app/e/${UPCOMING}/settings`,
  '/app/account',
  '/ops',
  '/ops/organizers',
  '/ops/events',
  '/ops/usage',
  '/ops/payments',
  '/ops/support',
  '/ops/requests',
  '/ops/audit',
];

for (const locale of ['sw', 'en'] as const) {
  test.describe(`axe (${locale})`, () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(async ({ context }) => {
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: locale, url: 'http://localhost:3100' },
      ]);
    });
    for (const route of ROUTES) {
      test(route.replace(/[0-9a-f-]{36}/, ':id').replace('TOKEN', ':token'), async ({ page }) => {
        if (route.startsWith('/ops')) await loginStaff(page);
        await page.goto(route.replace('TOKEN', token('delivered')));
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .exclude('[data-testid="dev-panel-launcher"]')
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(
          serious.map(
            (v) =>
              `${v.id}: ${v.nodes
                .map((n) => n.target.join(' '))
                .slice(0, 3)
                .join(' | ')}`,
          ),
        ).toEqual([]);
      });
    }
  });
}
