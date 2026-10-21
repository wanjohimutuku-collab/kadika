import {
  cardContentSchema,
  eventInputSchema,
  guestInputSchema,
  manualPaymentSchema,
  normalizeTzPhone,
  generateShortCode,
  type EventInput,
  type GuestInput,
  type InvitationStatus,
  type ManualPaymentInput,
  type Country,
  type MessageChannel,
  type PaymentMethod,
  type PilotMetrics,
  type RsvpInput,
} from '@harusi/schemas';
import { RepositoryError } from '../errors';
import { defaultSender } from '@harusi/schemas';
import {
  paletteContrastIssues,
  resolvePalette,
  sanitizeOverrides,
  type PaletteOverrides,
} from '@harusi/ui-tokens/palette';

/** Same rule as the API: overrides must keep the card readable (WCAG, ADR 006/015). */
function checkedPalette(themeId: string, raw: PaletteOverrides | undefined): PaletteOverrides {
  const clean = sanitizeOverrides(raw);
  const issues = paletteContrastIssues(resolvePalette(themeId, clean));
  if (issues.length)
    throw new RepositoryError('validation', 'palette.contrast', {
      pairs: issues.map((i) => i.pair),
    });
  return clean;
}
import type { Repository } from '../repository';
import type {
  Activity,
  AuditEntry,
  CardView,
  EventReport,
  EventStats,
  GateLink,
  GateOverview,
  Guest,
  GuestQuery,
  ImportResult,
  ImportRowInput,
  Member,
  MessageLogEntry,
  Payment,
  PaymentStart,
  PaymentStatusView,
  PledgeSummaryView,
  AuditPage,
  ScanEntry,
  SendJob,
  SendPreview,
  SendRequest,
  Session,
  WeddingEvent,
  User,
  DataRequest,
  OpsAuditEntry,
  OpsEvent,
  OpsGuestHit,
  OpsLookupResult,
  OpsOrganizer,
  OpsOverview,
  OpsPayment,
  OpsUsage,
  StaffPermission,
} from '../types';
import { STAFF_PERMISSIONS } from '../types';
import { advanceStatus, funnelCounts, STATUS_RANK } from '../domain/funnel';
import { applyGuestQuery } from '../domain/guest-filter';
import { pledgeTotals, summarizePledge } from '../domain/pledge';
import { buildInviteSms, estimateSmsCostFor } from '../domain/sms';
import { toCsv } from '@harusi/schemas/import';
import { mockQrPayload } from '../domain/token';
import {
  MESSAGING_PROVIDERS,
  MESSAGING_ROUTES,
  providerFields,
  type MessagingRoute,
  type MessagingRouteView,
  type MessagingSettingsInput,
  type MessagingSettingsView,
} from '@harusi/schemas/messaging-settings';
import {
  PAYMENT_PROVIDERS,
  paymentProviderFields,
  type PaymentRoute,
  type PaymentRouteView,
  type PaymentSettingsInput,
  type PaymentSettingsView,
} from '@harusi/schemas/payment-settings';
import {
  BODY_FONT_KEYS,
  BUSINESS_NAME_MAX,
  DEFAULT_BRANDING,
  DISPLAY_FONT_KEYS,
  LOGO_MIMES,
  MAX_LOGO_BYTES,
  SVG_REASON_TEXT,
  TAGLINE_MAX,
  validateSvg,
  type BrandingInput,
  type BrandingView,
  type LogoMime,
  type PublicBranding,
} from '@harusi/schemas/branding';
import { contrastRatio, lightColors, normalizeHex, themeContrastIssues } from '@harusi/ui-tokens';
import { MockControls } from './controls';
import { addCardFields, renameLegacyMoneyKeys } from './migrate';
import { Rng } from './prng';
import {
  createSeedState,
  DAY,
  HOUR,
  type EventRecord,
  type GuestRecord,
  type JobRecord,
  type JobRecipient,
  type MockState,
} from './state';

const STATE_KEY = 'harusi.mock.v1';
export const MOCK_OTP = '123456';
/** Mock second factor for staff (an authenticator code in production). */
export const MOCK_STAFF_CODE = '654321';
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 10 * 60_000;
const OTP_RESEND_S = 30;
const PAY_TIMEOUT_MS = 60_000;

/** `send`: needs a network but is exempt from call-level failure injection — injected failures show up as failed messages instead. */
type CallKind = 'read' | 'write' | 'card-read' | 'online-only' | 'send' | 'local';

export interface MockRepositoryOptions {
  storage?: Storage | null;
  controls?: MockControls;
  /** Simulated latency 200–600 ms (×4 when the network is "slow"). Default true in browsers. */
  latency?: boolean;
  now?: () => number;
  random?: () => number;
  baseUrl?: string;
  initialState?: MockState;
}

const iso = (ms: number) => new Date(ms).toISOString();

export class MockRepository implements Repository {
  readonly controls: MockControls;
  private state: MockState;
  private storage: Storage | null;
  private latency: boolean;
  private now: () => number;
  private random: () => number;
  private rng: Rng;
  private baseUrl: string;
  private changeListeners = new Set<() => void>();

  constructor(opts: MockRepositoryOptions = {}) {
    this.storage = opts.storage ?? null;
    this.controls = opts.controls ?? new MockControls(this.storage);
    this.latency = opts.latency ?? false;
    this.now = opts.now ?? Date.now;
    this.random = opts.random ?? Math.random;
    this.rng = new Rng(this.random);
    this.baseUrl = opts.baseUrl ?? 'https://kadisasa.example';
    this.state = opts.initialState ?? this.load() ?? createSeedState({ now: this.now() });
    this.applyCardOverlays();
  }

  /**
   * The light guest card (apps/web `light-card`) has no repository: before this state exists it
   * stores RSVPs as `harusi.card.overlay.<token>`. Fold them in so the console sees them.
   */
  private applyCardOverlays(): void {
    const s = this.storage;
    if (!s || typeof s.length !== 'number') return;
    const prefix = 'harusi.card.overlay.';
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
    let changed = false;
    for (const k of keys) {
      try {
        const o = JSON.parse(s.getItem(k) ?? 'null') as {
          status: 'confirmed' | 'declined';
          rsvpPartySize: number;
          at: string;
        } | null;
        const g = o && this.state.guests.find((x) => x.token === k.slice(prefix.length));
        if (o && g && (o.status === 'confirmed' || o.status === 'declined')) {
          g.status = o.status;
          g.rsvpPartySize = o.rsvpPartySize;
          g.updatedAt = o.at;
          g.timeline = { ...g.timeline, [o.status]: o.at };
          delete g.timeline[o.status === 'confirmed' ? 'declined' : 'confirmed'];
          changed = true;
        }
      } catch {
        /* ignore a corrupt overlay */
      }
      s.removeItem(k);
    }
    if (changed) this.persist();
  }

  // ---------------------------------------------------------------- infrastructure

