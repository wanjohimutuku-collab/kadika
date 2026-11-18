import { describe, expect, it } from 'vitest';
import { nextStep, type NextStepStats } from './next-step';

const base: NextStepStats = {
  invited: 10,
  sent: 10,
  confirmed: 10,
  declined: 0,
  failedMessages: 0,
  guestsWithBalance: 0,
  contributionGuests: 0,
};
const at = (stats: Partial<NextStepStats>, days: number) =>
  nextStep('e1', { ...base, ...stats }, days);

describe('nextStep', () => {
  it('asks for a guest list on an empty upcoming event', () => {
    expect(at({ invited: 0, sent: 0, confirmed: 0 }, 30).key).toBe('import');
  });

  it('asks for invitation guests when only contribution cards exist', () => {
    const s = at({ invited: 0, sent: 0, confirmed: 0, contributionGuests: 3 }, 30);
    expect(s.key).toBe('addInvites');
    expect(s.href).toBe('/app/e/e1/guests/new');
  });

  it('keeps the pre-event steps while the event is ahead', () => {
    expect(at({ sent: 4, confirmed: 4 }, 30)).toMatchObject({ key: 'send', count: 6 });
    expect(at({ confirmed: 2 }, 10)).toMatchObject({ key: 'remind', count: 8 });
    expect(at({}, 3).key).toBe('gate');
  });

  it('never suggests importing, sending or reminding after the event', () => {
    expect(at({ invited: 0, sent: 0, confirmed: 0 }, -5).key).toBe('past');
    expect(at({ sent: 4, confirmed: 4 }, -5).key).toBe('past');
    expect(at({ failedMessages: 2 }, -5).key).toBe('past');
  });

  it('still follows up unpaid contributions after the event', () => {
    expect(at({ guestsWithBalance: 4 }, -5)).toMatchObject({ key: 'pledges', count: 4 });
  });

  it('treats the event day as upcoming', () => {
    expect(at({}, 0).key).toBe('gate');
  });
});
