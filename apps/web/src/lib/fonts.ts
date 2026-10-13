import { Cormorant_Garamond } from 'next/font/google';

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