  private load(): MockState | null {
    try {
      const raw = this.storage?.getItem(STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { version?: number };
      if (parsed.version === 5) return parsed as MockState;
      // v4 predates card kinds and card content (ADR 029); v3 also the currency-neutral money names
      // (ADR 025, Phase 1b). Both are upgraded in place so a returning visitor keeps their demo data.
      if (parsed.version === 4) return addCardFields(parsed as unknown as MockState);
      if (parsed.version === 3)
        return addCardFields(renameLegacyMoneyKeys(parsed) as unknown as MockState);
      return null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    for (const l of this.changeListeners) l();
    if (!this.storage) return;
    // Synchronous on purpose: a debounced save can be lost if the guest reloads or closes the tab
    // right after answering (seen in e2e). Serialising the whole state takes a few ms.
    try {
      this.storage.setItem(STATE_KEY, JSON.stringify(this.state));
    } catch {
      // quota exceeded or storage blocked: keep working in memory
    }
  }

  /** Notified after every mutation (the console uses it to invalidate queries). */
  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** Restores the deterministic seed (dev panel "Rudisha data"). */
  reset(): void {
    const sessionUserId = this.state.sessionUserId;
    this.state = createSeedState({ now: this.now() });
    this.state.sessionUserId = sessionUserId;
    this.controls.set({ pending: [], lastSyncAt: null });
    this.persist();
  }

  /** Card token of a seeded guest, for the dev panel's "open sample card". */
  sampleToken(status: InvitationStatus = 'delivered'): string {
    const ev = this.state.events[0]!;
    const g =
      this.state.guests.find(
        (x) => x.eventId === ev.id && x.status === status && x.phoneE164 && !x.deletedAt,
      ) ?? this.state.guests[0]!;
    return g.token;
  }

  /** Retired token of the seeded reissued guest (old link → "imebadilishwa"). */
  sampleRetiredToken(): string | null {
    return Object.keys(this.state.retiredTokens)[0] ?? null;
  }

  private async delay(): Promise<void> {
    if (!this.latency) return;
    const slow = this.controls.get().network === 'slow' ? 4 : 1;
    const ms = (200 + this.random() * 400) * slow;
    await new Promise((r) => setTimeout(r, ms));
  }

  private async run<T>(kind: CallKind, label: string, fn: () => T): Promise<T> {
    await this.delay();
    const c = this.controls.get();
    const offline = c.network === 'offline';
    if (offline && (kind === 'card-read' || kind === 'online-only' || kind === 'send'))
      throw new RepositoryError('offline', 'No network');
    if (
      kind !== 'local' &&
      kind !== 'send' &&
      !offline &&
      c.failureRate > 0 &&
      this.random() < c.failureRate
    ) {
      throw new RepositoryError('server', 'Injected failure (dev panel)');
    }
    const result = fn();
    if (kind === 'write') {
      if (offline) {
        this.controls.set({
          pending: [...c.pending, { id: this.rng.hex(8), label, at: iso(this.now()) }],
        });
      }
      this.persist();
    }
    return result;
  }

  /** "Sawazisha sasa": flushes the offline queue (writes were applied locally already). */
  async syncNow(): Promise<{ synced: number }> {
    await this.delay();
    const c = this.controls.get();
    if (c.network === 'offline') throw new RepositoryError('offline', 'No network');
    const synced = c.pending.length;
    this.controls.set({ pending: [], lastSyncAt: iso(this.now()) });
    return { synced };
  }

  private remember<T>(key: string, compute: () => T): T {
    const existing = this.state.idempotency[key];
    if (existing !== undefined) return JSON.parse(existing) as T;
    const value = compute();
    this.state.idempotency[key] = JSON.stringify(value);
    return value;
  }

  // ---------------------------------------------------------------- lookups and projections

  private event(eventId: string): EventRecord {
    const e = this.state.events.find((x) => x.id === eventId && !x.deletedAt);
    if (!e) throw new RepositoryError('not_found', 'Event not found');
    return e;
  }

  private guestRecord(guestId: string): GuestRecord {
    const g = this.state.guests.find((x) => x.id === guestId && !x.deletedAt);
    if (!g) throw new RepositoryError('not_found', 'Guest not found');
    return g;
  }

  private paidByGuest(eventId: string): Map<string, number> {
    const m = new Map<string, number>();
    for (const p of this.state.payments) {
      if (p.eventId === eventId && p.status === 'success')
        m.set(p.guestId, (m.get(p.guestId) ?? 0) + p.amount);
    }
    return m;
  }

  private lastMessageByGuest(eventId: string): Map<string, MessageLogEntry> {
    const m = new Map<string, MessageLogEntry>();
    for (const msg of this.state.messages) {
      if (msg.eventId !== eventId || msg.kind === 'test') continue;
      const prev = m.get(msg.guestId);
      if (!prev || prev.createdAt <= msg.createdAt) m.set(msg.guestId, msg);
    }
    return m;
  }

  private toGuest(
    g: GuestRecord,
    paidBy: Map<string, number>,
    last: Map<string, MessageLogEntry>,
  ): Guest {
    const paid = paidBy.get(g.id) ?? 0;
    const { token: _t, deletedAt: _d, pledgeAmount, pledgeWaived, ...rest } = g;
    return {
      ...rest,
      lastMessageFailed: last.get(g.id)?.status === 'failed',
      pledge:
        pledgeAmount != null
          ? summarizePledge(pledgeAmount, paid, pledgeWaived)
          : paid > 0
            ? summarizePledge(0, paid)
            : null,
    };
  }

  private guestsOf(eventId: string): GuestRecord[] {
    return this.state.guests.filter((g) => g.eventId === eventId && !g.deletedAt);
  }

  private stats(eventId: string): EventStats {
    // The invitation funnel counts invitation cards only; contribution cards are not attendees (ADR 029).
    const guests = this.guestsOf(eventId).filter((g) => g.cardKind === 'invitation');
    const funnel = funnelCounts(guests.map((g) => g.status));
    const paid = this.paidByGuest(eventId);
    const last = this.lastMessageByGuest(eventId);
    const totals = pledgeTotals(
      guests.map((g) =>
        g.pledgeAmount != null
          ? summarizePledge(g.pledgeAmount, paid.get(g.id) ?? 0, g.pledgeWaived)
          : null,
      ),
    );
    const collected = [...paid.values()].reduce((a, b) => a + b, 0);
    return {
      invited: funnel.created,
      sent: funnel.sent,
      delivered: funnel.delivered,
      opened: funnel.opened,
      confirmed: funnel.confirmed,
      declined: guests.filter((g) => g.status === 'declined').length,
      attended: funnel.checked_in,
      headcountConfirmed: guests.reduce(
        (n, g) =>
          n + (g.status === 'confirmed' || g.status === 'checked_in' ? (g.rsvpPartySize ?? 1) : 0),
        0,
      ),
      headcountAttended: guests.reduce((n, g) => n + g.partyAdmitted, 0),
      pledged: totals.pledged,
      collected,
      guestsWithBalance: totals.guestsPartial + totals.guestsUnpaid,
      failedMessages: guests.filter((g) => last.get(g.id)?.status === 'failed').length,
      featurePhoneGuests: guests.filter((g) => !g.hasSmartphone).length,
    };
  }

  private toEvent(e: EventRecord): WeddingEvent {
    const { deletedAt: _d, ...rest } = e;
    return { ...rest, stats: this.stats(e.id) };
  }

  private audit(guestId: string, action: string, details: string): AuditEntry {
    const entry: AuditEntry = {
      id: this.rng.uuid(),
      at: iso(this.now()),
      actorName: this.sessionUser()?.name ?? 'Mfumo',
      action,
      details,
    };
    (this.state.audit[guestId] ??= []).unshift(entry);
    return entry;
  }

  private sessionUser() {
    const u = this.state.users.find((x) => x.id === this.state.sessionUserId) ?? null;
    // Staff are only signed in after the second factor.
    if (u?.roleGlobal === 'admin' && !this.state.staffVerified) return null;
    return u;
  }

  private requireSession() {
    const u = this.sessionUser();
    if (!u) throw new RepositoryError('unauthorized', 'Sign in required');
    if (u.status === 'suspended') throw new RepositoryError('forbidden', 'suspended');
    if (this.controls.get().role === 'gate')
      throw new RepositoryError('forbidden', 'Gate agents have no console access');
    return u;
  }

  private uniqueShortCode(eventId: string): string {
    const used = new Set(this.guestsOf(eventId).map((g) => g.shortCode));
    for (;;) {
      const c = generateShortCode(this.random);
      if (!used.has(c)) return c;
    }
  }

  // ---------------------------------------------------------------- auth

  requestOtp(phoneE164: string): Promise<{ resendAfterSeconds: number }> {
    return this.run('online-only', 'otp', () => {
      const rec = (this.state.otp[phoneE164] ??= {
        attempts: 0,
        lockedUntil: null,
        lastRequestedAt: 0,
      });
      const now = this.now();
      if (rec.lockedUntil && rec.lockedUntil > now)
        throw new RepositoryError('locked', 'Too many attempts', { until: iso(rec.lockedUntil) });
      const wait = Math.ceil((rec.lastRequestedAt + OTP_RESEND_S * 1000 - now) / 1000);
      if (wait > 0)
        throw new RepositoryError('rate_limited', 'Wait before requesting a new code', {
          retryAfterSeconds: wait,
        });
      rec.lastRequestedAt = now;
      this.persist();
      return { resendAfterSeconds: OTP_RESEND_S };
    });
  }

  verifyOtp(phoneE164: string, code: string): Promise<Session> {
    return this.run('online-only', 'otp', () => {
      const rec = (this.state.otp[phoneE164] ??= {
        attempts: 0,
        lockedUntil: null,
        lastRequestedAt: 0,
      });
      const now = this.now();
      if (rec.lockedUntil && rec.lockedUntil > now)
        throw new RepositoryError('locked', 'Too many attempts', { until: iso(rec.lockedUntil) });
      if (code !== MOCK_OTP) {
        rec.attempts += 1;
        if (rec.attempts >= OTP_MAX_ATTEMPTS) {
          rec.lockedUntil = now + OTP_LOCK_MS;
          rec.attempts = 0;
          this.persist();
          throw new RepositoryError('locked', 'Too many attempts', { until: iso(rec.lockedUntil) });
        }
        this.persist();
        throw new RepositoryError('validation', 'Wrong code', {
          attemptsLeft: OTP_MAX_ATTEMPTS - rec.attempts,
        });
      }
      rec.attempts = 0;
      let user = this.state.users.find((u) => u.phoneE164 === phoneE164);
      if (user?.status === 'suspended') throw new RepositoryError('forbidden', 'suspended');
      const nowIso = iso(now);
      if (!user) {
        user = {
          id: `user-${this.rng.hex(8)}`,
          name: '',
          phoneE164,
          roleGlobal: 'user',
          status: 'active',
          suspendedReason: null,
          createdAt: nowIso,
          lastLoginAt: null,
        };
        this.state.users.push(user);
      }
      user.lastLoginAt = nowIso;
      this.state.staffVerified = false;
      // Accept pending team invitations for this phone (Timu → "Amealikwa" becomes active).
      for (const list of Object.values(this.state.members)) {
        for (const m of list) {
          if (m.phoneE164 !== phoneE164 || m.status === 'revoked') continue;
          if (m.status === 'invited') m.status = 'active';
          m.userId = user.id;
          m.lastActiveAt = nowIso;
          if (!user.name && m.name) user.name = m.name;
        }
      }
      this.state.sessionUserId = user.id;
      this.persist();
      if (user.roleGlobal === 'admin') {
        return {
          user,
          role: 'owner',
          expiresAt: iso(this.now() + 30 * DAY),
          needsSecondFactor: true,
        };
      }
      return this.session()!;
    });
  }

  verifyStaffSecondFactor(code: string): Promise<Session> {
    return this.run('online-only', 'otp', () => {
      const u = this.state.users.find((x) => x.id === this.state.sessionUserId);
      if (!u || u.roleGlobal !== 'admin')
        throw new RepositoryError('unauthorized', 'Sign in required');
      if (code !== MOCK_STAFF_CODE) throw new RepositoryError('validation', 'Wrong code');
      this.state.staffVerified = true;
      this.persist();
      return this.session()!;
    });
  }

  private session(): Session | null {
    const user = this.sessionUser();
    if (!user) return null;
    return { user, role: this.controls.get().role, expiresAt: iso(this.now() + 30 * DAY) };
  }

  async getSession(): Promise<Session | null> {
    return this.session();
  }

  async signOut(): Promise<void> {
    this.state.sessionUserId = null;
    this.state.staffVerified = false;
    this.persist();
  }

  updateProfile(patch: { name: string }): Promise<Session> {
    return this.run('write', 'profile', () => {
      const u = this.requireSession();
      u.name = patch.name.trim();
      return this.session()!;
    });
  }

  requestDataExport(): Promise<{ requestedAt: string }> {
    return this.run('online-only', 'export', () => this.createDataRequest('export'));
  }

  requestAccountDeletion(): Promise<{ requestedAt: string }> {
    return this.run('online-only', 'delete-account', () => this.createDataRequest('deletion'));
  }

  private createDataRequest(kind: DataRequest['kind']): { requestedAt: string } {
    const u = this.requireSession();
    const requestedAt = iso(this.now());
    this.state.dataRequests.unshift({
      id: `dr-${this.rng.hex(8)}`,
      userId: u.id,
      userName: u.name || u.phoneE164,
      phoneE164: u.phoneE164,
      kind,
      status: 'open',
      requestedAt,
      resolvedAt: null,
      resolvedBy: null,
      note: '',
    });
    this.persist();
    return { requestedAt };
  }

  // ---------------------------------------------------------------- events

  listEvents(): Promise<WeddingEvent[]> {
    return this.run('read', 'events', () => {
      const u = this.requireSession();
      return this.state.events
        .filter(
          (e) =>
            !e.deletedAt &&
            (this.state.members[e.id] ?? []).some(
              (m) => m.userId === u.id && m.status === 'active',
            ),
        )
        .sort((a, b) => b.dateStart.localeCompare(a.dateStart))
        .map((e) => this.toEvent(e));
    });
  }

  getEvent(eventId: string): Promise<WeddingEvent> {
    return this.run('read', 'event', () => {
      this.requireSession();
      return this.toEvent(this.event(eventId));
    });
  }

  createEvent(input: EventInput): Promise<WeddingEvent> {
    return this.run('write', 'Harusi mpya', () => {
      const u = this.requireSession();
      const v = eventInputSchema.parse(input);
      // The demo backend only models Tanzania (ADR 025); Kenya needs the real API with the flag on.
      if (v.country !== 'TZ')
        throw new RepositoryError('validation', 'Country is not available', { field: 'country' });
      const now = iso(this.now());
      const e: EventRecord = {
        id: this.rng.uuid(),
        title: v.title,
        cardContent: v.cardContent ?? { sender: { kind: 'family' } },
        eventKind: v.eventKind,
        partnerA: v.partnerA,
        partnerB: v.partnerB,
        coupleNames: [v.partnerA, v.partnerB].filter(Boolean).join(' & '),
        dateStart: new Date(v.dateStart).toISOString(),
        venueName: v.venueName,
        venueMapUrl: v.venueMapUrl,
        dressCode: v.dressCode,
        languageDefault: v.languageDefault,
        country: 'TZ',
        currency: 'TZS',
        timezone: 'Africa/Dar_es_Salaam',
        status: 'active',
        themeId: v.themeId,
        coverGradient: v.coverGradient,
        palette: checkedPalette(v.themeId, v.palette),
        rsvpDeadline: v.rsvpDeadline ? new Date(v.rsvpDeadline).toISOString() : null,
        contributionTarget: v.contributionTarget,
        senderName: defaultSender(
          v.eventKind,
          [v.partnerA, v.partnerB].filter(Boolean).join(' & '),
        ),
        committeePhone: u.phoneE164,
        pledgesEnabled: true,
        requirePledgeBeforeCard: false,
        greeting: '',
        extraNote: '',
        reminders: { t14: true, t7: true, t1: true },
        whatsappFallbackHours: 6,
        plan: 'free',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      this.state.events.push(e);
      this.state.members[e.id] = [
        {
          id: `m-${u.id}-${e.id.slice(0, 4)}`,
          userId: u.id,
          name: u.name,
          phoneE164: u.phoneE164,
          role: 'owner',
          status: 'active',
          lastActiveAt: now,
        },
      ];
      return this.toEvent(e);
    });
  }

  updateEvent(eventId: string, patch: Partial<WeddingEvent>): Promise<WeddingEvent> {
    return this.run('write', 'Mipangilio', () => {
      this.requireSession();
      const e = this.event(eventId);
      const { stats: _s, id: _i, timezone: _tz, createdAt: _c, ...allowed } = patch;
      if (patch.palette !== undefined)
        allowed.palette = checkedPalette(patch.themeId ?? e.themeId, patch.palette);
      if (patch.cardContent !== undefined) {
        const ok = cardContentSchema.safeParse(patch.cardContent);
        if (!ok.success)
          throw new RepositoryError('validation', 'Invalid card content', { field: 'cardContent' });
      }
      Object.assign(e, allowed, { updatedAt: iso(this.now()) });
      if (patch.partnerA || patch.partnerB)
        e.coupleNames = [e.partnerA, e.partnerB].filter(Boolean).join(' & ');
      return this.toEvent(e);
    });
  }

  archiveEvent(eventId: string): Promise<WeddingEvent> {
    return this.updateEvent(eventId, { status: 'archived' });
  }

  deleteEvent(eventId: string): Promise<void> {
    return this.run('write', 'Futa harusi', () => {
      this.requireSession();
      if (this.controls.get().role !== 'owner')
        throw new RepositoryError('forbidden', 'Owner only');
      this.event(eventId).deletedAt = iso(this.now());
    });
  }

  // ---------------------------------------------------------------- members

  listMembers(eventId: string): Promise<Member[]> {
    return this.run('read', 'members', () =>
      (this.state.members[eventId] ?? []).map(({ userId: _u, ...m }) => m),
    );
  }

  inviteMember(
    eventId: string,
    input: { name: string; phoneE164: string; role: 'committee' | 'gate' },
  ): Promise<Member> {
    return this.run('write', 'Mwaliko wa timu', () => {
      this.requireSession();
      const list = (this.state.members[eventId] ??= []);
      if (list.some((m) => m.phoneE164 === input.phoneE164 && m.status !== 'revoked'))
        throw new RepositoryError('conflict', 'Already a member');
      const m = {
        id: `m-${this.rng.hex(8)}`,
        userId: null,
        name: input.name,
        phoneE164: input.phoneE164,
        role: input.role,
        status: 'invited' as const,
        lastActiveAt: null,
      };
      list.push(m);
      const { userId: _u, ...out } = m;
      return out;
    });
  }

  revokeMember(eventId: string, memberId: string): Promise<Member> {
    return this.run('write', 'Ondoa mwanatimu', () => {
      this.requireSession();
      const m = (this.state.members[eventId] ?? []).find((x) => x.id === memberId);
      if (!m) throw new RepositoryError('not_found');
      if (m.role === 'owner') throw new RepositoryError('forbidden', 'Owner cannot be removed');
      m.status = 'revoked';
      const { userId: _u, ...out } = m;
      return out;
    });
  }

  createGateLink(eventId: string): Promise<GateLink> {
    return this.run('online-only', 'gate-link', () => {
      this.requireSession();
      this.event(eventId);
      const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      const code = Array.from(
        { length: 8 },
        () => alphabet[Math.floor(this.random() * alphabet.length)],
      ).join('');
      const pin = String(Math.floor(this.random() * 900_000) + 100_000);
      return {
        url: `${this.baseUrl}/gate-join/${code}`,
        code,
        pin,
        expiresAt: iso(this.now() + 7 * DAY),
      };
    });
  }

  // ---------------------------------------------------------------- guests

  listGuests(eventId: string, query: GuestQuery = {}): Promise<Guest[]> {
    return this.run('read', 'guests', () => {
      this.requireSession();
      const paid = this.paidByGuest(eventId);
      const last = this.lastMessageByGuest(eventId);
      return applyGuestQuery(
        this.guestsOf(eventId).map((g) => this.toGuest(g, paid, last)),
        query,
      );
    });
  }

  listGroups(eventId: string): Promise<string[]> {
    return this.run('read', 'groups', () =>
      [
        ...new Set(
          this.guestsOf(eventId)
            .map((g) => g.groupLabel)
            .filter(Boolean),
        ),
      ].sort(),
    );
  }

  getGuest(guestId: string): Promise<Guest> {
    return this.run('read', 'guest', () => {
      this.requireSession();
      const g = this.guestRecord(guestId);
      return this.toGuest(g, this.paidByGuest(g.eventId), this.lastMessageByGuest(g.eventId));
    });
  }

  private newGuestRecord(
    eventId: string,
    v: ReturnType<typeof guestInputSchema.parse>,
  ): GuestRecord {
    const now = iso(this.now());
    return {
      id: this.rng.uuid(),
      eventId,
      cardKind: v.cardKind ?? 'invitation',
      displayName: v.displayName,
      phoneE164: v.phone,
      hasSmartphone: v.hasSmartphone,
      groupLabel: v.groupLabel,
      partySizeAllowed: v.partySizeAllowed,
      shortCode: this.uniqueShortCode(eventId),
      tokenVersion: 1,
      token: this.rng.token(),
      language: v.language,
      inviteChannelPref: !v.phone ? 'print' : v.inviteChannelPref,
      notes: v.notes,
      status: 'created',
      timeline: { created: now },
      rsvpPartySize: null,
      channelLast: null,
      checkedInAt: null,
      partyAdmitted: 0,
      pledgeAmount: null,
      pledgeWaived: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  }

  createGuest(eventId: string, input: GuestInput): Promise<Guest> {
    return this.run('write', `Ongeza ${input.displayName}`, () => {
      this.requireSession();
      this.event(eventId);
      const v = guestInputSchema.parse(input);
      if (v.phone && this.guestsOf(eventId).some((g) => g.phoneE164 === v.phone)) {
        throw new RepositoryError('conflict', 'Duplicate phone', { field: 'phone' });
      }
      const g = this.newGuestRecord(eventId, v);
      this.state.guests.push(g);
      this.audit(g.id, 'create', 'Mgeni ameongezwa');
      return this.toGuest(g, new Map(), new Map());
    });
  }

  updateGuest(guestId: string, patch: Partial<GuestInput>): Promise<Guest> {
    return this.run('write', 'Badilisha mgeni', () => {
      this.requireSession();
      const g = this.guestRecord(guestId);
      const merged = guestInputSchema.parse({
        displayName: g.displayName,
        phone: g.phoneE164 ?? '',
        groupLabel: g.groupLabel,
        partySizeAllowed: g.partySizeAllowed,
        cardKind: g.cardKind,
        inviteChannelPref: g.inviteChannelPref,
        hasSmartphone: g.hasSmartphone,
        language: g.language,
        notes: g.notes,
        ...patch,
      });
      if (
        merged.phone &&
        merged.phone !== g.phoneE164 &&
        this.guestsOf(g.eventId).some((x) => x.phoneE164 === merged.phone)
      ) {
        throw new RepositoryError('conflict', 'Duplicate phone', { field: 'phone' });
      }
      const changes = Object.keys(patch).join(', ');
      Object.assign(g, {
        displayName: merged.displayName,
        phoneE164: merged.phone,
        groupLabel: merged.groupLabel,
        partySizeAllowed: merged.partySizeAllowed,
        cardKind: merged.cardKind ?? g.cardKind,
        inviteChannelPref: merged.phone ? merged.inviteChannelPref : 'print',
        hasSmartphone: merged.hasSmartphone,
        language: merged.language,
        notes: merged.notes,
        updatedAt: iso(this.now()),
      });
      this.audit(g.id, 'update', `Imebadilishwa: ${changes}`);
      return this.toGuest(g, this.paidByGuest(g.eventId), this.lastMessageByGuest(g.eventId));
    });
  }

  deleteGuests(guestIds: string[]): Promise<{ deleted: number }> {
    return this.run('write', `Futa wageni ${guestIds.length}`, () => {
      this.requireSession();
      let deleted = 0;
      for (const id of guestIds) {
        const g = this.state.guests.find((x) => x.id === id && !x.deletedAt);
        if (g) {
          g.deletedAt = iso(this.now());
          deleted++;
        }
      }
      return { deleted };
    });
  }

  restoreGuests(guestIds: string[]): Promise<{ restored: number }> {
    return this.run('write', `Rudisha wageni ${guestIds.length}`, () => {
      this.requireSession();
      let restored = 0;
      for (const id of guestIds) {
        const g = this.state.guests.find((x) => x.id === id && x.deletedAt);
        if (g) {
          g.deletedAt = null;
          restored++;
        }
      }
      return { restored };
    });
  }

  setGuestsGroup(guestIds: string[], group: string): Promise<{ updated: number }> {
    return this.run('write', 'Badilisha kikundi', () => {
      this.requireSession();
      let updated = 0;
      for (const id of guestIds) {
        const g = this.state.guests.find((x) => x.id === id && !x.deletedAt);
        if (g) {
          g.groupLabel = group;
          g.updatedAt = iso(this.now());
          updated++;
        }
      }
      return { updated };
    });
  }

  importGuests(
    eventId: string,
    rows: ImportRowInput[],
    idempotencyKey: string,
  ): Promise<ImportResult> {
    return this.run('write', `Ingiza wageni ${rows.length}`, () =>
      this.remember(`import:${idempotencyKey}`, () => {
        this.requireSession();
        this.event(eventId);
        const phones = new Set(
          this.guestsOf(eventId)
            .map((g) => g.phoneE164)
            .filter(Boolean),
        );
        let created = 0;
        let skipped = 0;
        for (const r of rows) {
          const phone = r.phoneRaw.trim() ? normalizeTzPhone(r.phoneRaw) : null;
          if ((phone && !phone.ok) || r.displayName.trim().length < 2) {
            skipped++;
            continue;
          }
          const e164 = phone?.ok ? phone.e164 : null;
          if (e164 && phones.has(e164)) {
            skipped++;
            continue;
          }
          if (e164) phones.add(e164);
          const v = guestInputSchema.parse({
            displayName: r.displayName,
            phone: e164 ?? '',
            groupLabel: r.groupLabel,
            partySizeAllowed: r.partySizeAllowed,
            inviteChannelPref: r.inviteChannelPref,
            hasSmartphone: r.hasSmartphone,
            language: 'en',
            notes: '',
          });
          this.state.guests.push(this.newGuestRecord(eventId, v));
          created++;
        }
        return { created, skipped };
      }),
    );
  }

  reissueGuest(guestId: string): Promise<Guest> {
    return this.run('write', 'Toa kadi mpya', () => {
      this.requireSession();
      const g = this.guestRecord(guestId);
      this.state.retiredTokens[g.token] = g.id;
      g.token = this.rng.token();
      g.tokenVersion += 1;
      g.updatedAt = iso(this.now());
      this.audit(
        g.id,
        'reissue',
        `Kadi mpya imetolewa (toleo ${g.tokenVersion}); QR ya zamani imefutwa.`,
      );
      return this.toGuest(g, this.paidByGuest(g.eventId), this.lastMessageByGuest(g.eventId));
    });
  }

  addGuestNote(guestId: string, note: string): Promise<AuditEntry> {
    return this.run('write', 'Kumbukumbu', () => {
      this.requireSession();
      this.guestRecord(guestId);
      return this.audit(guestId, 'note', note.trim());
    });
  }

  listGuestMessages(guestId: string): Promise<MessageLogEntry[]> {
    return this.run('read', 'messages', () =>
      this.state.messages
        .filter((m) => m.guestId === guestId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ eventId: _e, ...m }) => m),
    );
  }

  listGuestAudit(guestId: string): Promise<AuditEntry[]> {
    return this.run('read', 'audit', () => [...(this.state.audit[guestId] ?? [])]);
  }

  getGuestCardLink(guestId: string): Promise<{ url: string; shortUrl: string }> {
    return this.run('local', 'link', () => {
      const g = this.guestRecord(guestId);
      return { url: `${this.baseUrl}/c/${g.token}`, shortUrl: `${this.baseUrl}/s/${g.shortCode}` };
    });
  }

  // ---------------------------------------------------------------- sending

  private audience(
    eventId: string,
    a: SendRequest['audience'],
    kind: SendRequest['kind'],
  ): GuestRecord[] {
    const all = this.guestsOf(eventId);
    if (kind === 'reminder') {
      // Like the API: only invitation cards that went out; "unsent" means "not answered yet" here (ADR 030).
      const open = (g: GuestRecord) => ['sent', 'delivered', 'opened'].includes(g.status);
      const invited = all.filter((g) => g.cardKind === 'invitation');
      switch (a.kind) {
        case 'unsent':
          return invited.filter(open);
        case 'group':
          return invited.filter((g) => g.groupLabel === a.group && open(g));
        case 'selected': {
          const ids = new Set(a.guestIds);
          return invited.filter((g) => ids.has(g.id) && (open(g) || g.status === 'confirmed'));
        }
        default:
          return invited.filter((g) => open(g) || g.status === 'confirmed');
      }
    }
    switch (a.kind) {
      case 'unsent':
        return all.filter((g) =>
          kind === 'invite' ? STATUS_RANK[g.status] <= STATUS_RANK.queued : g.status !== 'declined',
        );
      case 'group':
        return all.filter((g) => g.groupLabel === a.group);
      case 'selected': {
        const ids = new Set(a.guestIds);
        return all.filter((g) => ids.has(g.id));
      }
      default:
        return kind === 'thank_you'
          ? all.filter((g) => g.status === 'checked_in' || g.status === 'confirmed')
          : all;
    }
  }

  private channelFor(
    g: GuestRecord,
    req: Pick<SendRequest, 'channel' | 'whatsappFallbackToSms'>,
  ): MessageChannel {
    if (!g.phoneE164) return 'print';
    if (req.channel === 'print') return 'print';
    if (req.channel === 'sms') return 'sms';
    if (req.channel === 'whatsapp')
      return g.hasSmartphone || !req.whatsappFallbackToSms ? 'whatsapp' : 'sms';
    if (g.inviteChannelPref === 'print') return 'print';
    if (g.inviteChannelPref === 'sms' || !g.hasSmartphone) return 'sms';
    return 'whatsapp';
  }

  private sampleSms(e: EventRecord, kind: SendRequest['kind'], body?: string): string {
    if (kind === 'thank_you' && body) return body;
    return buildInviteSms({
      locale: 'en',
      partnerA: e.partnerA,
      partnerB: e.partnerB,
      kind: e.eventKind,
      dateText: '14 Des 2026',
      shortLink: 'hrs.example/s/KH-4826',
      code: 'KH-4826',
    });
  }

  previewSend(
    eventId: string,
    req: Omit<SendRequest, 'idempotencyKey' | 'scheduleAt'>,
  ): Promise<SendPreview> {
    return this.run('read', 'preview', () => {
      this.requireSession();
      const e = this.event(eventId);
      const list = this.audience(eventId, req.audience, req.kind);
      const byChannel: Record<MessageChannel, number> = { whatsapp: 0, sms: 0, print: 0 };
      for (const g of list) byChannel[this.channelFor(g, req)] += 1;
      const cost = estimateSmsCostFor(
        this.sampleSms(e, req.kind, req.body),
        byChannel.sms,
        e.currency,
      );
      return {
        total: list.length,
        byChannel,
        smsSegments: cost.segments,
        estimatedSmsCost: cost.cost,
        withoutPhone: list.filter((g) => !g.phoneE164).length,
      };
    });
  }

  sendInvitations(eventId: string, req: SendRequest): Promise<SendJob> {
    return this.run('send', 'send', () => {
      const existingId = this.state.idempotency[`send:${req.idempotencyKey}`];
      if (existingId) return this.jobView(this.job(JSON.parse(existingId) as string));
      this.requireSession();
      this.event(eventId);
      const list = this.audience(eventId, req.audience, req.kind);
      if (!list.length) throw new RepositoryError('validation', 'No recipients');
      const failureRate = 0.03 + this.controls.get().failureRate;
      const spread = Math.min(12_000, 40 * list.length) + 1000;
      const recipients: JobRecipient[] = list.map((g, i) => {
        const channel = this.channelFor(g, req);
        const fails = channel !== 'print' && this.random() < failureRate;
        return {
          guestId: g.id,
          channel,
          outcome: fails ? 'failed' : 'delivered',
          error: fails
            ? this.rng.pick([
                'invalid_number',
                'provider_timeout',
                'not_on_whatsapp',
                'rate_limited',
              ])
            : null,
          at: Math.round((i / list.length) * spread + this.random() * 400),
        };
      });
      const scheduled = req.scheduleAt && Date.parse(req.scheduleAt) > this.now() + 60_000;
      const job = this.createJob(
        eventId,
        req.kind,
        recipients,
        scheduled ? req.scheduleAt : null,
        null,
      );
      this.state.idempotency[`send:${req.idempotencyKey}`] = JSON.stringify(job.id);
      if (req.kind === 'invite' && !scheduled) {
        for (const g of list)
          if (STATUS_RANK[g.status] < STATUS_RANK.queued) {
            g.status = 'queued';
            g.timeline.queued = iso(this.now());
          }
      }
      this.persist();
      return this.jobView(job);
    });
  }

  private createJob(
    eventId: string,
    kind: SendRequest['kind'],
    recipients: JobRecipient[],
    scheduledFor: string | null,
    retryOf: string | null,
  ): JobRecord {
    const byChannel: Record<MessageChannel, number> = { whatsapp: 0, sms: 0, print: 0 };
    for (const r of recipients) byChannel[r.channel] += 1;
    const job: JobRecord = {
      id: this.rng.uuid(),
      eventId,
      kind,
      total: recipients.length,
      byChannel,
      scheduledFor,
      createdAt: iso(this.now()),
      startedAt: this.now(),
      recipients,
      appliedCount: 0,
      retryOf,
    };
    this.state.jobs.push(job);
    return job;
  }

  private job(jobId: string): JobRecord {
    const j = this.state.jobs.find((x) => x.id === jobId);
    if (!j) throw new RepositoryError('not_found', 'Job not found');
    return j;
  }

  /** Applies messages whose simulated time has passed, then projects counters. */
  private jobView(job: JobRecord): SendJob {
    // A scheduled send whose time has come starts now, like the API's scheduler does (ADR 030).
    if (job.scheduledFor && Date.parse(job.scheduledFor) <= this.now()) {
      job.startedAt = this.now();
      job.scheduledFor = null;
      this.persist();
    }
    if (job.scheduledFor) {
      return {
        ...this.jobBase(job),
        counts: { queued: job.total, sent: 0, delivered: 0, failed: 0 },
        failures: [],
        status: 'scheduled',
      };
    }
    const elapsed = this.now() - job.startedAt;
    const ordered = [...job.recipients].sort((a, b) => a.at - b.at);
    let changed = false;
    for (let i = job.appliedCount; i < ordered.length; i++) {
      const r = ordered[i]!;
      if (r.at > elapsed) break;
      this.applyRecipient(job, r);
      job.appliedCount = i + 1;
      changed = true;
    }
    if (changed) this.persist();
    const counts = { queued: 0, sent: 0, delivered: 0, failed: 0 };
    const failures: SendJob['failures'] = [];
    for (const r of job.recipients) {
      if (r.at > elapsed) counts.queued++;
      else if (r.outcome === 'failed') {
        counts.failed++;
        const g = this.state.guests.find((x) => x.id === r.guestId);
        failures.push({
          guestId: r.guestId,
          guestName: g?.displayName ?? '—',
          channel: r.channel,
          error: r.error ?? 'unknown',
        });
      } else if (r.at + 800 > elapsed) counts.sent++;
      else counts.delivered++;
    }
    return {
      ...this.jobBase(job),
      counts,
      failures,
      status: counts.queued + counts.sent === 0 ? 'done' : 'running',
    };
  }

  private jobBase(job: JobRecord) {
    return {
      id: job.id,
      eventId: job.eventId,
      kind: job.kind,
      total: job.total,
      byChannel: job.byChannel,
      scheduledFor: job.scheduledFor,
      createdAt: job.createdAt,
    };
  }

  private applyRecipient(job: JobRecord, r: JobRecipient): void {
    const g = this.state.guests.find((x) => x.id === r.guestId);
    if (!g) return;
    const at = iso(job.startedAt + r.at);
    if (r.channel !== 'print') {
      this.state.messages.push({
        id: this.rng.uuid(),
        eventId: job.eventId,
        guestId: g.id,
        channel: r.channel,
        provider: r.channel === 'sms' ? 'fake-sms' : 'whatsapp-cloud',
        kind: job.kind,
        status: r.outcome === 'failed' ? 'failed' : 'delivered',
        error: r.error,
        cost: r.channel === 'sms' && r.outcome !== 'failed' ? 25 : 0,
        createdAt: at,
      });
    }
    if (job.kind === 'invite' && r.outcome === 'delivered') {
      g.status = advanceStatus(g.status, r.channel === 'print' ? 'sent' : 'delivered');
      g.timeline.sent ??= at;
      if (r.channel !== 'print') g.timeline.delivered ??= at;
      g.channelLast = r.channel;
      g.updatedAt = at;
    }
  }

  getSendJob(jobId: string): Promise<SendJob> {
    return this.run('local', 'job', () => this.jobView(this.job(jobId)));
  }

  listScheduledSends(eventId: string): Promise<SendJob[]> {
    return this.run('local', 'scheduled', () => {
      this.requireSession();
      const mine = this.state.jobs.filter((j) => j.eventId === eventId && j.scheduledFor);
      return mine
        .map((j) => this.jobView(j))
        .filter((j) => j.status === 'scheduled')
        .sort((a, b) => Date.parse(a.scheduledFor!) - Date.parse(b.scheduledFor!));
    });
  }

  cancelScheduledSend(eventId: string, jobId: string): Promise<void> {
    return this.run('send', 'cancel-scheduled', () => {
      this.requireSession();
      const job = this.job(jobId);
      this.jobView(job); // may start it if its time has come
      if (job.eventId !== eventId) throw new RepositoryError('not_found', 'Job not found');
      if (!job.scheduledFor)
        throw new RepositoryError('conflict', 'This send has already started or finished');
      this.state.jobs = this.state.jobs.filter((j) => j.id !== jobId);
      this.persist();
    });
  }

  retryFailed(jobId: string): Promise<SendJob> {
    return this.run('send', 'retry', () => {
      const prev = this.job(jobId);
      this.jobView(prev);
      const failed = prev.recipients.filter(
        (r) => r.outcome === 'failed' && r.at <= this.now() - prev.startedAt,
      );
      if (!failed.length) throw new RepositoryError('validation', 'Nothing to retry');
      const recipients: JobRecipient[] = failed.map((r, i) => {
        const g = this.state.guests.find((x) => x.id === r.guestId);
        // Retry falls back to SMS for WhatsApp failures (§7.2 auto-fallback).
        const channel: MessageChannel =
          r.channel === 'whatsapp' && g?.phoneE164 ? 'sms' : r.channel;
        const fails =
          r.error === 'invalid_number' || this.random() < this.controls.get().failureRate / 2;
        return {
          guestId: r.guestId,
          channel,
          outcome: fails ? 'failed' : 'delivered',
          error: fails ? (r.error ?? 'provider_timeout') : null,
          at: 300 + i * 120,
        };
      });
      const job = this.createJob(prev.eventId, prev.kind, recipients, null, prev.id);
      this.persist();
      return this.jobView(job);
    });
  }

  sendTestMessage(eventId: string, channel: 'whatsapp' | 'sms'): Promise<{ to: string }> {
    return this.run('online-only', 'test', () => {
      const u = this.requireSession();
      this.event(eventId);
      return { to: `${u.phoneE164} (${channel})` };
    });
  }

  listActivity(eventId: string, limit = 20): Promise<Activity[]> {
    return this.run('read', 'activity', () => {
      const items: Activity[] = [];
      const guests = this.guestsOf(eventId);
      const last = this.lastMessageByGuest(eventId);
      for (const g of guests) {
        const base = { guestId: g.id, guestName: g.displayName };
        if (g.timeline.confirmed)
          items.push({
            id: `c-${g.id}`,
            at: g.timeline.confirmed,
            kind: 'rsvp_yes',
            count: g.rsvpPartySize ?? 1,
            ...base,
          });
        if (g.timeline.declined)
          items.push({ id: `d-${g.id}`, at: g.timeline.declined, kind: 'rsvp_no', ...base });
        if (g.timeline.opened && !g.timeline.confirmed && !g.timeline.declined)
          items.push({ id: `o-${g.id}`, at: g.timeline.opened, kind: 'opened', ...base });
        if (g.checkedInAt)
          items.push({
            id: `ci-${g.id}`,
            at: g.checkedInAt,
            kind: 'checked_in',
            count: g.partyAdmitted,
            ...base,
          });
        const m = last.get(g.id);
        if (m?.status === 'failed')
          items.push({ id: `f-${m.id}`, at: m.createdAt, kind: 'message_failed', ...base });
      }
      for (const p of this.state.payments) {
        if (p.eventId === eventId && p.status === 'success')
          items.push({
            id: `p-${p.id}`,
            at: p.paidAt,
            kind: 'payment',
            guestId: p.guestId,
            guestName: p.guestName,
            amount: p.amount,
          });
      }
      for (const s of this.state.scans) {
        if (s.eventId === eventId && s.result === 'duplicate')
          items.push({
            id: `s-${s.id}`,
            at: s.scannedAt,
            kind: 'duplicate_scan',
            guestId: s.guestId,
            guestName: s.guestName,
          });
      }
      for (const j of this.state.jobs) {
        if (j.eventId === eventId)
          items.push({
            id: `j-${j.id}`,
            at: j.createdAt,
            kind: 'send',
            guestId: null,
            guestName: null,
            count: j.total,
          });
      }
      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    });
  }

  // ---------------------------------------------------------------- cards PDF (mock)

  requestCardsPdf(
    eventId: string,
    opts: { format: 'A6' | 'A5'; layout: 'single' | 'a4-4up' | 'test-sheet'; guestIds?: string[] },
  ): Promise<Blob> {
    return this.run('online-only', 'pdf', () => {
      const e = this.event(eventId);
      const count = opts.guestIds?.length ?? this.guestsOf(eventId).length;
      return new Blob(
        [
          minimalPdf(
            `Kadi Sasa MOCK PDF - ${e.coupleNames} - ${opts.layout} ${opts.format} - ${count} cards`,
          ),
        ],
        { type: 'application/pdf' },
      );
    });
  }

  // ---------------------------------------------------------------- gate

  getGateOverview(eventId: string): Promise<GateOverview> {
    return this.run('read', 'gate', () => {
      this.requireSession();
      const guests = this.guestsOf(eventId);
      const scans = this.state.scans.filter((s) => s.eventId === eventId);
      const perGate = new Map<string, GateOverview['perGate'][number]>();
      for (const s of scans) {
        const row = perGate.get(s.gateName) ?? {
          gateName: s.gateName,
          ok: 0,
          duplicate: 0,
          invalid: 0,
          manual: 0,
        };
        if (s.result === 'ok') row.ok++;
        else if (s.result === 'duplicate') row.duplicate++;
        else if (s.result === 'manual_ok' || s.result === 'manual_denied') row.manual++;
        else row.invalid++;
        perGate.set(s.gateName, row);
      }
      const expected = guests.filter((g) => g.status === 'confirmed' || g.status === 'checked_in');
      return {
        admittedGuests: guests.filter((g) => g.checkedInAt).length,
        admittedPeople: guests.reduce((n, g) => n + g.partyAdmitted, 0),
        expectedGuests: expected.length,
        expectedPeople: expected.reduce((n, g) => n + (g.rsvpPartySize ?? 1), 0),
        duplicates: scans.filter((s) => s.result === 'duplicate').length,
        invalid: scans.filter(
          (s) =>
            s.result === 'invalid_sig' || s.result === 'wrong_event' || s.result === 'not_found',
        ).length,
        manual: scans.filter((s) => s.result === 'manual_ok').length,
        arrivalsByHour: arrivalsByHour(scans),
        perGate: [...perGate.values()],
        revoked: guests
          .filter((g) => g.tokenVersion > 1)
          .map((g) => ({
            guestId: g.id,
            guestName: g.displayName,
            shortCode: g.shortCode,
            tokenVersion: g.tokenVersion,
            revokedAt:
              this.state.audit[g.id]?.find((a) => a.action === 'reissue')?.at ?? g.updatedAt,
          })),
      };
    });
  }

  listScans(eventId: string): Promise<ScanEntry[]> {
    return this.run('read', 'scans', () =>
      this.state.scans
        .filter((s) => s.eventId === eventId)
        .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)),
    );
  }

