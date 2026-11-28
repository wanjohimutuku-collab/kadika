import { createHmac, timingSafeEqual } from 'node:crypto';
import type { MessageTemplate, MessagingProvider, SendResult } from './index';
import type { DeliveryState } from './evolution';

export type TemplateNames = {
  invite?: string;
  reminder?: string;
  pledge?: string;
  contribution?: string;
  memories?: string;
  otp?: string;
};

export interface WhatsAppCloudConnectionResult {
  ok: boolean;
  verifiedName: string | null;
  displayPhoneNumber: string | null;
  qualityRating: string | null;
  status: string | null;
  apiVersion: string;
  error: string | null;
  /**
   * Meta's own verdict on whether this number can send (`health_status`): `BLOCKED` stops every
   * message (an unapproved display name, an unverified business, no payment method...), `LIMITED`
   * sends with limits. Null when Meta did not say (old API version, token without access).
   */
  canSendMessage: 'AVAILABLE' | 'LIMITED' | 'BLOCKED' | null;
  /** Why, in Meta's words, one line per problem. Account-level text only, never a recipient. */
  healthIssues: string[];
}

export interface WhatsAppCloudOptions {
  /** Permanent system-user access token. Never log it. */
  token: string;
  /** The WhatsApp phone number id (not the phone number). */
  phoneNumberId: string;
  /** Graph API version, e.g. `v21.0`. */
  apiVersion?: string;
  /**
   * Approved template names. A business-initiated message (every invitation) must use a template;
   * without one the provider sends plain text, which WhatsApp only delivers inside a 24-hour
   * customer window, so first contact will fail.
   */
  templates?: TemplateNames;
  /** Templates approved for one country; used instead of `templates` for that country's events. */
  templatesByCountry?: Record<string, TemplateNames>;
  /**
   * The approved templates have an IMAGE header: the card image (`template.mediaUrl`) goes in it,
   * so guests receive the picture, not just text (ADR 058). Off unless the templates were approved
   * that way: WhatsApp rejects a header the template does not have.
   */
  imageHeader?: boolean;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/** WhatsApp wants digits with the country code and no `+`. */
export const toCloudNumber = (e164: string) => e164.replace(/\D/g, '');

/**
 * The official WhatsApp Business Cloud API (open decision §15.2, alternative to Evolution).
 * `POST /{phone-number-id}/messages`, Bearer auth. The message id is `messages[0].id` (`wamid…`),
 * which delivery webhooks refer to.
 */
export class WhatsAppCloudProvider implements MessagingProvider {
  readonly name = 'whatsapp-cloud';
  readonly channel = 'whatsapp' as const;
  constructor(private readonly o: WhatsAppCloudOptions) {}

  /**
   * A country with its own approved templates uses only those. A country without any (say Kenya,
   * before its templates are approved) must not borrow Tanzania's: the parameter layout differs and
   * WhatsApp rejects a wrong count, so it falls back to plain text and then to SMS.
   */
  private templateName(t: MessageTemplate): string | undefined {
    const own = t.country ? this.o.templatesByCountry?.[t.country] : undefined;
    if (own) return own[t.kind];
    return t.country && t.country !== 'TZ' ? undefined : this.o.templates?.[t.kind];
  }

