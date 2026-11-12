import { createHash, timingSafeEqual } from 'node:crypto';
import { scryptAsync } from '@noble/hashes/scrypt';
import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import {
  eventMembers,
  events,
  gateDevices,
  gateLinks,
  guests,
  invitations,
  newId,
  scanLog,
  users,
} from '@harusi/db';
import { toZoned } from '@harusi/schemas';
import { toHex } from '@harusi/crypto';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { signGateToken, type GateClaims } from '../auth/tokens';
import type { EventService, MemberRole } from './events';
import { recordAudit } from './audit';

const MAX_PIN_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0 O 1 I L
const MAX_SCANS_PER_SYNC = 500;

/** Who is calling a gate endpoint: a gate agent with a link token, or an organizer/committee user. */
export type GateActor = { kind: 'gate'; claims: GateClaims } | { kind: 'user'; userId: string };

export interface ScanInput {
  clientId: string;
  guestId?: string | null;
  result:
    | 'ok'
    | 'duplicate'
    | 'invalid_sig'
    | 'wrong_event'
    | 'not_found'
    | 'manual_ok'
    | 'manual_denied';
  partyAdmitted: number;
  scannedAt: Date;
  offline: boolean;
  /** Admit a guest who is already in (committee/owner only). */
  override?: boolean;
  reason?: string | null;
}

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const h = await scryptAsync(pin, salt, { N: 2 ** 14, r: 8, p: 1, dkLen: 32 });
  return `${toHex(salt)}:${toHex(h)}`;
}

/**
 * Gate access and the offline-first scan flow (§7.6). Devices verify QR codes locally; this service
 * hands them the bundle, then orders the scans they report: the earliest admission wins and any
 * later one is a duplicate, whatever order the devices happen to sync in.
 */
