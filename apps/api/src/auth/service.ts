import { and, eq } from 'drizzle-orm';
import { eventInvites, eventMembers, newId, refreshTokens, users } from '@harusi/db';
import { hashGuestToken } from '@harusi/crypto';
import { allowedCountries, type Country } from '@harusi/schemas/country';
import { normalizePhone } from '@harusi/schemas/phone';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { signInOf } from '../services/signin-settings';
import { verifyFirebaseIdToken } from './firebase';
import { OtpService } from './otp';
import { StaffTotpService } from './staff-totp';
import {
  REFRESH_TTL_MS,
  newRefreshToken,
  signAccessToken,
  signStaffChallenge,
  verifyStaffChallenge,
} from './tokens';

type AuthUser = { id: string; name: string; phoneE164: string; roleGlobal: 'user' | 'admin' };

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * What staff get after the SMS code (ADR 040): no access token, only a short-lived challenge that
 * `/v1/auth/staff/totp/*` accepts. `enrolled: false` means the authenticator must be set up first.
 */
export interface StaffChallengeResult {
  secondFactor: { challenge: string; enrolled: boolean; expiresAt: string };
  user: AuthUser;
}

/**
 * Local formats (`07…`) are read in `country`; international forms of any `allowed` country are
 * accepted. Callers without an event (sign-in) leave the default and clients send E.164 (ADR 025).
 */
export function parsePhone(
  input: string,
  country: Country = 'TZ',
  allowed: readonly Country[] = ['TZ'],
): string {
  const r = normalizePhone(input, country, allowed);
  if (!r.ok)
    throw new ApiError('validation', 'Invalid phone number', { field: 'phone', reason: r.error });
  return r.e164;
}

export class AuthService {
  readonly otp: OtpService;
  readonly totp: StaffTotpService;

  constructor(private deps: Deps) {
    this.otp = new OtpService(deps);
    this.totp = new StaffTotpService(deps);
  }

  async requestOtp(phoneInput: string) {
    const phone = parsePhone(phoneInput, 'TZ', allowedCountries(this.deps.config.kenyaEnabled));
    // With Firebase Phone Auth the code comes from Firebase; our SMS routes carry no login codes.
    if (signInOf(this.deps).provider === 'firebase')
      throw new ApiError('conflict', 'Sign-in codes are sent by Firebase', {
        reason: 'use_firebase',
      });
    const res = await this.otp.request(phone);
    return { phone, ...res };
  }

  async verifyOtp(phoneInput: string, code: string): Promise<AuthResult | StaffChallengeResult> {
    const phone = parsePhone(phoneInput, 'TZ', allowedCountries(this.deps.config.kenyaEnabled));
    this.otp.verify(phone, code);
    return this.signIn(phone);
  }

  /** Firebase Phone Auth (ADR 048): the verified number from the ID token signs in like an SMS code. */
  async verifyFirebase(idToken: string): Promise<AuthResult | StaffChallengeResult> {
    const { phoneE164 } = await verifyFirebaseIdToken(this.deps, idToken);
    const phone = parsePhone(phoneE164, 'TZ', allowedCountries(this.deps.config.kenyaEnabled));
    return this.signIn(phone);
  }

