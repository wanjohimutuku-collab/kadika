import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { refreshTokens, users } from '@harusi/db';
import { loadConfig } from './config';
import { api, createTestContext, totpNow, type TestContext } from './testing/test-app';

const PROJECT = 'kadi-sasa-test';
const FIREBASE_ENV = { AUTH_OTP_PROVIDER: 'firebase', FIREBASE_PROJECT_ID: PROJECT };

type Keys = Awaited<ReturnType<typeof generateKeyPair>>;
let google: Keys; // stands in for Google's securetoken signing key
let stranger: Keys; // a key Google never published
let jwks: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  google = await generateKeyPair('RS256');
  stranger = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({
    keys: [{ ...(await exportJWK(google.publicKey)), kid: 'g1', alg: 'RS256', use: 'sig' }],
  });
});

let ctx: TestContext;
beforeEach(async () => {
  ctx = await createTestContext({ env: FIREBASE_ENV, firebaseKeys: jwks });
});
afterEach(() => ctx.close());

/** A Firebase ID token as Firebase issues it after a phone sign-in, on the test clock. */
async function idToken(
  over: { claims?: JWTPayload; project?: string; ageS?: number; key?: Keys; kid?: string } = {},
) {
  const nowS = Math.floor(ctx.deps.now().getTime() / 1000);
  const issuedAt = nowS - (over.ageS ?? 5);
  const project = over.project ?? PROJECT;
  return new SignJWT({
    auth_time: issuedAt,
    user_id: 'fb-uid-1',
    phone_number: '+255712480001',
    firebase: { identities: { phone: ['+255712480001'] }, sign_in_provider: 'phone' },
    ...over.claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: over.kid ?? 'g1' })
    .setIssuer(`https://securetoken.google.com/${project}`)
    .setAudience(project)
    .setSubject('fb-uid-1')
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 3600)
    .sign((over.key ?? google).privateKey);
}

const signIn = async (token: string) =>
  api(ctx, 'POST', '/v1/auth/firebase', { body: { idToken: token } });

