import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { signQrToken } from '@harusi/crypto';
import { cardQrPlan } from './print/pdf';
import {
  MIN_MODULE_MM,
  MIN_QR_MM,
  PT_PER_MM,
  QUIET_MODULES,
  moduleSizeFor,
  planQr,
} from './print/spec';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

describe('print spec (§6.4)', () => {
  it('refuses a QR that would be smaller or denser than the minimums', () => {
    expect(() => planQr(45, 0.5)).toThrow(/below the 0.8 mm minimum/);
    expect(() => planQr(21, 0.9)).toThrow(/below the 25 mm minimum/); // 18.9 mm
    const ok = planQr(45, 0.9);
    expect(ok.symbolMm).toBeCloseTo(40.5);
    expect(ok.quietMm).toBeCloseTo(QUIET_MODULES * 0.9);
    expect(ok.blockMm).toBeCloseTo(40.5 + 2 * QUIET_MODULES * 0.9);
  });
  it('picks a module size that meets both limits, for small and large codes', () => {
    for (const modules of [21, 29, 45, 57, 77]) {
      const m = moduleSizeFor(modules);
      expect(m).toBeGreaterThanOrEqual(MIN_MODULE_MM);
      expect(m * modules).toBeGreaterThanOrEqual(MIN_QR_MM - 1e-9);
    }
  });
  it('a real signed card payload plans at >= 25 mm, >= 0.8 mm modules, 4-module quiet zone', () => {
    // signing needs a key; any 32-byte key works for sizing
    const token = signQrToken(
      {
        eventId: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001',
        guestId: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0099',
        partySize: 2,
        version: 1,
      },
      '03'.repeat(32),
    );
    const plan = cardQrPlan(token);
    expect(plan.symbolMm).toBeGreaterThanOrEqual(MIN_QR_MM);
    expect(plan.moduleMm).toBeGreaterThanOrEqual(MIN_MODULE_MM);
    expect(plan.quietMm / plan.moduleMm).toBeCloseTo(QUIET_MODULES);
    expect(plan.blockMm).toBeLessThan(105 - 16); // fits an A6 card inside the 8 mm safe margins
  });
});

