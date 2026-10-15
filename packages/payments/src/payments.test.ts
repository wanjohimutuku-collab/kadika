import { describe, expect, it } from 'vitest';
import { FakePaymentProvider, SIGNATURE_HEADER, signWebhook, verifyHmac } from './index';

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
      phoneE164: '+255712345678',
      method: 'mpesa',
      description: 'x',
    });
    expect(r.providerRef).toBe('fake-pay-1');
    await expect(
      p.startCollection({
        reference: 'HP2',
        amount: 5000,
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
