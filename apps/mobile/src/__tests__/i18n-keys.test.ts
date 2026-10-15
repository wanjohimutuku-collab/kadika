import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { messages } from '@harusi/i18n';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory()
      ? f === '__tests__'
        ? []
        : files(p)
      : /\.tsx?$/.test(f)
        ? [p]
        : [];
  });
}
const has = (locale: 'sw' | 'en', key: string) => {
  let n: unknown = messages[locale];
  for (const part of key.split('.'))
    n = n && typeof n === 'object' ? (n as Record<string, unknown>)[part] : undefined;
  return typeof n === 'string';
};

/** Every literal `t('a.b')` used by the app must exist in Swahili and English (no raw keys on screen). */
describe('mobile i18n keys', () => {
  const root = join(__dirname, '..', '..');
  const used = new Set<string>();
  for (const f of [...files(join(root, 'app')), ...files(join(root, 'src'))])
    for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z]+(?:\.[a-zA-Z0-9_]+)+)'/g))
      used.add(m[1]!);

  it('finds the keys the screens use', () => expect(used.size).toBeGreaterThan(80));
  it('has every used key in both languages', () => {
    const missing = [...used].filter((k) => !has('sw', k) || !has('en', k));
    expect(missing).toEqual([]);
  });
});
