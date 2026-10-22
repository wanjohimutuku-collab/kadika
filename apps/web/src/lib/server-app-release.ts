import 'server-only';
import type { AndroidRelease } from '@harusi/api-client';
import { USE_MOCKS } from './env';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * The Android app staff uploaded in /ops (ADR 047), or null. Cached for a minute, so a new upload
 * reaches /programu within about that long. An unreachable API reads as "no app": the page then falls
 * back to `ANDROID_APK_URL` or "coming soon", never to a dead button.
 */
export async function getAndroidReleaseOnServer(): Promise<AndroidRelease | null> {
  if (USE_MOCKS) return null;
  try {
    const res = await fetch(`${API_URL}/v1/app/android`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const r = (await res.json()) as AndroidRelease;
    return typeof r.version === 'string' && typeof r.sha256 === 'string' ? r : null;
  } catch {
    return null;
  }
}
