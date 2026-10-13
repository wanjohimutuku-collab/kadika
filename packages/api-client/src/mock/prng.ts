/** Small deterministic PRNG (mulberry32) so server and browser build the same seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(readonly next: () => number) {}
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((n, [, w]) => n + w, 0);
    let r = this.next() * total;
    for (const [v, w] of entries) {
      r -= w;
      if (r <= 0) return v;
    }
    return entries[entries.length - 1]![0];
  }
  hex(len: number): string {
    let s = '';
    for (let i = 0; i < len; i++) s += Math.floor(this.next() * 16).toString(16);
    return s;
  }
  /** UUID-shaped id (version nibble 7) — mock only. */
  uuid(): string {
    const h = this.hex(32);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-7${h.slice(13, 16)}-${'89ab'[this.int(0, 3)]}${h.slice(17, 20)}-${h.slice(20, 32)}`;
  }
  /** 128-bit opaque token, base64url (22 chars) — §9. */
  token(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let s = '';
    for (let i = 0; i < 22; i++) s += alphabet[Math.floor(this.next() * 64)];
    return s;
  }
}
