import { CONTACTS_MAX, cleanContacts, pickPhone, type ContactLite } from '@harusi/schemas';

/**
 * Google Contacts import (ADR 051). Runs entirely in the organizer's browser: Google Identity Services
 * gives a short-lived, read-only access token in a Google popup, we read names and phone numbers from
 * the People API, then revoke the token. The token never reaches our servers and is never stored.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/contacts.readonly';
const PEOPLE_URL = 'https://people.googleapis.com/v1/people/me/connections';

interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void;
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type: string }) => void;
      }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
}
declare global {
  interface Window {
    google?: Gis;
  }
}

export class GoogleContactsError extends Error {
  constructor(readonly code: 'unavailable' | 'denied' | 'failed') {
    super(code);
  }
}

let configPromise: Promise<string | null> | null = null;
/** The OAuth client ID is read at runtime (images are built once for every environment). */
export function googleContactsClientId(): Promise<string | null> {
  configPromise ??= fetch('/app/contacts-config', { cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<{ googleClientId: string | null }>) : null))
    .then((j) => j?.googleClientId ?? null)
    .catch(() => {
      configPromise = null;
      return null;
    });
  return configPromise;
}

let scriptPromise: Promise<Gis> | null = null;
/** Loads Google's script ahead of the click: the popup must open inside the user's tap. */
export function loadGis(): Promise<Gis> {
  if (typeof window === 'undefined') return Promise.reject(new GoogleContactsError('unavailable'));
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  scriptPromise ??= new Promise<Gis>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () =>
      window.google?.accounts?.oauth2
        ? resolve(window.google)
        : reject(new GoogleContactsError('unavailable'));
    s.onerror = () => {
      scriptPromise = null;
      s.remove();
      reject(new GoogleContactsError('unavailable'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Person {
  names?: { displayName?: string }[];
  phoneNumbers?: { value?: string; type?: string; formattedType?: string }[];
}

/** People API page → contacts. Exported for tests. */
export function fromPeople(people: Person[]): ContactLite[] {
  return people.map((p) => ({
    name: p.names?.[0]?.displayName ?? '',
    phone: pickPhone(
      (p.phoneNumbers ?? []).map((n) => ({
        value: n.value ?? '',
        label: n.type ?? n.formattedType,
      })),
    ),
  }));
}

async function readAll(token: string): Promise<ContactLite[]> {
  const out: ContactLite[] = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ personFields: 'names,phoneNumbers', pageSize: '1000' });
    if (pageToken) q.set('pageToken', pageToken);
    const r = await fetch(`${PEOPLE_URL}?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
    if (!r.ok) throw new GoogleContactsError(r.status === 403 ? 'denied' : 'failed');
    const j = (await r.json()) as { connections?: Person[]; nextPageToken?: string };
    out.push(...fromPeople(j.connections ?? []));
    pageToken = j.nextPageToken ?? '';
  } while (pageToken && out.length < CONTACTS_MAX);
  return cleanContacts(out);
}

/**
 * Opens Google's consent popup and returns the account's contacts. Call from a click handler after
 * `loadGis()` has resolved. The token is revoked whether reading succeeds or not.
 */
export function pickGoogleContacts(gis: Gis, clientId: string): Promise<ContactLite[]> {
  return new Promise((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (res) => {
        const token = res.access_token;
        if (!token || res.error) return reject(new GoogleContactsError('denied'));
        readAll(token)
          .then(resolve, reject)
          .finally(() => gis.accounts.oauth2.revoke(token));
      },
      // popup closed or blocked
      error_callback: () => reject(new GoogleContactsError('denied')),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}
