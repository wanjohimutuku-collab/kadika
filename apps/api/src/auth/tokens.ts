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
