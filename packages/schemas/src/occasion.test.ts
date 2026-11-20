import { describe, expect, it } from 'vitest';
import { occasionOf, allowsDonations, isInvitationFirstOccasion } from './domain';

describe('occasionOf', () => {
  it('maps the known card categories', () => {
    expect(occasionOf('Harusi')).toBe('wedding');
    expect(occasionOf(null)).toBe('wedding');
    expect(occasionOf('Uchumba')).toBe('engagement');
    expect(occasionOf('Send-off')).toBe('sendoff');
    expect(occasionOf('Corporate Invites')).toBe('corporate');
    expect(occasionOf('Kampuni')).toBe('corporate');
    expect(occasionOf('Graduation')).toBe('other');
  });
});

describe('allowsDonations', () => {
  it('disallows donations for invitation-first events unless aim is collecting contributions', () => {
    // By default without pledgesEnabled=true, contribution options disappear
    expect(allowsDonations('Harusi')).toBe(false);
    expect(allowsDonations('Wedding')).toBe(false);
    expect(allowsDonations('wedding')).toBe(false);
    expect(allowsDonations(null)).toBe(false);
    expect(allowsDonations('')).toBe(false);
    expect(allowsDonations('Send-off')).toBe(false);
    expect(allowsDonations('sendoff')).toBe(false);
    expect(allowsDonations('Kitchen party')).toBe(false);
    expect(allowsDonations('Uchumba')).toBe(false);
    expect(allowsDonations('Engagement')).toBe(false);
    expect(allowsDonations('Corporate Invites')).toBe(false);
    expect(allowsDonations('Kampuni')).toBe(false);
    expect(allowsDonations('Corporate', false)).toBe(false);
  });

  it('allows donations when the aim IS collecting contributions', () => {
    expect(allowsDonations('Harusi', true)).toBe(true);
    expect(allowsDonations('Wedding', true)).toBe(true);
    expect(allowsDonations('Send-off', true)).toBe(true);
    expect(allowsDonations('Engagement', true)).toBe(true);
    expect(allowsDonations('Corporate Invites', true)).toBe(true);
    expect(allowsDonations({ eventKind: 'Harusi', pledgesEnabled: true })).toBe(true);
    expect(allowsDonations({ eventKind: 'Corporate Invites', pledgesEnabled: true })).toBe(true);
    expect(allowsDonations({ eventKind: 'Corporate Invites', pledgesEnabled: false })).toBe(false);
  });

  it('allows donations for other fundraisers / community events by default', () => {
    expect(allowsDonations('Fundraiser')).toBe(true);
    expect(allowsDonations('Harambee')).toBe(true);
    expect(allowsDonations('Memorial')).toBe(true);
    expect(allowsDonations('Chama')).toBe(true);
    expect(allowsDonations('Fundraiser', false)).toBe(false);
  });
});

describe('isInvitationFirstOccasion', () => {
  it('identifies wedding, send-off, engagement, and corporate occasions', () => {
    expect(isInvitationFirstOccasion('wedding')).toBe(true);
    expect(isInvitationFirstOccasion('sendoff')).toBe(true);
    expect(isInvitationFirstOccasion('engagement')).toBe(true);
    expect(isInvitationFirstOccasion('corporate')).toBe(true);
    expect(isInvitationFirstOccasion('fundraiser')).toBe(false);
  });
});

describe('eventKindLabel', () => {
  it('shows the known kinds in the reader language and leaves custom kinds alone', async () => {
    const { eventKindLabel } = await import('./domain');
    expect(eventKindLabel('Wedding', 'sw')).toBe('Harusi');
    expect(eventKindLabel('Uchumba', 'en')).toBe('Engagement');
    expect(eventKindLabel('Corporate Invites', 'sw')).toBe('Kampuni');
    expect(eventKindLabel('Kampuni', 'en')).toBe('Corporate Invites');
    expect(eventKindLabel('', 'en')).toBe('Wedding');
    expect(eventKindLabel('Kitchen party', 'sw')).toBe('Kitchen party');
  });
});
