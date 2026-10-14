/** Builds a mono 16-bit PCM WAV of one or more sine tones, so the scanner needs no sound files. */
export interface Tone {
  hz: number;
  ms: number;
}

const RATE = 22_050;

export function toneWav(tones: Tone[], volume = 0.6): Uint8Array {
  const total = tones.reduce((n, t) => n + Math.round((RATE * t.ms) / 1000), 0);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + total * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, total * 2, true);
  let i = 0;
  for (const t of tones) {
    const n = Math.round((RATE * t.ms) / 1000);
    for (let k = 0; k < n; k++, i++) {
      // 8 ms fade in/out stops clicks at the tone edges
      const fade = Math.min(1, k / (RATE * 0.008), (n - k) / (RATE * 0.008));
      v.setInt16(
        44 + i * 2,
        Math.round(Math.sin((2 * Math.PI * t.hz * k) / RATE) * 32767 * volume * fade),
        true,
      );
    }
  }
  return new Uint8Array(buf);
}

export function toBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out +=
      chars[(n >> 18) & 63]! +
      chars[(n >> 12) & 63]! +
      (i + 1 < bytes.length ? chars[(n >> 6) & 63]! : '=') +
      (i + 2 < bytes.length ? chars[n & 63]! : '=');
  }
  return out;
}

/** Rising two-tone for admit, a single beep for duplicate, a long low buzz for deny (§17.5). */
export const SOUNDS = {
  admit: [
    { hz: 660, ms: 90 },
    { hz: 880, ms: 140 },
  ],
  duplicate: [{ hz: 520, ms: 220 }],
  deny: [{ hz: 160, ms: 520 }],
} satisfies Record<string, Tone[]>;
