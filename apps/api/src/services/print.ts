import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { events, guests } from '@harusi/db';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { buildCardsPdf, buildTestSheetPdf, type CardData } from '../print/pdf';
import type { PrintFormat } from '../print/spec';
import { dateText } from './delivery';
import type { EventService } from './events';
import type { GuestService } from './guests';

const MAX_CARDS = 1000;

/** Print cards (§17.7): one personalised card per guest with the signed QR and short code. */
export class PrintService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
    private guestsSvc: GuestService,
  ) {}

  async pdf(
    eventId: string,
    userId: string,
    input: { format: PrintFormat; guestIds?: string[] },
  ): Promise<{ bytes: Uint8Array; filename: string }> {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot print cards');
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const slug =
      event.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'harusi';

    const rows = await this.deps.db
      .select()
      .from(guests)
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          input.guestIds ? inArray(guests.id, input.guestIds) : undefined,
        ),
      )
      .orderBy(asc(guests.displayName), asc(guests.id))
      .limit(MAX_CARDS + 1);
    if (rows.length > MAX_CARDS)
      throw new ApiError('validation', `At most ${MAX_CARDS} cards per PDF`);
    if (input.format === 'test') {
      const sample = rows[0];
      if (!sample)
        throw new ApiError('validation', 'Add a guest first: the test sheet uses a real code');
      const { token } = await this.guestsSvc.qrToken(sample.id, userId);
      return { bytes: await buildTestSheetPdf(token), filename: `${slug}-test-sheet.pdf` };
    }
    if (rows.length === 0) throw new ApiError('validation', 'No guests to print');

    const cards: CardData[] = [];
    for (const g of rows) {
      const { token } = await this.guestsSvc.qrToken(g.id, userId);
      cards.push({
        coupleNames: event.coupleNames,
        guestName: g.displayName,
        shortCode: g.shortCode,
        qrToken: token,
        dateText: dateText(event.dateStart, g.language, event.timezone),
        venue: event.venueName ?? '',
        dressCode: event.dressCode ?? '',
        committeePhone: event.committeePhone ?? '',
        language: g.language,
      });
    }
    const bytes = await buildCardsPdf(input.format, cards);
    const filename =
      rows.length === 1 ? `${slug}-${rows[0]!.shortCode}.pdf` : `${slug}-${input.format}-batch.pdf`;
    return { bytes, filename };
  }
}
