import { and, eq } from 'drizzle-orm';
import { eventInvites, eventMembers, newId, users } from '@harusi/db';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import type { EventService } from './events';
import { allowedCountries } from '@harusi/schemas/country';
import { parsePhone } from '../auth/service';
import { eventCountry } from './events';

export class MemberService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private async requireOwner(eventId: string, userId: string) {
    if ((await this.eventsSvc.role(eventId, userId)) !== 'owner')
      throw new ApiError('forbidden', 'Only the owner manages the team');
  }

  async list(eventId: string, userId: string) {
    await this.eventsSvc.role(eventId, userId);
    const members = await this.deps.db
      .select({
        id: eventMembers.id,
        userId: users.id,
        name: users.name,
        phoneE164: users.phoneE164,
        role: eventMembers.role,
        lastLoginAt: users.lastLoginAt,
      })
      .from(eventMembers)
      .innerJoin(users, eq(users.id, eventMembers.userId))
      .where(eq(eventMembers.eventId, eventId));
    const invites = await this.deps.db
      .select()
      .from(eventInvites)
      .where(and(eq(eventInvites.eventId, eventId), eq(eventInvites.status, 'pending')));
    return {
      members: members.map((m) => ({ ...m, status: 'active' as const })),
      invites: invites.map((i) => ({
        id: i.id,
        name: i.name,
        phoneE164: i.phoneE164,
        role: i.role,
        status: 'invited' as const,
      })),
    };
  }

  /** Existing user → member immediately; otherwise a pending invite accepted at their first login. */
  async invite(
    eventId: string,
    userId: string,
    input: { name: string; phone: string; role: 'committee' | 'gate' },
  ) {
    await this.requireOwner(eventId, userId);
    const phone = parsePhone(
      input.phone,
      await eventCountry(this.deps.db, eventId),
      allowedCountries(this.deps.config.kenyaEnabled),
    );
    const [user] = await this.deps.db.select().from(users).where(eq(users.phoneE164, phone));
    if (user) {
      const [exists] = await this.deps.db
        .select({ id: eventMembers.id })
        .from(eventMembers)
        .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, user.id)));
      if (exists) throw new ApiError('conflict', 'Already a member');
      await this.deps.db
        .insert(eventMembers)
        .values({ id: newId(), eventId, userId: user.id, role: input.role });
      await recordAudit(this.deps.db, {
        eventId,
        actorId: userId,
        action: 'member.add',
        entity: 'member',
        entityId: user.id,
        diff: { role: input.role },
      });
      return { status: 'active' as const, phoneE164: phone, role: input.role };
    }
    await this.deps.db
      .insert(eventInvites)
      .values({
        id: newId(),
        eventId,
        phoneE164: phone,
        name: input.name,
        role: input.role,
        invitedBy: userId,
      })
      .onConflictDoUpdate({
        target: [eventInvites.eventId, eventInvites.phoneE164],
        set: { role: input.role, name: input.name, status: 'pending' },
      });
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'member.invite',
      entity: 'member',
      diff: { role: input.role },
    });
    return { status: 'invited' as const, phoneE164: phone, role: input.role };
  }

  async remove(eventId: string, userId: string, memberUserId: string) {
    await this.requireOwner(eventId, userId);
    const [m] = await this.deps.db
      .select()
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, memberUserId)));
    if (!m) throw new ApiError('not_found', 'Member not found');
    if (m.role === 'owner') throw new ApiError('forbidden', 'The owner cannot be removed');
    await this.deps.db.delete(eventMembers).where(eq(eventMembers.id, m.id));
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'member.remove',
      entity: 'member',
      entityId: memberUserId,
      diff: { role: m.role },
    });
  }
}
