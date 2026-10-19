'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicBranding } from '@harusi/schemas/branding';
import {
  brandStyle,
  DEFAULT_PUBLIC_BRANDING,
  resolveLogoSrc,
  sanitizePublicBranding,
} from '@/lib/branding';
import { USE_MOCKS } from '@/lib/env';
import { cn } from '@/lib/cn';

interface BrandContext {
  brand: PublicBranding;
  /** Used by the settings page so a saved change shows at once, without waiting for the page cache. */
  setBrand: (b: PublicBranding) => void;
}

const Ctx = createContext<BrandContext>({ brand: DEFAULT_PUBLIC_BRANDING, setBrand: () => {} });
export const useBrand = () => useContext(Ctx);

const VARS = [
  '--hp-primary',
  '--hp-on-primary',
  '--hp-accent',
  '--hp-font-body',
  '--hp-font-display',
];

/** Holds the brand the server rendered with, and keeps the page's CSS variables in step when it changes. */
export function BrandProvider({
  initial,
  children,
}: {
  initial: PublicBranding;
  children: ReactNode;
}) {
  const [brand, setBrand] = useState(initial);
  // On mock data the saved brand lives in the browser, where the server cannot see it. The check is a
  // build-time constant, so a production build (real API) contains neither this import nor the mock.
  useEffect(() => {
    if (!USE_MOCKS) return;
    let live = true;
    void import('@/lib/repo')
      .then(({ getRepository }) => getRepository().getBranding())
      .then((b) => live && setBrand(sanitizePublicBranding(b)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement.style;
    const next = brandStyle(brand) as Record<string, string>;
    for (const v of VARS) {
      if (next[v]) root.setProperty(v, next[v]);
      else root.removeProperty(v);
    }
  }, [brand]);
  const value = useMemo(() => ({ brand, setBrand }), [brand]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * The business name, or its logo when one is set. The logo is only ever shown through `<img>` (so an SVG
 * cannot run script) and falls back to the name if the file fails to load.
 */
export function BrandMark({
  className,
  logoClassName,
}: {
  className?: string;
  logoClassName?: string;
}) {
  const { brand } = useBrand();
  const src = resolveLogoSrc(brand.logoUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (src && !failed)
    return (
      // a small brand image from the API, often SVG
      <img
        src={src}
        alt={brand.businessName}
        className={cn('max-h-10 max-w-44 object-contain', logoClassName)}
        onError={() => setFailed(true)}
        data-testid="brand-mark-logo"
      />
    );
  return (
    <span className={cn('font-semibold text-primary', className)} data-testid="brand-mark-name">
      {brand.businessName}
    </span>
  );
}