  /** After the phone is proven: the account, invitations, then a session or the staff challenge. */
  private async signIn(phone: string): Promise<AuthResult | StaffChallengeResult> {
    const { db } = this.deps;
    const now = this.deps.now();
    let [user] = await db.select().from(users).where(eq(users.phoneE164, phone));
    if (user?.status === 'suspended')
      throw new ApiError('forbidden', 'Account suspended', { reason: 'suspended' });
    if (!user) {
      [user] = await db
        .insert(users)
        .values({ id: newId(), name: '', phoneE164: phone, lastLoginAt: now })
        .returning();
    } else {
      await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id));
    }
    if (!user) throw new ApiError('internal');
    await this.acceptInvites(user.id, phone);
    if (user.roleGlobal === 'admin') {
      // Staff can read every customer: the SMS code alone is not enough (ADR 012, 040).
      const c = await signStaffChallenge(this.deps, user.id);
      return {
        secondFactor: {
          challenge: c.token,
          enrolled: !!user.staffTotpEnrolledAt,
          expiresAt: c.expiresAt.toISOString(),
        },
        user: { id: user.id, name: user.name, phoneE164: phone, roleGlobal: user.roleGlobal },
      };
    }
    return this.issue(user.id, user.name, phone, user.roleGlobal);
  }

  /** Authenticator setup for staff who have none yet; needs the challenge from `verifyOtp`. */
  async startStaffEnrolment(challenge: string, issuer: string) {
    return this.totp.startEnrolment(await verifyStaffChallenge(this.deps, challenge), issuer);
  }

  /** Second step for staff: a good authenticator code turns the challenge into a full session. */
  async verifyStaffSecondFactor(challenge: string, code: string): Promise<AuthResult> {
    const userId = await verifyStaffChallenge(this.deps, challenge);
    await this.totp.verify(userId, code);
    const [u] = await this.deps.db.select().from(users).where(eq(users.id, userId));
    if (!u) throw new ApiError('internal');
    return this.issue(u.id, u.name, u.phoneE164, u.roleGlobal, true);
  }

  /** Pending team invitations for this phone become memberships (the gap found in ADR 012). */
  private async acceptInvites(userId: string, phone: string) {
    const { db } = this.deps;
    const pending = await db
      .select()
      .from(eventInvites)
      .where(and(eq(eventInvites.phoneE164, phone), eq(eventInvites.status, 'pending')));
    for (const inv of pending) {
      await db
        .insert(eventMembers)
        .values({ id: newId(), eventId: inv.eventId, userId, role: inv.role })
        .onConflictDoNothing();
      await db.update(eventInvites).set({ status: 'accepted' }).where(eq(eventInvites.id, inv.id));
    }
  }

  private async issue(
    userId: string,
    name: string,
    phoneE164: string,
    roleGlobal: 'user' | 'admin',
    mfa = false,
  ): Promise<AuthResult> {
    const refresh = newRefreshToken(this.deps);
    await this.deps.db.insert(refreshTokens).values({
      id: newId(),
      userId,
      tokenHash: refresh.hash,
      expiresAt: new Date(this.deps.now().getTime() + REFRESH_TTL_MS),
      mfa,
    });
    return {
      accessToken: await signAccessToken(this.deps, { userId, roleGlobal, mfa }),
      refreshToken: refresh.token,
      user: { id: userId, name, phoneE164, roleGlobal },
    };
  }

  /** Rotating refresh: each token works once. Reuse of a spent token revokes the whole family. */
  async refresh(token: string): Promise<AuthResult> {
    const { db } = this.deps;
    const now = this.deps.now();
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashGuestToken(token)));
    if (!row) throw new ApiError('unauthorized', 'Invalid refresh token');
    if (row.revokedAt) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(eq(refreshTokens.userId, row.userId));
      throw new ApiError('unauthorized', 'Refresh token reuse detected');
    }
    if (row.expiresAt < now) throw new ApiError('unauthorized', 'Refresh token expired');
    const [user] = await db.select().from(users).where(eq(users.id, row.userId));
    if (!user || user.status === 'suspended')
      throw new ApiError('forbidden', 'Account suspended', { reason: 'suspended' });
    // A session from before someone became staff (or before ADR 040) cannot be refreshed into one.
    if (user.roleGlobal === 'admin' && !row.mfa) {
      await db.update(refreshTokens).set({ revokedAt: now }).where(eq(refreshTokens.id, row.id));
      throw new ApiError('unauthorized', 'Second factor required', {
        reason: 'second_factor_required',
      });
    }
    await db.update(refreshTokens).set({ revokedAt: now }).where(eq(refreshTokens.id, row.id));
    return this.issue(user.id, user.name, user.phoneE164, user.roleGlobal, row.mfa);
  }

  async logout(token: string) {
    await this.deps.db
      .update(refreshTokens)
      .set({ revokedAt: this.deps.now() })
      .where(eq(refreshTokens.tokenHash, hashGuestToken(token)));
  }
}
