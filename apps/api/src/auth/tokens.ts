import { SignJWT, jwtVerify } from 'jose';
import { generateGuestToken, hashGuestToken } from '@harusi/crypto';
import type { Deps } from '../context';
import { ApiError } from '../errors';

const ACCESS_TTL_S = 15 * 60;
export const REFRESH_TTL_MS = 30 * 24 * 3_600_000;

const key = (secret: string) => new TextEncoder().encode(secret);

export interface AccessClaims {
  userId: string;
  roleGlobal: 'user' | 'admin';
  /** Issued after the staff second factor (ADR 040); /ops refuses staff tokens without it. */
  mfa?: boolean;
}

export async function signAccessToken(
  deps: Pick<Deps, 'config' | 'now'>,
  claims: AccessClaims,
): Promise<string> {
  const iat = Math.floor(deps.now().getTime() / 1000);
  return new SignJWT({ role: claims.roleGlobal, ...(claims.mfa ? { mfa: true } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + ACCESS_TTL_S)
    .sign(key(deps.config.jwtSecret));
}

export async function verifyAccessToken(
  deps: Pick<Deps, 'config' | 'now'>,
  token: string,
): Promise<AccessClaims> {
  try {
    const { payload } = await jwtVerify(token, key(deps.config.jwtSecret), {
      algorithms: ['HS256'],
      currentDate: deps.now(),
    });
    // Gate and second-factor tokens carry a `typ`; only plain access tokens are accepted here.
    if (!payload.sub || payload.typ !== undefined) throw new Error('not an access token');
    return {
      userId: payload.sub,
      roleGlobal: payload.role === 'admin' ? 'admin' : 'user',
      mfa: payload.mfa === true,
    };
  } catch {
    throw new ApiError('unauthorized', 'Invalid or expired token');
  }
}

// ---- staff second-factor challenge: proves the SMS code was right, good only for /v1/auth/staff/totp/*

export const STAFF_CHALLENGE_TTL_S = 5 * 60;

export async function signStaffChallenge(
  deps: Pick<Deps, 'config' | 'now'>,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const iat = Math.floor(deps.now().getTime() / 1000);
  const token = await new SignJWT({ typ: 'staff_2fa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + STAFF_CHALLENGE_TTL_S)
    .sign(key(deps.config.jwtSecret));
  return { token, expiresAt: new Date((iat + STAFF_CHALLENGE_TTL_S) * 1000) };
}

/** The user id behind a second-factor challenge; anything else (or expired) is refused. */
export async function verifyStaffChallenge(
  deps: Pick<Deps, 'config' | 'now'>,
  token: string,
): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, key(deps.config.jwtSecret), {
      algorithms: ['HS256'],
      currentDate: deps.now(),
    });
    if (payload.typ !== 'staff_2fa' || !payload.sub) throw new Error('not a challenge');
    return payload.sub;
  } catch {
    throw new ApiError('unauthorized', 'Sign in again', { reason: 'challenge_expired' });
  }
}

/** Opaque refresh token (128-bit) and its stored hash. */
export function newRefreshToken(deps: Pick<Deps, 'random'>): { token: string; hash: string } {
  const token = generateGuestToken(deps.random);
  return { token, hash: hashGuestToken(token) };
}

// ---- gate tokens: issued to a gate agent after link + PIN, scoped to one event and one device

const GATE_TTL_S = 3 * 24 * 3600;

export interface GateClaims {
  eventId: string;
  linkId: string;
  deviceId: string;
}

export async function signGateToken(
  deps: Pick<Deps, 'config' | 'now'>,
  claims: GateClaims,
  /** The gate link's own expiry: a token never outlives the link it came from. */
  notAfter?: Date,
): Promise<{ token: string; expiresAt: Date }> {
  const iat = Math.floor(deps.now().getTime() / 1000);
  const ttl = notAfter
    ? Math.max(60, Math.min(GATE_TTL_S, Math.floor(notAfter.getTime() / 1000) - iat))
    : GATE_TTL_S;
  const token = await new SignJWT({
    typ: 'gate',
    evt: claims.eventId,
    lnk: claims.linkId,
    dev: claims.deviceId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(iat + ttl)
    .sign(key(deps.config.jwtSecret));
  return { token, expiresAt: new Date((iat + ttl) * 1000) };
}

/** Returns the claims for a gate token, or null when the token is anything else (or invalid). */
export async function verifyGateToken(
  deps: Pick<Deps, 'config' | 'now'>,
  token: string,
): Promise<GateClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(deps.config.jwtSecret), {
      algorithms: ['HS256'],
      currentDate: deps.now(),
    });
    if (payload.typ !== 'gate') return null;
    const { evt, lnk, dev } = payload as { evt?: string; lnk?: string; dev?: string };
    return evt && lnk && dev ? { eventId: evt, linkId: lnk, deviceId: dev } : null;
  } catch {
    return null;
  }
}
