import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { guests, invitations, messageLog, payments } from '@harusi/db';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
let t: string;
let evId: string;
let g1: { id: string; cardToken: string };
let g2: { id: string; cardToken: string };
beforeAll(async () => {
  ctx = await createTestContext({ env: { KENYA_ENABLED: '1' } });
  const owner = await loginAs(ctx, '0711700001');
  t = owner.accessToken;
  evId = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Harusi',
        coupleNames: 'Neema',
        dateStart: '2027-06-01T10:00:00+03:00',
        country: 'KE',
      },
    })
  ).body!.id;
  const add = async (name: string, phone: string) =>
    (
      await api(ctx, 'POST', `/v1/events/${evId}/guests`, {
        token: t,
        body: { displayName: name, phone, hasSmartphone: false },
      })
    ).body as { id: string; cardToken: string };
  g1 = await add('Wanjiru Kamau', '0712345681');
  g2 = await add('Otieno Odhiambo', '0722345682');
});
afterAll(() => ctx.close());

const send = (channel: 'sms' = 'sms') =>
  api(ctx, 'POST', `/v1/events/${evId}/invitations/send`, {
    token: t,
    body: { target: 'remaining', channel },
  });
let payKey = 0;
const startPay = (token: string) => {
  ctx.clock.now += 61_000;
  return ctx.app.request(`/v1/c/${token}/pay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': `rb-key-${++payKey}-aa` },
    body: JSON.stringify({ amount: 500, phone: '0712 345 678', method: 'mpesa' }),
  });
};

describe('rollback levers (docs/ops/kenya-pilot-runbook.md)', () => {
  it('pauses new Kenyan messages without touching Tanzania or losing the invitation', async () => {
    ctx.deps.config.kenyaSendingPaused = true;
    try {
      ctx.smsKe.sent.length = 0;
      ctx.whatsapp.sent.length = 0;
      const r = await send();
      expect(r.body).toMatchObject({ sent: 0, failed: 2 });
      expect(ctx.smsKe.sent).toHaveLength(0);
      expect(ctx.whatsapp.sent).toHaveLength(0);
      expect(await ctx.db.select().from(messageLog)).toHaveLength(0);
      const inv = await ctx.db.select().from(invitations).where(eq(invitations.guestId, g1.id));
      expect(inv[0]!.status).toBe('created');
    } finally {
      ctx.deps.config.kenyaSendingPaused = false;
    }
    // lifting the pause sends them
    const again = await send();
    expect(again.body).toMatchObject({ sent: 2, failed: 0 });
    expect(ctx.smsKe.sent).toHaveLength(2);
  });

  it('pauses new Kenyan payment prompts but still settles one already started', async () => {
    const started = await startPay(g1.cardToken);
    expect(started.status).toBe(201);
    const ref = ctx.paymentsKe.started.at(-1)!.reference;
    ctx.deps.config.kenyaPaymentsPaused = true;
    try {
      const blocked = await startPay(g2.cardToken);
      expect(blocked.status).toBe(403);
      expect((await blocked.json()).error.details.reason).toBe('payments_paused');
      const body = ctx.paymentsKe.webhookBody({
        reference: ref,
        status: 'success',
        amount: 500,
        currency: 'KES',
      });
      const hook = await ctx.app.request('/v1/payments/webhook/fake-ke', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...body.headers },
        body: body.raw,
      });
      expect(await hook.json()).toMatchObject({ applied: true });
      const [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
      expect(row!.status).toBe('success');
    } finally {
      ctx.deps.config.kenyaPaymentsPaused = false;
    }
  });

  it('with Kenya switched off, Kenyan data stays readable and nothing uses the wrong route', async () => {
    // What index.ts does with KENYA_ENABLED off: no Kenyan providers, Kenyan numbers not accepted.
    const smsRoute = ctx.deps.smsByCountry!.KE;
    const payRoute = ctx.deps.paymentsByCountry!.KE;
    delete ctx.deps.smsByCountry!.KE;
    delete ctx.deps.paymentsByCountry!.KE;
    ctx.deps.config.kenyaEnabled = false;
    try {
      const ev = await api(ctx, 'GET', `/v1/events/${evId}`, { token: t });
      expect(ev.body).toMatchObject({ country: 'KE', currency: 'KES' });
      const list = await api(ctx, 'GET', `/v1/events/${evId}/guests`, { token: t });
      expect(list.body?.items).toHaveLength(2);
      // a Kenyan number can no longer sign in
      const otp = await api(ctx, 'POST', '/v1/auth/otp/request', {
        body: { phone: '+254733000999' },
      });
      expect(otp.status).toBe(400);
      // sends fail safely, never through the Tanzanian gateway
      await ctx.db.update(guests).set({ phoneE164: '+254712345681' }).where(eq(guests.id, g1.id));
      ctx.sms.sent.length = 0;
      await ctx.db
        .update(invitations)
        .set({ status: 'created', sentAt: null })
        .where(eq(invitations.guestId, g1.id));
      const r = await send();
      expect(r.body!.failed).toBeGreaterThanOrEqual(1);
      expect(ctx.sms.sent).toHaveLength(0);
      // no new Kenyan payments, no new Kenyan events
      const blocked = await startPay(g1.cardToken);
      expect(blocked.status).toBe(403);
      const created = await api(ctx, 'POST', '/v1/events', {
        token: t,
        body: {
          title: 'Another',
          coupleNames: 'A',
          dateStart: '2027-06-01T10:00:00+03:00',
          country: 'KE',
        },
      });
      expect(created.status).toBe(400);
    } finally {
      ctx.deps.smsByCountry!.KE = smsRoute;
      ctx.deps.paymentsByCountry!.KE = payRoute;
      ctx.deps.config.kenyaEnabled = true;
    }
  });
});