  async send(to: string, body: string, template?: MessageTemplate): Promise<SendResult> {
    const name = template ? this.templateName(template) : undefined;
    const media = template?.mediaUrl;
    if (!template || !name) {
      // Free-form (inside the 24-hour window): the card itself as an image, the text as its caption,
      // so the guest gets the picture and not just a link. WhatsApp captions stop at 1024 chars.
      return this.post(
        media && body.length <= CAPTION_MAX
          ? { type: 'image', image: { link: media, caption: body } }
          : { type: 'text', text: { body, preview_url: true } },
        to,
      );
    }
    const tpl = (languageCode: string, header: boolean, otpButton = false) => ({
      type: 'template',
      template: {
        name,
        language: { code: languageCode },
        components: [
          ...(header && media
            ? [{ type: 'header', parameters: [{ type: 'image', image: { link: media } }] }]
            : []),
          {
            type: 'body',
            parameters: template.params.map((text) => ({
              type: 'text',
              text: sanitizeParam(text),
            })),
          },
          ...(otpButton && template.params[0]
            ? [
                {
                  type: 'button',
                  sub_type: 'url',
                  index: '0',
                  parameters: [{ type: 'text', text: sanitizeParam(template.params[0]) }],
                },
              ]
            : []),
        ],
      },
    });
    const sendForLang = async (languageCode: string): Promise<SendResult> => {
      const header = !!(this.o.imageHeader && media);
      try {
        return await this.post(tpl(languageCode, header), to);
      } catch (e) {
        if (e instanceof CloudError && e.code !== undefined) {
          // The setting is on but this template was approved without an IMAGE header (or its image could
          // not be fetched): send it without one rather than losing the invitation.
          if (header && HEADER_ERRORS.has(e.code)) return this.post(tpl(languageCode, false), to);
          // The template was approved with an IMAGE header while the setting is off/unset: retry with it.
          if (!header && media && HEADER_ERRORS.has(e.code))
            return this.post(tpl(languageCode, true), to);
          // Meta Authentication templates include a copy-code URL button component in addition to body {{1}}.
          if (template.kind === 'otp' && OTP_BUTTON_ERRORS.has(e.code))
            return this.post(tpl(languageCode, false, true), to);
        }
        throw e;
      }
    };
    const langs = languageFallbacks(template.locale);
    let lastError: unknown;
    for (const lang of langs) {
      try {
        return await sendForLang(lang);
      } catch (e) {
        lastError = e;
        if (e instanceof CloudError && e.code === TRANSLATION_ERROR) continue;
        throw e;
      }
    }
    throw lastError;
  }

  private get bearerToken(): string {
    return this.o.token.replace(/^Bearer\s+/i, '').trim();
  }

