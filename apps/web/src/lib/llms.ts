import { ALL_PAGES, marketOf, pagePath } from '@/content';
import type { Block, ContentPageDef, PageText } from '@/content/types';
import { SITE_URL } from '@/lib/seo';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { PRICING_PATH } from '@/lib/server-pricing';

/**
 * llms.txt and llms-full.txt (llmstxt.org): a plain map of the site for AI assistants, built from the same
 * content as the pages so it never drifts. No ranking weight for Google; it helps other assistants find and
 * quote the right page.
 */

const u = (p: string) => `${SITE_URL}${p === '/' ? '' : p}`;
/** English edition URL of a Tanzania page; Kenya pages are English already. */
const enUrl = (p: ContentPageDef) => u(marketOf(p) === 'ke' ? pagePath(p) : `/en${pagePath(p)}`);

export const SUMMARY =
  'Kadi Sasa is a Tanzanian service for digital invitation cards, michango (wedding contributions) and offline QR gate check-in, for weddings and other events in Tanzania, with Kenya support in pilot. Every guest gets their own card with a QR code and a short card number (for example KH-4826) by WhatsApp, SMS or on paper. The committee tracks replies, party sizes and pledges, and any committee phone becomes the gate, scanning even with no network.';

export const FACTS = [
  'Languages: Swahili first, English one tap away. Currency: TZS in Tanzania, KES in Kenya.',
  'Delivery: WhatsApp, SMS (works on any phone, including basic feature phones) and printable paper cards with the same QR and card number.',
  'Guests need no account and no app. Kadi Sasa never asks guests for a PIN, password or OTP.',
  'Gate: the Android app downloads the guest list and the event public key, verifies signed QR codes offline, and syncs scans when the network returns. One QR admits once; a repeat shows "Already admitted" with the time.',
  'Gate fallbacks: scan the QR, type the card number, search by name or the last four phone digits, or a logged manual override by the committee.',
  'Contributions (michango): guests pay the hosts directly (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, bank or cash). Kadi Sasa keeps only encrypted records, visible to the hosts and committee, and takes no percentage.',
  'Apps: a web console in the browser and an Android app (Android 8 and newer) for hosts, committee and gate staff. Gate staff join with a link and a PIN.',
  'Data protection: follows the Tanzania Personal Data Protection Act; guests and hosts can request export or deletion.',
];

const label = (p: ContentPageDef) => p.en.nav;
const desc = (t: PageText) => t.description;

function section(title: string, pages: ContentPageDef[]) {
  if (!pages.length) return '';
  return `## ${title}\n\n${pages.map((p) => `- [${label(p)}](${enUrl(p)}): ${desc(p.en)}`).join('\n')}\n`;
}

export function llmsTxt(): string {
  const tz = (g: ContentPageDef['group']) =>
    ALL_PAGES.filter((p) => marketOf(p) === 'tz' && p.group === g);
  const ke = ALL_PAGES.filter((p) => marketOf(p) === 'ke' && p.group !== 'legal');
  return `# Kadi Sasa

> ${SUMMARY}

## Key facts

${FACTS.map((f) => `- ${f}`).join('\n')}

## Main pages

- [Home (Kiswahili)](${u('/')}): what Kadi Sasa does, in Swahili
- [Home (English)](${u('/en')}): the same in English
- [Pricing](${u(`/en${PRICING_PATH}`)}): per-card prices in TZS, free cards to start
- [Android app](${u(`/en${APP_DOWNLOAD_PATH}`)}): the organizer and gate app
- [Check a card by its number](${u('/k')}): guests open their card with the short number

${section('Products and occasions', tz('product'))}
${section('Guides', tz('guide'))}
${section('Company', tz('company'))}
${section('Kenya (pilot)', ke)}
## Optional

- [Full text of every guide](${u('/llms-full.txt')}): all pages above as plain Markdown, English edition
- [Sitemap](${u('/sitemap.xml')})
- [Privacy](${u('/en/privacy')}) and [terms](${u('/en/terms')})
`.replace(/\n{3,}/g, '\n\n');
}

function blockMd(b: Block): string {
  switch (b.t) {
    case 'p':
      return b.text;
    case 'h3':
      return `### ${b.text}`;
    case 'ul':
      return b.items.map((i) => `- ${i}`).join('\n');
    case 'ol':
      return b.items.map((i, n) => `${n + 1}. ${i}`).join('\n');
    case 'note':
      return `> ${b.text}`;
    case 'table':
      return [
        `| ${b.head.join(' | ')} |`,
        `| ${b.head.map(() => '---').join(' | ')} |`,
        ...b.rows.map((r) => `| ${r.join(' | ')} |`),
      ].join('\n');
  }
}

function pageMd(p: ContentPageDef): string {
  const t = p.en;
  const parts = [
    `# ${t.h1}`,
    `URL: ${enUrl(p)}  \nUpdated: ${p.updated}`,
    `**Short answer:** ${t.answer}`,
    ...t.sections.map((s) => [`## ${s.h2}`, ...s.blocks.map(blockMd)].join('\n\n')),
  ];
  if (t.faq?.length)
    parts.push(['## Questions', ...t.faq.map((f) => `**${f.q}**\n${f.a}`)].join('\n\n'));
  return parts.join('\n\n');
}

export function llmsFullTxt(): string {
  const pages = ALL_PAGES.filter((p) => p.group !== 'legal' && p.slug);
  return `# Kadi Sasa: full guide text\n\n> ${SUMMARY}\n\n${FACTS.map((f) => `- ${f}`).join('\n')}\n\n---\n\n${pages.map(pageMd).join('\n\n---\n\n')}\n`;
}
