import { z } from 'zod';
import { cardContentSchema, cardKindSchema } from './card-content';
import { countrySchema, type Country } from './country';
import { normalizePhone, normalizeTzPhone } from './phone';
import { SHORT_CODE_PATTERN } from './short-code';

export const languageSchema = z.enum(['sw', 'en']);
export const channelPrefSchema = z.enum(['whatsapp', 'sms', 'print', 'mixed']);
export const messageChannelSchema = z.enum(['whatsapp', 'sms', 'print']);
export const invitationStatusSchema = z.enum([
  'created',
  'queued',
  'sent',
  'delivered',
  'opened',
  'confirmed',
  'declined',
  'checked_in',
]);
export const memberRoleSchema = z.enum(['owner', 'committee', 'gate']);
export const pledgeStatusSchema = z.enum(['pledged', 'partial', 'paid', 'waived']);
export const paymentStatusSchema = z.enum(['pending', 'success', 'failed']);
export const paymentMethodSchema = z.enum(['mpesa', 'mixx', 'airtel', 'halopesa', 'cash', 'bank']);
export const scanResultSchema = z.enum([
  'ok',
  'duplicate',
  'invalid_sig',
  'wrong_event',
  'not_found',
  'manual_ok',
  'manual_denied',
]);
export const themeIdSchema = z.enum(['emerald-gold', 'navy-silver', 'terracotta', 'rose-sage']);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color.invalid');
/** Per-event colour overrides for the digital and print cards (keys mirror `@harusi/ui-tokens` PALETTE_KEYS). */
export const paletteOverridesSchema = z
  .object({
    primary: hexColor,
    onPrimary: hexColor,
    accent: hexColor,
    bg: hexColor,
    surface: hexColor,
    ink: hexColor,
    muted: hexColor,
    border: hexColor,
    pattern: hexColor,
  })
  .partial()
  .strict();

export type Language = z.infer<typeof languageSchema>;
export type ChannelPref = z.infer<typeof channelPrefSchema>;
export type MessageChannel = z.infer<typeof messageChannelSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type PledgeStatus = z.infer<typeof pledgeStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;

/** Phone field: accepts any TZ format, outputs E.164. Error messages are i18n keys. */
export const tzPhoneSchema = z.string().transform((value, ctx) => {
  const r = normalizeTzPhone(value);
  if (!r.ok) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `phone.${r.error}` });
    return z.NEVER;
  }
  return r.e164;
});

/** Phone schema for an event: local formats use `country`, international forms any of `allowed`. */
export const phoneSchemaFor = (country: Country, allowed: readonly Country[] = [country]) =>
  z.string().transform((value, ctx) => {
    const r = normalizePhone(value, country, allowed);
    if (!r.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `phone.${r.error}` });
      return z.NEVER;
    }
    return r.e164;
  });

export const optionalTzPhoneSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value?.trim()) return null;
    const r = normalizeTzPhone(value);
    if (!r.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `phone.${r.error}` });
      return z.NEVER;
    }
    return r.e164;
  });

export const shortCodeSchema = z.string().regex(SHORT_CODE_PATTERN, 'code.invalid');

export const otpSchema = z.string().regex(/^\d{6}$/, 'otp.invalid');

/** Amounts are whole TZS (§5). */
export const amountSchema = z.coerce
  .number({ invalid_type_error: 'amount.invalid' })
  .int('amount.invalid')
  .positive('amount.positive')
  .max(1_000_000_000, 'amount.too_large');

export const guestInputSchema = z.object({
  displayName: z.string().trim().min(2, 'name.too_short').max(80, 'name.too_long'),
  phone: optionalTzPhoneSchema,
  groupLabel: z.string().trim().max(40).optional().default(''),
  partySizeAllowed: z.coerce.number().int().min(1, 'party.min').max(10, 'party.max'),
  /** `contribution`: the guest only receives a contribution card (ADR 029). */
  cardKind: cardKindSchema.optional(),
  inviteChannelPref: channelPrefSchema,
  /** Gets a printed card (ADR 042). Left out: yes for a guest without a phone. */
  printCard: z.boolean().optional(),
  hasSmartphone: z.boolean(),
  language: languageSchema,
  notes: z.string().max(500).optional().default(''),
});
export type GuestInput = z.input<typeof guestInputSchema>;
export type GuestInputParsed = z.output<typeof guestInputSchema>;

/**
 * The kinds of event the app knows by name. What the organiser picks or types is stored as written; for a
 * known kind the word follows the language of whoever reads it, so an English guest's card says
 * "engagement" where a Swahili one says "uchumba". Anything else typed is shown as written (ADR 024, 041).
 */
export const EVENT_KINDS = [
  { sw: 'Harusi', en: 'Wedding', aliases: ['harusi', 'wedding'] },
  { sw: 'Send-off', en: 'Send-off', aliases: ['send-off', 'sendoff', 'send off'] },
  { sw: 'Uchumba', en: 'Engagement', aliases: ['uchumba', 'engagement'] },
] as const;
/** Quick suggestions for the free-text "type of invitation" field; anything else may be typed. */
export const EVENT_KIND_SUGGESTIONS = ['Wedding', 'Send-off', 'Engagement'] as const;
/**
 * The kind with the "of" that goes with it: "Harusi ya" but "Uchumba wa" in Swahili, because the little word
 * agrees with the noun ("uchumba" takes "wa"); "Engagement of" in English. A kind the organiser typed is
 * assumed to take "ya", the most common ending. Use it wherever a text reads "<kind> of <hosts>".
 */
