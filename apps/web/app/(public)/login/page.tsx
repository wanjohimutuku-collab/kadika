import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginPhone } from '@/components/public/login';
import { getBrandingOnServer } from '@/lib/server-branding';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  const brand = (await getBrandingOnServer()).businessName;
  // The title already names the brand, so it skips the root layout's "· brand" suffix.
  return { title: { absolute: t('title', { brand }) }, robots: { index: false } };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPhone />
    </Suspense>
  );
}
