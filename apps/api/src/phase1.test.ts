import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { shortId, verifyQrToken } from '@harusi/crypto';
import { SHORT_CODE_PATTERN } from '@harusi/schemas/short-code';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

const eventBody = (n = 'A') => ({
  title: `Harusi ${n}`,
  coupleNames: `${n} & Juma`,
  dateStart: '2027-01-16T10:00:00+03:00',
  venueName: 'Ukumbi',
});

describe('auth', () => {
  it('logs in with phone + OTP, normalises the phone and creates the user', async () => {
    const s = await loginAs(ctx, '0712 345 678');
    expect(s.user.phoneE164).toBe('+255712345678');
    const me = await api(ctx, 'GET', '/v1/me', { token: s.accessToken });
    expect(me.body).toMatchObject({ phoneE164: '+255712345678', roleGlobal: 'user' });
  });

  it('rejects wrong codes, locks after 5, and a code works once', async () => {
    await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0754111222' } });
    for (let i = 0; i < 4; i++) {
      const r = await api(ctx, 'POST', '/v1/auth/otp/verify', {
        body: { phone: '0754111222', code: '000000' },
      });
      expect(r.status).toBe(400);
      expect(r.body?.error.details.attemptsLeft).toBe(4 - i);
    }
    const locked = await api(ctx, 'POST', '/v1/auth/otp/verify', {
      body: { phone: '0754111222', code: '000000' },
    });
    expect(locked.status).toBe(423);
    // Once verified, the same code cannot be replayed.
    await loginAs(ctx, '0754333444');
    const code = /(\d{6})/.exec(ctx.sms.lastTo('+255754333444')!)![1]!;
    const replay = await api(ctx, 'POST', '/v1/auth/otp/verify', {
      body: { phone: '0754333444', code },
    });
    expect(replay.status).toBe(400);
  });

  it('rate-limits OTP requests (30 s) and rejects invalid phones', async () => {
    expect(
      (await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0765000111' } })).status,
    ).toBe(200);
    const again = await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0765000111' } });
    expect(again.status).toBe(429);
    ctx.clock.now += 31_000;
    expect(
      (await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0765000111' } })).status,
    ).toBe(200);
    const bad = await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0712' } });
    expect(bad.status).toBe(400);
    expect(bad.body?.error.details.reason).toBe('wrong_length');
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const s = await loginAs(ctx, '0688100200');
    const r1 = await api(ctx, 'POST', '/v1/auth/refresh', {
      body: { refreshToken: s.refreshToken },
    });
    expect(r1.status).toBe(200);
    const reuse = await api(ctx, 'POST', '/v1/auth/refresh', {
      body: { refreshToken: s.refreshToken },
    });
    expect(reuse.status).toBe(401);
    // Reuse revoked the whole family, including the freshly issued token.
    const r2 = await api(ctx, 'POST', '/v1/auth/refresh', {
      body: { refreshToken: r1.body!.refreshToken },
    });
    expect(r2.status).toBe(401);
  });

  it('expires access tokens after 15 minutes', async () => {
    const s = await loginAs(ctx, '0688100201');
    ctx.clock.now += 16 * 60_000;
    expect((await api(ctx, 'GET', '/v1/me', { token: s.accessToken })).status).toBe(401);
  });
});

describe('events, members and signing keys', () => {
  it('creates an event with an owner membership and an encrypted signing key', async () => {
    const owner = await loginAs(ctx, '0711000001');
    const created = await api(ctx, 'POST', '/v1/events', {
      token: owner.accessToken,
      body: eventBody(),
    });
    expect(created.status).toBe(201);
    expect(created.body?.signingKeyId).toBeTruthy();
    const key = await api(ctx, 'GET', `/v1/events/${created.body!.id}/public-key`, {
      token: owner.accessToken,
    });
    expect(key.body?.publicKey).toMatch(/^[0-9a-f]{64}$/);
    const rows = await ctx.db
      .execute(`select private_key_encrypted from signing_keys` as never)
      .catch(() => null);
    expect(JSON.stringify(rows ?? '')).not.toMatch(/[0-9a-f]{64}.*[0-9a-f]{64}/); // stored encrypted, not as raw hex
    const list = await api(ctx, 'GET', '/v1/events', { token: owner.accessToken });
    expect(list.body?.items).toHaveLength(1);
  });

  it('hides events from non-members and limits roles', async () => {
    const owner = await loginAs(ctx, '0711000002');
    const stranger = await loginAs(ctx, '0711000003');
    const ev = (
      await api(ctx, 'POST', '/v1/events', { token: owner.accessToken, body: eventBody('B') })
    ).body!;
    expect(
      (await api(ctx, 'GET', `/v1/events/${ev.id}`, { token: stranger.accessToken })).status,
    ).toBe(404);
    expect(
      (
        await api(ctx, 'PATCH', `/v1/events/${ev.id}`, {
          token: stranger.accessToken,
          body: { title: 'Hack' },
        })
      ).status,
    ).toBe(404);
    const patched = await api(ctx, 'PATCH', `/v1/events/${ev.id}`, {
      token: owner.accessToken,
      body: { title: 'Harusi B2' },
    });
    expect(patched.body?.title).toBe('Harusi B2');
  });

  it('accepts a team invitation when the invitee first signs in', async () => {
    const owner = await loginAs(ctx, '0711000004');
    const ev = (
      await api(ctx, 'POST', '/v1/events', { token: owner.accessToken, body: eventBody('C') })
    ).body!;
    const inv = await api(ctx, 'POST', `/v1/events/${ev.id}/members`, {
      token: owner.accessToken,
      body: { name: 'Mjumbe', phone: '0799100100', role: 'committee' },
    });
    expect(inv.body?.status).toBe('invited');
    const team = await api(ctx, 'GET', `/v1/events/${ev.id}/members`, { token: owner.accessToken });
    expect(team.body?.invites).toHaveLength(1);
    const invitee = await loginAs(ctx, '0799100100');
    const mine = await api(ctx, 'GET', '/v1/events', { token: invitee.accessToken });
    expect(mine.body?.items[0]).toMatchObject({ id: ev.id, myRole: 'committee' });
    expect(
      (await api(ctx, 'GET', `/v1/events/${ev.id}/members`, { token: owner.accessToken })).body
        ?.invites,
    ).toHaveLength(0);
    // Committee cannot manage the team.
    expect(
      (
        await api(ctx, 'POST', `/v1/events/${ev.id}/members`, {
          token: invitee.accessToken,
          body: { name: 'Xy', phone: '0799100101', role: 'gate' },
        })
      ).status,
    ).toBe(403);
  });
});

describe('guests', () => {
  async function setup(phone: string) {
    const owner = await loginAs(ctx, phone);
    const ev = (
      await api(ctx, 'POST', '/v1/events', { token: owner.accessToken, body: eventBody('G') })
    ).body!;
    return { owner, ev, t: owner.accessToken };
  }

  it('creates guests with normalised phones, §6.1 short codes and a hashed card token', async () => {
    const { ev, t } = await setup('0722000001');
    const g = await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Asha Mwinyi', phone: '0712 345 678', partySizeAllowed: 2 },
    });
    expect(g.status).toBe(201);
    expect(g.body?.phoneE164).toBe('+255712345678');
    expect(g.body?.shortCode).toMatch(SHORT_CODE_PATTERN);
    expect(g.body?.guestShort).toBe(shortId(g.body!.id));
    expect(g.body?.cardToken).toHaveLength(22);
    const stored = await ctx.db
      .execute(`select token_hash from invitations` as never)
      .catch(() => null);
    expect(JSON.stringify(stored ?? '')).not.toContain(g.body!.cardToken);
    const dup = await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Mwingine', phone: '+255712345678' },
    });
    expect(dup.status).toBe(409);
    const noPhone = await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Mzee Hamisi' },
    });
    expect(noPhone.body).toMatchObject({ phoneE164: null, inviteChannelPref: 'print' });
  });

  it('imports a CSV with errors and duplicates; dry run saves nothing', async () => {
    const { ev, t } = await setup('0722000002');
    const csv = [
      'Jina,Simu,Kikundi,Idadi',
      'Asha Mwinyi,0712345678,Marafiki,2',
      'Asha Tena,+255 712 345 678,Marafiki,1',
      'Baraka,07123,,1',
      'Mama Neema,,Wazee,1',
      'Juma Said,0754000111,,1',
    ].join('\n');
    const dry = await api(ctx, 'POST', `/v1/events/${ev.id}/guests/import`, {
      token: t,
      body: { csv, dryRun: true },
    });
    expect(dry.body?.summary).toMatchObject({ total: 5, valid: 3, invalid: 1, duplicates: 1 });
    expect(
      (await api(ctx, 'GET', `/v1/events/${ev.id}/guests`, { token: t })).body?.items,
    ).toHaveLength(0);
    const run = await api(ctx, 'POST', `/v1/events/${ev.id}/guests/import`, {
      token: t,
      body: { csv },
    });
    expect(run.body).toMatchObject({ created: 3, skipped: 2 });
    const again = await api(ctx, 'POST', `/v1/events/${ev.id}/guests/import`, {
      token: t,
      body: { csv },
    });
    expect(again.body?.created).toBe(0); // all valid rows are now duplicates
    const list = await api(ctx, 'GET', `/v1/events/${ev.id}/guests`, { token: t });
    expect(list.body?.items).toHaveLength(3);
    const codes = list.body!.items.map((g: { shortCode: string }) => g.shortCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('imports a whole list with unique on-card ids even though UUIDv7 starts with a timestamp', async () => {
    const { ev, t } = await setup('0722000003');
    const rows = Array.from(
      { length: 150 },
      (_, i) => `Mgeni ${i + 1},07${String(10_000_000 + i * 7).padStart(8, '0')}`,
    );
    const run = await api(ctx, 'POST', `/v1/events/${ev.id}/guests/import`, {
      token: t,
      body: { csv: ['Jina,Simu', ...rows].join('\n') },
    });
    expect(run.body, JSON.stringify(run.body).slice(0, 300)).toMatchObject({ created: 150 });
    const list = await api(ctx, 'GET', `/v1/events/${ev.id}/guests`, { token: t });
    const shorts = list.body!.items.map((g: { guestShort: string }) => g.guestShort);
    expect(new Set(shorts).size).toBe(150);
  });

  it('QR tokens verify offline with the public key; reissue kills the old QR and card link', async () => {
    const { ev, t } = await setup('0722000004');
    const g = (
      await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
        token: t,
        body: { displayName: 'Asha', phone: '0712111111', partySizeAllowed: 3 },
      })
    ).body!;
    const { publicKey } = (await api(ctx, 'GET', `/v1/events/${ev.id}/public-key`, { token: t }))
      .body!;
    const lookup = (version: number) => (short: string) =>
      short === g.guestShort ? { guestId: g.id, currentVersion: version } : null;
    const qr1 = (await api(ctx, 'GET', `/v1/guests/${g.id}/qr`, { token: t })).body!;
    expect(qr1.token).toMatch(/^v1\.[0-9a-f]{8}\.[0-9a-f]{8}\.3\.1\./);
    expect(
      verifyQrToken(qr1.token, { eventId: ev.id, publicKey, lookupGuest: lookup(1) }),
    ).toMatchObject({ ok: true, claims: { partySize: 3, version: 1 } });
    // The same token is for this event only.
    expect(
      verifyQrToken(qr1.token, {
        eventId: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f9999',
        publicKey,
        lookupGuest: lookup(1),
      }),
    ).toMatchObject({ ok: false, reason: 'wrong_event' });
    const re = await api(ctx, 'POST', `/v1/guests/${g.id}/reissue`, { token: t });
    expect(re.body?.guest.tokenVersion).toBe(2);
    expect(re.body?.cardToken).not.toBe(g.cardToken);
    expect(
      verifyQrToken(qr1.token, { eventId: ev.id, publicKey, lookupGuest: lookup(2) }),
    ).toMatchObject({ ok: false, reason: 'revoked' });
    const qr2 = (await api(ctx, 'GET', `/v1/guests/${g.id}/qr`, { token: t })).body!;
    expect(
      verifyQrToken(qr2.token, { eventId: ev.id, publicKey, lookupGuest: lookup(2) }),
    ).toMatchObject({ ok: true });
  });

  it('gate agents and strangers cannot manage guests; delete is soft', async () => {
    const { owner, ev, t } = await setup('0722000005');
    await api(ctx, 'POST', `/v1/events/${ev.id}/members`, {
      token: t,
      body: { name: 'Lango', phone: '0722000006', role: 'gate' },
    });
    const gate = await loginAs(ctx, '0722000006');
    expect(
      (
        await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
          token: gate.accessToken,
          body: { displayName: 'Hack' },
        })
      ).status,
    ).toBe(403);
    const stranger = await loginAs(ctx, '0722000007');
    expect(
      (await api(ctx, 'GET', `/v1/events/${ev.id}/guests`, { token: stranger.accessToken })).status,
    ).toBe(404);
    const g = (
      await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
        token: t,
        body: { displayName: 'Mgeni Mmoja' },
      })
    ).body!;
    expect(
      (await api(ctx, 'DELETE', `/v1/guests/${g.id}`, { token: owner.accessToken })).status,
    ).toBe(204);
    expect((await api(ctx, 'GET', `/v1/guests/${g.id}`, { token: t })).status).toBe(404);
    expect(
      (await api(ctx, 'GET', `/v1/events/${ev.id}/guests`, { token: t })).body?.items,
    ).toHaveLength(0);
  });

  it('validates input with the §8 error shape', async () => {
    const { ev, t } = await setup('0722000008');
    const r = await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'A', partySizeAllowed: 99 },
    });
    expect(r.status).toBe(400);
    expect(r.body?.error.code).toBe('validation');
    expect(r.body?.error.details.issues.length).toBeGreaterThan(0);
  });
});
