import { createSeedState, MockRepository } from '@harusi/api-client/mock';
import type { CardView } from '@harusi/api-client';
import type { ThemeId } from '@harusi/ui-tokens/themes';

/**
 * A `CardView` seeded from the mock repo, with the four fields that the home-hero inputs drive
 * (names, date, event kind, theme) overridden. Reused by the `/jaribu` route (server) and by the
 * `<HeroLive>` preview (client). Pure, isomorphic, deterministic.
 */

export type DemoEventType =
  | 'harusi'
  | 'send-off'
  | 'kitchen-party'
  | 'nikah'
  | 'uchumba'
  | 'kuzaliwa'
  | 'mahafali';

export interface DemoInput {
  names: string;
  dateISO: string;
  eventType: DemoEventType;
}

export const DEMO_EVENT_TYPES = [
  'harusi',
  'send-off',
  'kitchen-party',
  'nikah',
  'uchumba',
  'kuzaliwa',
  'mahafali',
] as const satisfies readonly DemoEventType[];

/** Not a signed token: deliberately shaped unlike real `v1.<eventId>.<guestId>.<party>.<ver>.<sig>`. */
export const DEMO_QR_PAYLOAD = 'v1.demo.demo.1.1.DEMO';

/** One of the four production themes (ADR 006) per event kind, plus a cover-gradient override. */
export const DEMO_THEME_BY_EVENT: Record<
  DemoEventType,
  { themeId: ThemeId; coverGradient: string }
> = {
  harusi: {
    themeId: 'emerald-gold',
    coverGradient: 'linear-gradient(135deg,#0F5C4D 0%,#B8893B 100%)',
  },
  'send-off': {
    themeId: 'rose-sage',
    coverGradient: 'linear-gradient(135deg,#8C3B57 0%,#5E7A5E 100%)',
  },
  'kitchen-party': {
    themeId: 'terracotta',
    coverGradient: 'linear-gradient(135deg,#9A3B1F 0%,#C98A5A 100%)',
  },
  nikah: {
    themeId: 'emerald-gold',
    coverGradient: 'linear-gradient(135deg,#0F5C4D 0%,#B8893B 100%)',
  },
  uchumba: {
    themeId: 'navy-silver',
    coverGradient: 'linear-gradient(135deg,#1F3A5F 0%,#8A96A3 100%)',
  },
  kuzaliwa: {
    themeId: 'terracotta',
    coverGradient: 'linear-gradient(135deg,#9A3B1F 0%,#C98A5A 100%)',
  },
  mahafali: {
    themeId: 'navy-silver',
    coverGradient: 'linear-gradient(135deg,#1F3A5F 0%,#8A96A3 100%)',
  },
};

const EVENT_KIND_BY_TYPE: Record<DemoEventType, string> = {
  harusi: 'Harusi',
  'send-off': 'Send-off',
  'kitchen-party': 'Kitchen party',
  nikah: 'Nikah',
  uchumba: 'Uchumba',
  kuzaliwa: 'Siku ya kuzaliwa',
  mahafali: 'Mahafali',
};

function splitNames(names: string): { a: string; b: string; joined: string } {
  const joined = (names || '').trim() || 'Asha & Juma';
  const parts = joined.split(/\s*[&+]\s*/).filter(Boolean);
  const [a, b] = parts.length >= 2 ? [parts[0]!, parts[1]!] : ['Asha', 'Juma'];
  return { a, b, joined };
}

function sanitiseDate(dateISO: string): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.valueOf())) {
    const fallback = new Date('2026-12-19T14:00:00Z');
    return fallback.toISOString();
  }
  // If only a date was passed, anchor at 14:00 UTC so the local time reads predictably.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return new Date(`${dateISO}T14:00:00Z`).toISOString();
  }
  return d.toISOString();
}

let cachedBase: CardView | null = null;

function baseView(): CardView {
  if (cachedBase) return cachedBase;
  const seed = createSeedState();
  const repo = new MockRepository({ initialState: seed });
  // Any delivered guest from the seed yields a complete CardView; the demo overrides only the fields
  // we want to personalise and leaves everything else intact.
  const guest = seed.guests.find((g) => g.status === 'delivered') ?? seed.guests[0]!;
  cachedBase = repo.peekCard(guest.token);
  return cachedBase;
}

export function buildDemoCardView(input: DemoInput): CardView {
  const base = baseView();
  const { a, b, joined } = splitNames(input.names);
  const theme = DEMO_THEME_BY_EVENT[input.eventType];
  const dateStart = sanitiseDate(input.dateISO);
  if (!base.event || !base.guest) return base;
  return {
    ...base,
    token: 'demo',
    state: 'ok',
    isMock: true,
    qrPayload: DEMO_QR_PAYLOAD,
    event: {
      ...base.event,
      eventKind: EVENT_KIND_BY_TYPE[input.eventType],
      partnerA: a,
      partnerB: b,
      coupleNames: joined,
      dateStart,
      themeId: theme.themeId,
      coverGradient: theme.coverGradient,
      palette: {},
    },
    guest: {
      ...base.guest,
      displayName: 'Mgeni wa Majaribio',
      shortCode: 'DEMO-0001',
    },
  };
}
