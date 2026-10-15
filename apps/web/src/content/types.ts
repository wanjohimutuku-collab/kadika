import type { Locale } from '@harusi/i18n';

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'note'; text: string };

export interface Section {
  id: string;
  h2: string;
  blocks: Block[];
}

export interface Faq {
  q: string;
  a: string;
}

export interface PageText {
  /** <title>, about 60 characters. */
  title: string;
  /** Meta description, about 155 characters. */
  description: string;
  h1: string;
  /** Direct answer in 40 to 60 words, shown first so search and AI answers can quote it. */
  answer: string;
  sections: Section[];
  faq?: Faq[];
  /** Short label for footer and related-link lists. */
  nav: string;
}

export type PageGroup = 'product' | 'guide' | 'company' | 'legal';

export type Market = 'tz' | 'ke';

export interface ContentPageDef {
  /** Market the page targets; Tanzania is the default. Kenya pages live under `/ke`. */
  market?: Market;
  /** Same-topic page in the other market, for cross-market hreflang. */
  counterpart?: { market: Market; slug: string };
  /** URL slug, used for both languages (`?lang=sw` switches). Empty for the market home. */
  slug: string;
  group: PageGroup;
  schema: 'Article' | 'WebPage';
  /** ISO date; shown on the page, in structured data and in the sitemap. */
  updated: string;
  /** Slugs in the same market, or `tz:slug` / `ke:slug` to link across markets. */
  related: string[];
  /** Legal drafts show a banner until a lawyer has reviewed them. */
  draft?: boolean;
  sw: PageText;
  en: PageText;
}

export type { Locale };
