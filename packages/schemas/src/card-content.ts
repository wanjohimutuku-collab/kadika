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

/**
 * The shareable-image designs (ADR 058). Each serves every occasion (wedding, send-off,
 * contribution…); the image never draws buttons, those live only on the digital card behind the link.
 * `script` and `botanical` also show the organiser's own title / message / footer text.
 * `custom` unlocks freeform drag-and-drop element positioning, custom fonts, imported images and backgrounds.
 */
export const CARD_TEMPLATES = [
  'classic',
  'modern',
  'script',
  'botanical',
  'floral-corner',
  'wildflower-arch',
  'mandala-arch',
  'marigold-garland',
  'custom',
] as const;
export type CardTemplate = (typeof CARD_TEMPLATES)[number];
export const cardTemplateSchema = z.enum(CARD_TEMPLATES);
export const cardTemplateOf = (
  c: { design?: { template?: string } } | null | undefined,
): CardTemplate =>
  (CARD_TEMPLATES as readonly string[]).includes(c?.design?.template ?? '')
    ? (c!.design!.template as CardTemplate)
    : 'classic';
/** Templates that print the organiser's custom `design` text. */
export const TEXT_TEMPLATES: readonly CardTemplate[] = [
  'script',
  'botanical',
  'floral-corner',
  'wildflower-arch',
  'mandala-arch',
  'marigold-garland',
  'custom',
];

const text = (max: number) => z.string().max(max);
/** A text in each language. Both optional; an empty string means "not set". */
const ltext = (max: number) =>
  z
    .object({ sw: text(max).optional(), en: text(max).optional() })
    .strict()
    .optional();

/**
 * Named placeholders every message variable has. Each entry carries a short label per language so the
 * editor can list them without hard-coding strings. New vars go here and in `TEMPLATE_VARS` below.
 */
export const TEMPLATE_VAR_META = {
  // Guest
  guest: { sw: 'Jina kamili la mgeni', en: 'Guest full name' },
  firstName: { sw: 'Jina la kwanza', en: 'First name' },
  lastName: { sw: 'Jina la ukoo', en: 'Last / family name' },
  group: { sw: 'Kikundi', en: 'Group' },
  code: { sw: 'Namba ya kadi', en: 'Card number' },
  // Hosts
  title: { sw: 'Jina la tukio', en: 'Event title' },
  hosts: { sw: 'Majina ya wenyeji', en: 'Host names' },
  hostA: { sw: 'Mwenyeji wa kwanza', en: 'First host' },
  hostB: { sw: 'Mwenyeji wa pili', en: 'Second host' },
  kind: { sw: 'Aina ya tukio', en: 'Event kind' },
  // When / where
  date: { sw: 'Tarehe', en: 'Date' },
  time: { sw: 'Muda', en: 'Time' },
  venue: { sw: 'Ukumbi', en: 'Venue' },
  mapUrl: { sw: 'Kiungo cha ramani', en: 'Map link' },
  dress: { sw: 'Mavazi', en: 'Dress code' },
  // Call to action
  link: { sw: 'Kiungo cha kadi', en: 'Card link' },
  // Sender
  sender: { sw: 'Mtumaji', en: 'Sender' },
  phone: { sw: 'Simu ya kamati', en: 'Committee phone' },
  // Reminders / contributions
  days: { sw: 'Siku zilizobaki', en: 'Days left' },
  target: { sw: 'Lengo la mchango', en: 'Contribution target' },
  deadline: { sw: 'Tarehe ya mwisho', en: 'Contribution deadline' },
  pledged: { sw: 'Ahadi', en: 'Pledged amount' },
  balance: { sw: 'Salio', en: 'Balance' },
} as const;
export type TemplateVar = keyof typeof TEMPLATE_VAR_META;

/**
 * Swahili and common synonyms mapped to canonical placeholder names.
 * Allows organisers to write e.g. `{mgeni}` or `{guest}`, `{kiungo}` or `{link}`,
 * `{tarehe}` or `{date}`, `{ukumbi}` or `{venue}`, `{kadi}` or `{code}`.
 */
export const VAR_ALIASES: Record<string, TemplateVar> = {
  mgeni: 'guest',
  jina: 'firstName',
  ukoo: 'lastName',
  kikundi: 'group',
  kadi: 'code',
  namba_ya_kadi: 'code',
  tukio: 'title',
  wenyeji: 'hosts',
  tarehe: 'date',
  muda: 'time',
  saa: 'time',
  ukumbi: 'venue',
  ramani: 'mapUrl',
  mavazi: 'dress',
  kiungo: 'link',
  linki: 'link',
  mtumaji: 'sender',
  simu: 'phone',
  siku: 'days',
  lengo: 'target',
  tarehe_mwisho: 'deadline',
  ahadi: 'pledged',
  salio: 'balance',
};

