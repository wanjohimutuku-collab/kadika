import { z } from 'zod';
import type { Locale } from './domain-locale';

/**
 * Everything an organiser can change about the cards and messages of one event (ADR 029). Every field is
 * optional: what is not set falls back to the built-in wording. Texts are per language (Swahili and
 * English); a language left empty falls back to the other one, then to the built-in text.
 */

/** Who the cards and messages come from. Families usually send them, so `family` is the default. */
export const SENDER_KINDS = ['family', 'committee', 'couple', 'host', 'custom'] as const;
export type SenderKind = (typeof SENDER_KINDS)[number];

export const CARD_KINDS = ['invitation', 'contribution'] as const;
export type CardKind = (typeof CARD_KINDS)[number];
export const cardKindSchema = z.enum(CARD_KINDS);

const text = (max: number) => z.string().max(max);
/** A text in each language. Both optional; an empty string means "not set". */
const ltext = (max: number) =>
  z
    .object({ sw: text(max).optional(), en: text(max).optional() })
    .strict()
    .optional();

/** Placeholders a message template may use, per template. Anything else is rejected. */
export const TEMPLATE_VARS = {
  inviteSms: ['guest', 'hosts', 'kind', 'date', 'time', 'venue', 'link', 'code', 'sender', 'phone'],
  reminderSms: [
    'guest',
    'hosts',
    'kind',
    'date',
    'time',
    'venue',
    'link',
    'code',
    'sender',
    'phone',
    'days',
  ],
  contributionSms: ['guest', 'hosts', 'kind', 'link', 'sender', 'phone', 'target', 'deadline'],
  pledgeReminderSms: ['guest', 'hosts', 'kind', 'link', 'sender', 'phone', 'pledged', 'balance'],
} as const;
export type TemplateKey = keyof typeof TEMPLATE_VARS;

const PLACEHOLDER = /\{(\w+)\}/g;

export function templatePlaceholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1]!);
}

/** Why a template is not acceptable, or `null` when it is fine (used by the schema and the editor). */
export function templateProblem(key: TemplateKey, template: string): string | null {
  const allowed: readonly string[] = TEMPLATE_VARS[key];
  const used = templatePlaceholders(template);
  const unknown = used.find((p) => !allowed.includes(p));
  if (unknown) return `content.placeholder_unknown:${unknown}`;
  // Without the link a guest has no way to open the card or pay.
  if (template.trim() && !used.includes('link')) return 'content.link_required';
  return null;
}

/** Fills `{name}` placeholders. Missing values become empty text; extra spaces from them are tidied. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template
    .replace(PLACEHOLDER, (_, k: string) => String(vars[k] ?? ''))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .trim();
}

const sms = (key: TemplateKey) =>
  z
    .object({ sw: text(480).optional(), en: text(480).optional() })
    .strict()
    .superRefine((v, ctx) => {
      for (const l of ['sw', 'en'] as const) {
        const t = v[l];
        const problem = t ? templateProblem(key, t) : null;
        if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [l], message: problem });
      }
    })
    .optional();

const showFlags = <K extends string>(keys: readonly K[]) =>
  z
    .object(
      Object.fromEntries(keys.map((k) => [k, z.boolean().optional()])) as Record<
        K,
        z.ZodOptional<z.ZodBoolean>
      >,
    )
    .strict()
    .optional();

export const programmeItemSchema = z.object({ time: text(20), title: text(100) }).strict();

export const cardContentSchema = z
  .object({
    sender: z
      .object({
        kind: z.enum(SENDER_KINDS).optional(),
        /** Replaces the default "sent by" name, for example "Familia ya Mzee Mwinyi". */
        name: text(100).optional(),
        /** The phone guests are told to call; falls back to the committee phone of the event. */
        phone: text(30).optional(),
        /** Replaces the whole trust line; `{sender}` is filled in. */
        trustLine: ltext(160),
      })
      .strict()
      .optional(),
    invitation: z
      .object({
        /** The small line above the names (default: "Harusi ya"). */
        eyebrow: ltext(60),
        /** The sentence that addresses the guest; `{guest}` is filled in. */
        greeting: ltext(200),
        /** The main message of the card. */
        body: ltext(1200),
        programme: z.array(programmeItemSchema).max(12).optional(),
        venueNote: ltext(400),
        dressNote: ltext(200),
        rsvpQuestion: ltext(120),
        rsvpYesLabel: ltext(40),
        rsvpNoLabel: ltext(40),
        closing: ltext(600),
        footerNote: ltext(300),
        // `pledge` is kept so saved content still validates, but an invitation never shows a contribution
        // request any more: contributions have their own card (ADR 043).
        show: showFlags(['map', 'dressCode', 'calendar', 'qr', 'rsvp', 'pledge'] as const),
      })
      .strict()
      .optional(),
    contribution: z
      .object({
        eyebrow: ltext(60),
        title: ltext(120),
        greeting: ltext(200),
        message: ltext(1200),
        /** Extra words about paying (for example "after paying, keep the confirmation message"). */
        payNote: ltext(400),
        /**
         * Where guests send their contribution: the hosts' own mobile-money numbers, till or bank
         * account. Guests pay the hosts directly; nothing passes through us (ADR 043).
         */
        payTo: z
          .array(
            z
              .object({
                /** e.g. "M-Pesa", "Lipa Namba", "CRDB". */
                label: text(40),
                /** The number, till or account to pay to. */
                account: text(40),
                /** Whose name the payment shows, so guests can check before they confirm. */
                name: text(80).optional(),
              })
              .strict(),
          )
          .max(4)
          .optional(),
        thanks: ltext(400),
        closing: ltext(600),
        /** Quick amounts offered on the pay page, whole currency units. */
        suggestedAmounts: z.array(z.number().int().min(1).max(100_000_000)).max(6).optional(),
        /** Last day to contribute, `YYYY-MM-DD`. */
        deadline: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        show: showFlags(['target', 'progress', 'eventDetails'] as const),
      })
      .strict()
      .optional(),
    messages: z
      .object({
        inviteSms: sms('inviteSms'),
        reminderSms: sms('reminderSms'),
        contributionSms: sms('contributionSms'),
        pledgeReminderSms: sms('pledgeReminderSms'),
      })
      .strict()
      .optional(),
  })
  .strict();

export type CardContent = z.infer<typeof cardContentSchema>;

/** Picks a text for `locale`: that language, else the other one, else nothing. Blank counts as unset. */
export function pick(
  value: { sw?: string; en?: string } | undefined,
  locale: Locale,
): string | undefined {
  const other: Locale = locale === 'sw' ? 'en' : 'sw';
  const v = value?.[locale]?.trim() || value?.[other]?.trim();
  return v || undefined;
}

/** What a toggle means when the organiser has not set it: sections are on, public totals are off. */
export function flag(
  show: Partial<Record<string, boolean | undefined>> | undefined,
  key: string,
  fallback = true,
): boolean {
  return show?.[key] ?? fallback;
}

/** The sender kind to use: what was chosen, else `committee` for events made before senders existed. */
export const senderKindOf = (c: CardContent | null | undefined): SenderKind =>
  c?.sender?.kind ?? 'committee';
