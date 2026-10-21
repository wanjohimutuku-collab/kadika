/**
 * What hosts pay for (ADR 042): **generated cards**. A card is generated once per guest, the first time
 * it is sent (SMS or WhatsApp) or printed; sending or printing it again is free. Cards are priced per
 * piece, cheaper the more are bought at once, and every card comes with reminder credits that can be
 * spent on SMS or WhatsApp. **Credit packs** add reminder credits without buying cards. Staff set the
 * prices in /ops; the API and the console both read this file, so the rules cannot disagree. Prices are
 * whole units of the event's currency (§5).
 */
import { z } from 'zod';
import type { Currency } from './country';

export const BILLING_CHANNELS = ['sms', 'whatsapp'] as const;
export type BillingChannel = (typeof BILLING_CHANNELS)[number];

/** One price per currency an event can be in (ADR 025). */
export interface Price {
  TZS: number;
  KES: number;
}

/** What an event may use: cards it can generate and reminder credits (one per SMS or WhatsApp). */
export interface Allowance {
  cards: number;
  messages: number;
}

/** From `minCards` cards in one order, each card costs `price`. */
export interface CardTier {
  minCards: number;
  price: Price;
}

export interface CreditPack {
  key: string;
  messages: number;
  price: Price;
}

export interface PricingCatalog {
  /**
   * Off: usage is counted and shown, nothing is refused (how every event worked before ADR 042).
   * On: generating a card or sending a reminder past the event's allowance is refused.
   */
  enforced: boolean;
  /** What every event gets before buying anything, so a host can try it out. */
  free: Allowance;
  /** Reminder credits (SMS or WhatsApp) that come with each card bought. */
  messagesPerCard: number;
  /** Price per card by order size; the tier with the largest `minCards` not above the quantity applies. */
  cardTiers: CardTier[];
  packs: CreditPack[];
}

/** Message kinds that deliver the card itself: included with the card, never a reminder credit. */
export const CARD_DELIVERY_KINDS = ['invite', 'fallback', 'test'] as const;

/**
 * Starting prices (ADR 042), from the business: under 100 cards TZS 2,400 each, 100 to 499 TZS 2,200,
 * 500 and more TZS 1,950, each with 4 reminder credits. KES prices, the free allowance and the credit
 * packs are assumptions until confirmed (Kenya is not open yet).
 */
export const DEFAULT_PRICING: PricingCatalog = {
  enforced: false,
  free: { cards: 10, messages: 40 },
  messagesPerCard: 4,
  cardTiers: [
    { minCards: 1, price: { TZS: 2_400, KES: 120 } },
    { minCards: 100, price: { TZS: 2_200, KES: 110 } },
    { minCards: 500, price: { TZS: 1_950, KES: 100 } },
  ],
  packs: [
    { key: 'credits100', messages: 100, price: { TZS: 3_000, KES: 150 } },
    { key: 'credits500', messages: 500, price: { TZS: 14_000, KES: 700 } },
  ],
};

/** Most cards one order can buy. */
export const MAX_CARDS_PER_ORDER = 10_000;

const count = z.number().int().min(0).max(1_000_000);
const amount = z.number().int().min(0).max(100_000_000);
const key = z
  .string()
  .trim()
  .regex(/^[a-z0-9_-]{1,24}$/, 'Use 1–24 lowercase letters, digits, - or _');
const price = z.object({ TZS: amount, KES: amount });

export const pricingCatalogSchema = z
  .object({
    enforced: z.boolean(),
    free: z.object({ cards: count, messages: count }),
    messagesPerCard: z.number().int().min(0).max(100),
    cardTiers: z
      .array(z.object({ minCards: z.number().int().min(1).max(MAX_CARDS_PER_ORDER), price }))
      .min(1)
      .max(10),
    packs: z.array(z.object({ key, messages: count.min(1), price })).max(12),
  })
  .superRefine((c, ctx) => {
    const mins = c.cardTiers.map((t) => t.minCards);
    if (!mins.includes(1))
      ctx.addIssue({
        code: 'custom',
        path: ['cardTiers'],
        message: 'One tier must start at 1 card',
      });
    if (new Set(mins).size !== mins.length)
      ctx.addIssue({
        code: 'custom',
        path: ['cardTiers'],
        message: 'Two tiers start at the same number of cards',
      });
    const keys = c.packs.map((p) => p.key);
    keys.forEach((k, i) => {
      if (keys.indexOf(k) !== i)
        ctx.addIssue({
          code: 'custom',
          path: ['packs', i, 'key'],
          message: `Key "${k}" is used twice`,
        });
    });
  });

/** Tiers from the smallest order up. */
export const sortedTiers = (tiers: CardTier[]): CardTier[] =>
  [...tiers].sort((a, b) => a.minCards - b.minCards);