  manualCheckIn(
    eventId: string,
    guestId: string,
    input: { partySize: number; reason?: string },
  ): Promise<ScanEntry> {
    return this.run('write', 'Ingiza mgeni', () => {
      const u = this.requireSession();
      const g = this.guestRecord(guestId);
      if (g.eventId !== eventId) throw new RepositoryError('validation', 'wrong_event');
      const now = iso(this.now());
      const base = {
        id: this.rng.uuid(),
        eventId,
        guestId: g.id,
        guestName: g.displayName,
        gateName: 'Dashibodi (wavuti)',
        deviceName: 'Kivinjari',
        scannedBy: u.name,
        scannedAt: now,
      };
      if (g.checkedInAt) {
        const entry: ScanEntry = {
          ...base,
          result: 'duplicate',
          partyAdmitted: 0,
          reason: input.reason ?? null,
        };
        this.state.scans.push(entry);
        return entry;
      }
      const party = Math.max(1, Math.min(input.partySize, g.partySizeAllowed));
      g.checkedInAt = now;
      g.partyAdmitted = party;
      g.status = 'checked_in';
      g.timeline.checked_in = now;
      g.updatedAt = now;
      const entry: ScanEntry = {
        ...base,
        result: 'manual_ok',
        partyAdmitted: party,
        reason: input.reason?.trim() || null,
      };
      this.state.scans.push(entry);
      this.audit(
        g.id,
        'manual_check_in',
        `Ameingizwa kwa mkono (watu ${party})${entry.reason ? `: ${entry.reason}` : ''}`,
      );
      return entry;
    });
  }

