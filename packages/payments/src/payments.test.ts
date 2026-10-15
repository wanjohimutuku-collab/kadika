import { describe, expect, it } from 'vitest';
import {
  AggregatorPaymentProvider,
  FakePaymentProvider,
  SIGNATURE_HEADER,
  signWebhook,
  verifyHmac,
} from './index';

describe('webhook signatures', () => {
  it('accepts the right HMAC and rejects wrong, missing, truncated and tampered ones', () => {
    const raw = '{"reference":"HP1","status":"success"}';
    const sig = signWebhook(raw, 's3cret');
    expect(verifyHmac(raw, sig, 's3cret')).toBe(true);
    expect(verifyHmac(raw, sig, 'other')).toBe(false);
    expect(verifyHmac(raw + ' ', sig, 's3cret')).toBe(false);
    expect(verifyHmac(raw, undefined, 's3cret')).toBe(false);
    expect(verifyHmac(raw, sig.slice(0, 10), 's3cret')).toBe(false);
    expect(verifyHmac(raw, sig, '')).toBe(false);
  });
});

describe('FakePaymentProvider', () => {
  it('records collection requests, can reject a number, and round-trips a signed webhook', async () => {
    const p = new FakePaymentProvider('k', (phone) => phone === '+255700000000');
    const r = await p.startCollection({
      reference: 'HP1',
      amount: 5000,
      currency: 'TZS',
      phoneE164: '+255712345678',
      method: 'mpesa',
      description: 'x',
    });
    expect(r.providerRef).toBe('fake-pay-1');
    await expect(
      p.startCollection({
        reference: 'HP2',
        amount: 5000,
        currency: 'TZS',
        phoneE164: '+255700000000',
        method: 'mixx',
        description: 'x',
      }),
    ).rejects.toThrow();
    const { raw, headers } = p.webhookBody({
      reference: 'HP1',
      status: 'success',
      amount: 5000,
    });
    expect(p.verifyWebhook(raw, headers)).toBe(true);
    expect(p.verifyWebhook(raw + 'x', headers)).toBe(false);
    expect(p.verifyWebhook(raw, { [SIGNATURE_HEADER]: 'bad' })).toBe(false);
    expect(p.parseWebhook(JSON.parse(raw))).toMatchObject({
      reference: 'HP1',
      status: 'success',
      amount: 5000,
    });
    expect(p.parseWebhook({ status: 'success' })).toBeNull();
    expect(p.parseWebhook({ reference: 'HP1', status: 'weird' })).toBeNull();
  });
});

describe('AggregatorPaymentProvider', () => {
  const secret = 'agg-secret';
  const make = (impl: typeof fetch) =>
    new AggregatorPaymentProvider({
      name: 'aggregator-ke',
      baseUrl: 'https://agg.test',
      apiKey: 'k-secret',
      webhookSecret: secret,
      callbackUrl: 'https://api.test/v1/payments/webhook/aggregator-ke',
      fetchImpl: impl,
    });
  const fetchStub = (status: number, body: unknown) => {
    const calls: { url: string; init: RequestInit }[] = [];
    const impl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    return { impl, calls };
  };

  it('starts a collection with our reference as the idempotency key', async () => {
    const { impl, calls } = fetchStub(201, { id: 'col_1' });
    const r = await make(impl).startCollection({
      reference: 'HPABC',
      amount: 500,
      currency: 'KES',
      phoneE164: '+254712345678',
      method: 'mpesa',
      description: 'Mchango',
    });
    expect(r).toEqual({ providerRef: 'col_1' });
    expect(calls[0]!.url).toBe('https://agg.test/v1/collections');
    const h = calls[0]!.init.headers as Record<string, string>;
    expect(h.authorization).toBe('Bearer k-secret');
    expect(h['idempotency-key']).toBe('HPABC');
    expect(JSON.parse(calls[0]!.init.body as string)).toMatchObject({
      reference: 'HPABC',
      amount: 500,
      currency: 'KES',
      phone: '+254712345678',
      method: 'mpesa',
      callbackUrl: 'https://api.test/v1/payments/webhook/aggregator-ke',
    });
  });

  it('fails without echoing the response body', async () => {
    const { impl } = fetchStub(422, { error: 'bad phone +254712345678' });
    await expect(
      make(impl).startCollection({
        reference: 'HPX',
        amount: 5,
        currency: 'KES',
        phoneE164: '+254712345678',
        method: 'mpesa',
        description: 'x',
      }),
    ).rejects.toThrow(/^aggregator 422$/);
  });

  it('queries a collection and maps unknown, pending, success and failure', async () => {
    expect((await make(fetchStub(404, {}).impl).queryCollection('R')).status).toBe('unknown');
    expect(
      (await make(fetchStub(200, { status: 'processing' }).impl).queryCollection('R')).status,
    ).toBe('pending');
    const ok = await make(
      fetchStub(200, {
        status: 'SUCCESS',
        amount: 500,
        currency: 'KES',
        paidAt: '2026-10-15T10:00:00Z',
      }).impl,
    ).queryCollection('R');
    expect(ok).toMatchObject({ status: 'success', amount: 500, currency: 'KES' });
    expect(
      (
        await make(
          fetchStub(200, { status: 'cancelled', reason: 'user_cancelled' }).impl,
        ).queryCollection('R')
      ).failureReason,
    ).toBe('user_cancelled');
  });

  it('verifies signed callbacks in constant time and parses them', () => {
    const p = make(fetchStub(200, {}).impl);
    const raw = JSON.stringify({
      reference: 'HPABC',
      id: 'col_1',
      status: 'successful',
      amount: 500,
      currency: 'KES',
    });
    const good = { [SIGNATURE_HEADER]: signWebhook(raw, secret) };
    expect(p.verifyWebhook(raw, good)).toBe(true);
    expect(p.verifyWebhook(raw + ' ', good)).toBe(false);
    expect(p.verifyWebhook(raw, { [SIGNATURE_HEADER]: 'deadbeef' })).toBe(false);
    expect(p.verifyWebhook(raw, {})).toBe(false);
    expect(p.parseWebhook(JSON.parse(raw))).toMatchObject({
      reference: 'HPABC',
      providerRef: 'col_1',
      status: 'success',
      amount: 500,
      currency: 'KES',
    });
    expect(p.parseWebhook({ reference: 'HPABC', status: 'processing' })).toBeNull();
  });
});
