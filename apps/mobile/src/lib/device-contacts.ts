import * as Contacts from 'expo-contacts';
import { cleanContacts, pickPhone, type ContactLite } from '@harusi/schemas/import';

export type DeviceContacts =
  | { status: 'ok'; contacts: ContactLite[]; limited: boolean }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable' };

/**
 * Reads the phone's address book (ADR 051): Android contacts, including Google accounts synced to the
 * phone, and the iPhone's contacts, including iCloud. Asks for read permission first, requests only the
 * name and phone-number fields, and keeps everything in memory on the phone. Nothing is sent until the
 * organizer confirms the people they picked on the import preview.
 */
export async function readDeviceContacts(): Promise<DeviceContacts> {
  if (!(await Contacts.isAvailableAsync().catch(() => false))) return { status: 'unavailable' };
  const perm = await Contacts.requestPermissionsAsync();
  if (perm.status !== 'granted') return { status: 'denied', canAskAgain: perm.canAskAgain };
  const res = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    sort: Contacts.SortTypes.FirstName,
  });
  return {
    status: 'ok',
    limited: perm.accessPrivileges === 'limited',
    contacts: cleanContacts(
      res.data.map((c) => ({
        name: c.name ?? '',
        phone: pickPhone(
          (c.phoneNumbers ?? []).map((p) => ({
            value: p.number ?? p.digits ?? '',
            label: p.isPrimary ? `main ${p.label ?? ''}` : p.label,
          })),
        ),
      })),
    ),
  };
}

/** iOS 18 "limited access": lets the organizer add more people to what the app may read. */
export async function askForMoreContacts(): Promise<void> {
  await Contacts.presentAccessPickerAsync().catch(() => undefined);
}
