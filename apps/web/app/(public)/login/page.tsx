import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginPhone } from '@/components/public/login';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('auth'))('title'), robots: { index: false } };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPhone />
    </Suspense>
  );
}
