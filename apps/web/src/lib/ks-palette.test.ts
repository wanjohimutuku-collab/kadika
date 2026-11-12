/**
 * Locks the WCAG AA contrast of the marketing site's `.ks` palette (apps/web/app/globals.css).
 * The hex values are duplicated here on purpose — the CSS is the source of truth, this test is the
 * guard. If a token moves in globals.css it must move here, which is the point: AA regressions
 * cannot slip in silently (ADR 006 for the shared gate tokens, ADR 056 for this redesign).
 */
import { describe, expect, it } from 'vitest';
import { MIN_NON_TEXT_CONTRAST, MIN_TEXT_CONTRAST, contrastRatio } from '@harusi/ui-tokens';

/** The `.ks` tokens exactly as they are in `apps/web/app/globals.css`. */
const KS = {
  green900: '#0A3F35',
  green700: '#0F5C4D',
  green100: '#E3F0EC',
  gold500: '#D9A441',
  gold100: '#FBF1DC',
  ink: '#1A1F1D',
  muted: '#5B6662',
  paper: '#FBFAF7',
  line: '#E4E1DA',
  ok: '#0F7A47',
  warn: '#8C5A14',
  error: '#B42318',
  white: '#FFFFFF',
} as const;

/** Pairs where text sits on a surface; AA normal demands >= 4.5:1. */
const textPairs: ReadonlyArray<readonly [string, string, string]> = [
  ['ink on paper', KS.ink, KS.paper],
  ['muted on paper', KS.muted, KS.paper],
  ['ink on white (ks-core)', KS.ink, KS.white],
  ['muted on white (ks-core)', KS.muted, KS.white],
  ['green-700 heading on paper', KS.green700, KS.paper],
  ['green-900 heading on paper', KS.green900, KS.paper],
  ['white on green-900 (dark section)', KS.white, KS.green900],
  ['gold-100 on green-900 (dark eyebrow)', KS.gold100, KS.green900],
  ['gold-500 on green-900 (dark accent)', KS.gold500, KS.green900],
  ['green-700 on green-100 (chip)', KS.green700, KS.green100],
  ['green-900 on gold-100 (chip)', KS.green900, KS.gold100],
  ['white on green-700 (primary button)', KS.white, KS.green700],
  ['green-900 on white (secondary button)', KS.green900, KS.white],
  ['white on ok (gate admit chip)', KS.white, KS.ok],
  ['white on warn (gate duplicate chip)', KS.white, KS.warn],
  ['white on error (gate missing chip)', KS.white, KS.error],
  ['ok on paper (inline icon label)', KS.ok, KS.paper],
  ['warn on paper (inline icon label)', KS.warn, KS.paper],
  ['error on paper (inline icon label)', KS.error, KS.paper],
];

describe('.ks marketing site palette (globals.css)', () => {
  for (const [name, fg, bg] of textPairs) {
    it(`${name}: AA text (${fg} on ${bg})`, () => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    });
  }

  it('focus ring (green-700 on paper) meets non-text AA', () => {
    expect(contrastRatio(KS.green700, KS.paper)).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST);
  });
});