  // ---------------------------------------------------------------- pledges & payments

  upsertPledge(guestId: string, amount: number, note?: string): Promise<Guest> {
    return this.run('write', 'Ahadi', () => {
      this.requireSession();
      const g = this.guestRecord(guestId);
      g.pledgeAmount = Math.max(0, Math.round(amount));
      g.updatedAt = iso(this.now());
      this.audit(
        g.id,
        'pledge',
        `Ahadi: TZS ${g.pledgeAmount.toLocaleString('en-US')}${note ? ` — ${note}` : ''}`,
      );
      return this.toGuest(g, this.paidByGuest(g.eventId), this.lastMessageByGuest(g.eventId));
    });
  }

  recordManualPayment(
    eventId: string,
    input: ManualPaymentInput,
    idempotencyKey: string,
  ): Promise<Payment> {
    return this.run('write', 'Rekodi malipo', () =>
      this.remember(`manual-pay:${idempotencyKey}`, () => {
        const u = this.requireSession();
        const v = manualPaymentSchema.parse(input);
        const g = this.guestRecord(v.guestId);
        if (g.eventId !== eventId) throw new RepositoryError('validation', 'wrong_event');
        const p = {
          id: this.rng.uuid(),
          eventId,
          guestId: g.id,
          guestName: g.displayName,
          amount: v.amount,
          method: v.method,
          status: 'success' as const,
          reference:
            v.reference ||
            `${v.method === 'cash' ? 'CASH' : 'MAN'}-${this.rng.hex(6).toUpperCase()}`,
          phoneE164: null,
          paidAt: iso(this.now()),
          note: v.note,
          recordedBy: u.name,
        };
        this.state.payments.push(p);
        this.audit(
          g.id,
          'payment',
          `Malipo TZS ${p.amount.toLocaleString('en-US')} (${p.method}) yamerekodiwa`,
        );
        const { eventId: _e, ...out } = p;
        return out;
      }),
    );
  }

