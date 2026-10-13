'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { useSession } from '@/lib/queries';
import { Skeleton } from '@/components/ui/display';
import { getRepository } from '@/lib/repo';
import { Button } from '@/components/ui/button';

/** Console requires a session; the gate role is refused (gate agents use the Android app, §2). */
export function AuthGuard({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('nav');
  useEffect(() => {
    if (session.isSuccess && !session.data)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [session.isSuccess, session.data, router, pathname]);

  if (!session.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (session.data.role === 'gate') {
    return (
      <main
        className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
        data-testid="gate-refused"
      >
        <ShieldAlert className="size-12 text-warning" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">{t('gateNoConsoleTitle')}</h1>
        <p className="text-muted">{t('gateNoConsole')}</p>
        <Button
          variant="secondary"
          onClick={async () => {
            await getRepository().signOut();
            router.replace('/login');
          }}
        >
          {t('signOut')}
        </Button>
      </main>
    );
  }
  return <>{children}</>;
}
