import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { auditLog, refreshTokens, users } from '@harusi/db';
import { createHttpRepository, memoryTokenStore } from '@harusi/api-client';
import { signAccessToken } from './auth/tokens';
import { OpsService } from './services/ops';
import {
  api,
  createTestContext,
  loginAs,
  loginAsStaff,
  totpNow,
  type TestContext,
} from './testing/test-app';

let ctx: TestContext;
beforeEach(async () => {
  ctx = await createTestContext();
});
afterEach(() => ctx.close());

/** Staff account, SMS code accepted: returns the challenge (no authenticator set up yet). */
async function staffChallenge(phone = '0711950001', staffRole: 'admin' | 'support' = 'admin') {
  const first = await loginAs(ctx, phone);
  await ctx.db
    .update(users)
    .set({ roleGlobal: 'admin', staffRole })
    .where(eq(users.id, first.user.id));
  ctx.clock.now += 31_000; // the SMS resend wait
  const again = (await loginAs(ctx, phone)) as unknown as {
    secondFactor: { challenge: string; enrolled: boolean; expiresAt: string };
    accessToken?: string;
    refreshToken?: string;
    user: { id: string };
  };
  return again;
}

const enrol = async (challenge: string) =>
  (await api(ctx, 'POST', '/v1/auth/staff/totp/enrol', { body: { challenge } })).body!
    .secret as string;
const verify = (challenge: string, code: string) =>
  api(ctx, 'POST', '/v1/auth/staff/totp/verify', { body: { challenge, code } });
/** Moves past the per-IP limit window between bursts of attempts. */
const nextMinute = () => void (ctx.clock.now += 61_000);

/** A code that is wrong for this secret right now. */
function wrongCode(secret: string) {
  const good = new Set([-1, 0, 1].map((o) => totpNow(ctx, secret, o)));
  for (let n = 0; ; n++) {
    const c = String(n).padStart(6, '0');
    if (!good.has(c)) return c;
  }
}

/** Every /v1/ops route the app registers, with placeholder params. */
function opsRoutes() {
  const seen = new Set<string>();
  return ctx.app.routes
    .filter((r) => r.path.startsWith('/v1/ops/') && r.method !== 'ALL')
    .map((r) => ({
      method: r.method,
      path: r.path
        .replace(':id', '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b')
        .replace(':route', 'sms_tz'),
    }))
    .filter((r) => !seen.has(`${r.method} ${r.path}`) && !!seen.add(`${r.method} ${r.path}`));
}

