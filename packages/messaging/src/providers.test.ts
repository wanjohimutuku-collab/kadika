import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AfricasTalkingProvider,
  EvolutionWhatsAppProvider,
  NextSmsProvider,
  WhatsAppCloudProvider,
  metaVerifyChallenge,
  parseCloudStatuses,
  verifyMetaSignature,
  parseEvolutionUpdate,
  parseAfricasTalkingCost,
  parseAfricasTalkingStatus,
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

describe('WhatsAppCloudProvider', () => {
  const base = {
    token: 'tok',
    phoneNumberId: '1234567890',
    templates: { invite: 'harusi_invite', reminder: 'harusi_reminder' },
  };
  const template = {
    kind: 'invite' as const,
    locale: 'sw' as const,
    params: ['Asha', 'Juma', '1 Juni 2027', 'https://s.test/s/abc', 'KH-4821'],
  };

  it('sends an approved template with positional parameters and Bearer auth', async () => {
    const { impl, calls } = fakeFetch(200, { messages: [{ id: 'wamid.ABC' }] });
    const p = new WhatsAppCloudProvider({ ...base, fetchImpl: impl });
    expect((await p.send('+255712345678', 'plain text', template)).providerMsgId).toBe('wamid.ABC');
    expect(calls[0]!.url).toBe('https://graph.facebook.com/v21.0/1234567890/messages');
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      to: '255712345678',
      type: 'template',
      template: {
        name: 'harusi_invite',
        language: { code: 'sw' },
        components: [
          { type: 'body', parameters: template.params.map((text) => ({ type: 'text', text })) },
        ],
      },
    });
  });
  it('uses the reminder template, and plain text when no template is configured', async () => {
    const a = fakeFetch(200, { messages: [{ id: 'w1' }] });
    await new WhatsAppCloudProvider({ ...base, fetchImpl: a.impl }).send('+255712345678', 'x', {
      ...template,
      kind: 'reminder',
    });
    expect(JSON.parse(a.calls[0]!.init.body as string).template.name).toBe('harusi_reminder');
    const b = fakeFetch(200, { messages: [{ id: 'w2' }] });
    await new WhatsAppCloudProvider({ token: 't', phoneNumberId: '1', fetchImpl: b.impl }).send(
      '+255712345678',
      'Karibu',
      template,
    );
    expect(JSON.parse(b.calls[0]!.init.body as string)).toMatchObject({
      type: 'text',
      text: { body: 'Karibu' },
    });
  });
  it('reports the Meta error code without echoing the message text or token', async () => {
    const p = new WhatsAppCloudProvider({
      ...base,
      fetchImpl: fakeFetch(400, {
        error: { code: 131047, message: 'to 255712345678 re-engagement' },
      }).impl,
    });
    await expect(p.send('+255712345678', 'x', template)).rejects.toThrow(
      /^whatsapp-cloud 400 code 131047$/,
    );
    const none = new WhatsAppCloudProvider({ ...base, fetchImpl: fakeFetch(200, {}).impl });
    await expect(none.send('+255712345678', 'x', template)).rejects.toThrow(/no message id/);
  });
  it('verifies Meta signatures, the subscribe handshake and status callbacks', () => {
    const raw = JSON.stringify({ entry: [] });
    const sig = 'sha256=' + createHmac('sha256', 'app-secret').update(raw).digest('hex');
    expect(verifyMetaSignature(raw, sig, 'app-secret')).toBe(true);
    expect(verifyMetaSignature(raw + ' ', sig, 'app-secret')).toBe(false);
    expect(verifyMetaSignature(raw, undefined, 'app-secret')).toBe(false);
    expect(verifyMetaSignature(raw, 'sha256=abc', 'app-secret')).toBe(false);
    expect(metaVerifyChallenge({ mode: 'subscribe', token: 'v', challenge: '42' }, 'v')).toBe('42');
    expect(
      metaVerifyChallenge({ mode: 'subscribe', token: 'bad', challenge: '42' }, 'v'),
    ).toBeNull();
    expect(
      parseCloudStatuses({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    { id: 'a', status: 'delivered' },
                    { id: 'b', status: 'read' },
                    { id: 'c', status: 'failed' },
                    { id: 'd', status: 'sent' },
                    { status: 'read' },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { providerMsgId: 'a', state: 'delivered' },
      { providerMsgId: 'b', state: 'read' },
      { providerMsgId: 'c', state: 'failed' },
      { providerMsgId: 'd', state: 'pending' },
    ]);
    expect(parseCloudStatuses(null)).toEqual([]);
  });
});

