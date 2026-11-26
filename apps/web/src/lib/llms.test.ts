import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PRICING } from '@harusi/schemas/billing';

vi.mock('server-only', () => ({}));

const { llmsFullTxt, llmsTxt } = await import('./llms');
const { SITE_URL } = await import('./seo');

describe('llms.txt and llms-full.txt (AIEO / GEO)', () => {
  it('omits stale brand names and syncs live DEFAULT_PRICING values', () => {
    for (const text of [llmsTxt(), llmsFullTxt()]) {
      expect(text).not.toContain('Kadika');
      expect(text).not.toContain('HarusiPass');
      expect(text).toContain(`${DEFAULT_PRICING.free.cards} cards`);
      expect(text).toContain('2,400');
      expect(text).toContain('2,200');
      expect(text).toContain('1,950');
    }
  });

  it('keeps disallowed /k out of Main pages and surfaces Swahili, Kenya, and Uganda links', () => {
    const summary = llmsTxt();
    const mainSection = summary.split('## Main pages')[1]?.split('## Products and occasions')[0] ?? '';
    expect(mainSection).not.toContain(`${SITE_URL}/k)`);
    expect(summary).toContain('## Swahili edition (Kiswahili)');
    expect(summary).toContain(`${SITE_URL}/sw/bei`);
    expect(summary).toContain(`${SITE_URL}/sw/kuhusu`);
    expect(summary).toContain(`${SITE_URL}/ke)`);
    expect(summary).toContain(`${SITE_URL}/ug)`);
  });

  it('includes pricing table plus Kenya and Uganda market hubs in llms-full.txt', () => {
    const full = llmsFullTxt();
    expect(full).toContain('## Pricing (Tanzania, TZS)');
    expect(full).toContain(`URL: ${SITE_URL}/ke`);
    expect(full).toContain(`URL: ${SITE_URL}/ug`);
  });
});
