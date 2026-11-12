import { z } from 'zod';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { themeIds, type ThemeId } from '@harusi/ui-tokens/themes';
import { messages } from '@harusi/i18n';
import { renderCard, shell, esc } from '@/lib/light-card/render';
import { brandOf, localeOf, API_URL } from '@/lib/light-card/route-utils';
import { buildDemoCardView, DEMO_EVENT_TYPES, type DemoEventType } from '@/lib/demo-card';
import { APP_DOMAIN } from '@/lib/env';

/**
 * `/jaribu` and `/en/jaribu` — a public demo card the visitor can share around. The query string
 * drives the four fields that the home-hero's inputs drive (names, date, event kind). Everything
 * else comes from the mock seed, so the renderer stays authoritative. Set noindex at both the HTTP
 * header and (via `shell()`) the HTML meta tag.
 */

export const dynamic = 'force-dynamic';

const nextSixtyDays = () => {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
};

const input = z.object({
  names: z.string().trim().min(1).max(60).catch('Asha & Juma'),
  date: z
    .string()
    .refine((s) => !Number.isNaN(new Date(s).valueOf()), { message: 'bad date' })
    .catch(() => nextSixtyDays()),
  event: z.enum(DEMO_EVENT_TYPES).catch('harusi' satisfies DemoEventType),
  theme: z
    .enum(themeIds as [string, ...string[]])
    .optional()
    .catch(undefined),
});

const BANNERS = {
  sw: {
    text: 'Hii ni kadi ya majaribio. Pata yako — ',
    cta: 'Anza bure',
    href: '/login',
  },
  en: {
    text: 'This is a demo card. Make yours — ',
    cta: 'Start free',
    href: '/en/login',
  },
};

function banner(locale: 'sw' | 'en'): string {
  const b = BANNERS[locale];
  return `<div role="status" style="background:#0F5C4D;color:#fff;padding:14px 20px;text-align:center;font:600 15px/1.4 system-ui">${esc(b.text)}<a href="${b.href}" style="color:#fff;text-decoration:underline">${esc(b.cta)}</a></div>`;
}

export async function GET(req: Request) {
  const locale = localeOf(req);
  const url = new URL(req.url);
  const parsed = input.parse({
    names: url.searchParams.get('names') ?? '',
    date: url.searchParams.get('date') ?? '',
    event: url.searchParams.get('event') ?? '',
    theme: url.searchParams.get('theme') ?? undefined,
  });
  const brand = await brandOf();
  const view = buildDemoCardView({
    names: parsed.names,
    dateISO: parsed.date,
    eventType: parsed.event,
    themeId: parsed.theme as ThemeId | undefined,
  });
  const inner = renderCard(view, {
    token: 'demo',
    locale,
    domain: APP_DOMAIN,
    brand,
    mode: 'mock',
    apiUrl: API_URL,
  });
  const palette = resolvePalette(view.event?.themeId, view.event?.palette);
  const titleKey = (messages[locale].card as Record<string, string>).title ?? 'Mwaliko';
  const body = shell({
    locale,
    title: `${titleKey} · Jaribu`,
    palette,
    body: banner(locale) + inner,
  });
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
