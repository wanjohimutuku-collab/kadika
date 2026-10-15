import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { events, guests, newId, payments, pledges, users } from '@harusi/db';
import { normalizePhone } from '@harusi/schemas/phone';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { hashGuestToken } from '@harusi/crypto';
import { invitations } from '@harusi/db';
import { allowedCountries, onlinePaymentLimits, paymentMethodsFor } from '@harusi/schemas/country';
import type { PaymentProvider, PaymentWebhookEvent } from '@harusi/payments';
import { allPaymentProviders, paymentsFor } from '../payment-routing';
import { eventCountry, type EventService } from './events';
import { recordAudit } from './audit';

export type PledgeStatus = 'pledged' | 'partial' | 'paid' | 'waived';
export const MANUAL_METHODS = ['cash', 'bank', 'mpesa', 'mixx', 'airtel', 'halopesa'] as const;
export const MOBILE_METHODS = ['mpesa', 'mixx', 'airtel', 'halopesa'] as const;
const MAX_AMOUNT = 100_000_000;
const PAY_TIMEOUT_MS = 60_000;
/** A provider that has no record of a reference this long after its prompt expired never got it. */
const UNKNOWN_GRACE_MS = 2 * 60_000;
/** A payment still pending this long after it started is given up as a timeout. */
const PENDING_LIMIT_MS = 30 * 60_000;
/** A timed-out payment is still checked for a late success for this long (money wins). */
const LATE_SUCCESS_WINDOW_MS = 24 * 3_600_000;
const REF_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A pledge's status follows what has been paid; "waived" is the committee's explicit choice. */
export function pledgeStatus(amount: number, paid: number, waived: boolean): PledgeStatus {
  if (waived) return 'waived';
  if (amount > 0 && paid >= amount) return 'paid';
  return paid > 0 ? 'partial' : 'pledged';
}

export interface PledgeSummary {
  amount: number;
  paid: number;
  balance: number;
  status: PledgeStatus;
}

/** Pledge, paid and balance for one guest. A waived pledge owes nothing. */
export async function pledgeSummaryOf(
  db: Deps['db'],
  guestId: string,
): Promise<PledgeSummary | null> {
  const [p] = await db.select().from(pledges).where(eq(pledges.guestId, guestId));
  const [paidRow] = await db
    .select({ n: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.guestId, guestId), eq(payments.status, 'success')));
  const paid = paidRow?.n ?? 0;
  if (!p && paid === 0) return null;
  const amount = p?.amount ?? 0;
  const waived = p?.status === 'waived';
  return {
    amount,
    paid,
    balance: waived ? 0 : Math.max(0, amount - paid),
    status: p ? pledgeStatus(amount, paid, waived) : 'paid',
  };
}

/** CSV cell: quoted, and neutralised if a spreadsheet would run it as a formula. */
export function csvCell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Pledges and payments (§7.5). Money is whole units of the event's currency. A payment becomes real only when it is
 * `success`: manual entries by the committee, or an aggregator webhook applied exactly once.
 */
