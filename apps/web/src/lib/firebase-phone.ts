'use client';

import { isRepositoryError, type AuthConfig } from '@harusi/api-client';
import type { Auth, ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import type * as FirebaseAuthModule from 'firebase/auth';
import { USE_MOCKS } from './env';
import { getRepository } from './repo';

/**
 * Firebase Phone Auth for sign-in (ADR 048). The API decides the flow (`GET /v1/auth/config`) and
 * hands out the public Firebase web config, so one switch moves web and mobile together and the image
 * needs no rebuild. The SDK loads only on the login pages, only when Firebase is on.
 */

export type PhoneSignInError =
  | 'invalid_phone'
  | 'wrong_code'
  | 'expired'
  | 'too_many'
  /** Firebase's SMS backend refuses the destination (503 "Error code: 39"), often a wrong country. */
  | 'undeliverable'
  /** reCAPTCHA Enterprise scored the attempt as automated and refused it (ADR 060). */
  | 'blocked'
  | 'failed';

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

/** Mock mode uses the mock SMS flow; otherwise the API supplies the Firebase web config. */
export function loadAuthConfig(): Promise<AuthConfig> {
  if (USE_MOCKS) return Promise.resolve({ otpProvider: 'sms' });
  config ??= getRepository()
    .getAuthConfig()
    .catch((err) => {
      config = null; // ask again next time
      throw err;
    });
  return config;
}

type FirebaseAuth = { auth: typeof FirebaseAuthModule; instance: Auth };
let firebase: Promise<FirebaseAuth> | null = null;

function firebaseAuth(
  cfg: Extract<AuthConfig, { otpProvider: 'firebase' }>['firebase'],
): Promise<FirebaseAuth> {
  firebase ??= Promise.all([import('firebase/app'), import('firebase/auth')])
    .then(([{ getApps, initializeApp }, auth]) => {
      const app =
        getApps()[0] ??
        initializeApp({
          projectId: cfg.projectId,
          apiKey: cfg.apiKey ?? undefined,
          authDomain: cfg.authDomain ?? undefined,
          appId: cfg.appId ?? undefined,
        });
      const instance = auth.getAuth(app);
      // reCAPTCHA Enterprise (ADR 060): loading the project's reCAPTCHA config up front lets the
      // score-based check run without an image challenge and gives it the page's signals. It fails
      // harmlessly when Enterprise is not enabled for the project; the SDK then uses invisible v2.
      void auth.initializeRecaptchaConfig?.(instance).catch(() => undefined);
      return { auth, instance };
    })
    .catch((err: unknown) => {
      firebase = null;
      throw err;
    });
  return firebase;
}

/**
 * Loads Firebase and its reCAPTCHA config while the visitor types the number, so "Send code" is
 * quick and reCAPTCHA Enterprise has seen the page before it scores the attempt.
 */
export async function prepareFirebaseSignIn(): Promise<void> {
  const cfg = await loadAuthConfig();
  if (cfg.otpProvider === 'firebase') await firebaseAuth(cfg.firebase);
}

function reasonOf(err: unknown): PhoneSignInError {
  const code = (err as { code?: string } | null)?.code ?? '';
  if (code === 'auth/invalid-phone-number' || code === 'auth/missing-phone-number')
    return 'invalid_phone';
  if (code === 'auth/invalid-verification-code' || code === 'auth/missing-verification-code')
    return 'wrong_code';
  if (code === 'auth/code-expired' || code === 'auth/session-expired') return 'expired';
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') return 'too_many';
  if (code === 'auth/error-code:-39') return 'undeliverable';
  if (
    code === 'auth/invalid-app-credential' ||
    code === 'auth/missing-recaptcha-token' ||
    code === 'auth/invalid-recaptcha-token' ||
    code === 'auth/captcha-check-failed'
  )
    return 'blocked';
  return 'failed';
}

/**
 * Our API's go-ahead before Firebase texts a code: Firebase codes spend the same per-IP, per-number
 * and hourly budget as our own SMS codes (docs/ops/production-readiness-audit.md, finding 23).
 */
async function allowCode(phone: string): Promise<void> {
  try {
    await getRepository().startFirebaseSignIn(phone);
  } catch (err) {
    const code = isRepositoryError(err) ? err.code : '';
    throw new FirebasePhoneError(
      code === 'rate_limited' || code === 'locked'
        ? 'too_many'
        : code === 'validation'
          ? 'invalid_phone'
          : 'failed',
    );
  }
}

/**
 * Asks Firebase to text a code to `phone` (E.164). With reCAPTCHA Enterprise enforced for phone
 * sign-in (ADR 060) the check is score-based and never shows an image challenge. `container` hosts
 * the invisible v2 widget that Firebase falls back to only when Enterprise is off or in AUDIT mode; it
 * must stay in the page until the code is sent. Firebase writes the SMS in `locale`.
 *
 * Firebase is the only OTP sender for the real web app: if it refuses or is not configured, this
 * throws `FirebasePhoneError` rather than falling back to our own SMS endpoint.
 */
export async function startPhoneSignIn(
  phone: string,
  container: HTMLElement,
  locale: string,
): Promise<'firebase'> {
  let cfg: AuthConfig;
  try {
    cfg = await loadAuthConfig();
  } catch {
    throw new FirebasePhoneError('failed');
  }
  if (cfg.otpProvider !== 'firebase') throw new FirebasePhoneError('failed');
  await allowCode(phone);
  const { auth, instance } = await firebaseAuth(cfg.firebase);
  instance.languageCode = locale;
  try {
    verifier?.clear();
    // A fresh element every attempt: a cleared verifier leaves its widget behind in the old one, and
    // rendering again there fails in the browser ("already rendered") without reaching Firebase.
    const host = document.createElement('div');
    container.replaceChildren(host);
    verifier = new auth.RecaptchaVerifier(instance, host, { size: 'invisible' });
    const confirmation = await auth.signInWithPhoneNumber(instance, phone, verifier);
    pending = { phone, confirmation, signOut: () => auth.signOut(instance) };
    return 'firebase';
  } catch (err) {
    pending = null;
    verifier?.clear();
    verifier = null;
    throw err instanceof FirebasePhoneError ? err : new FirebasePhoneError(reasonOf(err));
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
