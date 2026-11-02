import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { events, memories } from '@harusi/db';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
async function setup() {
  const phone = `07881${String(++seq).padStart(5, '0')}`;
  const owner = await loginAs(ctx, phone);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body!;
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Bibi Pendo', phone: `0714${String(500000 + seq)}`, language: 'sw' },
    })
  ).body! as { id: string; cardToken: string };
  return { t, owner, evId: ev.id as string, g };
}

describe('memories schema', () => {
  it('new events have the page on with a limit of 30, and no memories', async () => {
    const { evId } = await setup();
    const [e] = await ctx.db.select().from(events).where(eq(events.id, evId));
    expect(e).toMatchObject({ memoriesEnabled: true, memoriesLimit: 30 });
    expect(await ctx.db.select().from(memories).where(eq(memories.eventId, evId))).toEqual([]);
  });
});
