import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { Context, MiddlewareHandler } from 'hono';
import { z, ZodError } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { timingSafeEqual } from 'node:crypto';
import { hashGuestToken } from '@harusi/crypto';
import {
  metaVerifyChallenge,
  parseCloudStatuses,
  parseEvolutionUpdate,
  parseAfricasTalkingStatus,
  parseNextSmsStatus,
  verifyMetaSignature,
} from '@harusi/messaging';
import { users } from '@harusi/db';
import type { HealthResponse } from '@harusi/schemas';
import type { Deps } from './context';
import { ApiError } from './errors';
import { AuthService } from './auth/service';
import { verifyAccessToken, verifyGateToken, type GateClaims } from './auth/tokens';
import { EventService } from './services/events';
import { GuestService } from './services/guests';
import { MemberService } from './services/members';
import { idempotent } from './idempotency';
import { CardService } from './services/cards';
import { DeliveryService } from './services/delivery';
import { ScheduledSendService } from './services/scheduled';
import { PrintService } from './services/print';
import { AuditService, PrivacyService } from './services/audit';
import { GateService, type GateActor } from './services/gate';
import { cardContentSchema, cardKindSchema } from '@harusi/schemas/card-content';
import { fromLegacyKeys, withLegacyAliases } from './compat';
import { PilotMetricsService } from './services/pilot-metrics';
import { OpsService } from './services/ops';
import { MessagingSettingsService } from './services/messaging-settings';
import { PaymentSettingsService } from './services/payment-settings';
import { BrandingService } from './services/branding';
import { MESSAGING_ROUTES } from '@harusi/schemas/messaging-settings';
import { PAYMENT_ROUTES } from '@harusi/schemas/payment-settings';
import { BODY_FONT_KEYS, DISPLAY_FONT_KEYS } from '@harusi/schemas/branding';
import { MANUAL_METHODS, MOBILE_METHODS, PledgeService } from './services/pledges';
import { RateLimiter } from './rate-limit';