/** Placeholders a message template may use, per template. Anything else is rejected. */
export const TEMPLATE_VARS = {
  inviteSms: [
    'guest',
    'firstName',
    'lastName',
    'hosts',
    'hostA',
    'hostB',
    'kind',
    'date',
    'time',
    'venue',
    'mapUrl',
    'dress',
    'link',
    'code',
    'sender',
    'phone',
  ],
  reminderSms: [
    'guest',
    'firstName',
    'lastName',
    'hosts',
    'hostA',
    'hostB',
    'kind',
    'date',
    'time',
    'venue',
    'mapUrl',
    'dress',
    'link',
    'code',
    'sender',
    'phone',
    'days',
  ],
  contributionSms: [
    'guest',
    'firstName',
    'lastName',
    'hosts',
    'hostA',
    'hostB',
    'kind',
    'link',
    'sender',
    'phone',
    'target',
    'deadline',
  ],
  pledgeReminderSms: [
    'guest',
    'firstName',
    'lastName',
    'hosts',
    'hostA',
    'hostB',
    'kind',
    'link',
    'sender',
    'phone',
    'pledged',
    'balance',
  ],
  inviteWhatsapp: [
    'guest',
    'firstName',
    'lastName',
    'hosts',
    'hostA',
    'hostB',
    'kind',
    'date',
    'time',
    'venue',
    'mapUrl',
    'dress',
    'link',
    'code',
    'sender',
    'phone',
  ],
  reminderWhatsapp: [
    'guest',
    'firstName',
    'lastName',
    'hosts',
    'hostA',
    'hostB',
    'kind',
    'date',
    'time',
    'venue',
    'mapUrl',
    'dress',
    'link',
    'code',
    'sender',
    'phone',
    'days',
  ],
  contributionWhatsapp: [
    'guest',
    'firstName',
    'lastName',
    'hosts',
    'hostA',
    'hostB',
    'kind',
    'link',
    'sender',
    'phone',
    'target',
    'deadline',
  ],
} as const satisfies Record<string, readonly TemplateVar[]>;
export type TemplateKey = keyof typeof TEMPLATE_VARS;

const PLACEHOLDER = /\{(\w+)\}/g;

export function templatePlaceholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1]!);
}

/** Why a template is not acceptable, or `null` when it is fine (used by the schema and the editor). */
export function templateProblem(key: TemplateKey, template: string): string | null {
  const allowed: readonly string[] = TEMPLATE_VARS[key];
  const used = templatePlaceholders(template).map((p) => VAR_ALIASES[p] ?? (p as TemplateVar));
  const unknown = used.find((p) => !allowed.includes(p));
  if (unknown) return `content.placeholder_unknown:${unknown}`;
  // Without the link a guest has no way to open the card or pay.
  if (template.trim() && !used.includes('link')) return 'content.link_required';
  return null;
}

