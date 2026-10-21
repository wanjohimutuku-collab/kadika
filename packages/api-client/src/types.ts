import type { OpsPurchase } from '@harusi/schemas/billing';
import type {
  CardContent,
  CardKind,
  ChannelPref,
  Country,
  Currency,
  InvitationStatus,
  Language,
  MemberRole,
  MessageChannel,
  PaymentMethod,
  PaymentStatus,
  PledgeStatus,
  ScanResult,
} from '@harusi/schemas';
import type { ThemeId } from '@harusi/ui-tokens/themes';
import type { PaletteOverrides } from '@harusi/ui-tokens/palette';

export type { ThemeId };
export type ISODate = string;

export type StaffRole = 'support' | 'billing' | 'admin';

export type StaffPermission =
  | 'read'
  | 'lookup'
  | 'reveal'
  | 'requests'
  | 'plan'
  | 'suspend'
  /** SMS and WhatsApp provider settings (ADR 031). */
  | 'settings';

/** What each staff level may do. Reads of aggregate data are open to all staff. */
export const STAFF_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  support: ['read', 'lookup', 'reveal', 'requests'],
  billing: ['read', 'plan'],
  admin: ['read', 'lookup', 'reveal', 'requests', 'plan', 'suspend', 'settings'],
};

export interface User {
  id: string;
  name: string;
  phoneE164: string;
  /** `admin` = staff of the business (ops panel). Customers are `user`. */
  roleGlobal?: 'user' | 'admin';
  /** Staff level (ops panel). support: lookups, reveals, data requests · billing: plans · admin: everything incl. suspension. */
  staffRole?: StaffRole;
  status?: 'active' | 'suspended';
  suspendedReason?: string | null;
  createdAt?: ISODate;
  lastLoginAt?: ISODate | null;
}

export interface Session {
  user: User;
  /** Staff accounts must pass a second factor before any data is available. */
  needsSecondFactor?: boolean;
  /** With `needsSecondFactor`: false when the authenticator app still has to be set up (ADR 040). */
  secondFactorEnrolled?: boolean;
  /** Role on the currently selected event (mock: switchable in the dev panel). */
  role: MemberRole;
  expiresAt: ISODate;
}

export interface ReminderSettings {
  t14: boolean;
  t7: boolean;
  t1: boolean;
}

export interface EventStats {
  invited: number;
  sent: number;
  delivered: number;
  opened: number;
  confirmed: number;
  declined: number;
  attended: number;
  headcountConfirmed: number;
  headcountAttended: number;
  pledged: number;
  collected: number;
  /** Guests whose pledge still has a balance. */
  guestsWithBalance: number;
  failedMessages: number;
  featurePhoneGuests: number;
  /** Guests who hold a contribution card; they are counted apart from the invitation funnel (ADR 029). */
  contributionGuests: number;
}

export type EventStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface WeddingEvent {
  /** The signed-in user's role in this event (the API returns it; mocks omit it = owner). */
  myRole?: 'owner' | 'committee' | 'gate';
  id: string;
  title: string;
  /** Organiser-written texts, labels and toggles for the cards and messages (ADR 029). */
  cardContent: CardContent;
  /** Free-text kind of invitation the organiser chose (Harusi, Send-off, Uchumba, or their own words). */
  eventKind: string;
  partnerA: string;
  /** Second host; empty for single-host events. */
  partnerB: string;
  coupleNames: string;
  dateStart: ISODate;
  venueName: string;
  venueMapUrl: string;
  dressCode: string;
  languageDefault: Language;
  /** Country, currency and time zone of the event (ADR 025). Money amounts are in `currency`. */
  country: Country;
  currency: Currency;
  timezone: string;
  status: EventStatus;
  themeId: ThemeId;
  coverGradient: string;
  /** Colour overrides on top of the theme; empty = the preset as is. */
  palette: PaletteOverrides;
  rsvpDeadline: ISODate | null;
  contributionTarget: number;
  /** Shown on the trust strip (§7.2): who sent the invitation and how to call them. */
  senderName: string;
  committeePhone: string;
  pledgesEnabled: boolean;
  /** §7.5 policy toggle, default OFF. */
  requirePledgeBeforeCard: boolean;
  greeting: string;
  extraNote: string;
  reminders: ReminderSettings;
  whatsappFallbackHours: number;
  plan: 'free' | 'paid';
  createdAt: ISODate;
  updatedAt: ISODate;
  stats: EventStats;
}