describe('staff second factor (ADR 040)', () => {
  it('gives staff only a challenge after the SMS code, which is not an access token', async () => {
    const r = await staffChallenge();
    expect(r.accessToken).toBeUndefined();
    expect(r.refreshToken).toBeUndefined();
    expect(r.secondFactor.enrolled).toBe(false);
    expect(await ctx.db.select().from(refreshTokens)).toHaveLength(1); // the customer login only
    for (const path of ['/v1/me', '/v1/ops/overview', '/v1/events'])
      expect((await api(ctx, 'GET', path, { token: r.secondFactor.challenge })).status).toBe(401);
  });

  it('refuses staff without the second factor on every /v1/ops route', async () => {
    const r = await staffChallenge();
    // A token from before ADR 040 (or forged without the claim) has no `mfa`.
    const noMfa = await signAccessToken(ctx.deps, { userId: r.user.id, roleGlobal: 'admin' });
    const routes = opsRoutes();
    expect(routes.length).toBeGreaterThan(20);
    for (const { method, path } of routes) {
      const res = await api(ctx, method, path, {
        token: noMfa,
        body: method === 'GET' ? undefined : {},
      });
      expect(res.status, `${method} ${path}`).toBe(403);
      expect(res.body!.error.details.reason, `${method} ${path}`).toBe('second_factor_required');
    }
    // the guards themselves refuse too, not only the route middleware
    await expect(
      new OpsService(ctx.deps).overview({ userId: r.user.id, mfa: false }),
    ).rejects.toMatchObject({ code: 'forbidden', details: { reason: 'second_factor_required' } });

    // and the same routes open up once the authenticator code is given
    nextMinute();
    const secret = await enrol(r.secondFactor.challenge);
    const ok = await verify(r.secondFactor.challenge, totpNow(ctx, secret));
    expect(ok.status).toBe(200);
    for (const { method, path } of routes.filter((x) => x.method === 'GET')) {
      const res = await api(ctx, method, path, { token: ok.body!.accessToken });
      expect(res.body?.error?.details?.reason, `${method} ${path}`).not.toBe(
        'second_factor_required',
      );
    }
    expect(
      (await api(ctx, 'GET', '/v1/ops/overview', { token: ok.body!.accessToken })).status,
    ).toBe(200);
  });

  it('enrols with a QR secret stored encrypted, then signs in with the authenticator', async () => {
    const r = await staffChallenge();
    const res = await api(ctx, 'POST', '/v1/auth/staff/totp/enrol', {
      body: { challenge: r.secondFactor.challenge },
    });
    expect(res.status).toBe(200);
    expect(res.body!.otpauthUrl).toMatch(/^otpauth:\/\/totp\/Kadi%20Sasa:/);
    const secret = res.body!.secret as string;
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const [row] = await ctx.db.select().from(users).where(eq(users.id, r.user.id));
    expect(row!.staffTotpSecret).toBeTruthy();
    expect(row!.staffTotpSecret).not.toContain(secret);
    expect(row!.staffTotpEnrolledAt).toBeNull();

    const ok = await verify(r.secondFactor.challenge, totpNow(ctx, secret));
    expect(ok.status).toBe(200);
    expect(ok.body!.accessToken).toBeTruthy();
    const [after] = await ctx.db.select().from(users).where(eq(users.id, r.user.id));
    expect(after!.staffTotpEnrolledAt).not.toBeNull();
    expect(
      await ctx.db.select().from(auditLog).where(eq(auditLog.action, 'staff.totp_enrolled')),
    ).toHaveLength(1);

    // once enrolled the secret cannot be fetched again, and the next login says so
    expect(
      (
        await api(ctx, 'POST', '/v1/auth/staff/totp/enrol', {
          body: { challenge: r.secondFactor.challenge },
        })
      ).status,
    ).toBe(409);
    ctx.clock.now += 31_000;
    const next = (await loginAs(ctx, '0711950001')) as unknown as {
      secondFactor: { challenge: string; enrolled: boolean };
    };
    expect(next.secondFactor.enrolled).toBe(true);
    expect((await verify(next.secondFactor.challenge, totpNow(ctx, secret))).status).toBe(200);
  });

  it('refuses a wrong code, a reused code, and locks after five wrong tries', async () => {
    const r = await staffChallenge();
    const ch = r.secondFactor.challenge;
    const secret = await enrol(ch);
    expect((await verify(ch, totpNow(ctx, secret))).status).toBe(200);
    // the same code again (same 30-second step) is a replay
    const replay = await verify(ch, totpNow(ctx, secret));
    expect(replay.status).toBe(400);
    expect(replay.body!.error.details.reason).toBe('wrong_code');

    // The replay counted as the first wrong try; four more lock the account.
    ctx.clock.now += 30_000;
    nextMinute();
    const bad = wrongCode(secret);
    for (let left = 3; left >= 1; left--) {
      const res = await verify(ch, bad);
      expect(res.status).toBe(400);
      expect(res.body!.error.details).toMatchObject({ reason: 'wrong_code', attemptsLeft: left });
    }
    const locked = await verify(ch, bad);
    expect(locked.status).toBe(423);
    expect(locked.body!.error.code).toBe('locked');
    // a right code, or a fresh SMS login, does not get round the lock
    expect((await verify(ch, totpNow(ctx, secret))).status).toBe(423);
    nextMinute();
    const again = (await loginAs(ctx, '0711950001')) as unknown as {
      secondFactor: { challenge: string };
    };
    expect((await verify(again.secondFactor.challenge, totpNow(ctx, secret))).status).toBe(423);
    expect(
      await ctx.db.select().from(auditLog).where(eq(auditLog.action, 'staff.totp_locked')),
    ).toHaveLength(1);

    // the lock ends after 15 minutes; the challenge has expired by then, so sign in again
    ctx.clock.now += 15 * 60_000;
    expect((await verify(again.secondFactor.challenge, totpNow(ctx, secret))).status).toBe(401);
    const fresh = (await loginAs(ctx, '0711950001')) as unknown as {
      secondFactor: { challenge: string };
    };
    expect((await verify(fresh.secondFactor.challenge, totpNow(ctx, secret))).status).toBe(200);
  });

  it('counts a wrong first code while enrolling the same way', async () => {
    const r = await staffChallenge();
    const secret = await enrol(r.secondFactor.challenge);
    const res = await verify(r.secondFactor.challenge, wrongCode(secret));
    expect(res.body!.error.details).toMatchObject({ reason: 'wrong_code', attemptsLeft: 4 });
    const [row] = await ctx.db.select().from(users).where(eq(users.id, r.user.id));
    expect(row!.staffTotpEnrolledAt).toBeNull();
  });

  it('rate-limits the second-factor endpoint per client', async () => {
    const r = await staffChallenge();
    const secret = await enrol(r.secondFactor.challenge);
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++)
      statuses.push((await verify(r.secondFactor.challenge, wrongCode(secret))).status);
    expect(statuses.at(-1)).toBe(429);
  });

  it('keeps the second factor across refresh, and refuses staff refresh tokens without it', async () => {
    const s = await loginAsStaff(ctx, '0711950002', 'support');
    const refreshed = await api(ctx, 'POST', '/v1/auth/refresh', {
      body: { refreshToken: s.refreshToken },
    });
    expect(refreshed.status).toBe(200);
    expect(
      (await api(ctx, 'GET', '/v1/ops/overview', { token: refreshed.body!.accessToken })).status,
    ).toBe(200);

    // A customer session from before they were made staff cannot be refreshed into staff access.
    const c = await loginAs(ctx, '0711950003');
    await ctx.db.update(users).set({ roleGlobal: 'admin' }).where(eq(users.id, c.user.id));
    const res = await api(ctx, 'POST', '/v1/auth/refresh', {
      body: { refreshToken: c.refreshToken },
    });
    expect(res.status).toBe(401);
    expect(res.body!.error.details.reason).toBe('second_factor_required');
  });

  it('works end to end through the HTTP repository the web app uses', async () => {
    await loginAs(ctx, '0711950004');
    await ctx.db
      .update(users)
      .set({ roleGlobal: 'admin', staffRole: 'admin' })
      .where(eq(users.phoneE164, '+255711950004'));
    ctx.clock.now += 31_000;
    const tokens = memoryTokenStore();
    const repo = createHttpRepository('http://api.test', {
      tokens,
      fetchImpl: ((url: string, init?: RequestInit) =>
        ctx.app.request(url.replace('http://api.test', ''), init)) as typeof fetch,
    });
    await repo.requestOtp('+255711950004');
    const code = /(\d{6})/.exec(ctx.sms.lastTo('+255711950004') ?? '')![1]!;
    const first = await repo.verifyOtp('+255711950004', code);
    expect(first.needsSecondFactor).toBe(true);
    expect(first.secondFactorEnrolled).toBe(false);
    expect(tokens.get()).toBeNull();
    expect(await repo.getSession()).toBeNull();

    const setup = await repo.startStaffEnrolment();
    expect(setup.otpauthUrl).toContain(setup.secret);
    await expect(repo.verifyStaffSecondFactor(wrongCode(setup.secret))).rejects.toMatchObject({
      code: 'validation',
    });
    const session = await repo.verifyStaffSecondFactor(totpNow(ctx, setup.secret));
    expect(session.user.roleGlobal).toBe('admin');
    expect(session.needsSecondFactor).toBeFalsy();
    expect(tokens.get()).not.toBeNull();
    expect((await repo.getSession())?.user.staffRole).toBe('admin');
    expect((await repo.opsOverview()).events).toBeDefined();
  });
});
