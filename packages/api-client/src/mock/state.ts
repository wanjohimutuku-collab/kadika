import type { PricingCatalog, PurchaseView } from '@harusi/schemas/billing';
import type { BrandingInput } from '@harusi/schemas/branding';
import {
  generateShortCode,
  type CardKind,
  type InvitationStatus,
  type MemberRole,
  type MessageChannel,
  type PaymentMethod,
} from '@harusi/schemas';
import type {
  AuditEntry,
  DataRequest,
  OpsAuditEntry,
  Member,
  MessageLogEntry,
  Payment,
  ScanEntry,
  SendJob,
  User,
  WeddingEvent,
} from '../types';
import { STATUS_RANK } from '../domain/funnel';
import { mulberry32, Rng } from './prng';
import {
  ELDER_PREFIX_F,
  ELDER_PREFIX_M,
  FEMALE,
  GROUPS,
  MALE,
  PREFIXES,
  SURNAMES,
  TITLES,
} from './names';

export const DAY = 86_400_000;
export const HOUR = 3_600_000;
const EAT_OFFSET = 3 * HOUR; // Africa/Dar_es_Salaam is UTC+3 all year

export type EventRecord = Omit<WeddingEvent, 'stats'> & { deletedAt: string | null };

export interface GuestRecord {
  id: string;
  eventId: string;
  cardKind: CardKind;
  displayName: string;
  phoneE164: string | null;
  hasSmartphone: boolean;
  groupLabel: string;
  partySizeAllowed: number;
  shortCode: string;
  tokenVersion: number;
  token: string;
  language: 'sw' | 'en';
  inviteChannelPref: 'whatsapp' | 'sms' | 'print' | 'mixed';
  /** Older saved states have neither: read as "no phone" and "already sent" (ADR 042). */
  printCard?: boolean;
  cardGeneratedAt?: string | null;
  notes: string;
  status: InvitationStatus;
  timeline: Partial<Record<InvitationStatus, string>>;
  rsvpPartySize: number | null;
  channelLast: MessageChannel | null;
  checkedInAt: string | null;
  partyAdmitted: number;
  pledgeAmount: number | null;
  pledgeWaived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PendingPayment {
  reference: string;
  guestId: string;
  eventId: string;
  amount: number;
  phoneE164: string;
  method: PaymentMethod;
  outcome: 'success' | 'declined' | 'timeout' | 'duplicate_webhook';
  startedAt: number;
  applied: boolean;
}

export interface JobRecipient {
  guestId: string;
  channel: MessageChannel;
  outcome: 'delivered' | 'failed';
  error: string | null;
  /** ms after job start when this message resolves. */
  at: number;
}

export interface JobRecord extends Omit<SendJob, 'counts' | 'failures' | 'status'> {
  startedAt: number;
  recipients: JobRecipient[];
  appliedCount: number;
  retryOf: string | null;
}

export interface MockState {
  /** Bumped when the shape changes; older saved states are re-seeded. */
  version: 5;
  seedDay: string;
  users: User[];
  sessionUserId: string | null;
  events: EventRecord[];
  guests: GuestRecord[];
  messages: (MessageLogEntry & { eventId: string })[];
  payments: (Payment & { eventId: string })[];
  scans: ScanEntry[];
  members: Record<string, (Member & { userId: string | null })[]>;
  audit: Record<string, AuditEntry[]>;
  jobs: JobRecord[];
  pendingPayments: Record<string, PendingPayment>;
  /** Retired card tokens → guest id (old links show "reissued"). */
  retiredTokens: Record<string, string>;
  idempotency: Record<string, string>;
  otp: Record<string, { attempts: number; lockedUntil: number | null; lastRequestedAt: number }>;
  /** Customers' data export / deletion requests (PDPA), handled by staff in the ops panel. */
  dataRequests: DataRequest[];
  /** Staff actions, including every view of a full phone number. */
  opsAudit: OpsAuditEntry[];
  /** SMS/WhatsApp settings saved in /ops (ADR 031); a route without one shows the env defaults. */
  messaging?: Partial<
    Record<
      'sms_tz' | 'sms_ke' | 'whatsapp',
      { provider: string; fields: Record<string, string>; updatedAt: string; updatedBy: string }
    >
  >;
  /** Payment gateway settings saved in /ops (ADR 036); without one the env default (fake) shows. */
  paymentSettings?: Partial<
    Record<
      'tz',
      { provider: string; fields: Record<string, string>; updatedAt: string; updatedBy: string }
    >
  >;
  /** Business branding saved in /ops (ADR 036); undefined shows the defaults. */
  branding?: {
    input: BrandingInput;
    /** SVG source, or a `data:` URL for rasters; the mock serves the logo straight from here. */
    logoMime: string | null;
    logoSrc: string | null;
    logoVersion: number;
    updatedAt: string;
    updatedBy: string;
  };
  /** Staff session passed the second factor. Reset on sign-out. */
  staffVerified: boolean;
  /** Prices saved in /ops (ADR 042); undefined uses `DEFAULT_PRICING`. */
  pricing?: { catalog: PricingCatalog; updatedAt: string; updatedBy: string };
  /** Card bundles, message packs and staff grants per event (ADR 042). */
  purchases?: (PurchaseView & { eventId: string; phone: string | null })[];
}

/** Midnight in Dar es Salaam for the given instant, as epoch ms (UTC). */
export function startOfDayEAT(now: number): number {
  return Math.floor((now + EAT_OFFSET) / DAY) * DAY - EAT_OFFSET;
}

const iso = (ms: number) => new Date(ms).toISOString();

function phoneFor(rng: Rng): string {
  return `+255${rng.pick(PREFIXES)}${String(rng.int(0, 9_999_999)).padStart(7, '0')}`;
}

function personName(rng: Rng): { name: string; elder: boolean } {
  const female = rng.chance(0.52);
  const first = female ? rng.pick(FEMALE) : rng.pick(MALE);
  const last = rng.pick(SURNAMES);
  const r = rng.next();
  if (r < 0.1)
    return {
      name: `${female ? rng.pick(ELDER_PREFIX_F) : rng.pick(ELDER_PREFIX_M)} ${first}`,
      elder: true,
    };
  if (r < 0.16)
    return {
      name: `${female ? rng.pick(ELDER_PREFIX_F) : rng.pick(ELDER_PREFIX_M)} ${first} ${last}`,
      elder: true,
    };
  if (r < 0.2) return { name: `${rng.pick(TITLES)} ${first} ${last}`, elder: false };
  if (r < 0.24) return { name: `Familia ya ${last}`, elder: false };
  return { name: `${first} ${last}`, elder: false };
}

const PLEDGE_AMOUNTS = [
  20_000, 30_000, 50_000, 50_000, 100_000, 100_000, 150_000, 200_000, 300_000, 500_000,
] as const;
const PAY_METHODS: readonly (readonly [PaymentMethod, number])[] = [
  ['mpesa', 45],
  ['mixx', 20],
  ['airtel', 15],
  ['halopesa', 5],
  ['cash', 10],
  ['bank', 5],
];

interface BuildCtx {
  rng: Rng;
  now: number;
  state: MockState;
  usedCodes: Set<string>;
}

function uniqueCode(ctx: BuildCtx, eventId: string): string {
  for (;;) {
    const code = generateShortCode(ctx.rng.next);
    const key = `${eventId}:${code}`;
    if (!ctx.usedCodes.has(key)) {
      ctx.usedCodes.add(key);
      return code;
    }
  }
}

function baseEvent(
  partial: Partial<EventRecord> & Pick<EventRecord, 'id' | 'partnerA' | 'partnerB' | 'dateStart'>,
): EventRecord {
  return {
    title: `Harusi ya ${partial.partnerA} & ${partial.partnerB}`,
    cardContent: {},
    eventKind: 'Harusi',
    coupleNames: `${partial.partnerA} & ${partial.partnerB}`,
    venueName: '',
    venueMapUrl: '',
    dressCode: '',
    languageDefault: 'en',
    country: 'TZ',
    currency: 'TZS',
    timezone: 'Africa/Dar_es_Salaam',
    status: 'active',
    themeId: 'emerald-gold',
    coverGradient: 'linear-gradient(135deg,#0F5C4D 0%,#1E7D6A 55%,#B8893B 100%)',
    palette: {},
    rsvpDeadline: null,
    contributionTarget: 0,
    senderName: '',
    committeePhone: '',
    pledgesEnabled: true,
    requirePledgeBeforeCard: false,
    greeting: '',
    extraNote: '',
    reminders: { t14: true, t7: true, t1: true },
    whatsappFallbackHours: 6,
    plan: 'free',
    createdAt: partial.dateStart,
    updatedAt: partial.dateStart,
    deletedAt: null,
    ...partial,
  };
}

function addGuest(
  ctx: BuildCtx,
  eventId: string,
  eventCreated: number,
  opts: { status: InvitationStatus; checkInWindow?: [number, number] },
) {
  const { rng } = ctx;
  const { name, elder } = personName(rng);
  const family = name.startsWith('Familia');
  const noPhone = rng.chance(elder ? 0.25 : 0.03);
  const hasSmartphone = noPhone ? false : rng.chance(elder ? 0.25 : 0.78);
  const pref: GuestRecord['inviteChannelPref'] = noPhone
    ? 'print'
    : !hasSmartphone
      ? 'sms'
      : rng.chance(0.85)
        ? 'whatsapp'
        : 'mixed';
  const group = elder
    ? rng.weighted([
        ['Wazee', 5],
        [GROUPS[0], 3],
        [GROUPS[1], 3],
      ] as const)
    : rng.pick(GROUPS);
  const partySizeAllowed = family
    ? rng.int(3, 5)
    : rng.weighted([
        [1, 55],
        [2, 35],
        [3, 7],
        [4, 3],
      ] as const);
  const id = rng.uuid();
  const created = eventCreated + rng.int(0, 5) * DAY + rng.int(0, 10) * HOUR;
  const status =
    noPhone &&
    STATUS_RANK[opts.status] >= STATUS_RANK.delivered &&
    STATUS_RANK[opts.status] < STATUS_RANK.confirmed
      ? 'sent'
      : opts.status;
  const timeline: GuestRecord['timeline'] = { created: iso(created) };
  let t = created + rng.int(2, 12) * DAY;
  const cap = ctx.now - HOUR;
  const stamp = (s: InvitationStatus, gap: number) => {
    t = Math.min(cap, t + gap);
    timeline[s] = iso(t);
  };
  const rank = STATUS_RANK[status];
  if (rank >= STATUS_RANK.queued) stamp('queued', 0);
  if (rank >= STATUS_RANK.sent) stamp('sent', rng.int(1, 30) * 60_000);
  if (rank >= STATUS_RANK.delivered && !noPhone) stamp('delivered', rng.int(1, 40) * 60_000);
  if (rank >= STATUS_RANK.opened && !noPhone) stamp('opened', rng.int(1, 72) * HOUR);
  if (status === 'confirmed' || status === 'checked_in') stamp('confirmed', rng.int(1, 120) * HOUR);
  if (status === 'declined') stamp('declined', rng.int(1, 120) * HOUR);
  let checkedInAt: string | null = null;
  let partyAdmitted = 0;
  const rsvpPartySize =
    status === 'confirmed' || status === 'checked_in'
      ? rng.int(1, partySizeAllowed)
      : status === 'declined'
        ? 0
        : null;
  if (status === 'checked_in' && opts.checkInWindow) {
    const [a, b] = opts.checkInWindow;
    checkedInAt = iso(a + rng.next() * (b - a));
    timeline.checked_in = checkedInAt;
    partyAdmitted = rsvpPartySize ?? 1;
  }
  const channelLast: MessageChannel | null =
    rank >= STATUS_RANK.sent
      ? pref === 'print'
        ? 'print'
        : pref === 'sms'
          ? 'sms'
          : 'whatsapp'
      : null;
  const pledged = rng.chance(0.6);
  const g: GuestRecord = {
    id,
    eventId,
    cardKind: 'invitation',
    displayName: name,
    phoneE164: noPhone ? null : phoneFor(rng),
    hasSmartphone,
    groupLabel: group,
    partySizeAllowed,
    shortCode: uniqueCode(ctx, eventId),
    tokenVersion: 1,
    token: rng.token(),
    language: rng.chance(0.93) ? 'en' : 'sw',
    inviteChannelPref: pref,
    notes: elder && rng.chance(0.3) ? 'Mpelekee kadi ya karatasi nyumbani' : '',
    status,
    timeline,
    rsvpPartySize,
    channelLast,
    checkedInAt,
    partyAdmitted,
    pledgeAmount: pledged ? rng.pick(PLEDGE_AMOUNTS) : null,
    pledgeWaived: false,
    createdAt: iso(created),
    updatedAt: iso(t),
    deletedAt: null,
  };
  ctx.state.guests.push(g);

  // Messages consistent with the status.
  if (rank >= STATUS_RANK.sent && channelLast && channelLast !== 'print') {
    const sentAt = Date.parse(timeline.sent!);
    const failedFirst = channelLast === 'whatsapp' && rng.chance(0.06);
    if (failedFirst) {
      ctx.state.messages.push({
        id: rng.uuid(),
        eventId,
        guestId: id,
        channel: 'whatsapp',
        provider: 'whatsapp-cloud',
        kind: 'invite',
        status: 'failed',
        error: 'not_on_whatsapp',
        cost: 0,
        createdAt: iso(sentAt),
      });
      ctx.state.messages.push({
        id: rng.uuid(),
        eventId,
        guestId: id,
        channel: 'sms',
        provider: 'fake-sms',
        kind: 'invite',
        status: rank >= STATUS_RANK.delivered ? 'delivered' : 'sent',
        error: null,
        cost: 25,
        createdAt: iso(sentAt + 6 * HOUR),
      });
      g.channelLast = 'sms';
    } else {
      ctx.state.messages.push({
        id: rng.uuid(),
        eventId,
        guestId: id,
        channel: channelLast,
        provider: channelLast === 'sms' ? 'fake-sms' : 'whatsapp-cloud',
        kind: 'invite',
        status:
          rank >= STATUS_RANK.opened && channelLast === 'whatsapp'
            ? 'read'
            : rank >= STATUS_RANK.delivered
              ? 'delivered'
              : 'sent',
        error: null,
        cost: channelLast === 'sms' ? 25 : 0,
        createdAt: iso(sentAt),
      });
    }
  } else if (status === 'queued' && channelLast !== 'print') {
    // Queued guests whose last attempt failed → drive "failed messages" alerts.
    ctx.state.messages.push({
      id: rng.uuid(),
      eventId,
      guestId: id,
      channel: hasSmartphone ? 'whatsapp' : 'sms',
      provider: hasSmartphone ? 'whatsapp-cloud' : 'fake-sms',
      kind: 'invite',
      status: 'failed',
      error: rng.pick(['invalid_number', 'provider_timeout', 'not_on_whatsapp']),
      cost: 0,
      createdAt: timeline.queued ?? iso(created),
    });
  }

  // Payments against the pledge.
  if (g.pledgeAmount) {
    const r = rng.next();
    const paidShare = r < 0.4 ? 1 : r < 0.65 ? rng.pick([0.25, 0.5, 0.6]) : 0;
    let remaining = Math.round((g.pledgeAmount * paidShare) / 5000) * 5000;
    let at = created + rng.int(3, 20) * DAY;
    while (remaining > 0) {
      const part =
        remaining > 50_000 && rng.chance(0.3) ? Math.round(remaining / 2 / 5000) * 5000 : remaining;
      const method = rng.weighted(PAY_METHODS);
      at = Math.min(ctx.now - 2 * HOUR, at + rng.int(1, 6) * DAY);
      ctx.state.payments.push({
        id: rng.uuid(),
        eventId,
        guestId: id,
        guestName: g.displayName,
        amount: part,
        method,
        status: 'success',
        reference:
          method === 'cash'
            ? `CASH-${rng.hex(6).toUpperCase()}`
            : `${method.toUpperCase().slice(0, 2)}${rng.hex(8).toUpperCase()}`,
        phoneE164: method === 'cash' || method === 'bank' ? null : g.phoneE164,
        paidAt: iso(at),
        note: '',
        recordedBy: method === 'cash' || method === 'bank' ? 'Baraka Mushi' : null,
      });
      remaining -= part;
    }
  }
  return g;
}

export interface SeedOptions {
  now?: number;
  seed?: number;
}

/** Deterministic demo data relative to "today" in Dar es Salaam (same result on server and browser). */
export function createSeedState(opts: SeedOptions = {}): MockState {
  const now = opts.now ?? Date.now();
  const today = startOfDayEAT(now);
  const rng = new Rng(mulberry32(opts.seed ?? 20_261_013));
  const state: MockState = {
    version: 5,
    seedDay: iso(today),
    users: [],
    sessionUserId: null,
    events: [],
    guests: [],
    messages: [],
    payments: [],
    scans: [],
    members: {},
    audit: {},
    jobs: [],
    pendingPayments: {},
    retiredTokens: {},
    idempotency: {},
    otp: {},
    dataRequests: [],
    opsAudit: [],
    staffVerified: false,
  };
  // Everything is anchored to midnight EAT so the seed is identical for the whole day (server ≡ browser).
  const anchor = today;
  const ctx: BuildCtx = { rng, now: anchor, state, usedCodes: new Set() };

  const customer = (
    id: string,
    name: string,
    phoneE164: string,
    createdDaysAgo: number,
    lastLoginDaysAgo: number | null,
  ): User => ({
    id,
    name,
    phoneE164,
    roleGlobal: 'user',
    status: 'active',
    suspendedReason: null,
    createdAt: iso(anchor - createdDaysAgo * DAY),
    lastLoginAt: lastLoginDaysAgo === null ? null : iso(anchor - lastLoginDaysAgo * DAY),
  });
  const owner = customer('user-owner', 'Juma Mrisho', '+255712000001', 120, 0);
  const committee = customer('user-committee', 'Baraka Mushi', '+255754000222', 110, 1);
  const gate = customer('user-gate', 'Rehema Said', '+255683000333', 100, 6);
  // Staff account for the ops panel (/ops). Mock login: 0700 000 999 + 123456.
  const staff: User = {
    ...customer('user-staff', 'Zawadi Kimaro (Kadi Sasa)', '+255700000999', 200, 0),
    roleGlobal: 'admin',
    staffRole: 'admin',
  };
  const supportAgent: User = {
    ...customer('user-staff-support', 'Omari Said (Msaada)', '+255700000998', 90, 3),
    roleGlobal: 'admin',
    staffRole: 'support',
  };
  const billingAgent: User = {
    ...customer('user-staff-billing', 'Pendo Mrema (Malipo)', '+255700000997', 80, 4),
    roleGlobal: 'admin',
    staffRole: 'billing',
  };
  state.users.push(owner, committee, gate, staff, supportAgent, billingAgent);

  // Upcoming event (52 days ahead, 16:00 EAT).
  const upcomingDate = today + 52 * DAY + 16 * HOUR;
  const upcomingCreated = today - 45 * DAY;
  const upcoming = baseEvent({
    id: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001',
    partnerA: 'Asha',
    partnerB: 'Juma',
    dateStart: iso(upcomingDate),
    venueName: 'Ukumbi wa Mwanga, Kibaha',
    venueMapUrl: 'https://www.openstreetmap.org/?mlat=-6.7667&mlon=38.9167#map=16/-6.7667/38.9167',
    dressCode: 'Kijani na dhahabu',
    rsvpDeadline: iso(upcomingDate - 14 * DAY),
    contributionTarget: 20_000_000,
    senderName: 'Kamati ya Harusi ya Asha & Juma',
    committeePhone: committee.phoneE164,
    greeting: 'Kwa furaha kubwa, familia za Mwinyi na Mrisho zinakualika',
    extraNote: 'Chakula na burudani vitafuata baada ya sherehe.',
    createdAt: iso(upcomingCreated),
    updatedAt: iso(today - 2 * DAY),
  });
  state.events.push(upcoming);
  const upcomingStatuses: readonly (readonly [InvitationStatus, number])[] = [
    ['created', 8],
    ['queued', 3],
    ['sent', 8],
    ['delivered', 15],
    ['opened', 13],
    ['confirmed', 45],
    ['declined', 8],
  ];
  for (let i = 0; i < 326; i++)
    addGuest(ctx, upcoming.id, upcomingCreated, { status: rng.weighted(upcomingStatuses) });

  // Past event (30 days ago, 15:00 EAT), fully checked in.
  const pastDate = today - 30 * DAY + 15 * HOUR;
  const pastCreated = pastDate - 70 * DAY;
  const past = baseEvent({
    id: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0002',
    partnerA: 'Rehema',
    partnerB: 'Daudi',
    dateStart: iso(pastDate),
    venueName: 'Diamond Jubilee Hall, Dar es Salaam',
    venueMapUrl: 'https://www.openstreetmap.org/?mlat=-6.7924&mlon=39.2083#map=16/-6.7924/39.2083',
    dressCode: 'Rangi za kitenge',
    status: 'completed',
    themeId: 'terracotta',
    coverGradient: 'linear-gradient(135deg,#9A3B1F 0%,#C26A3F 60%,#E2B07A 100%)',
    rsvpDeadline: iso(pastDate - 14 * DAY),
    contributionTarget: 8_000_000,
    senderName: 'Kamati ya Harusi ya Rehema & Daudi',
    committeePhone: committee.phoneE164,
    greeting: 'Familia za Said na Kimaro zinayo furaha kukualika',
    createdAt: iso(pastCreated),
    updatedAt: iso(pastDate + DAY),
  });
  state.events.push(past);
  const window: [number, number] = [pastDate - HOUR, pastDate + 3.5 * HOUR];
  const pastStatuses: readonly (readonly [InvitationStatus, number])[] = [
    ['checked_in', 72],
    ['confirmed', 10],
    ['declined', 10],
    ['opened', 5],
    ['delivered', 3],
  ];
  const pastGuests = Array.from({ length: 140 }, () =>
    addGuest(ctx, past.id, pastCreated, {
      status: rng.weighted(pastStatuses),
      checkInWindow: window,
    }),
  );
  const gates = ['Lango A', 'Lango B'];
  const devices = ['Tecno Spark (Rehema)', 'Samsung A05 (Baraka)'];
  for (const g of pastGuests) {
    if (!g.checkedInAt) continue;
    const gi = rng.int(0, 1);
    const manual = rng.chance(0.06);
    state.scans.push({
      id: rng.uuid(),
      eventId: past.id,
      guestId: g.id,
      guestName: g.displayName,
      result: manual ? 'manual_ok' : 'ok',
      partyAdmitted: g.partyAdmitted,
      gateName: gates[gi]!,
      deviceName: devices[gi]!,
      scannedBy: gi ? committee.name : gate.name,
      scannedAt: g.checkedInAt,
      reason: manual ? 'Simu imezima' : null,
    });
    if (rng.chance(0.05)) {
      state.scans.push({
        id: rng.uuid(),
        eventId: past.id,
        guestId: g.id,
        guestName: g.displayName,
        result: 'duplicate',
        partyAdmitted: 0,
        gateName: gates[1 - gi]!,
        deviceName: devices[1 - gi]!,
        scannedBy: gi ? gate.name : committee.name,
        scannedAt: iso(Date.parse(g.checkedInAt) + rng.int(5, 50) * 60_000),
        reason: null,
      });
    }
  }
  for (let i = 0; i < 3; i++) {
    state.scans.push({
      id: rng.uuid(),
      eventId: past.id,
      guestId: null,
      guestName: null,
      result: i === 2 ? 'wrong_event' : 'invalid_sig',
      partyAdmitted: 0,
      gateName: gates[i % 2]!,
      deviceName: devices[i % 2]!,
      scannedBy: gate.name,
      scannedAt: iso(window[0] + rng.next() * (window[1] - window[0])),
      reason: null,
    });
  }
  state.scans.sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));

  // Team (§2): owner + committee + gate agent (+ one pending invite on the upcoming event).
  const team = (
    role: MemberRole,
    u: User,
    lastActive: number | null,
    status: Member['status'] = 'active',
  ) => ({
    id: `m-${u.id}`,
    userId: u.id,
    name: u.name,
    phoneE164: u.phoneE164,
    role,
    status,
    lastActiveAt: lastActive ? iso(lastActive) : null,
  });
  state.members[upcoming.id] = [
    team('owner', owner, anchor - 20 * 60_000),
    team('committee', committee, anchor - 3 * HOUR),
    team('gate', gate, anchor - 6 * DAY),
    {
      id: 'm-invited-1',
      userId: null,
      name: 'Hassani Kombo',
      phoneE164: '+255765000444',
      role: 'committee',
      status: 'invited',
      lastActiveAt: null,
    },
  ];
  state.members[past.id] = [
    team('owner', owner, pastDate + DAY),
    team('committee', committee, pastDate + HOUR),
    team('gate', gate, pastDate + 4 * HOUR),
  ];

  // One reissued guest on the upcoming event, so the "imebadilishwa" state is demonstrable.
  const reissued = state.guests.find(
    (g) => g.eventId === upcoming.id && g.status === 'opened' && g.phoneE164,
  );
  if (reissued) {
    state.retiredTokens[reissued.token] = reissued.id;
    reissued.token = rng.token();
    reissued.tokenVersion = 2;
    state.audit[reissued.id] = [
      {
        id: rng.uuid(),
        at: iso(anchor - 4 * DAY),
        actorName: owner.name,
        action: 'reissue',
        details: 'Simu ya mgeni iliibiwa; kadi mpya imetolewa (toleo 2).',
      },
    ];
  }
  // Other customers, so the ops panel has a realistic book of business. Generated after everything
  // above, so existing seed data (and card tokens) stay identical.
  const others: {
    user: User;
    partnerA: string;
    partnerB: string;
    days: number;
    venue: string;
    guests: number;
    theme: EventRecord['themeId'];
    plan: EventRecord['plan'];
    status?: EventRecord['status'];
  }[] = [
    {
      user: customer('user-c1', 'Neema Lyimo', '+255715330112', 60, 2),
      partnerA: 'Neema',
      partnerB: 'Erasto',
      days: 20,
      venue: 'Mlimani City Hall, Dar es Salaam',
      guests: 48,
      theme: 'rose-sage',
      plan: 'paid',
    },
    {
      user: customer('user-c2', 'Hassani Omari', '+255762114508', 40, 5),
      partnerA: 'Mwanaidi',
      partnerB: 'Hassani',
      days: 75,
      venue: 'Golden Tulip, Zanzibar',
      guests: 36,
      theme: 'navy-silver',
      plan: 'free',
    },
    {
      user: customer('user-c3', 'Grace Swai', '+255689220731', 15, 1),
      partnerA: 'Grace',
      partnerB: 'Frank',
      days: 110,
      venue: 'Kanisa la Azania Front, Dar es Salaam',
      guests: 0,
      theme: 'emerald-gold',
      plan: 'free',
      status: 'draft',
    },
    {
      user: customer('user-c4', 'Selemani Bakari', '+255774009915', 90, 30),
      partnerA: 'Zuhura',
      partnerB: 'Selemani',
      days: -12,
      venue: 'Ukumbi wa Shekilango, Dar es Salaam',
      guests: 42,
      theme: 'terracotta',
      plan: 'paid',
      status: 'completed',
    },
  ];
  for (const [i, o] of others.entries()) {
    state.users.push(o.user);
    const date = today + o.days * DAY + 15 * HOUR;
    const created = date - Math.max(45, o.days + 30) * DAY;
    const ev = baseEvent({
      id: `0192f1a0-7c3e-7a11-9b2c-5e8d4a6f01${String(i + 1).padStart(2, '0')}`,
      partnerA: o.partnerA,
      partnerB: o.partnerB,
      dateStart: iso(date),
      venueName: o.venue,
      themeId: o.theme,
      plan: o.plan,
      status: o.status ?? 'active',
      contributionTarget: 5_000_000,
      senderName: `Kamati ya Harusi ya ${o.partnerA} & ${o.partnerB}`,
      committeePhone: o.user.phoneE164,
      createdAt: iso(created),
      updatedAt: iso(anchor - DAY),
    });
    state.events.push(ev);
    const past = o.days < 0;
    const statuses: readonly (readonly [InvitationStatus, number])[] = past
      ? [
          ['checked_in', 70],
          ['confirmed', 10],
          ['declined', 10],
          ['opened', 10],
        ]
      : [
          ['created', 15],
          ['sent', 15],
          ['delivered', 20],
          ['opened', 15],
          ['confirmed', 30],
          ['declined', 5],
        ];
    for (let n = 0; n < o.guests; n++)
      addGuest(ctx, ev.id, created, {
        status: rng.weighted(statuses),
        checkInWindow: past ? [date - HOUR, date + 3 * HOUR] : undefined,
      });
    state.members[ev.id] = [
      {
        id: `m-${o.user.id}`,
        userId: o.user.id,
        name: o.user.name,
        phoneE164: o.user.phoneE164,
        role: 'owner',
        status: 'active',
        lastActiveAt: o.user.lastLoginAt ?? null,
      },
    ];
  }
  // One customer suspended for sending promotional SMS (§ terms: no advertising).
  const suspended = customer('user-c5', 'Kampuni ya Matangazo XYZ', '+255656000777', 25, 9);
  state.users.push({
    ...suspended,
    status: 'suspended',
    suspendedReason: 'Alituma matangazo kwa kutumia mialiko (kinyume na masharti).',
  });

  state.dataRequests.push(
    {
      id: 'dr-1',
      userId: 'user-c2',
      userName: 'Hassani Omari',
      phoneE164: '+255762114508',
      kind: 'export',
      status: 'open',
      requestedAt: iso(anchor - 2 * DAY),
      resolvedAt: null,
      resolvedBy: null,
      note: '',
    },
    {
      id: 'dr-2',
      userId: 'user-c4',
      userName: 'Selemani Bakari',
      phoneE164: '+255774009915',
      kind: 'deletion',
      status: 'open',
      requestedAt: iso(anchor - 5 * DAY),
      resolvedAt: null,
      resolvedBy: null,
      note: '',
    },
    {
      id: 'dr-3',
      userId: 'user-c1',
      userName: 'Neema Lyimo',
      phoneE164: '+255715330112',
      kind: 'export',
      status: 'done',
      requestedAt: iso(anchor - 20 * DAY),
      resolvedAt: iso(anchor - 19 * DAY),
      resolvedBy: staff.name,
      note: 'Kiungo cha kupakua kimetumwa kwa SMS.',
    },
  );
  state.opsAudit.push(
    {
      id: 'oa-1',
      at: iso(anchor - 9 * DAY),
      actorName: staff.name,
      action: 'suspend',
      target: 'Kampuni ya Matangazo XYZ',
      details: 'Alituma matangazo kwa kutumia mialiko (kinyume na masharti).',
    },
    {
      id: 'oa-2',
      at: iso(anchor - 19 * DAY),
      actorName: staff.name,
      action: 'resolve_request',
      target: 'Neema Lyimo',
      details: 'Ombi la nakala ya data limekamilika.',
    },
  );
  return state;
}

/** A deterministic card token that is always valid in the seed — handy for demos and e2e tests. */
export function sampleCardToken(state: MockState, status: InvitationStatus = 'delivered'): string {
  const g = state.guests.find(
    (x) =>
      x.eventId === state.events[0]!.id &&
      x.status === status &&
      x.phoneE164 &&
      x.tokenVersion === 1,
  );
  return (g ?? state.guests[0]!).token;
}
