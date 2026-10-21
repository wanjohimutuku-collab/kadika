import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import {
  eventPurchases,
  events,
  guests,
  messageLog,
  newId,
  pricingSettings,
  users,
} from '@harusi/db';
import {
  DEFAULT_PRICING,
  addAllowance,
  pricingCatalogSchema,
  quoteItem,
  remainingOf,
  type Allowance,
  type BillingChannel,
  type EventBillingView,
  type PricingCatalog,
  type PurchaseView,
  type QuotaExceededDetails,
} from '@harusi/schemas/billing';
import { allowedCountries, paymentMethodsFor } from '@harusi/schemas/country';
import { maskPhone, normalizePhone } from '@harusi/schemas/phone';
import type { PaymentProvider, PaymentWebhookEvent } from '@harusi/payments';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { allPaymentProviders, paymentsFor } from '../payment-routing';
import { recordAudit } from './audit';
import type { EventService } from './events';
import { requireStaff, type StaffCaller } from './staff-guard';
import type { MOBILE_METHODS } from './pledges';

type Db = Deps['db'];
type Purchase = typeof eventPurchases.$inferSelect;

const SETTINGS_ID = 'default';
const PAY_TIMEOUT_MS = 60_000;
const REF_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const NONE: Allowance = { cards: 0, sms: 0, whatsapp: 0 };

/** Messages an event may still send in one run; refunded when an attempt fails (ADR 042). */
export interface MessageBudget {
  take(channel: BillingChannel): boolean;
  refund(channel: BillingChannel): void;
}

const UNLIMITED: MessageBudget = { take: () => true, refund: () => {} };

/** The 402 refusal the console turns into "buy more" (ADR 042). */
export function quotaExceeded(
  resource: QuotaExceededDetails['resource'],
  remaining: number,
  needed: number,
) {
  const details: QuotaExceededDetails = { reason: 'quota_exceeded', resource, remaining, needed };
  return new ApiError(
    'payment_required',
    resource === 'cards' ? 'Card allowance used up' : `${resource} allowance used up`,
    { ...details },
  );
}

/**
 * Charging for cards, SMS and WhatsApp (ADR 042). An event's allowance is the free allowance plus every
 * paid purchase; its usage is the cards on its guest list and the messages that went out (failed ones
 * are not counted). With the catalogue's `enforced` switch off nothing is refused.
 */
