import { sanitizeOverrides } from '@harusi/ui-tokens/palette';
import {
  defaultSender,
  senderKindOf,
  type CardContent,
  type CardKind,
  hostNames,
  type Country,
  type Currency,
  type EventInput,
  type GuestInput,
  type MessageChannel,
  type PilotMetrics,
} from '@harusi/schemas';
import { RepositoryError, type RepositoryErrorCode } from './errors';
import type { Repository } from './repository';
import { applyGuestQuery } from './domain/guest-filter';
import { buildSampleSms, estimateSmsCostFor } from './domain/sms';
import type {
  CardView,
  Guest,
  GuestQuery,
  ImportOptions,
  ImportResult,
  ImportRowInput,
  Member,
  Payment,
  PaymentStart,
  PaymentStatusView,
  SendJob,
  SendRequest,
  Session,
  WeddingEvent,
} from './types';
import { toCsv } from '@harusi/schemas/import';

/** Where the session tokens live: `localStorage` in browsers, memory elsewhere. */
export interface TokenStore {
  get(): { accessToken: string; refreshToken: string } | null;
  set(tokens: { accessToken: string; refreshToken: string } | null): void;
}

export function memoryTokenStore(): TokenStore {
  let t: { accessToken: string; refreshToken: string } | null = null;
  return { get: () => t, set: (v) => void (t = v) };
}

export function webStorageTokenStore(storage: Storage, key = 'harusi.auth.v1'): TokenStore {
  return {
    get() {
      try {
        const raw = storage.getItem(key);
        return raw ? (JSON.parse(raw) as { accessToken: string; refreshToken: string }) : null;
      } catch {
        return null;
      }
    },
    set(v) {
      try {
        if (v) storage.setItem(key, JSON.stringify(v));
        else storage.removeItem(key);
      } catch {
        // storage blocked: the session lasts until the page closes
      }
    },
  };
}

export interface HttpRepositoryOptions {
  fetchImpl?: typeof fetch;
  tokens?: TokenStore;
  newKey?: () => string;
}

interface ApiUser {
  id: string;
  name: string;
  phoneE164: string;
  roleGlobal: 'user' | 'admin';
}

interface ApiEvent {
  id: string;
  title: string;
  cardContent?: CardContent | null;
  eventKind?: string | null;
  coupleNames: string;
  dateStart: string;
  venueName: string | null;
  venueMapUrl: string | null;
  dressCode: string | null;
  committeePhone?: string | null;
  pledgesEnabled?: boolean;
  senderName?: string | null;
  greeting?: string | null;
  languageDefault: 'sw' | 'en';
  country?: Country;
  currency?: Currency;
  timezone: string;
  status: WeddingEvent['status'];
  rsvpDeadline: string | null;
  contributionTarget: number | null;
  plan: 'free' | 'paid';
  brandTheme: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  myRole?: 'owner' | 'committee' | 'gate';
}

interface ApiGuest {
  id: string;
  eventId: string;
  cardKind?: CardKind;
  displayName: string;
  phoneE164: string | null;
  hasSmartphone: boolean | null;
  groupLabel: string | null;
  partySizeAllowed: number;
  shortCode: string;
  tokenVersion: number;
  language: 'sw' | 'en';
  inviteChannelPref: Guest['inviteChannelPref'];
  notes: string | null;
  status?: Guest['status'];
  channelLast?: Guest['channelLast'];
  pledge?: Guest['pledge'];
  rsvpPartySize?: number | null;
  createdAt: string;
  updatedAt: string;
}

const notImplemented = (name: string) => () =>
  Promise.reject(new RepositoryError('not_implemented', `${name} is not available on the API yet`));

interface ApiStats {
  total: number;
  byStatus: Record<string, number>;
  failedMessages: number;
  headcountConfirmed?: number;
  featurePhoneGuests?: number;
  contributionGuests?: number;
  pledged?: number;
  collected?: number;
  guestsWithBalance?: number;
}

/** Funnel counts are cumulative: a guest who opened the card also counts as sent and delivered. */
function mapStats(s: ApiStats | null): WeddingEvent['stats'] {
  const n = (...k: string[]) => k.reduce((t, x) => t + (s?.byStatus[x] ?? 0), 0);
  const afterSent = ['sent', 'delivered', 'opened', 'confirmed', 'declined', 'checked_in'];
  return {
    invited: s?.total ?? 0,
    sent: n(...afterSent),
    delivered: n('delivered', 'opened', 'confirmed', 'declined', 'checked_in'),
    opened: n('opened', 'confirmed', 'declined', 'checked_in'),
    confirmed: n('confirmed', 'checked_in'),
    declined: n('declined'),
    attended: n('checked_in'),
    headcountConfirmed: s?.headcountConfirmed ?? 0,
    headcountAttended: 0,
    pledged: s?.pledged ?? 0,
    collected: s?.collected ?? 0,
    guestsWithBalance: s?.guestsWithBalance ?? 0,
    failedMessages: s?.failedMessages ?? 0,
    featurePhoneGuests: s?.featurePhoneGuests ?? 0,
    contributionGuests: s?.contributionGuests ?? 0,
  };
}

