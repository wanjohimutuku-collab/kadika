import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

async function setup(phone: string) {
  const owner = await loginAs(ctx, phone);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body! as { id: string };
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Bibi Pendo', phone: '0712000111' },
    })
  ).body! as { id: string; cardToken: string };
  const member = async (memberPhone: string, role: 'committee' | 'gate') => {
    await api(ctx, 'POST', `/v1/events/${ev.id}/members`, {
      token: t,
      body: { name: 'Mjumbe', phone: memberPhone, role },
    });
    return (await loginAs(ctx, memberPhone)).accessToken;
  };
  return { t, ev, g, member };
}

describe('deleting an event (Mipangilio → Futa harusi)', () => {
  it('is owner-only, hides the event from every member and turns its cards invalid', async () => {
    const { t, ev, g, member } = await setup('0745000001');
    const committee = await member('0745000002', 'committee');
    expect((await api(ctx, 'DELETE', `/v1/events/${ev.id}`, { token: committee })).status).toBe(
      403,
    );
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body?.state).toBe('ok');

    expect((await api(ctx, 'DELETE', `/v1/events/${ev.id}`, { token: t })).status).toBe(204);
    for (const token of [t, committee]) {
      expect((await api(ctx, 'GET', `/v1/events/${ev.id}`, { token })).status).toBe(404);
      const list = (await api(ctx, 'GET', '/v1/events', { token })).body!.items as { id: string }[];
      expect(list.map((e) => e.id)).not.toContain(ev.id);
    }
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body?.state).toBe('invalid');
  });
});

describe('test message (Tuma → ujumbe wa majaribio)', () => {
  it("goes only to the caller's own phone, free, and never to a gate agent", async () => {
    const { t, ev, member } = await setup('0745000011');
    const before = ctx.sms.sent.length;
    const res = await api(ctx, 'POST', `/v1/events/${ev.id}/messages/test`, {
      token: t,
      body: { channel: 'sms' },
    });
    expect(res.status).toBe(200);
    expect(res.body!.to).toBe('…011 (SMS)');
    const sent = ctx.sms.sent.slice(before);
    expect(sent.map((m) => m.to)).toEqual(['+255745000011']);
    expect(sent[0]!.body).toContain('majaribio');

    const gate = await member('0745000012', 'gate');
    expect(
      (
        await api(ctx, 'POST', `/v1/events/${ev.id}/messages/test`, {
          token: gate,
          body: { channel: 'sms' },
        })
      ).status,
    ).toBe(403);
  });
});

describe('guests: undo a delete, history and messages', () => {
  it('does not restore a guest whose phone is back on the list', async () => {
    const { t, ev, g } = await setup('0745000021');
    await api(ctx, 'DELETE', `/v1/guests/${g.id}`, { token: t });
    // the host added the same person again before pressing undo
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Bibi Pendo', phone: '0712000111' },
    });
    const res = await api(ctx, 'POST', '/v1/guests/restore', {
      token: t,
      body: { guestIds: [g.id] },
    });
    expect(res.body).toEqual({ restored: 0 });
  });

  it('keeps history, messages and reports away from gate agents', async () => {
    const { ev, g, member } = await setup('0745000031');
    const gate = await member('0745000032', 'gate');
    for (const path of [
      `/v1/guests/${g.id}/history`,
      `/v1/guests/${g.id}/messages`,
      `/v1/events/${ev.id}/report`,
    ])
      expect((await api(ctx, 'GET', path, { token: gate })).status).toBe(403);
    const activity = await api(ctx, 'GET', `/v1/events/${ev.id}/activity`, { token: gate });
    expect(activity.status).toBe(200);
    expect((activity.body as { kind: string }[]).some((a) => a.kind === 'payment')).toBe(false);
  });
});
