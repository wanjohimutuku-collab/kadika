import { describe, expect, it } from 'vitest';
import {
  decryptEngagement,
  decryptForEvent,
  decryptForUser,
  encryptEngagement,
  encryptForEvent,
  encryptForUser,
} from './crypto-at-rest';

const MASTER = Buffer.from(new Uint8Array(32).fill(7)).toString('base64');

describe('per-user, per-event, and per-engagement encryption isolation', () => {
  it('isolates event data per eventId and context', async () => {
    const sealed = await encryptForEvent('event-A', 'secret-event-payload', MASTER, 'cardContent');
    expect(await decryptForEvent('event-A', sealed, MASTER, 'cardContent')).toBe(
      'secret-event-payload',
    );
    await expect(decryptForEvent('event-B', sealed, MASTER, 'cardContent')).rejects.toThrow();
    await expect(decryptForEvent('event-A', sealed, MASTER, 'otherField')).rejects.toThrow();
  });

  it('isolates user data per userId and context', async () => {
    const sealed = await encryptForUser('user-1', '+255700000001', MASTER, 'phone');
    expect(await decryptForUser('user-1', sealed, MASTER, 'phone')).toBe('+255700000001');
    await expect(decryptForUser('user-2', sealed, MASTER, 'phone')).rejects.toThrow();
    await expect(decryptForUser('user-1', sealed, MASTER, 'email')).rejects.toThrow();
  });

  it('isolates engagement payloads per eventId + guestId + context', async () => {
    const sealed = await encryptEngagement(
      'event-A',
      'guest-1',
      JSON.stringify({ rsvp: 'confirmed', partySize: 2 }),
      MASTER,
      'rsvp',
    );
    expect(await decryptEngagement('event-A', 'guest-1', sealed, MASTER, 'rsvp')).toBe(
      JSON.stringify({ rsvp: 'confirmed', partySize: 2 }),
    );
    await expect(decryptEngagement('event-B', 'guest-1', sealed, MASTER, 'rsvp')).rejects.toThrow();
    await expect(decryptEngagement('event-A', 'guest-2', sealed, MASTER, 'rsvp')).rejects.toThrow();
    await expect(
      decryptEngagement('event-A', 'guest-1', sealed, MASTER, 'checkin'),
    ).rejects.toThrow();
  });
});
