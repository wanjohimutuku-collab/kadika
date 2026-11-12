/**
 * SMS reminders only (ADR 055): a customer who buys bulk SMS to remind their own contacts, without
 * invitation cards. Their event has `product: 'sms'`; they keep a contact list, write their own text and
 * send it now or later. Every SMS part (160 GSM-7 characters, 153 when split) spends one reminder credit
 * from the same allowance and packs as the card product (ADR 042). The API and the console both read
 * this file, so the counting rules cannot disagree.
 */
import { z } from 'zod';
import { templatePlaceholders, type TemplateVar } from './card-content';

/** Placeholders a bulk SMS campaign may use (no `{link}` required, since SMS-only events have no cards). */
export const SMS_CAMPAIGN_VARS = [
  'firstName',
  'lastName',
  'guest',
  'group',
  'venue',
  'date',
  'time',
  'title',
  'hosts',
  'sender',
  'phone',
  'mapUrl',
  'dress',
  'kind',
] as const satisfies readonly TemplateVar[];

/** Why a bulk SMS body is invalid for placeholders, or `null` when it is fine. */
export function smsCampaignProblem(body: string): string | null {
  const allowed: readonly string[] = SMS_CAMPAIGN_VARS;
  const unknown = templatePlaceholders(body).find((p) => !allowed.includes(p));
  return unknown ? `placeholder_unknown:${unknown}` : null;
}

export const EVENT_PRODUCTS = ['cards', 'sms'] as const;
/** `cards`: invitations, RSVP, gate and contributions. `sms`: SMS reminders only. */
export type EventProduct = (typeof EVENT_PRODUCTS)[number];
export const eventProductSchema = z.enum(EVENT_PRODUCTS);

/** GSM 03.38 basic charset (+ extension chars that cost 2 septets). */
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€';

export interface SmsSegments {
  encoding: 'GSM-7' | 'UCS-2';
  units: number;
  segments: number;
  perSegment: number;
}

/** How many SMS parts a text takes: GSM-7 160/153 per part, otherwise UCS-2 70/67. */
export function smsSegments(text: string): SmsSegments {
  let septets = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXT.includes(ch)) septets += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) {
    const segments = septets <= 160 ? 1 : Math.ceil(septets / 153);
    return {
      encoding: 'GSM-7',
      units: septets,
      segments: Math.max(1, segments),
      perSegment: septets <= 160 ? 160 : 153,
    };
  }
  const units = [...text].reduce((n, ch) => n + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  const segments = units <= 70 ? 1 : Math.ceil(units / 67);
  return {
    encoding: 'UCS-2',
    units,
    segments: Math.max(1, segments),
    perSegment: units <= 70 ? 70 : 67,
  };
}

/** Longest text a campaign may send: three parts, so one tap never spends more than 3 credits a contact. */
export const SMS_MAX_SEGMENTS = 3;
/** Most campaigns waiting at once per customer: enough for a plan of reminders, too few for spam. */
export const SMS_MAX_PENDING = 20;

/** Who a campaign goes to; resolved when it runs, so contacts added in between are included. */
export type SmsTarget = 'all' | { group: string } | { guestIds: string[] };
export const smsTargetSchema = z.union([
  z.literal('all'),
  z.object({ group: z.string().trim().min(1).max(40) }),
  z.object({ guestIds: z.array(z.string().min(1)).min(1).max(5000) }),
]);

/** Text checks shared by the API and the compose form; messages are i18n keys under `sms.errors`. */
export const smsBodySchema = z
  .string()
  .trim()
  .min(2, 'body.required')
  .max(1000, 'body.tooLong')
  .refine((b) => smsSegments(b).segments <= SMS_MAX_SEGMENTS, 'body.tooLong')
  .superRefine((b, ctx) => {
    const problem = smsCampaignProblem(b);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  });

export const smsCampaignInputSchema = z.object({
  body: smsBodySchema,
  target: smsTargetSchema,
  /** ISO date-time with offset; left out, the text goes now. */
  scheduleAt: z.string().datetime({ offset: true }).optional(),
});
export type SmsCampaignInput = z.input<typeof smsCampaignInputSchema>;

export type SmsCampaignStatus = 'scheduled' | 'running' | 'done' | 'cancelled';

export interface SmsCampaignView {
  id: string;
  eventId: string;
  body: string;
  target: SmsTarget;
  status: SmsCampaignStatus;
  /** Null when it went out at once. */
  scheduledFor: string | null;
  segments: number;
  /** Contacts the audience matched when it was created. */
  recipientCount: number;
  sent: number;
  failed: number;
  /** Contacts without a phone number, or a number the gateway cannot reach. */
  skipped: number;
  /** Credits it spent (sent × parts), or will need when scheduled. */
  credits: number;
  /** `missed` (ran a day late), `quota_exceeded`, or a provider error. */
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

/** What a campaign would do, with nothing sent. */
export interface SmsCampaignPreview {
  recipients: number;
  /** Matched contacts without a phone number; they are skipped. */
  withoutPhone: number;
  segments: number;
  encoding: SmsSegments['encoding'];
  /** recipients × segments. */
  credits: number;
  /** Credits left now; null when limits are not enforced (ADR 042). */
  remaining: number | null;
}

/** The staff view of one SMS-only customer (ADR 055); the owner's phone is masked. */
export interface OpsSmsCustomer {
  eventId: string;
  title: string;
  ownerName: string;
  ownerPhone: string;
  country: 'TZ' | 'KE';
  status: 'draft' | 'active' | 'completed' | 'archived';
  contacts: number;
  campaigns: number;
  scheduled: number;
  /** SMS parts that did not fail, all time and in the last 30 days. */
  smsSent: number;
  smsSent30d: number;
  lastSentAt: string | null;
  allowance: number;
  used: number;
  remaining: number;
  createdAt: string;
}

/** What the customer fills in to start (no venue, cards or theme). */
export const smsEventInputSchema = z.object({
  title: z.string().trim().min(2, 'name.too_short').max(80),
  /** Who the texts are from, shown to the customer and in the staff panel. */
  senderName: z.string().trim().max(60).optional().default(''),
  /** The date of what is being reminded about; local date-time. */
  dateStart: z.string().min(1, 'date.required'),
  languageDefault: z.enum(['sw', 'en']),
  country: z.enum(['TZ', 'KE']).optional().default('TZ'),
});
export type SmsEventInput = z.input<typeof smsEventInputSchema>;
