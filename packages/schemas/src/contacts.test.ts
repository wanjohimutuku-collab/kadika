import { describe, expect, it } from 'vitest';
import {
  CONTACTS_MAX,
  cleanContacts,
  contactsToRows,
  fromGoogleContactsCsv,
  isGoogleContactsCsv,
  parseVCard,
  pickPhone,
} from './contacts';
import { parseCsv } from './import';

describe('vCard import', () => {
  it('reads an iPhone/iCloud vCard 3.0 export, preferring the mobile number', () => {
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Mwinyi;Asha;;;',
      'FN:Asha Mwinyi',
      'item1.TEL;type=HOME;type=VOICE:022 211 0000',
      'item2.TEL;type=CELL;type=VOICE;type=pref:+255 712 345 678',
      'PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQAAAQABAAD',
      ' MOREPHOTODATA',
      'ADR;type=HOME:;;Mtaa wa Uhuru;Dar es Salaam;;;Tanzania',
      'END:VCARD',
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Joseph;Baraka;;;',
      'TEL;type=CELL:0754123456',
      'END:VCARD',
    ].join('\r\n');
    expect(parseVCard(vcf)).toEqual([
      { name: 'Asha Mwinyi', phone: '+255 712 345 678' },
      { name: 'Baraka Joseph', phone: '0754123456' },
    ]);
  });

  it('reads vCard 4.0 tel: URIs, folded lines and escapes', () => {
    const vcf =
      'BEGIN:VCARD\nVERSION:4.0\nFN:Mama Neema\\, Mwalimu\nTEL;VALUE=uri;TYPE="cell,voice":tel:+255-688-1\n 23-456\nEND:VCARD\n';
    expect(parseVCard(vcf)).toEqual([{ name: 'Mama Neema, Mwalimu', phone: '+255-688-123-456' }]);
  });

  it('decodes vCard 2.1 QUOTED-PRINTABLE names from older Android phones', () => {
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:2.1',
      'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Mw=C3=A1kilema;Juma;;;',
      'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Juma Mw=C3=A1kilema',
      'TEL;CELL:0713220118',
      'END:VCARD',
    ].join('\n');
    expect(parseVCard(vcf)).toEqual([{ name: 'Juma Mwákilema', phone: '0713220118' }]);
  });

  it('keeps people without a number, skips nameless cards and repeats', () => {
    const vcf =
      'BEGIN:VCARD\nFN:Bibi Zuhura\nEND:VCARD\nBEGIN:VCARD\nTEL:0712000000\nEND:VCARD\n' +
      'BEGIN:VCARD\nFN:Kaka Salum\nTEL:0754 330 912\nEND:VCARD\nBEGIN:VCARD\nFN:Salum\nTEL:0754330912\nEND:VCARD\n';
    expect(parseVCard(vcf)).toEqual([
      { name: 'Bibi Zuhura', phone: '' },
      { name: 'Kaka Salum', phone: '0754 330 912' },
    ]);
  });

  it('ignores text that is not a vCard', () => {
    expect(parseVCard('Jina,Simu\nAsha,0712345678')).toEqual([]);
  });
});

describe('Google Contacts CSV', () => {
  it('detects the export and reads First/Last names and labelled phones', () => {
    const rows = parseCsv(
      'First Name,Middle Name,Last Name,Phone 1 - Label,Phone 1 - Value,Phone 2 - Label,Phone 2 - Value\n' +
        'Asha,,Mwinyi,Home,022 211 0000,Mobile,0712 345 678\n' +
        'Baraka,,Joseph,Mobile,0754 123 456 ::: 0688 000 111,,\n',
    );
    expect(isGoogleContactsCsv(rows[0]!)).toBe(true);
    expect(fromGoogleContactsCsv(rows)).toEqual([
      { name: 'Asha Mwinyi', phone: '0712 345 678' },
      { name: 'Baraka Joseph', phone: '0754 123 456' },
    ]);
  });

  it('reads the older single Name column', () => {
    const rows = parseCsv(
      'Name,Given Name,Phone 1 - Type,Phone 1 - Value\nMama Neema,Neema,Mobile,0688123456\n',
    );
    expect(fromGoogleContactsCsv(rows)).toEqual([{ name: 'Mama Neema', phone: '0688123456' }]);
  });

  it('does not claim our own CSV template', () => {
    expect(isGoogleContactsCsv(['Jina', 'Simu', 'Kikundi', 'Idadi'])).toBe(false);
  });
});

describe('contact helpers', () => {
  it('picks a mobile number, else the first', () => {
    expect(
      pickPhone([
        { value: '022', label: 'work' },
        { value: '0712', label: 'CELL' },
      ]),
    ).toBe('0712');
    expect(pickPhone([{ value: ' ' }, { value: '0754' }])).toBe('0754');
    expect(pickPhone([])).toBe('');
  });

  it('caps very large address books', () => {
    const many = Array.from({ length: CONTACTS_MAX + 10 }, (_, i) => ({
      name: `M ${i}`,
      phone: `${i}`,
    }));
    expect(cleanContacts(many)).toHaveLength(CONTACTS_MAX);
  });

  it('turns contacts into name, phone rows', () => {
    expect(contactsToRows([{ name: 'Asha', phone: '0712' }])).toEqual([['Asha', '0712']]);
  });
});
