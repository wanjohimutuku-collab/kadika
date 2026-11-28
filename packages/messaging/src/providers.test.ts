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

    // When template has mediaUrl, it calls sendMedia
    const { impl: mediaImpl, calls: mediaCalls } = fakeFetch(200, { key: { id: 'media-1' } });
    const pMedia = new EvolutionWhatsAppProvider({
      baseUrl: 'https://evo.test',
      instance: 'harusi',
      apiKey: 'secret',
      fetchImpl: mediaImpl,
    });
    const mediaRes = await pMedia.send('+255712345678', 'habari kadi', {
      kind: 'invite',
      locale: 'sw',
      params: ['Asha', 'Juma', '14 Des', 'link', 'KH-4826'],
      mediaUrl: 'https://kadisasa.com/api/card-image?code=KH-4826',
    });
    expect(mediaRes).toEqual({ providerMsgId: 'media-1', cost: 0 });
    expect(mediaCalls[0]!.url).toBe('https://evo.test/message/sendMedia/harusi');
    expect(JSON.parse(mediaCalls[0]!.init.body as string)).toEqual({
      number: '255712345678',
      mediatype: 'image',
      media: 'https://kadisasa.com/api/card-image?code=KH-4826',
      caption: 'habari kadi',
      fileName: 'kadi.png',
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
    const notFound = new EvolutionWhatsAppProvider({
      baseUrl: 'https://evo.test/message/',
      instance: ' harusi ',
      apiKey: 'secret',
      fetchImpl: fakeFetch(404, {
        response: { message: ['The "harusi" instance does not exist'] },
      }).impl,
    });
    expect(notFound.baseUrl).toBe('https://evo.test');
    expect(notFound.instance).toBe('harusi');
    await expect(notFound.send('+255712345678', 'x')).rejects.toThrow(
      /evolution 404: The "harusi" instance does not exist/,
    );
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
  it('treats a rejected status as a failure even on HTTP 200 with a messageId', async () => {
    await expect(
      new NextSmsProvider({
        ...opts,
        fetchImpl: fakeFetch(200, {
          messages: [
            {
              messageId: 123,
              status: {
                groupName: 'REJECTED',
                name: 'REJECTED_SENDER',
                description: 'Invalid sender',
              },
            },
          ],
        }).impl,
      }).send('+255712345678', 'x'),
    ).rejects.toThrow(/^nextsms REJECTED_SENDER \(Invalid sender\)$/);
  });
  it('accepts HTTP 200 with PENDING status and returns messageId', async () => {
    const p = new NextSmsProvider({
      ...opts,
      fetchImpl: fakeFetch(200, {
        messages: [
          {
            messageId: 789,
            status: { groupName: 'PENDING', name: 'PENDING_ENROUTE' },
          },
        ],
      }).impl,
    });
    expect((await p.send('+255712345678', 'x')).providerMsgId).toBe('789');
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
      /^whatsapp-cloud 400 code 131047 \(outside the 24-hour window: needs an approved template\)$/,
    );
    // The codes that stop every card get a plain reason (our words, never Meta's text).
    for (const [code, reason] of [
      [131037, 'sender display name not approved by Meta'],
      [131030, 'recipient not on the test number allowed list'],
      [132001, 'template not approved in this language'],
      [190, 'access token expired or invalid'],
    ] as const) {
      const q = new WhatsAppCloudProvider({
        ...base,
        fetchImpl: fakeFetch(400, { error: { code, message: 'to 255712345678' } }).impl,
      });
      await expect(q.send('+255712345678', 'x', template)).rejects.toThrow(
        `whatsapp-cloud 400 code ${code} (${reason})`,
      );
    }
    const unknown = new WhatsAppCloudProvider({
      ...base,
      fetchImpl: fakeFetch(400, { error: { code: 999999 } }).impl,
    });
    await expect(unknown.send('+255712345678', 'x', template)).rejects.toThrow(
      /^whatsapp-cloud 400 code 999999$/,
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
    expect(metaVerifyChallenge({ mode: 'subscribe', token: '', challenge: '42' }, '')).toBeNull();
    expect(
      metaVerifyChallenge({ mode: 'unsubscribe', token: 'v', challenge: '42' }, 'v'),
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
                    {
                      id: 'e',
                      status: 'failed',
                      errors: [{ code: 131026, title: 'Message undeliverable' }],
                    },
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
      { providerMsgId: 'e', state: 'failed', failureReason: 'code 131026: Message undeliverable' },
      { providerMsgId: 'd', state: 'pending' },
    ]);
    expect(parseCloudStatuses(null)).toEqual([]);
  });
  it('replaces blank template parameters with an em-dash and retries OTP with a copy-code button', async () => {
    const singleHost = fakeFetch(200, { messages: [{ id: 'w-single' }] });
    await new WhatsAppCloudProvider({ ...base, fetchImpl: singleHost.impl }).send(
      '+255712345678',
      'x',
      { ...template, params: ['Neema', '', '1 Juni 2027', 'https://s.test/s/abc', 'KH-4821'] },
    );
    expect(
      JSON.parse(singleHost.calls[0]!.init.body as string).template.components[0].parameters[1],
    ).toEqual({ type: 'text', text: '—' });

    const bodies: { template: { components: unknown[] } }[] = [];
    const otpFetch = (async (_u: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1
        ? new Response(JSON.stringify({ error: { code: 132000 } }), { status: 400 })
        : new Response(JSON.stringify({ messages: [{ id: 'wamid.otp' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const otpRes = await new WhatsAppCloudProvider({
      token: 't',
      phoneNumberId: 'p',
      templates: { otp: 'harusi_otp' },
      fetchImpl: otpFetch,
    }).send('+255712345678', 'code 123456', {
      kind: 'otp',
      locale: 'sw',
      country: 'TZ',
      params: ['123456'],
    });
    expect(otpRes.providerMsgId).toBe('wamid.otp');
    expect(bodies[0]!.template.components).toHaveLength(1);
    expect(bodies[1]!.template.components).toEqual([
      { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: '123456' }],
      },
    ]);
  });

  it('verifies Cloud API connection against the Graph API phone number endpoint', async () => {
    const ok = fakeFetch(200, {
      verified_name: 'Kadi Sasa',
      display_phone_number: '+255 712 345 678',
      quality_rating: 'GREEN',
      code_verification_status: 'VERIFIED',
    });
    const res = await new WhatsAppCloudProvider({
      ...base,
      token: 'Bearer tok',
      fetchImpl: ok.impl,
    }).verifyConnection();
    expect(ok.calls[0]!.url).toBe(
      'https://graph.facebook.com/v21.0/1234567890?fields=verified_name,display_phone_number,quality_rating,code_verification_status',
    );
    expect((ok.calls[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(res).toEqual({
      ok: true,
      verifiedName: 'Kadi Sasa',
      displayPhoneNumber: '+255 712 345 678',
      qualityRating: 'GREEN',
      status: 'VERIFIED',
      apiVersion: 'v21.0',
      error: null,
      canSendMessage: null,
      healthIssues: [],
    });
    expect(ok.calls[1]!.url).toBe(
      'https://graph.facebook.com/v21.0/1234567890?fields=health_status',
    );

    // Falls back to bare /{phoneNumberId} when Meta returns 400 code 100 on fields=
    const urls: string[] = [];
    const fallbackFetch = (async (u: string) => {
      urls.push(u);
      return urls.length === 1
        ? new Response(JSON.stringify({ error: { code: 100, message: 'Authorization Error' } }), {
            status: 400,
          })
        : new Response(
            JSON.stringify({
              verified_name: 'Kadi Sasa',
              display_phone_number: '+255 712 345 678',
            }),
            { status: 200 },
          );
    }) as unknown as typeof fetch;
    const fbRes = await new WhatsAppCloudProvider({
      ...base,
      fetchImpl: fallbackFetch,
    }).verifyConnection();
    expect(urls).toEqual([
      'https://graph.facebook.com/v21.0/1234567890?fields=verified_name,display_phone_number,quality_rating,code_verification_status',
      'https://graph.facebook.com/v21.0/1234567890',
      'https://graph.facebook.com/v21.0/1234567890?fields=health_status',
    ]);
    expect(fbRes).toMatchObject({
      ok: true,
      verifiedName: 'Kadi Sasa',
      displayPhoneNumber: '+255 712 345 678',
    });

    const bad = fakeFetch(401, {
      error: { code: 190, error_subcode: 463, message: 'Invalid OAuth access token' },
    });
    const errRes = await new WhatsAppCloudProvider({
      ...base,
      fetchImpl: bad.impl,
    }).verifyConnection();
    expect(errRes).toEqual({
      ok: false,
      verifiedName: null,
      displayPhoneNumber: null,
      qualityRating: null,
      status: null,
      apiVersion: 'v21.0',
      error: 'Graph API 401 (code 190, subcode 463): Invalid OAuth access token',
      canSendMessage: null,
      healthIssues: [],
    });
    expect(bad.calls).toHaveLength(1);
  });

  it("reports Meta's messaging health, so a connected number that cannot send is not shown as fine", async () => {
    const health = (h: unknown, status = 200) =>
      (async (u: string) =>
        u.includes('health_status')
          ? new Response(JSON.stringify(h), { status })
          : new Response(JSON.stringify({ verified_name: 'KadiSasa' }), {
              status: 200,
            })) as unknown as typeof fetch;
    const check = (h: unknown, status?: number) =>
      new WhatsAppCloudProvider({ ...base, fetchImpl: health(h, status) }).verifyConnection();

    expect(
      await check({
        health_status: {
          can_send_message: 'AVAILABLE',
          entities: [{ entity_type: 'PHONE_NUMBER', can_send_message: 'AVAILABLE' }],
        },
      }),
    ).toMatchObject({ ok: true, canSendMessage: 'AVAILABLE', healthIssues: [] });

    expect(
      await check({
        health_status: {
          can_send_message: 'BLOCKED',
          entities: [
            {
              entity_type: 'PHONE_NUMBER',
              can_send_message: 'LIMITED',
              additional_info: ['Your display name has not been approved yet.'],
            },
            {
              entity_type: 'BUSINESS',
              can_send_message: 'BLOCKED',
              errors: [
                {
                  error_code: 141010,
                  error_description: 'The business has not been verified.',
                  possible_solution: 'Complete business verification.',
                },
                { error_code: 141000 },
              ],
            },
          ],
        },
      }),
    ).toMatchObject({
      ok: true,
      canSendMessage: 'BLOCKED',
      healthIssues: [
        'PHONE_NUMBER: Your display name has not been approved yet.',
        'BUSINESS: The business has not been verified. (code 141010) Complete business verification.',
        'BUSINESS: code 141000',
      ],
    });

    // A token or API version that cannot read health_status still passes the connection test.
    expect(await check({ error: { code: 100 } }, 400)).toMatchObject({
      ok: true,
      verifiedName: 'KadiSasa',
      canSendMessage: null,
      healthIssues: [],
    });
    expect(await check({ health_status: { can_send_message: 'WHATEVER' } })).toMatchObject({
      canSendMessage: null,
    });
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
      senderId: 'KADISASA',
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
      from: 'KADISASA',
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

describe('WhatsAppCloudProvider image header (ADR 058)', () => {
  it('puts the card image in the template header only when enabled', async () => {
    const bodies: unknown[] = [];
    const fetchImpl = (async (_u: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const t = {
      kind: 'invite' as const,
      locale: 'sw' as const,
      country: 'TZ',
      params: ['A'],
      mediaUrl: 'https://x.test/c.png',
    };
    const base = { token: 't', phoneNumberId: 'p', templates: { invite: 'inv' }, fetchImpl };
    await new WhatsAppCloudProvider({ ...base, imageHeader: true }).send('+255712000001', 'x', t);
    await new WhatsAppCloudProvider(base).send('+255712000001', 'x', t);
    const comps = (b: unknown) =>
      (b as { template: { components: { type: string }[] } }).template.components;
    expect(comps(bodies[0]).map((c) => c.type)).toEqual(['header', 'body']);
    expect(comps(bodies[1]).map((c) => c.type)).toEqual(['body']);
  });

  it('sends the card as an image with the text as caption when there is no template', async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = (async (_u: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.2' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const t = {
      kind: 'invite' as const,
      locale: 'sw' as const,
      country: 'KE',
      params: ['A'],
      mediaUrl: 'https://x.test/c.png',
    };
    await new WhatsAppCloudProvider({ token: 't', phoneNumberId: 'p', fetchImpl }).send(
      '+254712000001',
      'Karibu https://x.test/s/abc',
      t,
    );
    expect(bodies[0]).toMatchObject({
      type: 'image',
      image: { link: 'https://x.test/c.png', caption: 'Karibu https://x.test/s/abc' },
    });
  });

  it('retries without the header when the template was approved without one', async () => {
    const bodies: { template: { components: { type: string }[] } }[] = [];
    const fetchImpl = (async (_u: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1
        ? new Response(JSON.stringify({ error: { code: 132012 } }), { status: 400 })
        : new Response(JSON.stringify({ messages: [{ id: 'wamid.3' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await new WhatsAppCloudProvider({
      token: 't',
      phoneNumberId: 'p',
      templates: { invite: 'inv' },
      imageHeader: true,
      fetchImpl,
    }).send('+255712000001', 'x', {
      kind: 'invite',
      locale: 'sw',
      country: 'TZ',
      params: ['A'],
      mediaUrl: 'https://x.test/c.png',
    });
    expect(r.providerMsgId).toBe('wamid.3');
    expect(bodies.map((b) => b.template.components.map((c) => c.type))).toEqual([
      ['header', 'body'],
      ['body'],
    ]);
  });

  it('retries WITH an image header when imageHeader is off but Meta requires one', async () => {
    const bodies: { template: { components: { type: string }[] } }[] = [];
    const fetchImpl = (async (_u: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1
        ? new Response(JSON.stringify({ error: { code: 132000 } }), { status: 400 })
        : new Response(JSON.stringify({ messages: [{ id: 'wamid.hdr' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await new WhatsAppCloudProvider({
      token: 't',
      phoneNumberId: 'p',
      templates: { invite: 'kadisasa_card' },
      fetchImpl,
    }).send('+255712000001', 'x', {
      kind: 'invite',
      locale: 'sw',
      country: 'TZ',
      params: ['Asha', 'Juma', '14 Des 2026', 'https://x.test/s/abc', 'KH-4821'],
      mediaUrl: 'https://x.test/c.png',
    });
    expect(r.providerMsgId).toBe('wamid.hdr');
    expect(bodies.map((b) => b.template.components.map((c) => c.type))).toEqual([
      ['body'],
      ['header', 'body'],
    ]);
  });

  it('falls back across languages on 132001 and retries image header on the matched language', async () => {
    const seen: { code: string; types: string[] }[] = [];
    const fetchImpl = (async (_u: string, init?: RequestInit) => {
      const b = JSON.parse(String(init?.body)) as {
        template: { language: { code: string }; components: { type: string }[] };
      };
      const code = b.template.language.code;
      const types = b.template.components.map((c) => c.type);
      seen.push({ code, types });
      if (code === 'en') {
        return new Response(JSON.stringify({ error: { code: 132001 } }), { status: 400 });
      }
      if (code === 'en_US' && !types.includes('header')) {
        return new Response(JSON.stringify({ error: { code: 132012 } }), { status: 400 });
      }
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.lang' }] }), { status: 200 });
    }) as unknown as typeof fetch;

    const r = await new WhatsAppCloudProvider({
      token: 't',
      phoneNumberId: 'p',
      templates: { invite: 'kadisasa_card' },
      fetchImpl,
    }).send('+255712000001', 'x', {
      kind: 'invite',
      locale: 'en',
      country: 'TZ',
      params: ['Asha', 'Juma', '14 Des 2026', 'https://x.test/s/abc', 'KH-4821'],
      mediaUrl: 'https://x.test/c.png',
    });
    expect(r.providerMsgId).toBe('wamid.lang');
    expect(seen).toEqual([
      { code: 'en', types: ['body'] },
      { code: 'en_US', types: ['body'] },
      { code: 'en_US', types: ['header', 'body'] },
    ]);
  });

  it('sanitizes newlines, tabs, and repeated spaces in params and preserves subcode in errors', async () => {
    const { impl, calls } = fakeFetch(200, { messages: [{ id: 'wamid.san' }] });
    await new WhatsAppCloudProvider({
      token: 't',
      phoneNumberId: 'p',
      templates: { invite: 'inv' },
      fetchImpl: impl,
    }).send('+255712000001', 'x', {
      kind: 'invite',
      locale: 'sw',
      params: ['Asha\n  Mwinyi', 'Juma\t\tAli', '  ', 'https://x.test/s/1', 'KH-1'],
    });
    expect(
      JSON.parse(calls[0]!.init.body as string).template.components[0].parameters.map(
        (p: { text: string }) => p.text,
      ),
    ).toEqual(['Asha Mwinyi', 'Juma Ali', '—', 'https://x.test/s/1', 'KH-1']);

    const errProvider = new WhatsAppCloudProvider({
      token: 't',
      phoneNumberId: 'p',
      templates: { invite: 'inv' },
      fetchImpl: fakeFetch(400, { error: { code: 131047, error_subcode: 2494010 } }).impl,
    });
    await expect(
      errProvider.send('+255712000001', 'x', {
        kind: 'invite',
        locale: 'sw',
        params: ['A', 'B', 'D', 'L', 'C'],
      }),
    ).rejects.toThrow(
      /^whatsapp-cloud 400 code 131047 subcode 2494010 \(outside the 24-hour window: needs an approved template\)$/,
    );
  });
});
