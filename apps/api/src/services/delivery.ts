import { and, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm';
import { events, guests, invitations, messageLog, newId, retiredCardTokens } from '@harusi/db';
import { generateGuestToken, hashGuestToken } from '@harusi/crypto';
import { eventKindLabel, formatMoney, hostNames, toZoned } from '@harusi/schemas';
import { buildInviteSms, buildReminderSms } from '@harusi/api-client';
import { pledgeSummaryOf } from './pledges';
import type { DeliveryState, MessageTemplate } from '@harusi/messaging';
import type { MessageChannel, MessagingProvider } from '@harusi/messaging';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { decryptSecret, encryptSecret } from '../crypto-at-rest';
import type { EventService } from './events';

const MONTHS_SW = [
  'Jan',
  'Feb',
  'Machi',
  'Apr',
  'Mei',
  'Juni',
  'Julai',
  'Ago',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 2_000];

export type SendTarget = 'remaining' | 'failed' | { guestIds: string[] } | { group: string };
export interface SendInput {
  target: SendTarget;
  /** `auto` follows each guest's channel preference (WhatsApp, falling back to SMS). */
  channel?: 'auto' | 'whatsapp' | 'sms';
}
export interface SendSummary {
  total: number;
  sent: number;
  failed: number;
  /** Print-only guests and guests without a phone number: nothing to send. */
  skipped: number;
  byChannel: { whatsapp: number; sms: number };
  failures: { guestId: string; error: string }[];
}

export function dateText(d: Date, locale: 'sw' | 'en', timeZone = 'Africa/Dar_es_Salaam'): string {
  const t = toZoned(d, timeZone);
  const months = locale === 'sw' ? MONTHS_SW : MONTHS_EN;
  return `${t.getUTCDate()} ${months[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

/**
 * Invitation delivery (§7.2, ADR 017). Queue-agnostic: each guest is one unit of work, so a BullMQ
 * worker can run the same `deliverOne` later. Every attempt is written to `message_log`.
 */
export class DeliveryService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private async assertCanSend(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot send invitations');
  }

  /** The card token for a guest; rotates it once for rows created before ADR 017. */
  private async cardToken(inv: typeof invitations.$inferSelect): Promise<string> {
    const secret = this.deps.config.keyEncSecret;
    if (inv.tokenEnc) return decryptSecret(inv.tokenEnc, secret);
    const token = generateGuestToken(this.deps.random);
    await this.deps.db.transaction(async (tx) => {
      await tx
        .insert(retiredCardTokens)
        .values({ id: newId(), guestId: inv.guestId, tokenHash: inv.tokenHash })
        .onConflictDoNothing();
      await tx
        .update(invitations)
        .set({ tokenHash: hashGuestToken(token), tokenEnc: await encryptSecret(token, secret) })
        .where(eq(invitations.id, inv.id));
    });
    return token;
  }

  private provider(channel: MessageChannel): MessagingProvider | undefined {
    return channel === 'whatsapp' ? this.deps.whatsapp : this.deps.sms;
  }

  private async attempt(
    p: MessagingProvider,
    to: string,
    body: string,
    template?: MessageTemplate,
  ): Promise<{ ok: true; id: string; cost?: number } | { ok: false; error: string }> {
    const sleep = this.deps.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
    let error = 'unknown error';
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const r = await p.send(to, body, template);
        return { ok: true, id: r.providerMsgId, cost: r.costTzs };
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        if (i < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[i] ?? 2_000);
      }
    }
    return { ok: false, error };
  }

  private async log(
    guestId: string,
    channel: MessageChannel,
    provider: string,
    r: Awaited<ReturnType<DeliveryService['attempt']>>,
    kind: string,
  ) {
    await this.deps.db.insert(messageLog).values({
      id: newId(),
      guestId,
      channel,
      kind,
      provider,
      providerMsgId: r.ok ? r.id : null,
      status: r.ok ? 'sent' : 'failed',
      error: r.ok ? null : r.error,
      costTzs: r.ok ? (r.cost ?? null) : null,
    });
  }

  /** Channels to try for a guest, in order. WhatsApp first for smartphone guests (§7.2). */
  private channelsFor(
    g: typeof guests.$inferSelect,
    wanted: NonNullable<SendInput['channel']>,
  ): MessageChannel[] {
    if (!g.phoneE164 || g.inviteChannelPref === 'print') return [];
    if (wanted === 'sms') return ['sms'];
    if (wanted === 'whatsapp') return ['whatsapp', 'sms'];
    const wa = g.hasSmartphone !== false && g.inviteChannelPref !== 'sms';
    return wa && this.deps.whatsapp ? ['whatsapp', 'sms'] : ['sms'];
  }

  /** Builds the text for one guest (invitation or reminder) with a fresh card link. */
  private async text(
    guest: typeof guests.$inferSelect,
    inv: typeof invitations.$inferSelect,
    event: typeof events.$inferSelect,
    daysLeft?: number,
  ): Promise<{ text: string; template: MessageTemplate }> {
    const [a = '', b = ''] = event.coupleNames.split('&').map((x) => x.trim());
    const token = await this.cardToken(inv);
    const base = {
      locale: guest.language,
      partnerA: a,
      partnerB: b,
      kind: event.eventKind,
      dateText: dateText(event.dateStart, guest.language, event.timezone),
      shortLink: `${this.deps.config.shortBaseUrl}/s/${token}`,
      code: guest.shortCode,
    };
    const template: MessageTemplate = {
      kind: daysLeft === undefined ? 'invite' : 'reminder',
      locale: guest.language,
      params: [
        a,
        b,
        daysLeft === undefined ? base.dateText : String(daysLeft),
        base.shortLink,
        base.code,
      ],
    };
    return {
      text: daysLeft === undefined ? buildInviteSms(base) : buildReminderSms({ ...base, daysLeft }),
      template,
    };
  }

  /** Tries each channel in order; logs every attempt; marks the invitation sent on the first success. */
  private async dispatch(
    guest: typeof guests.$inferSelect,
    inv: typeof invitations.$inferSelect,
    event: typeof events.$inferSelect,
    kind: string,
    channels: MessageChannel[],
    daysLeft?: number,
    built?: { text: string; template: MessageTemplate },
  ): Promise<{ ok: true; channel: MessageChannel } | { ok: false; error: string }> {
    const { text, template } = built ?? (await this.text(guest, inv, event, daysLeft));
    let lastError = 'no provider configured';
    for (const ch of channels) {
      const p = this.provider(ch);
      if (!p) continue;
      const r = await this.attempt(p, guest.phoneE164!, text, template);
      await this.log(guest.id, ch, p.name, r, kind);
      if (r.ok) {
        await this.deps.db
          .update(invitations)
          .set({
            ...(kind === 'invite' ? { status: 'sent' as const, sentAt: this.deps.now() } : {}),
            channelLast: ch,
          })
          .where(
            kind === 'invite'
              ? and(eq(invitations.id, inv.id), eq(invitations.status, 'created'))
              : eq(invitations.id, inv.id),
          );
        return { ok: true, channel: ch };
      }
      lastError = r.error;
    }
    return { ok: false, error: lastError };
  }

  /**
   * Delivery webhook (WhatsApp `messages.update`, SMS reports). Moves the message and, for a
   * delivered/read message, the invitation forward — never backwards (§5, P8).
   */
  async recordDelivery(providerMsgId: string, state: DeliveryState): Promise<boolean> {
    const [m] = await this.deps.db
      .select()
      .from(messageLog)
      .where(eq(messageLog.providerMsgId, providerMsgId));
    if (!m) return false;
    if (state === 'pending') return true;
    const status = state === 'failed' ? 'failed' : state;
    if (m.status !== 'read') {
      await this.deps.db.update(messageLog).set({ status }).where(eq(messageLog.id, m.id));
    }
    if (state === 'delivered' || state === 'read') {
      await this.deps.db
        .update(invitations)
        .set({ status: 'delivered', deliveredAt: this.deps.now() })
        .where(
          and(
            eq(invitations.guestId, m.guestId),
            inArray(invitations.status, ['created', 'queued', 'sent']),
          ),
        );
    }
    return true;
  }

  /**
   * WhatsApp invitations still not delivered after `hours` get one SMS (§7.2). Safe to run on a
   * schedule: a guest gets at most one `fallback` message.
   */
  async fallbackUndelivered(hours: number): Promise<{ sent: number; failed: number }> {
    const cutoff = new Date(this.deps.now().getTime() - hours * 3_600_000);
    const rows = await this.deps.db
      .select({ guest: guests, inv: invitations, event: events })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(
        and(
          eq(invitations.status, 'sent'),
          eq(invitations.channelLast, 'whatsapp'),
          lt(invitations.sentAt, cutoff),
          isNull(guests.deletedAt),
        ),
      );
    const done = new Set(
      (
        await this.deps.db
          .select({ guestId: messageLog.guestId })
          .from(messageLog)
          .where(eq(messageLog.kind, 'fallback'))
      ).map((r) => r.guestId),
    );
    const out = { sent: 0, failed: 0 };
    for (const { guest, inv, event } of rows) {
      if (!guest.phoneE164 || done.has(guest.id)) continue;
      const r = await this.dispatch(guest, inv, event, 'fallback', ['sms']);
      out[r.ok ? 'sent' : 'failed']++;
    }
    return out;
  }

  /**
   * Reminders at T-14, T-7 and T-1 days (§7.4) to guests who have been invited but not answered.
   * Respects opt-out; each guest gets each reminder once, even if the job runs many times a day.
   */
  async sendReminders(): Promise<{ sent: number; failed: number }> {
    const now = this.deps.now();
    const dayOf = (d: Date, tz: string) => Math.floor(toZoned(d, tz).getTime() / 86_400_000);
    const evs = await this.deps.db.select().from(events).where(eq(events.status, 'active'));
    const out = { sent: 0, failed: 0 };
    for (const event of evs) {
      // Only between 08:00 and 20:00 in the event's own time zone: nobody wants a reminder at night.
      const localHour = toZoned(now, event.timezone).getUTCHours();
      if (localHour < 8 || localHour >= 20) continue;
      const daysLeft = dayOf(event.dateStart, event.timezone) - dayOf(now, event.timezone);
      if (![14, 7, 1].includes(daysLeft)) continue;
      const kind = `reminder_${daysLeft}`;
      const rows = await this.deps.db
        .select({ guest: guests, inv: invitations })
        .from(guests)
        .innerJoin(invitations, eq(invitations.guestId, guests.id))
        .where(
          and(
            eq(guests.eventId, event.id),
            isNull(guests.deletedAt),
            eq(guests.remindersOptOut, false),
            inArray(invitations.status, ['sent', 'delivered', 'opened']),
          ),
        );
      const already = new Set(
        (
          await this.deps.db
            .select({ guestId: messageLog.guestId })
            .from(messageLog)
            .innerJoin(guests, eq(guests.id, messageLog.guestId))
            .where(and(eq(guests.eventId, event.id), eq(messageLog.kind, kind)))
        ).map((r) => r.guestId),
      );
      for (const { guest, inv } of rows) {
        if (!guest.phoneE164 || guest.inviteChannelPref === 'print' || already.has(guest.id))
          continue;
        const channels: MessageChannel[] =
          inv.channelLast === 'whatsapp' && this.deps.whatsapp ? ['whatsapp', 'sms'] : ['sms'];
        const r = await this.dispatch(guest, inv, event, kind, channels, daysLeft);
        out[r.ok ? 'sent' : 'failed']++;
      }
    }
    return out;
  }

  /** Polls the SMS gateway for reports on messages sent in the last 48 hours. */
  async pollSmsReports(limit = 200): Promise<number> {
    const report = this.deps.smsReport;
    if (!report) return 0;
    const since = new Date(this.deps.now().getTime() - 48 * 3_600_000);
    const rows = await this.deps.db
      .select({ id: messageLog.providerMsgId })
      .from(messageLog)
      .where(
        and(
          eq(messageLog.channel, 'sms'),
          eq(messageLog.status, 'sent'),
          gt(messageLog.createdAt, since),
        ),
      )
      .limit(limit);
    let n = 0;
    for (const r of rows) {
      if (!r.id) continue;
      try {
        const state = await report(r.id);
        if (state !== 'pending' && (await this.recordDelivery(r.id, state))) n++;
      } catch {
        // a failing report lookup is retried on the next tick
      }
    }
    return n;
  }

  /** The guest stops reminders from the card page; the invitation itself stays valid. */
  async optOutReminders(cardTokenHash: string): Promise<boolean> {
    const [inv] = await this.deps.db
      .select({ guestId: invitations.guestId })
      .from(invitations)
      .where(eq(invitations.tokenHash, cardTokenHash));
    if (!inv) return false;
    await this.deps.db
      .update(guests)
      .set({ remindersOptOut: true })
      .where(eq(guests.id, inv.guestId));
    return true;
  }

  /**
   * "Your balance is TZS …" to guests who still owe a pledge, with their card link to pay (§7.5).
   * Committee and owner only. A guest who opted out of reminders, has no phone, owes nothing, or
   * was already reminded in the last three days is skipped, so nobody is nagged.
   */
  async sendPledgeReminders(eventId: string, userId: string, guestIds: string[]) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot send reminders');
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const rows = await this.deps.db
      .select({ guest: guests, inv: invitations })
      .from(guests)
      .innerJoin(invitations, eq(invitations.guestId, guests.id))
      .where(
        and(eq(guests.eventId, eventId), isNull(guests.deletedAt), inArray(guests.id, guestIds)),
      );
    const since = new Date(this.deps.now().getTime() - 72 * 3_600_000);
    const recent = new Set(
      (
        await this.deps.db
          .select({ guestId: messageLog.guestId })
          .from(messageLog)
          .where(and(eq(messageLog.kind, 'pledge_reminder'), gt(messageLog.createdAt, since)))
      ).map((r) => r.guestId),
    );
    const [a = '', b = ''] = event.coupleNames.split('&').map((x) => x.trim());
    const out = { sent: 0, failed: 0, skipped: 0 };
    for (const { guest, inv } of rows) {
      const s = await pledgeSummaryOf(this.deps.db, guest.id);
      if (
        !guest.phoneE164 ||
        guest.remindersOptOut ||
        recent.has(guest.id) ||
        !s ||
        s.balanceTzs <= 0
      ) {
        out.skipped++;
        continue;
      }
      const tzs = (n: number) => formatMoney(n, event.currency);
      const link = `${this.deps.config.shortBaseUrl}/s/${await this.cardToken(inv)}`;
      const sw = guest.language === 'sw';
      const kind = eventKindLabel(event.eventKind, guest.language).toLowerCase();
      const hosts = hostNames(a, b);
      const text = sw
        ? `Habari ${guest.displayName}, mchango wa ${kind} ya ${hosts}: ahadi ${tzs(s.amountTzs)}, salio ${tzs(s.balanceTzs)}. Lipa hapa: ${link}`
        : `Hello ${guest.displayName}, your gift for the ${kind} of ${hosts}: pledged ${tzs(s.amountTzs)}, balance ${tzs(s.balanceTzs)}. Pay here: ${link}`;
      const channels: MessageChannel[] =
        inv.channelLast === 'whatsapp' && this.deps.whatsapp ? ['whatsapp', 'sms'] : ['sms'];
      const r = await this.dispatch(guest, inv, event, 'pledge_reminder', channels, undefined, {
        text,
        template: {
          kind: 'pledge',
          locale: guest.language,
          params: [guest.displayName, `${a} & ${b}`, tzs(s.amountTzs), tzs(s.balanceTzs), link],
        },
      });
      out[r.ok ? 'sent' : 'failed']++;
    }
    return out;
  }

  async send(eventId: string, userId: string, input: SendInput): Promise<SendSummary> {
    await this.assertCanSend(eventId, userId);
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');

    const rows = await this.deps.db
      .select({ guest: guests, inv: invitations })
      .from(guests)
      .innerJoin(invitations, eq(invitations.guestId, guests.id))
      .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));

    const t = input.target;
    const failedIds =
      t === 'failed'
        ? new Set(
            (
              await this.deps.db
                .select({ guestId: messageLog.guestId })
                .from(messageLog)
                .where(eq(messageLog.status, 'failed'))
            ).map((r) => r.guestId),
          )
        : null;
    const picked = rows.filter(({ guest, inv }) => {
      if (t === 'remaining') return inv.status === 'created';
      if (t === 'failed') return inv.status === 'created' && failedIds!.has(guest.id);
      if ('guestIds' in t) return t.guestIds.includes(guest.id);
      return guest.groupLabel === t.group && inv.status === 'created';
    });

    const summary: SendSummary = {
      total: picked.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      byChannel: { whatsapp: 0, sms: 0 },
      failures: [],
    };
    for (const { guest, inv } of picked) {
      const channels = this.channelsFor(guest, input.channel ?? 'auto');
      if (channels.length === 0) {
        summary.skipped++;
        continue;
      }
      const r = await this.dispatch(guest, inv, event, 'invite', channels);
      if (r.ok) {
        summary.sent++;
        summary.byChannel[r.channel === 'whatsapp' ? 'whatsapp' : 'sms']++;
      } else {
        summary.failed++;
        summary.failures.push({ guestId: guest.id, error: r.error });
      }
    }
    return summary;
  }

  /** Funnel counts by invitation status (§7.7). */
  async stats(eventId: string, userId: string) {
    await this.eventsSvc.role(eventId, userId);
    const rows = await this.deps.db
      .select({ status: invitations.status, n: sql<number>`count(*)::int` })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)))
      .groupBy(invitations.status);
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = r.n;
    const total = rows.reduce((n, r) => n + r.n, 0);
    const failedGuests = await this.deps.db
      .selectDistinct({ guestId: messageLog.guestId })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .innerJoin(invitations, eq(invitations.guestId, guests.id))
      .where(
        and(
          eq(guests.eventId, eventId),
          eq(messageLog.status, 'failed'),
          inArray(invitations.status, ['created', 'queued']),
        ),
      );
    const [people] = await this.deps.db
      .select({ n: sql<number>`coalesce(sum(${invitations.rsvpPartySize}), 0)::int` })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          inArray(invitations.status, ['confirmed', 'checked_in']),
        ),
      );
    const [feature] = await this.deps.db
      .select({ n: sql<number>`count(*)::int` })
      .from(guests)
      .where(
        and(eq(guests.eventId, eventId), isNull(guests.deletedAt), eq(guests.hasSmartphone, false)),
      );
    return {
      total,
      byStatus,
      failedMessages: failedGuests.length,
      headcountConfirmed: people?.n ?? 0,
      featurePhoneGuests: feature?.n ?? 0,
    };
  }
}
