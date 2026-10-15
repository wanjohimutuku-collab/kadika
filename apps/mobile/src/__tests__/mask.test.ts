import { describe, expect, it } from 'vitest';
import { applyMaskedInput, mask } from '../gate/mask';

describe('masked PIN input', () => {
  it('builds the PIN one digit at a time and shows only bullets', () => {
    let pin = '';
    for (const d of '8462') pin = applyMaskedInput(pin, mask(pin) + d);
    expect(pin).toBe('8462');
    expect(mask(pin)).toBe('••••');
  });
  it('handles backspace, select-all delete and a pasted number', () => {
    expect(applyMaskedInput('8462', '•••')).toBe('846'); // backspace
    expect(applyMaskedInput('8462', '')).toBe(''); // cleared
    expect(applyMaskedInput('', '123456')).toBe('123456'); // paste
    expect(applyMaskedInput('84', '••12')).toBe('8412');
  });
  it('ignores non-digits and stops at the maximum length', () => {
    expect(applyMaskedInput('84', '••a-b')).toBe('84');
    expect(applyMaskedInput('12345678', '••••••••9')).toBe('12345678');
  });
});
