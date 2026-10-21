import { eq, sql } from 'drizzle-orm';
import { users } from '@harusi/db';
import type { Deps } from '../context';
import { decryptSecret, encryptSecret } from '../crypto-at-rest';
import { ApiError } from '../errors';
import { recordAudit } from '../services/audit';
import { base32Decode, base32Encode, matchTotp, otpauthUrl } from './totp';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;

/**
 * The staff second factor (ADR 040): an authenticator app (TOTP). The secret is stored encrypted
 * with KEY_ENC_SECRET. Wrong codes are counted in the database, so a lockout holds across restarts,
 * instances and fresh SMS codes; it ends after 15 minutes.
 */
export class StaffTotpService {
  constructor(private deps: Deps) {}

  private async staff(userId: string) {
    const [u] = await this.deps.db.select().from(users).where(eq(users.id, userId));
    if (!u || u.roleGlobal !== 'admin') throw new ApiError('forbidden', 'Staff only');
    if (u.status !== 'active')
      throw new ApiError('forbidden', 'Account suspended', { reason: 'suspended' });
    return u;
  }

  async isEnrolled(userId: string): Promise<boolean> {
    return !!(await this.staff(userId)).staffTotpEnrolledAt;
  }

  /**
   * A new secret for a staff member without an authenticator yet. Calling it again replaces the
   * pending secret (a fresh QR); once a code has been confirmed it is refused.
   */
  async startEnrolment(userId: string, issuer: string) {
    const u = await this.staff(userId);
    if (u.staffTotpEnrolledAt)
      throw new ApiError('conflict', 'Authenticator already set up', { reason: 'enrolled' });
    const secret = base32Encode(this.deps.random(20));
    await this.deps.db
      .update(users)
      .set({
        staffTotpSecret: await encryptSecret(secret, this.deps.config.keyEncSecret),
        staffTotpLastStep: null,
      })
      .where(eq(users.id, u.id));
    const account = u.name.trim() || `…${u.phoneE164.slice(-4)}`;
    return { secret, otpauthUrl: otpauthUrl(secret, issuer, account) };
  }

  /** Checks a code; the first good code also completes enrolment. Throws on a wrong code or lockout. */
  async verify(userId: string, code: string): Promise<void> {
    const u = await this.staff(userId);
    const now = this.deps.now();
    if (u.staffTotpLockedUntil && u.staffTotpLockedUntil > now)
      throw new ApiError('locked', 'Too many attempts', {
        until: u.staffTotpLockedUntil.toISOString(),
      });
    if (!u.staffTotpSecret)
      throw new ApiError('validation', 'Set up the authenticator first', {
        reason: 'not_enrolled',
      });
    const secret = base32Decode(
      await decryptSecret(u.staffTotpSecret, this.deps.config.keyEncSecret),
    );
    const step = matchTotp(secret, code, now, u.staffTotpLastStep);
    if (step === null) {
      const [r] = await this.deps.db
        .update(users)
        .set({ staffTotpFailedAttempts: sql`${users.staffTotpFailedAttempts} + 1` })
        .where(eq(users.id, u.id))
        .returning({ attempts: users.staffTotpFailedAttempts });
      const attempts = r?.attempts ?? MAX_ATTEMPTS;
      if (attempts >= MAX_ATTEMPTS) {
        const until = new Date(now.getTime() + LOCK_MS);
        await this.deps.db
          .update(users)
          .set({ staffTotpFailedAttempts: 0, staffTotpLockedUntil: until })
          .where(eq(users.id, u.id));
        await recordAudit(this.deps.db, {
          eventId: null,
          actorId: u.id,
          action: 'staff.totp_locked',
          entity: 'user',
          entityId: u.id,
        });
        throw new ApiError('locked', 'Too many attempts', { until: until.toISOString() });
      }
      throw new ApiError('validation', 'Wrong code', {
        reason: 'wrong_code',
        attemptsLeft: MAX_ATTEMPTS - attempts,
      });
    }
    const enrolling = !u.staffTotpEnrolledAt;
    await this.deps.db
      .update(users)
      .set({
        staffTotpLastStep: step,
        staffTotpFailedAttempts: 0,
        staffTotpLockedUntil: null,
        ...(enrolling ? { staffTotpEnrolledAt: now } : {}),
      })
      .where(eq(users.id, u.id));
    if (enrolling)
      await recordAudit(this.deps.db, {
        eventId: null,
        actorId: u.id,
        action: 'staff.totp_enrolled',
        entity: 'user',
        entityId: u.id,
      });
  }
}
