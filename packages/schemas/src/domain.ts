import { z } from 'zod';
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
export const amountTzsSchema = z.coerce
  .number({ invalid_type_error: 'amount.invalid' })
  .int('amount.invalid')
  .positive('amount.positive')
  .max(1_000_000_000, 'amount.too_large');

export const guestInputSchema = z.object({
  displayName: z.string().trim().min(2, 'name.too_short').max(80, 'name.too_long'),
  phone: optionalTzPhoneSchema,
  groupLabel: z.string().trim().max(40).optional().default(''),
  partySizeAllowed: z.coerce.number().int().min(1, 'party.min').max(10, 'party.max'),
  inviteChannelPref: channelPrefSchema,
  hasSmartphone: z.boolean(),
  language: languageSchema,
  notes: z.string().max(500).optional().default(''),
});
export type GuestInput = z.input<typeof guestInputSchema>;
export type GuestInputParsed = z.output<typeof guestInputSchema>;

/** Quick suggestions for the free-text "type of invitation" field; anything else may be typed. */
export const EVENT_KIND_SUGGESTIONS = ['Harusi', 'Send-off', 'Uchumba'] as const;
/** The kind to show: what the organiser wrote, else the default for the language. */
export function eventKindLabel(kind: string | null | undefined, locale: 'sw' | 'en'): string {
  return kind?.trim() || (locale === 'sw' ? 'Harusi' : 'Wedding');
}
/** Host names joined for display; a single host has no dangling ampersand. */
export function hostNames(a: string, b?: string | null): string {
  return [a, b]
    .map((n) => n?.trim())
    .filter(Boolean)
    .join(' & ');
}

/** Default "sent by" line; names the kind of event when the organiser wrote one. */
export function defaultSender(kind: string | null | undefined, hosts: string): string {
  const k = kind?.trim();
  return k ? `Kamati ya ${k} ya ${hosts}` : `Kamati ya ${hosts}`;
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
  venueMapUrl: z.string().trim().url('url.invalid').or(z.literal('')).optional().default(''),
  dressCode: z.string().trim().max(80).optional().default(''),
  languageDefault: languageSchema,
  themeId: themeIdSchema,
  coverGradient: z.string().optional().default(''),
  palette: paletteOverridesSchema.optional(),
  rsvpDeadline: z.string().optional().default(''),
  contributionTargetTzs: z.coerce.number().int().min(0).optional().default(0),
});
export type EventInput = z.input<typeof eventInputSchema>;

export const rsvpInputSchema = z.object({
  attending: z.boolean(),
  partySize: z.number().int().min(0).max(10),
});
export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export const manualPaymentSchema = z.object({
  guestId: z.string().min(1, 'guest.required'),
  amountTzs: amountTzsSchema,
  method: paymentMethodSchema,
  reference: z.string().trim().max(60).optional().default(''),
  note: z.string().trim().max(200).optional().default(''),
});
export type ManualPaymentInput = z.input<typeof manualPaymentSchema>;
