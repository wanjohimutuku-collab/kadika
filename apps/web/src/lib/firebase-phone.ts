'use client';

import type { AuthConfig } from '@harusi/api-client';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { USE_MOCKS } from './env';
import { getRepository } from './repo';

/**
 * Firebase Phone Auth for sign-in (ADR 048). The API decides the flow (`GET /v1/auth/config`) and
 * hands out the public Firebase web config, so one switch moves web and mobile together and the image
 * needs no rebuild. The SDK loads only on the login pages, only when Firebase is on.
 */

export type PhoneSignInError = 'invalid_phone' | 'wrong_code' | 'expired' | 'too_many' | 'failed';

/** A Firebase failure in terms the login screens show. */
export class FirebasePhoneError extends Error {
  constructor(readonly reason: PhoneSignInError) {
    super(reason);
  }
}

let config: Promise<AuthConfig> | null = null;
/** The pending code from `startPhoneSignIn`; lost on reload, then the visitor starts again. */
let pending: {
  phone: string;
  confirmation: ConfirmationResult;
  signOut: () => Promise<void>;
} | null = null;
let verifier: RecaptchaVerifier | null = null;

/** Mock mode and a failed lookup both mean our own SMS code, which still works then. */
export function loadAuthConfig(): Promise<AuthConfig> {
  if (USE_MOCKS) return Promise.resolve({ otpProvider: 'sms' });
  config ??= getRepository()
    .getAuthConfig()
    .catch((): AuthConfig => {
      config = null; // ask again next time
      return { otpProvider: 'sms' };
    });
  return config;
}

async function firebaseAuth(cfg: Extract<AuthConfig, { otpProvider: 'firebase' }>['firebase']) {
  const [{ getApps, initializeApp }, auth] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app =
    getApps()[0] ??
    initializeApp({
      projectId: cfg.projectId,
      apiKey: cfg.apiKey ?? undefined,
      authDomain: cfg.authDomain ?? undefined,
      appId: cfg.appId ?? undefined,
    });
  return { auth, instance: auth.getAuth(app) };
}

function reasonOf(err: unknown): PhoneSignInError {
  const code = (err as { code?: string } | null)?.code ?? '';
  if (code === 'auth/invalid-phone-number' || code === 'auth/missing-phone-number')
    return 'invalid_phone';
  if (code === 'auth/invalid-verification-code' || code === 'auth/missing-verification-code')
    return 'wrong_code';
  if (code === 'auth/code-expired' || code === 'auth/session-expired') return 'expired';
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') return 'too_many';
  return 'failed';
}

/**
 * Asks Firebase to text a code to `phone` (E.164). `container` hosts the invisible reCAPTCHA; it must
 * stay in the page until the code is sent. Firebase writes the SMS in `locale`.
 */
export async function startPhoneSignIn(
  phone: string,
  container: HTMLElement,
  locale: string,
): Promise<void> {
  const cfg = await loadAuthConfig();
  if (cfg.otpProvider !== 'firebase') throw new FirebasePhoneError('failed');
  const { auth, instance } = await firebaseAuth(cfg.firebase);
  instance.languageCode = locale;
  try {
    verifier?.clear();
    verifier = new auth.RecaptchaVerifier(instance, container, { size: 'invisible' });
    const confirmation = await auth.signInWithPhoneNumber(instance, phone, verifier);
    pending = { phone, confirmation, signOut: () => auth.signOut(instance) };
  } catch (err) {
    verifier?.clear();
    verifier = null;
    throw new FirebasePhoneError(reasonOf(err));
  }
}

/** True while a Firebase code for `phone` is waiting to be typed. */
export function hasPendingCode(phone: string): boolean {
  return pending?.phone === phone;
}

/** Checks the typed code with Firebase and returns the ID token the API trades for a session. */
export async function confirmPhoneCode(code: string): Promise<string> {
  if (!pending) throw new FirebasePhoneError('expired');
  try {
    const { confirmation, signOut } = pending;
    const cred = await confirmation.confirm(code);
    const idToken = await cred.user.getIdToken();
    pending = null;
    // Our own session takes over; the Firebase one is not kept in this browser.
    await signOut().catch(() => undefined);
    return idToken;
  } catch (err) {
    throw new FirebasePhoneError(reasonOf(err));
  }
}
