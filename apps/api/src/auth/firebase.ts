import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Deps } from '../context';
import { signInOf } from '../services/signin-settings';
import { ApiError } from '../errors';

/** Google's signing keys for Firebase ID tokens, as a JWK set (cached and rotated by jose). */
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/** The token is exchanged right after the code is typed; an older sign-in is not accepted (ADR 048). */
const MAX_AUTH_AGE_S = 10 * 60;

let googleKeys: JWTVerifyGetKey | undefined;
const remoteKeys = () => (googleKeys ??= createRemoteJWKSet(new URL(FIREBASE_JWKS_URL)));

/**
 * Verifies a Firebase ID token as Firebase documents it ("Verify ID tokens using a third-party JWT
 * library"): RS256 with one of Google's keys, `aud` = our project, `iss` = securetoken for our
 * project, not expired, `sub` set, `auth_time` in the past. On top: the sign-in was by phone and is
 * recent. Returns the verified phone number; nothing else from the token is trusted.
 */
export async function verifyFirebaseIdToken(
  deps: Pick<Deps, 'config' | 'now' | 'firebaseKeys' | 'signIn'>,
  idToken: string,
): Promise<{ phoneE164: string; uid: string }> {
  const fb = signInOf(deps).firebase;
  if (!fb) throw new ApiError('unavailable', 'Firebase sign-in is not configured');
  const nowS = Math.floor(deps.now().getTime() / 1000);
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, deps.firebaseKeys ?? remoteKeys(), {
      algorithms: ['RS256'],
      audience: fb.projectId,
      issuer: `https://securetoken.google.com/${fb.projectId}`,
      currentDate: new Date(nowS * 1000),
      clockTolerance: 60,
      requiredClaims: ['sub', 'iat', 'exp', 'auth_time'],
    }));
  } catch (e) {
    if (e instanceof errors.JWTExpired)
      throw new ApiError('unauthorized', 'Sign-in token expired', { reason: 'expired' });
    if (e instanceof errors.JWTClaimValidationFailed && (e.claim === 'aud' || e.claim === 'iss'))
      throw new ApiError('unauthorized', 'Sign-in token is for another project', {
        reason: 'wrong_project',
      });
    throw new ApiError('unauthorized', 'Invalid sign-in token', { reason: 'invalid_token' });
  }
  const authTime = typeof payload.auth_time === 'number' ? payload.auth_time : NaN;
  if (!payload.sub || !(authTime <= nowS + 60))
    throw new ApiError('unauthorized', 'Invalid sign-in token', { reason: 'invalid_token' });
  if (nowS - authTime > MAX_AUTH_AGE_S)
    throw new ApiError('unauthorized', 'Sign-in is too old, sign in again', { reason: 'expired' });
  const provider = (payload.firebase as { sign_in_provider?: unknown } | undefined)
    ?.sign_in_provider;
  const phone = payload.phone_number;
  if (provider !== 'phone' || typeof phone !== 'string' || !/^\+\d{8,15}$/.test(phone))
    throw new ApiError('unauthorized', 'The sign-in did not verify a phone number', {
      reason: 'phone_unverified',
    });
  return { phoneE164: phone, uid: payload.sub };
}
