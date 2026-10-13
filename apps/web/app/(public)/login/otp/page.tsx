import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginOtp } from '@/components/public/login';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('auth'))('otpTitle'), robots: { index: false } };
}

export default function OtpPage() {
  return (
    <Suspense>
      <LoginOtp />
    </Suspense>
  );
}