describe('Firebase phone sign-in (ADR 048)', () => {
  it('turns a valid ID token into our own session for the verified phone', async () => {
    const r = await signIn(await idToken());
    expect(r.status).toBe(200);
    expect(r.body!.user.phoneE164).toBe('+255712480001');
    expect(r.body!.accessToken).toEqual(expect.any(String));
    const me = await api(ctx, 'GET', '/v1/me', { token: r.body!.accessToken });
    expect(me.status).toBe(200);
    // the refresh token works like one from the SMS code
    const refreshed = await api(ctx, 'POST', '/v1/auth/refresh', {
      body: { refreshToken: r.body!.refreshToken },
    });
    expect(refreshed.status).toBe(200);
    // signing in again finds the same account
    const again = await signIn(await idToken());
    expect(again.body!.user.id).toBe(r.body!.user.id);
  });

  it('refuses a token for another Firebase project', async () => {
    const r = await signIn(await idToken({ project: 'someone-elses-app' }));
    expect(r.status).toBe(401);
    expect(r.body!.error.details.reason).toBe('wrong_project');
  });

  it('refuses an expired token', async () => {
    const token = await idToken();
    ctx.clock.now += 2 * 3_600_000;
    const r = await signIn(token);
    expect(r.status).toBe(401);
    expect(r.body!.error.details.reason).toBe('expired');
  });

  it('refuses a sign-in older than ten minutes even while the token is still valid', async () => {
    const r = await signIn(await idToken({ ageS: 20 * 60 }));
    expect(r.status).toBe(401);
    expect(r.body!.error.details.reason).toBe('expired');
  });

  it('refuses a token without a verified phone number', async () => {
    const anonymous = await idToken({
      claims: { phone_number: undefined, firebase: { sign_in_provider: 'anonymous' } },
    });
    const r = await signIn(anonymous);
    expect(r.status).toBe(401);
    expect(r.body!.error.details.reason).toBe('phone_unverified');
    // an email sign-in that carries a phone claim is not a phone verification either
    const email = await idToken({ claims: { firebase: { sign_in_provider: 'password' } } });
    expect((await signIn(email)).body!.error.details.reason).toBe('phone_unverified');
    expect(await ctx.db.select().from(users)).toHaveLength(0);
  });

  it('refuses tokens not signed by Google and garbage', async () => {
    const forged = await signIn(await idToken({ key: stranger }));
    expect(forged.status).toBe(401);
    expect(forged.body!.error.details.reason).toBe('invalid_token');
    const unknownKid = await signIn(await idToken({ kid: 'nope' }));
    expect(unknownKid.status).toBe(401);
    expect((await signIn('x'.repeat(40))).status).toBe(401);
    expect((await signIn('short')).status).toBe(400);
  });

  it('still asks staff for the authenticator code and gives no access token before it', async () => {
    const first = await signIn(await idToken());
    await ctx.db
      .update(users)
      .set({ roleGlobal: 'admin', staffRole: 'admin' })
      .where(eq(users.id, first.body!.user.id));
    const tokensBefore = (await ctx.db.select().from(refreshTokens)).length;
    const r = await signIn(await idToken());
    expect(r.status).toBe(200);
    expect(r.body!.accessToken).toBeUndefined();
    expect(r.body!.refreshToken).toBeUndefined();
    expect(r.body!.secondFactor).toMatchObject({ enrolled: false, challenge: expect.any(String) });
    expect(await ctx.db.select().from(refreshTokens)).toHaveLength(tokensBefore);
    // the challenge leads on to the usual second factor
    const { challenge } = r.body!.secondFactor as { challenge: string };
    const enrol = await api(ctx, 'POST', '/v1/auth/staff/totp/enrol', { body: { challenge } });
    const done = await api(ctx, 'POST', '/v1/auth/staff/totp/verify', {
      body: { challenge, code: totpNow(ctx, enrol.body!.secret as string) },
    });
    expect(done.status).toBe(200);
    expect(done.body!.accessToken).toEqual(expect.any(String));
  });

  it('refuses suspended accounts', async () => {
    const first = await signIn(await idToken());
    await ctx.db
      .update(users)
      .set({ status: 'suspended' })
      .where(eq(users.id, first.body!.user.id));
    const r = await signIn(await idToken());
    expect(r.status).toBe(403);
    expect(r.body!.error.details.reason).toBe('suspended');
  });

  it('refuses numbers from a country that is not enabled, as the SMS code does', async () => {
    const ke = await signIn(
      await idToken({
        claims: { phone_number: '+254712480001', firebase: { sign_in_provider: 'phone' } },
      }),
    );
    expect(ke.status).toBe(400);
  });

  it('sends no login code through our SMS routes and tells clients to use Firebase', async () => {
    const cfg = await api(ctx, 'GET', '/v1/auth/config');
    expect(cfg.body).toEqual({
      otpProvider: 'firebase',
      firebase: {
        projectId: PROJECT,
        apiKey: null,
        authDomain: `${PROJECT}.firebaseapp.com`,
        appId: null,
      },
    });
    const r = await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0712480001' } });
    expect(r.status).toBe(409);
    expect(r.body!.error.details.reason).toBe('use_firebase');
    expect(ctx.sms.sent).toHaveLength(0);
  });
});

describe('sign-in provider switch', () => {
  it('defaults to our own SMS code, with the Firebase endpoint off', async () => {
    const sms = await createTestContext();
    try {
      expect((await api(sms, 'GET', '/v1/auth/config')).body).toEqual({ otpProvider: 'sms' });
      const r = await api(sms, 'POST', '/v1/auth/firebase', { body: { idToken: 'x'.repeat(40) } });
      expect(r.status).toBe(503);
      expect(
        (await api(sms, 'POST', '/v1/auth/otp/request', { body: { phone: '0712480001' } })).status,
      ).toBe(200);
    } finally {
      await sms.close();
    }
  });

  it('will not start as firebase without a project', () => {
    const base = { DATABASE_URL: 'x', JWT_SECRET: 'test-secret-at-least-16', KEY_ENC_SECRET: 'k' };
    expect(() => loadConfig({ ...base, AUTH_OTP_PROVIDER: 'firebase' })).toThrow(
      /FIREBASE_PROJECT_ID/,
    );
    expect(() => loadConfig({ ...base, AUTH_OTP_PROVIDER: 'whatsapp' })).toThrow();
    expect(loadConfig(base).authOtpProvider).toBe('sms');
  });
});
