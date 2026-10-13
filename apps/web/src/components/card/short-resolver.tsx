'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/button';
import { Spinner } from '@/components/ui/button';

/** Client fallback for /s/[code] when the server snapshot doesn't know the code (mock mode). */
export function ShortResolver({ code }: { code: string }) {
  const t = useTranslations('short');
  const router = useRouter();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getRepository } = await import('@/lib/repo');
        const { token } = await getRepository().resolveShortCode(code);
        if (!cancelled) router.replace(`/c/${token}`);
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      {missing ? (
        <>
          <p className="text-lg" role="alert">
            {t('notFound')}
          </p>
          <a className={buttonClasses('primary')} href="/k">
            {t('enterTitle')}
          </a>
        </>
      ) : (
        <>
          <Spinner className="size-8 text-primary" />
          <p role="status">{t('redirecting')}</p>
        </>
      )}
    </main>
  );
}
