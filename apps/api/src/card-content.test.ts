import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
async function setup(content?: Record<string, unknown>) {
  const owner = await loginAs(ctx, `07911${String(++seq).padStart(5, '0')}`);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Harusi',
        coupleNames: 'Asha & Juma',
        dateStart: '2027-06-01T10:00:00+03:00',
        venueName: 'Ukumbi wa Mwanga',
        contributionTarget: 2_000_000,
        ...(content ? { cardContent: content } : {}),
      },
    })
  ).body!;
  return { t, ev, evId: ev.id as string };
}
const addGuest = async (t: string, evId: string, body: Record<string, unknown>) =>
  (await api(ctx, 'POST', `/v1/events/${evId}/guests`, { token: t, body })).body as {
    id: string;
    cardToken: string;
    cardKind: string;
  };
const send = (t: string, evId: string, channel: 'sms' | 'whatsapp' = 'sms') =>
  api(ctx, 'POST', `/v1/events/${evId}/invitations/send`, {
    token: t,
    body: { target: 'remaining', channel },
  });
const card = (token: string) => api(ctx, 'GET', `/v1/c/${token}`);
let phoneSeq = 0;
const phone = () => `0713${String(700000 + ++phoneSeq)}`;

describe('card content (ADR 029)', () => {
  it('makes new events family-sent by default and stores what the organiser writes', async () => {
    const { t, ev, evId } = await setup();
    expect(ev.cardContent).toEqual({ sender: { kind: 'family' } });
    const content = {
      sender: { kind: 'family', name: 'Familia ya Mzee Mwinyi', phone: '0712 000 111' },
      invitation: {
        eyebrow: { sw: 'Karibu kwenye harusi ya' },
        body: { sw: 'Tunamshukuru Mungu kwa baraka hii.' },
        programme: [{ time: '10:00', title: 'Ibada' }],
        show: { dressCode: false },
      },
      contribution: { title: { sw: 'Changia harusi yetu' }, suggestedAmounts: [10000, 20000] },
    };
    const r = await api(ctx, 'PATCH', `/v1/events/${evId}`, {
      token: t,
      body: { cardContent: content },
    });
    expect(r.status).toBe(200);
    expect(r.body?.cardContent).toEqual(content);
    const g = await addGuest(t, evId, { displayName: 'Bibi Pendo', phone: phone() });
    const view = (await card(g.cardToken)).body!;
    expect(view.event.cardContent).toEqual(content);
  });

  it('rejects unknown keys, unknown placeholders and a message without the link', async () => {
    const { t, evId } = await setup();
    const patch = (cardContent: unknown) =>
      api(ctx, 'PATCH', `/v1/events/${evId}`, { token: t, body: { cardContent } });
    expect((await patch({ nope: true })).status).toBe(400);
    expect((await patch({ messages: { inviteSms: { sw: 'Karibu {guest}' } } })).status).toBe(400);
    expect((await patch({ messages: { inviteSms: { sw: 'Karibu {siri} {link}' } } })).status).toBe(
      400,
    );
    expect((await patch({ messages: { inviteSms: { sw: 'Karibu {guest} {link}' } } })).status).toBe(
      200,
    );
  });

  it('only the owner can change it', async () => {
    const { t, evId } = await setup();
    const other = await loginAs(ctx, '0792000001');
    const r = await api(ctx, 'PATCH', `/v1/events/${evId}`, {
      token: other.accessToken,
      body: { cardContent: { sender: { kind: 'couple' } } },
    });
    expect(r.status).toBe(404);
    void t;
  });
});

describe('customised messages', () => {
  it('uses the organiser’s SMS template, sender and phone', async () => {
    const { t, evId } = await setup({
      sender: { kind: 'family', name: 'Familia ya Mzee Mwinyi', phone: '0712 000 111' },
      messages: {
        inviteSms: {
          sw: 'Karibu {guest}! {sender} wanakualika {date} saa {time}, {venue}. Kadi: {link} Piga {phone}',
        },
      },
    });
    const g = await addGuest(t, evId, {
      displayName: 'Bibi Pendo',
      phone: phone(),
      hasSmartphone: false,
    });
    ctx.sms.sent.length = 0;
    await send(t, evId);
    const sms = ctx.sms.sent.at(-1)!;
    expect(sms.body).toMatch(
      /^Karibu Bibi Pendo! Familia ya Mzee Mwinyi wanakualika 1 Juni 2027 saa 10:00, Ukumbi wa Mwanga\. Kadi: .+\/s\/.+ Piga 0712 000 111$/,
    );
    void g;
  });

  it('falls back to the built-in text when no template is set, and to the other language', async () => {
    const { t, evId } = await setup({ messages: { inviteSms: { en: 'Welcome {guest} {link}' } } });
    await addGuest(t, evId, { displayName: 'Bibi Pendo', phone: phone(), hasSmartphone: false });
    ctx.sms.sent.length = 0;
    await send(t, evId);
    // the guest's language is Swahili; only English was written, so it is used before the default
    expect(ctx.sms.sent.at(-1)!.body).toMatch(/^Welcome Bibi Pendo http/);
    const plain = await setup();
    await addGuest(plain.t, plain.evId, {
      displayName: 'Babu Salim',
      phone: phone(),
      hasSmartphone: false,
    });
    ctx.sms.sent.length = 0;
    await send(plain.t, plain.evId);
    expect(ctx.sms.sent.at(-1)!.body).toMatch(/^Karibu kwenye harusi ya Asha & Juma, /);
  });
});

