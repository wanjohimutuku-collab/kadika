import type { events, guests } from '@harusi/db';
import { buildContributionSms, buildInviteSms, buildReminderSms } from '@harusi/api-client';
import {
  defaultSender,
  eventKindLabel,
  eventKindOf,
  formatMoney,
  hostNames,
  toZoned,
  type CardContent,
} from '@harusi/schemas';
import { pick, renderTemplate, senderKindOf, type TemplateKey } from '@harusi/schemas/card-content';
import { formatPhone } from '@harusi/schemas/phone';

type EventRow = typeof events.$inferSelect;
type GuestRow = typeof guests.$inferSelect;
type Locale = 'sw' | 'en';

const MONTHS_SW = [
  'Jan',
  'Feb',
  'Machi',
  'Apr',
  'Mei',
  'Juni',
  'Julai',
  'Ago',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const contentOf = (e: Pick<EventRow, 'cardContent'>): CardContent =>
  (e.cardContent ?? {}) as CardContent;

/** The "from" of the cards and messages: the organiser's own name for the sender, else a default. */
export function senderOf(event: EventRow, locale: Locale): { name: string; phone: string } {
  const c = contentOf(event);
  const [a = '', b = ''] = event.coupleNames.split('&').map((x) => x.trim());
  const name =
    c.sender?.name?.trim() ||
    event.senderName?.trim() ||
    defaultSender(event.eventKind, hostNames(a, b), senderKindOf(c), locale);
  const phone = c.sender?.phone?.trim() || event.committeePhone || '';
  return { name, phone: phone ? formatPhone(phone, event.country) : '' };
}

/** `14 Des 2026` in the event's time zone (Swahili month names for Swahili). */
export function dateText(d: Date, locale: Locale, timeZone = 'Africa/Dar_es_Salaam'): string {
  const t = toZoned(d, timeZone);
  const months = locale === 'sw' ? MONTHS_SW : MONTHS_EN;
  return `${t.getUTCDate()} ${months[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}
const day = dateText;
const clock = (d: Date, tz: string) => {
  const t = toZoned(d, tz);
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
};

export interface MessageInput {
  event: EventRow;
  guest: GuestRow;
  link: string;
  daysLeft?: number;
  pledge?: { amount: number; balance: number };
}

/** Everything a message template may mention (see `TEMPLATE_VARS`). */
export function messageVars(i: MessageInput): Record<string, string> {
  const { event, guest } = i;
  const locale = guest.language;
  const [a = '', b = ''] = event.coupleNames.split('&').map((x) => x.trim());
  const sender = senderOf(event, locale);
  const deadline = contentOf(event).contribution?.deadline;
  return {
    guest: guest.displayName,
    hosts: hostNames(a, b),
    kind: eventKindLabel(event.eventKind, locale).toLowerCase(),
    date: day(event.dateStart, locale, event.timezone),
    time: clock(event.dateStart, event.timezone),
    venue: event.venueName ?? '',
    link: i.link,
    code: guest.shortCode,
    sender: sender.name,
    phone: sender.phone,
    days: i.daysLeft === undefined ? '' : String(i.daysLeft),
    target: event.contributionTarget ? formatMoney(event.contributionTarget, event.currency) : '',
    deadline: deadline ? day(new Date(`${deadline}T12:00:00Z`), locale, 'UTC') : '',
    pledged: i.pledge ? formatMoney(i.pledge.amount, event.currency) : '',
    balance: i.pledge ? formatMoney(i.pledge.balance, event.currency) : '',
  };
}

/** The organiser's template for this message and language, if they wrote one. */
function custom(event: EventRow, key: TemplateKey, locale: Locale): string | undefined {
  return pick(contentOf(event).messages?.[key], locale);
}

/**
 * The SMS text for one guest. An organiser's own template wins; otherwise the built-in wording. WhatsApp
 * uses Meta-approved templates, so custom text applies to SMS only (the editor says so).
 */
export function composeSms(
  type: 'invite' | 'reminder' | 'contribution' | 'pledge',
  i: MessageInput,
): string {
  const locale = i.guest.language;
  const key: Record<typeof type, TemplateKey> = {
    invite: 'inviteSms',
    reminder: 'reminderSms',
    contribution: 'contributionSms',
    pledge: 'pledgeReminderSms',
  };
  const own = custom(i.event, key[type], locale);
  const vars = messageVars(i);
  if (own) return renderTemplate(own, vars);
  const [a = '', b = ''] = i.event.coupleNames.split('&').map((x) => x.trim());
  const base = {
    locale,
    partnerA: a,
    partnerB: b,
    kind: i.event.eventKind,
    shortLink: i.link,
  };
  if (type === 'contribution') return buildContributionSms({ ...base, sender: vars.sender! });
  const dated = { ...base, dateText: vars.date!, code: i.guest.shortCode };
  if (type === 'invite') return buildInviteSms(dated);
  if (type === 'reminder') return buildReminderSms({ ...dated, daysLeft: i.daysLeft ?? 0 });
  // pledge reminder default
  const sw = locale === 'sw';
  return sw
    ? `Habari ${vars.guest}, mchango wa ${eventKindOf(i.event.eventKind, locale).toLowerCase()} ${vars.hosts}: ahadi ${vars.pledged}, salio ${vars.balance}. Lipa hapa: ${vars.link}`
    : `Hello ${vars.guest}, your contribution to the ${eventKindOf(i.event.eventKind, locale).toLowerCase()} ${vars.hosts}: pledged ${vars.pledged}, balance ${vars.balance}. Pay here: ${vars.link}`;
}
