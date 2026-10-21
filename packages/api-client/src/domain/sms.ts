import { eventKindOf, hostNames, type Currency } from '@harusi/schemas';
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
  // "harusi ya" / "uchumba wa" / "wedding of": the little word agrees with the kind (ADR 040)
  const kindOf = eventKindOf(i.kind, i.locale).toLowerCase();
  const hosts = hostNames(i.partnerA, i.partnerB);
  return i.locale === 'sw'
    ? `Karibu kwenye ${kindOf} ${hosts}, ${i.dateText}. Kadi yako: ${i.shortLink} Namba: ${i.code}`
    : `You're invited to the ${kindOf} ${hosts}, ${i.dateText}. Your card: ${i.shortLink} Code: ${i.code}`;
}

export function buildReminderSms(i: InviteTextInput & { daysLeft: number }): string {
  const kindOf = eventKindOf(i.kind, i.locale).toLowerCase();
  const hosts = hostNames(i.partnerA, i.partnerB);
  return i.locale === 'sw'
    ? `Kumbukumbu: ${kindOf} ${hosts} ni baada ya siku ${i.daysLeft}. Kadi: ${i.shortLink} Namba: ${i.code}`
    : `Reminder: the ${kindOf} ${hosts} is in ${i.daysLeft} days. Card: ${i.shortLink} Code: ${i.code}`;
}

export interface ContributionTextInput {
  locale: 'sw' | 'en';
  partnerA: string;
  partnerB: string;
  kind?: string | null;
  /** Who is asking, for example "Familia ya Asha & Juma". */
  sender: string;
  shortLink: string;
}

/** What a send is for when estimating its cost or previewing its text (ADR 040). */
export interface SampleSmsInput {
  kind: 'invite' | 'reminder' | 'contribution';
  locale: 'sw' | 'en';
  partnerA: string;
  partnerB: string;
  eventKind?: string | null;
  /** Who is asking, for a contribution card. */
  sender: string;
  dateText: string;
  daysLeft?: number;
  shortLink?: string;
  code?: string;
}

/** A sample of the text a send uses, for the cost estimate and the preview. */
export function buildSampleSms(i: SampleSmsInput): string {
  const base = {
    locale: i.locale,
    partnerA: i.partnerA,
    partnerB: i.partnerB,
    kind: i.eventKind,
    shortLink: i.shortLink ?? 'hrs.example/s/KH-4826',
  };
  if (i.kind === 'contribution') return buildContributionSms({ ...base, sender: i.sender });
  const dated = { ...base, dateText: i.dateText, code: i.code ?? 'KH-4826' };
  return i.kind === 'reminder'
    ? buildReminderSms({ ...dated, daysLeft: i.daysLeft ?? 7 })
    : buildInviteSms(dated);
}

/** Default SMS for a contribution card (ADR 029): who asks, for which event, and the link to give. */
export function buildContributionSms(i: ContributionTextInput): string {
  const kindOf = eventKindOf(i.kind, i.locale).toLowerCase();
  const hosts = hostNames(i.partnerA, i.partnerB);
  return i.locale === 'sw'
    ? `${i.sender} wanakuomba mchango kwa ${kindOf} ${hosts}. Changia hapa: ${i.shortLink}`
    : `${i.sender} invite you to contribute to the ${kindOf} ${hosts}. Contribute here: ${i.shortLink}`;
}
