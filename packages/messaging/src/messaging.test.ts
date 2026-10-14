import { describe, expect, it } from 'vitest';
import { FakeMessagingProvider } from './index';

describe('FakeMessagingProvider', () => {
  it('records messages and can fail on demand', async () => {
    const p = new FakeMessagingProvider('sms', (to) => to === '+255700000000');
    expect((await p.send('+255712345678', 'hi')).providerMsgId).toBe('fake-1');
    expect(p.lastTo('+255712345678')).toBe('hi');
    await expect(p.send('+255700000000', 'x')).rejects.toThrow();
    expect(p.sent).toHaveLength(1);
  });
});
