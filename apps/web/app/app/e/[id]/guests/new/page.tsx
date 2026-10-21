'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/console/page-header';
import { GuestForm } from '@/components/console/guests/guest-form';

function NewGuestInner({ id }: { id: string }) {
  const t = useTranslations('guestForm');
  const tg = useTranslations('guestDetail');
  const router = useRouter();
  // links from the send page and the import wizard arrive with ?card=contribution
  const card = useSearchParams().get('card') === 'contribution' ? 'contribution' : 'invitation';
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t('title')}
        back={
          <Link
            href={`/app/e/${id}/guests`}
            className="inline-flex min-h-10 items-center gap-1.5 self-start font-semibold text-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {tg('back')}
          </Link>
        }
      />
      <div className="rounded-card border border-border bg-surface p-4 md:p-6">
        <GuestForm
          eventId={id}
          allowAddAnother
          defaultCardKind={card}
          onDone={(g) => router.push(`/app/e/${id}/guests/${g.id}`)}
        />
      </div>
    </div>
  );
}

export default function NewGuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <NewGuestInner id={id} />
    </Suspense>
  );
}
