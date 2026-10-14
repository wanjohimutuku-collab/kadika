import { describe, expect, it } from 'vitest';
import {
  EvolutionWhatsAppProvider,
  NextSmsProvider,
  parseEvolutionUpdate,
  parseNextSmsStatus,
  toEvolutionNumber,
} from './index';

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('EvolutionWhatsAppProvider', () => {
  it('posts plain digits with the instance apikey and returns key.id', async () => {
    const { impl, calls } = fakeFetch(201, { key: { id: 'BAE5ABC' }, status: 'PENDING' });
    const p = new EvolutionWhatsAppProvider({
      baseUrl: 'https://evo.test',
      instance: 'harusi',
      apiKey: 'secret',
      fetchImpl: impl,
    });
    expect((await p.send('+255712345678', 'Karibu')).providerMsgId).toBe('BAE5ABC');
    expect(calls[0]!.url).toBe('https://evo.test/message/sendText/harusi');
    expect((calls[0]!.init.headers as Record<string, string>).apikey).toBe('secret');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      number: '255712345678',
      text: 'Karibu',
    });
  });
  it('throws on HTTP errors without leaking the key, and when no id comes back', async () => {
    const bad = new EvolutionWhatsAppProvider({
      baseUrl: 'https://evo.test',
      instance: 'i',
      apiKey: 'secret',
      fetchImpl: fakeFetch(401, {}).impl,
    });
    await expect(bad.send('+255712345678', 'x')).rejects.toThrow(/^evolution 401$/);
    const noId = new EvolutionWhatsAppProvider({
      baseUrl: 'https://evo.test',
      instance: 'i',
      apiKey: 'secret',
      fetchImpl: fakeFetch(200, {}).impl,
    });
    await expect(noId.send('+255712345678', 'x')).rejects.toThrow(/no message id/);
  });
  it('maps messages.update bodies to delivery states', () => {
    expect(toEvolutionNumber('+255 712 345 678')).toBe('255712345678');
    expect(
      parseEvolutionUpdate({
        event: 'messages.update',
        data: { keyId: 'A', status: 'DELIVERY_ACK' },
      }),
    ).toEqual([{ providerMsgId: 'A', state: 'delivered' }]);
    expect(
      parseEvolutionUpdate({
        data: [
          { key: { id: 'B' }, status: 'READ' },
          { keyId: 'C', status: 'SERVER_ACK' },
        ],
      }),
    ).toEqual([
      { providerMsgId: 'B', state: 'read' },
      { providerMsgId: 'C', state: 'pending' },
    ]);
    expect(parseEvolutionUpdate(null)).toEqual([]);
    expect(parseEvolutionUpdate({ data: { status: 'READ' } })).toEqual([]);
  });
});

describe('NextSmsProvider', () => {
  const opts = { username: 'u', password: 'p', senderId: 'HARUSI' };
  it('uses Basic auth, digits-only numbers and returns messageId', async () => {
    const { impl, calls } = fakeFetch(200, { messages: [{ messageId: 123456, smsCount: 1 }] });
    const p = new NextSmsProvider({ ...opts, fetchImpl: impl });
    expect((await p.send('+255712345678', 'Karibu')).providerMsgId).toBe('123456');
    expect(calls[0]!.url).toBe('https://messaging-service.co.tz/api/sms/v1/text/single');
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from('u:p').toString('base64')}`,
    );
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      from: 'HARUSI',
      to: '255712345678',
      text: 'Karibu',
    });
  });
  it('fails on HTTP errors or a response without a messageId', async () => {
    await expect(
      new NextSmsProvider({ ...opts, fetchImpl: fakeFetch(403, {}).impl }).send(
        '+255712345678',
        'x',
      ),
    ).rejects.toThrow(/^nextsms 403$/);
    await expect(
      new NextSmsProvider({ ...opts, fetchImpl: fakeFetch(200, { messages: [] }).impl }).send(
        '+255712345678',
        'x',
      ),
    ).rejects.toThrow(/no message id/);
  });
  it('reads delivery reports', async () => {
    const p = new NextSmsProvider({
      ...opts,
      fetchImpl: fakeFetch(200, { results: [{ status: { groupName: 'DELIVERED' } }] }).impl,
    });
    expect(await p.report('1')).toBe('delivered');
    expect(parseNextSmsStatus({ groupName: 'UNDELIVERABLE' })).toBe('failed');
    expect(parseNextSmsStatus({ groupName: 'PENDING' })).toBe('pending');
  });
});
