import { eventKindLabel, hostNames, type Currency } from '@harusi/schemas';
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

/** Default SMS price per segment in TZS (Tanzanian SMS only until Kenya pricing exists) (assumption until a gateway is chosen — §15.3, ADR 007). */
export const SMS_PRICE_PER_SEGMENT_TZS = 25;

/**
 * SMS price per segment by currency (ADR 026). Assumptions until gateway contracts exist: TZS 25 for
 * Tanzania; KES 1 for Kenya (listed rates are under a shilling, rounded up to a whole shilling because
 * amounts are whole currency units). Confirm both with the providers before showing prices to hosts.
 */
export const SMS_PRICE_PER_SEGMENT: Record<Currency, number> = { TZS: 25, KES: 1 };

/** Estimated cost of sending `text` to `recipients` people, priced in the event's currency. */
export function estimateSmsCostFor(text: string, recipients: number, currency: Currency) {
  return estimateSmsCost(text, recipients, SMS_PRICE_PER_SEGMENT[currency]);
}

export function estimateSmsCost(
  text: string,
  recipients: number,
  pricePerSegment = SMS_PRICE_PER_SEGMENT_TZS,
) {
  const seg = smsSegments(text);
  return { ...seg, recipients, cost: seg.segments * recipients * pricePerSegment };
}

export interface InviteTextInput {
  locale: 'sw' | 'en';
  partnerA: string;
  partnerB: string;
  /** Free-text kind of event; defaults to wedding. */
  kind?: string | null;
  dateText: string;
  shortLink: string;
  code: string;
}

/** §7.2 SMS template (≤ 160 chars when names are of normal length). */
export function buildInviteSms(i: InviteTextInput): string {
  const kind = eventKindLabel(i.kind, i.locale).toLowerCase();
  const hosts = hostNames(i.partnerA, i.partnerB);
  return i.locale === 'sw'
    ? `Karibu kwenye ${kind} ya ${hosts}, ${i.dateText}. Kadi yako: ${i.shortLink} Namba: ${i.code}`
    : `You're invited to the ${kind} of ${hosts}, ${i.dateText}. Your card: ${i.shortLink} Code: ${i.code}`;
}

export function buildReminderSms(i: InviteTextInput & { daysLeft: number }): string {
  const kind = eventKindLabel(i.kind, i.locale).toLowerCase();
  const hosts = hostNames(i.partnerA, i.partnerB);
  return i.locale === 'sw'
    ? `Kumbukumbu: ${kind} ya ${hosts} ni baada ya siku ${i.daysLeft}. Kadi: ${i.shortLink} Namba: ${i.code}`
    : `Reminder: the ${kind} of ${hosts} is in ${i.daysLeft} days. Card: ${i.shortLink} Code: ${i.code}`;
}
