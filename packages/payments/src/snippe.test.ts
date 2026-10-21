import { describe, expect, it } from 'vitest';
import {
  SNIPPE_API_VERSION,
  SNIPPE_PRODUCTION_URL,
  SNIPPE_SANDBOX_URL,
  SnippePaymentProvider,
  mapSnippeStatus,
  signSnippeWebhook,
  type SnippeOptions,
} from './snippe';

const NOW = 1_800_000_000_000;
const KEY = 'whsec_test_key';

function provider(over: Partial<SnippeOptions> = {}, fetchImpl?: typeof fetch) {
  return new SnippePaymentProvider({
    apiKey: 'snp_test_key',
    webhookSigningKey: KEY,
    callbackUrl: 'https://api.kadisasa.com/v1/payments/webhook/snippe',
    nowMs: () => NOW,
    fetchImpl,
    ...over,
  });
}

interface Call {
  url: string;
  init: RequestInit;
}
function recorder(status: number, body: unknown) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const start = {
  reference: 'HPABCDEFGHJK',
  amount: 20000,
  currency: 'TZS' as const,
  phoneE164: '+255712345678',
  method: 'mpesa' as const,
  description: 'Mchango - Asha & Juma',
};

describe('SnippePaymentProvider.startCollection', () => {
  it('posts a mobile payment with our reference in metadata and returns Snippe’s reference', async () => {
    const { calls, fetchImpl } = recorder(201, {
      status: 'success',
      data: { reference: 'snp_pay_1' },
    });
    const r = await provider({}, fetchImpl).startCollection(start);
    expect(r).toEqual({ providerRef: 'snp_pay_1' });
    const c = calls[0]!;
    expect(c.url).toBe(`${SNIPPE_PRODUCTION_URL}/v1/payments`);
    const h = c.init.headers as Record<string, string>;
    expect(h.authorization).toBe('Bearer snp_test_key');
    expect(h['snippe-version']).toBe(SNIPPE_API_VERSION);
    expect(h['idempotency-key']).toBe('HPABCDEFGHJK');
    const body = JSON.parse(c.init.body as string);
    expect(body).toMatchObject({
      payment_type: 'mobile',
      details: { amount: 20000, currency: 'TZS' },
      phone_number: '255712345678',
      webhook_url: 'https://api.kadisasa.com/v1/payments/webhook/snippe',
      metadata: { reference: 'HPABCDEFGHJK' },
    });
    expect(body.customer.email).toBe('payments@api.kadisasa.com');
  });

  it('uses the sandbox host, a configured receipt email, and caps the idempotency key at 30', async () => {
    const { calls, fetchImpl } = recorder(201, { data: { reference: 'r' } });
    await provider(
      { environment: 'sandbox', receiptEmail: 'pay@harusi.test' },
      fetchImpl,
    ).startCollection({
      ...start,
      reference: 'H'.repeat(45),
    });
    expect(calls[0]!.url).toBe(`${SNIPPE_SANDBOX_URL}/v1/payments`);
    expect((calls[0]!.init.headers as Record<string, string>)['idempotency-key']).toHaveLength(30);
    expect(JSON.parse(calls[0]!.init.body as string).customer.email).toBe('pay@harusi.test');
  });

  it('refuses any currency but TZS before calling Snippe', async () => {
    const { calls, fetchImpl } = recorder(201, { data: { reference: 'r' } });
    await expect(
      provider({}, fetchImpl).startCollection({ ...start, currency: 'KES' }),
    ).rejects.toThrow('TZS only');
    expect(calls).toHaveLength(0);
  });

  it('fails without echoing the response body when Snippe rejects the request', async () => {
    const { fetchImpl } = recorder(422, { message: 'phone 255712345678 is invalid' });
    const err = await provider({}, fetchImpl)
      .startCollection(start)
      .catch((e: Error) => e);
    expect((err as Error).message).toBe('snippe 422');
    expect((err as Error).message).not.toContain('2557');
  });

  it('fails when the response has no reference', async () => {
    const { fetchImpl } = recorder(201, { data: {} });
    await expect(provider({}, fetchImpl).startCollection(start)).rejects.toThrow(
      'no payment reference',
    );
  });
});