describe('print PDFs', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => ctx.close());

  const pdf = (evId: string, t: string, body: unknown) =>
    ctx.app.request(`/v1/events/${evId}/cards/pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });

  it('builds A6, A5, 4-up and test-sheet PDFs with the right page sizes', async () => {
    const owner = await loginAs(ctx, '0788000001');
    const t = owner.accessToken;
    const ev = (
      await api(ctx, 'POST', '/v1/events', {
        token: t,
        body: {
          title: 'Harusi ya Asha',
          coupleNames: 'Asha & Juma',
          dateStart: '2027-06-01T10:00:00+03:00',
          venueName: 'Ukumbi wa Mwanga',
          committeePhone: '0755123456',
        },
      })
    ).body!;
    const ids: string[] = [];
    for (const n of ['Bibi Pendo', 'Babu Salim', 'Mama Zuhura', 'Baba Hamisi', 'Dada Neema']) {
      ids.push(
        (
          await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
            token: t,
            body: { displayName: n, phone: `07${n.length}0000${ids.length}1` },
          })
        ).body!.id,
      );
    }

    const a6 = await pdf(ev.id, t, { format: 'a6' });
    expect(a6.status).toBe(200);
    expect(a6.headers.get('content-type')).toBe('application/pdf');
    const a6doc = await PDFDocument.load(await a6.arrayBuffer());
    expect(a6doc.getPageCount()).toBe(5);
    const { width, height } = a6doc.getPage(0).getSize();
    expect(width / PT_PER_MM).toBeCloseTo(105 + 6, 0); // trim + 3 mm bleed each side
    expect(height / PT_PER_MM).toBeCloseTo(148 + 6, 0);

    const a5doc = await PDFDocument.load(
      await (await pdf(ev.id, t, { format: 'a5' })).arrayBuffer(),
    );
    expect(a5doc.getPage(0).getSize().width / PT_PER_MM).toBeCloseTo(148 + 6, 0);

    const four = await pdf(ev.id, t, { format: 'a4x4' });
    const fourDoc = await PDFDocument.load(await four.arrayBuffer());
    expect(fourDoc.getPageCount()).toBe(2); // 5 cards → 4 + 1
    expect(fourDoc.getPage(0).getSize().height / PT_PER_MM).toBeCloseTo(297, 0);

    const one = await pdf(ev.id, t, { format: 'a6', guestIds: [ids[0]!] });
    expect(one.headers.get('content-disposition')).toMatch(/harusi-ya-asha-[A-Z]{2}-\d{4}\.pdf/);
    expect((await PDFDocument.load(await one.arrayBuffer())).getPageCount()).toBe(1);

    const sheet = await PDFDocument.load(
      await (await pdf(ev.id, t, { format: 'test' })).arrayBuffer(),
    );
    expect(sheet.getPageCount()).toBe(1);

    // names outside Latin-1 do not break the batch
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Ωmega Ж' },
    });
    expect((await pdf(ev.id, t, { format: 'a6' })).status).toBe(200);
  });

  it('forbids gate agents and rejects an empty guest list', async () => {
    const owner = await loginAs(ctx, '0788000002');
    const t = owner.accessToken;
    const ev = (
      await api(ctx, 'POST', '/v1/events', {
        token: t,
        body: { title: 'Harusi', coupleNames: 'A & B', dateStart: '2027-06-01T10:00:00+03:00' },
      })
    ).body!;
    expect((await pdf(ev.id, t, { format: 'a6' })).status).toBe(400);
    await api(ctx, 'POST', `/v1/events/${ev.id}/members`, {
      token: t,
      body: { name: 'Lango', phone: '0788000009', role: 'gate' },
    });
    const gate = await loginAs(ctx, '0788000009');
    expect((await pdf(ev.id, gate.accessToken, { format: 'a6' })).status).toBe(403);
  });
});

describe('printed cards follow the digital card theme (ADR 042)', () => {
  /** Every colour-fill operator (`c m y k k`) in the PDF's page streams. */
  async function fills(bytes: Uint8Array): Promise<Set<string>> {
    const { inflateSync } = await import('node:zlib');
    const raw = Buffer.from(bytes);
    const out = new Set<string>();
    let at = 0;
    for (;;) {
      const start = raw.indexOf('stream', at);
      if (start < 0) break;
      const dataStart = raw[start + 6] === 0x0d ? start + 8 : start + 7;
      const end = raw.indexOf('endstream', dataStart);
      if (end < 0) break;
      let text: string;
      try {
        text = inflateSync(raw.subarray(dataStart, end)).toString('latin1');
      } catch {
        text = raw.subarray(dataStart, end).toString('latin1');
      }
      for (const m of text.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) k/g))
        out.add(
          m
            .slice(1, 5)
            .map((v) => Number(v).toFixed(2))
            .join(' '),
        );
      at = end + 9;
    }
    return out;
  }
  const key = (c: { cyan: number; magenta: number; yellow: number; key: number }) =>
    [c.cyan, c.magenta, c.yellow, c.key].map((v) => v.toFixed(2)).join(' ');

  it('uses the theme and custom palette colours, and keeps the QR pure black', async () => {
    const { buildCardsPdf, hexToCmyk, printThemeFrom } = await import('./print/pdf');
    const navy = printThemeFrom({ themeId: 'navy-silver' });
    expect(key(navy.primary)).toBe(key(hexToCmyk('#1F3A5F')));
    const custom = printThemeFrom({ themeId: 'navy-silver', palette: { primary: '#5A1E3C' } });
    expect(key(custom.primary)).toBe(key(hexToCmyk('#5A1E3C')));

    const card = {
      coupleNames: 'Asha & Juma',
      guestName: 'Bibi Pendo',
      shortCode: 'KH-4821',
      qrToken: signQrToken(
        {
          eventId: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001',
          guestId: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0099',
          partySize: 2,
          version: 1,
        },
        '03'.repeat(32),
      ),
      dateText: 'Jumamosi 5 Desemba 2026',
      venue: 'Ukumbi wa Mwanga',
      dressCode: '',
      committeePhone: '',
      language: 'sw' as const,
    };
    const used = await fills(await buildCardsPdf('a6', [card], navy));
    expect(used).toContain(key(navy.primary)); // the names
    expect(used).toContain(key(navy.accent)); // the ornament
    expect(used).toContain('0.00 0.00 0.00 1.00'); // the QR modules
    const plain = await fills(await buildCardsPdf('a6', [card], printThemeFrom(null)));
    expect(plain).not.toContain(key(navy.primary));
  });
});