type Env = { Variables: { userId: string; gate?: GateClaims } };

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  throw new ApiError('validation', 'Invalid input', {
    issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

async function body(c: Context): Promise<unknown> {
  const json = await c.req.json().catch(() => {
    throw new ApiError('validation', 'Body must be JSON');
  });
  return fromLegacyKeys(json); // deprecated `*Tzs` names, see compat.ts
}

const phone = z.string().min(1).max(30);
const optionalDate = z.coerce.date().nullish();
const eventBase = z.object({
  title: z.string().trim().min(2).max(80),
  eventKind: z.string().trim().max(40).nullish(),
  country: z.enum(['TZ', 'KE']).optional(),
  coupleNames: z.string().trim().min(2).max(120),
  dateStart: z.coerce.date(),
  venueName: z.string().trim().max(120).nullish(),
  venueMapUrl: z.string().url().max(500).nullish(),
  dressCode: z.string().trim().max(80).nullish(),
  committeePhone: z.string().trim().max(30).nullish(),
  senderName: z.string().trim().max(120).nullish(),
  greeting: z.string().trim().max(200).nullish(),
  languageDefault: z.enum(['sw', 'en']).optional(),
  rsvpDeadline: optionalDate,
  contributionTarget: z.number().int().min(0).nullish(),
  pledgesEnabled: z.boolean().optional(),
  brandTheme: z.record(z.unknown()).nullish(),
  cardContent: cardContentSchema.optional(),
});
/** Who a send goes to (ADR 030); whether the audience fits the kind is checked by the service. */
const sendTargetSchema = z.union([
  z.enum(['remaining', 'failed', 'unanswered', 'all']),
  z.object({ guestIds: z.array(z.string().uuid()).min(1).max(1000) }),
  z.object({ group: z.string().min(1).max(40) }),
]);
const sendInputSchema = z.object({
  target: sendTargetSchema,
  channel: z.enum(['auto', 'whatsapp', 'sms']).optional(),
  kind: z.enum(['invite', 'reminder']).optional(),
});
const guestBase = z.object({
  displayName: z.string().trim().min(2).max(80),
  phone: phone.nullish().or(z.literal('')),
  groupLabel: z.string().trim().max(40).nullish(),
  partySizeAllowed: z.number().int().min(1).max(10).optional(),
  cardKind: cardKindSchema.optional(),
  hasSmartphone: z.boolean().nullish(),
  language: z.enum(['sw', 'en']).optional(),
  inviteChannelPref: z.enum(['whatsapp', 'sms', 'print', 'mixed']).optional(),
  notes: z.string().max(500).nullish(),
});

export function createApp(deps: Deps) {
  const app = new Hono<Env>();
  // Deprecated `*Tzs` money names are added next to the new ones for one release (see compat.ts).
  app.use('/v1/*', async (c, next) => {
    await next();
    const res = c.res;
    if (!res.headers.get('content-type')?.includes('application/json')) return;
    const text = await res.clone().text();
    if (!text) return;
    const headers = new Headers(res.headers);
    headers.delete('content-length');
    c.res = new Response(JSON.stringify(withLegacyAliases(JSON.parse(text))), {
      status: res.status,
      headers,
    });
  });
  // Security headers on every response (§9). The API only returns JSON, CSV and PDF, so nothing
  // it sends should ever be rendered or framed: a locked-down CSP costs nothing.
  const secure = secureHeaders({
    strictTransportSecurity: 'max-age=63072000; includeSubDomains',
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    referrerPolicy: 'no-referrer',
    xFrameOptions: 'DENY',
  });
  // The public logo route sets its own, stricter set (it serves an image, so it also needs `sandbox`
  // and an inline-style allowance); the global middleware would overwrite it after the handler runs.
  app.use('*', (c, next) => (c.req.path === '/v1/branding/logo' ? next() : secure(c, next)));
  // One JSON line per request, never with a card token, PIN, OTP or phone number in it: the route
  // pattern (`/v1/c/:token/pay`) is logged, not the real path (§12).
  app.use('*', async (c, next) => {
    const t0 = Date.now();
    await next();
    if (deps.config.logRequests)
      console.log(
        JSON.stringify({
          level: c.res.status >= 500 ? 'error' : 'info',
          msg: 'req',
          method: c.req.method,
          route: c.req.routePath,
          status: c.res.status,
          ms: Date.now() - t0,
        }),
      );
  });
  // The web app and the API are on different origins (APP_BASE_URL vs the API host).
  app.use(
    '*',
    cors({
      origin: deps.config.corsOrigins,
      allowHeaders: ['authorization', 'content-type', 'idempotency-key'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['idempotent-replayed'],
      maxAge: 600,
    }),
  );
  const auth = new AuthService(deps);
  const eventsSvc = new EventService(deps);
  const guestsSvc = new GuestService(deps, eventsSvc);
  const membersSvc = new MemberService(deps, eventsSvc);
  const cardsSvc = new CardService(deps);
  const deliverySvc = new DeliveryService(deps, eventsSvc);
  const scheduledSvc = new ScheduledSendService(deps, eventsSvc, deliverySvc);
  const printSvc = new PrintService(deps, eventsSvc, guestsSvc);
  const gateSvc = new GateService(deps, eventsSvc);
  const pledgeSvc = new PledgeService(deps, eventsSvc);
  const pilotSvc = new PilotMetricsService(deps);
  const opsSvc = new OpsService(deps);
  const messagingSvc = deps.messagingSettings ?? new MessagingSettingsService(deps);
  const paymentSettingsSvc = deps.paymentSettings ?? new PaymentSettingsService(deps);
  const brandingSvc = new BrandingService(deps);
  const auditSvc = new AuditService(deps, eventsSvc);
  const privacySvc = new PrivacyService(deps, eventsSvc);
  const payStarts = new RateLimiter(deps.now, 10, 60_000, 'pay-start', deps.rateStore);
  const payReads = new RateLimiter(deps.now, 120, 60_000, 'pay-read', deps.rateStore);
  const gateJoins = new RateLimiter(deps.now, 20, 60_000, 'gate-join', deps.rateStore);
  // Public endpoints are rate-limited per client and per token (§9) so tokens cannot be probed.
  const cardReads = new RateLimiter(
    deps.now,
    deps.config.cardReadLimit,
    60_000,
    'card-read',
    deps.rateStore,
  );
  const cardWrites = new RateLimiter(deps.now, 20, 60_000, 'card-write', deps.rateStore);
  const client = (c: Context) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

  const requireAuth: MiddlewareHandler<Env> = async (c, next) => {
    const h = c.req.header('authorization');
    if (!h?.startsWith('Bearer ')) throw new ApiError('unauthorized', 'Missing bearer token');
    const claims = await verifyAccessToken(deps, h.slice(7));
    const [u] = await deps.db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, claims.userId));
    if (!u) throw new ApiError('unauthorized', 'Unknown user');
    if (u.status === 'suspended')
      throw new ApiError('forbidden', 'Account suspended', { reason: 'suspended' });
    c.set('userId', claims.userId);
    await next();
  };

  /**
   * Gate agents carry a token scoped to one event (issued after link + PIN). It is only accepted on
   * that event's `/gate/` routes; everything else needs a normal user token.
   */
  const gateOrUser: MiddlewareHandler<Env> = async (c, next) => {
    const h = c.req.header('authorization');
    const m = /^\/v1\/events\/([^/]+)\/gate\//.exec(c.req.path);
    if (m && h?.startsWith('Bearer ')) {
      const claims = await verifyGateToken(deps, h.slice(7));
      if (claims) {
        if (claims.eventId !== m[1]) throw new ApiError('forbidden', 'Wrong event');
        c.set('gate', claims);
        return next();
      }
    }
    return requireAuth(c, next);
  };
  const actorOf = (c: Context<Env>): GateActor => {
    const claims = c.get('gate');
    return claims ? { kind: 'gate', claims } : { kind: 'user', userId: c.get('userId') };
  };

  // Readiness (§11): healthy only when the database answers; /health stays a cheap liveness probe.
  app.get('/ready', async (c) => {
    try {
      await deps.db.execute(sql`select 1`);
      return c.json({ status: 'ready', time: deps.now().toISOString() });
    } catch {
      return c.json({ status: 'unavailable', time: deps.now().toISOString() }, 503);
    }
  });
  app.get('/health', (c) => {
    const res: HealthResponse = {
      status: 'ok',
      service: 'api',
      time: deps.now().toISOString(),
      version: process.env.GIT_SHA || 'dev',
    };
    return c.json(res);
  });

  // ---- auth
  app.post('/v1/auth/otp/request', async (c) => {
    const { phone: p } = parse(z.object({ phone }), await body(c));
    return c.json(await auth.requestOtp(p));
  });
  app.post('/v1/auth/otp/verify', async (c) => {
    const { phone: p, code } = parse(
      z.object({ phone, code: z.string().regex(/^\d{6}$/) }),
      await body(c),
    );
    return c.json(await auth.verifyOtp(p, code));
  });
  app.post('/v1/auth/refresh', async (c) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string().min(10) }), await body(c));
    return c.json(await auth.refresh(refreshToken));
  });
  app.post('/v1/auth/logout', async (c) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string().min(10) }), await body(c));
    await auth.logout(refreshToken);
    return c.json({ ok: true });
  });

  app.use('/v1/*', async (c, next) =>
    c.req.path.startsWith('/v1/auth/') ||
    c.req.path.startsWith('/v1/c/') ||
    c.req.path.startsWith('/v1/webhooks/') ||
    c.req.path.startsWith('/v1/payments/webhook/') ||
    c.req.path === '/v1/gate/join' ||
    c.req.path === '/v1/branding' ||
    c.req.path === '/v1/branding/logo' ||
    /^\/v1\/payments\/[^/]+\/status$/.test(c.req.path)
      ? next()
      : gateOrUser(c, next),
  );
  // Idempotency-Key (§8) on the endpoints where a retry would otherwise duplicate or rotate things.
  const once = idempotent(deps);
  app.post('/v1/events/:id/guests', once);
  app.post('/v1/events/:id/guests/import', once);
  app.post('/v1/guests/:id/reissue', once);
  app.post('/v1/events/:id/invitations/send', once);
  app.post('/v1/events/:id/scheduled-sends', once);
  app.post('/v1/payments/manual', once);

  app.get('/v1/me', async (c) => {
    const [u] = await deps.db
      .select()
      .from(users)
      .where(eq(users.id, c.get('userId')));
    return c.json({
      id: u!.id,
      name: u!.name,
      phoneE164: u!.phoneE164,
      roleGlobal: u!.roleGlobal,
      // Staff level (ADR 012) so /ops shows only the actions this person may use.
      staffRole: u!.roleGlobal === 'admin' ? (u!.staffRole ?? 'support') : null,
    });
  });
  app.patch('/v1/me', async (c) => {
    const { name } = parse(z.object({ name: z.string().trim().min(2).max(80) }), await body(c));
    const [u] = await deps.db
      .update(users)
      .set({ name })
      .where(eq(users.id, c.get('userId')))
      .returning();
    return c.json({ id: u!.id, name: u!.name });
  });

  // ---- public guest card (no login; the card token is the credential)
  app.get('/v1/c/:token', async (c) => {
    await cardReads.check(`ip:${client(c)}`);
    await cardReads.check(`t:${c.req.param('token').slice(0, 8)}`);
    return c.json(await cardsSvc.get(c.req.param('token')));
  });
  app.get('/v1/c/:token/preview', async (c) => {
    await cardReads.check(`ip:${client(c)}`);
    await cardReads.check(`t:${c.req.param('token').slice(0, 8)}`);
    const v = await cardsSvc.preview(c.req.param('token'));
    return c.json({ ...v, qrPayload: null });
  });
  app.post('/v1/c/:token/reminders/opt-out', async (c) => {
    await cardWrites.check(`ip:${client(c)}`);
    const ok = await deliverySvc.optOutReminders(hashGuestToken(c.req.param('token')));
    if (!ok) throw new ApiError('not_found', 'Invalid link');
    return c.json({ ok: true });
  });

  // ---- delivery webhooks (§9: verified with a shared secret, compared in constant time)
  const webhookAuth = (c: Context) => {
    const want = deps.config.webhookSecret;
    if (!want) throw new ApiError('forbidden', 'Webhooks are not configured');
    const got = c.req.header('x-webhook-secret') ?? '';
    const a = Buffer.from(got);
    const b = Buffer.from(want);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new ApiError('unauthorized', 'Bad webhook secret');
  };
  app.post('/v1/webhooks/whatsapp', async (c) => {
    webhookAuth(c);
    const updates = parseEvolutionUpdate(await body(c));
    for (const u of updates) await deliverySvc.recordDelivery(u.providerMsgId, u.state);
    return c.json({ ok: true, updates: updates.length });
  });
  // Official WhatsApp Cloud API: Meta's subscribe handshake, then HMAC-signed status callbacks.
  app.get('/v1/webhooks/whatsapp-cloud', (c) => {
    const want = deps.config.whatsappCloud?.verifyToken;
    if (!want) throw new ApiError('forbidden', 'Webhooks are not configured');
    const q = c.req.query();
    const challenge = metaVerifyChallenge(
      { mode: q['hub.mode'], token: q['hub.verify_token'], challenge: q['hub.challenge'] },
      want,
    );
    if (challenge === null) throw new ApiError('forbidden', 'Bad verify token');
    return c.text(challenge);
  });
  app.post('/v1/webhooks/whatsapp-cloud', async (c) => {
    const secret = deps.config.whatsappCloud?.appSecret;
    if (!secret) throw new ApiError('forbidden', 'Webhooks are not configured');
    const raw = await c.req.text();
    if (!verifyMetaSignature(raw, c.req.header('x-hub-signature-256'), secret))
      throw new ApiError('unauthorized', 'Bad signature');
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new ApiError('validation', 'Body must be JSON');
    }
    const updates = parseCloudStatuses(payload);
    for (const u of updates) await deliverySvc.recordDelivery(u.providerMsgId, u.state);
    return c.json({ ok: true, updates: updates.length });
  });
  app.post('/v1/webhooks/sms', async (c) => {
    webhookAuth(c);
    const p = parse(
      z.object({
        messageId: z.union([z.string(), z.number()]),
        status: z.object({ groupName: z.string().optional(), name: z.string().optional() }),
      }),
      await body(c),
    );
    const known = await deliverySvc.recordDelivery(
      String(p.messageId),
      parseNextSmsStatus(p.status),
    );
    return c.json({ ok: true, known });
  });
  // Africa's Talking delivery reports are form-encoded callbacks and cannot carry custom headers, so
  // the shared secret rides in the query string (never logged: the route pattern is logged, not the URL).
  app.post('/v1/webhooks/sms/africastalking', async (c) => {
    const want = deps.config.webhookSecret;
    if (!want) throw new ApiError('forbidden', 'Webhooks are not configured');
    const a = Buffer.from(c.req.query('secret') ?? '');
    const b = Buffer.from(want);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new ApiError('unauthorized', 'Bad webhook secret');
    const form = await c.req.parseBody();
    const id = typeof form.id === 'string' ? form.id : '';
    if (!id) throw new ApiError('validation', 'Missing message id');
    const status = typeof form.status === 'string' ? form.status : undefined;
    const known = await deliverySvc.recordDelivery(id, parseAfricasTalkingStatus(status), {
      network:
        typeof form.networkCode === 'string' && form.networkCode ? form.networkCode : undefined,
      failureReason:
        typeof form.failureReason === 'string' && form.failureReason
          ? form.failureReason
          : undefined,
    });
    return c.json({ ok: true, known });
  });
  app.post('/v1/c/:token/rsvp', async (c) => {
    await cardWrites.check(`ip:${client(c)}`);
    await cardWrites.check(`t:${c.req.param('token').slice(0, 8)}`);
    const input = parse(
      z.object({ attending: z.boolean(), partySize: z.number().int().min(0).max(10) }),
      await body(c),
    );
    return c.json(await cardsSvc.rsvp(c.req.param('token'), input));
  });

  // ---- events
  app.get('/v1/events', async (c) =>
    c.json({ items: await eventsSvc.listForUser(c.get('userId')) }),
  );
  app.post('/v1/events', async (c) =>
    c.json(await eventsSvc.create(c.get('userId'), parse(eventBase, await body(c))), 201),
  );
  app.get('/v1/events/:id', async (c) =>
    c.json(await eventsSvc.get(c.req.param('id'), c.get('userId'))),
  );
  app.patch('/v1/events/:id', async (c) => {
    const patch = parse(
      eventBase
        .omit({ country: true })
        .partial()
        .extend({ status: z.enum(['draft', 'active', 'completed', 'archived']).optional() }),
      await body(c),
    );
    return c.json(await eventsSvc.update(c.req.param('id'), c.get('userId'), patch));
  });
  // ---- gate (§7.6): join with link + PIN, offline bundle, scan sync
  app.post('/v1/gate/join', async (c) => {
    await gateJoins.check(`ip:${client(c)}`);
    const input = parse(
      z.object({
        code: z.string().min(4).max(20),
        pin: z.string().regex(/^\d{4,8}$/),
        deviceId: z.string().min(8).max(100),
        deviceName: z.string().max(60).optional(),
      }),
      await body(c),
    );
    return c.json(await gateSvc.join(input));
  });
  app.post('/v1/events/:id/gate-links', async (c) =>
    c.json(await gateSvc.createLink(c.req.param('id'), c.get('userId')), 201),
  );
  app.delete('/v1/events/:id/gate-links', async (c) => {
    await gateSvc.revokeLinks(c.req.param('id'), c.get('userId'));
    return c.json({ ok: true });
  });
  app.get('/v1/events/:id/gate/bundle', async (c) => {
    const { body: bundle, etag } = await gateSvc.bundle(c.req.param('id'), actorOf(c));
    if (c.req.header('if-none-match') === etag) return c.body(null, 304, { etag });
    c.header('etag', etag);
    return c.json(bundle);
  });
  app.get('/v1/events/:id/gate/admitted', async (c) =>
    c.json(await gateSvc.admitted(c.req.param('id'), actorOf(c))),
  );
  app.post('/v1/events/:id/gate/scans/sync', async (c) => {
    const input = parse(
      z.object({
        deviceId: z.string().min(8).max(100),
        scans: z
          .array(
            z.object({
              clientId: z.string().min(8).max(100),
              guestId: z.string().uuid().nullish(),
              result: z.enum([
                'ok',
                'duplicate',
                'invalid_sig',
                'wrong_event',
                'not_found',
                'manual_ok',
                'manual_denied',
              ]),
              partyAdmitted: z.number().int().min(0).max(99),
              scannedAt: z.coerce.date(),
              offline: z.boolean(),
              override: z.boolean().optional(),
              reason: z.string().max(200).nullish(),
            }),
          )
          .max(500),
      }),
      await body(c),
    );
    return c.json(await gateSvc.sync(c.req.param('id'), actorOf(c), input));
  });
  app.get('/v1/events/:id/public-key', async (c) => {
    await eventsSvc.role(c.req.param('id'), c.get('userId'));
    return c.json({ publicKey: await eventsSvc.publicKey(c.req.param('id')) });
  });

  // ---- members
  app.get('/v1/events/:id/members', async (c) =>
    c.json(await membersSvc.list(c.req.param('id'), c.get('userId'))),
  );
  app.post('/v1/events/:id/members', async (c) => {
    const input = parse(
      z.object({
        name: z.string().trim().min(2).max(80),
        phone,
        role: z.enum(['committee', 'gate']),
      }),
      await body(c),
    );
    return c.json(await membersSvc.invite(c.req.param('id'), c.get('userId'), input), 201);
  });
  app.delete('/v1/events/:id/members/:uid', async (c) => {
    await membersSvc.remove(c.req.param('id'), c.get('userId'), c.req.param('uid'));
    return c.body(null, 204);
  });

  // ---- guests
  app.get('/v1/events/:id/guests', async (c) => {
    const q = parse(
      z.object({
        q: z.string().max(80).optional(),
        status: z
          .enum([
            'created',
            'queued',
            'sent',
            'delivered',
            'opened',
            'confirmed',
            'declined',
            'checked_in',
          ])
          .optional(),
        cardKind: cardKindSchema.optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
        cursor: z.string().max(400).optional(),
      }),
      c.req.query(),
    );
    return c.json(
      await guestsSvc.list(c.req.param('id'), c.get('userId'), {
        search: q.q,
        status: q.status,
        cardKind: q.cardKind,
        limit: q.limit,
        cursor: q.cursor,
      }),
    );
  });
  app.post('/v1/events/:id/guests', async (c) =>
    c.json(
      await guestsSvc.create(c.req.param('id'), c.get('userId'), parse(guestBase, await body(c))),
      201,
    ),
  );
  app.post('/v1/events/:id/guests/import', async (c) => {
    const input = parse(
      z.object({
        csv: z.string().min(1).max(2_000_000),
        dryRun: z.boolean().optional(),
        defaultGroup: z.string().max(40).optional(),
        defaultCardKind: cardKindSchema.optional(),
      }),
      await body(c),
    );
    return c.json(await guestsSvc.import(c.req.param('id'), c.get('userId'), input));
  });
  app.post('/v1/events/:id/invitations/send', async (c) => {
    const input = parse(sendInputSchema, await body(c));
    if (new URL(c.req.url).searchParams.get('async') === '1' && deps.enqueueSend) {
      await eventsSvc.role(c.req.param('id'), c.get('userId')); // members only
      const jobId = await deps.enqueueSend({
        eventId: c.req.param('id'),
        userId: c.get('userId'),
        input,
      });
      return c.json({ queued: true, jobId }, 202);
    }
    return c.json(await deliverySvc.send(c.req.param('id'), c.get('userId'), input));
  });
  app.post('/v1/events/:id/scheduled-sends', async (c) => {
    const input = parse(
      sendInputSchema.extend({ scheduledFor: z.string().datetime({ offset: true }) }),
      await body(c),
    );
    return c.json(
      await scheduledSvc.create(c.req.param('id'), c.get('userId'), {
        kind: input.kind ?? 'invite',
        target: input.target,
        channel: input.channel,
        scheduledFor: new Date(input.scheduledFor),
      }),
      201,
    );
  });
  app.get('/v1/events/:id/scheduled-sends', async (c) =>
    c.json({ items: await scheduledSvc.list(c.req.param('id'), c.get('userId')) }),
  );
  app.delete('/v1/events/:id/scheduled-sends/:sid', async (c) =>
    c.json(await scheduledSvc.cancel(c.req.param('id'), c.req.param('sid'), c.get('userId'))),
  );
  app.post('/v1/events/:id/cards/pdf', async (c) => {
    const input = parse(
      z.object({
        format: z.enum(['a6', 'a5', 'a4x4', 'test']),
        guestIds: z.array(z.string().uuid()).min(1).max(1000).optional(),
      }),
      await body(c),
    );
    const { bytes, filename } = await printSvc.pdf(c.req.param('id'), c.get('userId'), input);
    return c.body(bytes as unknown as ArrayBuffer, 200, {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    });
  });
  app.get('/v1/events/:id/invitations/stats', async (c) => {
    const id = c.req.param('id');
    const stats = await deliverySvc.stats(id, c.get('userId'));
    // money stays out of the numbers a gate agent can read (§2)
    if ((await eventsSvc.role(id, c.get('userId'))) === 'gate') return c.json(stats);
    return c.json({ ...stats, ...(await pledgeSvc.totals(id)) });
  });
  app.get('/v1/events/:id/pledges', async (c) =>
    c.json(await pledgeSvc.summary(c.req.param('id'), c.get('userId'))),
  );
  app.post('/v1/guests/:id/pledges', async (c) => {
    const input = parse(
      z.object({
        amount: z.number().int().min(0).max(100_000_000),
        note: z.string().max(200).nullish(),
        waived: z.boolean().optional(),
      }),
      await body(c),
    );
    return c.json(await pledgeSvc.upsertPledge(c.req.param('id'), c.get('userId'), input), 200);
  });
  app.post('/v1/payments/manual', async (c) => {
    const input = parse(
      z.object({
        guestId: z.string().uuid(),
        amount: z.number().int().min(1).max(100_000_000),
        method: z.enum(MANUAL_METHODS),
        reference: z.string().trim().max(60).optional(),
        note: z.string().trim().max(200).optional(),
      }),
      await body(c),
    );
    return c.json(await pledgeSvc.recordManual(c.get('userId'), input), 201);
  });
  // ---- audit trail and personal data rights (§9)
  app.get('/v1/events/:id/audit', async (c) =>
    c.json(
      await auditSvc.list(c.req.param('id'), c.get('userId'), {
        limit: Number(c.req.query('limit')) || undefined,
        before: c.req.query('before') || undefined,
      }),
    ),
  );
  app.get('/v1/guests/:id/export', async (c) =>
    c.json(await privacySvc.exportGuest(c.req.param('id'), c.get('userId'))),
  );
  app.post('/v1/guests/:id/erase', async (c) => {
    await privacySvc.eraseGuest(c.req.param('id'), c.get('userId'));
    return c.body(null, 204);
  });
  app.post('/v1/events/:id/pledges/reminders', async (c) => {
    const input = parse(
      z.object({ guestIds: z.array(z.string().uuid()).min(1).max(200) }),
      await body(c),
    );
    return c.json(
      await deliverySvc.sendPledgeReminders(c.req.param('id'), c.get('userId'), input.guestIds),
    );
  });
  app.get('/v1/events/:id/payments', async (c) =>
    c.json(await pledgeSvc.listPayments(c.req.param('id'), c.get('userId'))),
  );
  app.get('/v1/events/:id/exports/:kind', async (c) => {
    const kind = c.req.param('kind').replace(/\.csv$/, '');
    if (kind !== 'pledges' && kind !== 'payments')
      throw new ApiError('not_found', 'Unknown export');
    const csv = await pledgeSvc.exportCsv(c.req.param('id'), c.get('userId'), kind);
    return c.body(csv, 200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${kind}.csv"`,
      'cache-control': 'no-store',
    });
  });
  // ---- pay from the card and the aggregator webhook
  app.post('/v1/c/:token/pay', async (c) => {
    await payStarts.check(`ip:${client(c)}`);
    await payStarts.check(`t:${c.req.param('token').slice(0, 8)}`);
    const input = parse(
      z.object({
        amount: z.number().int(),
        phone: z.string().min(1).max(30),
        method: z.enum(MOBILE_METHODS),
      }),
      await body(c),
    );
    const key = c.req.header('idempotency-key') ?? '';
    return c.json(await pledgeSvc.startPayment(c.req.param('token'), input, key), 201);
  });
  app.get('/v1/payments/:reference/status', async (c) => {
    await payReads.check(`ip:${client(c)}`);
    return c.json(await pledgeSvc.paymentStatus(c.req.param('reference')));
  });
  app.post('/v1/payments/webhook/:provider', async (c) => {
    const raw = await c.req.text();
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    return c.json(await pledgeSvc.webhook(c.req.param('provider'), raw, headers));
  });
  // PDPA requests (ADR 012): a customer files them from Akaunti, staff resolve them in /ops/requests.
  app.post('/v1/me/data-requests', async (c) => {
    const { kind } = parse(z.object({ kind: z.enum(['export', 'deletion']) }), await body(c));
    return c.json(await opsSvc.fileRequest(c.get('userId'), kind), 201);
  });

  // ---- staff (ops) panel (ADR 012). Staff levels and the audit log are enforced in OpsService.
  const idParam = (c: Context) => parse(z.string().uuid(), c.req.param('id'));
  app.get('/v1/ops/overview', async (c) => c.json(await opsSvc.overview(c.get('userId'))));
  app.get('/v1/ops/organizers', async (c) => c.json(await opsSvc.listOrganizers(c.get('userId'))));
  app.patch('/v1/ops/organizers/:id/status', async (c) => {
    const input = parse(
      z.object({ status: z.enum(['active', 'suspended']), reason: z.string().max(500) }),
      await body(c),
    );
    return c.json(
      await opsSvc.setUserStatus(c.get('userId'), idParam(c), input.status, input.reason),
    );
  });
  app.get('/v1/ops/events', async (c) => c.json(await opsSvc.listEvents(c.get('userId'))));
  app.patch('/v1/ops/events/:id/plan', async (c) => {
    const { plan } = parse(z.object({ plan: z.enum(['free', 'paid']) }), await body(c));
    return c.json(await opsSvc.setEventPlan(c.get('userId'), idParam(c), plan));
  });
  app.get('/v1/ops/usage', async (c) => c.json(await opsSvc.usage(c.get('userId'))));
  app.get('/v1/ops/payments', async (c) => c.json(await opsSvc.listPayments(c.get('userId'))));
  app.get('/v1/ops/lookup', async (c) => {
    const { q } = parse(z.object({ q: z.string().max(100) }), c.req.query());
    return c.json(await opsSvc.lookup(c.get('userId'), q));
  });
  app.post('/v1/ops/reveal-phone', async (c) => {
    const input = parse(
      z.object({
        kind: z.enum(['guest', 'organizer']),
        id: z.string().uuid(),
        reason: z.string().max(500),
      }),
      await body(c),
    );
    return c.json(
      await opsSvc.revealPhone(c.get('userId'), { kind: input.kind, id: input.id }, input.reason),
    );
  });
  app.get('/v1/ops/audit', async (c) => c.json(await opsSvc.listAudit(c.get('userId'))));
  app.get('/v1/ops/data-requests', async (c) => c.json(await opsSvc.listRequests(c.get('userId'))));
  app.post('/v1/ops/data-requests/:id/resolve', async (c) => {
    const input = parse(
      z.object({ status: z.enum(['done', 'rejected']), note: z.string().max(500).default('') }),
      await body(c),
    );
    return c.json(
      await opsSvc.resolveRequest(c.get('userId'), idParam(c), input.status, input.note),
    );
  });
  // ---- staff: launch-gate numbers per country (Phase 5, docs/ops/kenya-pilot-runbook.md)
  app.get('/v1/ops/pilot-metrics', async (c) => {
    const q = parse(
      z.object({
        country: z.enum(['TZ', 'KE', 'all']).optional(),
        days: z.coerce.number().int().min(1).max(365).optional(),
      }),
      c.req.query(),
    );
    return c.json(await pilotSvc.report(c.get('userId'), q));
  });
  // ---- staff: SMS and WhatsApp provider settings (ADR 031, admin staff only)
  const routeParam = (c: Context) => parse(z.enum(MESSAGING_ROUTES), c.req.param('route'));
  app.get('/v1/ops/messaging', async (c) => c.json(await messagingSvc.view(c.get('userId'))));
  app.put('/v1/ops/messaging/:route', async (c) => {
    const input = parse(
      z.object({
        provider: z.string().min(1).max(40),
        fields: z.record(z.string().max(2000)).default({}),
      }),
      await body(c),
    );
    return c.json(await messagingSvc.save(c.get('userId'), routeParam(c), input));
  });
  app.delete('/v1/ops/messaging/:route', async (c) =>
    c.json(await messagingSvc.reset(c.get('userId'), routeParam(c))),
  );
  app.post('/v1/ops/messaging/:route/test', async (c) => {
    const { to } = parse(z.object({ to: phone }), await body(c));
    return c.json(await messagingSvc.test(c.get('userId'), routeParam(c), to));
  });
  app.post('/v1/ops/messaging/import-env', async (c) =>
    c.json(await messagingSvc.importFromEnvironment(c.get('userId'))),
  );

  // ---- staff: payment gateway settings (ADR 036, admin staff only)
  const paymentRouteParam = (c: Context) => parse(z.enum(PAYMENT_ROUTES), c.req.param('route'));
  app.get('/v1/ops/payment-settings', async (c) =>
    c.json(await paymentSettingsSvc.view(c.get('userId'))),
  );
  app.put('/v1/ops/payment-settings/:route', async (c) => {
    const input = parse(
      z.object({
        provider: z.string().min(1).max(40),
        fields: z.record(z.string().max(2000)).default({}),
      }),
      await body(c),
    );
    return c.json(await paymentSettingsSvc.save(c.get('userId'), paymentRouteParam(c), input));
  });
  app.delete('/v1/ops/payment-settings/:route', async (c) =>
    c.json(await paymentSettingsSvc.reset(c.get('userId'), paymentRouteParam(c))),
  );
  app.post('/v1/ops/payment-settings/:route/test', async (c) =>
    c.json(await paymentSettingsSvc.test(c.get('userId'), paymentRouteParam(c))),
  );

  // ---- business branding (ADR 036): public to read, admin staff only to change
  app.get('/v1/branding', async (c) => {
    c.header('cache-control', 'public, max-age=60');
    return c.json(await brandingSvc.publicView());
  });
  app.get('/v1/branding/logo', async (c) => {
    const logo = await brandingSvc.logo();
    if (!logo) return c.json({ error: { code: 'not_found', message: 'No logo' } }, 404);
    // `?v=` changes with every upload, so a versioned URL can be cached for good; a bare one revalidates.
    const versioned = c.req.query('v') === String(logo.version);
    const headers: Record<string, string> = {
      'content-type': logo.mime,
      etag: logo.etag,
      'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'content-disposition': 'inline',
      // The logo is an image, never a page: no script, no network, no framing, even if opened directly.
      'content-security-policy':
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; sandbox",
      'strict-transport-security': 'max-age=63072000; includeSubDomains',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      // The web app (another origin) shows it with <img>, which needs no CORS; the resource policy
      // still allows that explicitly.
      'cross-origin-resource-policy': 'cross-origin',
    };
    if (c.req.header('if-none-match') === logo.etag) return c.body(null, 304, headers);
    return c.body(new Uint8Array(logo.body), 200, headers);
  });
  const brandingInput = z.object({
    businessName: z.string().max(200),
    tagline: z.string().max(400).default(''),
    primary: z.string().max(20).nullable(),
    accent: z.string().max(20).nullable(),
    fontBody: z.enum(BODY_FONT_KEYS),
    fontDisplay: z.enum(DISPLAY_FONT_KEYS),
  });
  app.get('/v1/ops/branding', async (c) => c.json(await brandingSvc.view(c.get('userId'))));
  app.put('/v1/ops/branding', async (c) =>
    c.json(await brandingSvc.save(c.get('userId'), parse(brandingInput, await body(c)))),
  );
  app.put('/v1/ops/branding/logo', async (c) => {
    const input = parse(
      z.object({ mime: z.string().max(40), data: z.string().max(400_000) }),
      await body(c),
    );
    return c.json(await brandingSvc.setLogo(c.get('userId'), input));
  });
  app.delete('/v1/ops/branding/logo', async (c) =>
    c.json(await brandingSvc.removeLogo(c.get('userId'))),
  );
  app.get('/v1/guests/:id', async (c) =>
    c.json(await guestsSvc.detail(c.req.param('id'), c.get('userId'))),
  );
  app.patch('/v1/guests/:id', async (c) =>
    c.json(
      await guestsSvc.update(
        c.req.param('id'),
        c.get('userId'),
        parse(guestBase.partial(), await body(c)),
      ),
    ),
  );
  app.delete('/v1/guests/:id', async (c) => {
    await guestsSvc.remove(c.req.param('id'), c.get('userId'));
    return c.body(null, 204);
  });
  app.post('/v1/guests/:id/reissue', async (c) =>
    c.json(await guestsSvc.reissue(c.req.param('id'), c.get('userId'))),
  );
  app.get('/v1/guests/:id/qr', async (c) =>
    c.json(await guestsSvc.qrToken(c.req.param('id'), c.get('userId'))),
  );

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));
  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json(err.toJSON(), err.status as 400);
    if (err instanceof ZodError)
      return c.json(new ApiError('validation', 'Invalid input').toJSON(), 400);
    // Never log tokens, OTPs, keys or full phone numbers (§12): only the message.
    console.error(JSON.stringify({ level: 'error', msg: err.message }));
    deps.reportError?.(err);
    return c.json(new ApiError('internal', 'Internal server error').toJSON(), 500);
  });

  return app;
}
