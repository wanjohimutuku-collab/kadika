import { sha256 } from '@noble/hashes/sha256';
import { toHex } from '@harusi/crypto';
import { countryOfE164 } from '@harusi/schemas/country';
import { ApiError } from '../errors';
import { smsFor } from '../sms-routing';
import { BrandingService } from '../services/branding';
import type { Deps } from '../context';

const RESEND_MS = 30_000;
const MAX_PER_HOUR = 5;
const CODE_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60_000;

interface OtpState {
  codeHash: string | null;
  expiresAt: number;
  attempts: number;
  lockedUntil: number | null;
  requests: number[];
}

/**
 * Phone-OTP store. In-memory here (single API instance); the same interface moves to Redis for
 * rate limits across instances (§9, Phase 7). Codes are stored hashed, never in clear.
 */
export class OtpService {
  private state = new Map<string, OtpState>();
  private branding: BrandingService;

  constructor(private deps: Deps) {
    this.branding = new BrandingService(deps);
  }

  private rec(phone: string): OtpState {
    let r = this.state.get(phone);
    if (!r) {
      r = { codeHash: null, expiresAt: 0, attempts: 0, lockedUntil: null, requests: [] };
      this.state.set(phone, r);
    }
    return r;
  }

  private hash(phone: string, code: string): string {
    return toHex(sha256(new TextEncoder().encode(`${phone}:${code}`)));
  }

  async request(phone: string): Promise<{ resendAfterSeconds: number }> {
    const now = this.deps.now().getTime();
    const r = this.rec(phone);
    if (r.lockedUntil && r.lockedUntil > now)
      throw new ApiError('locked', 'Too many attempts', {
        until: new Date(r.lockedUntil).toISOString(),
      });
    r.requests = r.requests.filter((t) => t > now - 3_600_000);
    const last = r.requests.at(-1);
    if (last && now - last < RESEND_MS) {
      throw new ApiError('rate_limited', 'Wait before requesting a new code', {
        retryAfterSeconds: Math.ceil((RESEND_MS - (now - last)) / 1000),
      });
    }
    if (r.requests.length >= MAX_PER_HOUR)
      throw new ApiError('rate_limited', 'Too many codes requested', { retryAfterSeconds: 3600 });
    // The code goes out through the route for the number's own country (ADR 026).
    const country = countryOfE164(phone) ?? 'TZ';
    const route = smsFor(this.deps, country);
    if (!route)
      throw new ApiError('unavailable', 'SMS is not available for this country yet', {
        reason: 'sms_route_missing',
        country,
      });
    const bytes = this.deps.random(4);
    const n = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
    const code = String(n % 1_000_000).padStart(6, '0');
    r.codeHash = this.hash(phone, code);
    r.expiresAt = now + CODE_TTL_MS;
    r.attempts = 0;
    r.requests.push(now);
    const brand = await this.branding.businessName();
    await route.send(
      phone,
      country === 'KE'
        ? `Your ${brand} verification code is ${code}. Do not share it with anyone.`
        : `Namba yako ya uthibitisho ya ${brand} ni ${code}. Usimpe mtu yeyote.`,
    );
    return { resendAfterSeconds: RESEND_MS / 1000 };
  }

  verify(phone: string, code: string): void {
    const now = this.deps.now().getTime();
    const r = this.rec(phone);
    if (r.lockedUntil && r.lockedUntil > now)
      throw new ApiError('locked', 'Too many attempts', {
        until: new Date(r.lockedUntil).toISOString(),
      });
    if (!r.codeHash || r.expiresAt < now)
      throw new ApiError('validation', 'Code expired or not requested', { reason: 'expired' });
    if (this.hash(phone, code) !== r.codeHash) {
      r.attempts += 1;
      if (r.attempts >= MAX_ATTEMPTS) {
        r.lockedUntil = now + LOCK_MS;
        r.codeHash = null;
        throw new ApiError('locked', 'Too many attempts', {
          until: new Date(r.lockedUntil).toISOString(),
        });
      }
      throw new ApiError('validation', 'Wrong code', {
        reason: 'wrong_code',
        attemptsLeft: MAX_ATTEMPTS - r.attempts,
      });
    }
    r.codeHash = null; // single use
    r.attempts = 0;
  }
}