/** `"Asha Juma"` → `{ firstName: "Asha", lastName: "Juma" }`. A one-word name has no last name. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

/** Fills `{name}` placeholders. Missing values become empty text; extra spaces from them are tidied. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template
    .replace(PLACEHOLDER, (_, rawKey: string) => {
      const canonical = VAR_ALIASES[rawKey] ?? (rawKey as TemplateVar);
      const val = vars[canonical] ?? vars[rawKey];
      return val !== undefined && val !== null ? String(val) : '';
    })
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

export const CARD_FONTS = [
  'playfair',
  'script',
  'dmsans',
  'cinzel',
  'cormorant',
  'greatvibes',
  'montserrat',
  'mono',
] as const;
export type CardFont = (typeof CARD_FONTS)[number];
export const cardFontSchema = z.enum(CARD_FONTS);

export const CUSTOM_ELEMENT_TYPES = [
  'eyebrow',
  'names',
  'title',
  'message',
  'date',
  'venue',
  'dress',
  'guest',
  'qr',
  'sender',
  'footer',
  'freeText',
  'image',
  'divider',
] as const;
export type CustomElementType = (typeof CUSTOM_ELEMENT_TYPES)[number];
export const customElementTypeSchema = z.enum(CUSTOM_ELEMENT_TYPES);

export const customElementSchema = z
  .object({
    id: z.string().max(60),
    type: customElementTypeSchema,
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().min(2).max(100).optional(),
    height: z.number().min(1).max(100).optional(),
    fontFamily: cardFontSchema.optional(),
    fontSize: z.number().min(6).max(120).optional(),
    fontWeight: z.enum(['normal', 'medium', 'bold', 'black']).optional(),
    fontStyle: z.enum(['normal', 'italic']).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    color: z.string().max(50).optional(),
    letterSpacing: z.number().min(-4).max(20).optional(),
    textTransform: z.enum(['none', 'uppercase', 'capitalize', 'lowercase']).optional(),
    content: ltext(600),
    imageUrl: z.string().max(2_000_000).optional(),
    imageAlt: z.string().max(100).optional(),
    borderRadius: z.number().min(0).max(100).optional(),
    opacity: z.number().min(0).max(100).optional(),
    visible: z.boolean().optional(),
    zIndex: z.number().int().min(0).max(100).optional(),
  })
  .strict();
export type CustomElement = z.infer<typeof customElementSchema>;

export const customCardBackgroundSchema = z
  .object({
    type: z.enum(['color', 'gradient', 'image']).optional().default('color'),
    color: z.string().max(50).optional(),
    gradient: z.string().max(400).optional(),
    imageUrl: z.string().max(2_000_000).optional(),
    overlayOpacity: z.number().min(0).max(100).optional(),
  })
  .strict();
export type CustomCardBackground = z.infer<typeof customCardBackgroundSchema>;

export const customCardFrameSchema = z
  .object({
    show: z.boolean().optional().default(true),
    style: z.enum(['single', 'double', 'dashed', 'none']).optional().default('double'),
    color: z.string().max(50).optional(),
    width: z.number().min(1).max(10).optional(),
    inset: z.number().min(0).max(60).optional(),
  })
  .strict();
export type CustomCardFrame = z.infer<typeof customCardFrameSchema>;

export const customCardDesignSchema = z
  .object({
    background: customCardBackgroundSchema.optional(),
    frame: customCardFrameSchema.optional(),
    elements: z.array(customElementSchema).max(40).optional(),
    textColor: z.string().max(50).optional(),
    accentColor: z.string().max(50).optional(),
  })
  .strict();
export type CustomCardDesign = z.infer<typeof customCardDesignSchema>;

/** Returns default initial draggable elements for the custom card studio. */
export function defaultCustomElements(): CustomElement[] {
  return [
    {
      id: 'el-eyebrow',
      type: 'eyebrow',
      x: 50,
      y: 9,
      fontFamily: 'playfair',
      fontSize: 13,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      letterSpacing: 4,
      textTransform: 'uppercase',
      visible: true,
      zIndex: 1,
    },
    {
      id: 'el-names',
      type: 'names',
      x: 50,
      y: 18,
      fontFamily: 'playfair',
      fontSize: 36,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      visible: true,
      zIndex: 2,
    },
    {
      id: 'el-divider',
      type: 'divider',
      x: 50,
      y: 27,
      visible: true,
      zIndex: 3,
    },
    {
      id: 'el-title',
      type: 'title',
      x: 50,
      y: 31,
      fontFamily: 'playfair',
      fontSize: 14,
      fontWeight: 'normal',
      fontStyle: 'italic',
      textAlign: 'center',
      visible: true,
      zIndex: 4,
    },
    {
      id: 'el-guest',
      type: 'guest',
      x: 50,
      y: 39,
      fontFamily: 'dmsans',
      fontSize: 14,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      visible: true,
      zIndex: 5,
    },
    {
      id: 'el-message',
      type: 'message',
      x: 50,
      y: 47,
      fontFamily: 'dmsans',
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      visible: true,
      zIndex: 6,
    },
    {
      id: 'el-date',
      type: 'date',
      x: 50,
      y: 57,
      fontFamily: 'playfair',
      fontSize: 15,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      visible: true,
      zIndex: 7,
    },
    {
      id: 'el-venue',
      type: 'venue',
      x: 50,
      y: 64,
      fontFamily: 'dmsans',
      fontSize: 13,
      fontWeight: 'medium',
      fontStyle: 'normal',
      textAlign: 'center',
      visible: true,
      zIndex: 8,
    },
    {
      id: 'el-dress',
      type: 'dress',
      x: 50,
      y: 70,
      fontFamily: 'dmsans',
      fontSize: 11,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      visible: true,
      zIndex: 9,
    },
    {
      id: 'el-qr',
      type: 'qr',
      x: 50,
      y: 80,
      visible: true,
      zIndex: 10,
    },
    {
      id: 'el-sender',
      type: 'sender',
      x: 50,
      y: 93,
      fontFamily: 'dmsans',
      fontSize: 11,
      fontWeight: 'medium',
      fontStyle: 'normal',
      textAlign: 'center',
      visible: true,
      zIndex: 11,
    },
  ];
}

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
        inviteWhatsapp: sms('inviteWhatsapp'),
        reminderWhatsapp: sms('reminderWhatsapp'),
        contributionWhatsapp: sms('contributionWhatsapp'),
      })
      .strict()
      .optional(),
    /** Which card-image design guests receive; absent means `classic`. */
    design: z
      .object({
        template: cardTemplateSchema.optional(),
        /** e.g. "Wanakualika kushiriki sherehe ya harusi yao"; `{guest}`, `{hosts}` filled in. */
        title: ltext(120),
        /** Longer text (several lines allowed), e.g. contacts or a note. */
        message: ltext(400),
        /** Small closing line, e.g. "Chakula cha jioni kitafuata". */
        footer: ltext(120),
        /** Show the guest's QR on the image (default true). */
        showQr: z.boolean().optional(),
        /** Drag-and-drop customization: custom background, frame, elements & fonts. */
        custom: customCardDesignSchema.optional(),
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
