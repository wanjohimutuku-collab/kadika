import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import * as schema from './schema';

describe('schema', () => {
  it('defines every §5 table', () => {
    const names = [
      schema.users,
      schema.events,
      schema.eventMembers,
      schema.guests,
      schema.invitations,
      schema.messageLog,
      schema.pledges,
      schema.payments,
      schema.scanLog,
      schema.signingKeys,
      schema.auditLog,
      schema.refreshTokens,
      schema.eventInvites,
    ].map(getTableName);
    expect(names).toEqual([
      'users',
      'events',
      'event_members',
      'guests',
      'invitations',
      'message_log',
      'pledges',
      'payments',
      'scan_log',
      'signing_keys',
      'audit_log',
      'refresh_tokens',
      'event_invites',
    ]);
  });

  it('generates UUIDv7 ids', () => {
    const gen = schema.users.id.defaultFn;
    const value = gen?.() as string;
    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('covers every invitation status from §5', () => {
    expect(schema.invitationStatusEnum.enumValues).toEqual([
      'created',
      'queued',
      'sent',
      'delivered',
      'opened',
      'confirmed',
      'declined',
      'checked_in',
    ]);
  });
});