describe('SnippePaymentProvider.queryCollection', () => {
  it('looks the payment up by Snippe’s reference and maps the answer', async () => {
    const { calls, fetchImpl } = recorder(200, {
      data: {
        status: 'completed',
        amount: { value: 20000, currency: 'TZS' },
        completed_at: '2026-10-19T10:00:00Z',
      },
    });
    const r = await provider({}, fetchImpl).queryCollection('HPABC', 'snp_pay_1');
    expect(calls[0]!.url).toBe(`${SNIPPE_PRODUCTION_URL}/v1/payments/snp_pay_1`);
    expect(r).toMatchObject({ status: 'success', amount: 20000, currency: 'TZS' });
    expect(r.paidAt?.toISOString()).toBe('2026-10-19T10:00:00.000Z');
  });

  it('says unknown on 404 and throws on other errors so the next tick retries', async () => {
    expect(await provider({}, recorder(404, {}).fetchImpl).queryCollection('x')).toEqual({
      status: 'unknown',
    });
    await expect(provider({}, recorder(500, {}).fetchImpl).queryCollection('x')).rejects.toThrow(
      '500',
    );
  });

  it.each([
    ['completed', 'success'],
    ['failed', 'failed'],
    ['voided', 'failed'],
    ['expired', 'failed'],
    ['pending', 'pending'],
    ['something-new', 'pending'],
  ])('maps %s to %s', (s, want) => expect(mapSnippeStatus(s)).toBe(want));
});

describe('SnippePaymentProvider webhooks', () => {
  const body = JSON.stringify({
    id: 'evt_1',
    type: 'payment.completed',
    data: {
      reference: 'snp_pay_1',
      status: 'completed',
      amount: { value: 20000, currency: 'TZS' },
      metadata: { reference: 'HPABCDEFGHJK' },
      completed_at: '2026-10-19T10:00:00Z',
    },
  });
  const nowSec = NOW / 1000;

  it('accepts a correctly signed, fresh callback', () => {
    expect(provider().verifyWebhook(body, signSnippeWebhook(body, KEY, nowSec - 5))).toBe(true);
  });

  it('rejects a wrong key, a tampered body, and missing or malformed headers', () => {
    const p = provider();
    expect(p.verifyWebhook(body, signSnippeWebhook(body, 'other-key', nowSec))).toBe(false);
    expect(p.verifyWebhook(body + ' ', signSnippeWebhook(body, KEY, nowSec))).toBe(false);
    expect(p.verifyWebhook(body, {})).toBe(false);
    const h = signSnippeWebhook(body, KEY, nowSec);
    expect(p.verifyWebhook(body, { ...h, 'x-webhook-signature': 'zz' })).toBe(false);
    expect(p.verifyWebhook(body, { ...h, 'x-webhook-timestamp': 'abc' })).toBe(false);
    expect(
      p.verifyWebhook(body, { ...h, 'x-webhook-signature': h['x-webhook-signature']!.slice(2) }),
    ).toBe(false);
  });

  it('rejects a replayed callback older than five minutes, accepts one just inside', () => {
    const p = provider();
    expect(p.verifyWebhook(body, signSnippeWebhook(body, KEY, nowSec - 301))).toBe(false);
    expect(p.verifyWebhook(body, signSnippeWebhook(body, KEY, nowSec - 299))).toBe(true);
  });

  it('rejects a timestamp more than five minutes in the future, so it cannot be replayed later', () => {
    const p = provider();
    expect(p.verifyWebhook(body, signSnippeWebhook(body, KEY, nowSec + 3600))).toBe(false);
    expect(p.verifyWebhook(body, signSnippeWebhook(body, KEY, nowSec + 30))).toBe(true);
  });

  it('never verifies when no signing key is configured', () => {
    expect(
      provider({ webhookSigningKey: '' }).verifyWebhook(body, signSnippeWebhook(body, '', nowSec)),
    ).toBe(false);
  });

  it('parses a completed payment using our reference from metadata', () => {
    const ev = provider().parseWebhook(JSON.parse(body));
    expect(ev).toMatchObject({
      reference: 'HPABCDEFGHJK',
      providerRef: 'snp_pay_1',
      status: 'success',
      amount: 20000,
      currency: 'TZS',
    });
    expect(ev!.paidAt?.toISOString()).toBe('2026-10-19T10:00:00.000Z');
  });

  it('parses failed, expired and voided as failed, with the reason', () => {
    for (const type of ['payment.failed', 'payment.expired', 'payment.voided']) {
      const ev = provider().parseWebhook({
        type,
        data: {
          reference: 'snp_2',
          metadata: { reference: 'HPX' },
          failure_reason: 'insufficient funds',
        },
      });
      expect(ev).toMatchObject({
        reference: 'HPX',
        status: 'failed',
        failureReason: 'insufficient funds',
      });
    }
  });

  it('falls back to Snippe’s reference when ours is missing, so the payment is just unknown', () => {
    expect(
      provider().parseWebhook({ type: 'payment.completed', data: { reference: 'snp_9' } }),
    ).toMatchObject({ reference: 'snp_9' });
  });

  it('ignores events it does not handle', () => {
    expect(
      provider().parseWebhook({ type: 'payout.completed', data: { reference: 'p' } }),
    ).toBeNull();
    expect(provider().parseWebhook({ type: 'payment.completed' })).toBeNull();
    expect(provider().parseWebhook(null)).toBeNull();
  });
});