describe('AfricasTalkingProvider', () => {
  const ok = (over: Record<string, unknown> = {}) => ({
    SMSMessageData: {
      Message: 'Sent to 1/1',
      Recipients: [
        {
          statusCode: 101,
          number: '+254712345678',
          cost: 'KES 0.8000',
          status: 'Success',
          messageId: 'ATXid_abc',
          ...over,
        },
      ],
    },
  });

  it('posts a form with the apiKey header and returns the message id and rounded-up cost', async () => {
    const { impl, calls } = fakeFetch(201, ok());
    const p = new AfricasTalkingProvider({
      username: 'harusi',
      apiKey: 'k-secret',
      senderId: 'HARUSIPASS',
      fetchImpl: impl,
    });
    expect(await p.send('+254712345678', 'Karibu')).toEqual({
      providerMsgId: 'ATXid_abc',
      cost: 1,
    });
    expect(calls[0]!.url).toBe('https://api.africastalking.com/version1/messaging');
    const h = calls[0]!.init.headers as Record<string, string>;
    expect(h.apiKey).toBe('k-secret');
    expect(h['content-type']).toBe('application/x-www-form-urlencoded');
    const form = new URLSearchParams(calls[0]!.init.body as string);
    expect(Object.fromEntries(form)).toEqual({
      username: 'harusi',
      to: '+254712345678',
      message: 'Karibu',
      from: 'HARUSIPASS',
    });
  });

  it('treats a rejected recipient as a failure even on HTTP 201', async () => {
    const { impl } = fakeFetch(201, ok({ statusCode: 403, status: 'InvalidPhoneNumber' }));
    const p = new AfricasTalkingProvider({ username: 'u', apiKey: 'k', fetchImpl: impl });
    await expect(p.send('+254712345678', 'x')).rejects.toThrow('africastalking InvalidPhoneNumber');
  });

  it('fails on HTTP errors without echoing the body', async () => {
    const { impl } = fakeFetch(401, { error: 'bad key +254712345678' });
    const p = new AfricasTalkingProvider({ username: 'u', apiKey: 'k', fetchImpl: impl });
    await expect(p.send('+254712345678', 'x')).rejects.toThrow(/^africastalking 401$/);
  });

  it('maps delivery report statuses and costs', () => {
    expect(parseAfricasTalkingStatus('Success')).toBe('delivered');
    expect(parseAfricasTalkingStatus('Failed')).toBe('failed');
    expect(parseAfricasTalkingStatus('Rejected')).toBe('failed');
    expect(parseAfricasTalkingStatus('Sent')).toBe('pending');
    expect(parseAfricasTalkingStatus(undefined)).toBe('pending');
    expect(parseAfricasTalkingCost('KES 2.5000')).toBe(3);
    expect(parseAfricasTalkingCost('')).toBeUndefined();
  });
});

describe('WhatsAppCloudProvider templates by country', () => {
  const body = { messages: [{ id: 'wamid.1' }] };
  const template = (country?: string) => ({
    kind: 'invite' as const,
    locale: 'en' as const,
    country,
    params: ['a'],
  });
  const make = (impl: typeof fetch) =>
    new WhatsAppCloudProvider({
      token: 't',
      phoneNumberId: '1',
      fetchImpl: impl,
      templates: { invite: 'harusi_invite_tz' },
      templatesByCountry: { KE: { invite: 'harusi_invite_ke' } },
    });
  const sentType = (calls: { init: RequestInit }[]) => {
    const j = JSON.parse(calls[0]!.init.body as string);
    return j.type === 'template' ? j.template.name : j.type;
  };

  it('uses the country templates, the base templates for Tanzania, and plain text otherwise', async () => {
    for (const [country, want] of [
      ['KE', 'harusi_invite_ke'],
      ['TZ', 'harusi_invite_tz'],
      [undefined, 'harusi_invite_tz'],
      ['UG', 'text'],
    ] as const) {
      const { impl, calls } = fakeFetch(200, body);
      await make(impl).send('+254712345678', 'hi', template(country));
      expect(sentType(calls), String(country)).toBe(want);
    }
  });
});