  private async post(message: Record<string, unknown>, to: string): Promise<SendResult> {
    const f = this.o.fetchImpl ?? fetch;
    const res = await f(
      `${this.o.baseUrl ?? 'https://graph.facebook.com'}/${this.o.apiVersion ?? 'v21.0'}/${this.o.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: toCloudNumber(to), ...message }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        error?: { code?: number; error_subcode?: number };
      } | null;
      // The Meta error code is useful for support; the message text can echo the number, so skip it.
      throw new CloudError(res.status, err?.error?.code, err?.error?.error_subcode);
    }
    const json = (await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
    const id = json?.messages?.[0]?.id;
    if (!id) throw new Error('whatsapp-cloud: no message id in response');
    return { providerMsgId: id };
  }

  /**
   * Verifies that the Meta Graph API access token and Phone Number ID can authenticate and
   * read the WhatsApp Business number profile without sending a message.
   */
  async verifyConnection(): Promise<WhatsAppCloudConnectionResult> {
    const f = this.o.fetchImpl ?? fetch;
    const apiVersion = this.o.apiVersion || 'v21.0';
    const base = (this.o.baseUrl ?? 'https://graph.facebook.com').replace(/\/$/, '');
    const nodeUrl = `${base}/${encodeURIComponent(apiVersion)}/${encodeURIComponent(this.o.phoneNumberId.trim())}`;
    const headers = { authorization: `Bearer ${this.bearerToken}` };

    type GraphNumberResponse = {
      verified_name?: string;
      display_phone_number?: string;
      quality_rating?: string;
      code_verification_status?: string;
      status?: string;
      health_status?: HealthStatus;
      error?: {
        code?: number;
        error_subcode?: number;
        message?: string;
        error_user_msg?: string;
        error_data?: { details?: string };
      };
    };

    const query = async (url: string) => {
      const res = await f(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json().catch(() => null)) as GraphNumberResponse | null;
      return { res, json };
    };
    const none = { canSendMessage: null, healthIssues: [] as string[] };

    try {
      // Request standard Phone Number fields (avoiding restricted `status` on messaging-only tokens).
      let { res, json } = await query(
        `${nodeUrl}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`,
      );
      // If Meta rejects a requested field with 400 code 100, retry the bare node URL for default fields.
      if (res.status === 400 && json?.error?.code === 100) {
        ({ res, json } = await query(nodeUrl));
      }
      if (!res.ok) {
        const err = json?.error;
        const codeParts = [
          err?.code ? `code ${err.code}` : '',
          err?.error_subcode ? `subcode ${err.error_subcode}` : '',
        ].filter(Boolean);
        const codeText = codeParts.length ? ` (${codeParts.join(', ')})` : '';
        const detail = err?.error_user_msg || err?.error_data?.details || err?.message || '';
        return {
          ok: false,
          verifiedName: null,
          displayPhoneNumber: null,
          qualityRating: null,
          status: null,
          apiVersion,
          error: `Graph API ${res.status}${codeText}${detail ? `: ${detail}` : ''}`,
          ...none,
        };
      }
      // "VERIFIED" only means the number is registered. Whether Meta lets it send (display name
      // approved, business verified, payment method, templates) is a separate check: ask for it on
      // its own, so a token that cannot read it still passes the connection test.
      const health = await query(`${nodeUrl}?fields=health_status`)
        .then(({ res: r, json: j }) => (r.ok ? readHealth(j?.health_status) : none))
        .catch(() => none);
      return {
        ok: true,
        verifiedName: json?.verified_name ?? null,
        displayPhoneNumber: json?.display_phone_number ?? null,
        qualityRating: json?.quality_rating ?? null,
        status: json?.status ?? json?.code_verification_status ?? null,
        apiVersion,
        error: null,
        ...health,
      };
    } catch (e) {
      return {
        ok: false,
        verifiedName: null,
        displayPhoneNumber: null,
        qualityRating: null,
        status: null,
        apiVersion,
        error: (e as Error).message || 'Connection failed',
        ...none,
      };
    }
  }
}

interface HealthStatus {
  can_send_message?: string;
  entities?: {
    entity_type?: string;
    can_send_message?: string;
    additional_info?: string[];
    errors?: { error_code?: number; error_description?: string; possible_solution?: string }[];
  }[];
}

const SEND_STATES = ['AVAILABLE', 'LIMITED', 'BLOCKED'] as const;

/** `health_status` of a phone number: the overall verdict and one line per limit or blocker. */
function readHealth(
  h: HealthStatus | undefined,
): Pick<WhatsAppCloudConnectionResult, 'canSendMessage' | 'healthIssues'> {
  const state = (SEND_STATES as readonly string[]).includes(h?.can_send_message ?? '')
    ? (h!.can_send_message as (typeof SEND_STATES)[number])
    : null;
  const issues: string[] = [];
  for (const e of h?.entities ?? []) {
    const who = e.entity_type ?? 'UNKNOWN';
    for (const info of e.additional_info ?? []) issues.push(`${who}: ${info}`);
    for (const err of e.errors ?? []) {
      const parts = [
        err.error_description,
        err.error_code !== undefined ? `(code ${err.error_code})` : undefined,
        err.possible_solution,
      ].filter(Boolean);
      issues.push(
        `${who}: ${err.error_description ? parts.join(' ') : `code ${err.error_code ?? '?'}`}`,
      );
    }
  }
  return { canSendMessage: state, healthIssues: issues };
}

const CAPTION_MAX = 1024;
/** Meta codes for a template/parameter mismatch or unusable header media. */
const HEADER_ERRORS = new Set([132000, 132012, 131053, 131052, 131008]);
const OTP_BUTTON_ERRORS = new Set([132000, 132012, 132015, 131008, 131009]);
const TRANSLATION_ERROR = 132001;

/** Meta rejects template parameters containing newlines, tabs, or 4+ consecutive spaces (code 132018). */
const sanitizeParam = (text: string) =>
  text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim() || '—';

const languageFallbacks = (locale: string): string[] => {
  if (locale === 'en') return ['en', 'en_US', 'sw'];
  if (locale === 'sw') return ['sw', 'en', 'en_US'];
  return [locale];
};

/**
 * Our own words for the Meta codes that stop cards going out, so the failure in the message log and
 * Ops usage says what to fix. Meta's message text is never used: it can echo the recipient's number.
 */
const REASONS: Record<number, string> = {
  10: 'token lacks WhatsApp permission',
  190: 'access token expired or invalid',
  200: 'token lacks WhatsApp permission',
  368: 'sender temporarily blocked for policy violations',
  130429: 'Cloud API rate limit reached',
  131008: 'required template parameter missing',
  131026: 'message undeliverable to this number',
  131030: 'recipient not on the test number allowed list',
  131031: 'WhatsApp Business account locked',
  131037: 'sender display name not approved by Meta',
  131042: 'WhatsApp Business account payment problem',
  131047: 'outside the 24-hour window: needs an approved template',
  131049: 'Meta held the message back to protect engagement',
  131052: 'card image could not be downloaded',
  131053: 'card image could not be used',
  131056: 'too many messages to this number',
  132000: 'template parameter count does not match',
  132001: 'template not approved in this language',
  132005: 'template text too long once filled in',
  132007: 'template content violates WhatsApp policy',
  132012: 'template parameter format does not match',
  132015: 'template paused by Meta',
  132016: 'template disabled by Meta',
  133010: 'sender number not registered with the Cloud API',
};

class CloudError extends Error {
  constructor(
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    const reason = code !== undefined ? REASONS[code] : undefined;
    super(
      `whatsapp-cloud ${status}${code ? ` code ${code}` : ''}${subcode ? ` subcode ${subcode}` : ''}${reason ? ` (${reason})` : ''}`,
    );
  }
}

/** `X-Hub-Signature-256: sha256=<hmac of the raw body with the app secret>` (constant-time check). */
export function verifyMetaSignature(
  rawBody: string,
  header: string | undefined,
  appSecret: string,
) {
  if (!header?.startsWith('sha256=')) return false;
  const want = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = header.slice(7);
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Webhook subscription handshake (`GET`): returns the challenge to echo, or null if it is wrong. */
export function metaVerifyChallenge(
  q: { mode?: string | null; token?: string | null; challenge?: string | null },
  verifyToken: string,
): string | null {
  if (q.mode !== 'subscribe' || !q.challenge || !q.token || !verifyToken) return null;
  // Constant time, like every other webhook secret (§9).
  const a = Buffer.from(q.token);
  const b = Buffer.from(verifyToken);
  return a.length === b.length && timingSafeEqual(a, b) ? q.challenge : null;
}

/** Status callbacks (`entry[].changes[].value.statuses[]`) mapped to our delivery states. */
export function parseCloudStatuses(
  payload: unknown,
): { providerMsgId: string; state: DeliveryState; failureReason?: string }[] {
  const out: { providerMsgId: string; state: DeliveryState; failureReason?: string }[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry ?? [];
  for (const e of entries) {
    for (const ch of (e as { changes?: unknown[] }).changes ?? []) {
      const statuses =
        (
          ch as {
            value?: {
              statuses?: {
                id?: string;
                status?: string;
                errors?: { code?: number; title?: string }[];
              }[];
            };
          }
        ).value?.statuses ?? [];
      for (const s of statuses) {
        if (!s.id) continue;
        const state: DeliveryState =
          s.status === 'read'
            ? 'read'
            : s.status === 'delivered'
              ? 'delivered'
              : s.status === 'failed'
                ? 'failed'
                : 'pending'; // `sent` = accepted by WhatsApp, not yet on the phone
        const err = state === 'failed' ? s.errors?.[0] : undefined;
        const failureReason =
          err?.code !== undefined && err.title
            ? `code ${err.code}: ${err.title}`
            : err?.code !== undefined
              ? `code ${err.code}`
              : err?.title || undefined;
        out.push({
          providerMsgId: s.id,
          state,
          ...(failureReason ? { failureReason } : {}),
        });
      }
    }
  }
  return out;
}
