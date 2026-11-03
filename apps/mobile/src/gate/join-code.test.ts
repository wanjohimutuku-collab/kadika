import { describe, expect, it } from 'vitest';
import { gateCodeFrom } from './join-code';

describe('gateCodeFrom', () => {
  it('takes the code from a typed code or a pasted link', () => {
    expect(gateCodeFrom(' ab3def7h ')).toBe('AB3DEF7H');
    expect(gateCodeFrom('https://kadisasa.com/gate-join/AB3DEF7H')).toBe('AB3DEF7H');
    expect(gateCodeFrom('harusipass://gate-join/ab3def7h?x=1')).toBe('AB3DEF7H');
    expect(gateCodeFrom('Kiungo: https://kadisasa.com/gate-join/AB3DEF7H  PIN 123456')).toBe(
      'AB3DEF7H',
    );
  });
});
