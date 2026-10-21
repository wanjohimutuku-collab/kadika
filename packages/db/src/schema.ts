import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  doublePrecision,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

// All IDs are UUIDv7 (generated app-side; Postgres 16 has no native uuidv7).
const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// Enums
export const globalRoleEnum = pgEnum('global_role', ['user', 'admin']);
export const staffRoleEnum = pgEnum('staff_role', ['support', 'billing', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);
export const eventStatusEnum = pgEnum('event_status', ['draft', 'active', 'completed', 'archived']);
export const cardKindEnum = pgEnum('card_kind', ['invitation', 'contribution']);
export const countryEnum = pgEnum('country', ['TZ', 'KE']);
export const currencyEnum = pgEnum('currency', ['TZS', 'KES']);
export const eventPlanEnum = pgEnum('event_plan', ['free', 'paid']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'committee', 'gate']);
export const languageEnum = pgEnum('language', ['sw', 'en']);
export const channelPrefEnum = pgEnum('invite_channel_pref', ['whatsapp', 'sms', 'print', 'mixed']);
export const invitationStatusEnum = pgEnum('invitation_status', [
  'created',
  'queued',
  'sent',
  'delivered',
  'opened',
  'confirmed',
  'declined',
  'checked_in',
]);
export const messageChannelEnum = pgEnum('message_channel', ['whatsapp', 'sms', 'print']);
export const pledgeStatusEnum = pgEnum('pledge_status', ['pledged', 'partial', 'paid', 'waived']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed']);
export const scanResultEnum = pgEnum('scan_result', [
  'ok',
  'duplicate',
  'invalid_sig',
  'wrong_event',
  'not_found',
  'manual_ok',
  'manual_denied',
]);

export const users = pgTable(
  'users',
  {
    id: id(),
    name: text('name').notNull(),
    phoneE164: text('phone_e164').notNull(),
    email: text('email'),
    roleGlobal: globalRoleEnum('role_global').notNull().default('user'),
    staffRole: staffRoleEnum('staff_role'),
    status: userStatusEnum('status').notNull().default('active'),
    suspendedReason: text('suspended_reason'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    /** Set when staff complete a PDPA deletion request (ADR 039): name and phone are wiped. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_phone_e164_uq').on(t.phoneE164)],
);

export const events = pgTable('events', {
  id: id(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  /** Free-text kind of occasion the organiser typed (e.g. Harusi, Send-off, Uchumba); display only. */
  eventKind: text('event_kind'),
  coupleNames: text('couple_names').notNull(),
  dateStart: timestamp('date_start', { withTimezone: true }).notNull(),
  venueName: text('venue_name'),
  venueLat: doublePrecision('venue_lat'),
  venueLng: doublePrecision('venue_lng'),
  venueMapUrl: text('venue_map_url'),
  dressCode: text('dress_code'),
  committeePhone: text('committee_phone'),
  senderName: text('sender_name'),
  greeting: text('greeting'),
  languageDefault: languageEnum('language_default').notNull().default('en'),
  /** Country, currency and time zone of the event (ADR 025). Amount columns are in `currency`. */
  country: countryEnum('country').notNull().default('TZ'),
  currency: currencyEnum('currency').notNull().default('TZS'),
  timezone: text('timezone').notNull().default('Africa/Dar_es_Salaam'),
  status: eventStatusEnum('status').notNull().default('draft'),
  // Logical reference to signing_keys.id; no FK to avoid a circular dependency (see ADR 002).
  signingKeyId: uuid('signing_key_id'),
  brandTheme: jsonb('brand_theme').$type<Record<string, unknown>>(),
  /** Organiser-written texts, labels and toggles for the cards and messages (ADR 029). Validated on write. */
  cardContent: jsonb('card_content').$type<Record<string, unknown>>().notNull().default({}),
  rsvpDeadline: timestamp('rsvp_deadline', { withTimezone: true }),
  contributionTarget: integer('contribution_target'),
  /** Whether guests may pledge and pay from their card (§7.3). */
  pledgesEnabled: boolean('pledges_enabled').notNull().default(true),
  plan: eventPlanEnum('plan').notNull().default('free'),
  ...timestamps,
});

export const eventMembers = pgTable(
  'event_members',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull(),
    pinHash: text('pin_hash'),
    ...timestamps,
  },
  (t) => [uniqueIndex('event_members_event_user_uq').on(t.eventId, t.userId)],
);

export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'revoked']);

