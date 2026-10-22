import type { AuthConfig } from '@harusi/api-client';
import type * as FirebaseAuth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { getRepository } from './repo';

/**
 * Firebase Phone Auth for sign-in (ADR 048), through React Native Firebase. The API decides the flow
 * (`GET /v1/auth/config`). The native part needs a build made with google-services.json (app.config.js);
 * a build without it, or Expo Go, cannot send Firebase codes and asks for an update instead.
 */

export type PhoneSignInError =
  'invalid_phone' | 'wrong_code' | 'expired' | 'too_many' | 'update_app' | 'failed';

export class FirebasePhoneError extends Error {
  constructor(readonly reason: PhoneSignInError) {
    super(reason);
  }
}

type AuthModule = typeof FirebaseAuth;

let config: Promise<AuthConfig> | null = null;
let pending: { phone: string; confirmation: FirebaseAuthTypes.ConfirmationResult } | null = null;
/** One exchange per code, whether the typed code or Android's own verification gets there first. */
let trade: Promise<string> | null = null;

/** A failed lookup means our own SMS code, which keeps working while the API is set to it. */
export function loadAuthConfig(): Promise<AuthConfig> {
  config ??= getRepository()
    .getAuthConfig()
    .catch((): AuthConfig => {
      config = null;
      return { otpProvider: 'sms' };
    });
  return config;
}

/** The module, or null when this build has no Firebase app configured. */
async function firebaseAuth(): Promise<AuthModule | null> {
  try {
    const mod = await import('@react-native-firebase/auth');
    mod.getAuth(); // throws without the native Firebase app
    return mod;
  } catch {
    return null;
  }
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

/** Asks Firebase to text a code to `phone` (E.164), in the app's language. */
export async function startPhoneSignIn(phone: string, locale: string, resend = false) {
  const mod = await firebaseAuth();
  if (!mod) throw new FirebasePhoneError('update_app');
  try {
    const auth = mod.getAuth();
    await mod.setLanguageCode(auth, locale);
    const confirmation = await mod.signInWithPhoneNumber(auth, phone, undefined, resend);
    pending = { phone, confirmation };
    trade = null;
  } catch (err) {
    throw new FirebasePhoneError(reasonOf(err));
  }
}

/** The Firebase user's ID token; the Firebase session itself is not kept (ours takes over). */
function tradeable(mod: AuthModule, user: FirebaseAuthTypes.User): Promise<string> {
  trade ??= (async () => {
    try {
      const idToken = await user.getIdToken();
      pending = null;
      await mod.signOut(mod.getAuth()).catch(() => undefined);
      return idToken;
    } catch (err) {
      trade = null;
      throw err;
    }
  })();
  return trade;
}

/** Checks the typed code with Firebase and returns the ID token the API trades for a session. */
export async function confirmPhoneCode(code: string): Promise<string> {
  const mod = await firebaseAuth();
  if (!mod || !pending) throw new FirebasePhoneError('expired');
  try {
    const cred = await pending.confirmation.confirm(code);
    // null: Android already verified the number on its own (auto-retrieval)
    const user = cred?.user ?? mod.getAuth().currentUser;
    if (!user) throw new FirebasePhoneError('failed');
    return await tradeable(mod, user);
  } catch (err) {
    throw err instanceof FirebasePhoneError ? err : new FirebasePhoneError(reasonOf(err));
  }
}

/**
 * Android may read the SMS (or verify the number) without the code being typed; Firebase then signs
 * in by itself. `onToken` gets the ID token in that case. Returns the unsubscribe function.
 */
export async function onAutoVerified(onToken: (idToken: string) => void): Promise<() => void> {
  const mod = await firebaseAuth();
  if (!mod) return () => undefined;
  return mod.onAuthStateChanged(mod.getAuth(), (user) => {
    if (user && pending && !trade) void tradeable(mod, user).then(onToken, () => undefined);
  });
}
