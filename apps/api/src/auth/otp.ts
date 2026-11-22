import { sha256 } from '@noble/hashes/sha256';
import { toHex } from '@harusi/crypto';
import type { DeliveryState, MessageChannel } from '@harusi/messaging';
import { countryOfE164, type Country } from '@harusi/schemas/country';
import { ApiError } from '../errors';
import { smsFor } from '../sms-routing';
import { BrandingService } from '../services/branding';
import type { Deps } from '../context';

const RESEND_MS = 30_000;
const MAX_PER_HOUR = 5;
const CODE_TTL_MS = 5 * 60_000;
/** How long a WhatsApp OTP may stay unacknowledged before an automatic SMS fallback is sent. */
export const OTP_FALLBACK_MS = 30_000;
/** Wrong codes one client may send for a number before that client is locked out of it. */
const MAX_ATTEMPTS = 5;
/** Wrong codes from all clients together before the code itself is void (a new one must be requested). */
const MAX_CODE_ATTEMPTS = 15;
const LOCK_MS = 10 * 60_000;
/** Numbers tracked before stale ones are dropped. */
const MAX_TRACKED = 10_000;

interface ClientState {
  attempts: number;
  lockedUntil: number | null;
}

interface PendingOtpDelivery {
  providerMsgId: string;
  sentAt: number;
  delivered: boolean;
  smsSent: boolean;
  body: string;
  country: Country;
}

interface OtpState {
  codeHash: string | null;
  expiresAt: number;
  /** Wrong guesses at the current code, from anyone. */
  codeAttempts: number;
  /** Wrong guesses per client (IP). The lock is the client's, never the phone's (review L-05). */
  clients: Map<string, ClientState>;
  requests: number[];
  /** Pending WhatsApp OTP delivery state; falls back to SMS if undelivered or failed. */
  pendingDelivery?: PendingOtpDelivery;
}

