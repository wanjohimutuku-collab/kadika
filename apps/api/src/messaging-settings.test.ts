import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { auditLog, messagingSettings } from '@harusi/db';
import {
  api,
  createTestContext,
  loginAs,
  loginAsStaff,
  type TestContext,
} from './testing/test-app';
import { MessagingSettingsService } from './services/messaging-settings';

let ctx: TestContext;
let admin: string;
let support: string;
let customer: string;

beforeAll(async () => {
  ctx = await createTestContext({ env: { KENYA_ENABLED: '1' } });
  const a = await loginAsStaff(ctx, '0711700001', 'admin');
  const s = await loginAsStaff(ctx, '0711700002', 'support');
  const c = await loginAs(ctx, '0711700003');
  admin = a.accessToken;
  support = s.accessToken;
  customer = c.accessToken;
});
afterAll(() => ctx.close());

describe('messaging settings in /ops (ADR 031)', () => {
  it('/v1/me carries the staff level, so the panel knows what to show', async () => {
    expect((await api(ctx, 'GET', '/v1/me', { token: admin })).body!.staffRole).toBe('admin');
    expect((await api(ctx, 'GET', '/v1/me', { token: support })).body!.staffRole).toBe('support');
    expect((await api(ctx, 'GET', '/v1/me', { token: customer })).body!.staffRole).toBeNull();
  });

  it('is admin staff only', async () => {
    expect((await api(ctx, 'GET', '/v1/ops/messaging', { token: customer })).status).toBe(403);
    const r = await api(ctx, 'GET', '/v1/ops/messaging', { token: support });
    expect(r.status).toBe(403);
    expect(r.body!.error.message).toBe('missing_permission');
  });

  it('shows the environment settings with secrets masked', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/messaging', { token: admin });
    expect(r.status).toBe(200);
    const wa = r.body!.routes.find((x: { route: string }) => x.route === 'whatsapp');
    // the test env sets WHATSAPP_TOKEN etc. but WHATSAPP_PROVIDER stays fake
    expect(wa.source).toBe('environment');
    expect(wa.provider).toBe('fake');
    expect(r.body!.routes.map((x: { route: string }) => x.route)).toEqual([
      'sms_tz',
      'sms_ke',
      'whatsapp',
    ]);
    expect(JSON.stringify(r.body)).not.toContain('cloud-token');
  });

  it('refuses incomplete settings and stores nothing', async () => {
    const r = await api(ctx, 'PUT', '/v1/ops/messaging/sms_tz', {
      token: admin,
      body: { provider: 'nextsms', fields: { username: 'harusi' } },
    });
    expect(r.status).toBe(400);
    expect(r.body!.error.message).toContain('password');
    expect(await ctx.db.select().from(messagingSettings)).toHaveLength(0);
    expect(ctx.deps.sms.name).toBe('fake');
  });

  it('saves encrypted, swaps the live provider, and keeps a secret left empty', async () => {
    const r = await api(ctx, 'PUT', '/v1/ops/messaging/sms_tz', {
      token: admin,
      body: {
        provider: 'nextsms',
        fields: { username: 'harusi', password: 'sup3r-secret-pw', senderId: 'HARUSI' },
      },
    });
    expect(r.status).toBe(200);
    const tz = r.body!.routes.find((x: { route: string }) => x.route === 'sms_tz');
    expect(tz).toMatchObject({
      source: 'database',
      provider: 'nextsms',
      active: 'nextsms',
      fields: { username: 'harusi', senderId: 'HARUSI' },
      secrets: { password: '…t-pw' },
    });
    expect(ctx.deps.sms.name).toBe('nextsms');
    expect(ctx.deps.config.nextSms?.password).toBe('sup3r-secret-pw');
    const [row] = await ctx.db.select().from(messagingSettings);
    expect(row!.configEnc).not.toContain('sup3r');

    // change the sender id only: the password stays
    await api(ctx, 'PUT', '/v1/ops/messaging/sms_tz', {
      token: admin,
      body: { provider: 'nextsms', fields: { username: 'harusi', password: '', senderId: 'HP' } },
    });
    expect(ctx.deps.config.nextSms).toMatchObject({ password: 'sup3r-secret-pw', senderId: 'HP' });

    const audit = await ctx.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'ops.messaging.update'));
    expect(audit).toHaveLength(2);
    expect(JSON.stringify(audit)).not.toContain('sup3r');
  });

  it('a second instance picks the saved settings up on refresh', async () => {
    const other = { ...ctx.deps, config: { ...ctx.deps.config }, sms: ctx.sms };
    other.config.nextSms = null as typeof other.config.nextSms;
    const svc = new MessagingSettingsService(other);
    await svc.refresh();
    expect(other.sms.name).toBe('nextsms');
    expect((other.config as typeof ctx.deps.config).nextSms?.senderId).toBe('HP');
  });

  it('WhatsApp Cloud settings drive the webhook verify token', async () => {
    const r = await api(ctx, 'PUT', '/v1/ops/messaging/whatsapp', {
      token: admin,
      body: {
        provider: 'cloud',
        fields: {
          token: 'meta-token-123',
          phoneNumberId: '555',
          verifyToken: 'from-ops',
          templateInvite: 'harusi_invite',
        },
      },
    });
    expect(r.status).toBe(200);
    expect(ctx.deps.whatsapp?.name).toBe('whatsapp-cloud');
    const ok = await ctx.app.request(
      '/v1/webhooks/whatsapp-cloud?hub.mode=subscribe&hub.verify_token=from-ops&hub.challenge=42',
    );
    expect(await ok.text()).toBe('42');
  });

  it('reset goes back to the environment', async () => {
    const r = await api(ctx, 'DELETE', '/v1/ops/messaging/sms_tz', { token: admin });
    expect(r.status).toBe(200);
    expect(ctx.deps.sms.name).toBe('fake');
    expect(r.body!.routes[0].source).toBe('environment');
  });

  it('sends a test message through the live route', async () => {
    const r = await api(ctx, 'POST', '/v1/ops/messaging/sms_tz/test', {
      token: admin,
      body: { to: '0712 000 111' },
    });
    expect(r.body).toMatchObject({ ok: true, provider: 'fake' });
    const wrong = await api(ctx, 'POST', '/v1/ops/messaging/sms_tz/test', {
      token: admin,
      body: { to: '+254712000111' },
    });
    expect(wrong.status).toBe(400);
  });
});
