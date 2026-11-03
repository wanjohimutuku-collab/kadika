import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Download, ScanLine, ShieldCheck, Smartphone } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { getBrandingOnServer } from '@/lib/server-branding';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { gateAppIntent, gateJoinCode } from '@/lib/gate-join';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('gateJoinPage');
  const brand = (await getBrandingOnServer()).businessName;
  // A gate link is private to one wedding: never in search results.
  return {
    title: { absolute: t('metaTitle', { brand }) },
    robots: { index: false, follow: false },
  };
}

/**
 * Where a gate link (`/gate-join/<code>`, made in Timu) lands when it is opened in a browser or scanned with
 * the phone camera (§7.6, §17.5). The gate runs in the Android app, so this page hands the code to the app
 * and says how to get it; the PIN is never part of the link.
 */
export default async function GateJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const code = gateJoinCode((await params).code);
  const t = await getTranslations('gateJoinPage');
  const brand = (await getBrandingOnServer()).businessName;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const fallback = host ? `${proto}://${host}${APP_DOWNLOAD_PATH}` : null;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10" data-testid="gate-join">
      <div className="flex flex-col gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-primary uppercase">
          <ScanLine className="size-5" aria-hidden="true" />
          {t('eyebrow')}
        </p>
        <h1 className="font-display text-3xl leading-tight font-semibold">{t('title')}</h1>
        <p className="text-muted">{t('body', { brand })}</p>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-card border border-border bg-surface p-5">
        <span className="text-sm text-muted">{t('codeLabel')}</span>
        <span
          className="font-mono text-4xl font-bold tracking-widest break-all"
          data-testid="gate-join-code"
        >
          {code}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <a
          href={gateAppIntent(code, fallback)}
          className={buttonClasses('primary', 'lg')}
          data-testid="gate-join-open"
        >
          <Smartphone className="size-5" aria-hidden="true" />
          {t('open')}
        </a>
        <Link href={APP_DOWNLOAD_PATH} className={buttonClasses('secondary', 'lg')}>
          <Download className="size-5" aria-hidden="true" />
          {t('download')}
        </Link>
      </div>

      <section aria-labelledby="gate-join-steps" className="flex flex-col gap-3">
        <h2 id="gate-join-steps" className="text-xl font-semibold">
          {t('stepsTitle')}
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-6">
          <li>{t('step1', { brand })}</li>
          <li>{t('step2', { code })}</li>
          <li>{t('step3')}</li>
        </ol>
      </section>

      <p className="flex items-start gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <span>{t('trust')}</span>
      </p>
    </main>
  );
}
