import { renderTemplate } from '@harusi/schemas';

export type WhatsappTemplateKind = 'invite' | 'reminder' | 'contribution';

const DEFAULTS: Record<'sw' | 'en', Record<WhatsappTemplateKind, string>> = {
  sw: {
    invite: 'Habari {mgeni}! {wenyeji} wanakualika: {tarehe}, {ukumbi}. Fungua kadi yako: {kiungo}',
    reminder:
      'Kikumbusho kwa {mgeni}: Sherehe ya {wenyeji} inakaribia tarehe {tarehe} {ukumbi}. Kadi yako: {kiungo}',
    contribution: '{mtumaji} wanakuomba mchango kwa sherehe ya {wenyeji}. Changia hapa: {kiungo}',
  },
  en: {
    invite: 'Hello {guest}! {hosts} invite you: {date}, {venue}. Open your card: {link}',
    reminder:
      'Reminder for {guest}: {hosts} celebration is on {date} at {venue}. Your card: {link}',
    contribution: '{sender} kindly requests your contribution for {hosts}. Pledge here: {link}',
  },
};

/** The built-in WhatsApp message, used when the organiser has not saved their own. */
export function defaultWhatsappTemplate(locale: 'sw' | 'en', kind: WhatsappTemplateKind): string {
  return DEFAULTS[locale][kind];
}

const LINK = /\{\s*(link|kiungo)\s*\}|https?:\/\/\S+/i;

/**
 * The message minus its link. The card image has no clickable link (the WhatsApp caption carries it),
 * so the whole sentence that introduces the link ("Open your card: {link}") goes, not just the token.
 */
export function withoutLink(message: string): string {
  return message
    .split('\n')
    .map((line) =>
      line
        // A link usually ends its sentence even without a full stop ("Kadi: {kiungo} Karibu sana").
        .split(/(?<=[.!?]|\{\s*(?:link|kiungo)\s*\}|https?:\/\/\S+)\s+/i)
        .filter((sentence) => !LINK.test(sentence))
        .join(' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}

/**
 * Text for the image card's message line (Script and Botanical designs) when the organiser has not
 * written one: their WhatsApp message for this card kind, or the default, rendered without the link.
 */
export function cardMessageFromWhatsapp(
  savedTemplate: string | undefined,
  vars: Record<string, string | number | null | undefined>,
  { locale = 'sw', contribution = false }: { locale?: 'sw' | 'en'; contribution?: boolean } = {},
): string {
  const template =
    savedTemplate?.trim() ||
    defaultWhatsappTemplate(locale, contribution ? 'contribution' : 'invite');
  return withoutLink(renderTemplate(withoutLink(template), vars));
}