export interface PledgeSummary {
  amount: number;
  paid: number;
  balance: number;
  status: PledgeStatus;
}

export interface Guest {
  id: string;
  eventId: string;
  /** `contribution` guests get a contribution card only: no RSVP, no QR, not admitted. */
  cardKind: CardKind;
  displayName: string;
  phoneE164: string | null;
  hasSmartphone: boolean;
  groupLabel: string;
  partySizeAllowed: number;
  shortCode: string;
  tokenVersion: number;
  language: Language;
  inviteChannelPref: ChannelPref;
  notes: string;
  status: InvitationStatus;
  /** Highest status reached before a terminal answer; used for timelines. */
  timeline: Partial<Record<InvitationStatus, ISODate>>;
  rsvpPartySize: number | null;
  channelLast: MessageChannel | null;
  lastMessageFailed: boolean;
  checkedInAt: ISODate | null;
  partyAdmitted: number;
  pledge: PledgeSummary | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageLogEntry {
  id: string;
  guestId: string;
  channel: MessageChannel;
  provider: string;
  kind: 'invite' | 'reminder' | 'thank_you' | 'test';
  status: MessageStatus;
  error: string | null;
  cost: number;
  createdAt: ISODate;
}

export interface PledgeRow {
  guestId: string;
  displayName: string;
  groupLabel: string | null;
  shortCode: string;
  amount: number;
  paid: number;
  balance: number;
  status: PledgeStatus | null;
  note: string | null;
}

export interface PledgeSummaryView {
  totals: {
    targetAmount: number;
    pledged: number;
    collected: number;
    balance: number;
    guestsWithBalance: number;
  };
  guests: PledgeRow[];
}

export interface AuditItem {
  id: string;
  at: ISODate;
  /** A name if the person gave one, otherwise the last four digits of their phone. */
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: Record<string, unknown> | null;
}

export interface AuditPage {
  items: AuditItem[];
  nextBefore: string | null;
}

export interface Payment {
  id: string;
  guestId: string;
  guestName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  phoneE164: string | null;
  paidAt: ISODate;
  note: string;
  recordedBy: string | null;
}

export interface ScanEntry {
  id: string;
  eventId: string;
  guestId: string | null;
  guestName: string | null;
  result: ScanResult;
  partyAdmitted: number;
  gateName: string;
  deviceName: string;
  scannedBy: string;
  scannedAt: ISODate;
  reason: string | null;
}

export type MemberStatus = 'active' | 'invited' | 'revoked';

export interface Member {
  id: string;
  name: string;
  phoneE164: string;
  role: MemberRole;
  status: MemberStatus;
  lastActiveAt: ISODate | null;
}

export interface GateLink {
  url: string;
  code: string;
  /** Shown once; only its hash is stored (§9). */
  pin: string;
  expiresAt: ISODate;
}

export type ActivityKind =
  | 'rsvp_yes'
  | 'rsvp_no'
  | 'opened'
  | 'payment'
  | 'message_failed'
  | 'checked_in'
  | 'duplicate_scan'
  | 'guest_added'
  | 'import'
  | 'send';

export interface Activity {
  id: string;
  at: ISODate;
  kind: ActivityKind;
  guestId: string | null;
  guestName: string | null;
  amount?: number;
  count?: number;
}

export interface AuditEntry {
  id: string;
  at: ISODate;
  actorName: string;
  action: string;
  details: string;
}

export type CardState = 'ok' | 'reissued' | 'invalid';

/** Public guest-card view (`GET /v1/c/:token`). Contains no other guests' data. */
export interface CardView {
  token: string;
  state: CardState;
  /** `contribution` cards ask for a contribution only: no RSVP, no QR (ADR 029). */
  cardKind: CardKind;
  event:
    | (Pick<
        WeddingEvent,
        | 'id'
        | 'eventKind'
        | 'partnerA'
        | 'partnerB'
        | 'coupleNames'
        | 'dateStart'
        | 'venueName'
        | 'venueMapUrl'
        | 'dressCode'
        | 'themeId'
        | 'coverGradient'
        | 'palette'
        | 'rsvpDeadline'
        | 'senderName'
        | 'committeePhone'
        | 'pledgesEnabled'
        | 'greeting'
        | 'extraNote'
        | 'timezone'
        | 'country'
        | 'currency'
        | 'cardContent'
        | 'contributionTarget'
      > & {
        /** Guests can pay through us; off by default, so the card lists the hosts' own accounts (ADR 043). */
        onlinePay: boolean;
      })
    | null;
  guest: {
    displayName: string;
    partySizeAllowed: number;
    shortCode: string;
    groupLabel: string;
    language: Language;
  } | null;
  /** Raised so far, only when the organiser chose to show progress on contribution cards. */
  contributionCollected?: number | null;
  /** Signed QR payload (§6.1). In mocks: `v1.….MOCKSIG`. */
  qrPayload: string | null;
  rsvp: { status: 'pending' | 'confirmed' | 'declined'; partySize: number | null };
  pledge: PledgeSummary | null;
  rsvpOpen: boolean;
  eventPassed: boolean;
  isMock: boolean;
}

export interface SendRequest {
  audience:
    | { kind: 'unsent' }
    | { kind: 'group'; group: string }
    | { kind: 'selected'; guestIds: string[] }
    | { kind: 'all' };
  channel: 'auto' | MessageChannel;
  whatsappFallbackToSms: boolean;
  scheduleAt: ISODate | null;
  kind: 'invite' | 'reminder' | 'thank_you';
  /**
   * Which cards to send: invitation cards or contribution cards. Left out, both go, as before (ADR 041).
   * A contribution card is a first message; its follow-up is a pledge reminder, not a `reminder`.
   */
  cardKind?: CardKind;
  idempotencyKey: string;
  /** Optional custom body for thank-you broadcasts. */
  body?: string;
}

export interface SendJobFailure {
  guestId: string;
  guestName: string;
  channel: MessageChannel;
  error: string;
}

export interface SendJob {
  id: string;
  eventId: string;
  kind: SendRequest['kind'];
  /** The cards this send is for; `null` when it went to both (older sends). */
  cardKind?: CardKind | null;
  total: number;
  counts: { queued: number; sent: number; delivered: number; failed: number };
  byChannel: Record<MessageChannel, number>;
  failures: SendJobFailure[];
  status: 'scheduled' | 'running' | 'done';
  scheduledFor: ISODate | null;
  createdAt: ISODate;
}

export interface SendPreview {
  total: number;
  byChannel: Record<MessageChannel, number>;
  smsSegments: number;
  estimatedSmsCost: number;
  withoutPhone: number;
}

export interface GuestQuery {
  search?: string;
  cardKind?: CardKind;
  filter?: GuestFilter;
  group?: string;
  sort?: { by: 'name' | 'status' | 'group' | 'updated' | 'balance'; dir: 'asc' | 'desc' };
}

export type GuestFilter =
  | 'all'
  | 'unsent'
  | 'confirmed'
  | 'no_reply'
  | 'declined'
  | 'no_smartphone'
  | 'failed'
  | 'checked_in';

export interface ImportRowInput {
  displayName: string;
  phoneRaw: string;
  groupLabel: string;
  partySizeAllowed: number;
  hasSmartphone: boolean;
  inviteChannelPref: ChannelPref;
}

export interface ImportResult {
  created: number;
  skipped: number;
}

/** What a whole imported list is: invitation cards (the default) or contribution cards (ADR 029). */
export interface ImportOptions {
  cardKind?: CardKind;
}

export interface PaymentStart {
  reference: string;
  amount: number;
  phoneE164: string;
  method: PaymentMethod;
  expiresAt: ISODate;
}

export interface PaymentStatusView {
  reference: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  amount: number;
  method: PaymentMethod;
  paidAt: ISODate | null;
  duplicateWebhook: boolean;
  newBalance: number | null;
  failureReason: string | null;
}

export interface ChannelPerformance {
  channel: MessageChannel;
  sent: number;
  delivered: number;
  opened: number;
  confirmed: number;
}

export interface EventReport {
  stats: EventStats;
  channels: ChannelPerformance[];
  arrivalsByHour: { hour: string; count: number }[];
  collectionsByWeek: { week: string; amount: number }[];
  pledgeReconciliation: {
    pledged: number;
    collected: number;
    outstanding: number;
    overpaid: number;
    guestsPaid: number;
    guestsPartial: number;
    guestsUnpaid: number;
  };
  headcountForecast: number;
  headcountTarget: number;
}

export interface GateOverview {
  admittedGuests: number;
  admittedPeople: number;
  expectedGuests: number;
  expectedPeople: number;
  duplicates: number;
  invalid: number;
  manual: number;
  arrivalsByHour: { hour: string; count: number }[];
  perGate: { gateName: string; ok: number; duplicate: number; invalid: number; manual: number }[];
  revoked: {
    guestId: string;
    guestName: string;
    shortCode: string;
    tokenVersion: number;
    revokedAt: ISODate;
  }[];
}

// ---------------------------------------------------------------- staff (ops) panel

export interface OpsOverview {
  organizers: number;
  suspendedOrganizers: number;
  newOrganizers30d: number;
  events: Record<EventStatus, number> & { total: number };
  guests: number;
  messages30d: { whatsapp: number; sms: number; failed: number; total: number };
  smsCost30d: number;
  failureRate30d: number;
  paidPlans: number;
  /** Paid card bundles and message packs in the last 30 days, per currency (ADR 042). Grants excluded. */
  revenue30d: { currency: 'TZS' | 'KES'; amount: number; orders: number }[];
  /** Bank or cash orders waiting for staff to confirm the money. */
  pendingOrders: number;
  messagesByDay: { day: ISODate; sent: number; failed: number }[];
  openDataRequests: number;
}

export interface OpsOrganizer {
  id: string;
  name: string;
  phoneE164: string;
  status: 'active' | 'suspended';
  suspendedReason: string | null;
  createdAt: ISODate | null;
  lastLoginAt: ISODate | null;
  eventCount: number;
  guestCount: number;
  messagesSent: number;
}

export interface OpsEvent {
  id: string;
  coupleNames: string;
  dateStart: ISODate;
  status: EventStatus;
  plan: 'free' | 'paid';
  ownerId: string;
  ownerName: string;
  guests: number;
  sent: number;
  failedMessages: number;
  confirmed: number;
  smsCost: number;
}

export interface OpsUsage {
  byChannel: {
    channel: 'whatsapp' | 'sms';
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }[];
  byDay: { day: ISODate; whatsapp: number; sms: number; failed: number }[];
  topEvents: {
    eventId: string;
    coupleNames: string;
    whatsapp: number;
    sms: number;
    failed: number;
    cost: number;
  }[];
  failureReasons: { reason: string; count: number }[];
}

export interface OpsGuestHit {
  guestId: string;
  eventId: string;
  coupleNames: string;
  displayName: string;
  phoneMasked: string | null;
  shortCode: string;
  status: Guest['status'];
}

export interface OpsLookupResult {
  organizers: OpsOrganizer[];
  guests: OpsGuestHit[];
  /** Billing orders (ADR 042) by reference or event; guests' contributions are not searchable (ADR 043). */
  orders: OpsPurchase[];
}

export interface DataRequest {
  id: string;
  userId: string;
  userName: string;
  phoneE164: string;
  kind: 'export' | 'deletion';
  status: 'open' | 'done' | 'rejected';
  requestedAt: ISODate;
  resolvedAt: ISODate | null;
  resolvedBy: string | null;
  note: string;
}

export interface OpsAuditEntry {
  id: string;
  at: ISODate;
  actorName: string;
  action:
    | 'reveal_phone'
    | 'suspend'
    | 'reactivate'
    | 'set_plan'
    | 'resolve_request'
    | 'lookup'
    | 'messaging'
    | 'payments'
    | 'branding'
    | 'pricing'
    | 'grant'
    | 'purchase_paid';
  target: string;
  details: string;
}

export type {
  Allowance,
  BillingOrderInput,
  EventBillingView,
  OpsEventBilling,
  OpsPurchase,
  PricingCatalog,
  PricingView,
  PurchaseStatus,
  PurchaseView,
  QuotaExceededDetails,
} from '@harusi/schemas/billing';
