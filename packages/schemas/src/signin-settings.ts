/**
 * Sign-in code settings that admin staff edit in /ops/settings (ADR 049): who sends login codes, and
 * the Firebase project for Firebase Phone Auth (ADR 048). Same shape as the payment settings (ADR 036).
 */
import type { ProviderField } from './messaging-settings';

/** `sms`: our own code through the SMS route. `firebase`: Firebase Phone Auth. */
export const SIGNIN_PROVIDERS = ['sms', 'firebase'] as const;
export type SignInProvider = (typeof SIGNIN_PROVIDERS)[number];

/**
 * The Firebase web app config. These values reach every browser on the login page, but they are kept
 * encrypted and admin-only like the other provider settings; the API key is shown masked.
 */
export const FIREBASE_FIELDS = [
  { key: 'projectId', required: true },
  { key: 'apiKey', secret: true, required: true },
  { key: 'appId', required: true },
  /** Defaults to `<projectId>.firebaseapp.com`. */
  { key: 'authDomain' },
] as const satisfies readonly ProviderField[];

export interface SignInSettingsView {
  /** The provider saved (or from the environment). */
  provider: SignInProvider;
  /** The provider in use right now: `sms` when `AUTH_FORCE_SMS` overrides a saved `firebase`. */
  active: SignInProvider;
  /** `AUTH_FORCE_SMS=1` on the API: the break-glass that keeps codes on SMS whatever is saved. */
  forcedSms: boolean;
  /** `database`: saved in /ops. `environment`: nothing saved yet, the env variables are in use. */
  source: 'database' | 'environment';
  fields: Record<string, string>;
  /** Secret fields that have a value, as `…abcd`. */
  secrets: Record<string, string>;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SignInSettingsInput {
  provider: SignInProvider;
  /** Leave the API key empty (or out) to keep the saved one. */
  fields: Record<string, string>;
}

/** Result of asking Firebase for the project behind the saved API key. */
export interface SignInTestResult {
  ok: boolean;
  error: string | null;
  projectId: string | null;
  /** Domains Firebase accepts sign-ins from. */
  authorizedDomains: string[];
  /** Our web hosts that are not among them: sign-in fails on those until they are added. */
  missingDomains: string[];
}
