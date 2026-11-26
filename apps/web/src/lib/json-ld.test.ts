import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@harusi/schemas/billing';
import { hreflangMap, organizationNode, pricingOffersNode, SITE_URL } from './seo';

describe('JSON-LD schema helpers (Prompt 3 & 4)', () => {
  it('builds AggregateOffer matching DEFAULT_PRICING in Swahili and English without undefined values', () => {
    for (const locale of ['sw', 'en'] as const) {
      const node = pricingOffersNode(DEFAULT_PRICING, 'TZS', locale);
      expect(node['@type']).toBe('AggregateOffer');
      expect(node.priceCurrency).toBe('TZS');
      expect(node.lowPrice).toBe(0);
      expect(node.highPrice).toBe(2400);
      expect(node.offerCount).toBe(DEFAULT_PRICING.cardTiers.length + 1);
      expect(node.offers).toHaveLength(4);
      expect(node.offers[0]!.price).toBe(0);
      expect(node.offers[0]!.eligibleQuantity.maxValue).toBe(DEFAULT_PRICING.free.cards);
      expect(node.offers[1]!.price).toBe(2400);
      expect(node.offers[2]!.price).toBe(2200);
      expect(node.offers[3]!.price).toBe(1950);
      const serialized = JSON.stringify(node);
      expect(serialized).not.toContain('undefined');
      expect(serialized).not.toContain('placeholder');
    }
  });

  it('builds valid Kadi Sasa Organization JSON-LD without empty social or support values', () => {
    const org = organizationNode('Digital invitations');
    expect(org['@type']).toBe('Organization');
    expect(org.name).toBe('Kadi Sasa');
    expect(org.url).toBe(SITE_URL);
    expect(org.logo.url).toBe(`${SITE_URL}/icons/512.png`);
    expect(org.contactPoint.email).toBe('faragha@kadisasa.com');
    const serialized = JSON.stringify(org);
    expect(serialized).not.toContain('Kadika');
    expect(serialized).not.toContain('HarusiPass');
  });

  it('emits direct /sw/<sw-slug> hreflangs from /ke and /ug without 301 hops', () => {
    const map = hreflangMap(
      '/ke/wedding-contributions-guide',
      '/wedding-contributions',
      '/michango-ya-harusi',
    );
    expect(map['en-TZ']).toBe(`${SITE_URL}/wedding-contributions`);
    expect(map['sw-TZ']).toBe(`${SITE_URL}/sw/michango-ya-harusi`);
    expect(map['en-KE']).toBe(`${SITE_URL}/ke/wedding-contributions-guide`);
    expect(map['x-default']).toBe(`${SITE_URL}/wedding-contributions`);
  });
});
