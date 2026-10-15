import { describe, expect, it } from 'vitest';
import { scrubEvent, scrubText, scrubValue } from './observability';

describe('Sentry scrubbing', () => {
  it('hides card links, gate codes, payment references and phone numbers in text', () => {
    expect(scrubText('GET /v1/c/aB3dE_fGhIjKlMnOpQrStU/pay failed')).toBe(
      'GET /v1/c/:token/pay failed',
    );
    expect(scrubText('/s/aB3dE_fGhIjKlMnOpQrStU')).toBe('/s/:token');
    expect(scrubText('/gate-join/96SESSUN')).toBe('/gate-join/:code');
    expect(scrubText('/v1/payments/HP12345678AB/status')).toBe('/v1/payments/:ref/status');
    expect(scrubText('sms to +255712345678 and 0712345678 failed')).toBe(
      'sms to [phone] and [phone] failed',
    );
  });

  it('redacts sensitive keys at any depth', () => {
    const v = scrubValue({
      a: 1,
      headers: { authorization: 'Bearer abc', 'x-signature': 'z' },
      nested: [{ pin: '123456', note: 'call 0712345678' }],
      apiKey: 'k',
    }) as Record<string, unknown>;
    expect(JSON.stringify(v)).not.toMatch(/Bearer abc|123456|0712345678|"k"/);
    expect(v.a).toBe(1);
  });

  it('drops the user, request body, headers, cookies, query and breadcrumbs from an event', () => {
    const event = scrubEvent({
      user: { id: 'u1', ip_address: '1.2.3.4' },
      server_name: 'prod-1',
      request: {
        method: 'POST',
        url: 'https://api.test/v1/c/SECRETTOKEN123456/pay?x=1',
        headers: { authorization: 'Bearer t' },
        data: { phone: '0712345678' },
        cookies: { s: 'v' },
      },
      message: 'failed for +255712345678',
      transaction: 'POST /v1/c/SECRETTOKEN123456/rsvp',
      exception: { values: [{ value: 'bad token SECRET at /v1/c/SECRETTOKEN123456' }] },
      breadcrumbs: [{ data: { url: '/v1/c/SECRETTOKEN123456' } }],
      extra: { pin: '999999', ok: 'fine' },
    });
    const text = JSON.stringify(event);
    expect(text).not.toMatch(/SECRETTOKEN|Bearer|0712345678|255712345678|999999|1\.2\.3\.4|prod-1/);
    expect(event.request).toEqual({ method: 'POST', url: 'https://api.test/v1/c/:token/pay' });
    expect(event).not.toHaveProperty('breadcrumbs');
    expect((event.extra as Record<string, unknown>).ok).toBe('fine');
  });
});
