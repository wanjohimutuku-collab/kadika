import { describe, expect, it } from 'vitest';
import { fromPeople } from './google-contacts';

describe('Google People API mapping', () => {
  it('keeps the display name and prefers a mobile number', () => {
    expect(
      fromPeople([
        {
          names: [{ displayName: 'Asha Mwinyi' }],
          phoneNumbers: [
            { value: '022 211 0000', type: 'home' },
            { value: '0712 345 678', type: 'mobile' },
          ],
        },
        { names: [{ displayName: 'Bibi Zuhura' }] },
        { phoneNumbers: [{ value: '0754 000 000' }] },
      ]),
    ).toEqual([
      { name: 'Asha Mwinyi', phone: '0712 345 678' },
      { name: 'Bibi Zuhura', phone: '' },
      { name: '', phone: '0754 000 000' },
    ]);
  });
});
