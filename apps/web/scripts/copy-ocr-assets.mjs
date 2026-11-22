#!/usr/bin/env node
/**
 * Copies the Tesseract engine and English model used by the gate's "Scan SMS" (ADR 059) from
 * node_modules into public/ocr/, so gates load them from our own origin and the browser can keep
 * them for offline use. Runs before `next dev` and `next build`; the output is gitignored.
 *
 * The folder is named after the tesseract.js version, so the files can be cached as immutable and a
 * dependency bump moves them to a new URL. Keep the name in step with OCR_ASSET_BASE in
 * src/lib/sms-ocr.ts.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const require = createRequire(path.join(webRoot, 'package.json'));

const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const tesseractDir = pkgDir('tesseract.js');
const coreDir = pkgDir('tesseract.js-core');
const langDir = path.join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int');
const version = require('tesseract.js/package.json').version;

const outRoot = path.join(webRoot, 'public', 'ocr');
const outDir = path.join(outRoot, `tesseract-${version}`);

// The worker picks one of these by the device's SIMD support; the recogniser is LSTM-only (OEM 1).
const files = [
  [path.join(tesseractDir, 'dist', 'worker.min.js'), 'worker.min.js'],
  [path.join(coreDir, 'tesseract-core-lstm.wasm.js'), 'core/tesseract-core-lstm.wasm.js'],
  [path.join(coreDir, 'tesseract-core-simd-lstm.wasm.js'), 'core/tesseract-core-simd-lstm.wasm.js'],
  [
    path.join(coreDir, 'tesseract-core-relaxedsimd-lstm.wasm.js'),
    'core/tesseract-core-relaxedsimd-lstm.wasm.js',
  ],
  [path.join(langDir, 'eng.traineddata.gz'), 'lang/eng.traineddata.gz'],
];

// Drop folders left by older versions so public/ does not grow with every bump.
if (existsSync(outRoot)) {
  for (const entry of readdirSync(outRoot)) {
    if (entry !== path.basename(outDir)) rmSync(path.join(outRoot, entry), { recursive: true });
  }
}

let copied = 0;
for (const [from, rel] of files) {
  if (!existsSync(from)) throw new Error(`copy-ocr-assets: missing ${from}`);
  const to = path.join(outDir, rel);
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied++;
}
console.log(
  `copy-ocr-assets: ${copied ? `${copied} file(s) copied to` : 'up to date in'} ${path.relative(webRoot, outDir)}`,
);