export class GateService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private async authorize(eventId: string, actor: GateActor): Promise<MemberRole> {
    if (actor.kind === 'gate') {
      if (actor.claims.eventId !== eventId) throw new ApiError('forbidden', 'Wrong event');
      const [link] = await this.deps.db
        .select()
        .from(gateLinks)
        .where(eq(gateLinks.id, actor.claims.linkId));
      if (!link || link.revokedAt || link.expiresAt <= this.deps.now())
        throw new ApiError('unauthorized', 'Gate link is no longer valid');
      return 'gate';
    }
    return this.eventsSvc.role(eventId, actor.userId);
  }

  // ---- gate link + PIN

  private pick(alphabet: string, n: number): string {
    const b = this.deps.random(n);
    return Array.from(b, (x) => alphabet[x % alphabet.length]).join('');
  }

  async createLink(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role !== 'owner') throw new ApiError('forbidden', 'Only the owner can create gate links');
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const code = this.pick(CODE_ALPHABET, 8);
    const pin = this.pick('0123456789', 6);
    const now = this.deps.now();
    const expiresAt = new Date(
      Math.max(now.getTime() + 24 * 3_600_000, event.dateStart.getTime() + 2 * 24 * 3_600_000),
    );
    await this.deps.db.insert(gateLinks).values({
      id: newId(),
      eventId,
      code,
      pinHash: await hashPin(pin, this.deps.random(16)),
      createdBy: userId,
      expiresAt,
    });
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'gatelink.create',
      entity: 'gate_link',
      diff: { expiresAt: expiresAt.toISOString() },
    });
    return { code, pin, url: `${this.deps.config.appBaseUrl}/gate-join/${code}`, expiresAt };
  }

  async revokeLinks(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role !== 'owner') throw new ApiError('forbidden', 'Only the owner can revoke gate links');
    await this.deps.db
      .update(gateLinks)
      .set({ revokedAt: this.deps.now() })
      .where(and(eq(gateLinks.eventId, eventId), isNull(gateLinks.revokedAt)));
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'gatelink.revoke',
      entity: 'gate_link',
    });
  }

  async join(input: { code: string; pin: string; deviceId: string; deviceName?: string }) {
    const [link] = await this.deps.db
      .select()
      .from(gateLinks)
      .where(eq(gateLinks.code, input.code.trim().toUpperCase()));
    // Same answer for unknown, revoked and expired links: nothing to learn by guessing codes.
    if (!link || link.revokedAt || link.expiresAt <= this.deps.now())
      throw new ApiError('not_found', 'This gate link is not valid');
    const now = this.deps.now();
    const locked = (until: Date) =>
      new ApiError('locked', 'Too many wrong PINs. Try again later.', {
        until: until.toISOString(),
      });
    if (link.lockedUntil && link.lockedUntil > now) throw locked(link.lockedUntil);
    // Every guess takes one attempt in a single statement BEFORE the PIN is checked, so a burst of
    // parallel guesses cannot all read the same count and slip past the lockout.
    const [slot] = await this.deps.db
      .update(gateLinks)
      .set({ failedAttempts: sql`${gateLinks.failedAttempts} + 1` })
      .where(
        and(
          eq(gateLinks.id, link.id),
          or(isNull(gateLinks.lockedUntil), lte(gateLinks.lockedUntil, now)),
          lt(gateLinks.failedAttempts, MAX_PIN_ATTEMPTS),
        ),
      )
      .returning({ attempts: gateLinks.failedAttempts });
    const lockNow = async () => {
      const until = new Date(now.getTime() + LOCK_MS);
      await this.deps.db
        .update(gateLinks)
        .set({ failedAttempts: 0, lockedUntil: until })
        .where(eq(gateLinks.id, link.id));
      return until;
    };
    if (!slot) throw locked(await lockNow());
    const [saltHex, hashHex] = link.pinHash.split(':') as [string, string];
    const got = await hashPin(input.pin, Uint8Array.from(Buffer.from(saltHex, 'hex')));
    const a = Buffer.from(got.split(':')[1]!);
    const b = Buffer.from(hashHex);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      const lock = slot.attempts >= MAX_PIN_ATTEMPTS;
      if (lock) await lockNow();
      throw new ApiError(
        lock ? 'locked' : 'unauthorized',
        lock ? 'Too many wrong PINs. Try again later.' : 'Wrong PIN',
        {
          attemptsLeft: lock ? 0 : MAX_PIN_ATTEMPTS - slot.attempts,
        },
      );
    }
    await this.deps.db
      .update(gateLinks)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(gateLinks.id, link.id));
    await this.deps.db
      .insert(gateDevices)
      .values({
        id: newId(),
        eventId: link.eventId,
        linkId: link.id,
        deviceId: input.deviceId,
        name: input.deviceName ?? null,
      })
      .onConflictDoUpdate({
        target: [gateDevices.eventId, gateDevices.deviceId],
        set: { lastSeenAt: now, linkId: link.id, name: input.deviceName ?? null },
      });
    const { token, expiresAt } = await signGateToken(
      this.deps,
      { eventId: link.eventId, linkId: link.id, deviceId: input.deviceId },
      link.expiresAt,
    );
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, link.eventId));
    return {
      accessToken: token,
      expiresAt,
      event: {
        id: event!.id,
        coupleNames: event!.coupleNames,
        dateStart: event!.dateStart,
        venueName: event!.venueName,
      },
    };
  }

  // ---- bundle and admissions

  /** Guests, the public key and the token versions (the revocation list) for offline checking. */
  async bundle(eventId: string, actor: GateActor) {
    await this.authorize(eventId, actor);
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const publicKey = await this.eventsSvc.publicKey(eventId);
    const rows = await this.deps.db
      .select()
      .from(guests)
      // Contribution-only guests have no QR and are never admitted at the gate (ADR 029).
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          eq(guests.cardKind, 'invitation'),
        ),
      )
      .orderBy(asc(guests.displayName), asc(guests.id));
    const body = {
      event: {
        id: event.id,
        coupleNames: event.coupleNames,
        dateStart: event.dateStart,
        venueName: event.venueName,
      },
      publicKey,
      guests: rows.map((g) => ({
        id: g.id,
        guestShort: g.guestShort,
        displayName: g.displayName,
        shortCode: g.shortCode,
        groupLabel: g.groupLabel,
        partySizeAllowed: g.partySizeAllowed,
        // Only the last four digits leave the server: enough to find a guest, nothing to harvest.
        phoneLast4: g.phoneE164 ? g.phoneE164.slice(-4) : null,
        tokenVersion: g.tokenVersion,
      })),
    };
    const etag = `"${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 32)}"`;
    return { body, etag };
  }

  /** Guests already admitted, with who scanned them first (shown on a duplicate, §17.5). */
  async admitted(eventId: string, actor: GateActor) {
    await this.authorize(eventId, actor);
    const rows = await this.deps.db
      .select({
        guestId: scanLog.guestId,
        scannedAt: scanLog.scannedAt,
        deviceId: scanLog.deviceId,
        partyAdmitted: scanLog.partyAdmitted,
      })
      .from(scanLog)
      .where(
        and(
          eq(scanLog.eventId, eventId),
          inArray(scanLog.result, ['ok', 'manual_ok']),
          eq(scanLog.override, false),
        ),
      );
    return {
      admitted: rows
        .filter((r): r is typeof r & { guestId: string } => !!r.guestId)
        .map((r) => ({ ...r, scannedAt: r.scannedAt.toISOString() })),
    };
  }

  /**
   * Stores a batch of offline scans (idempotent by `clientId`), then re-orders admissions for the
   * affected guests: the earliest admission claim keeps its result and later claims become
   * `duplicate`, even if they synced first.
   */
  async sync(eventId: string, actor: GateActor, input: { deviceId: string; scans: ScanInput[] }) {
    const role = await this.authorize(eventId, actor);
    if (input.scans.length > MAX_SCANS_PER_SYNC)
      throw new ApiError('validation', `At most ${MAX_SCANS_PER_SYNC} scans per sync`);
    const canOverride = role === 'owner' || role === 'committee';
    const now = this.deps.now();
    const known = new Set(
      (
        await this.deps.db.select({ id: guests.id }).from(guests).where(eq(guests.eventId, eventId))
      ).map((g) => g.id),
    );
    const touched = new Set<string>();
    let accepted = 0;
    let replayed = 0;
    await this.deps.db.transaction(async (tx) => {
      for (const s of input.scans) {
        const guestId = s.guestId && known.has(s.guestId) ? s.guestId : null;
        // A gate agent cannot override a duplicate; their claim is recorded as a duplicate instead.
        const override = !!s.override && canOverride;
        const reported = s.override && !canOverride ? 'duplicate' : s.result;
        const inserted = await tx
          .insert(scanLog)
          .values({
            id: newId(),
            eventId,
            guestId,
            scannedBy: actor.kind === 'user' ? actor.userId : null,
            deviceId: input.deviceId,
            result: reported,
            reportedResult: reported,
            partyAdmitted: reported === 'ok' || reported === 'manual_ok' ? s.partyAdmitted : 0,
            scannedAt: s.scannedAt,
            syncedAt: now,
            offline: s.offline,
            clientId: s.clientId,
            override,
            reason: s.reason ?? null,
          })
          .onConflictDoNothing({ target: [scanLog.eventId, scanLog.clientId] })
          .returning({ id: scanLog.id });
        if (inserted.length === 0) replayed++;
        else {
          accepted++;
          if (guestId) touched.add(guestId);
        }
      }
      // Two devices syncing the same guest at once would each see only their own uncommitted claim and
      // both keep "admitted". A per-guest transaction lock makes the second wait and see the first.
      // Sorted, so two batches lock in the same order and cannot deadlock.
      for (const guestId of [...touched].sort()) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${guestId}, 0))`);
        await this.reorder(tx as Deps['db'], eventId, guestId);
      }
    });
    const results = await this.deps.db
      .select({
        clientId: scanLog.clientId,
        result: scanLog.result,
        partyAdmitted: scanLog.partyAdmitted,
      })
      .from(scanLog)
      .where(
        and(
          eq(scanLog.eventId, eventId),
          inArray(
            scanLog.clientId,
            input.scans.map((s) => s.clientId),
          ),
        ),
      );
    return { accepted, replayed, results, ...(await this.admitted(eventId, actor)) };
  }

  /** Earliest admission claim wins; the rest become duplicates. Also keeps the invitation in step. */
  private async reorder(tx: Deps['db'], eventId: string, guestId: string) {
    const claims = await tx
      .select()
      .from(scanLog)
      .where(
        and(
          eq(scanLog.eventId, eventId),
          eq(scanLog.guestId, guestId),
          eq(scanLog.override, false),
          inArray(scanLog.reportedResult, ['ok', 'manual_ok']),
        ),
      )
      .orderBy(asc(scanLog.scannedAt), asc(scanLog.id));
    for (const [i, c] of claims.entries()) {
      const want = i === 0 ? (c.reportedResult as 'ok' | 'manual_ok') : 'duplicate';
      if (c.result !== want)
        await tx.update(scanLog).set({ result: want }).where(eq(scanLog.id, c.id));
    }
    const [overridden] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(scanLog)
      .where(
        and(eq(scanLog.eventId, eventId), eq(scanLog.guestId, guestId), eq(scanLog.override, true)),
      );
    if (claims.length > 0 || (overridden?.n ?? 0) > 0)
      await tx
        .update(invitations)
        .set({ status: 'checked_in' })
        .where(eq(invitations.guestId, guestId));
  }

  // ---- the web console's gate monitor (§17.8: monitor + manual check-in; scanning stays in the app)

  /** The device id the web console's manual check-ins are recorded under. */
  static readonly CONSOLE_DEVICE = 'web-console';

  private async consoleRole(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents use the gate app');
    return role;
  }

  /** Names for devices: the name the gate app gave at join, or the console's own label. */
  private async deviceNames(eventId: string): Promise<Map<string, string>> {
    const rows = await this.deps.db
      .select({ deviceId: gateDevices.deviceId, name: gateDevices.name })
      .from(gateDevices)
      .where(eq(gateDevices.eventId, eventId));
    const m = new Map(rows.map((r) => [r.deviceId, r.name || 'Lango']));
    m.set(GateService.CONSOLE_DEVICE, 'Dashibodi (wavuti)');
    return m;
  }

  /** Who is in, who is expected, and how each gate is doing (the console's Gate page). */
  async overview(eventId: string, userId: string) {
    await this.consoleRole(eventId, userId);
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const scans = await this.deps.db
      .select({
        guestId: scanLog.guestId,
        deviceId: scanLog.deviceId,
        result: scanLog.result,
        override: scanLog.override,
        partyAdmitted: scanLog.partyAdmitted,
        scannedAt: scanLog.scannedAt,
      })
      .from(scanLog)
      .where(eq(scanLog.eventId, eventId));
    const admitted = scans.filter(
      (s) => (s.result === 'ok' || s.result === 'manual_ok') && !s.override && !!s.guestId,
    );
    const expected = await this.deps.db
      .select({ party: invitations.rsvpPartySize })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          eq(guests.cardKind, 'invitation'),
          inArray(invitations.status, ['confirmed', 'checked_in']),
        ),
      );
    const names = await this.deviceNames(eventId);
    const perGate = new Map<
      string,
      { gateName: string; ok: number; duplicate: number; invalid: number; manual: number }
    >();
    for (const s of scans) {
      const gateName = names.get(s.deviceId) ?? 'Lango';
      const row = perGate.get(gateName) ?? { gateName, ok: 0, duplicate: 0, invalid: 0, manual: 0 };
      if (s.result === 'ok') row.ok++;
      else if (s.result === 'duplicate') row.duplicate++;
      else if (s.result === 'manual_ok' || s.result === 'manual_denied') row.manual++;
      else row.invalid++;
      perGate.set(gateName, row);
    }
    const byHour = new Map<string, number>();
    for (const s of admitted) {
      const hour = toZoned(s.scannedAt, event.timezone).getUTCHours();
      const key = `${String(hour).padStart(2, '0')}:00`;
      byHour.set(key, (byHour.get(key) ?? 0) + s.partyAdmitted);
    }
    const revoked = await this.deps.db
      .select({
        guestId: guests.id,
        guestName: guests.displayName,
        shortCode: guests.shortCode,
        tokenVersion: guests.tokenVersion,
        revokedAt: guests.updatedAt,
      })
      .from(guests)
      .where(
        and(eq(guests.eventId, eventId), isNull(guests.deletedAt), gt(guests.tokenVersion, 1)),
      );
    const invalidResults = ['invalid_sig', 'wrong_event', 'not_found'];
    return {
      admittedGuests: new Set(admitted.map((s) => s.guestId)).size,
      admittedPeople: admitted.reduce((n, s) => n + s.partyAdmitted, 0),
      expectedGuests: expected.length,
      expectedPeople: expected.reduce((n, e) => n + (e.party ?? 1), 0),
      duplicates: scans.filter((s) => s.result === 'duplicate').length,
      invalid: scans.filter((s) => invalidResults.includes(s.result)).length,
      manual: scans.filter((s) => s.result === 'manual_ok').length,
      arrivalsByHour: [...byHour.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, count]) => ({ hour, count })),
      perGate: [...perGate.values()],
      revoked: revoked.map((r) => ({ ...r, revokedAt: r.revokedAt.toISOString() })),
    };
  }

  /** The scan log, newest first, with the guest, gate and person for each line. */
  async scans(eventId: string, userId: string, limit = 500) {
    await this.consoleRole(eventId, userId);
    const rows = await this.deps.db
      .select({ s: scanLog, guestName: guests.displayName, by: users.name })
      .from(scanLog)
      .leftJoin(guests, eq(guests.id, scanLog.guestId))
      .leftJoin(users, eq(users.id, scanLog.scannedBy))
      .where(eq(scanLog.eventId, eventId))
      .orderBy(desc(scanLog.scannedAt), desc(scanLog.id))
      .limit(limit);
    const names = await this.deviceNames(eventId);
    return rows.map(({ s, guestName, by }) => {
      const gateName = names.get(s.deviceId) ?? 'Lango';
      return {
        id: s.id,
        eventId: s.eventId,
        guestId: s.guestId,
        guestName: guestName ?? null,
        result: s.result,
        // a claim the ordering turned into a duplicate admitted nobody
        partyAdmitted: s.result === 'ok' || s.result === 'manual_ok' ? s.partyAdmitted : 0,
        gateName,
        deviceName: s.deviceId === GateService.CONSOLE_DEVICE ? 'Kivinjari' : gateName,
        scannedBy: by ?? gateName,
        scannedAt: s.scannedAt.toISOString(),
        reason: s.reason,
      };
    });
  }

  /**
   * Admits a guest by hand from the console (owner or committee, §6.2 path 4). Goes through the same
   * ordering as the gate app's scans, so a guest who is already in comes back as a `duplicate`.
   */
  async manualCheckIn(
    eventId: string,
    userId: string,
    guestId: string,
    input: { partySize: number; reason?: string | null },
  ) {
    const role = await this.consoleRole(eventId, userId);
    if (role !== 'owner' && role !== 'committee')
      throw new ApiError('forbidden', 'Only the owner or committee can admit by hand');
    const [g] = await this.deps.db
      .select()
      .from(guests)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId), isNull(guests.deletedAt)));
    if (!g) throw new ApiError('not_found', 'Guest not found');
    const clientId = `console-${newId()}`;
    const reason = input.reason?.trim() || null;
    await this.sync(
      eventId,
      { kind: 'user', userId },
      {
        deviceId: GateService.CONSOLE_DEVICE,
        scans: [
          {
            clientId,
            guestId,
            result: 'manual_ok',
            partyAdmitted: Math.max(1, Math.min(input.partySize, g.partySizeAllowed)),
            scannedAt: this.deps.now(),
            offline: false,
            reason,
          },
        ],
      },
    );
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'gate.manual_check_in',
      entity: 'guest',
      entityId: guestId,
      diff: { partySize: input.partySize, reason },
    });
    const [mine] = await this.deps.db
      .select({ id: scanLog.id })
      .from(scanLog)
      .where(and(eq(scanLog.eventId, eventId), eq(scanLog.clientId, clientId)));
    const entry = (await this.scans(eventId, userId)).find((e) => e.id === mine?.id);
    if (!entry) throw new ApiError('internal', 'Check-in was not recorded');
    return entry;
  }

  /** Members of this event with their roles, for the "who can run the gate" hint. */
  async isMember(eventId: string, userId: string) {
    const [m] = await this.deps.db
      .select({ role: eventMembers.role })
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, userId)));
    return !!m;
  }
}
