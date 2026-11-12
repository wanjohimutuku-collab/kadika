import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './testing/test-app';

const CONSOLE = 'https://app.kadisasa.com';
const STAFF = 'https://my.kadisasa.com';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext({ env: { CORS_ORIGINS: `${CONSOLE},${STAFF}` } });
});
afterAll(() => ctx.close());

/** A browser on `origin`: sends the cookie-session header and whatever cookies it holds. */
function browser(origin: string) {
  const jar = new Map<string, string>();
  return {
    jar,
    async post(path: string, body: unknown, cookieSession = true) {
      const res = await ctx.app.request(path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin,
          ...(cookieSession ? { 'x-session-transport': 'cookie' } : {}),
          ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        },
        body: JSON.stringify(body),
      });
      const set = res.headers.getSetCookie();
      for (const line of set) {
        const [pair] = line.split(';');
        const [name, value = ''] = pair!.split('=');
        if (value && !/max-age=0/i.test(line)) jar.set(name!, value);
        else jar.delete(name!);
      }
      return { status: res.status, body: (await res.json()) as Record<string, unknown>, set };
    },
  };
}

async function signIn(b: ReturnType<typeof browser>, phone: string, e164: string) {
  await b.post('/v1/auth/otp/request', { phone }, false);
  const code = /(\d{6})/.exec(ctx.sms.lastTo(e164)!)![1]!;
  return b.post('/v1/auth/otp/verify', { phone, code });
}

describe('cookie sessions for the web app (security review M-05)', () => {
  it('keeps the refresh token out of the body, in an HttpOnly cookie scoped to /v1/auth', async () => {
    const b = browser(CONSOLE);
    const login = await signIn(b, '0713100001', '+255713100001');
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
    expect(login.body.refreshToken).toBeNull();
    expect(login.set).toHaveLength(1);
    const cookie = login.set[0]!;
    expect(cookie).toMatch(/^hp_rt_[0-9a-f]{12}=/);
    for (const attr of [
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/v1/auth',
      'Max-Age=2592000',
    ])
      expect(cookie).toContain(attr);
    expect(JSON.stringify(login.body)).not.toContain([...b.jar.values()][0]);
  });

  it('refreshes and rotates from the cookie alone, and signs out by clearing it', async () => {
    const b = browser(CONSOLE);
    await signIn(b, '0713100002', '+255713100002');
    const first = [...b.jar.values()][0]!;
    const r = await b.post('/v1/auth/refresh', {});
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeTruthy();
    expect(r.body.refreshToken).toBeNull();
    const second = [...b.jar.values()][0]!;
    expect(second).not.toBe(first);

    const out = await b.post('/v1/auth/logout', {});
    expect(out.status).toBe(200);
    expect(b.jar.size).toBe(0);
    // the token it held is revoked on the server too, not just dropped by the browser
    const replay = await ctx.app.request('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: second }),
    });
    expect(replay.status).toBe(401);
    expect((await b.post('/v1/auth/refresh', {})).status).toBe(401);
  });

  it('gives each web origin its own cookie, so staff and console sessions never mix', async () => {
    const consoleTab = browser(CONSOLE);
    const staffTab = browser(STAFF);
    await signIn(consoleTab, '0713100003', '+255713100003');
    await signIn(staffTab, '0713100004', '+255713100004');
    const [consoleName] = [...consoleTab.jar.keys()];
    const [staffName] = [...staffTab.jar.keys()];
    expect(consoleName).not.toBe(staffName);
    // one browser holds both cookies; each origin still refreshes only its own session
    staffTab.jar.set(consoleName!, consoleTab.jar.get(consoleName!)!);
    const r = await staffTab.post('/v1/auth/refresh', {});
    expect(r.status).toBe(200);
    expect((r.body.user as { phoneE164: string }).phoneE164).toBe('+255713100004');
  });

  it('refuses a cookie session from an origin that is not ours, and leaves body tokens as they were', async () => {
    const evil = browser('https://evil.example');
    await evil.post('/v1/auth/otp/request', { phone: '0713100005' }, false);
    const code = /(\d{6})/.exec(ctx.sms.lastTo('+255713100005')!)![1]!;
    const refused = await evil.post('/v1/auth/otp/verify', { phone: '0713100005', code });
    expect(refused.status).toBe(403);
    expect(refused.set).toHaveLength(0);

    // the Android app and older web bundles: no header, tokens in the body, no cookie
    const app = browser(CONSOLE);
    await app.post('/v1/auth/otp/request', { phone: '0713100006' }, false);
    const code2 = /(\d{6})/.exec(ctx.sms.lastTo('+255713100006')!)![1]!;
    const plain = await app.post(
      '/v1/auth/otp/verify',
      { phone: '0713100006', code: code2 },
      false,
    );
    expect(plain.status).toBe(200);
    expect(typeof plain.body.refreshToken).toBe('string');
    expect(plain.set).toHaveLength(0);
    // and a refresh with no token at all is refused rather than treated as a cookie session
    expect((await app.post('/v1/auth/refresh', {}, false)).status).toBe(401);
  });

  it('allows credentials only for the listed origins', async () => {
    const preflight = (origin: string) =>
      ctx.app.request('/v1/auth/refresh', {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,x-session-transport',
        },
      });
    const ok = await preflight(CONSOLE);
    expect(ok.headers.get('access-control-allow-origin')).toBe(CONSOLE);
    expect(ok.headers.get('access-control-allow-credentials')).toBe('true');
    expect(ok.headers.get('access-control-allow-headers')).toContain('x-session-transport');
    expect(
      (await preflight('https://evil.example')).headers.get('access-control-allow-origin'),
    ).toBeNull();
  });
});
