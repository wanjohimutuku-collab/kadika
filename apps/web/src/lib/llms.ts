import { DEFAULT_PRICING, sortedTiers } from '@harusi/schemas/billing';
import { ALL_PAGES, getPage, marketOf, pagePath } from '@/content';
import type { Block, ContentPageDef, PageText } from '@/content/types';
import { SITE_URL, localeUrl } from '@/lib/seo';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { PRICING_PATH } from '@/lib/server-pricing';

/**
 * llms.txt and llms-full.txt (llmstxt.org): a plain map of the site for AI assistants, built from the same
 * content and live pricing catalog as the pages so it never drifts.
 */

const u = (p: string) => `${SITE_URL}${p === '/' ? '' : p}`;
/** English edition URL of a Tanzania page; Kenya and Uganda pages are English already. */
const enUrl = (p: ContentPageDef) => u(pagePath(p, 'en'));
/** Swahili edition URL of a Tanzania page (`/sw/...`). */
const swUrl = (p: ContentPageDef) => u(localeUrl(pagePath(p, 'sw'), 'sw'));
const fmt = (n: number) => n.toLocaleString('en-US');

const TIERS = sortedTiers(DEFAULT_PRICING.cardTiers);

const SW_CORE_SLUGS = [
  'kadi-ya-harusi-mtandaoni',
  'michango-ya-harusi',
  'kadi-za-harusi-online',
  'kadi-sasa-vs-karatasi-na-zana-za-kubuni',
  'gharama-halisi-za-huduma-ya-mialiko',
  'jinsi-ya-kuunda-kadi-ya-harusi-tanzania',
  'kuhusu',
  'maswali',
] as const;

export const SUMMARY =
  'Kadi Sasa is an East African service for digital invitation cards (e-cards), michango/pledge tracking and offline QR gate check-in, live as a pilot in Tanzania with Kenya and Uganda support planned. Every guest gets their own card with a QR code and a short card number (for example KH-4826) by WhatsApp, SMS or on paper. The committee tracks replies, party sizes and pledges, and any committee phone becomes the gate, scanning even with no network.';

export const FACTS = [
  'Languages: English (default at /) and Swahili (/sw), one tap away. Currencies: TZS in Tanzania (live), KES in Kenya (pilot), UGX in Uganda (planned).',
  `Pricing (Tanzania): start free with ${DEFAULT_PRICING.free.cards} cards and ${DEFAULT_PRICING.free.messages} reminder messages. Paid tiers are ${TIERS.map((t, i) => {
    const next = TIERS[i + 1]?.minCards;
    const range = next ? `${t.minCards}–${next - 1}` : `${t.minCards}+`;
    return `TZS ${fmt(t.price.TZS)}/card (${range} cards)`;
  }).join(', ')}, each including ${DEFAULT_PRICING.messagesPerCard} reminder messages. Optional SMS credit packs start at TZS ${fmt(DEFAULT_PRICING.packs[0]!.price.TZS)} for ${DEFAULT_PRICING.packs[0]!.messages} credits. 0% commission on michango.`,
  'Delivery: WhatsApp, SMS (works on any phone, including basic feature phones) and printable paper cards with the same QR and card number.',
  'Category clarity: Kadi Sasa provides event and wedding e-cards (invitations, RSVPs, pledges, gate passes), not NFC digital business cards.',
  'Guests need no account and no app. Kadi Sasa never asks guests for a PIN, password or OTP.',
  'Gate: the Android app downloads the guest list and the event public key, verifies signed QR codes offline, and syncs scans when the network returns. One QR admits once; a repeat shows "Already admitted" with the time.',
  'Gate fallbacks: scan the QR, type the card number, search by name or the last four phone digits, run on-device SMS text scanning for feature phones, or use a logged manual override by the committee.',
  'Kumbukumbu: private token-scoped guest photo galleries (EXIF/GPS-stripped WebP tiers) with positive-only guest reactions and short wishes, included free with any paid card package.',
  'Contributions (michango & pledges): guests pay the hosts directly (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, MTN MoMo, bank or cash). Kadi Sasa keeps only encrypted records, visible to the hosts and committee, and takes no percentage.',
  'Apps: a web console in the browser and an Android app (Android 8 and newer) for hosts, committee and gate staff. Gate staff join with a link and a PIN.',
  'Data protection: follows the Tanzania Personal Data Protection Act; guests and hosts can request export or deletion.',
];

const label = (p: ContentPageDef) => p.en.nav;
const desc = (t: PageText) => t.description;

