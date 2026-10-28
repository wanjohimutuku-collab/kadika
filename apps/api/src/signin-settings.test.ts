import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { auditLog, signinSettings } from '@harusi/db';
import { SignInSettingsService } from './services/signin-settings';
import { api, createTestContext, loginAsStaff, type TestContext } from './testing/test-app';

const FIREBASE = {
  projectId: 'kadi-sasa-prod',
  apiKey: 'AIzaSyTESTKEY-1234567890abcd',
  appId: '1:123456789:web:abcdef',
};

type Keys = Awaited<ReturnType<typeof generateKeyPair>>;
let google: Keys;
let jwks: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  google = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({
    keys: [{ ...(await exportJWK(google.publicKey)), kid: 'g1', alg: 'RS256' }],
  });
});

let ctx: TestContext;
afterEach(async () => {
  vi.unstubAllGlobals();
  await ctx.close();
});

async function setup(env: Record<string, string> = {}) {
  ctx = await createTestContext({
    firebaseKeys: jwks,
    env: { CORS_EXTRA_ORIGINS: 'https://app.kadisasa.com,https://my.kadisasa.com', ...env },
  });
  const admin = await loginAsStaff(ctx, '0711960001', 'admin', 'Asha Admin');
  return admin.accessToken;
}

const save = (token: string, body: unknown) =>
  api(ctx, 'PUT', '/v1/ops/signin-settings', { token, body });

async function idToken(project: string) {
  const iat = Math.floor(ctx.deps.now().getTime() / 1000) - 5;
  return new SignJWT({
    auth_time: iat,
    phone_number: '+255712480009',
    firebase: { sign_in_provider: 'phone' },
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'g1' })
    .setIssuer(`https://securetoken.google.com/${project}`)
    .setAudience(project)
    .setSubject('fb-uid-9')
    .setIssuedAt(iat)
    .setExpirationTime(iat + 3600)
    .sign(google.privateKey);
}