/** Team invitations by phone: accepted when the invited number signs in (ADR 012). */
export const eventInvites = pgTable(
  'event_invites',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    phoneE164: text('phone_e164').notNull(),
    name: text('name').notNull(),
    role: memberRoleEnum('role').notNull(),
    status: inviteStatusEnum('status').notNull().default('pending'),
    invitedBy: uuid('invited_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('event_invites_event_phone_uq').on(t.eventId, t.phoneE164)],
);

export const guests = pgTable(
  'guests',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    phoneE164: text('phone_e164'),
    hasSmartphone: boolean('has_smartphone'),
    groupLabel: text('group_label'),
    /** `invitation`: the full card with RSVP and QR. `contribution`: only asks for a contribution (ADR 029). */
    cardKind: cardKindEnum('card_kind').notNull().default('invitation'),
    partySizeAllowed: integer('party_size_allowed').notNull().default(1),
    shortCode: text('short_code').notNull(),
    // Last 8 hex characters of the guest id: the on-card id inside the signed QR (ADR 013).
    guestShort: text('guest_short').notNull(),
    tokenVersion: integer('token_version').notNull().default(1),
    language: languageEnum('language').notNull().default('en'),
    inviteChannelPref: channelPrefEnum('invite_channel_pref').notNull().default('mixed'),
    notes: text('notes'),
    /** Guest asked to stop reminders from the card page (§7.4). Invitations are unaffected. */
    remindersOptOut: boolean('reminders_opt_out').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('guests_event_short_code_uq').on(t.eventId, t.shortCode),
    uniqueIndex('guests_event_guest_short_uq').on(t.eventId, t.guestShort),
    index('guests_event_phone_idx').on(t.eventId, t.phoneE164),
  ],
);