  listAuditLog(_eventId: string, _before?: string): Promise<AuditPage> {
    // the demo data has no per-event trail; the real API serves one
    return this.run('read', 'audit-log', () => ({ items: [], nextBefore: null }));
  }

  getPledgeSummary(eventId: string): Promise<PledgeSummaryView> {
    return this.run('read', 'pledge-summary', () => {
      const paid = this.paidByGuest(eventId);
      const guests = this.state.guests
        .filter((g) => g.eventId === eventId && !g.deletedAt)
        .map((g) => {
          const view = this.toGuest(g, paid, this.lastMessageByGuest(eventId));
          const p = view.pledge;
          return {
            guestId: g.id,
            displayName: g.displayName,
            groupLabel: g.groupLabel || null,
            shortCode: g.shortCode,
            amount: p?.amount ?? 0,
            paid: p?.paid ?? 0,
            balance: p?.balance ?? 0,
            status: p?.status ?? null,
            note: null,
          };
        });
      return {
        totals: {
          targetAmount: this.state.events.find((e) => e.id === eventId)?.contributionTarget ?? 0,
          pledged: guests.reduce((n, r) => n + r.amount, 0),
          collected: guests.reduce((n, r) => n + r.paid, 0),
          balance: guests.reduce((n, r) => n + r.balance, 0),
          guestsWithBalance: guests.filter((r) => r.balance > 0).length,
        },
        guests,
      };
    });
  }

  listPayments(eventId: string): Promise<Payment[]> {
    return this.run('read', 'payments', () =>
      this.state.payments
        .filter((p) => p.eventId === eventId)
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .map(({ eventId: _e, ...p }) => p),
    );
  }

  sendPledgeReminders(eventId: string, guestIds: string[]): Promise<{ queued: number }> {
    return this.run('online-only', 'reminders', () => {
      this.requireSession();
      let queued = 0;
      for (const id of guestIds) {
        const g = this.state.guests.find(
          (x) => x.id === id && x.eventId === eventId && !x.deletedAt,
        );
        if (!g?.phoneE164) continue;
        this.state.messages.push({
          id: this.rng.uuid(),
          eventId,
          guestId: g.id,
          channel: g.hasSmartphone ? 'whatsapp' : 'sms',
          provider: g.hasSmartphone ? 'whatsapp-cloud' : 'fake-sms',
          kind: 'reminder',
          status: 'sent',
          error: null,
          cost: g.hasSmartphone ? 0 : 25,
          createdAt: iso(this.now()),
        });
        queued++;
      }
      this.persist();
      return { queued };
    });
  }

  // ---------------------------------------------------------------- reports & exports

