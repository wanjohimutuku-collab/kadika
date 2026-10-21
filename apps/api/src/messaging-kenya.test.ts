import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { invitations, messageLog } from '@harusi/db';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext({
    env: { KENYA_ENABLED: '1', SHORT_BASE_URL_KE: 'https://harusi.example.ke' },
  });
});
afterAll(() => ctx.close());

const body = (extra: Record<string, unknown> = {}) => ({
  title: 'Harusi',
  coupleNames: 'Neema',
  dateStart: '2027-06-01T10:00:00+03:00',
  venueName: 'Ukumbi',
  ...extra,
});

async function setup(phone: string, country: 'TZ' | 'KE') {
  const owner = await loginAs(ctx, phone);
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: owner.accessToken,
      body: body({ country }),
    })
  ).body!;
  return { ev, t: owner.accessToken };
}
const addGuest = (evId: string, t: string, b: Record<string, unknown>) =>
  api(ctx, 'POST', `/v1/events/${evId}/guests`, { token: t, body: b });
const send = (evId: string, t: string, channel?: 'sms' | 'whatsapp') =>
  api(ctx, 'POST', `/v1/events/${evId}/invitations/send`, {
    token: t,
    body: { target: 'remaining', ...(channel ? { channel } : {}) },
  });
const reset = () => {
  ctx.sms.sent.length = 0;
  ctx.smsKe.sent.length = 0;
  ctx.whatsapp.sent.length = 0;
};

describe('SMS routing by the number’s country (ADR 026)', () => {
  it('sends the sign-in code through the route of the number’s own country', async () => {
    reset();
    await loginAs(ctx, '+254733000222');
    await loginAs(ctx, '0711500001');
    expect(ctx.smsKe.sent.map((m) => m.to)).toEqual(['+254733000222']);
    expect(ctx.smsKe.sent[0]!.body).toMatch(/Your Kadi Sasa verification code is \d{6}/);
    expect(ctx.sms.sent.map((m) => m.to)).toEqual(['+255711500001']);
    expect(ctx.sms.sent[0]!.body).toMatch(/Namba yako ya uthibitisho/);
  });

  it('refuses a sign-in code for a country with no SMS route instead of using another one', async () => {
    const saved = ctx.deps.smsByCountry!.KE;
    delete ctx.deps.smsByCountry!.KE;
    try {
      reset();
      const r = await api(ctx, 'POST', '/v1/auth/otp/request', {
        body: { phone: '+254733000333' },
      });
      expect(r.status).toBe(503);
      expect(r.body?.error.details.reason).toBe('sms_route_missing');
      expect(ctx.sms.sent).toHaveLength(0);
    } finally {
      ctx.deps.smsByCountry!.KE = saved;
    }
  });

  it('routes each invitation by the guest’s number, whatever the event country', async () => {
    const { ev, t } = await setup('0711500002', 'KE');
    await addGuest(ev.id, t, { displayName: 'Wanjiru Kamau', phone: '0712345678' });
    await addGuest(ev.id, t, { displayName: 'Asha Mwinyi', phone: '+255754123456' });
    reset();
    const r = await send(ev.id, t, 'sms');
    expect(r.body).toMatchObject({ sent: 2, failed: 0 });
    expect(ctx.smsKe.sent.map((m) => m.to)).toEqual(['+254712345678']);
    expect(ctx.sms.sent.map((m) => m.to)).toEqual(['+255754123456']);
  });

  it('records a failed message when a number’s country has no route, never the wrong gateway', async () => {
    const { ev, t } = await setup('0711500003', 'KE');
    await addGuest(ev.id, t, { displayName: 'Wanjiru Kamau', phone: '0712345678' });
    const saved = ctx.deps.smsByCountry!.KE;
    delete ctx.deps.smsByCountry!.KE;
    try {
      reset();
      const r = await send(ev.id, t, 'sms');
      expect(r.body).toMatchObject({ sent: 0, failed: 1 });
      expect(ctx.sms.sent).toHaveLength(0);
    } finally {
      ctx.deps.smsByCountry!.KE = saved;
    }
  });
});

describe('links and WhatsApp templates by event country', () => {
  it('uses the Kenyan link domain and a one-host-field template for a Kenyan event', async () => {
    const { ev, t } = await setup('0711500004', 'KE');
    await addGuest(ev.id, t, { displayName: 'Wanjiru Kamau', phone: '0712345678' });
    reset();
    await send(ev.id, t);
    const wa = ctx.whatsapp.sent[0]!;
    expect(wa.template).toMatchObject({ kind: 'invite', country: 'KE' });
    expect(wa.template!.params).toHaveLength(4);
    expect(wa.template!.params[0]).toBe('Neema');
    expect(wa.template!.params[2]).toMatch(/^https:\/\/harusi\.example\.ke\/s\//);
  });

  it('keeps the Tanzanian link domain and five-parameter template for a Tanzanian event', async () => {
    const { ev, t } = await setup('0711500005', 'TZ');
    await addGuest(ev.id, t, { displayName: 'Baraka Joseph', phone: '0712345679' });
    reset();
    await send(ev.id, t);
    const wa = ctx.whatsapp.sent[0]!;
    expect(wa.template).toMatchObject({ kind: 'invite', country: 'TZ' });
    expect(wa.template!.params).toHaveLength(5);
    expect(wa.template!.params[3]).not.toContain('harusi.example.ke');
  });
});

describe('Africa’s Talking delivery reports', () => {
  it('marks a message and its invitation delivered, and rejects a wrong secret', async () => {
    const { ev, t } = await setup('0711500006', 'KE');
    const g = (await addGuest(ev.id, t, { displayName: 'Wanjiru Kamau', phone: '0712345678' }))
      .body!;
    reset();
    await send(ev.id, t, 'sms');
    const [log] = await ctx.db.select().from(messageLog).where(eq(messageLog.guestId, g.id));
    const post = (secret: string, form: Record<string, string>) =>
      ctx.app.request(`/v1/webhooks/sms/africastalking?secret=${secret}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form).toString(),
      });
    expect(
      (await post('wrong-secret-value', { id: log!.providerMsgId!, status: 'Success' })).status,
    ).toBe(401);
    const ok = await post('hook-secret-for-tests', {
      id: log!.providerMsgId!,
      status: 'Success',
      phoneNumber: '+254712345678',
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ known: true });
    const [m] = await ctx.db.select().from(messageLog).where(eq(messageLog.id, log!.id));
    expect(m!.status).toBe('delivered');
    const [inv] = await ctx.db.select().from(invitations).where(eq(invitations.guestId, g.id));
    expect(inv!.status).toBe('delivered');
  });

  it('records a failed report and ignores an unknown message id', async () => {
    const r = await ctx.app.request(
      '/v1/webhooks/sms/africastalking?secret=hook-secret-for-tests',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'id=does-not-exist&status=Failed',
      },
    );
    expect(await r.json()).toMatchObject({ ok: true, known: false });
  });
});
