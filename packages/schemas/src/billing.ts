/**
 * What hosts pay for (ADR 042): cards, SMS and WhatsApp messages. A **bundle** is priced by the number
 * of cards and includes some messages; **message packs** top up SMS or WhatsApp when the bundle's run
 * out. Staff set the prices in /ops; the API and the console both read this file, so the rules cannot
 * disagree. Prices are whole units of the event's currency (§5).
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

/** What an event may use: cards on its guest list and messages sent. */
export interface Allowance {
  cards: number;
  sms: number;
  whatsapp: number;
}

export interface CardBundle {
  key: string;
  name: string;
  /** Cards (guests on the list) the bundle adds. */
  cards: number;
  /** Messages included with the cards. */
  sms: number;
  whatsapp: number;
  price: Price;
}

export interface MessagePack {
  key: string;
  channel: BillingChannel;
  messages: number;
  price: Price;
}

export interface PricingCatalog {
  /**
   * Off: usage is counted and shown, nothing is refused (how every event worked before ADR 042).
   * On: adding a card or sending a message past the event's allowance is refused.
   */
  enforced: boolean;
  /** What every event gets before buying anything, so a host can try it out. */
  free: Allowance;
  bundles: CardBundle[];
  packs: MessagePack[];
}

/**
 * Starting prices. Assumptions until the business confirms them (ADR 042): message packs sit above the
 * SMS gateway's TZS 25 / KES 1 per segment (ADR 026) and WhatsApp's per-conversation fee.
 */
export const DEFAULT_PRICING: PricingCatalog = {
  enforced: false,
  free: { cards: 10, sms: 10, whatsapp: 20 },
  bundles: [
    {
      key: 'b100',
      name: 'Kadi 100',
      cards: 100,
      sms: 100,
      whatsapp: 200,
      price: { TZS: 30_000, KES: 1_500 },
    },
    {
      key: 'b250',
      name: 'Kadi 250',
      cards: 250,
      sms: 250,
      whatsapp: 500,
      price: { TZS: 65_000, KES: 3_200 },
    },
    {
      key: 'b500',
      name: 'Kadi 500',
      cards: 500,
      sms: 500,
      whatsapp: 1_000,
      price: { TZS: 120_000, KES: 6_000 },
    },
    {
      key: 'b1000',
      name: 'Kadi 1,000',
      cards: 1_000,
      sms: 1_000,
      whatsapp: 2_000,
      price: { TZS: 220_000, KES: 11_000 },
    },
  ],
  packs: [
    { key: 'sms100', channel: 'sms', messages: 100, price: { TZS: 3_000, KES: 150 } },
    { key: 'sms500', channel: 'sms', messages: 500, price: { TZS: 14_000, KES: 700 } },
    { key: 'wa100', channel: 'whatsapp', messages: 100, price: { TZS: 2_000, KES: 100 } },
    { key: 'wa500', channel: 'whatsapp', messages: 500, price: { TZS: 9_000, KES: 450 } },
  ],
};

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
    free: z.object({ cards: count, sms: count, whatsapp: count }),
    bundles: z
      .array(
        z.object({
          key,
          name: z.string().trim().min(1).max(40),
          cards: count.min(1),
          sms: count,
          whatsapp: count,
          price,
        }),
      )
      .max(12),
    packs: z
      .array(
        z.object({
          key,
          channel: z.enum(BILLING_CHANNELS),
          messages: count.min(1),
          price,
        }),
      )
      .max(12),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    for (const [list, items] of [
      ['bundles', c.bundles],
      ['packs', c.packs],
    ] as const)
      items.forEach((item, i) => {
        if (seen.has(item.key))
          ctx.addIssue({
            code: 'custom',
            path: [list, i, 'key'],
            message: `Key "${item.key}" is used twice`,
          });
        seen.add(item.key);
      });
  });

export type PurchaseKind = 'bundle' | 'pack' | 'grant';
export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
/** `mobile`: mobile-money push from the console. `manual`: paid another way, confirmed by staff. */
export type PurchaseMethod = 'mobile' | 'manual' | 'grant';

/** What one catalogue item adds, priced for an event's currency; null for an unknown key. */
export function quoteItem(
  catalog: PricingCatalog,
  itemKey: string,
  currency: Currency,
): {
  kind: 'bundle' | 'pack';
  key: string;
  label: string;
  adds: Allowance;
  amount: number;
} | null {
  const b = catalog.bundles.find((x) => x.key === itemKey);
  if (b)
    return {
      kind: 'bundle',
      key: b.key,
      label: b.name,
      adds: { cards: b.cards, sms: b.sms, whatsapp: b.whatsapp },
      amount: b.price[currency],
    };
  const p = catalog.packs.find((x) => x.key === itemKey);
  if (p)
    return {
      kind: 'pack',
      key: p.key,
      label: `${p.channel === 'sms' ? 'SMS' : 'WhatsApp'} ${p.messages}`,
      adds: {
        cards: 0,
        sms: p.channel === 'sms' ? p.messages : 0,
        whatsapp: p.channel === 'whatsapp' ? p.messages : 0,
      },
      amount: p.price[currency],
    };
  return null;
}

export const addAllowance = (a: Allowance, b: Allowance): Allowance => ({
  cards: a.cards + b.cards,
  sms: a.sms + b.sms,
  whatsapp: a.whatsapp + b.whatsapp,
});

/** Never negative: an event that used more than it has (before enforcement was on) has 0 left. */
export const remainingOf = (allowance: Allowance, used: Allowance): Allowance => ({
  cards: Math.max(0, allowance.cards - used.cards),
  sms: Math.max(0, allowance.sms - used.sms),
  whatsapp: Math.max(0, allowance.whatsapp - used.whatsapp),
});

/** The smallest bundle that covers `cardsNeeded` more cards, or the biggest one when none does. */
export function suggestBundle<B extends { cards: number }>(
  catalog: { bundles: B[] },
  cardsNeeded: number,
): B | null {
  const sorted = [...catalog.bundles].sort((a, b) => a.cards - b.cards);
  return sorted.find((b) => b.cards >= cardsNeeded) ?? sorted.at(-1) ?? null;
}

export interface PurchaseView {
  id: string;
  kind: PurchaseKind;
  itemKey: string | null;
  label: string;
  adds: Allowance;
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
  bundles: (Omit<CardBundle, 'price'> & { amount: number })[];
  packs: (Omit<MessagePack, 'price'> & { amount: number })[];
  purchases: PurchaseView[];
  /** Whether mobile-money payment can be started for this event's country right now. */
  mobilePayAvailable: boolean;
}

/** Details of the `payment_required` refusal (HTTP 402), so the console can offer the right item. */
export interface QuotaExceededDetails {
  reason: 'quota_exceeded';
  resource: 'cards' | BillingChannel;
  remaining: number;
  needed: number;
}

/** The catalogue as staff see it in /ops/settings/pricing. */
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

/** What the owner sends to order an item. `mobile` needs the phone and network. */
export interface BillingOrderInput {
  itemKey: string;
  method: 'mobile' | 'manual';
  phoneE164?: string;
  mobileMethod?: 'mpesa' | 'mixx' | 'airtel' | 'halopesa';
}
