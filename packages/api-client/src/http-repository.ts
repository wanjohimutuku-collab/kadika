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
  Session,
  WeddingEvent,
} from './types';
import { toCsv } from './domain/import';

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
  rsvpPartySize?: number | null;
  createdAt: string;
  updatedAt: string;
}

const notImplemented = (name: string) => () =>
  Promise.reject(new RepositoryError('not_implemented', `${name} is not available on the API yet`));

function mapEvent(e: ApiEvent): WeddingEvent {
  const [a = '', b = ''] = e.coupleNames.split('&').map((s) => s.trim());
  const empty = {
    invited: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    confirmed: 0,
    declined: 0,
    attended: 0,
    headcountConfirmed: 0,
    headcountAttended: 0,
    pledgedTzs: 0,
    collectedTzs: 0,
    guestsWithBalance: 0,
    failedMessages: 0,
    featurePhoneGuests: 0,
  };
  return {
    id: e.id,
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
    rsvpDeadline: e.rsvpDeadline,
    contributionTargetTzs: e.contributionTargetTzs ?? 0,
    senderName: `Kamati ya Harusi ya ${e.coupleNames}`,
    committeePhone: '',
    pledgesEnabled: true,
    requirePledgeBeforeCard: false,
    greeting: '',
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
        | 'partnerA'
        | 'partnerB'
        | 'senderName'
        | 'committeePhone'
        | 'pledgesEnabled'
        | 'greeting'
        | 'extraNote'
        | 'themeId'
        | 'coverGradient'
      > & { brandTheme: Record<string, unknown> | null })
    | null;
  guest: CardView['guest'];
  qrPayload: string | null;
  rsvp: CardView['rsvp'];
  rsvpOpen: boolean;
  eventPassed: boolean;
}

function mapCard(token: string, c: ApiCard): CardView {
  const e = c.event;
  const theme = (e?.brandTheme ?? {}) as {
    themeId?: WeddingEvent['themeId'];
    coverGradient?: string;
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
          rsvpDeadline: e.rsvpDeadline,
          senderName: `Kamati ya Harusi ya ${e.coupleNames}`,
          committeePhone: '',
          pledgesEnabled: false,
          greeting: '',
          extraNote: '',
          timezone: 'Africa/Dar_es_Salaam',
        }
      : null,
    guest: c.guest,
    qrPayload: c.qrPayload,
    rsvp: c.rsvp,
    pledge: null,
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
    channelLast: null,
    lastMessageFailed: false,
    checkedInAt: null,
    partyAdmitted: 0,
    pledge: null,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

/**
 * Real `/v1` client for what Phase 1 provides: auth, events, members and guests. Everything the
 * API does not have yet (sending, pledges, gate, reports, public card) rejects with
 * `not_implemented`; the web app keeps using the mock for those until their phases land.
 */
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
      return (await call<{ items: ApiEvent[] }>('GET', '/v1/events')).items.map(mapEvent);
    },
    async getEvent(id) {
      return mapEvent(await call<ApiEvent>('GET', `/v1/events/${id}`));
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
        brandTheme: { themeId: input.themeId, coverGradient: input.coverGradient ?? '' },
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
      if (patch.themeId !== undefined || patch.coverGradient !== undefined)
        body.brandTheme = { themeId: patch.themeId, coverGradient: patch.coverGradient };
      return mapEvent(await call<ApiEvent>('PATCH', `/v1/events/${id}`, body));
    },
    archiveEvent: (id) => impl.updateEvent!(id, { status: 'archived' }),

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

  // Anything the API does not provide yet rejects with `not_implemented`.
  return new Proxy(impl as Repository, {
    get(target, prop: string) {
      if (prop === 'then') return undefined;
      return (target as unknown as Record<string, unknown>)[prop] ?? notImplemented(prop);
    },
  });
}
