import { describe, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

// The link preview and WhatsApp media both fetch `/api/card-image?token=…` with no `template` param:
// the event's saved template must decide the design, never the default.
let saved: string | undefined;
vi.mock('@/lib/server-card', () => ({
  previewCardOnServer: async () => ({
    state: 'ok',
    cardKind: 'invitation',
    qrPayload: 'v1.test.KH-1234',
    guest: { displayName: 'Bibi Pendo', shortCode: 'KH-1234', language: 'en' },
    event: {
      partnerA: 'Asha',
      partnerB: 'Juma',
      coupleNames: 'Asha & Juma',
      eventKind: 'Harusi',
      dateStart: '2027-01-09T13:00:00Z',
      venueName: 'Ukumbi',
      country: 'TZ',
      themeId: 'emerald-gold',
      cardContent: saved ? { design: { template: saved } } : {},
    },
  }),
}));

const { GET } = await import('./route');
const png = async (url: string) =>
  Buffer.from(await (await GET(new Request(url) as unknown as NextRequest)).arrayBuffer());

describe('/api/card-image by token', () => {
  it("renders the event's saved template, not the default", async () => {
    const byToken = 'http://localhost/api/card-image?token=t&locale=en';
    const forced = (t: string) => `${byToken}&template=${t}`;
    saved = undefined;
    const dflt = await png(byToken);
    expect(dflt.equals(await png(forced('classic')))).toBe(true);
    for (const t of [
      'modern',
      'script',
      'botanical',
      'floral-corner',
      'wildflower-arch',
      'mandala-arch',
      'marigold-garland',
    ]) {
      saved = t;
      const chosen = await png(byToken);
      expect(chosen.equals(await png(forced(t))), t).toBe(true);
      expect(chosen.equals(dflt), t).toBe(false);
    }
  }, 60_000);
});