describe('sign-in settings in /ops (ADR 049)', () => {
  it('starts from the environment and is admin staff only', async () => {
    const token = await setup();
    const v = await api(ctx, 'GET', '/v1/ops/signin-settings', { token });
    expect(v.status).toBe(200);
    expect(v.body).toMatchObject({ provider: 'sms', active: 'sms', source: 'environment' });
    const support = await loginAsStaff(ctx, '0711960002', 'support');
    for (const [method, path] of [
      ['GET', '/v1/ops/signin-settings'],
      ['PUT', '/v1/ops/signin-settings'],
      ['DELETE', '/v1/ops/signin-settings'],
      ['POST', '/v1/ops/signin-settings/test'],
    ] as const) {
      const r = await api(ctx, method, path, {
        token: support.accessToken,
        body: method === 'PUT' ? { provider: 'sms', fields: {} } : undefined,
      });
      expect(r.status, `${method} ${path}`).toBe(403);
    }
  });

  it('switches sign-in to Firebase, stores the config encrypted and masks the API key', async () => {
    const token = await setup();
    const incomplete = await save(token, {
      provider: 'firebase',
      fields: { projectId: FIREBASE.projectId },
    });
    expect(incomplete.status).toBe(400);
    expect(incomplete.body!.error.details.missing).toEqual(['apiKey', 'appId']);

    const r = await save(token, { provider: 'firebase', fields: FIREBASE });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      provider: 'firebase',
      active: 'firebase',
      source: 'database',
      fields: { projectId: FIREBASE.projectId, appId: FIREBASE.appId },
      secrets: { apiKey: '…abcd' },
      updatedBy: 'Asha Admin',
    });
    expect(JSON.stringify(r.body)).not.toContain(FIREBASE.apiKey);
    const [row] = await ctx.db.select().from(signinSettings);
    expect(row!.configEnc).not.toContain(FIREBASE.apiKey);
    expect(row!.configEnc).not.toContain(FIREBASE.projectId);

    // clients follow at once, with the web config the login page needs
    expect((await api(ctx, 'GET', '/v1/auth/config')).body).toEqual({
      otpProvider: 'firebase',
      firebase: { ...FIREBASE, authDomain: `${FIREBASE.projectId}.firebaseapp.com` },
    });
    // no login codes through our SMS route any more
    const sent = ctx.sms.sent.length;
    const otp = await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0712480009' } });
    expect(otp.status).toBe(409);
    expect(ctx.sms.sent).toHaveLength(sent);
    // and tokens are checked against the saved project
    expect(
      (
        await api(ctx, 'POST', '/v1/auth/firebase', {
          body: { idToken: await idToken(FIREBASE.projectId) },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api(ctx, 'POST', '/v1/auth/firebase', {
          body: { idToken: await idToken('another-project') },
        })
      ).status,
    ).toBe(401);

    // the audit trail names what changed, never the values
    const [audit] = await ctx.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'ops.signin.update'));
    expect(audit!.diff).toEqual({
      provider: { from: 'sms', to: 'firebase' },
      changed: ['projectId', 'apiKey', 'appId'],
    });
    expect(JSON.stringify(audit!.diff)).not.toContain(FIREBASE.apiKey);
  });

  it('keeps the saved API key when the field is left empty, and validates the values', async () => {
    const token = await setup();
    await save(token, { provider: 'sms', fields: FIREBASE });
    const kept = await save(token, {
      provider: 'firebase',
      fields: { projectId: FIREBASE.projectId, appId: FIREBASE.appId, apiKey: '' },
    });
    expect(kept.status).toBe(200);
    expect(kept.body!.secrets.apiKey).toBe('…abcd');
    const bad = await save(token, {
      provider: 'firebase',
      fields: { ...FIREBASE, projectId: 'Not A Project!' },
    });
    expect(bad.status).toBe(400);
    expect((await save(token, { provider: 'whatsapp', fields: {} })).status).toBe(400);
  });

  it('can hold the Firebase config while codes still go by SMS', async () => {
    const token = await setup();
    const r = await save(token, { provider: 'sms', fields: FIREBASE });
    expect(r.body).toMatchObject({ provider: 'sms', active: 'sms', secrets: { apiKey: '…abcd' } });
    expect((await api(ctx, 'GET', '/v1/auth/config')).body).toEqual({ otpProvider: 'sms' });
    expect(
      (await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0712480009' } })).status,
    ).toBe(200);
  });

  it('AUTH_FORCE_SMS keeps codes on SMS whatever is saved (break-glass)', async () => {
    const token = await setup({ AUTH_FORCE_SMS: '1' });
    const r = await save(token, { provider: 'firebase', fields: FIREBASE });
    expect(r.body).toMatchObject({ provider: 'firebase', active: 'sms', forcedSms: true });
    expect((await api(ctx, 'GET', '/v1/auth/config')).body).toEqual({ otpProvider: 'sms' });
    expect(
      (await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone: '0712480009' } })).status,
    ).toBe(200);
  });

  it('reset goes back to the environment, and other API instances pick up saves', async () => {
    const token = await setup();
    await save(token, { provider: 'firebase', fields: FIREBASE });
    // another instance: same database, its own memory
    const other = { ...ctx.deps, signIn: undefined };
    await new SignInSettingsService(other).refresh();
    expect(other.signIn).toMatchObject({
      provider: 'firebase',
      firebase: { projectId: FIREBASE.projectId },
    });

    const reset = await api(ctx, 'DELETE', '/v1/ops/signin-settings', { token });
    expect(reset.body).toMatchObject({ provider: 'sms', source: 'environment', secrets: {} });
    expect((await api(ctx, 'GET', '/v1/auth/config')).body).toEqual({ otpProvider: 'sms' });
    await new SignInSettingsService(other).refresh(true);
    expect(other.signIn).toBeUndefined();
  });

  it('tests the saved key with Firebase and lists web hosts missing from the authorized domains', async () => {
    const token = await setup();
    const none = await api(ctx, 'POST', '/v1/ops/signin-settings/test', { token });
    expect(none.body).toMatchObject({ ok: false });
    await save(token, { provider: 'sms', fields: FIREBASE });
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({
        projectId: FIREBASE.projectId,
        authorizedDomains: ['localhost', 'kadi-sasa-prod.firebaseapp.com', 'app.kadisasa.com'],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const r = await api(ctx, 'POST', '/v1/ops/signin-settings/test', { token });
    expect(fetchMock.mock.calls[0]![0]).toContain(
      'identitytoolkit.googleapis.com/v1/projects?key=',
    );
    expect(r.body).toMatchObject({
      ok: false,
      projectId: FIREBASE.projectId,
      missingDomains: ['my.kadisasa.com'],
    });
    expect(r.body!.error).toContain('my.kadisasa.com');

    fetchMock.mockImplementation(async () =>
      Response.json({ projectId: 'someone-else', authorizedDomains: [] }),
    );
    const wrong = await api(ctx, 'POST', '/v1/ops/signin-settings/test', { token });
    expect(wrong.body!.error).toContain('someone-else');

    fetchMock.mockImplementation(async () =>
      Response.json({ error: { message: 'API key not valid.' } }, { status: 400 }),
    );
    const rejected = await api(ctx, 'POST', '/v1/ops/signin-settings/test', { token });
    expect(rejected.body).toMatchObject({ ok: false, error: 'API key not valid.' });
  });
});
