import { describe, it, expect } from 'vitest';
import { renderCard } from '@/lib/light-card/render';
import {
  buildDemoCardView,
  DEMO_EVENT_TYPES,
  DEMO_QR_PAYLOAD,
  DEMO_THEME_BY_EVENT,
  type DemoInput,
} from './demo-card';

const base: DemoInput = {
  names: 'Asha & Juma',
  dateISO: '2026-12-19',
  eventType: 'harusi',
};

describe('buildDemoCardView', () => {
  it('returns a CardView with the given names and date', () => {
    const v = buildDemoCardView(base);
    expect(v.event?.coupleNames).toBe('Asha & Juma');
    expect(v.event?.partnerA).toBe('Asha');
    expect(v.event?.partnerB).toBe('Juma');
    expect(v.event?.dateStart.startsWith('2026-12-19')).toBe(true);
    expect(v.state).toBe('ok');
    expect(v.isMock).toBe(true);
  });

  it('assigns a real theme and cover gradient for every event type', () => {
    const allowed = new Set(['emerald-gold', 'navy-silver', 'terracotta', 'rose-sage']);
    for (const t of DEMO_EVENT_TYPES) {
      const v = buildDemoCardView({ ...base, eventType: t });
      expect(allowed.has(v.event?.themeId ?? '')).toBe(true);
      expect(v.event?.coverGradient).toMatch(/^linear-gradient/);
      expect(v.event?.coverGradient).toBe(DEMO_THEME_BY_EVENT[t].coverGradient);
    }
  });

  it('uses a demo QR payload, never a shape that looks signed', () => {
    const v = buildDemoCardView(base);
    expect(v.qrPayload).toBe(DEMO_QR_PAYLOAD);
    expect(v.qrPayload?.endsWith('DEMO')).toBe(true);
  });

  it('is accepted by renderCard without throwing', () => {
    const v = buildDemoCardView(base);
    const html = renderCard(v, {
      token: 'demo',
      locale: 'sw',
      domain: 'kadisasa.co.tz',
      mode: 'mock',
      apiUrl: 'https://example.invalid',
    });
    expect(html).toContain('Asha');
    expect(html).toContain('Juma');
  });

  it('is deterministic for a given input', () => {
    const a = buildDemoCardView(base);
    const b = buildDemoCardView(base);
    expect(a).toEqual(b);
  });

  it('clamps empty names to the default', () => {
    const v = buildDemoCardView({ ...base, names: '' });
    expect(v.event?.coupleNames).toBe('Asha & Juma');
  });

  it('falls back to a sane date on invalid input', () => {
    const v = buildDemoCardView({ ...base, dateISO: 'not-a-date' });
    expect(() => new Date(v.event!.dateStart)).not.toThrow();
    expect(Number.isNaN(new Date(v.event!.dateStart).valueOf())).toBe(false);
  });
});