export class PledgeService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private async canManage(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot see money');
    return role;
  }

  private async guestEvent(guestId: string): Promise<{ eventId: string; displayName: string }> {
    const [g] = await this.deps.db
      .select({ eventId: guests.eventId, displayName: guests.displayName })
      .from(guests)
      .where(and(eq(guests.id, guestId), isNull(guests.deletedAt)));
    if (!g) throw new ApiError('not_found', 'Guest not found');
    return g;
  }

  private async audit(
    userId: string | null,
    action: string,
    entityId: string,
    diff: unknown,
    eventId: string | null = null,
  ) {
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action,
      entity: 'payment',
      entityId,
      diff: diff as Record<string, unknown>,
    });
  }

  /** Re-derives the pledge status from payments and links earlier payments to a new pledge. */
  async recompute(guestId: string): Promise<void> {
    const [p] = await this.deps.db.select().from(pledges).where(eq(pledges.guestId, guestId));
    if (!p) return;
    await this.deps.db
      .update(payments)
      .set({ pledgeId: p.id })
      .where(and(eq(payments.guestId, guestId), isNull(payments.pledgeId)));
    const s = await pledgeSummaryOf(this.deps.db, guestId);
    const status = pledgeStatus(p.amount, s?.paid ?? 0, p.status === 'waived');
    if (status !== p.status)
      await this.deps.db.update(pledges).set({ status }).where(eq(pledges.id, p.id));
  }

  // ---- pledges

  async upsertPledge(
    guestId: string,
    userId: string,
    input: { amount: number; note?: string | null; waived?: boolean },
  ) {
    const g = await this.guestEvent(guestId);
    await this.canManage(g.eventId, userId);
    if (!Number.isInteger(input.amount) || input.amount < 0 || input.amount > MAX_AMOUNT)
      throw new ApiError('validation', 'Amount must be a whole number', {
        field: 'amount',
      });
    const [existing] = await this.deps.db
      .select()
      .from(pledges)
      .where(eq(pledges.guestId, guestId));
    const status: PledgeStatus = input.waived ? 'waived' : 'pledged';
    if (existing)
      await this.deps.db
        .update(pledges)
        .set({
          amount: input.amount,
          note: input.note ?? existing.note,
          status,
          createdBy: userId,
        })
        .where(eq(pledges.id, existing.id));
    else
      await this.deps.db.insert(pledges).values({
        id: newId(),
        guestId,
        amount: input.amount,
        note: input.note ?? null,
        status,
        createdBy: userId,
      });
    await this.recompute(guestId);
    await this.audit(
      userId,
      existing ? 'pledge.update' : 'pledge.create',
      guestId,
      {
        amount: input.amount,
        waived: !!input.waived,
      },
      g.eventId,
    );
    return pledgeSummaryOf(this.deps.db, guestId);
  }

  /** Every guest with their pledge, paid and balance, plus the event totals for the dashboard. */
  async summary(eventId: string, userId: string) {
    await this.canManage(eventId, userId);
    return this.summaryRows(eventId);
  }

  private async summaryRows(eventId: string) {
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const gs = await this.deps.db
      .select({
        id: guests.id,
        displayName: guests.displayName,
        groupLabel: guests.groupLabel,
        shortCode: guests.shortCode,
      })
      .from(guests)
      .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
    const ids = gs.map((g) => g.id);
    const ps = ids.length
      ? await this.deps.db.select().from(pledges).where(inArray(pledges.guestId, ids))
      : [];
    const paid = ids.length
      ? await this.deps.db
          .select({ guestId: payments.guestId, n: sql<number>`sum(${payments.amount})::int` })
          .from(payments)
          .where(and(inArray(payments.guestId, ids), eq(payments.status, 'success')))
          .groupBy(payments.guestId)
      : [];
    const pledgeBy = new Map(ps.map((p) => [p.guestId, p]));
    const paidBy = new Map(paid.map((r) => [r.guestId, r.n]));
    const rows = gs.map((g) => {
      const p = pledgeBy.get(g.id);
      const paid = paidBy.get(g.id) ?? 0;
      const waived = p?.status === 'waived';
      const amount = p?.amount ?? 0;
      return {
        guestId: g.id,
        displayName: g.displayName,
        groupLabel: g.groupLabel,
        shortCode: g.shortCode,
        amount,
        paid,
        balance: waived ? 0 : Math.max(0, amount - paid),
        status: p ? pledgeStatus(amount, paid, waived) : paid > 0 ? ('paid' as const) : null,
        note: p?.note ?? null,
      };
    });
    const totals = {
      targetAmount: event.contributionTarget ?? 0,
      pledged: rows.filter((r) => r.status !== 'waived').reduce((n, r) => n + r.amount, 0),
      collected: rows.reduce((n, r) => n + r.paid, 0),
      balance: rows.reduce((n, r) => n + r.balance, 0),
      guestsWithBalance: rows.filter((r) => r.balance > 0).length,
    };
    return { totals, guests: rows };
  }

  /** The dashboard numbers without the per-guest rows (used by the event stats). */
  async totals(eventId: string) {
    return (await this.summaryRows(eventId)).totals;
  }

  // ---- manual payments (cash, bank, a transfer the committee confirmed)

  async recordManual(
    userId: string,
    input: {
      guestId: string;
      amount: number;
      method: (typeof MANUAL_METHODS)[number];
      reference?: string;
      note?: string;
    },
  ) {
    const g = await this.guestEvent(input.guestId);
    await this.canManage(g.eventId, userId);
    if (
      input.method !== 'cash' &&
      input.method !== 'bank' &&
      !paymentMethodsFor(await eventCountry(this.deps.db, g.eventId)).includes(input.method)
    )
      throw new ApiError('validation', 'Payment method is not available for this event', {
        field: 'method',
        reason: 'method.not_available',
      });
    if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > MAX_AMOUNT)
      throw new ApiError('validation', 'Amount must be a whole number', {
        field: 'amount',
      });
    const ref = input.reference?.trim();
    const providerRef = ref ? `manual:${g.eventId}:${ref}` : `manual:${newId()}`;
    const [pledge] = await this.deps.db
      .select()
      .from(pledges)
      .where(eq(pledges.guestId, input.guestId));
    const inserted = await this.deps.db
      .insert(payments)
      .values({
        id: newId(),
        pledgeId: pledge?.id ?? null,
        guestId: input.guestId,
        provider: 'manual',
        providerRef,
        amount: input.amount,
        status: 'success',
        method: input.method,
        note: input.note ?? null,
        recordedBy: userId,
        paidAt: this.deps.now(),
      })
      .onConflictDoNothing({ target: payments.providerRef })
      .returning({ id: payments.id });
    if (inserted.length === 0)
      throw new ApiError('conflict', 'This payment reference was already recorded', {
        field: 'reference',
      });
    await this.recompute(input.guestId);
    await this.audit(
      userId,
      'payment.manual',
      inserted[0]!.id,
      {
        guestId: input.guestId,
        amount: input.amount,
        method: input.method,
      },
      g.eventId,
    );
    return this.paymentView(inserted[0]!.id);
  }

  private async paymentView(id: string) {
    const [r] = await this.deps.db
      .select({ p: payments, guestName: guests.displayName, by: users.name })
      .from(payments)
      .innerJoin(guests, eq(guests.id, payments.guestId))
      .leftJoin(users, eq(users.id, payments.recordedBy))
      .where(eq(payments.id, id));
    return this.view(r!);
  }

  private view(r: { p: typeof payments.$inferSelect; guestName: string; by: string | null }) {
    return {
      id: r.p.id,
      guestId: r.p.guestId,
      guestName: r.guestName,
      amount: r.p.amount,
      method: r.p.method,
      status: r.p.status,
      reference: r.p.providerRef,
      phoneE164: r.p.phoneE164,
      paidAt: (r.p.paidAt ?? r.p.createdAt).toISOString(),
      note: r.p.note ?? '',
      recordedBy: r.by ?? null,
    };
  }

  async listPayments(eventId: string, userId: string) {
    await this.canManage(eventId, userId);
    const rows = await this.deps.db
      .select({ p: payments, guestName: guests.displayName, by: users.name })
      .from(payments)
      .innerJoin(guests, eq(guests.id, payments.guestId))
      .leftJoin(users, eq(users.id, payments.recordedBy))
      .where(eq(guests.eventId, eventId))
      .orderBy(desc(payments.createdAt))
      .limit(2000);
    return { items: rows.map((r) => this.view(r)) };
  }

  // ---- pay from the card (public: the card token is the credential)

  private async guestByToken(token: string) {
    const [row] = await this.deps.db
      .select({ guest: guests, event: events })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(eq(invitations.tokenHash, hashGuestToken(token)), isNull(guests.deletedAt)));
    if (!row) throw new ApiError('not_found', 'Invalid link');
    return row;
  }

  /** Reference derived from the idempotency key, so a retried request returns the same payment. */
  private referenceFor(guestId: string, key: string): string {
    const h = createHash('sha256').update(`${guestId}:${key}`).digest();
    return 'HP' + Array.from(h.subarray(0, 10), (b) => REF_ALPHABET[b % 32]).join('');
  }

  async startPayment(
    token: string,
    input: { amount: number; phone: string; method: (typeof MOBILE_METHODS)[number] },
    idempotencyKey: string,
  ) {
    const { guest, event } = await this.guestByToken(token);
    const provider = paymentsFor(this.deps, event.country);
    if (!provider)
      throw new ApiError('forbidden', 'Payments are not configured', {
        reason: 'payments_disabled',
      });
    if (!event.pledgesEnabled || event.status === 'archived')
      throw new ApiError('forbidden', 'Payments are closed for this event', {
        reason: 'payments_disabled',
      });
    // Rollback lever: no new Kenyan prompts, while callbacks and reconciliation keep settling old ones.
    if (event.country !== 'TZ' && this.deps.config.kenyaPaymentsPaused)
      throw new ApiError('forbidden', 'Payments are paused for this country', {
        reason: 'payments_paused',
      });
    const limits = onlinePaymentLimits(event.country);
    if (!Number.isInteger(input.amount) || input.amount < limits.min || input.amount > limits.max)
      throw new ApiError('validation', 'Amount out of range', {
        field: 'amount',
        min: limits.min,
        max: limits.max,
      });
    if (!paymentMethodsFor(event.country).includes(input.method))
      throw new ApiError('validation', 'Payment method is not available for this event', {
        field: 'method',
        reason: 'method.not_available',
      });
    const phone = normalizePhone(
      input.phone,
      event.country,
      allowedCountries(this.deps.config.kenyaEnabled),
    );
    if (!phone.ok) throw new ApiError('validation', 'Invalid phone number', { field: 'phone' });
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128)
      throw new ApiError('validation', 'Idempotency-Key must be 8–128 characters');
    const reference = this.referenceFor(guest.id, idempotencyKey);
    const expiresAt = new Date(this.deps.now().getTime() + PAY_TIMEOUT_MS);
    const [pledge] = await this.deps.db.select().from(pledges).where(eq(pledges.guestId, guest.id));
    const inserted = await this.deps.db
      .insert(payments)
      .values({
        id: newId(),
        pledgeId: pledge?.id ?? null,
        guestId: guest.id,
        provider: provider.name,
        providerRef: reference,
        amount: input.amount,
        status: 'pending',
        phoneE164: phone.e164,
        method: input.method,
        expiresAt,
      })
      .onConflictDoNothing({ target: payments.providerRef })
      .returning({ id: payments.id });
    if (inserted.length === 0) {
      // the same request again: hand back the existing attempt without asking the phone twice
      const [p] = await this.deps.db
        .select()
        .from(payments)
        .where(eq(payments.providerRef, reference));
      return {
        reference,
        amount: p!.amount,
        phoneE164: p!.phoneE164,
        method: p!.method,
        expiresAt: (p!.expiresAt ?? expiresAt).toISOString(),
      };
    }
    try {
      const r = await provider.startCollection({
        reference,
        amount: input.amount,
        currency: event.currency,
        phoneE164: phone.e164,
        method: input.method,
        description: `Mchango - ${event.coupleNames}`,
      });
      await this.deps.db
        .update(payments)
        .set({ raw: { providerRef: r.providerRef } })
        .where(eq(payments.providerRef, reference));
    } catch {
      await this.deps.db
        .update(payments)
        .set({ status: 'failed', raw: { failureReason: 'provider_rejected' } })
        .where(eq(payments.providerRef, reference));
      throw new ApiError('internal', 'The payment provider could not start the request', {
        reason: 'provider_error',
      });
    }
    return {
      reference,
      amount: input.amount,
      phoneE164: phone.e164,
      method: input.method,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /** What the card's "waiting for your phone" screen polls. */
  async paymentStatus(reference: string) {
    const [p] = await this.deps.db
      .select()
      .from(payments)
      .where(eq(payments.providerRef, reference));
    if (!p || p.provider === 'manual') throw new ApiError('not_found', 'Unknown payment');
    const expired =
      p.status === 'pending' && p.expiresAt !== null && p.expiresAt <= this.deps.now();
    const summary = p.status === 'success' ? await pledgeSummaryOf(this.deps.db, p.guestId) : null;
    const raw = (p.raw ?? {}) as { failureReason?: string; duplicateWebhooks?: number };
    return {
      reference,
      status: expired ? ('expired' as const) : p.status,
      amount: p.amount,
      method: p.method,
      paidAt: p.paidAt?.toISOString() ?? null,
      duplicateWebhook: (raw.duplicateWebhooks ?? 0) > 0,
      newBalance: summary ? summary.balance : null,
      failureReason: raw.failureReason ?? null,
    };
  }

  // ---- aggregator webhook: verified, then applied at most once per payment

  async webhook(
    providerName: string,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ) {
    const provider = allPaymentProviders(this.deps).find((p) => p.name === providerName);
    if (!provider) throw new ApiError('not_found', 'Unknown provider');
    if (!provider.verifyWebhook(rawBody, headers))
      throw new ApiError('unauthorized', 'Bad webhook signature');
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new ApiError('validation', 'Body must be JSON');
    }
    const ev = provider.parseWebhook(body);
    if (!ev) throw new ApiError('validation', 'Unrecognised webhook');
    return this.applyOutcome(provider, ev, 'payment.webhook');
  }

  /**
   * The one place a provider's answer (callback or reconciliation query) changes a payment. Atomic:
   * only the call that finds the row still open can finish it. A late success also reopens a payment
   * we gave up on as a timeout, because money that arrived must not be lost.
   */
  private async applyOutcome(
    provider: PaymentProvider,
    ev: PaymentWebhookEvent,
    action: 'payment.webhook' | 'payment.reconciled',
  ) {
    const [row] = await this.deps.db
      .select({ p: payments, currency: events.currency, eventId: events.id })
      .from(payments)
      .innerJoin(guests, eq(guests.id, payments.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(eq(payments.providerRef, ev.reference));
    if (!row || row.p.provider !== provider.name)
      return { ok: true, known: false, applied: false, duplicate: false };
    const p = row.p;
    // Never credit money in another currency than the event's (ADR 027).
    if (ev.currency && ev.currency.toUpperCase() !== row.currency) {
      await this.audit(
        null,
        'payment.currency_mismatch',
        p.id,
        { reference: ev.reference, expected: row.currency, got: ev.currency },
        row.eventId,
      );
      throw new ApiError('validation', 'Currency does not match the event', {
        reason: 'currency_mismatch',
      });
    }
    const raw = (p.raw ?? {}) as Record<string, unknown>;
    const mismatch = ev.status === 'success' && ev.amount !== undefined && ev.amount !== p.amount;
    const open =
      ev.status === 'success'
        ? or(
            eq(payments.status, 'pending'),
            and(eq(payments.status, 'failed'), sql`${payments.raw}->>'failureReason' = 'timeout'`),
          )
        : eq(payments.status, 'pending');
    const late = p.status === 'failed';
    const { failureReason: _drop, ...rawKept } = raw;
    const [done] = await this.deps.db
      .update(payments)
      .set({
        status: ev.status,
        paidAt: ev.status === 'success' ? (ev.paidAt ?? this.deps.now()) : null,
        // money truth is what the provider says it took, not what the guest typed
        amount: ev.status === 'success' && ev.amount !== undefined ? ev.amount : p.amount,
        raw: {
          ...(ev.status === 'success' ? rawKept : raw),
          ...(ev.providerRef ? { providerRef: ev.providerRef } : {}),
          ...(ev.failureReason ? { failureReason: ev.failureReason } : {}),
          ...(mismatch ? { amountMismatch: { requested: p.amount, received: ev.amount } } : {}),
          ...(late && ev.status === 'success' ? { lateSuccess: true } : {}),
        },
      })
      .where(and(eq(payments.id, p.id), open))
      .returning({ id: payments.id });
    if (!done) {
      await this.deps.db
        .update(payments)
        .set({ raw: { ...raw, duplicateWebhooks: Number(raw.duplicateWebhooks ?? 0) + 1 } })
        .where(eq(payments.id, p.id));
      return { ok: true, known: true, applied: false, duplicate: true };
    }
    if (ev.status === 'success') {
      await this.recompute(p.guestId);
      await this.audit(
        null,
        action,
        p.id,
        {
          reference: ev.reference,
          amount: ev.amount ?? p.amount,
          ...(late ? { late: true } : {}),
          ...(mismatch ? { requested: p.amount } : {}),
        },
        row.eventId,
      );
    }
    return { ok: true, known: true, applied: true, duplicate: false };
  }

  /**
   * Scheduled reconciliation (ADR 027): asks the provider about payments still open past their prompt
   * window and applies the answer through the same atomic step as a callback. A payment the provider
   * never received, or that is still pending after 30 minutes, becomes `failed` (`timeout`); a late
   * success on such a payment still wins for 24 hours.
   */
  async reconcilePending(
    limit = 100,
  ): Promise<{ checked: number; applied: number; timedOut: number }> {
    const now = this.deps.now();
    const rows = await this.deps.db
      .select()
      .from(payments)
      .where(
        and(
          sql`${payments.provider} <> 'manual'`,
          or(
            and(eq(payments.status, 'pending'), sql`${payments.expiresAt} <= ${now}`),
            and(
              eq(payments.status, 'failed'),
              sql`${payments.raw}->>'failureReason' = 'timeout'`,
              sql`${payments.expiresAt} > ${new Date(now.getTime() - LATE_SUCCESS_WINDOW_MS)}`,
            ),
          ),
        ),
      )
      .limit(limit);
    const providers = allPaymentProviders(this.deps);
    const out = { checked: 0, applied: 0, timedOut: 0 };
    for (const p of rows) {
      const provider = providers.find((x) => x.name === p.provider);
      if (!provider?.queryCollection) continue;
      let r;
      try {
        r = await provider.queryCollection(p.providerRef);
      } catch {
        continue; // retried on the next tick
      }
      out.checked++;
      const wasTimeout = p.status === 'failed';
      if (r.status === 'success' || (r.status === 'failed' && !wasTimeout)) {
        const res = await this.applyOutcome(
          provider,
          {
            reference: p.providerRef,
            status: r.status,
            amount: r.amount,
            currency: r.currency,
            paidAt: r.paidAt,
            failureReason: r.failureReason,
          },
          'payment.reconciled',
        );
        if (res.applied) out.applied++;
        continue;
      }
      if (wasTimeout) continue;
      const expiredFor = now.getTime() - (p.expiresAt ?? p.createdAt).getTime();
      // Anchored on `expiresAt` (set from the service clock) rather than the row's insert time.
      const age = expiredFor + PAY_TIMEOUT_MS;
      const giveUp =
        (r.status === 'unknown' && expiredFor >= UNKNOWN_GRACE_MS) || age >= PENDING_LIMIT_MS;
      if (!giveUp) continue;
      const [gone] = await this.deps.db
        .update(payments)
        .set({ status: 'failed', raw: { ...((p.raw ?? {}) as object), failureReason: 'timeout' } })
        .where(and(eq(payments.id, p.id), eq(payments.status, 'pending')))
        .returning({ id: payments.id });
      if (gone) out.timedOut++;
    }
    return out;
  }

  // ---- exports

  async exportCsv(eventId: string, userId: string, kind: 'pledges' | 'payments'): Promise<string> {
    await this.canManage(eventId, userId);
    const [ev] = await this.deps.db
      .select({ currency: events.currency })
      .from(events)
      .where(eq(events.id, eventId));
    const cur = ev?.currency ?? 'TZS';
    const BOM = '﻿';
    if (kind === 'pledges') {
      const { guests: rows } = await this.summaryRows(eventId);
      const head = [
        'Jina',
        'Kikundi',
        'Namba',
        `Ahadi (${cur})`,
        `Imelipwa (${cur})`,
        `Salio (${cur})`,
        'Hali',
      ];
      const lines = rows
        .filter((r) => r.status !== null)
        .map((r) =>
          [r.displayName, r.groupLabel, r.shortCode, r.amount, r.paid, r.balance, r.status]
            .map(csvCell)
            .join(','),
        );
      return BOM + [head.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
    }
    const { items } = await this.listPayments(eventId, userId);
    const head = ['Tarehe', 'Jina', `Kiasi (${cur})`, 'Njia', 'Hali', 'Kumbukumbu', 'Maelezo'];
    const lines = items.map((p) =>
      [p.paidAt, p.guestName, p.amount, p.method, p.status, p.reference, p.note]
        .map(csvCell)
        .join(','),
    );
    return BOM + [head.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
  }
}
