import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SwRegister } from '@/components/card/sw-register';
import { displaySerifPreloaded } from '@/lib/fonts-card';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Guest routes: display serif + offline service worker. No i18n runtime here (ADR 009). */
export default function CardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className={displaySerifPreloaded.variable}>{children}</div>
      <SwRegister />
    </>
  );
}
