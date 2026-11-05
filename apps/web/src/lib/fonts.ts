import { Cormorant_Garamond, Figtree, Fraunces } from 'next/font/google';

/**
 * The one display serif (§17.2): latin subset, weight 600, swap. Used only for couple names on the
 * guest card and the print card (and their previews in the console).
 */
export const displaySerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '600',
  display: 'swap',
  variable: '--font-display-serif',
  preload: false,
});

/**
 * Marketing site (kit brand.md): Figtree variable is the one text font (headings, body, card numbers with
 * tabular-nums). Fraunces italic is the optional second file, only for couple names on card mock-ups.
 */
export const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
});

export const fraunces = Fraunces({
  subsets: ['latin'],
  style: 'italic',
  weight: '600',
  display: 'swap',
  variable: '--font-fraunces',
  preload: false,
});
