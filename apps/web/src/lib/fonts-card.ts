import { Cormorant_Garamond } from 'next/font/google';

/**
 * Same face as `fonts.ts`, preloaded and with `font-display: optional`: on the guest card the couple
 * names are the LCP element, and a late swap would re-trigger LCP on slow networks (ADR 009).
 */
export const displaySerifPreloaded = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '600',
  display: 'optional',
  variable: '--font-display-serif',
  preload: true,
});