export class BillingService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private get db(): Db {
    return this.deps.db;
  }

  // ---------------------------------------------------------------- catalogue

  async catalog(): Promise<PricingCatalog> {
    const [row] = await this.db
      .select()
      .from(pricingSettings)
      .where(eq(pricingSettings.id, SETTINGS_ID));
    if (!row) return DEFAULT_PRICING;
    const parsed = pricingCatalogSchema.safeParse(row.catalog);
    // A row that no longer fits the schema (a hand edit) falls back rather than breaking every send.
    return parsed.success ? parsed.data : DEFAULT_PRICING;
  }

  /** The prices, public (the /bei page). Nothing in the catalogue is secret. */
  async publicCatalog(): Promise<PricingCatalog> {
    return this.catalog();
  }

  /** What customers paid us in the last `days`, per currency, and orders waiting for staff. */
  async revenue(since: Date) {
    const paid = await this.db
      .select({
        currency: eventPurchases.currency,
        amount: sql<number>`coalesce(sum(${eventPurchases.amount}), 0)::int`,
        orders: sql<number>`count(*)::int`,
      })
      .from(eventPurchases)
      .where(
        and(
          eq(eventPurchases.status, 'paid'),
          ne(eventPurchases.kind, 'grant'),
          sql`${eventPurchases.paidAt} >= ${since}`,
        ),
      )
      .groupBy(eventPurchases.currency);
    const [pending] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(eventPurchases)
      .where(and(eq(eventPurchases.status, 'pending'), eq(eventPurchases.method, 'manual')));
    return { paid, pendingManual: pending?.n ?? 0 };
  }

  async opsCatalog(caller: StaffCaller) {
    await requireStaff(this.db, caller, 'read');
    return this.catalogView();
  }

  private async catalogView() {
    const [row] = await this.db
      .select({ s: pricingSettings, name: users.name })
      .from(pricingSettings)
      .leftJoin(users, eq(users.id, pricingSettings.updatedBy))
      .where(eq(pricingSettings.id, SETTINGS_ID));
    return {
      catalog: await this.catalog(),
      source: row ? ('database' as const) : ('default' as const),
      updatedAt: row?.s.updatedAt.toISOString() ?? null,
      updatedBy: row?.name ?? null,
    };
  }

  async saveCatalog(caller: StaffCaller, input: unknown) {
    const staff = await requireStaff(this.db, caller, 'plan');
    const r = pricingCatalogSchema.safeParse(input);
    if (!r.success)
      throw new ApiError('validation', 'Invalid prices', {
        issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    const before = await this.catalog();
    await this.db
      .insert(pricingSettings)
      .values({ id: SETTINGS_ID, catalog: { ...r.data }, updatedBy: staff.id })
      .onConflictDoUpdate({
        target: pricingSettings.id,
        set: { catalog: { ...r.data }, updatedBy: staff.id, updatedAt: this.deps.now() },
      });
    await recordAudit(this.db, {
      eventId: null,
      actorId: staff.id,
      action: 'ops.pricing',
      entity: 'pricing',
      entityId: SETTINGS_ID,
      diff: {
        target: 'Bei',
        details: r.data.enforced ? 'Malipo yanatekelezwa' : 'Malipo hayatekelezwi',
        enforced: { from: before.enforced, to: r.data.enforced },
      },
    });
    return this.catalogView();
  }

  // ---------------------------------------------------------------- allowance and usage

  async usage(eventId: string): Promise<Allowance> {
    const [cards] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(guests)
      .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
    const msgs = await this.db
      .select({ channel: messageLog.channel, n: sql<number>`count(*)::int` })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .where(
        and(
          eq(guests.eventId, eventId),
          inArray(messageLog.channel, ['sms', 'whatsapp']),
          ne(messageLog.status, 'failed'),
        ),
      )
      .groupBy(messageLog.channel);
    return {
      cards: cards?.n ?? 0,
      sms: msgs.find((m) => m.channel === 'sms')?.n ?? 0,
      whatsapp: msgs.find((m) => m.channel === 'whatsapp')?.n ?? 0,
    };
  }

  async allowance(eventId: string, catalog?: PricingCatalog): Promise<Allowance> {
    const c = catalog ?? (await this.catalog());
    const [bought] = await this.db
      .select({
        cards: sql<number>`coalesce(sum(${eventPurchases.cards}), 0)::int`,
        sms: sql<number>`coalesce(sum(${eventPurchases.sms}), 0)::int`,
        whatsapp: sql<number>`coalesce(sum(${eventPurchases.whatsapp}), 0)::int`,
      })
      .from(eventPurchases)
      .where(and(eq(eventPurchases.eventId, eventId), eq(eventPurchases.status, 'paid')));
    return addAllowance(c.free, bought ?? NONE);
  }

  /** What is left, or null when nothing is enforced (no limit). */
  private async remaining(eventId: string): Promise<Allowance | null> {
    const c = await this.catalog();
    if (!c.enforced) return null;
    return remainingOf(await this.allowance(eventId, c), await this.usage(eventId));
  }

  /** Refuses (402) adding `n` more cards past the allowance. */
  async assertCanAddCards(eventId: string, n = 1): Promise<void> {
    const left = await this.remaining(eventId);
    if (left && left.cards < n) throw quotaExceeded('cards', left.cards, n);
  }

  /** Refuses (402) a send whose first-choice channels need more messages than are left. */
  async assertCanSend(eventId: string, needs: { sms: number; whatsapp: number }): Promise<void> {
    const left = await this.remaining(eventId);
    if (!left) return;
    if (needs.whatsapp > left.whatsapp)
      throw quotaExceeded('whatsapp', left.whatsapp, needs.whatsapp);
    if (needs.sms > left.sms) throw quotaExceeded('sms', left.sms, needs.sms);
  }

  /** A counter for one run of sends, so a 500-guest send does not recount per message. */
  async budget(eventId: string): Promise<MessageBudget> {
    const left = await this.remaining(eventId);
    if (!left) return UNLIMITED;
    const n = { sms: left.sms, whatsapp: left.whatsapp };
    return {
      take: (ch) => (n[ch] > 0 ? (n[ch]--, true) : false),
      refund: (ch) => void n[ch]++,
    };
  }

  // ---------------------------------------------------------------- the host's billing page

  private async ownerOnly(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role !== 'owner') throw new ApiError('forbidden', 'Only the owner manages billing');
  }

  private view(p: Purchase): PurchaseView {
    return {
      id: p.id,
      kind: p.kind,
      itemKey: p.itemKey,
      label: p.label,
      adds: { cards: p.cards, sms: p.sms, whatsapp: p.whatsapp },
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.method,
      reference: p.providerRef,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    };
  }

  /** Owner and committee can see the allowance (the send page warns them); only the owner buys. */
  async eventBilling(eventId: string, userId: string): Promise<EventBillingView> {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents have no billing access');
    const [event] = await this.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const catalog = await this.catalog();
    const allowance = await this.allowance(eventId, catalog);
    const used = await this.usage(eventId);
    const rows = await this.db
      .select()
      .from(eventPurchases)
      .where(eq(eventPurchases.eventId, eventId))
      .orderBy(desc(eventPurchases.createdAt));
    const cur = event.currency;
    return {
      enforced: catalog.enforced,
      currency: cur,
      free: catalog.free,
      allowance,
      used,
      remaining: remainingOf(allowance, used),
      bundles: catalog.bundles.map(({ price, ...b }) => ({ ...b, amount: price[cur] })),
      packs: catalog.packs.map(({ price, ...p }) => ({ ...p, amount: price[cur] })),
      purchases: rows.map((r) => this.view(r)),
      mobilePayAvailable: !!paymentsFor(this.deps, event.country),
    };
  }

  private referenceFor(eventId: string, idempotencyKey: string): string {
    const h = createHash('sha256').update(`bill|${eventId}|${idempotencyKey}`).digest();
    return 'HB' + Array.from(h.subarray(0, 10), (b) => REF_ALPHABET[b % 32]).join('');
  }

  /**
   * The owner orders a bundle or pack. `mobile` sends a mobile-money prompt to `phone` and the purchase
   * turns paid when the gateway confirms; `manual` leaves it pending until staff confirm the money
   * arrived (bank transfer, cash at the office). Idempotent per key.
   */
  async order(
    eventId: string,
    userId: string,
    input: {
      itemKey: string;
      method: 'mobile' | 'manual';
      phone?: string;
      mobileMethod?: (typeof MOBILE_METHODS)[number];
    },
    idempotencyKey: string,
  ): Promise<PurchaseView> {
    await this.ownerOnly(eventId, userId);
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128)
      throw new ApiError('validation', 'Idempotency-Key must be 8–128 characters');
    const [event] = await this.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const q = quoteItem(await this.catalog(), input.itemKey, event.currency);
    if (!q) throw new ApiError('validation', 'Unknown item', { field: 'itemKey' });
    if (q.amount <= 0)
      throw new ApiError('validation', 'This item has no price yet', { field: 'itemKey' });

    const reference = this.referenceFor(eventId, idempotencyKey);
    const [existing] = await this.db
      .select()
      .from(eventPurchases)
      .where(eq(eventPurchases.providerRef, reference));
    if (existing) return this.view(existing);

    let provider: PaymentProvider | undefined;
    let phone: string | null = null;
    if (input.method === 'mobile') {
      provider = paymentsFor(this.deps, event.country);
      if (!provider)
        throw new ApiError('forbidden', 'Mobile payment is not configured', {
          reason: 'payments_disabled',
        });
      const p = normalizePhone(
        input.phone ?? '',
        event.country,
        allowedCountries(this.deps.config.kenyaEnabled),
      );
      if (!p.ok) throw new ApiError('validation', 'Invalid phone number', { field: 'phone' });
      phone = p.e164;
      if (!input.mobileMethod || !paymentMethodsFor(event.country).includes(input.mobileMethod))
        throw new ApiError('validation', 'Payment method is not available for this event', {
          field: 'mobileMethod',
        });
    }

    const [row] = await this.db
      .insert(eventPurchases)
      .values({
        id: newId(),
        eventId,
        kind: q.kind,
        itemKey: q.key,
        label: q.label,
        ...q.adds,
        amount: q.amount,
        currency: event.currency,
        status: 'pending',
        method: input.method,
        provider: provider?.name ?? null,
        providerRef: reference,
        phoneE164: phone,
        requestedBy: userId,
      })
      .onConflictDoNothing({ target: eventPurchases.providerRef })
      .returning();
    if (!row) {
      const [again] = await this.db
        .select()
        .from(eventPurchases)
        .where(eq(eventPurchases.providerRef, reference));
      return this.view(again!);
    }
    await recordAudit(this.db, {
      eventId,
      actorId: userId,
      action: 'billing.order',
      entity: 'purchase',
      entityId: row.id,
      diff: { item: q.key, amount: q.amount, method: input.method },
    });

    if (provider && phone) {
      try {
        const r = await provider.startCollection({
          reference,
          amount: q.amount,
          currency: event.currency,
          phoneE164: phone,
          method: input.mobileMethod!,
          description: `Harusi Pass - ${q.label}`,
        });
        await this.db
          .update(eventPurchases)
          .set({ providerTxn: r.providerRef })
          .where(eq(eventPurchases.id, row.id));
      } catch {
        await this.db
          .update(eventPurchases)
          .set({ status: 'failed', note: 'provider_rejected' })
          .where(eq(eventPurchases.id, row.id));
        throw new ApiError('internal', 'The payment provider could not start the request', {
          reason: 'provider_error',
        });
      }
    }
    const [fresh] = await this.db
      .select()
      .from(eventPurchases)
      .where(eq(eventPurchases.id, row.id));
    return this.view(fresh!);
  }

  /** The owner withdraws an order that is still pending. */
  async cancel(eventId: string, userId: string, purchaseId: string): Promise<PurchaseView> {
    await this.ownerOnly(eventId, userId);
    const [done] = await this.db
      .update(eventPurchases)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(eventPurchases.id, purchaseId),
          eq(eventPurchases.eventId, eventId),
          eq(eventPurchases.status, 'pending'),
        ),
      )
      .returning();
    if (!done) throw new ApiError('conflict', 'Only a pending order can be cancelled');
    return this.view(done);
  }

  /** What the console polls while the host approves the prompt on their phone. */
  async status(eventId: string, userId: string, purchaseId: string): Promise<PurchaseView> {
    await this.ownerOnly(eventId, userId);
    const [p] = await this.db
      .select()
      .from(eventPurchases)
      .where(and(eq(eventPurchases.id, purchaseId), eq(eventPurchases.eventId, eventId)));
    if (!p) throw new ApiError('not_found', 'Unknown purchase');
    return this.view(p);
  }

  // ---------------------------------------------------------------- gateway outcome

  /** Whether a webhook reference is one of ours (`HB…`), so the payment webhook can route it here. */
  async owns(reference: string): Promise<boolean> {
    const [p] = await this.db
      .select({ id: eventPurchases.id })
      .from(eventPurchases)
      .where(eq(eventPurchases.providerRef, reference));
    return !!p;
  }

  /**
   * Applies a verified gateway answer at most once. Credit is given for what the gateway says it took:
   * an amount short of the price leaves the order pending for staff, never paid.
   */
  async applyOutcome(provider: PaymentProvider, ev: PaymentWebhookEvent) {
    const [p] = await this.db
      .select()
      .from(eventPurchases)
      .where(eq(eventPurchases.providerRef, ev.reference));
    if (!p || p.provider !== provider.name)
      return { ok: true, known: false, applied: false, duplicate: false };
    if (ev.currency && ev.currency.toUpperCase() !== p.currency)
      throw new ApiError('validation', 'Currency does not match the order', {
        reason: 'currency_mismatch',
      });
    const short = ev.status === 'success' && ev.amount !== undefined && ev.amount < p.amount;
    const status = ev.status === 'success' ? (short ? 'pending' : 'paid') : 'failed';
    const [done] = await this.db
      .update(eventPurchases)
      .set({
        status,
        paidAt: status === 'paid' ? (ev.paidAt ?? this.deps.now()) : null,
        note: short
          ? `amount_short:${ev.amount}`
          : ev.status === 'failed'
            ? (ev.failureReason ?? 'failed')
            : p.note,
        ...(ev.providerRef ? { providerTxn: ev.providerRef } : {}),
      })
      .where(and(eq(eventPurchases.id, p.id), eq(eventPurchases.status, 'pending')))
      .returning();
    if (!done) return { ok: true, known: true, applied: false, duplicate: true };
    if (status === 'paid') await this.afterPaid(done, null);
    return { ok: true, known: true, applied: true, duplicate: false };
  }

  /** Mobile orders still pending after their prompt window: asks the gateway, like pledge reconciliation. */
  async reconcilePending(limit = 50): Promise<{ checked: number; applied: number }> {
    const cutoff = new Date(this.deps.now().getTime() - PAY_TIMEOUT_MS);
    const rows = await this.db
      .select()
      .from(eventPurchases)
      .where(
        and(
          eq(eventPurchases.status, 'pending'),
          eq(eventPurchases.method, 'mobile'),
          sql`${eventPurchases.createdAt} <= ${cutoff}`,
        ),
      )
      .limit(limit);
    const providers = allPaymentProviders(this.deps);
    const out = { checked: 0, applied: 0 };
    for (const p of rows) {
      const provider = providers.find((x) => x.name === p.provider);
      if (!provider?.queryCollection || !p.providerRef) continue;
      let r;
      try {
        r = await provider.queryCollection(p.providerRef, p.providerTxn ?? undefined);
      } catch {
        continue;
      }
      out.checked++;
      if (r.status !== 'success' && r.status !== 'failed') continue;
      const res = await this.applyOutcome(provider, {
        reference: p.providerRef,
        status: r.status,
        amount: r.amount,
        currency: r.currency,
        paidAt: r.paidAt,
        failureReason: r.failureReason,
      });
      if (res.applied) out.applied++;
    }
    return out;
  }

  /** A paid card bundle also marks the event `paid` for the staff dashboards (ADR 012). */
  private async afterPaid(p: Purchase, staffId: string | null) {
    if (p.kind === 'bundle')
      await this.db.update(events).set({ plan: 'paid' }).where(eq(events.id, p.eventId));
    await recordAudit(this.db, {
      eventId: p.eventId,
      actorId: staffId,
      action: 'billing.paid',
      entity: 'purchase',
      entityId: p.id,
      diff: { item: p.itemKey, amount: p.amount, method: p.method },
    });
  }

  // ---------------------------------------------------------------- staff

  async opsListPurchases(caller: StaffCaller, opts: { status?: Purchase['status'] } = {}) {
    await requireStaff(this.db, caller, 'read');
    const rows = await this.db
      .select({ p: eventPurchases, event: events.coupleNames, country: events.country })
      .from(eventPurchases)
      .innerJoin(events, eq(events.id, eventPurchases.eventId))
      .where(opts.status ? eq(eventPurchases.status, opts.status) : undefined)
      .orderBy(desc(eventPurchases.createdAt))
      .limit(500);
    return rows.map(({ p, event, country }) => ({
      ...this.view(p),
      eventId: p.eventId,
      eventName: event,
      country,
      phone: p.phoneE164 ? maskPhone(p.phoneE164) : null,
    }));
  }

  /** Staff confirm money that came another way (or a mobile payment the gateway lost). */
  async opsMarkPaid(caller: StaffCaller, purchaseId: string, note: string) {
    const staff = await requireStaff(this.db, caller, 'plan');
    const why = note.trim();
    if (why.length < 3) throw new ApiError('validation', 'reason_required', { field: 'note' });
    const [done] = await this.db
      .update(eventPurchases)
      .set({ status: 'paid', paidAt: this.deps.now(), confirmedBy: staff.id, note: why })
      .where(
        and(
          eq(eventPurchases.id, purchaseId),
          inArray(eventPurchases.status, ['pending', 'failed']),
        ),
      )
      .returning();
    if (!done) throw new ApiError('conflict', 'Only a pending or failed order can be marked paid');
    await this.afterPaid(done, staff.id);
    const [e] = await this.db
      .select({ name: events.coupleNames })
      .from(events)
      .where(eq(events.id, done.eventId));
    await recordAudit(this.db, {
      eventId: null,
      actorId: staff.id,
      action: 'ops.purchase_paid',
      entity: 'purchase',
      entityId: done.id,
      diff: { target: e?.name ?? '', details: `${done.label} · ${why}` },
    });
    return this.view(done);
  }

  /** Free credit from staff (a goodwill top-up, or the allowance of an event billed before ADR 042). */
  async opsGrant(
    caller: StaffCaller,
    eventId: string,
    input: Allowance & { note: string },
  ): Promise<PurchaseView> {
    const staff = await requireStaff(this.db, caller, 'plan');
    const why = input.note.trim();
    if (why.length < 3) throw new ApiError('validation', 'reason_required', { field: 'note' });
    if (input.cards + input.sms + input.whatsapp <= 0)
      throw new ApiError('validation', 'Grant at least one card or message');
    const [event] = await this.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const [row] = await this.db
      .insert(eventPurchases)
      .values({
        id: newId(),
        eventId,
        kind: 'grant',
        label: 'Zawadi ya kamati ya huduma',
        cards: input.cards,
        sms: input.sms,
        whatsapp: input.whatsapp,
        amount: 0,
        currency: event.currency,
        status: 'paid',
        method: 'grant',
        note: why,
        requestedBy: staff.id,
        confirmedBy: staff.id,
        paidAt: this.deps.now(),
      })
      .returning();
    await recordAudit(this.db, {
      eventId: null,
      actorId: staff.id,
      action: 'ops.grant',
      entity: 'event',
      entityId: eventId,
      diff: {
        target: event.coupleNames,
        details: why,
        cards: input.cards,
        sms: input.sms,
        whatsapp: input.whatsapp,
      },
    });
    return this.view(row!);
  }

  /** One event's allowance for the staff panel. */
  async opsEventBilling(caller: StaffCaller, eventId: string) {
    await requireStaff(this.db, caller, 'read');
    const [event] = await this.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const catalog = await this.catalog();
    const allowance = await this.allowance(eventId, catalog);
    const used = await this.usage(eventId);
    return { enforced: catalog.enforced, allowance, used, remaining: remainingOf(allowance, used) };
  }
}