  getReport(eventId: string): Promise<EventReport> {
    return this.run('read', 'report', (): EventReport => {
      this.requireSession();
      this.event(eventId);
      const stats = this.stats(eventId);
      const guests = this.guestsOf(eventId);
      const channels = (['whatsapp', 'sms', 'print'] as const).map((channel) => {
        const list = guests.filter((g) => g.channelLast === channel);
        return {
          channel,
          sent: list.length,
          delivered: list.filter(
            (g) =>
              STATUS_RANK[g.status] >= STATUS_RANK.delivered ||
              (channel === 'print' && STATUS_RANK[g.status] >= STATUS_RANK.sent),
          ).length,
          opened: list.filter((g) => STATUS_RANK[g.status] >= STATUS_RANK.opened).length,
          confirmed: list.filter((g) => g.status === 'confirmed' || g.status === 'checked_in')
            .length,
        };
      });
      const paid = this.paidByGuest(eventId);
      const totals = pledgeTotals(
        guests.map((g) =>
          g.pledgeAmount != null
            ? summarizePledge(g.pledgeAmount, paid.get(g.id) ?? 0, g.pledgeWaived)
            : null,
        ),
      );
      const weeks = new Map<string, number>();
      for (const p of this.state.payments) {
        if (p.eventId !== eventId || p.status !== 'success') continue;
        const d = new Date(p.paidAt);
        const monday = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)),
        );
        const key = monday.toISOString().slice(0, 10);
        weeks.set(key, (weeks.get(key) ?? 0) + p.amount);
      }
      return {
        stats,
        channels,
        arrivalsByHour: arrivalsByHour(this.state.scans.filter((s) => s.eventId === eventId)),
        collectionsByWeek: [...weeks.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, amount]) => ({ week, amount })),
        pledgeReconciliation: { ...totals, collected: stats.collected },
        headcountForecast: stats.headcountConfirmed,
        headcountTarget: guests.reduce((n, g) => n + g.partySizeAllowed, 0),
      };
    });
  }

  exportCsv(
    eventId: string,
    kind: 'guests' | 'pledges' | 'payments' | 'scans' | 'report',
  ): Promise<Blob> {
    return this.run('online-only', 'export', () => {
      this.requireSession();
      const paid = this.paidByGuest(eventId);
      const guests = this.guestsOf(eventId);
      let rows: (string | number | null)[][];
      switch (kind) {
        case 'pledges':
          rows = [['Jina', 'Kikundi', 'Ahadi (TZS)', 'Imelipwa (TZS)', 'Salio (TZS)', 'Hali']];
          for (const g of guests) {
            if (g.pledgeAmount == null) continue;
            const s = summarizePledge(g.pledgeAmount, paid.get(g.id) ?? 0, g.pledgeWaived);
            rows.push([g.displayName, g.groupLabel, s.amount, s.paid, s.balance, s.status]);
          }
          break;
        case 'payments':
          rows = [['Tarehe', 'Mgeni', 'Kiasi (TZS)', 'Njia', 'Kumbukumbu', 'Aliyerekodi']];
          for (const p of this.state.payments.filter((x) => x.eventId === eventId))
            rows.push([p.paidAt, p.guestName, p.amount, p.method, p.reference, p.recordedBy]);
          break;
        case 'scans':
          rows = [['Muda', 'Mgeni', 'Matokeo', 'Watu', 'Lango', 'Kifaa', 'Aliyeskani']];
          for (const s of this.state.scans.filter((x) => x.eventId === eventId))
            rows.push([
              s.scannedAt,
              s.guestName,
              s.result,
              s.partyAdmitted,
              s.gateName,
              s.deviceName,
              s.scannedBy,
            ]);
          break;
        case 'report': {
          const st = this.stats(eventId);
          rows = [
            ['Kipimo', 'Thamani'],
            ...Object.entries(st).map(([k, v]) => [k, v] as [string, number]),
          ];
          break;
        }
        default:
          rows = [['Jina', 'Simu', 'Kikundi', 'Idadi', 'Namba', 'Hali', 'Njia']];
          for (const g of guests)
            rows.push([
              g.displayName,
              g.phoneE164,
              g.groupLabel,
              g.partySizeAllowed,
              g.shortCode,
              g.status,
              g.inviteChannelPref,
            ]);
      }
      return new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    });
  }

  // ---------------------------------------------------------------- guest card (public)

  private cardView(token: string): CardView {
    const empty = (state: CardView['state']): CardView => ({
      token,
      state,
      cardKind: 'invitation',
      event: null,
      guest: null,
      qrPayload: null,
      rsvp: { status: 'pending', partySize: null },
      pledge: null,
      rsvpOpen: false,
      eventPassed: false,
      isMock: true,
    });
    const g = this.state.guests.find((x) => x.token === token && !x.deletedAt);
    if (!g) return this.state.retiredTokens[token] ? empty('reissued') : empty('invalid');
    const e = this.state.events.find((x) => x.id === g.eventId && !x.deletedAt);
    if (!e) return empty('invalid');
    const now = this.now();
    const start = Date.parse(e.dateStart);
    const eventPassed = now > start + 12 * HOUR;
    const deadlinePassed = e.rsvpDeadline ? now > Date.parse(e.rsvpDeadline) + DAY : false;
    const paid = this.paidByGuest(e.id).get(g.id) ?? 0;
    const contribution = g.cardKind === 'contribution';
    return {
      token,
      state: 'ok',
      cardKind: g.cardKind,
      event: {
        id: e.id,
        eventKind: e.eventKind,
        partnerA: e.partnerA,
        partnerB: e.partnerB,
        coupleNames: e.coupleNames,
        dateStart: e.dateStart,
        venueName: e.venueName,
        venueMapUrl: e.venueMapUrl,
        dressCode: e.dressCode,
        themeId: e.themeId,
        coverGradient: e.coverGradient,
        palette: sanitizeOverrides(e.palette),
        rsvpDeadline: e.rsvpDeadline,
        senderName: e.senderName,
        committeePhone: e.committeePhone,
        pledgesEnabled: e.pledgesEnabled,
        greeting: e.greeting,
        extraNote: e.extraNote,
        cardContent: e.cardContent,
        contributionTarget: e.contributionTarget,
        country: e.country,
        currency: e.currency,
        timezone: e.timezone,
      },
      guest: {
        displayName: g.displayName,
        partySizeAllowed: g.partySizeAllowed,
        shortCode: g.shortCode,
        groupLabel: g.groupLabel,
        language: g.language,
      },
      // The signed party size is the allowed maximum (§6.1); RSVP changes never require a new signature.
      qrPayload: contribution
        ? null
        : mockQrPayload(e.id, g.id, g.partySizeAllowed, g.tokenVersion),
      rsvp: {
        status:
          g.status === 'confirmed' || g.status === 'checked_in'
            ? 'confirmed'
            : g.status === 'declined'
              ? 'declined'
              : 'pending',
        partySize: g.rsvpPartySize,
      },
      pledge: e.pledgesEnabled
        ? g.pledgeAmount != null
          ? summarizePledge(g.pledgeAmount, paid, g.pledgeWaived)
          : paid > 0
            ? summarizePledge(0, paid)
            : null
        : null,
      rsvpOpen:
        !contribution &&
        !eventPassed &&
        !deadlinePassed &&
        g.status !== 'checked_in' &&
        e.status !== 'archived',
      eventPassed,
      isMock: true,
    };
  }

  /** Card view without side effects or latency — used for server rendering in mock mode. */
  peekCard(token: string): CardView {
    return this.cardView(token);
  }

  getCard(token: string): Promise<CardView> {
    return this.run('card-read', 'card', () => {
      const view = this.cardView(token);
      if (view.state === 'ok') {
        const g = this.state.guests.find((x) => x.token === token)!;
        if (STATUS_RANK[g.status] < STATUS_RANK.opened) {
          g.status = 'opened';
          g.timeline.opened = iso(this.now());
          g.updatedAt = g.timeline.opened;
          this.persist();
        }
      }
      return view;
    });
  }

  rsvp(token: string, input: RsvpInput, idempotencyKey: string): Promise<CardView> {
    return this.run('write', 'Jibu la mwaliko', () => {
      const before = this.cardView(token);
      if (before.state !== 'ok')
        throw new RepositoryError(before.state === 'reissued' ? 'reissued' : 'invalid_token');
      const key = `rsvp:${token}:${idempotencyKey}`;
      if (this.state.idempotency[key]) return before;
      if (!before.rsvpOpen) throw new RepositoryError('conflict', 'rsvp_closed');
      const g = this.state.guests.find((x) => x.token === token)!;
      const now = iso(this.now());
      g.status = advanceStatus(g.status, input.attending ? 'confirmed' : 'declined');
      g.rsvpPartySize = input.attending
        ? Math.max(1, Math.min(input.partySize, g.partySizeAllowed))
        : 0;
      g.timeline[input.attending ? 'confirmed' : 'declined'] = now;
      delete g.timeline[input.attending ? 'declined' : 'confirmed'];
      g.updatedAt = now;
      this.state.idempotency[key] = '1';
      return this.cardView(token);
    });
  }

  startPayment(
    token: string,
    input: { amount: number; phoneE164: string; method: PaymentMethod },
    idempotencyKey: string,
  ): Promise<PaymentStart> {
    return this.run('online-only', 'pay', () =>
      this.remember(`pay:${idempotencyKey}`, () => {
        const view = this.cardView(token);
        if (view.state !== 'ok') throw new RepositoryError('invalid_token');
        if (!view.event?.pledgesEnabled)
          throw new RepositoryError('forbidden', 'payments_disabled');
        if (!Number.isInteger(input.amount) || input.amount < 1000)
          throw new RepositoryError('validation', 'amount', { min: 1000 });
        const g = this.state.guests.find((x) => x.token === token)!;
        const reference = `HP${this.rng.hex(10).toUpperCase()}`;
        this.state.pendingPayments[reference] = {
          reference,
          guestId: g.id,
          eventId: g.eventId,
          amount: input.amount,
          phoneE164: input.phoneE164,
          method: input.method,
          outcome: this.controls.get().payOutcome,
          startedAt: this.now(),
          applied: false,
        };
        this.persist();
        return {
          reference,
          amount: input.amount,
          phoneE164: input.phoneE164,
          method: input.method,
          expiresAt: iso(this.now() + PAY_TIMEOUT_MS),
        };
      }),
    );
  }

  getPaymentStatus(reference: string): Promise<PaymentStatusView> {
    return this.run('online-only', 'pay-status', () => {
      const p = this.state.pendingPayments[reference];
      if (!p) throw new RepositoryError('not_found');
      const elapsed = this.now() - p.startedAt;
      const view: PaymentStatusView = {
        reference,
        status: 'pending',
        amount: p.amount,
        method: p.method,
        paidAt: null,
        duplicateWebhook: false,
        newBalance: null,
        failureReason: null,
      };
      const resolvesAt = p.outcome === 'declined' ? 4000 : 6000;
      if (p.outcome === 'timeout') {
        if (elapsed > PAY_TIMEOUT_MS) view.status = 'expired';
        return view;
      }
      if (elapsed < resolvesAt) return view;
      if (p.outcome === 'declined')
        return { ...view, status: 'failed', failureReason: 'insufficient_funds' };
      if (!p.applied) {
        // Webhook handling is idempotent by provider reference: a duplicate notice is ignored.
        const deliveries = p.outcome === 'duplicate_webhook' ? 2 : 1;
        for (let i = 0; i < deliveries; i++) {
          if (this.state.payments.some((x) => x.reference === reference)) continue;
          const g = this.state.guests.find((x) => x.id === p.guestId)!;
          this.state.payments.push({
            id: this.rng.uuid(),
            eventId: p.eventId,
            guestId: g.id,
            guestName: g.displayName,
            amount: p.amount,
            method: p.method,
            status: 'success',
            reference,
            phoneE164: p.phoneE164,
            paidAt: iso(p.startedAt + resolvesAt),
            note: '',
            recordedBy: null,
          });
        }
        p.applied = true;
        this.persist();
      }
      const g = this.state.guests.find((x) => x.id === p.guestId)!;
      const paid = this.paidByGuest(p.eventId).get(g.id) ?? 0;
      return {
        ...view,
        status: 'success',
        paidAt: iso(p.startedAt + resolvesAt),
        duplicateWebhook: p.outcome === 'duplicate_webhook',
        newBalance: g.pledgeAmount != null ? Math.max(0, g.pledgeAmount - paid) : null,
      };
    });
  }

  resolveShortCode(code: string): Promise<{ token: string }> {
    return this.run('card-read', 'short', () => {
      const g = this.state.guests.find((x) => x.shortCode === code.toUpperCase() && !x.deletedAt);
      if (!g) throw new RepositoryError('not_found');
      return { token: g.token };
    });
  }

  // ---------------------------------------------------------------- staff (ops) panel

  private requireStaff(permission: StaffPermission = 'read') {
    const u = this.sessionUser();
    if (!u) throw new RepositoryError('unauthorized', 'Sign in required');
    if (u.roleGlobal !== 'admin') throw new RepositoryError('forbidden', 'staff_only');
    if (!STAFF_PERMISSIONS[u.staffRole ?? 'support'].includes(permission)) {
      throw new RepositoryError('forbidden', 'missing_permission', { permission });
    }
    return u;
  }

  private opsLog(action: OpsAuditEntry['action'], target: string, details: string): void {
    const u = this.requireStaff();
    this.state.opsAudit.unshift({
      id: this.rng.uuid(),
      at: iso(this.now()),
      actorName: u.name,
      action,
      target,
      details,
    });
  }

  private organizerRow(u: User): OpsOrganizer {
    const owned = this.state.events.filter(
      (e) =>
        !e.deletedAt &&
        (this.state.members[e.id] ?? []).some((m) => m.userId === u.id && m.role === 'owner'),
    );
    const ids = new Set(owned.map((e) => e.id));
    return {
      id: u.id,
      name: u.name || '—',
      phoneE164: u.phoneE164,
      status: u.status ?? 'active',
      suspendedReason: u.suspendedReason ?? null,
      createdAt: u.createdAt ?? null,
      lastLoginAt: u.lastLoginAt ?? null,
      eventCount: owned.length,
      guestCount: this.state.guests.filter((g) => ids.has(g.eventId) && !g.deletedAt).length,
      messagesSent: this.state.messages.filter((m) => ids.has(m.eventId) && m.status !== 'failed')
        .length,
    };
  }

  private ownerOf(eventId: string): User | undefined {
    const m = (this.state.members[eventId] ?? []).find((x) => x.role === 'owner');
    return this.state.users.find((u) => u.id === m?.userId);
  }

  private customers(): User[] {
    return this.state.users.filter((u) => u.roleGlobal !== 'admin');
  }

  private eventRow(e: EventRecord): OpsEvent {
    const guests = this.guestsOf(e.id);
    const msgs = this.state.messages.filter((m) => m.eventId === e.id && m.kind !== 'test');
    const stats = this.stats(e.id);
    return {
      id: e.id,
      coupleNames: e.coupleNames,
      dateStart: e.dateStart,
      status: e.status,
      plan: e.plan,
      ownerId: this.ownerOf(e.id)?.id ?? '',
      ownerName: this.ownerOf(e.id)?.name ?? '—',
      guests: guests.length,
      sent: msgs.filter((m) => m.status !== 'failed').length,
      failedMessages: msgs.filter((m) => m.status === 'failed').length,
      confirmed: stats.confirmed,
      collected: stats.collected,
      smsCost: msgs.reduce((n, m) => n + m.cost, 0),
    };
  }

  opsOverview(): Promise<OpsOverview> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      const since = this.now() - 30 * DAY;
      const evs = this.state.events.filter((e) => !e.deletedAt);
      const eventCounts = { total: evs.length, draft: 0, active: 0, completed: 0, archived: 0 };
      for (const e of evs) eventCounts[e.status] += 1;
      const msgs = this.state.messages.filter(
        (m) => Date.parse(m.createdAt) >= since && m.kind !== 'test',
      );
      const pays = this.state.payments.filter(
        (p) => p.status === 'success' && Date.parse(p.paidAt) >= since,
      );
      const byDay = new Map<string, { sent: number; failed: number }>();
      for (const m of msgs) {
        const day = m.createdAt.slice(0, 10);
        const row = byDay.get(day) ?? { sent: 0, failed: 0 };
        if (m.status === 'failed') row.failed++;
        else row.sent++;
        byDay.set(day, row);
      }
      const customers = this.customers();
      return {
        organizers: customers.length,
        suspendedOrganizers: customers.filter((u) => u.status === 'suspended').length,
        newOrganizers30d: customers.filter((u) => u.createdAt && Date.parse(u.createdAt) >= since)
          .length,
        events: eventCounts,
        guests: this.state.guests.filter((g) => !g.deletedAt).length,
        messages30d: {
          whatsapp: msgs.filter((m) => m.channel === 'whatsapp').length,
          sms: msgs.filter((m) => m.channel === 'sms').length,
          failed: msgs.filter((m) => m.status === 'failed').length,
          total: msgs.length,
        },
        smsCost30d: msgs.reduce((n, m) => n + m.cost, 0),
        failureRate30d: msgs.length
          ? msgs.filter((m) => m.status === 'failed').length / msgs.length
          : 0,
        contributions30d: {
          count: pays.length,
          amount: pays.reduce((n, p) => n + p.amount, 0),
        },
        paidPlans: evs.filter((e) => e.plan === 'paid').length,
        messagesByDay: [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, v]) => ({ day, ...v })),
        openDataRequests: this.state.dataRequests.filter((r) => r.status === 'open').length,
      };
    });
  }

  opsListOrganizers(): Promise<OpsOrganizer[]> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      return this.customers()
        .map((u) => this.organizerRow(u))
        .sort((a, b) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? ''));
    });
  }

  opsListEvents(): Promise<OpsEvent[]> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      return this.state.events
        .filter((e) => !e.deletedAt)
        .map((e) => this.eventRow(e))
        .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
    });
  }

  /** Demo numbers from the browser state (Tanzania only); the real API computes them from the database. */
  opsPilotMetrics(opts: { country?: Country | 'all'; days?: number } = {}): Promise<PilotMetrics> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      const country = opts.country ?? 'all';
      const days = opts.days ?? 30;
      const since = this.now() - days * DAY;
      const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 1000 : null);
      const evs = this.state.events.filter((e) => country === 'all' || e.country === country);
      const ids = new Set(evs.map((e) => e.id));
      const guests = this.state.guests.filter(
        (g) => ids.has(g.eventId) && !g.deletedAt && g.phoneE164,
      );
      const reached = guests.filter((g) =>
        ['delivered', 'opened', 'confirmed', 'declined', 'checked_in'].includes(g.status),
      ).length;
      const sentGuests = guests.filter((g) => g.channelLast);
      const viaSms = sentGuests.filter((g) => g.channelLast === 'sms').length;
      const msgs = this.state.messages.filter(
        (m) => ids.has(m.eventId) && Date.parse(m.createdAt) >= since && m.channel !== 'print',
      );
      const channel = (c: 'sms' | 'whatsapp') => {
        const list = msgs.filter((m) => m.channel === c);
        const delivered = list.filter(
          (m) => m.status === 'delivered' || m.status === 'read',
        ).length;
        const failed = list.filter((m) => m.status === 'failed').length;
        return {
          channel: c,
          total: list.length,
          delivered,
          failed,
          inFlight: list.length - delivered - failed,
          deliveryRate: rate(delivered, list.length),
        };
      };
      const pays = this.state.payments.filter(
        (p) => ids.has(p.eventId) && p.method !== 'cash' && p.method !== 'bank',
      );
      const ok = pays.filter((p) => p.status === 'success');
      const methods = [...new Set(pays.map((p) => p.method))];
      const scans = this.state.scans.filter(
        (s) => ids.has(s.eventId) && Date.parse(s.scannedAt) >= since,
      );
      const n = (r: string) => scans.filter((s) => s.result === r).length;
      const bad = n('invalid_sig') + n('wrong_event') + n('not_found');
      return {
        country,
        windowDays: days,
        generatedAt: new Date(this.now()).toISOString(),
        events: evs.length,
        reach: { guestsWithPhone: guests.length, reached, rate: rate(reached, guests.length) },
        smsPath: { invited: sentGuests.length, viaSms, share: rate(viaSms, sentGuests.length) },
        messages: [channel('sms'), channel('whatsapp')],
        smsByNetwork: [],
        payments: {
          started: pays.length,
          success: ok.length,
          failed: pays.filter((p) => p.status === 'failed').length,
          pending: pays.filter((p) => p.status === 'pending').length,
          successRate: rate(ok.length, pays.length),
          medianSecondsToConfirm: null,
          timeouts: 0,
          lateSuccesses: 0,
          amountMismatches: 0,
          byMethod: methods.map((m) => {
            const rows = pays.filter((p) => p.method === m);
            const s = rows.filter((p) => p.status === 'success').length;
            return {
              method: m,
              started: rows.length,
              success: s,
              successRate: rate(s, rows.length),
            };
          }),
          collected: ok.length
            ? [{ currency: 'TZS', amount: ok.reduce((a, p) => a + p.amount, 0) }]
            : [],
        },
        gate: {
          scans: scans.length,
          admitted: n('ok') + n('manual_ok'),
          firstScanSuccessRate: rate(n('ok'), n('ok') + bad),
          manualShare: rate(n('manual_ok'), n('ok') + n('manual_ok')),
          duplicateScans: n('duplicate'),
          duplicateAdmissions: 0,
          offlineScans: 0,
          unsyncedOffline: 0,
          medianSecondsBetweenAdmissions: null,
        },
      };
    });
  }

  opsUsage(): Promise<OpsUsage> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      const since = this.now() - 30 * DAY;
      const msgs = this.state.messages.filter(
        (m) => Date.parse(m.createdAt) >= since && m.kind !== 'test' && m.channel !== 'print',
      );
      const channel = (c: 'whatsapp' | 'sms') => {
        const list = msgs.filter((m) => m.channel === c);
        return {
          channel: c,
          sent: list.length,
          delivered: list.filter((m) => m.status === 'delivered' || m.status === 'read').length,
          failed: list.filter((m) => m.status === 'failed').length,
          cost: list.reduce((n, m) => n + m.cost, 0),
        };
      };
      const days = new Map<string, { whatsapp: number; sms: number; failed: number }>();
      const perEvent = new Map<
        string,
        { whatsapp: number; sms: number; failed: number; cost: number }
      >();
      const reasons = new Map<string, number>();
      for (const m of msgs) {
        const d = days.get(m.createdAt.slice(0, 10)) ?? { whatsapp: 0, sms: 0, failed: 0 };
        if (m.status === 'failed') d.failed++;
        else d[m.channel as 'whatsapp' | 'sms']++;
        days.set(m.createdAt.slice(0, 10), d);
        const e = perEvent.get(m.eventId) ?? { whatsapp: 0, sms: 0, failed: 0, cost: 0 };
        if (m.status === 'failed') e.failed++;
        else e[m.channel as 'whatsapp' | 'sms']++;
        e.cost += m.cost;
        perEvent.set(m.eventId, e);
        if (m.error) reasons.set(m.error, (reasons.get(m.error) ?? 0) + 1);
      }
      return {
        byChannel: [channel('whatsapp'), channel('sms')],
        byDay: [...days.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, v]) => ({ day, ...v })),
        topEvents: [...perEvent.entries()]
          .map(([eventId, v]) => ({
            eventId,
            coupleNames: this.state.events.find((e) => e.id === eventId)?.coupleNames ?? '—',
            ...v,
          }))
          .sort((a, b) => b.whatsapp + b.sms + b.failed - (a.whatsapp + a.sms + a.failed))
          .slice(0, 8),
        failureReasons: [...reasons.entries()]
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count),
      };
    });
  }

  opsListPayments(): Promise<OpsPayment[]> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      return this.state.payments
        .slice()
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .slice(0, 200)
        .map((p) => ({
          ...p,
          phoneE164: p.phoneE164 ? maskPhoneLocal(p.phoneE164) : null,
          coupleNames: this.state.events.find((e) => e.id === p.eventId)?.coupleNames ?? '—',
        }));
    });
  }

  /** Support lookup by phone digits, name, card code or payment reference. Phones stay masked. */
  opsLookup(query: string): Promise<OpsLookupResult> {
    return this.run('read', 'ops', () => {
      this.requireStaff('lookup');
      const q = query.trim().toLowerCase();
      if (q.length < 3) return { organizers: [], guests: [], payments: [] };
      const digits = q.replace(/\D/g, '').replace(/^0/, '');
      const code = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const phoneHit = (p: string | null) =>
        !!p && digits.length >= 3 && p.replace(/\D/g, '').includes(digits);
      const organizers = this.customers()
        .filter((u) => u.name.toLowerCase().includes(q) || phoneHit(u.phoneE164))
        .map((u) => this.organizerRow(u));
      const guests: OpsGuestHit[] = this.state.guests
        .filter(
          (g) =>
            !g.deletedAt &&
            (g.displayName.toLowerCase().includes(q) ||
              phoneHit(g.phoneE164) ||
              (code.length >= 4 && g.shortCode.replace('-', '') === code)),
        )
        .slice(0, 25)
        .map((g) => ({
          guestId: g.id,
          eventId: g.eventId,
          coupleNames: this.state.events.find((e) => e.id === g.eventId)?.coupleNames ?? '—',
          displayName: g.displayName,
          phoneMasked: g.phoneE164 ? maskPhoneLocal(g.phoneE164) : null,
          shortCode: g.shortCode,
          status: g.status,
        }));
      const payments: OpsPayment[] = this.state.payments
        .filter((p) => p.reference.toLowerCase() === q || p.guestName.toLowerCase().includes(q))
        .slice(0, 25)
        .map((p) => ({
          ...p,
          phoneE164: p.phoneE164 ? maskPhoneLocal(p.phoneE164) : null,
          coupleNames: this.state.events.find((e) => e.id === p.eventId)?.coupleNames ?? '—',
        }));
      this.opsLog('lookup', 'support', `Utafutaji: "${q.slice(0, 40)}"`);
      this.persist();
      return { organizers, guests, payments };
    });
  }

  /** Reveals a full phone number. A reason is mandatory and the view is written to the audit log. */
  opsRevealPhone(
    target: { kind: 'guest' | 'organizer'; id: string },
    reason: string,
  ): Promise<{ phoneE164: string }> {
    return this.run('write', 'ops-reveal', () => {
      this.requireStaff('reveal');
      if (reason.trim().length < 5) throw new RepositoryError('validation', 'reason_required');
      const rec =
        target.kind === 'guest'
          ? this.state.guests.find((g) => g.id === target.id)
          : this.state.users.find((u) => u.id === target.id);
      const phone = rec && 'phoneE164' in rec ? rec.phoneE164 : null;
      if (!rec || !phone) throw new RepositoryError('not_found');
      const label = 'displayName' in rec ? rec.displayName : rec.name;
      this.opsLog('reveal_phone', label, reason.trim());
      return { phoneE164: phone };
    });
  }

  opsSetUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    reason: string,
  ): Promise<OpsOrganizer> {
    return this.run('write', 'ops-status', () => {
      this.requireStaff('suspend');
      const u = this.state.users.find((x) => x.id === userId && x.roleGlobal !== 'admin');
      if (!u) throw new RepositoryError('not_found');
      if (status === 'suspended' && reason.trim().length < 5)
        throw new RepositoryError('validation', 'reason_required');
      u.status = status;
      u.suspendedReason = status === 'suspended' ? reason.trim() : null;
      if (status === 'suspended' && this.state.sessionUserId === u.id)
        this.state.sessionUserId = null;
      this.opsLog(
        status === 'suspended' ? 'suspend' : 'reactivate',
        u.name || u.phoneE164,
        reason.trim() || '—',
      );
      return this.organizerRow(u);
    });
  }

  opsSetEventPlan(eventId: string, plan: 'free' | 'paid'): Promise<OpsEvent> {
    return this.run('write', 'ops-plan', () => {
      this.requireStaff('plan');
      const e = this.event(eventId);
      e.plan = plan;
      e.updatedAt = iso(this.now());
      this.opsLog('set_plan', e.coupleNames, `Mpango: ${plan}`);
      return this.eventRow(e);
    });
  }

  opsListAudit(): Promise<OpsAuditEntry[]> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      return [...this.state.opsAudit];
    });
  }

  opsListDataRequests(): Promise<DataRequest[]> {
    return this.run('read', 'ops', () => {
      this.requireStaff();
      return this.state.dataRequests
        .map((r) => ({ ...r, phoneE164: maskPhoneLocal(r.phoneE164) }))
        .sort(
          (a, b) =>
            Number(a.status !== 'open') - Number(b.status !== 'open') ||
            b.requestedAt.localeCompare(a.requestedAt),
        );
    });
  }

  opsResolveDataRequest(
    id: string,
    status: 'done' | 'rejected',
    note: string,
  ): Promise<DataRequest> {
    return this.run('write', 'ops-request', () => {
      const staff = this.requireStaff('requests');
      const r = this.state.dataRequests.find((x) => x.id === id);
      if (!r) throw new RepositoryError('not_found');
      if (r.status !== 'open') throw new RepositoryError('conflict', 'already_resolved');
      r.status = status;
      r.note = note.trim();
      r.resolvedAt = iso(this.now());
      r.resolvedBy = staff.name;
      if (status === 'done' && r.kind === 'deletion') {
        // Deleting an account removes the person and soft-deletes the weddings they own.
        for (const e of this.state.events) {
          if (this.ownerOf(e.id)?.id === r.userId) e.deletedAt = iso(this.now());
        }
        this.state.users = this.state.users.filter((u) => u.id !== r.userId);
      }
      this.opsLog(
        'resolve_request',
        r.userName,
        `${r.kind}: ${status}${note.trim() ? ` — ${note.trim()}` : ''}`,
      );
      return { ...r, phoneE164: maskPhoneLocal(r.phoneE164) };
    });
  }

  // ---- SMS and WhatsApp settings (ADR 031). Mock: kept in state, nothing is ever sent.
  /** The mock has no KENYA_ENABLED flag: the Kenyan route shows once a Kenyan wedding exists. */
  private get kenyaEnabled() {
    return this.state.events.some((e) => e.country === 'KE');
  }

  private messagingView(): MessagingSettingsView {
    const saved = this.state.messaging ?? {};
    const routes = MESSAGING_ROUTES.filter((r) => r !== 'sms_ke' || this.kenyaEnabled).map(
      (route): MessagingRouteView => {
        const row = saved[route];
        const provider = row?.provider ?? 'fake';
        const fields: Record<string, string> = {};
        const secrets: Record<string, string> = {};
        for (const f of providerFields(route, provider)) {
          const v = row?.fields[f.key];
          if (!v) continue;
          if ('secret' in f && f.secret) secrets[f.key] = `…${v.slice(-4)}`;
          else fields[f.key] = v;
        }
        return {
          route,
          provider,
          source: row ? 'database' : 'environment',
          fields,
          secrets,
          active: provider === 'cloud' ? 'whatsapp-cloud' : provider,
          updatedAt: row?.updatedAt ?? null,
          updatedBy: row?.updatedBy ?? null,
        };
      },
    );
    return {
      kenyaEnabled: this.kenyaEnabled,
      routes,
      webhooks: [
        { route: 'whatsapp', provider: 'evolution', path: '/v1/webhooks/whatsapp' },
        { route: 'whatsapp', provider: 'cloud', path: '/v1/webhooks/whatsapp-cloud' },
        { route: 'sms_tz', provider: 'nextsms', path: '/v1/webhooks/sms' },
      ],
    };
  }

  opsMessagingSettings(): Promise<MessagingSettingsView> {
    return this.run('read', 'ops', () => {
      this.requireStaff('settings');
      return this.messagingView();
    });
  }

  opsSaveMessaging(
    route: MessagingRoute,
    input: MessagingSettingsInput,
  ): Promise<MessagingSettingsView> {
    return this.run('write', 'ops-messaging', () => {
      const u = this.requireStaff('settings');
      const saved = (this.state.messaging ??= {});
      const current = saved[route];
      const defs = providerFields(route, input.provider);
      if (!(input.provider in MESSAGING_PROVIDERS[route]))
        throw new RepositoryError('validation', 'Unknown provider', { field: 'provider' });
      const fields: Record<string, string> = {};
      for (const f of defs) {
        const v = (input.fields[f.key] ?? '').trim();
        if (!v && 'secret' in f && f.secret && current?.provider === input.provider) {
          if (current.fields[f.key]) fields[f.key] = current.fields[f.key]!;
          continue;
        }
        if (v) fields[f.key] = v;
      }
      const missing = defs
        .filter((f) => 'required' in f && f.required && !fields[f.key])
        .map((f) => f.key);
      if (missing.length)
        throw new RepositoryError('validation', `Missing ${missing.join(', ')}`, {
          field: 'fields',
          missing,
        });
      saved[route] = {
        provider: input.provider,
        fields,
        updatedAt: iso(this.now()),
        updatedBy: u.name,
      };
      this.opsLog('messaging', route, `Mtoa huduma: ${input.provider}`);
      return this.messagingView();
    });
  }

  opsResetMessaging(route: MessagingRoute): Promise<MessagingSettingsView> {
    return this.run('write', 'ops-messaging', () => {
      this.requireStaff('settings');
      if (this.state.messaging) delete this.state.messaging[route];
      this.opsLog('messaging', route, 'Mipangilio ya mazingira');
      return this.messagingView();
    });
  }

  opsTestMessaging(
    route: MessagingRoute,
    to: string,
  ): Promise<{ ok: boolean; provider: string; error: string | null }> {
    return this.run('write', 'ops-messaging', () => {
      this.requireStaff('settings');
      const provider = this.state.messaging?.[route]?.provider ?? 'fake';
      this.opsLog('messaging', route, `Majaribio …${to.replace(/\D/g, '').slice(-3)}`);
      return { ok: true, provider, error: null };
    });
  }

  opsImportMessagingFromEnvironment(): Promise<
    MessagingSettingsView & { imported: MessagingRoute[] }
  > {
    return this.run('write', 'ops-messaging', () => {
      this.requireStaff('settings');
      // The mock server has no environment variables: nothing to copy.
      this.opsLog('messaging', 'all', 'Kuhamisha kutoka mazingira: hakuna');
      return { ...this.messagingView(), imported: [] };
    });
  }

  // ---- Payment gateway settings (ADR 036). Mock: kept in state, nothing is ever charged.
  private paymentView(): PaymentSettingsView {
    const row = this.state.paymentSettings?.tz;
    const provider = row?.provider ?? 'fake';
    const fields: Record<string, string> = {};
    const secrets: Record<string, string> = {};
    for (const f of paymentProviderFields('tz', provider)) {
      const v = row?.fields[f.key];
      if (!v) continue;
      if ('secret' in f && f.secret) secrets[f.key] = `…${v.slice(-4)}`;
      else fields[f.key] = v;
    }
    const route: PaymentRouteView = {
      route: 'tz',
      provider,
      source: row ? 'database' : 'environment',
      fields,
      secrets,
      active: provider,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
    return {
      routes: [route],
      webhooks: [
        {
          route: 'tz',
          provider: 'snippe',
          url: 'https://api.example.test/v1/payments/webhook/snippe',
        },
      ],
    };
  }

  opsPaymentSettings(): Promise<PaymentSettingsView> {
    return this.run('read', 'ops', () => {
      this.requireStaff('settings');
      return this.paymentView();
    });
  }

  opsSavePayment(route: PaymentRoute, input: PaymentSettingsInput): Promise<PaymentSettingsView> {
    return this.run('write', 'ops-payments', () => {
      const u = this.requireStaff('settings');
      if (!(input.provider in PAYMENT_PROVIDERS[route]))
        throw new RepositoryError('validation', 'Unknown provider', { field: 'provider' });
      const saved = (this.state.paymentSettings ??= {});
      const current = saved[route];
      const defs = paymentProviderFields(route, input.provider);
      const fields: Record<string, string> = {};
      for (const f of defs) {
        const v = (input.fields[f.key] ?? '').trim();
        if (!v && 'secret' in f && f.secret && current?.provider === input.provider) {
          if (current.fields[f.key]) fields[f.key] = current.fields[f.key]!;
          continue;
        }
        if (v) fields[f.key] = v;
      }
      const missing = defs
        .filter((f) => 'required' in f && f.required && !fields[f.key])
        .map((f) => f.key);
      if (missing.length)
        throw new RepositoryError('validation', `Missing ${missing.join(', ')}`, {
          field: 'fields',
          missing,
        });
      if (fields.environment && !['production', 'sandbox'].includes(fields.environment))
        throw new RepositoryError('validation', 'environment must be production or sandbox', {
          field: 'fields',
        });
      saved[route] = {
        provider: input.provider,
        fields,
        updatedAt: iso(this.now()),
        updatedBy: u.name,
      };
      this.opsLog('payments', route, `Mtoa huduma: ${input.provider}`);
      return this.paymentView();
    });
  }

  opsResetPayment(route: PaymentRoute): Promise<PaymentSettingsView> {
    return this.run('write', 'ops-payments', () => {
      this.requireStaff('settings');
      if (this.state.paymentSettings) delete this.state.paymentSettings[route];
      this.opsLog('payments', route, 'Mipangilio ya mazingira');
      return this.paymentView();
    });
  }

  opsTestPayment(route: PaymentRoute): Promise<{
    ok: boolean;
    provider: string | null;
    status: number | null;
    error: string | null;
  }> {
    return this.run('write', 'ops-payments', () => {
      this.requireStaff('settings');
      const provider = this.state.paymentSettings?.[route]?.provider ?? 'fake';
      this.opsLog('payments', route, 'Majaribio ya muunganisho');
      return provider === 'snippe'
        ? { ok: true, provider, status: 200, error: null }
        : { ok: false, provider, status: null, error: 'This provider has nothing to test' };
    });
  }

  // ---- Business branding (ADR 036). Mock: the logo lives in state as a data URL.
  private onPrimaryFor(primary: string): string {
    return contrastRatio('#FFFFFF', primary) >= contrastRatio(lightColors.ink, primary)
      ? '#FFFFFF'
      : lightColors.ink;
  }

  private publicBranding(): PublicBranding {
    const b = this.state.branding;
    if (!b)
      return {
        ...DEFAULT_BRANDING,
        logoUrl: null,
        logoMime: null,
        onPrimary: null,
        updatedAt: null,
      };
    return {
      ...b.input,
      logoUrl: b.logoSrc,
      logoMime: (b.logoMime as LogoMime | null) ?? null,
      onPrimary: b.input.primary ? this.onPrimaryFor(b.input.primary) : null,
      updatedAt: b.updatedAt,
    };
  }

  private brandingView(): BrandingView {
    return {
      ...this.publicBranding(),
      updatedBy: this.state.branding?.updatedBy ?? null,
      source: this.state.branding ? 'database' : 'default',
    };
  }

  getBranding(): Promise<PublicBranding> {
    return this.run('read', 'branding', () => this.publicBranding());
  }

  opsBranding(): Promise<BrandingView> {
    return this.run('read', 'ops', () => {
      this.requireStaff('settings');
      return this.brandingView();
    });
  }

  opsSaveBranding(input: BrandingInput): Promise<BrandingView> {
    return this.run('write', 'ops-branding', () => {
      const u = this.requireStaff('settings');
      const businessName = input.businessName.trim();
      const tagline = input.tagline.trim();
      if (!businessName || businessName.length > BUSINESS_NAME_MAX)
        throw new RepositoryError('validation', 'Business name must be 1–80 characters', {
          field: 'businessName',
        });
      if (tagline.length > TAGLINE_MAX)
        throw new RepositoryError('validation', 'Tagline must be at most 140 characters', {
          field: 'tagline',
        });
      if (!(BODY_FONT_KEYS as readonly string[]).includes(input.fontBody))
        throw new RepositoryError('validation', 'Unknown body font', { field: 'fontBody' });
      if (!(DISPLAY_FONT_KEYS as readonly string[]).includes(input.fontDisplay))
        throw new RepositoryError('validation', 'Unknown display font', { field: 'fontDisplay' });
      const hex = (v: string | null, field: string) => {
        if (v === null || v === '') return null;
        const n = normalizeHex(v);
        if (!n)
          throw new RepositoryError('validation', 'Colours must look like #0F5C4D', { field });
        return n;
      };
      const primary = hex(input.primary, 'primary');
      const accent = hex(input.accent, 'accent');
      const p = primary ?? lightColors.primary;
      const issues = themeContrastIssues({
        primary: p,
        onPrimary: this.onPrimaryFor(p),
        accent: accent ?? lightColors.accent,
      });
      if (issues.length)
        throw new RepositoryError('validation', 'These colours are too hard to read', {
          field: issues.some((i) => i.pair.startsWith('accent')) ? 'accent' : 'primary',
          issues: issues.map((i) => ({ pair: i.pair, ratio: Math.round(i.ratio * 100) / 100 })),
        });
      const prev = this.state.branding;
      this.state.branding = {
        input: { ...input, businessName, tagline, primary, accent },
        logoMime: prev?.logoMime ?? null,
        logoSrc: prev?.logoSrc ?? null,
        logoVersion: prev?.logoVersion ?? 0,
        updatedAt: iso(this.now()),
        updatedBy: u.name,
      };
      this.opsLog('branding', 'brand', `Chapa: ${businessName}`);
      return this.brandingView();
    });
  }

  opsSetLogo(file: { mime: string; data: string }): Promise<BrandingView> {
    return this.run('write', 'ops-branding', () => {
      const u = this.requireStaff('settings');
      if (!(LOGO_MIMES as readonly string[]).includes(file.mime))
        throw new RepositoryError('validation', 'The logo must be SVG, PNG, JPEG or WebP', {
          field: 'mime',
        });
      let src: string;
      if (file.mime === 'image/svg+xml') {
        const c = validateSvg(file.data);
        if (!c.ok)
          throw new RepositoryError('validation', SVG_REASON_TEXT[c.reason], {
            field: 'logo',
            reason: c.reason,
          });
        src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}`;
      } else {
        if (Math.ceil((file.data.length * 3) / 4) > MAX_LOGO_BYTES)
          throw new RepositoryError('validation', 'The file is larger than 200 KB', {
            field: 'logo',
            reason: 'too_large',
          });
        src = `data:${file.mime};base64,${file.data}`;
      }
      const prev = this.state.branding;
      this.state.branding = {
        input: prev?.input ?? { ...DEFAULT_BRANDING },
        logoMime: file.mime,
        logoSrc: src,
        logoVersion: (prev?.logoVersion ?? 0) + 1,
        updatedAt: iso(this.now()),
        updatedBy: u.name,
      };
      this.opsLog('branding', 'logo', file.mime);
      return this.brandingView();
    });
  }

  opsRemoveLogo(): Promise<BrandingView> {
    return this.run('write', 'ops-branding', () => {
      const u = this.requireStaff('settings');
      const prev = this.state.branding;
      if (prev) {
        this.state.branding = {
          ...prev,
          logoMime: null,
          logoSrc: null,
          logoVersion: prev.logoVersion + 1,
          updatedAt: iso(this.now()),
          updatedBy: u.name,
        };
        this.opsLog('branding', 'logo', 'removed');
      }
      return this.brandingView();
    });
  }

  /** Synchronous short-code lookup for server redirects in mock mode. */
  peekShortCode(code: string): string | null {
    return (
      this.state.guests.find((x) => x.shortCode === code.toUpperCase() && !x.deletedAt)?.token ??
      null
    );
  }
}

/** `+255•••••678` — same masking as `maskPhone` in @harusi/schemas (kept local to avoid a second import path). */
function maskPhoneLocal(e164: string): string {
  return e164.length <= 4 ? '***' : `${e164.slice(0, 4)}•••••${e164.slice(-3)}`;
}

function arrivalsByHour(scans: ScanEntry[]): { hour: string; count: number }[] {
  const m = new Map<string, number>();
  for (const s of scans) {
    if (s.result !== 'ok' && s.result !== 'manual_ok') continue;
    const d = new Date(Date.parse(s.scannedAt) + 3 * HOUR); // EAT
    const key = `${String(d.getUTCHours()).padStart(2, '0')}:00`;
    m.set(key, (m.get(key) ?? 0) + s.partyAdmitted);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));
}

/** A tiny valid one-page PDF with a single line of text (mock export). */
function minimalPdf(text: string): string {
  const safe = text.replace(/[()\\]/g, '');
  const stream = `BT /F1 14 Tf 40 780 Td (${safe}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}
