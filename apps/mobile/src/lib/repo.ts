import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { createHttpRepository, type Repository, type TokenStore } from '@harusi/api-client';
import { secureGet, secureSet } from './storage';

const TOKEN_KEY = 'harusi.tokens.v1';

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3001';

type Tokens = { accessToken: string; refreshToken: string } | null;
let cache: Tokens = null;

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
    cache = t;
    void secureSet(TOKEN_KEY, t ? JSON.stringify(t) : null);
  },
};

export const getAccessToken = (): string | null => cache?.accessToken ?? null;

let repo: Repository | null = null;
export function getRepository(): Repository {
  repo ??= createHttpRepository(API_URL, { tokens, newKey: () => Crypto.randomUUID() });
  return repo;
}
