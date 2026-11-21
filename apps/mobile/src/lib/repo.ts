import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { createHttpRepository, type Repository, type TokenStore } from '@harusi/api-client';
import { secureGet, secureSet } from './storage';

const TOKEN_KEY = 'harusi.tokens.v1';

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3001';

/** The web app, which draws card images (`/api/card-image`, ADR 058). */
export const WEB_URL: string = (
  process.env.EXPO_PUBLIC_WEB_URL ??
  (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ??
  'https://kadisasa.com'
).replace(/\/$/, '');

type Tokens = { accessToken: string; refreshToken: string } | null;
let cache: Tokens = null;
const clearedListeners = new Set<() => void>();

/** Subscribes to token-clearing events (e.g. failed refresh or sign-out). */
export function onTokensCleared(fn: () => void): () => void {
  clearedListeners.add(fn);
  return () => clearedListeners.delete(fn);
}

/** Loads the saved session before the first render so the app opens signed in. */
export async function loadTokens(): Promise<void> {
  const raw = await secureGet(TOKEN_KEY);
  try {
    cache = raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    cache = null;
  }
}

const tokens: TokenStore = {
  get: () => cache,
  set: (t) => {
    const wasSet = cache !== null;
    cache = t;
    void secureSet(TOKEN_KEY, t ? JSON.stringify(t) : null);
    if (!t && wasSet) {
      for (const fn of clearedListeners) fn();
    }
  },
};

export const getAccessToken = (): string | null => cache?.accessToken ?? null;

let repo: Repository | null = null;
export function getRepository(): Repository {
  repo ??= createHttpRepository(API_URL, { tokens, newKey: () => Crypto.randomUUID() });
  return repo;
}