export function eventKindOf(kind: string | null | undefined, locale: 'sw' | 'en'): string {
  const label = eventKindLabel(kind, locale);
  if (locale === 'en') return `${label} of`;
  return `${label} ${label.toLowerCase() === 'uchumba' ? 'wa' : 'ya'}`;
}
/** The suggestions in the reader's language: Wedding, Send-off, Engagement, or Harusi, Send-off, Uchumba. */
export function eventKindSuggestions(locale: 'sw' | 'en'): string[] {
  return EVENT_KINDS.map((k) => k[locale]);
}
/** The kind to show: what the organiser wrote (a known kind in the reader's language), else the default. */
export function eventKindLabel(kind: string | null | undefined, locale: 'sw' | 'en'): string {
  const text = kind?.trim();
  if (!text) return locale === 'sw' ? 'Harusi' : 'Wedding';
  const known = EVENT_KINDS.find((k) =>
    (k.aliases as readonly string[]).includes(text.toLowerCase()),
  );
  return known ? known[locale] : text;
}
/**
 * The three card categories the product ships presets for (uchumba, send-off, wedding). The kind itself stays
 * free text (ADR 024); this only chooses default wording, so any other kind behaves as before.
 */
export const OCCASIONS = ['wedding', 'engagement', 'sendoff', 'other'] as const;
export type Occasion = (typeof OCCASIONS)[number];
export function occasionOf(kind: string | null | undefined): Occasion {
  const k =
    kind
      ?.trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '') ?? '';
  if (!k || k.includes('harusi') || k.includes('wedding')) return 'wedding';
  if (k.includes('uchumba') || k.includes('engagement') || k.includes('ruracio'))
    return 'engagement';
  if (k.includes('sendoff') || k.includes('kitchenparty')) return 'sendoff';
  return 'other';
}
/** Host names joined for display; a single host has no dangling ampersand. */
export function hostNames(a: string, b?: string | null): string {
  return [a, b]
    .map((n) => n?.trim())
    .filter(Boolean)
    .join(' & ');
}

/** Default "sent by" line; names the kind of event when the organiser wrote one. */
export function defaultSender(
  kind: string | null | undefined,
  hosts: string,
  senderKind: 'family' | 'committee' | 'couple' | 'host' | 'custom' = 'committee',
  locale: 'sw' | 'en' = 'en',
): string {
  const sw = locale === 'sw';
  // a known kind is named in the reader's language: "Kamati ya Uchumba ya …" or "The engagement committee of …"
  const k = kind?.trim() ? eventKindLabel(kind, locale) : '';
  if (senderKind === 'family') return sw ? `Familia ya ${hosts}` : `The ${hosts} family`;
  if (senderKind === 'couple' || senderKind === 'host' || senderKind === 'custom') return hosts;
  if (sw) return k ? `Kamati ya ${eventKindOf(kind, 'sw')} ${hosts}` : `Kamati ya ${hosts}`;
  return k ? `The ${k.toLowerCase()} committee of ${hosts}` : `The ${hosts} committee`;
}

/** The title a new event starts with: "Harusi ya Asha & Juma", or "Wedding of Asha & Juma" in English. */
export function defaultEventTitle(
  kind: string | null | undefined,
  hosts: string,
  locale: 'sw' | 'en',
): string {
  return `${eventKindOf(kind, locale)} ${hosts}`;
}

export const eventKindSchema = z.string().trim().max(40, 'name.too_long');

export const eventInputSchema = z.object({
  title: z.string().trim().min(2, 'name.too_short').max(80),
  eventKind: eventKindSchema.optional().default(''),
  /** Defaults to Tanzania; Kenya only when the deployment enables it (ADR 025). */
  country: countrySchema.optional().default('TZ'),
  partnerA: z.string().trim().min(2, 'name.too_short').max(40),
  partnerB: z.string().trim().max(40).optional().default(''),
  dateStart: z.string().min(1, 'date.required'), // ISO date-time (local Africa/Dar_es_Salaam)
  venueName: z.string().trim().min(2, 'venue.required').max(120),
  venueMapUrl: z
    .string()
    .trim()
    .url('url.invalid')
    .refine((u) => /^https?:\/\//i.test(u), 'url.invalid')
    .or(z.literal(''))
    .optional()
    .default(''),
  dressCode: z.string().trim().max(80).optional().default(''),
  languageDefault: languageSchema,
  themeId: themeIdSchema,
  coverGradient: z.string().optional().default(''),
  palette: paletteOverridesSchema.optional(),
  rsvpDeadline: z.string().optional().default(''),
  contributionTarget: z.coerce.number().int().min(0).optional().default(0),
  /** Texts, labels and toggles for the cards and messages; new events start family-sent (ADR 029). */
  cardContent: cardContentSchema.optional(),
});
export type EventInput = z.input<typeof eventInputSchema>;

export const rsvpInputSchema = z.object({
  attending: z.boolean(),
  partySize: z.number().int().min(0).max(10),
});
export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export const manualPaymentSchema = z.object({
  guestId: z.string().min(1, 'guest.required'),
  amount: amountSchema,
  method: paymentMethodSchema,
  reference: z.string().trim().max(60).optional().default(''),
  note: z.string().trim().max(200).optional().default(''),
});
export type ManualPaymentInput = z.input<typeof manualPaymentSchema>;
