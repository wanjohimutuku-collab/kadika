import { eq } from 'drizzle-orm';
import { createDb } from './client';
import { events, guests, signingKeys, users } from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const { db, pool } = createDb(url);

// Dev-only demo data. Idempotent: re-running does nothing once the demo event exists.
const OWNER_PHONE = '+255700000001';
const EVENT_TITLE = 'Demo Harusi';

try {
  await db
    .insert(users)
    .values({ name: 'Demo Organizer', phoneE164: OWNER_PHONE })
    .onConflictDoNothing();
  const [owner] = await db.select().from(users).where(eq(users.phoneE164, OWNER_PHONE));
  if (!owner) throw new Error('seed owner missing');

  const existing = await db.select().from(events).where(eq(events.ownerId, owner.id));
  if (existing.some((e) => e.title === EVENT_TITLE)) {
    console.log('seed: already present, skipping');
  } else {
    const [event] = await db
      .insert(events)
      .values({
        ownerId: owner.id,
        title: EVENT_TITLE,
        coupleNames: 'Amina & Juma',
        dateStart: new Date('2027-01-16T10:00:00+03:00'),
        venueName: 'Karimjee Hall, Dar es Salaam',
        status: 'draft',
      })
      .returning();
    if (!event) throw new Error('seed event missing');

    // Placeholder key material only; real Ed25519 keys are generated in Phase 1.
    const [key] = await db
      .insert(signingKeys)
      .values({
        eventId: event.id,
        publicKey: 'seed-placeholder-public-key',
        privateKeyEncrypted: 'seed-placeholder-not-a-real-key',
      })
      .returning();
    if (key) await db.update(events).set({ signingKeyId: key.id }).where(eq(events.id, event.id));

    await db.insert(guests).values([
      {
        eventId: event.id,
        displayName: 'Asha Mwinyi',
        phoneE164: '+255700000002',
        shortCode: 'KH-4826',
      },
      {
        eventId: event.id,
        displayName: 'Baraka Joseph',
        phoneE164: '+255700000003',
        shortCode: 'KH-7392',
      },
      { eventId: event.id, displayName: 'Mama Neema', shortCode: 'KH-5546', hasSmartphone: false },
    ]);
    console.log('seed: demo event created');
  }
} finally {
  await pool.end();
}
