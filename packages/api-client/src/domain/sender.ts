import { defaultSender, hostNames, senderKindOf } from '@harusi/schemas';
import type { WeddingEvent } from '../types';

type SenderSource = Pick<
  WeddingEvent,
  'senderName' | 'cardContent' | 'eventKind' | 'coupleNames' | 'partnerA' | 'partnerB'
>;

/**
 * The "from" of a card or message in a given language, picked the way the API picks it (ADR 029): the
 * organiser's own name wins, otherwise the default wording for that language. An event's `senderName` is
 * the organiser's own text or, when they wrote none, the Swahili default, so that default is swapped for
 * the language asked for. A preview in English then reads "The Asha & Juma family invite you…" and never
 * "Familia ya Asha & Juma invite you…".
 */
export function senderNameFor(e: SenderSource, locale: 'sw' | 'en'): string {
  const own = e.cardContent?.sender?.name?.trim();
  if (own) return own;
  const kind = senderKindOf(e.cardContent);
  const hosts = hostNames(e.partnerA, e.partnerB);
  const swahiliDefaults = [
    defaultSender(e.eventKind, hosts, kind, 'sw'),
    defaultSender(e.eventKind, e.coupleNames, kind, 'sw'),
  ];
  const stored = e.senderName?.trim();
  return stored && !swahiliDefaults.includes(stored)
    ? stored
    : defaultSender(e.eventKind, hosts, kind, locale);
}
