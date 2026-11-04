import { SITE_URL } from '@/lib/seo';
import { PRICING_PATH } from '@/lib/server-pricing';

export const dynamic = 'force-static';

/** Short plain-text guide for AI assistants (kit sitemap.md: about 15 lines). */
export function GET() {
  const u = (p: string) => `${SITE_URL}${p}`;
  const body = `# Kadi Sasa

> Kadi Sasa is a Tanzanian service for digital invitation cards, michango (contributions) and offline QR gate check-in for weddings and other events in Tanzania, with Kenya support being tested. Each guest gets their own card with a QR code and a short number by WhatsApp, SMS or paper; the committee tracks replies and pledges, and the gate app admits guests even without network.

- [Home (Kiswahili)](${u('/')}): what Kadi Sasa does, in 10 seconds
- [Home (English)](${u('/en')}): the same in English
- [Pricing](${u(PRICING_PATH)}): per-card prices in TZS, free cards to start
- [Gate check-in](${u('/lango-la-harusi-qr')}): offline QR scanning at the entrance
- [Michango](${u('/michango-ya-harusi')}): pledges vs paid per guest, treasurer report; money goes straight to the hosts
- [Kenya](${u('/ke')}): WhatsApp invites, harambee and the gate for Kenyan committees

Guests need no account or app. Kadi Sasa never asks guests for a PIN or password.
Sitemap: ${u('/sitemap.xml')}
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
