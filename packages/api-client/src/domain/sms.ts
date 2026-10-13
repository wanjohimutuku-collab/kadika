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

/** Default SMS price per segment in TZS (assumption until a gateway is chosen — §15.3, ADR 007). */
export const SMS_PRICE_PER_SEGMENT_TZS = 25;

export function estimateSmsCost(
  text: string,
  recipients: number,
  pricePerSegment = SMS_PRICE_PER_SEGMENT_TZS,
) {
  const seg = smsSegments(text);
  return { ...seg, recipients, costTzs: seg.segments * recipients * pricePerSegment };
}

export interface InviteTextInput {
  locale: 'sw' | 'en';
  partnerA: string;
  partnerB: string;
  dateText: string;
  shortLink: string;
  code: string;
}

/** §7.2 SMS template (≤ 160 chars when names are of normal length). */
export function buildInviteSms(i: InviteTextInput): string {
  return i.locale === 'sw'
    ? `Karibu kwenye harusi ya ${i.partnerA} & ${i.partnerB}, ${i.dateText}. Kadi yako: ${i.shortLink} Namba: ${i.code}`
    : `You're invited to the wedding of ${i.partnerA} & ${i.partnerB}, ${i.dateText}. Your card: ${i.shortLink} Code: ${i.code}`;
}

export function buildReminderSms(i: InviteTextInput & { daysLeft: number }): string {
  return i.locale === 'sw'
    ? `Kumbukumbu: harusi ya ${i.partnerA} & ${i.partnerB} ni baada ya siku ${i.daysLeft}. Kadi: ${i.shortLink} Namba: ${i.code}`
    : `Reminder: ${i.partnerA} & ${i.partnerB}'s wedding is in ${i.daysLeft} days. Card: ${i.shortLink} Code: ${i.code}`;
}