function mapEvent(e: ApiEvent, stats: ApiStats | null = null): WeddingEvent {
  const [a = '', b = ''] = e.coupleNames.split('&').map((s) => s.trim());
  const empty = mapStats(stats);
  return {
    id: e.id,
    myRole: e.myRole,
    title: e.title,
    cardContent: e.cardContent ?? {},
    eventKind: e.eventKind ?? '',
    partnerA: a,
    partnerB: b,
    coupleNames: e.coupleNames,
    dateStart: e.dateStart,
    venueName: e.venueName ?? '',
    venueMapUrl: e.venueMapUrl ?? '',
    dressCode: e.dressCode ?? '',
    languageDefault: e.languageDefault,
    country: e.country ?? 'TZ',
    currency: e.currency ?? 'TZS',
    timezone: e.timezone || 'Africa/Dar_es_Salaam',
    status: e.status,
    themeId: ((e.brandTheme as { themeId?: WeddingEvent['themeId'] } | null)?.themeId ??
      'emerald-gold') as WeddingEvent['themeId'],
    coverGradient: String((e.brandTheme as { coverGradient?: string } | null)?.coverGradient ?? ''),
    palette: sanitizeOverrides((e.brandTheme as { palette?: unknown } | null)?.palette),
    rsvpDeadline: e.rsvpDeadline,
    contributionTarget: e.contributionTarget ?? 0,
    senderName:
      e.senderName || defaultSender(e.eventKind, e.coupleNames, senderKindOf(e.cardContent), 'sw'),
    committeePhone: e.committeePhone ?? '',
    pledgesEnabled: e.pledgesEnabled ?? true,
    requirePledgeBeforeCard: false,
    greeting: e.greeting ?? '',
    extraNote: '',
    reminders: { t14: true, t7: true, t1: true },
    whatsappFallbackHours: 6,
    plan: e.plan,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    stats: empty,
  };
}

interface ApiCard {
  state: CardView['state'];
  cardKind?: CardKind;
  contributionCollected?: number | null;
  event:
    | (Omit<
        NonNullable<CardView['event']>,
        'partnerA' | 'partnerB' | 'extraNote' | 'themeId' | 'coverGradient' | 'palette'
      > & { brandTheme: Record<string, unknown> | null; eventKind?: string | null })
    | null;
  guest: CardView['guest'];
  qrPayload: string | null;
  pledge?: CardView['pledge'];
  rsvp: CardView['rsvp'];
  rsvpOpen: boolean;
  eventPassed: boolean;
}

function mapCard(token: string, c: ApiCard): CardView {
  const e = c.event;
  const theme = (e?.brandTheme ?? {}) as {
    themeId?: WeddingEvent['themeId'];
    coverGradient?: string;
    palette?: unknown;
  };
  const [a = '', b = ''] = (e?.coupleNames ?? '').split('&').map((x) => x.trim());
  return {
    token,
    state: c.state,
    cardKind: c.cardKind ?? 'invitation',
    contributionCollected: c.contributionCollected ?? null,
    event: e
      ? {
          id: e.id,
          eventKind: e.eventKind ?? '',
          partnerA: a,
          partnerB: b,
          coupleNames: e.coupleNames,
          dateStart: e.dateStart,
          venueName: e.venueName ?? '',
          venueMapUrl: e.venueMapUrl ?? '',
          dressCode: e.dressCode ?? '',
          themeId: theme.themeId ?? 'emerald-gold',
          coverGradient: theme.coverGradient ?? '',
          palette: sanitizeOverrides(theme.palette),
          rsvpDeadline: e.rsvpDeadline,
          senderName:
            e.senderName ||
            defaultSender(e.eventKind, e.coupleNames, senderKindOf(e.cardContent), 'sw'),
          committeePhone: e.committeePhone ?? '',
          pledgesEnabled: e.pledgesEnabled ?? false,
          cardContent: e.cardContent ?? {},
          contributionTarget: e.contributionTarget ?? 0,
          greeting: e.greeting ?? '',
          extraNote: '',
          country: e.country ?? 'TZ',
          currency: e.currency ?? 'TZS',
          timezone: e.timezone || 'Africa/Dar_es_Salaam',
        }
      : null,
    guest: c.guest,
    qrPayload: c.qrPayload,
    rsvp: c.rsvp,
    pledge: c.pledge ?? null,
    rsvpOpen: c.rsvpOpen,
    eventPassed: c.eventPassed,
    isMock: false,
  };
}

