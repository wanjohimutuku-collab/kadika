import { and, eq } from 'drizzle-orm';
import { eventInvites, eventMembers, newId, refreshTokens, users } from '@harusi/db';
import { hashGuestToken } from '@harusi/crypto';
import { allowedCountries, type Country } from '@harusi/schemas/country';
import { normalizePhone } from '@harusi/schemas/phone';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { OtpService } from './otp';
import { REFRESH_TTL_MS, newRefreshToken, signAccessToken } from './tokens';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; phoneE164: string; roleGlobal: 'user' | 'admin' };
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

  constructor(private deps: Deps) {
    this.otp = new OtpService(deps);
  }

  async requestOtp(phoneInput: string) {
    const phone = parsePhone(phoneInput, 'TZ', allowedCountries(this.deps.config.kenyaEnabled));
    const res = await this.otp.request(phone);
    return { phone, ...res };
  }

  async verifyOtp(phoneInput: string, code: string): Promise<AuthResult> {
    const phone = parsePhone(phoneInput, 'TZ', allowedCountries(this.deps.config.kenyaEnabled));
    this.otp.verify(phone, code);
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
    return this.issue(user.id, user.name, phone, user.roleGlobal);
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
  ): Promise<AuthResult> {
    const refresh = newRefreshToken(this.deps);
    await this.deps.db.insert(refreshTokens).values({
      id: newId(),
      userId,
      tokenHash: refresh.hash,
      expiresAt: new Date(this.deps.now().getTime() + REFRESH_TTL_MS),
    });
    return {
      accessToken: await signAccessToken(this.deps, { userId, roleGlobal }),
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
    await db.update(refreshTokens).set({ revokedAt: now }).where(eq(refreshTokens.id, row.id));
    return this.issue(user.id, user.name, user.phoneE164, user.roleGlobal);
  }

  async logout(token: string) {
    await this.deps.db
      .update(refreshTokens)
      .set({ revokedAt: this.deps.now() })
      .where(eq(refreshTokens.tokenHash, hashGuestToken(token)));
  }
}
