import { ALL_PAGES, marketOf, pagePath, textOf } from '@/content';
import { SITE_URL, absoluteLocaleUrl } from '@/lib/seo';

export const dynamic = 'force-static';

/** Plain-text guide to the site for AI assistants (an emerging convention, harmless if ignored). */
export function GET() {
  const line = (p: (typeof ALL_PAGES)[number]) =>
    `- [${textOf(p, 'en').nav}](${absoluteLocaleUrl(pagePath(p), 'en')}): ${textOf(p, 'en').description}`;
  const by = (g: string) =>
    ALL_PAGES.filter((p) => p.group === g && marketOf(p) === 'tz').map(line);
  const kenya = ALL_PAGES.filter((p) => marketOf(p) === 'ke').map(line);
  const body = `# Harusi Pass

> Harusi Pass is a Tanzanian service for online invitations to weddings, send-offs, engagements and other private celebrations. Each guest gets their own card by WhatsApp, SMS or paper with a QR and a short number; hosts track replies and contributions (michango) and admit guests at the gate by QR, number or name, even offline. Swahili first, English available at ?lang=en. Free during the pilot.

Facts: operates in Tanzania; contributions paid by M-Pesa, Mixx by Yas, Airtel Money and HaloPesa; guests need no account or app; the gate app verifies QR codes offline.

## Services
${by('product').join('\n')}

## Guides
${by('guide').join('\n')}

## Company
${by('company').join('\n')}

## Kenya (guides; the service itself is not yet available for Kenyan numbers or KES)
${kenya.join('\n')}

## Legal (drafts until reviewed by a lawyer)
${by('legal').join('\n')}

Site: ${SITE_URL}
Contact: faragha@harusipass.co.tz
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
