import { describe, expect, it } from 'vitest';
import { gateAppIntent, gateJoinCode } from './gate-join';

describe('gate join link', () => {
  it('tidies the code from the URL', () => {
    expect(gateJoinCode('ab3d-ef7h')).toBe('AB3DEF7H');
    expect(gateJoinCode('%3Cscript%3E')).toBe('SCRIPT');
    expect(gateJoinCode('A'.repeat(40))).toHaveLength(16);
  });

  it('opens the app on the join screen, falling back to the download page', () => {
    expect(gateAppIntent('AB3DEF7H', 'https://kadisasa.com/programu')).toBe(
      'intent://gate-join/AB3DEF7H#Intent;scheme=harusipass;package=app.harusipass.mobile;' +
        'S.browser_fallback_url=https%3A%2F%2Fkadisasa.com%2Fprogramu;end',
    );
    expect(gateAppIntent('AB3DEF7H', null)).not.toContain('browser_fallback_url');
  });
});
