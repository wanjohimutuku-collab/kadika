import { describe, expect, it } from 'vitest';
import { SOUNDS, toBase64, toneWav } from '../gate/wav';

describe('tone WAV generator', () => {
  it('writes a valid mono 16-bit PCM header and the right number of samples', () => {
    const w = toneWav([{ hz: 440, ms: 100 }]);
    const v = new DataView(w.buffer);
    const tag = (o: number) => String.fromCharCode(...w.slice(o, o + 4));
    expect([tag(0), tag(8), tag(12), tag(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint16(34, true)).toBe(16); // 16-bit
    const samples = Math.round((22_050 * 100) / 1000);
    expect(v.getUint32(40, true)).toBe(samples * 2);
    expect(w.length).toBe(44 + samples * 2);
    expect(v.getUint32(4, true)).toBe(w.length - 8);
  });
  it('fades the edges (no click) and keeps the tone inside the volume', () => {
    const v = new DataView(toneWav([{ hz: 440, ms: 100 }], 0.5).buffer);
    expect(Math.abs(v.getInt16(44, true))).toBeLessThan(200);
    let peak = 0;
    for (let i = 44; i < v.byteLength; i += 2) peak = Math.max(peak, Math.abs(v.getInt16(i, true)));
    expect(peak).toBeGreaterThan(14_000);
    expect(peak).toBeLessThanOrEqual(16_384);
  });
  it('encodes base64 like Buffer and has a tone for every result', () => {
    for (const bytes of [
      Uint8Array.of(1),
      Uint8Array.of(1, 2),
      Uint8Array.of(1, 2, 3),
      toneWav(SOUNDS.admit),
    ])
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    expect(Object.keys(SOUNDS).sort()).toEqual(['admit', 'deny', 'duplicate']);
  });
});
