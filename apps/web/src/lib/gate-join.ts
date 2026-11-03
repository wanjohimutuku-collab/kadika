/** The Android app's deep-link scheme and package (apps/mobile/app.json). */
export const MOBILE_SCHEME = 'harusipass';
export const MOBILE_PACKAGE = 'app.harusipass.mobile';

/** A gate link code from the URL, tidied: upper case, letters and digits only, at most 16 characters. */
export function gateJoinCode(raw: string): string {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    // A malformed escape: the characters are filtered below anyway.
  }
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

/**
 * An Android intent link that opens the app's join screen with the code filled in. Without the app,
 * Chrome goes to `fallback` (the download page) instead of showing an error.
 */
export function gateAppIntent(code: string, fallback: string | null): string {
  const extra = fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : '';
  return `intent://gate-join/${encodeURIComponent(code)}#Intent;scheme=${MOBILE_SCHEME};package=${MOBILE_PACKAGE};${extra}end`;
}
