import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

const event = (extra: Record<string, unknown> = {}) => ({
  title: 'Harusi',
  coupleNames: 'Neema & Juma',
  dateStart: '2027-01-16T10:00:00+03:00',
  venueName: 'Ukumbi',
  ...extra,
});

describe('Kenya support is off by default (Tanzania unchanged)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => ctx.close());

  it('creates Tanzanian events by default and refuses a Kenyan one', async () => {
    const s = await loginAs(ctx, '0711200001');
    const ok = await api(ctx, 'POST', '/v1/events', { token: s.accessToken, body: event() });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({
      country: 'TZ',
      currency: 'TZS',
      timezone: 'Africa/Dar_es_Salaam',
    });
    const ke = await api(ctx, 'POST', '/v1/events', {
      token: s.accessToken,
      body: event({ country: 'KE' }),
    });
    expect(ke.status).toBe(400);
    expect(ke.body?.error.details.reason).toBe('country.disabled');
  });

  it('still rejects +254 guest numbers', async () => {
    const s = await loginAs(ctx, '0711200002');
    const ev = await api(ctx, 'POST', '/v1/events', { token: s.accessToken, body: event() });
    const g = await api(ctx, 'POST', `/v1/events/${ev.body!.id}/guests`, {
      token: s.accessToken,
      body: { displayName: 'Wanjiru Kamau', phone: '+254712345678' },
    });
    expect(g.status).toBe(400);
    expect(g.body?.error.details.reason).toBe('not_tanzanian');
  });
});

describe('Kenya support enabled', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext({ env: { KENYA_ENABLED: '1' } });
  });
  afterAll(() => ctx.close());

  it('creates a Kenyan event with KES and Nairobi time', async () => {
    const s = await loginAs(ctx, '0711300001');
    const ke = await api(ctx, 'POST', '/v1/events', {
      token: s.accessToken,
      body: event({ country: 'KE' }),
    });
    expect(ke.status).toBe(201);
    expect(ke.body).toMatchObject({ country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi' });
  });

  it('reads local numbers with the event country and accepts diaspora numbers', async () => {
    const s = await loginAs(ctx, '0711300002');
    const ke = await api(ctx, 'POST', '/v1/events', {
      token: s.accessToken,
      body: event({ country: 'KE' }),
    });
    const tz = await api(ctx, 'POST', '/v1/events', { token: s.accessToken, body: event() });
    const add = (id: string, name: string, phone: string) =>
      api(ctx, 'POST', `/v1/events/${id}/guests`, {
        token: s.accessToken,
        body: { displayName: name, phone },
      });
    expect((await add(ke.body!.id, 'Wanjiru Kamau', '0712345678')).body?.phoneE164).toBe(
      '+254712345678',
    );
    expect((await add(ke.body!.id, 'Asha Mwinyi', '+255754123456')).body?.phoneE164).toBe(
      '+255754123456',
    );
    expect((await add(tz.body!.id, 'Baraka Joseph', '0712345678')).body?.phoneE164).toBe(
      '+255712345678',
    );
    expect((await add(tz.body!.id, 'Otieno Odhiambo', '+254722111222')).body?.phoneE164).toBe(
      '+254722111222',
    );
    const bad = await add(ke.body!.id, 'Mama Neema', '+256712345678');
    expect(bad.status).toBe(400);
    expect(bad.body?.error.details.reason).toBe('unsupported_country');
  });

  it('imports a CSV of Kenyan numbers', async () => {
    const s = await loginAs(ctx, '0711300003');
    const ke = await api(ctx, 'POST', '/v1/events', {
      token: s.accessToken,
      body: event({ country: 'KE' }),
    });
    const r = await api(ctx, 'POST', `/v1/events/${ke.body!.id}/guests/import`, {
      token: s.accessToken,
      body: {
        csv: 'Jina,Simu\nWanjiru Kamau,0712 345 678\nOtieno Odhiambo,0722111222\nBad Row,0612345678\n',
      },
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ created: 2 });
  });

  it('accepts a +254 number at sign-in', async () => {
    const s = await loginAs(ctx, '+254733000111');
    expect(s.user.phoneE164).toBe('+254733000111');
  });

  it('only allows payment methods valid in the event country', async () => {
    const s = await loginAs(ctx, '0711300004');
    const ke = await api(ctx, 'POST', '/v1/events', {
      token: s.accessToken,
      body: event({ country: 'KE' }),
    });
    const g = await api(ctx, 'POST', `/v1/events/${ke.body!.id}/guests`, {
      token: s.accessToken,
      body: { displayName: 'Wanjiru Kamau', phone: '0712345678' },
    });
    const pay = (method: string) =>
      api(ctx, 'POST', '/v1/payments/manual', {
        token: s.accessToken,
        body: { guestId: g.body!.id, amount: 5000, method },
      });
    const bad = await pay('halopesa');
    expect(bad.status).toBe(400);
    expect(bad.body?.error.details.reason).toBe('method.not_available');
    expect((await pay('mpesa')).status).toBeLessThan(300);
    expect((await pay('cash')).status).toBeLessThan(300);
  });

  it('does not let an event change country afterwards', async () => {
    const s = await loginAs(ctx, '0711300005');
    const ke = await api(ctx, 'POST', '/v1/events', {
      token: s.accessToken,
      body: event({ country: 'KE' }),
    });
    const r = await api(ctx, 'PATCH', `/v1/events/${ke.body!.id}`, {
      token: s.accessToken,
      body: { country: 'TZ', title: 'Renamed' },
    });
    expect(r.body).toMatchObject({ country: 'KE', currency: 'KES', title: 'Renamed' });
  });
});
