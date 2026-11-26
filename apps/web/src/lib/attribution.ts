import type { SignupAttribution } from '@harusi/api-client';

const STORAGE_KEY = 'ks.attribution.v1';

function cleanTag(raw: string | null | undefined, max = 64): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, max);
  return cleaned || undefined;
}

function cleanRefCode(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
  return cleaned || undefined;
}

function externalReferrerHost(): string | undefined {
  if (typeof document === 'undefined' || !document.referrer) return undefined;
  try {
    const refUrl = new URL(document.referrer);
    const refHost = refUrl.hostname.replace(/^www\./, '').toLowerCase().slice(0, 80);
    const currentHost =
      typeof window !== 'undefined'
        ? window.location.hostname.replace(/^www\./, '').toLowerCase()
        : '';
    if (!refHost || (currentHost && refHost === currentHost)) return undefined;
    return refHost;
  } catch {
    return undefined;
  }
}

/**
 * Captures UTM parameters, referral code (`?ref=`), and external referrer host into `sessionStorage`
 * without setting any cookies (respecting our no-analytics-cookies policy).
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = cleanTag(params.get('utm_source'));
    const utmMedium = cleanTag(params.get('utm_medium'));
    const utmCampaign = cleanTag(params.get('utm_campaign'));
    const referralCode = cleanRefCode(params.get('ref'));
    const referrerHost = externalReferrerHost();

    if (!utmSource && !utmMedium && !utmCampaign && !referralCode && !referrerHost) return;

    const existing = readAttribution() ?? {};
    const merged: SignupAttribution = {
      utmSource: utmSource ?? existing.utmSource ?? null,
      utmMedium: utmMedium ?? existing.utmMedium ?? null,
      utmCampaign: utmCampaign ?? existing.utmCampaign ?? null,
      referralCode: referralCode ?? existing.referralCode ?? null,
      referrerHost: referrerHost ?? existing.referrerHost ?? null,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // sessionStorage unavailable (private mode / blocked storage)
  }
}

export function readAttribution(): SignupAttribution | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as SignupAttribution;
    if (
      !parsed.utmSource &&
      !parsed.utmMedium &&
      !parsed.utmCampaign &&
      !parsed.referralCode &&
      !parsed.referrerHost
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function clearAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