/** The price of one card when `quantity` are bought in one order. */
export function unitPrice(
  catalog: Pick<PricingCatalog, 'cardTiers'>,
  quantity: number,
  currency: Currency,
) {
  const tier = sortedTiers(catalog.cardTiers)
    .filter((t) => t.minCards <= Math.max(1, quantity))
    .at(-1);
  return (tier ?? sortedTiers(catalog.cardTiers)[0])?.price[currency] ?? 0;
}

export type OrderItem = { cards: number } | { packKey: string };

/** What an order adds and costs in an event's currency; null for an unknown pack or a bad quantity. */
export function quote(
  catalog: PricingCatalog,
  item: OrderItem,
  currency: Currency,
): {
  kind: 'cards' | 'pack';
  itemKey: string | null;
  label: string;
  adds: Allowance;
  unitPrice: number | null;
  amount: number;
} | null {
  if ('cards' in item) {
    const n = item.cards;
    if (!Number.isInteger(n) || n < 1 || n > MAX_CARDS_PER_ORDER) return null;
    const each = unitPrice(catalog, n, currency);
    return {
      kind: 'cards',
      itemKey: null,
      label: `Kadi ${n}`,
      adds: { cards: n, messages: n * catalog.messagesPerCard },
      unitPrice: each,
      amount: n * each,
    };
  }
  const p = catalog.packs.find((x) => x.key === item.packKey);
  if (!p) return null;
  return {
    kind: 'pack',
    itemKey: p.key,
    label: `Vikumbusho ${p.messages}`,
    adds: { cards: 0, messages: p.messages },
    unitPrice: null,
    amount: p.price[currency],
  };
}

export const addAllowance = (a: Allowance, b: Allowance): Allowance => ({
  cards: a.cards + b.cards,
  messages: a.messages + b.messages,
});

/** Never negative: an event that used more than it has (before enforcement was on) has 0 left. */
export const remainingOf = (allowance: Allowance, used: Allowance): Allowance => ({
  cards: Math.max(0, allowance.cards - used.cards),
  messages: Math.max(0, allowance.messages - used.messages),
});

export type PurchaseKind = 'cards' | 'pack' | 'grant';
export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
/** `mobile`: mobile-money push from the console. `manual`: paid another way, confirmed by staff. */
export type PurchaseMethod = 'mobile' | 'manual' | 'grant';

export interface PurchaseView {
  id: string;
  kind: PurchaseKind;
  itemKey: string | null;
  label: string;
  adds: Allowance;
  /** Price per card for a card order. */
  unitPrice: number | null;
  amount: number;
  currency: Currency;
  status: PurchaseStatus;
  method: PurchaseMethod;
  /** Reference for a mobile-money payment, to check its status. */
  reference: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
}

/** An event's billing page: what it has, what it used, and what it can buy (priced in its currency). */
export interface EventBillingView {
  enforced: boolean;
  currency: Currency;
  free: Allowance;
  allowance: Allowance;
  used: Allowance;
  remaining: Allowance;
  messagesPerCard: number;
  cardTiers: { minCards: number; price: number }[];
  packs: { key: string; messages: number; amount: number }[];
  /** Guests whose card has not been generated yet, to suggest how many to buy. */
  cardsToGenerate: number;
  purchases: PurchaseView[];
  /** Whether mobile-money payment can be started for this event's country right now. */
  mobilePayAvailable: boolean;
}

/** Details of the `payment_required` refusal (HTTP 402), so the console can offer the right item. */
export interface QuotaExceededDetails {
  reason: 'quota_exceeded';
  resource: 'cards' | 'messages';
  remaining: number;
  needed: number;
}

/** The catalogue as staff see it in /ops/billing. */
export interface PricingView {
  catalog: PricingCatalog;
  /** `default`: nothing saved yet, the defaults in this file apply. */
  source: 'database' | 'default';
  updatedAt: string | null;
  updatedBy: string | null;
}

/** An order in the staff queue; the phone is masked. */
export interface OpsPurchase extends PurchaseView {
  eventId: string;
  eventName: string;
  country: 'TZ' | 'KE';
  phone: string | null;
}

export interface OpsEventBilling {
  enforced: boolean;
  allowance: Allowance;
  used: Allowance;
  remaining: Allowance;
}

/** What the owner sends to order cards or a credit pack. `mobile` needs the phone and network. */
export interface BillingOrderInput {
  /** Number of cards to buy; or `packKey` for reminder credits. */
  cards?: number;
  packKey?: string;
  method: 'mobile' | 'manual';
  phoneE164?: string;
  mobileMethod?: 'mpesa' | 'mixx' | 'airtel' | 'halopesa';
}
