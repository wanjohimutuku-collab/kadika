import { sanitizeOverrides } from '@harusi/ui-tokens/palette';
import type { EventInput, GuestInput } from '@harusi/schemas';
import { RepositoryError, type RepositoryErrorCode } from './errors';
import type { Repository } from './repository';
import { applyGuestQuery } from './domain/guest-filter';
import type {
  CardView,
  Guest,
  GuestQuery,
  ImportResult,
  ImportRowInput,
  Member,
  Payment,
  PaymentStart,
  PaymentStatusView,
  SendJob,
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
  timezone: string;
  status: WeddingEvent['status'];
  rsvpDeadline: string | null;
  contributionTargetTzs: number | null;
  plan: 'free' | 'paid';
  brandTheme: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  myRole?: 'owner' | 'committee' | 'gate';
}

interface ApiGuest {
  id: string;
  eventId: string;
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
  pledgedTzs?: number;
  collectedTzs?: number;
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
    pledgedTzs: s?.pledgedTzs ?? 0,
    collectedTzs: s?.collectedTzs ?? 0,
    guestsWithBalance: s?.guestsWithBalance ?? 0,
    failedMessages: s?.failedMessages ?? 0,
    featurePhoneGuests: s?.featurePhoneGuests ?? 0,
  };
}

function mapEvent(e: ApiEvent, stats: ApiStats | null = null): WeddingEvent {
  const [a = '', b = ''] = e.coupleNames.split('&').map((s) => s.trim());
  const empty = mapStats(stats);
  return {
    id: e.id,
    myRole: e.myRole,
    title: e.title,
    partnerA: a,
    partnerB: b,
    coupleNames: e.coupleNames,
    dateStart: e.dateStart,
    venueName: e.venueName ?? '',
    venueMapUrl: e.venueMapUrl ?? '',
    dressCode: e.dressCode ?? '',
    languageDefault: e.languageDefault,
    timezone: 'Africa/Dar_es_Salaam',
    status: e.status,
    themeId: ((e.brandTheme as { themeId?: WeddingEvent['themeId'] } | null)?.themeId ??
      'emerald-gold') as WeddingEvent['themeId'],
    coverGradient: String((e.brandTheme as { coverGradient?: string } | null)?.coverGradient ?? ''),
    palette: sanitizeOverrides((e.brandTheme as { palette?: unknown } | null)?.palette),
    rsvpDeadline: e.rsvpDeadline,
    contributionTargetTzs: e.contributionTargetTzs ?? 0,
    senderName: e.senderName || `Kamati ya Harusi ya ${e.coupleNames}`,
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
  event:
    | (Omit<
        NonNullable<CardView['event']>,
        'partnerA' | 'partnerB' | 'extraNote' | 'themeId' | 'coverGradient' | 'palette'
      > & { brandTheme: Record<string, unknown> | null })
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
    event: e
      ? {
          id: e.id,
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
          senderName: e.senderName || `Kamati ya Harusi ya ${e.coupleNames}`,
          committeePhone: e.committeePhone ?? '',
          pledgesEnabled: e.pledgesEnabled ?? false,
          greeting: e.greeting ?? '',
          extraNote: '',
          timezone: 'Africa/Dar_es_Salaam',
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
        coupleNames: `${input.partnerA} & ${input.partnerB}`,
        dateStart: input.dateStart,
        venueName: input.venueName,
        venueMapUrl: input.venueMapUrl || null,
        dressCode: input.dressCode || null,
        languageDefault: input.languageDefault,
        rsvpDeadline: input.rsvpDeadline || null,
        contributionTargetTzs: input.contributionTargetTzs ?? null,
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
      if (patch.dateStart !== undefined) body.dateStart = patch.dateStart;
      if (patch.venueName !== undefined) body.venueName = patch.venueName;
      if (patch.venueMapUrl !== undefined) body.venueMapUrl = patch.venueMapUrl || null;
      if (patch.dressCode !== undefined) body.dressCode = patch.dressCode || null;
      if (patch.languageDefault !== undefined) body.languageDefault = patch.languageDefault;
      if (patch.rsvpDeadline !== undefined) body.rsvpDeadline = patch.rsvpDeadline;
      if (patch.contributionTargetTzs !== undefined)
        body.contributionTargetTzs = patch.contributionTargetTzs;
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

    async importGuests(eventId, rows: ImportRowInput[], idempotencyKey) {
      const csv = toCsv([
        ['Jina', 'Simu', 'Kikundi', 'Idadi'],
        ...rows.map((r) => [r.displayName, r.phoneRaw, r.groupLabel, r.partySizeAllowed]),
      ]);
      const r = await call<{ created: number; skipped: number }>(
        'POST',
        `/v1/events/${eventId}/guests/import`,
        { csv },
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
  ): Promise<SendJob> {
    const sum = await call<ApiSendSummary>(
      'POST',
      `/v1/events/${encodeURIComponent(eventId)}/invitations/send`,
      { target, channel },
      { 'idempotency-key': key.length >= 8 ? key : newKey() },
    );
    const names = new Map<string, string>();
    if (sum.failures.length > 0)
      for (const g of await impl.listGuests!(eventId)) names.set(g.id, g.displayName);
    const job: SendJob = {
      id: newKey(),
      eventId,
      kind: 'invite',
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
  impl.sendInvitations = (eventId, req) => {
    if (req.kind !== 'invite')
      return Promise.reject(new RepositoryError('not_implemented', 'Only invitations can be sent'));
    if (req.scheduleAt)
      return Promise.reject(
        new RepositoryError('not_implemented', 'Scheduled sends are not available'),
      );
    if (req.channel === 'print')
      return Promise.reject(new RepositoryError('validation', 'Print cards are made as a PDF'));
    const a = req.audience;
    const target =
      a.kind === 'selected'
        ? { guestIds: a.guestIds }
        : a.kind === 'group'
          ? { group: a.group }
          : 'remaining';
    return runSend(eventId, target, req.channel, req.idempotencyKey);
  };
  impl.getSendJob = (jobId) => {
    const j = sendJobs.get(jobId);
    return j ? Promise.resolve(j) : Promise.reject(new RepositoryError('not_found', 'Unknown job'));
  };
  impl.retryFailed = (jobId) => {
    const j = sendJobs.get(jobId);
    if (!j) return Promise.reject(new RepositoryError('not_found', 'Unknown job'));
    return runSend(j.eventId, 'failed', 'auto', newKey());
  };
  impl.listAuditLog = (eventId, before) =>
    call(
      'GET',
      `/v1/events/${encodeURIComponent(eventId)}/audit?limit=50${before ? `&before=${encodeURIComponent(before)}` : ''}`,
    );
  impl.getPledgeSummary = (eventId) =>
    call('GET', `/v1/events/${encodeURIComponent(eventId)}/pledges`);
  impl.upsertPledge = async (guestId, amountTzs, note) => {
    await call('POST', `/v1/guests/${encodeURIComponent(guestId)}/pledges`, {
      amountTzs,
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
        amountTzs: input.amountTzs,
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
      { amountTzs: input.amountTzs, phone: input.phoneE164, method: input.method },
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
