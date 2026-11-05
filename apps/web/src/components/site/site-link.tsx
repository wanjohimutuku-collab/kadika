'use client';

import type { ComponentProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { editionOfPath } from '@/lib/site-locale';

/**
 * A link on the public site. `/en/x` is rewritten to the same route as `/x`, and `/ke` shares the same
 * layout, so the client router would treat a jump between editions (sw, en, ke) as "nothing changed" and keep
 * the old language and market on screen. Such links load the page in full; links inside one edition stay
 * fast client-side navigations.
 */
export function SiteLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const pathname = usePathname() ?? '/';
  const target = typeof href === 'string' ? href : (href.pathname ?? '/');
  if (target.startsWith('/') && editionOfPath(target) !== editionOfPath(pathname)) {
    const {
      prefetch: _prefetch,
      replace: _replace,
      scroll: _scroll,
      shallow: _shallow,
      passHref: _passHref,
      legacyBehavior: _legacy,
      locale: _locale,
      onNavigate: _onNavigate,
      ...anchor
    } = rest;
    return <a href={target} {...anchor} />;
  }
  return <Link href={href} {...rest} />;
}