function section(title: string, pages: ContentPageDef[]) {
  if (!pages.length) return '';
  return `## ${title}\n\n${pages.map((p) => `- [${label(p)}](${enUrl(p)}): ${desc(p.en)}`).join('\n')}\n`;
}

function pricingMarkdownTable(): string {
  const rows = [
    `| Starter (free) | First ${DEFAULT_PRICING.free.cards} cards | TZS 0 | Includes ${DEFAULT_PRICING.free.messages} reminder messages |`,
    ...TIERS.map((t, i) => {
      const next = TIERS[i + 1]?.minCards;
      const range = next ? `${t.minCards}–${next - 1} cards` : `${t.minCards}+ cards`;
      return `| Per-card tier | ${range} | TZS ${fmt(t.price.TZS)} / card | Includes ${DEFAULT_PRICING.messagesPerCard} reminders/card + offline QR + Kumbukumbu |`;
    }),
    ...DEFAULT_PRICING.packs.map(
      (pack) =>
        `| SMS credit pack | ${fmt(pack.messages)} messages | TZS ${fmt(pack.price.TZS)} | Optional extra reminders without buying cards |`,
    ),
    '| Michango / Pledges | Any amount | 0% commission | Direct to host M-Pesa, Mixx, Airtel Money, HaloPesa, bank or cash |',
  ];
  return [
    '## Pricing (Tanzania, TZS)',
    '',
    '| Plan / Pack | Quantity | Price (TZS) | Notes |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

export function llmsTxt(): string {
  const tz = (g: ContentPageDef['group']) =>
    ALL_PAGES.filter((p) => marketOf(p) === 'tz' && p.group === g);
  const ke = ALL_PAGES.filter((p) => marketOf(p) === 'ke' && p.group !== 'legal');
  const ug = ALL_PAGES.filter((p) => marketOf(p) === 'ug' && p.group !== 'legal');
  const swPages = SW_CORE_SLUGS.map((s) => getPage(s, 'tz')).filter((p): p is ContentPageDef =>
    Boolean(p),
  );
  const about = getPage('kuhusu', 'tz');
  const faq = getPage('maswali', 'tz');
  const contact = getPage('mawasiliano', 'tz');

  return `# Kadi Sasa

> ${SUMMARY}

## Key facts

${FACTS.map((f) => `- ${f}`).join('\n')}

## Main pages

- [Home (English)](${u('/')}): what Kadi Sasa does
- [Home (Kiswahili)](${u('/sw')}): the same in Swahili
- [Pricing](${u(PRICING_PATH)}): per-card prices in TZS, free starter cards (${DEFAULT_PRICING.free.cards} free cards, ${DEFAULT_PRICING.free.messages} free messages)
- [Android app](${u(APP_DOWNLOAD_PATH)}): the organizer and gate app
${about ? `- [About](${enUrl(about)}): ${desc(about.en)}\n` : ''}${faq ? `- [Frequently asked questions](${enUrl(faq)}): ${desc(faq.en)}\n` : ''}${contact ? `- [Contact](${enUrl(contact)}): ${desc(contact.en)}` : ''}

${section('Products and occasions', tz('product'))}
${section('Guides', tz('guide'))}
${section('Company', tz('company'))}
## Swahili edition (Kiswahili)

- [Nyumbani (Kiswahili)](${u('/sw')}): ukurasa mkuu wa Kadi Sasa kwa Kiswahili
- [Bei (Kiswahili)](${u(localeUrl(PRICING_PATH, 'sw'))}): bei kwa kila kadi na kadi ${DEFAULT_PRICING.free.cards} za kwanza bure
- [Programu ya Android](${u(localeUrl(APP_DOWNLOAD_PATH, 'sw'))}): programu ya waandaaji na lango la QR
${swPages.map((p) => `- [${p.sw.nav}](${swUrl(p)}): ${desc(p.sw)}`).join('\n')}

${section('Kenya (pilot)', ke)}
${section('Uganda (planned)', ug)}
## Optional

- Guest card lookup helper: guests with a short code (e.g. KH-4826) can open their pass at \`/k\` (excluded from search indexing to protect private links).
- [Full text of every guide](${u('/llms-full.txt')}): all pages above plus full pricing table as plain Markdown, English edition
- [Sitemap](${u('/sitemap.xml')})
- [Privacy](${u('/privacy')}) and [terms](${u('/terms')})
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
  const pages = ALL_PAGES.filter((p) => p.group !== 'legal');
  return `# Kadi Sasa: full guide text\n\n> ${SUMMARY}\n\n${FACTS.map((f) => `- ${f}`).join('\n')}\n\n${pricingMarkdownTable()}\n\n---\n\n${pages.map(pageMd).join('\n\n---\n\n')}\n`;
}
