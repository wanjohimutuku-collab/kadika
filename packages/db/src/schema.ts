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
  languageDefault: languageEnum('language_default').notNull().default('sw'),
  timezone: text('timezone').notNull().default('Africa/Dar_es_Salaam'),
  status: eventStatusEnum('status').notNull().default('draft'),
  // Logical reference to signing_keys.id; no FK to avoid a circular dependency (see ADR 002).
  signingKeyId: uuid('signing_key_id'),
  brandTheme: jsonb('brand_theme').$type<Record<string, unknown>>(),
  rsvpDeadline: timestamp('rsvp_deadline', { withTimezone: true }),
  contributionTargetTzs: integer('contribution_target_tzs'),
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
    partySizeAllowed: integer('party_size_allowed').notNull().default(1),
    shortCode: text('short_code').notNull(),
    // Last 8 hex characters of the guest id: the on-card id inside the signed QR (ADR 013).
    guestShort: text('guest_short').notNull(),
    tokenVersion: integer('token_version').notNull().default(1),
    language: languageEnum('language').notNull().default('sw'),
    inviteChannelPref: channelPrefEnum('invite_channel_pref').notNull().default('mixed'),
    notes: text('notes'),
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

export const messageLog = pgTable('message_log', {
  id: id(),
  guestId: uuid('guest_id')
    .notNull()
    .references(() => guests.id, { onDelete: 'cascade' }),
  channel: messageChannelEnum('channel').notNull(),
  provider: text('provider').notNull(),
  providerMsgId: text('provider_msg_id'),
  status: text('status').notNull(),
  error: text('error'),
  costTzs: integer('cost_tzs'),
  ...timestamps,
});

export const pledges = pgTable('pledges', {
  id: id(),
  guestId: uuid('guest_id')
    .notNull()
    .references(() => guests.id, { onDelete: 'cascade' }),
  amountTzs: integer('amount_tzs').notNull(),
  note: text('note'),
  status: pledgeStatusEnum('status').notNull().default('pledged'),
  createdBy: uuid('created_by').references(() => users.id),
  ...timestamps,
});

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
    amountTzs: integer('amount_tzs').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    phoneE164: text('phone_e164'),
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
    ...timestamps,
  },
  (t) => [index('scan_log_event_guest_idx').on(t.eventId, t.guestId)],
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

export const auditLog = pgTable('audit_log', {
  id: id(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  diff: jsonb('diff'),
  ip: text('ip'),
  ...timestamps,
});

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
