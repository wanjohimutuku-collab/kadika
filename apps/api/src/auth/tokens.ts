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
}

export async function signAccessToken(
  deps: Pick<Deps, 'config' | 'now'>,
  claims: AccessClaims,
): Promise<string> {
  const iat = Math.floor(deps.now().getTime() / 1000);
  return new SignJWT({ role: claims.roleGlobal })
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
    if (!payload.sub) throw new Error('no subject');
    return { userId: payload.sub, roleGlobal: payload.role === 'admin' ? 'admin' : 'user' };
  } catch {
    throw new ApiError('unauthorized', 'Invalid or expired token');
  }
}

/** Opaque refresh token (128-bit) and its stored hash. */
export function newRefreshToken(deps: Pick<Deps, 'random'>): { token: string; hash: string } {
  const token = generateGuestToken(deps.random);
  return { token, hash: hashGuestToken(token) };
}

// ---- gate tokens: issued to a gate agent after link + PIN, scoped to one event and one device

const GATE_TTL_S = 24 * 3600;

export interface GateClaims {
  eventId: string;
  linkId: string;
  deviceId: string;
}

export async function signGateToken(
  deps: Pick<Deps, 'config' | 'now'>,
  claims: GateClaims,
): Promise<{ token: string; expiresAt: Date }> {
  const iat = Math.floor(deps.now().getTime() / 1000);
  const token = await new SignJWT({
    typ: 'gate',
    evt: claims.eventId,
    lnk: claims.linkId,
    dev: claims.deviceId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(iat + GATE_TTL_S)
    .sign(key(deps.config.jwtSecret));
  return { token, expiresAt: new Date((iat + GATE_TTL_S) * 1000) };
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