function mapGuest(g: ApiGuest): Guest {
  return {
    id: g.id,
    eventId: g.eventId,
    cardKind: g.cardKind ?? 'invitation',
    displayName: g.displayName,
    phoneE164: g.phoneE164,
    hasSmartphone: g.hasSmartphone ?? true,
    groupLabel: g.groupLabel ?? '',
    partySizeAllowed: g.partySizeAllowed,
    shortCode: g.shortCode,
    tokenVersion: g.tokenVersion,
    language: g.language,
    inviteChannelPref: g.inviteChannelPref,
    notes: g.notes ?? '',
    status: g.status ?? 'created',
    timeline: { created: g.createdAt },
    rsvpPartySize: g.rsvpPartySize ?? null,
    channelLast: g.channelLast ?? null,
    lastMessageFailed: false,
    checkedInAt: null,
    partyAdmitted: 0,
    pledge: g.pledge ?? null,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

/**
 * Real `/v1` client for what Phase 1 provides: auth, events, members and guests. Everything the
 * API does not have yet (sending, pledges, gate, reports, public card) rejects with
 * `not_implemented`; the web app keeps using the mock for those until their phases land.
 */
/** Side-effect-free card read for the OG image and manifest (never marks the invitation opened). */
export async function fetchCardPreview(
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CardView> {
  const res = await fetchImpl(`${baseUrl}/v1/c/${encodeURIComponent(token)}/preview`);
  if (!res.ok) throw new Error(`preview failed: ${res.status}`);
  return mapCard(token, (await res.json()) as ApiCard);
}

export function createHttpRepository(
  baseUrl: string,
  opts: HttpRepositoryOptions = {},
): Repository {
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const tokens = opts.tokens ?? memoryTokenStore();
  const newKey = opts.newKey ?? (() => crypto.randomUUID());
  let refreshing: Promise<boolean> | null = null;

  const fail = (
    status: number,
    body: { error?: { code?: string; message?: string; details?: Record<string, unknown> } } | null,
  ): never => {
    const code = (body?.error?.code ??
      (status >= 500 ? 'server' : 'validation')) as RepositoryErrorCode;
    throw new RepositoryError(code, body?.error?.message, body?.error?.details);
  };

  async function raw(
    method: string,
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
    auth = true,
  ) {
    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(auth && tokens.get() ? { authorization: `Bearer ${tokens.get()!.accessToken}` } : {}),
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new RepositoryError('offline', 'No network');
    }
    const json = res.status === 204 ? null : ((await res.json().catch(() => null)) as never);
    return { status: res.status, json: json as Record<string, unknown> | null };
  }

  async function refreshTokens(): Promise<boolean> {
    const t = tokens.get();
    if (!t) return false;
    refreshing ??= (async () => {
      const r = await raw('POST', '/v1/auth/refresh', { refreshToken: t.refreshToken }, {}, false);
      if (r.status !== 200) {
        tokens.set(null);
        return false;
      }
      tokens.set({
        accessToken: r.json!.accessToken as string,
        refreshToken: r.json!.refreshToken as string,
      });
      return true;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  /** Authenticated call: one transparent refresh on 401, then the §8 error shape. */
  async function call<T>(
    method: string,
    path: string,
    body?: unknown,
    extra?: Record<string, string>,
  ): Promise<T> {
    let r = await raw(method, path, body, extra);
    if (r.status === 401 && tokens.get() && (await refreshTokens()))
      r = await raw(method, path, body, extra);
    if (r.status >= 400) return fail(r.status, r.json as never);
    return r.json as T;
  }

  const sessionOf = (u: ApiUser): Session => ({
    user: { id: u.id, name: u.name, phoneE164: u.phoneE164, roleGlobal: u.roleGlobal },
    role: 'owner',
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });

  /** Funnel stats; a failure here must not hide the event itself. */
  const statsOf = (eventId: string): Promise<ApiStats | null> =>
    call<ApiStats>('GET', `/v1/events/${encodeURIComponent(eventId)}/invitations/stats`).catch(
      () => null,
    );

  const impl: Partial<Repository> = {
    async requestOtp(phone) {
      const r = await raw('POST', '/v1/auth/otp/request', { phone }, {}, false);
      if (r.status >= 400) return fail(r.status, r.json as never);
      return { resendAfterSeconds: Number(r.json!.resendAfterSeconds ?? 30) };
    },
    async verifyOtp(phone, code) {
      const r = await raw('POST', '/v1/auth/otp/verify', { phone, code }, {}, false);
      if (r.status >= 400) return fail(r.status, r.json as never);
      tokens.set({
        accessToken: r.json!.accessToken as string,
        refreshToken: r.json!.refreshToken as string,
      });
      return sessionOf(r.json!.user as ApiUser);
    },
    async getSession() {
      if (!tokens.get()) return null;
      try {
        return sessionOf(await call<ApiUser>('GET', '/v1/me'));
      } catch (e) {
        if (e instanceof RepositoryError && (e.code === 'unauthorized' || e.code === 'forbidden'))
          return null;
        throw e;
      }
    },
    async signOut() {
      const t = tokens.get();
      tokens.set(null);
      if (t)
        await raw('POST', '/v1/auth/logout', { refreshToken: t.refreshToken }, {}, false).catch(
          () => undefined,
        );
    },
    async updateProfile(patch) {
      await call('PATCH', '/v1/me', patch);
      return sessionOf(await call<ApiUser>('GET', '/v1/me'));
    },

    async opsPilotMetrics(opts = {}) {
      const q = new URLSearchParams();
      if (opts.country) q.set('country', opts.country);
      if (opts.days) q.set('days', String(opts.days));
      return call<PilotMetrics>('GET', `/v1/ops/pilot-metrics${q.size ? `?${q}` : ''}`);
    },

    async listEvents() {
      const items = (await call<{ items: ApiEvent[] }>('GET', '/v1/events')).items;
      return Promise.all(items.map(async (e) => mapEvent(e, await statsOf(e.id))));
    },
    async getEvent(id) {
      return mapEvent(await call<ApiEvent>('GET', `/v1/events/${id}`), await statsOf(id));
    },
    async createEvent(input: EventInput) {
      const created = await call<ApiEvent>('POST', '/v1/events', {
        title: input.title,
        eventKind: input.eventKind || null,
        country: input.country,
        cardContent: input.cardContent,
        coupleNames: [input.partnerA, input.partnerB].filter(Boolean).join(' & '),
        dateStart: input.dateStart,
        venueName: input.venueName,
        venueMapUrl: input.venueMapUrl || null,
        dressCode: input.dressCode || null,
        languageDefault: input.languageDefault,
        rsvpDeadline: input.rsvpDeadline || null,
        contributionTarget: input.contributionTarget ?? null,
        brandTheme: {
          themeId: input.themeId,
          coverGradient: input.coverGradient ?? '',
          palette: input.palette ?? {},
        },
      });
      return mapEvent(created);
    },
    async updateEvent(id, patch) {
      const body: Record<string, unknown> = {};
      if (patch.title !== undefined) body.title = patch.title;
      if (patch.coupleNames !== undefined) body.coupleNames = patch.coupleNames;
      else if (patch.partnerA !== undefined || patch.partnerB !== undefined)
        body.coupleNames = hostNames(patch.partnerA ?? '', patch.partnerB);
      if (patch.eventKind !== undefined) body.eventKind = patch.eventKind || null;
      if (patch.cardContent !== undefined) body.cardContent = patch.cardContent;
      if (patch.dateStart !== undefined) body.dateStart = patch.dateStart;
      if (patch.venueName !== undefined) body.venueName = patch.venueName;
      if (patch.venueMapUrl !== undefined) body.venueMapUrl = patch.venueMapUrl || null;
      if (patch.dressCode !== undefined) body.dressCode = patch.dressCode || null;
      if (patch.languageDefault !== undefined) body.languageDefault = patch.languageDefault;
      if (patch.rsvpDeadline !== undefined) body.rsvpDeadline = patch.rsvpDeadline;
      if (patch.contributionTarget !== undefined)
        body.contributionTarget = patch.contributionTarget;
      if (patch.pledgesEnabled !== undefined) body.pledgesEnabled = patch.pledgesEnabled;
      if (patch.status !== undefined) body.status = patch.status;
      if (patch.committeePhone !== undefined) body.committeePhone = patch.committeePhone || null;
      if (patch.senderName !== undefined) body.senderName = patch.senderName || null;
      if (patch.greeting !== undefined) body.greeting = patch.greeting || null;
      if (
        patch.themeId !== undefined ||
        patch.coverGradient !== undefined ||
        patch.palette !== undefined
      )
        body.brandTheme = {
          themeId: patch.themeId,
          coverGradient: patch.coverGradient,
          palette: patch.palette,
        };
      return mapEvent(await call<ApiEvent>('PATCH', `/v1/events/${id}`, body));
    },
    archiveEvent: (id) => impl.updateEvent!(id, { status: 'archived' }),

    async createGateLink(eventId) {
      const r = await call<{ code: string; pin: string; url: string; expiresAt: string }>(
        'POST',
        `/v1/events/${encodeURIComponent(eventId)}/gate-links`,
      );
      return { code: r.code, pin: r.pin, url: r.url, expiresAt: r.expiresAt };
    },

    async listMembers(eventId) {
      const r = await call<{
        members: {
          userId: string;
          name: string;
          phoneE164: string;
          role: Member['role'];
          lastLoginAt: string | null;
        }[];
        invites: { id: string; name: string; phoneE164: string; role: Member['role'] }[];
      }>('GET', `/v1/events/${eventId}/members`);
      return [
        ...r.members.map((m): Member => ({
          id: m.userId,
          name: m.name,
          phoneE164: m.phoneE164,
          role: m.role,
          status: 'active',
          lastActiveAt: m.lastLoginAt,
        })),
        ...r.invites.map((i): Member => ({
          id: i.id,
          name: i.name,
          phoneE164: i.phoneE164,
          role: i.role,
          status: 'invited',
          lastActiveAt: null,
        })),
      ];
    },
    async inviteMember(eventId, input) {
      const r = await call<{ status: 'active' | 'invited' }>(
        'POST',
        `/v1/events/${eventId}/members`,
        { name: input.name, phone: input.phoneE164, role: input.role },
      );
      return {
        id: `${eventId}:${input.phoneE164}`,
        name: input.name,
        phoneE164: input.phoneE164,
        role: input.role,
        status: r.status,
        lastActiveAt: null,
      };
    },
    async revokeMember(eventId, memberId) {
      await call('DELETE', `/v1/events/${eventId}/members/${memberId}`);
      return {
        id: memberId,
        name: '',
        phoneE164: '',
        role: 'committee',
        status: 'revoked',
        lastActiveAt: null,
      };
    },

    async listGuests(eventId, query?: GuestQuery) {
      const all: Guest[] = [];
      let cursor: string | null = null;
      do {
        const page: { items: ApiGuest[]; nextCursor: string | null } = await call(
          'GET',
          `/v1/events/${eventId}/guests?limit=200${cursor ? `&cursor=${cursor}` : ''}`,
        );
        all.push(...page.items.map(mapGuest));
        cursor = page.nextCursor;
      } while (cursor && all.length < 10_000);
      return applyGuestQuery(all, query);
    },
    async listGroups(eventId) {
      return [
        ...new Set((await impl.listGuests!(eventId)).map((g) => g.groupLabel).filter(Boolean)),
      ].sort();
    },
    async getGuest(id) {
      return mapGuest(await call<ApiGuest>('GET', `/v1/guests/${id}`));
    },
    async createGuest(eventId, input: GuestInput) {
      const g = await call<ApiGuest>(
        'POST',
        `/v1/events/${eventId}/guests`,
        {
          displayName: input.displayName,
          phone: input.phone || null,
          groupLabel: input.groupLabel,
          partySizeAllowed: Number(input.partySizeAllowed ?? 1),
          cardKind: input.cardKind,
          hasSmartphone: input.hasSmartphone,
          language: input.language,
          inviteChannelPref: input.inviteChannelPref,
          notes: input.notes,
        },
        { 'idempotency-key': newKey() },
      );
      return mapGuest(g);
    },
    async updateGuest(id, patch) {
      return mapGuest(
        await call<ApiGuest>('PATCH', `/v1/guests/${id}`, {
          ...patch,
          phone: patch.phone === undefined ? undefined : patch.phone || null,
          partySizeAllowed:
            patch.partySizeAllowed === undefined ? undefined : Number(patch.partySizeAllowed),
        }),
      );
    },
    async deleteGuests(ids) {
      let deleted = 0;
      for (const id of ids) {
        await call('DELETE', `/v1/guests/${id}`);
        deleted++;
      }
      return { deleted };
    },
    async reissueGuest(id) {
      const r = await call<{ guest: ApiGuest }>('POST', `/v1/guests/${id}/reissue`, undefined, {
        'idempotency-key': newKey(),
      });
      return mapGuest(r.guest);
    },
    // Public guest card (no login; the card token is the credential).
    async getCard(token) {
      const r = await raw('GET', `/v1/c/${encodeURIComponent(token)}`, undefined, {}, false);
      if (r.status >= 400) return fail(r.status, r.json as never);
      return mapCard(token, r.json as unknown as ApiCard);
    },
    async rsvp(token, input) {
      const r = await raw('POST', `/v1/c/${encodeURIComponent(token)}/rsvp`, input, {}, false);
      if (r.status >= 400) return fail(r.status, r.json as never);
      return mapCard(token, r.json as unknown as ApiCard);
    },

    async importGuests(eventId, rows: ImportRowInput[], idempotencyKey, options?: ImportOptions) {
      const csv = toCsv([
        ['Jina', 'Simu', 'Kikundi', 'Idadi'],
        ...rows.map((r) => [r.displayName, r.phoneRaw, r.groupLabel, r.partySizeAllowed]),
      ]);
      const r = await call<{ created: number; skipped: number }>(
        'POST',
        `/v1/events/${eventId}/guests/import`,
        { csv, defaultCardKind: options?.cardKind },
        { 'idempotency-key': idempotencyKey.length >= 8 ? idempotencyKey : newKey() },
      );
      return { created: r.created, skipped: r.skipped } satisfies ImportResult;
    },
  };

  // ---- Sending (Phase 3). The API sends inline and returns a summary, so a "job" is built from it.
  const sendJobs = new Map<string, SendJob>();
  interface ApiSendSummary {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    byChannel: { whatsapp: number; sms: number };
    failures: { guestId: string; error: string }[];
  }
  async function runSend(
    eventId: string,
    target: unknown,
    channel: 'auto' | 'whatsapp' | 'sms',
    key: string,
    kind: 'invite' | 'reminder' = 'invite',
    cardKind?: CardKind,
  ): Promise<SendJob> {
    const sum = await call<ApiSendSummary>(
      'POST',
      `/v1/events/${encodeURIComponent(eventId)}/invitations/send`,
      { target, channel, kind, cardKind },
      { 'idempotency-key': key.length >= 8 ? key : newKey() },
    );
    const names = new Map<string, string>();
    if (sum.failures.length > 0)
      for (const g of await impl.listGuests!(eventId)) names.set(g.id, g.displayName);
    const job: SendJob = {
      id: newKey(),
      eventId,
      kind,
      cardKind: cardKind ?? null,
      total: sum.total,
      counts: { queued: 0, sent: sum.sent, delivered: 0, failed: sum.failed },
      byChannel: { whatsapp: sum.byChannel.whatsapp, sms: sum.byChannel.sms, print: 0 },
      failures: sum.failures.map((f) => ({
        guestId: f.guestId,
        guestName: names.get(f.guestId) ?? '',
        channel: 'sms',
        error: f.error,
      })),
      status: 'done',
      scheduledFor: null,
      createdAt: new Date().toISOString(),
    };
    sendJobs.set(job.id, job);
    return job;
  }
  // ---- Scheduled sends (ADR 030): the API stores a rule and sends when it comes due.
  interface ApiScheduledSend {
    id: string;
    eventId: string;
    kind: 'invite' | 'reminder';
    cardKind?: CardKind | null;
    scheduledFor: string;
    status: 'scheduled' | 'running' | 'done' | 'cancelled';
    recipientCount: number;
    summary: (ApiSendSummary & { error?: string }) | null;
    createdAt: string;
  }
  async function jobFromScheduled(s: ApiScheduledSend): Promise<SendJob> {
    const sum = s.summary;
    const names = new Map<string, string>();
    if (sum && sum.failures.length > 0)
      for (const g of await impl.listGuests!(s.eventId)) names.set(g.id, g.displayName);
    return {
      id: s.id,
      eventId: s.eventId,
      kind: s.kind,
      cardKind: s.cardKind ?? null,
      total: sum ? sum.total : s.recipientCount,
      counts: {
        queued: s.status === 'scheduled' || s.status === 'running' ? s.recipientCount : 0,
        sent: sum?.sent ?? 0,
        delivered: 0,
        failed: sum?.failed ?? 0,
      },
      byChannel: { whatsapp: sum?.byChannel.whatsapp ?? 0, sms: sum?.byChannel.sms ?? 0, print: 0 },
      failures: (sum?.failures ?? []).map((f) => ({
        guestId: f.guestId,
        guestName: names.get(f.guestId) ?? '',
        channel: 'sms' as const,
        error: f.error,
      })),
      status: s.status === 'scheduled' ? 'scheduled' : s.status === 'running' ? 'running' : 'done',
      scheduledFor: s.status === 'scheduled' ? s.scheduledFor : null,
      createdAt: s.createdAt,
    };
  }
  /** Which wedding each scheduled send belongs to, so a job id can be looked up again. */
  const scheduledEvent = new Map<string, string>();
  /** The API's audience words differ by kind: an invitation goes to those not yet invited, a reminder to those who have not answered. */
  const apiTarget = (a: SendRequest['audience'], kind: 'invite' | 'reminder') =>
    a.kind === 'selected'
      ? { guestIds: a.guestIds }
      : a.kind === 'group'
        ? { group: a.group }
        : kind === 'reminder'
          ? a.kind === 'all'
            ? 'all'
            : 'unanswered'
          : 'remaining';
  impl.sendInvitations = async (eventId, req) => {
    if (req.kind === 'thank_you')
      throw new RepositoryError('not_implemented', 'Thank-you messages are not available yet');
    if (req.channel === 'print')
      throw new RepositoryError('validation', 'Print cards are made as a PDF');
    const target = apiTarget(req.audience, req.kind);
    if (req.scheduleAt) {
      const s = await call<ApiScheduledSend>(
        'POST',
        `/v1/events/${encodeURIComponent(eventId)}/scheduled-sends`,
        {
          kind: req.kind,
          cardKind: req.cardKind,
          target,
          channel: req.channel,
          scheduledFor: req.scheduleAt,
        },
        { 'idempotency-key': req.idempotencyKey.length >= 8 ? req.idempotencyKey : newKey() },
      );
      scheduledEvent.set(s.id, eventId);
      return jobFromScheduled(s);
    }
    return runSend(eventId, target, req.channel, req.idempotencyKey, req.kind, req.cardKind);
  };
  impl.getSendJob = async (jobId) => {
    const j = sendJobs.get(jobId);
    if (j) return j;
    const eventId = scheduledEvent.get(jobId);
    const found = eventId
      ? (await impl.listScheduledSends!(eventId)).find((x) => x.id === jobId)
      : undefined;
    if (found) return found;
    throw new RepositoryError('not_found', 'Unknown job');
  };
  impl.listScheduledSends = async (eventId) => {
    const r = await call<{ items: ApiScheduledSend[] }>(
      'GET',
      `/v1/events/${encodeURIComponent(eventId)}/scheduled-sends`,
    );
    const items = r.items.filter((s) => s.status !== 'cancelled');
    for (const s of items) scheduledEvent.set(s.id, eventId);
    // waiting ones first, soonest first; then what already ran, newest first
    const waiting = items.filter((s) => s.status === 'scheduled').reverse();
    const rest = items.filter((s) => s.status !== 'scheduled');
    return Promise.all([...waiting, ...rest].map(jobFromScheduled));
  };
  impl.cancelScheduledSend = async (eventId, jobId) => {
    await call(
      'DELETE',
      `/v1/events/${encodeURIComponent(eventId)}/scheduled-sends/${encodeURIComponent(jobId)}`,
    );
    scheduledEvent.delete(jobId);
  };
  // What a send would do right now (ADR 031): the API applies its own audience rules, a sample text prices the SMS.
  impl.previewSend = async (eventId, req) => {
    if (req.kind === 'thank_you')
      throw new RepositoryError('not_implemented', 'Thank-you messages are not available yet');
    const kind = req.kind;
    const r = await call<{
      total: number;
      byChannel: Record<MessageChannel, number>;
      withoutPhone: number;
    }>('POST', `/v1/events/${encodeURIComponent(eventId)}/invitations/preview`, {
      target: apiTarget(req.audience, kind),
      channel: req.channel === 'print' ? 'auto' : req.channel,
      kind,
      cardKind: req.cardKind,
    });
    // A printed card is not sent: everyone the audience matches counts as printed.
    const byChannel =
      req.channel === 'print' ? { whatsapp: 0, sms: 0, print: r.total } : r.byChannel;
    const e = await impl.getEvent!(eventId);
    const text = buildSampleSms({
      kind:
        kind === 'reminder'
          ? 'reminder'
          : req.cardKind === 'contribution'
            ? 'contribution'
            : 'invite',
      locale: 'sw',
      partnerA: e.partnerA,
      partnerB: e.partnerB,
      eventKind: e.eventKind,
      sender: e.senderName,
      dateText: '14 Des 2026',
    });
    const cost = estimateSmsCostFor(text, byChannel.sms, e.currency);
    return {
      total: r.total,
      byChannel,
      smsSegments: cost.segments,
      estimatedSmsCost: cost.cost,
      withoutPhone: r.withoutPhone,
    };
  };
  impl.retryFailed = (jobId) => {
    const j = sendJobs.get(jobId);
    if (!j) return Promise.reject(new RepositoryError('not_found', 'Unknown job'));
    // "failed" is an invitation audience; a reminder is retried for the guests it failed for.
    if (j.kind === 'reminder') {
      const guestIds = j.failures.map((f) => f.guestId);
      if (guestIds.length === 0)
        return Promise.reject(new RepositoryError('validation', 'Nothing failed'));
      return runSend(j.eventId, { guestIds }, 'auto', newKey(), 'reminder');
    }
    return runSend(j.eventId, 'failed', 'auto', newKey(), 'invite', j.cardKind ?? undefined);
  };
  impl.sendPledgeReminders = async (eventId, guestIds) => {
    const r = await call<{ sent: number; failed: number; skipped: number }>(
      'POST',
      `/v1/events/${encodeURIComponent(eventId)}/pledges/reminders`,
      { guestIds },
    );
    return { queued: r.sent };
  };
  impl.listAuditLog = (eventId, before) =>
    call(
      'GET',
      `/v1/events/${encodeURIComponent(eventId)}/audit?limit=50${before ? `&before=${encodeURIComponent(before)}` : ''}`,
    );
  impl.getPledgeSummary = (eventId) =>
    call('GET', `/v1/events/${encodeURIComponent(eventId)}/pledges`);
  impl.upsertPledge = async (guestId, amount, note) => {
    await call('POST', `/v1/guests/${encodeURIComponent(guestId)}/pledges`, {
      amount,
      note: note || null,
    });
    return impl.getGuest!(guestId);
  };
  impl.recordManualPayment = (eventId, input, idempotencyKey) =>
    call(
      'POST',
      '/v1/payments/manual',
      {
        guestId: input.guestId,
        amount: input.amount,
        method: input.method,
        reference: input.reference || undefined,
        note: input.note || undefined,
      },
      { 'idempotency-key': idempotencyKey.length >= 8 ? idempotencyKey : newKey() },
    );
  impl.listPayments = async (eventId) =>
    (await call<{ items: Payment[] }>('GET', `/v1/events/${encodeURIComponent(eventId)}/payments`))
      .items;
  impl.startPayment = async (token, input, idempotencyKey) => {
    const r = await raw(
      'POST',
      `/v1/c/${encodeURIComponent(token)}/pay`,
      { amount: input.amount, phone: input.phoneE164, method: input.method },
      { 'idempotency-key': idempotencyKey.length >= 8 ? idempotencyKey : newKey() },
      false,
    );
    if (r.status >= 400) return fail(r.status, r.json as never);
    return r.json as unknown as PaymentStart;
  };
  impl.getPaymentStatus = async (reference) => {
    const r = await raw(
      'GET',
      `/v1/payments/${encodeURIComponent(reference)}/status`,
      undefined,
      {},
      false,
    );
    if (r.status >= 400) return fail(r.status, r.json as never);
    return r.json as unknown as PaymentStatusView;
  };
  impl.exportCsv = async (eventId, kind) => {
    if (kind !== 'pledges' && kind !== 'payments')
      throw new RepositoryError('not_implemented', 'That export is not available yet');
    const send = () =>
      doFetch(`${baseUrl}/v1/events/${encodeURIComponent(eventId)}/exports/${kind}.csv`, {
        headers: tokens.get() ? { authorization: `Bearer ${tokens.get()!.accessToken}` } : {},
      });
    let res: Response;
    try {
      res = await send();
      if (res.status === 401 && tokens.get() && (await refreshTokens())) res = await send();
    } catch {
      throw new RepositoryError('offline', 'No network');
    }
    if (!res.ok) return fail(res.status, (await res.json().catch(() => null)) as never);
    return res.blob();
  };
  impl.requestCardsPdf = async (eventId, opts) => {
    const format =
      opts.layout === 'a4-4up'
        ? 'a4x4'
        : opts.layout === 'test-sheet'
          ? 'test'
          : opts.format === 'A5'
            ? 'a5'
            : 'a6';
    const send = () =>
      doFetch(`${baseUrl}/v1/events/${encodeURIComponent(eventId)}/cards/pdf`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(tokens.get() ? { authorization: `Bearer ${tokens.get()!.accessToken}` } : {}),
        },
        body: JSON.stringify({ format, guestIds: opts.guestIds }),
      });
    let res: Response;
    try {
      res = await send();
      if (res.status === 401 && tokens.get() && (await refreshTokens())) res = await send();
    } catch {
      throw new RepositoryError('offline', 'No network');
    }
    if (!res.ok) return fail(res.status, (await res.json().catch(() => null)) as never);
    return res.blob();
  };

  // Anything the API does not provide yet rejects with `not_implemented`.
  return new Proxy(impl as Repository, {
    get(target, prop: string) {
      if (prop === 'then') return undefined;
      return (target as unknown as Record<string, unknown>)[prop] ?? notImplemented(prop);
    },
  });
}
