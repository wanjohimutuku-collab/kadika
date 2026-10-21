import { and, eq, inArray, isNull, or, isNotNull, ne } from 'drizzle-orm';
import { payments, pledges } from '@harusi/db';
import type { Deps } from '../context';
import { decryptField, encryptField } from '../crypto-at-rest';

/**
 * Contribution records (ADR 043). Guests' money is never collected through us: the host's committee
 * records pledges and payments, and those records are the host's private data. Amounts, notes and the
 * payer's phone are stored AES-GCM encrypted, each bound to its row and column, and only decrypted for
 * members of the event (owner and committee). The plain `amount` column holds 0 for sealed rows, so no
 * SQL sum, staff dashboard or database dump can read the money.
 */
type Db = Deps['db'];
type PledgeRow = typeof pledges.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

const ctx = (table: 'pledges' | 'payments', id: string, column: string) =>
  `${table}:${id}:${column}`;

export class ContributionRecords {
  constructor(private secret: string) {}

  static of(deps: Pick<Deps, 'config'>) {
    return new ContributionRecords(deps.config.keyEncSecret);
  }

  seal(table: 'pledges' | 'payments', id: string, column: string, value: string | number) {
    return encryptField(String(value), this.secret, ctx(table, id, column));
  }

  private async open(
    table: 'pledges' | 'payments',
    id: string,
    column: string,
    enc: string | null,
  ): Promise<string | null> {
    return enc === null ? null : decryptField(enc, this.secret, ctx(table, id, column));
  }

  /** The columns to write for a pledge's amount and note. */
  async pledgeFields(id: string, amount: number, note: string | null) {
    return {
      amount: 0,
      amountEnc: await this.seal('pledges', id, 'amount', amount),
      note: null,
      noteEnc: note ? await this.seal('pledges', id, 'note', note) : null,
    };
  }

  /** The columns to write for a payment's amount, note and payer phone. */
  async paymentFields(id: string, amount: number, note: string | null, phone: string | null) {
    return {
      amount: 0,
      amountEnc: await this.seal('payments', id, 'amount', amount),
      note: null,
      noteEnc: note ? await this.seal('payments', id, 'note', note) : null,
      phoneE164: null,
      phoneEnc: phone ? await this.seal('payments', id, 'phone', phone) : null,
    };
  }

  /** A pledge with its amount and note readable. Rows from before ADR 043 are read as they are. */
  async openPledge(p: PledgeRow): Promise<PledgeRow> {
    if (p.amountEnc === null) return p;
    return {
      ...p,
      amount: Number(await this.open('pledges', p.id, 'amount', p.amountEnc)),
      note: (await this.open('pledges', p.id, 'note', p.noteEnc)) ?? null,
    };
  }

  async openPayment(p: PaymentRow): Promise<PaymentRow> {
    if (p.amountEnc === null) return p;
    return {
      ...p,
      amount: Number(await this.open('payments', p.id, 'amount', p.amountEnc)),
      note: (await this.open('payments', p.id, 'note', p.noteEnc)) ?? null,
      phoneE164: (await this.open('payments', p.id, 'phone', p.phoneEnc)) ?? null,
    };
  }

  /** Confirmed money per guest, summed after decryption (there is nothing to sum in SQL). */
  async paidByGuest(db: Db, guestIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (guestIds.length === 0) return out;
    const rows = await db
      .select()
      .from(payments)
      .where(and(inArray(payments.guestId, guestIds), eq(payments.status, 'success')));
    for (const r of rows) {
      const p = await this.openPayment(r);
      out.set(p.guestId, (out.get(p.guestId) ?? 0) + p.amount);
    }
    return out;
  }

  /**
   * Seals rows written before ADR 043, a batch at a time; safe to run on every start. Returns how many
   * rows it sealed.
   */
  async sealLegacy(db: Db, batch = 500): Promise<number> {
    let n = 0;
    for (;;) {
      const ps = await db
        .select()
        .from(pledges)
        .where(and(isNull(pledges.amountEnc), or(ne(pledges.amount, 0), isNotNull(pledges.note))))
        .limit(batch);
      for (const p of ps)
        await db
          .update(pledges)
          .set(await this.pledgeFields(p.id, p.amount, p.note))
          .where(eq(pledges.id, p.id));
      const pays = await db
        .select()
        .from(payments)
        .where(
          and(
            isNull(payments.amountEnc),
            or(ne(payments.amount, 0), isNotNull(payments.note), isNotNull(payments.phoneE164)),
          ),
        )
        .limit(batch);
      for (const p of pays)
        await db
          .update(payments)
          .set(await this.paymentFields(p.id, p.amount, p.note, p.phoneE164))
          .where(eq(payments.id, p.id));
      n += ps.length + pays.length;
      if (ps.length < batch && pays.length < batch) return n;
    }
  }
}