/**
 * Phone-OTP store. In-memory here (single API instance); the same interface moves to Redis for
 * rate limits across instances (§9, Phase 7). Codes are stored hashed, never in clear.
 *
 * Guessing is limited twice. Each client gets `MAX_ATTEMPTS` wrong codes per number and is then locked
 * out of that number for ten minutes; the number's owner, on another connection, is not, so nobody can
 * lock someone else out of signing in. And a code is void after `MAX_CODE_ATTEMPTS` wrong guesses in
 * total, so spreading guesses over many addresses buys nothing.
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
      if (this.state.size >= MAX_TRACKED) this.prune();
      r = { codeHash: null, expiresAt: 0, codeAttempts: 0, clients: new Map(), requests: [] };
      this.state.set(phone, r);
    }
    return r;
  }

  private static locked(c: ClientState | undefined, now: number): c is ClientState {
    return !!c && c.lockedUntil !== null && c.lockedUntil > now;
  }

  /** Drops numbers with nothing left to enforce (no live code, lock or recent request): bounds memory. */
  private prune(): void {
    const now = this.deps.now().getTime();
    for (const [phone, r] of this.state) {
      const live =
        r.expiresAt > now ||
        [...r.clients.values()].some((c) => OtpService.locked(c, now)) ||
        r.requests.some((t) => t > now - 3_600_000);
      if (!live) this.state.delete(phone);
    }
  }

  private hash(phone: string, code: string): string {
    return toHex(sha256(new TextEncoder().encode(`${phone}:${code}`)));
  }

  private refuseLocked(c: ClientState | undefined, now: number): void {
    if (OtpService.locked(c, now))
      throw new ApiError('locked', 'Too many attempts', {
        until: new Date(c.lockedUntil!).toISOString(),
      });
  }

  /**
   * `language`: the visitor's site or app language; without it, the number's country decides.
   * `client`: who is asking (the IP); a client locked out of this number cannot ask for more codes.
   * Tries WhatsApp first when available; if WhatsApp fails, is not delivered before a resend/timeout,
   * or reports a failed delivery webhook, sends the code by SMS through the number's country route.
   */
  async request(
    phone: string,
    language?: 'sw' | 'en',
    client = 'local',
  ): Promise<{ resendAfterSeconds: number; channel: MessageChannel }> {
    const now = this.deps.now().getTime();
    const r = this.rec(phone);
    this.refuseLocked(r.clients.get(client), now);
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
    r.codeAttempts = 0;
    // A new code starts every client's count again; clients still locked stay locked.
    for (const [k, c] of r.clients) if (!OtpService.locked(c, now)) r.clients.delete(k);
    r.requests.push(now);
    const brand = await this.branding.businessName();
    const lang = language ?? (country === 'KE' ? 'en' : 'sw');
    const body =
      lang === 'en'
        ? `Your ${brand} verification code is ${code}. Do not share it with anyone.`
        : `Namba yako ya uthibitisho ya ${brand} ni ${code}. Usimpe mtu yeyote.`;
    // If a previous WhatsApp OTP for this number was never confirmed delivered, send the resend via SMS.
    const previousUndelivered = !!(r.pendingDelivery && !r.pendingDelivery.delivered);
    // Countries that sign in by SMS (`AUTH_SMS_COUNTRIES`, Tanzania by default) get the code on their
    // SMS route directly (NextSMS for Tanzania), not on WhatsApp first.
    const smsOnly = (this.deps.config.authSmsCountries ?? []).includes(country);
    const wa = !previousUndelivered && !smsOnly ? this.deps.whatsapp : undefined;
    if (wa) {
      try {
        const res = await wa.send(phone, body, {
          kind: 'otp',
          locale: lang,
          country,
          params: [code],
        });
        r.pendingDelivery = {
          providerMsgId: res.providerMsgId,
          sentAt: now,
          delivered: false,
          smsSent: false,
          body,
          country,
        };
        if (!this.deps.sleep) {
          setTimeout(
            () => void this.fallbackUndelivered().catch(() => undefined),
            OTP_FALLBACK_MS,
          ).unref?.();
        }
        return { resendAfterSeconds: RESEND_MS / 1000, channel: 'whatsapp' };
      } catch {
        // WhatsApp failed synchronously: fall through and send via SMS right away.
      }
    }
    r.pendingDelivery = undefined;
    await route.send(phone, body);
    return { resendAfterSeconds: RESEND_MS / 1000, channel: 'sms' };
  }

  /**
   * Handles a WhatsApp delivery webhook for an OTP message. Marks it delivered on `delivered`/`read`,
   * or sends an immediate SMS fallback when WhatsApp reports `failed` while the code is still live.
   */
  async recordDelivery(providerMsgId: string, state: DeliveryState): Promise<boolean> {
    const now = this.deps.now().getTime();
    for (const [phone, r] of this.state) {
      const d = r.pendingDelivery;
      if (!d || d.providerMsgId !== providerMsgId) continue;
      if (state === 'delivered' || state === 'read') {
        d.delivered = true;
        return true;
      }
      if (state === 'failed' && !d.smsSent && r.codeHash !== null && r.expiresAt > now) {
        d.smsSent = true;
        const route = smsFor(this.deps, d.country);
        if (route) await route.send(phone, d.body);
      }
      return true;
    }
    return false;
  }

  /**
   * Sends one SMS fallback for any live WhatsApp OTP still not confirmed delivered after `maxAgeMs`.
   */
  async fallbackUndelivered(maxAgeMs = OTP_FALLBACK_MS): Promise<number> {
    const now = this.deps.now().getTime();
    let sent = 0;
    for (const [phone, r] of this.state) {
      const d = r.pendingDelivery;
      if (
        !d ||
        d.delivered ||
        d.smsSent ||
        r.codeHash === null ||
        r.expiresAt <= now ||
        now - d.sentAt < maxAgeMs
      )
        continue;
      const route = smsFor(this.deps, d.country);
      if (!route) continue;
      d.smsSent = true;
      await route.send(phone, d.body);
      sent++;
    }
    return sent;
  }

  verify(phone: string, code: string, client = 'local'): void {
    const now = this.deps.now().getTime();
    // Read only: a guess at a number that never asked for a code must not allocate state for it.
    const r = this.state.get(phone);
    this.refuseLocked(r?.clients.get(client), now);
    if (!r?.codeHash || r.expiresAt < now)
      throw new ApiError('validation', 'Code expired or not requested', { reason: 'expired' });
    if (this.hash(phone, code) !== r.codeHash) {
      const c = r.clients.get(client) ?? { attempts: 0, lockedUntil: null };
      r.clients.set(client, c);
      c.attempts += 1;
      r.codeAttempts += 1;
      if (r.codeAttempts >= MAX_CODE_ATTEMPTS) r.codeHash = null;
      if (c.attempts >= MAX_ATTEMPTS) {
        c.attempts = 0;
        c.lockedUntil = now + LOCK_MS;
        throw new ApiError('locked', 'Too many attempts', {
          until: new Date(c.lockedUntil).toISOString(),
        });
      }
      throw new ApiError('validation', 'Wrong code', {
        reason: 'wrong_code',
        attemptsLeft: MAX_ATTEMPTS - c.attempts,
      });
    }
    r.codeHash = null; // single use
    r.pendingDelivery = undefined;
    r.clients.delete(client);
  }
}
