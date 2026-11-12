import { createHash } from 'node:crypto';
import { CLIENT_SCRIPT } from './client-script';
import { MEMORIES_SCRIPT } from './memories';
import { LANG_SCRIPT } from './render';

const sha256 = (js: string) => `'sha256-${createHash('sha256').update(js).digest('base64')}'`;

/**
 * Script policy for the light pages (security review M-04). They have no framework to carry a nonce,
 * but every inline script on them is one of these constants, so the policy allows exactly those by
 * hash: markup that reached a card some other way cannot run script on the trusted card domain.
 * 'unsafe-inline' is the fallback for old browsers without hash support (they ignore the hashes;
 * browsers that know hashes ignore it), so feature-phone browsers keep working. The card registers
 * its offline service worker, which needs worker-src (child-src on older browsers).
 */
export const LIGHT_PAGE_CSP = [
  `script-src ${[CLIENT_SCRIPT, LANG_SCRIPT, MEMORIES_SCRIPT].map(sha256).join(' ')} 'unsafe-inline'`,
  "worker-src 'self'",
  "child-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');
