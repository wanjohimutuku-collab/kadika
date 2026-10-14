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
import { PrintService } from './services/print';
import { AuditService, PrivacyService } from './services/audit';
import { GateService, type GateActor } from './services/gate';
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
  return c.req.json().catch(() => {
    throw new ApiError('validation', 'Body must be JSON');
  });
}

const phone = z.string().min(1).max(30);
const optionalDate = z.coerce.date().nullish();
const eventBase = z.object({
  title: z.string().trim().min(2).max(80),
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
  contributionTargetTzs: z.number().int().min(0).nullish(),
  pledgesEnabled: z.boolean().optional(),
  brandTheme: z.record(z.unknown()).nullish(),
});
const guestBase = z.object({
  displayName: z.string().trim().min(2).max(80),
  phone: phone.nullish().or(z.literal('')),
  groupLabel: z.string().trim().max(40).nullish(),
  partySizeAllowed: z.number().int().min(1).max(10).optional(),
  hasSmartphone: z.boolean().nullish(),
  language: z.enum(['sw', 'en']).optional(),
  inviteChannelPref: z.enum(['whatsapp', 'sms', 'print', 'mixed']).optional(),
  notes: z.string().max(500).nullish(),
});

export function createApp(deps: Deps) {
  const app = new Hono<Env>();
  // Security headers on every response (§9). The API only returns JSON, CSV and PDF, so nothing
  // it sends should ever be rendered or framed: a locked-down CSP costs nothing.
  app.use(
    '*',
    secureHeaders({
      strictTransportSecurity: 'max-age=63072000; includeSubDomains',
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      referrerPolicy: 'no-referrer',
      xFrameOptions: 'DENY',
    }),
  );
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
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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
  const printSvc = new PrintService(deps, eventsSvc, guestsSvc);
  const gateSvc = new GateService(deps, eventsSvc);
  const pledgeSvc = new PledgeService(deps, eventsSvc);
  const auditSvc = new AuditService(deps, eventsSvc);
  const privacySvc = new PrivacyService(deps, eventsSvc);
  const payStarts = new RateLimiter(deps.now, 10, 60_000);
  const payReads = new RateLimiter(deps.now, 120, 60_000);
  const gateJoins = new RateLimiter(deps.now, 20, 60_000);
  // Public endpoints are rate-limited per client and per token (§9) so tokens cannot be probed.
  const cardReads = new RateLimiter(deps.now, deps.config.cardReadLimit, 60_000);
  const cardWrites = new RateLimiter(deps.now, 20, 60_000);
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
    const res: HealthResponse = { status: 'ok', service: 'api', time: deps.now().toISOString() };
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
  app.post('/v1/payments/manual', once);

  app.get('/v1/me', async (c) => {
    const [u] = await deps.db
      .select()
      .from(users)
      .where(eq(users.id, c.get('userId')));
    return c.json({ id: u!.id, name: u!.name, phoneE164: u!.phoneE164, roleGlobal: u!.roleGlobal });
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
    cardReads.check(`ip:${client(c)}`);
    cardReads.check(`t:${c.req.param('token').slice(0, 8)}`);
    return c.json(await cardsSvc.get(c.req.param('token')));
  });
  app.get('/v1/c/:token/preview', async (c) => {
    cardReads.check(`ip:${client(c)}`);
    cardReads.check(`t:${c.req.param('token').slice(0, 8)}`);
    const v = await cardsSvc.preview(c.req.param('token'));
    return c.json({ ...v, qrPayload: null });
  });
  app.post('/v1/c/:token/reminders/opt-out', async (c) => {
    cardWrites.check(`ip:${client(c)}`);
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
  app.post('/v1/c/:token/rsvp', async (c) => {
    cardWrites.check(`ip:${client(c)}`);
    cardWrites.check(`t:${c.req.param('token').slice(0, 8)}`);
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
        .partial()
        .extend({ status: z.enum(['draft', 'active', 'completed', 'archived']).optional() }),
      await body(c),
    );
    return c.json(await eventsSvc.update(c.req.param('id'), c.get('userId'), patch));
  });
  // ---- gate (§7.6): join with link + PIN, offline bundle, scan sync
  app.post('/v1/gate/join', async (c) => {
    gateJoins.check(`ip:${client(c)}`);
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
        limit: z.coerce.number().int().min(1).max(200).optional(),
        cursor: z.string().max(400).optional(),
      }),
      c.req.query(),
    );
    return c.json(
      await guestsSvc.list(c.req.param('id'), c.get('userId'), {
        search: q.q,
        status: q.status,
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
      }),
      await body(c),
    );
    return c.json(await guestsSvc.import(c.req.param('id'), c.get('userId'), input));
  });
  app.post('/v1/events/:id/invitations/send', async (c) => {
    const input = parse(
      z.object({
        target: z.union([
          z.enum(['remaining', 'failed']),
          z.object({ guestIds: z.array(z.string().uuid()).min(1).max(1000) }),
          z.object({ group: z.string().min(1).max(40) }),
        ]),
        channel: z.enum(['auto', 'whatsapp', 'sms']).optional(),
      }),
      await body(c),
    );
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
        amountTzs: z.number().int().min(0).max(100_000_000),
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
        amountTzs: z.number().int().min(1).max(100_000_000),
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
    payStarts.check(`ip:${client(c)}`);
    payStarts.check(`t:${c.req.param('token').slice(0, 8)}`);
    const input = parse(
      z.object({
        amountTzs: z.number().int(),
        phone: z.string().min(1).max(30),
        method: z.enum(MOBILE_METHODS),
      }),
      await body(c),
    );
    const key = c.req.header('idempotency-key') ?? '';
    return c.json(await pledgeSvc.startPayment(c.req.param('token'), input, key), 201);
  });
  app.get('/v1/payments/:reference/status', async (c) => {
    payReads.check(`ip:${client(c)}`);
    return c.json(await pledgeSvc.paymentStatus(c.req.param('reference')));
  });
  app.post('/v1/payments/webhook/:provider', async (c) => {
    const raw = await c.req.text();
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    return c.json(await pledgeSvc.webhook(c.req.param('provider'), raw, headers));
  });
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
    return c.json(new ApiError('internal', 'Internal server error').toJSON(), 500);
  });

  return app;
}
