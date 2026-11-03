import { describe, expect, it } from 'vitest';
import type { Deps } from './context';
import { applyMessaging, type MessagingSettings } from './services/messaging-settings';

const settings = (ke: MessagingSettings['sms_ke']): MessagingSettings => ({
  sms_tz: { provider: 'fake', fields: {} },
  sms_ke: ke,
  whatsapp: { provider: 'fake', fields: {} },
});

/** Kenyan organisers sign in even with Kenya off; their codes need the Africa's Talking route. */
describe('Kenyan SMS route with Kenya off', () => {
  it("is built when Africa's Talking is set up", () => {
    const deps = { config: { kenyaEnabled: false } } as unknown as Deps;
    applyMessaging(
      deps,
      settings({ provider: 'africastalking', fields: { username: 'kadi', apiKey: 'k-123' } }),
    );
    expect(deps.smsByCountry?.KE?.name).toBe('africastalking');
  });

  it('is left out otherwise, so no Kenyan code goes out through a fake', () => {
    const deps = { config: { kenyaEnabled: false } } as unknown as Deps;
    applyMessaging(deps, settings({ provider: 'fake', fields: {} }));
    expect(deps.smsByCountry?.KE).toBeUndefined();
  });
});
