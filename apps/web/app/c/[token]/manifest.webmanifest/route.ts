import { eventKindOf } from '@harusi/schemas';
import { previewCardOnServer } from '@/lib/server-card';

/** Per-card PWA manifest so "Add to home screen" opens this guest's card (§7.3). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = await previewCardOnServer(token);
  const name =
    v?.state === 'ok' && v.event
      ? `${eventKindOf(v.event.eventKind, 'sw')} ${v.event.coupleNames}`
      : 'Kadi ya mwaliko';
  const body = {
    name,
    short_name: v?.state === 'ok' && v.event ? v.event.coupleNames : 'Kadi',
    start_url: `/c/${token}`,
    scope: '/c/',
    display: 'standalone',
    background_color: '#FBF8F3',
    theme_color: '#0F5C4D',
    lang: 'sw',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