describe('contribution cards', () => {
  it('has no QR, no RSVP and a contribution-only SMS and WhatsApp template', async () => {
    const { t, evId } = await setup({ sender: { kind: 'family', name: 'Familia ya Mwinyi' } });
    const inv = await addGuest(t, evId, { displayName: 'Mgeni Mwalikwa', phone: phone() });
    const con = await addGuest(t, evId, {
      displayName: 'Mchangiaji Mmoja',
      phone: phone(),
      cardKind: 'contribution',
    });
    expect(con.cardKind).toBe('contribution');
    expect(inv.cardKind).toBe('invitation');

    // Send first: opening a card marks its invitation opened, and "remaining" skips those.
    ctx.sms.sent.length = 0;
    ctx.whatsapp.sent.length = 0;
    await send(t, evId, 'whatsapp');
    const wa = ctx.whatsapp.sent.find((m) => m.template?.kind === 'contribution');
    expect(wa?.template?.params).toHaveLength(3);
    expect(wa?.template?.params[0]).toBe('Asha & Juma');
    expect(wa?.template?.params[1]).toBe('Familia ya Mwinyi');
    expect(ctx.whatsapp.sent.find((m) => m.template?.kind === 'invite')).toBeDefined();

    const sms = await setup({ sender: { kind: 'family', name: 'Familia ya Mwinyi' } });
    await addGuest(sms.t, sms.evId, {
      displayName: 'Mchangiaji Mmoja',
      phone: phone(),
      cardKind: 'contribution',
      hasSmartphone: false,
    });
    ctx.sms.sent.length = 0;
    await send(sms.t, sms.evId, 'sms');
    expect(ctx.sms.sent.at(-1)!.body).toMatch(
      /^Familia ya Mwinyi wanakuomba mchango kwa harusi ya Asha & Juma\. Changia hapa: http/,
    );

    const view = (await card(con.cardToken)).body!;
    expect(view).toMatchObject({ cardKind: 'contribution', qrPayload: '', rsvpOpen: false });
    const invView = (await card(inv.cardToken)).body!;
    expect(invView.cardKind).toBe('invitation');
    expect(invView.qrPayload).not.toBe('');
    const rsvp = await api(ctx, 'POST', `/v1/c/${con.cardToken}/rsvp`, {
      body: { attending: true, partySize: 1 },
    });
    expect(rsvp.status).toBe(409);
    expect(rsvp.body?.error.details.reason).toBe('not_applicable');
  });

  it('uses the organiser’s contribution message', async () => {
    const { t, evId } = await setup({
      messages: {
        contributionSms: {
          sw: 'Habari {guest}, tunaomba mchango (lengo {target}) hadi {deadline}: {link}',
        },
      },
      contribution: { deadline: '2027-05-15' },
    });
    await addGuest(t, evId, {
      displayName: 'Mchangiaji Mmoja',
      phone: phone(),
      cardKind: 'contribution',
      hasSmartphone: false,
    });
    ctx.sms.sent.length = 0;
    await send(t, evId);
    expect(ctx.sms.sent.at(-1)!.body).toMatch(
      /^Habari Mchangiaji Mmoja, tunaomba mchango \(lengo TZS 2,000,000\) hadi 15 Mei 2027: http/,
    );
  });

  it('is kept out of the gate, the printed cards and the invitation funnel', async () => {
    const { t, evId } = await setup();
    const inv = await addGuest(t, evId, { displayName: 'Mgeni Mwalikwa', phone: phone() });
    await addGuest(t, evId, {
      displayName: 'Mchangiaji Mmoja',
      phone: phone(),
      cardKind: 'contribution',
    });
    const bundle = await api(ctx, 'GET', `/v1/events/${evId}/gate/bundle`, { token: t });
    expect(bundle.body?.guests.map((g: { id: string }) => g.id)).toEqual([inv.id]);
    const stats = await api(ctx, 'GET', `/v1/events/${evId}/invitations/stats`, { token: t });
    expect(stats.body).toMatchObject({ total: 1, contributionGuests: 1 });
    const filtered = await api(ctx, 'GET', `/v1/events/${evId}/guests?cardKind=contribution`, {
      token: t,
    });
    expect(filtered.body?.items).toHaveLength(1);
    expect(filtered.body?.items[0].displayName).toBe('Mchangiaji Mmoja');
  });

  it('imports a list as contribution cards and can switch a guest’s card type', async () => {
    const { t, evId } = await setup();
    const r = await api(ctx, 'POST', `/v1/events/${evId}/guests/import`, {
      token: t,
      body: {
        csv: `Jina,Simu\nNdugu Mmoja,${phone()}\nNdugu Wawili,${phone()}\n`,
        defaultCardKind: 'contribution',
      },
    });
    expect(r.body).toMatchObject({ created: 2 });
    const list = await api(ctx, 'GET', `/v1/events/${evId}/guests`, { token: t });
    expect(list.body?.items.every((g: { cardKind: string }) => g.cardKind === 'contribution')).toBe(
      true,
    );
    const first = list.body!.items[0];
    const patched = await api(ctx, 'PATCH', `/v1/guests/${first.id}`, {
      token: t,
      body: { cardKind: 'invitation' },
    });
    expect(patched.body?.cardKind).toBe('invitation');
  });
});