export const invitations = pgTable(
  'invitations',
  {
    id: id(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    /** AES-GCM copy of the card token so the delivery service can rebuild the link (ADR 017). */
    tokenEnc: text('token_enc'),
    status: invitationStatusEnum('status').notNull().default('created'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    rsvpAt: timestamp('rsvp_at', { withTimezone: true }),
    rsvpPartySize: integer('rsvp_party_size'),
    channelLast: messageChannelEnum('channel_last'),
    ...timestamps,
  },
  (t) => [
    index('invitations_status_idx').on(t.status),
    index('invitations_guest_idx').on(t.guestId),
  ],
);

export const messageLog = pgTable(
  'message_log',
  {
    id: id(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    channel: messageChannelEnum('channel').notNull(),
    /**
     * invite | fallback | reminder | reminder_14 | reminder_7 | reminder_1 | pledge_reminder.
     * The `reminder_N` kinds dedupe the automatic sends; `reminder` is one the organiser asked for.
     */
    kind: text('kind').notNull().default('invite'),
    provider: text('provider').notNull(),
    providerMsgId: text('provider_msg_id'),
    status: text('status').notNull(),
    error: text('error'),
    cost: integer('cost'),
    /** Mobile network (MCC+MNC) the delivery report named, when the provider says (Phase 5 metrics). */
    network: text('network'),
    ...timestamps,
  },
  (t) => [
    index('message_log_provider_msg_idx').on(t.providerMsgId),
    index('message_log_guest_idx').on(t.guestId),
  ],
);

export const pledges = pgTable(
  'pledges',
  {
    id: id(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    note: text('note'),
    status: pledgeStatusEnum('status').notNull().default('pledged'),
    createdBy: uuid('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('pledges_guest_uq').on(t.guestId)],
);

export const payments = pgTable(
  'payments',
  {
    id: id(),
    pledgeId: uuid('pledge_id').references(() => pledges.id),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerRef: text('provider_ref').notNull(),
    amount: integer('amount').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    phoneE164: text('phone_e164'),
    /** mpesa | mixx | airtel | halopesa | cash | bank */
    method: text('method').notNull().default('cash'),
    note: text('note'),
    recordedBy: uuid('recorded_by').references(() => users.id),
    /** A pending mobile-money request that is not confirmed by then counts as expired. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    raw: jsonb('raw'),
    ...timestamps,
  },
  (t) => [uniqueIndex('payments_provider_ref_uq').on(t.providerRef)],
);

export const scanLog = pgTable(
  'scan_log',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    guestId: uuid('guest_id').references(() => guests.id),
    scannedBy: uuid('scanned_by').references(() => users.id),
    deviceId: text('device_id').notNull(),
    result: scanResultEnum('result').notNull(),
    partyAdmitted: integer('party_admitted').notNull().default(0),
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull(), // device time
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    offline: boolean('offline').notNull().default(false),
    /** The device's own id for this scan; makes sync idempotent (a retry never double-counts). */
    clientId: text('client_id'),
    /** What the device said at scan time. `result` is what the server decides after ordering all devices. */
    reportedResult: scanResultEnum('reported_result'),
    /** A committee/owner admitted a guest who was already in (never reordered or flipped). */
    override: boolean('override').notNull().default(false),
    reason: text('reason'),
    ...timestamps,
  },
  (t) => [
    index('scan_log_event_guest_idx').on(t.eventId, t.guestId),
    uniqueIndex('scan_log_event_client_uq').on(t.eventId, t.clientId),
  ],
);

/** Gate link + PIN (§7.6): how a gate agent without an account joins an event. */
export const gateLinks = pgTable(
  'gate_links',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    /** scrypt(pin) as `salt:hash` hex; the PIN itself is shown once and never stored. */
    pinHash: text('pin_hash').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('gate_links_code_uq').on(t.code),
    index('gate_links_event_idx').on(t.eventId),
  ],
);

/** Registered gate devices (§9): one row per event + device id, with the last time it was seen. */
export const gateDevices = pgTable(
  'gate_devices',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    linkId: uuid('link_id').references(() => gateLinks.id),
    deviceId: text('device_id').notNull(),
    name: text('name'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex('gate_devices_event_device_uq').on(t.eventId, t.deviceId)],
);

export const signingKeys = pgTable('signing_keys', {
  id: id(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  privateKeyEncrypted: text('private_key_encrypted').notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ...timestamps,
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    diff: jsonb('diff'),
    ip: text('ip'),
    /** The event this action belongs to, so an owner can read their event's trail (§9). */
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('audit_log_event_idx').on(t.eventId, t.createdAt)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_uq').on(t.tokenHash),
    index('refresh_tokens_user_idx').on(t.userId),
  ],
);

/** Replay store for `Idempotency-Key` (§8): same key + same request returns the first response. */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: jsonb('response_body'),
    ...timestamps,
  },
  (t) => [uniqueIndex('idempotency_user_key_uq').on(t.userId, t.key)],
);

export const sendKindEnum = pgEnum('send_kind', ['invite', 'reminder']);
export const scheduledSendStatusEnum = pgEnum('scheduled_send_status', [
  'scheduled',
  'running',
  'done',
  'cancelled',
]);

/**
 * Invitations and reminders the organiser asked to go out later (ADR 030). A guest never needs an
 * account: the audience is stored as a rule (everyone unanswered, a group, picked guests) and turned
 * into phone numbers only when the time comes, so guests added in between are included.
 */
export const scheduledSends = pgTable(
  'scheduled_sends',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id),
    kind: sendKindEnum('kind').notNull(),
    /** `remaining` | `unanswered` | `all` | `{ guestIds }` | `{ group }` (see `SendTarget`). */
    target: jsonb('target').$type<string | Record<string, unknown>>().notNull(),
    channel: text('channel').notNull().default('auto'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    status: scheduledSendStatusEnum('status').notNull().default('scheduled'),
    /** Guests the audience matched when it was scheduled; the real outcome is in `summary`. */
    recipientCount: integer('recipient_count').notNull().default(0),
    /** The `SendSummary` of the run, once it has happened. */
    summary: jsonb('summary'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('scheduled_sends_due_idx').on(t.status, t.scheduledFor),
    index('scheduled_sends_event_idx').on(t.eventId, t.scheduledFor),
  ],
);

/** Card tokens replaced by a reissue: their links show "kadi imebadilishwa" instead of "invalid". */
export const retiredCardTokens = pgTable(
  'retired_card_tokens',
  {
    id: id(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('retired_card_tokens_hash_uq').on(t.tokenHash)],
);

/**
 * SMS and WhatsApp provider settings, edited by staff in /ops (ADR 031). One row per route
 * (`sms_tz`, `sms_ke`, `whatsapp`). The whole provider config, secrets included, is AES-GCM
 * encrypted with KEY_ENC_SECRET. A route without a row uses the environment variables.
 */
export const messagingSettings = pgTable('messaging_settings', {
  route: text('route').primaryKey(),
  provider: text('provider').notNull(),
  configEnc: text('config_enc').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

/**
 * Payment gateway settings staff edit in /ops/settings (ADR 036), one row per route. Same storage as
 * messaging_settings: the provider config is AES-GCM encrypted with KEY_ENC_SECRET. No row = the
 * environment variables are used.
 */
export const paymentSettings = pgTable('payment_settings', {
  route: text('route').primaryKey(),
  provider: text('provider').notNull(),
  configEnc: text('config_enc').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

/**
 * Business branding (ADR 036): a single row (`id = 'default'`). Public by design: name, colours and fonts
 * are served to every visitor, and the logo at /v1/branding/logo. `logo_data` is the SVG source, or
 * base64 for PNG/JPEG/WebP; `logo_version` changes on every upload so caches refresh.
 */
export const brandSettings = pgTable('brand_settings', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull(),
  tagline: text('tagline').notNull().default(''),
  primary: text('primary'),
  accent: text('accent'),
  fontBody: text('font_body').notNull().default('system'),
  fontDisplay: text('font_display').notNull().default('elegant'),
  logoMime: text('logo_mime'),
  logoData: text('logo_data'),
  logoVersion: integer('logo_version').notNull().default(0),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const dataRequestKindEnum = pgEnum('data_request_kind', ['export', 'deletion']);
export const dataRequestStatusEnum = pgEnum('data_request_status', ['open', 'done', 'rejected']);

/**
 * PDPA requests customers file from Akaunti and staff resolve in /ops/requests (ADR 012, 039).
 * `user_name` and `phone_e164` are copied at filing time so the queue still reads after a deletion
 * wipes the account; a completed deletion clears the phone here too.
 */
export const dataRequests = pgTable(
  'data_requests',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userName: text('user_name').notNull(),
    phoneE164: text('phone_e164'),
    kind: dataRequestKindEnum('kind').notNull(),
    status: dataRequestStatusEnum('status').notNull().default('open'),
    note: text('note').notNull().default(''),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('data_requests_status_idx').on(t.status, t.createdAt)],
);
