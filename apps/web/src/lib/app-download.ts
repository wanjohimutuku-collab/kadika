/**
 * Where visitors get the Android app (`/programu`). Both links are runtime settings on the web
 * server (`ANDROID_PLAY_URL`, `ANDROID_APK_URL`), not `NEXT_PUBLIC_*`, so staff can add or change them in
 * Coolify with a restart rather than a new build. With neither set the page shows "coming soon".
 */

/** The page itself; `/app-download` redirects here. */
export const APP_DOWNLOAD_PATH = '/programu';

export interface AppLinks {
  /** The Google Play listing. */
  play: string | null;
  /** A direct APK download, for phones without Google Play. */
  apk: string | null;
}

/** Only absolute `https://` URLs are used: the value ends up in an `href`, and an APK must not come over http. */
export function safeHttpsUrl(raw: string | undefined | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname ? u.toString() : null;
  } catch {
    return null;
  }
}

export function appLinksFrom(env: Record<string, string | undefined>): AppLinks {
  return { play: safeHttpsUrl(env.ANDROID_PLAY_URL), apk: safeHttpsUrl(env.ANDROID_APK_URL) };
}

/** The host a download comes from, shown beside the APK button so people can check it. */
export function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}
