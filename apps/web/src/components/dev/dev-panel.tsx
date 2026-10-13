'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { MemberRole } from '@harusi/schemas';
import type { MockNetwork, PayOutcome } from '@harusi/api-client/mock';
import type { Locale } from '@harusi/i18n';
import { getMock } from '@/lib/repo';
import { persistLocale } from '@/lib/locale-client';
import { useMockControls } from '@/lib/use-mock-controls';
import { cn } from '@/lib/cn';

function Group<T extends string | number>({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              'inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3 text-sm',
              o.value === value
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Dev-only controls (role, locale, network, failure injection, pay outcome, data reset). */
export function DevPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations('dev');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const c = useMockControls();
  const mock = getMock();
  const [, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mock) return null;
  const set = mock.controls.set.bind(mock.controls);
  const refresh = () => start(() => router.refresh());

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label={t('panel')}
      data-testid="dev-panel"
      className="no-print fade-in fixed inset-x-2 bottom-2 z-[80] max-h-[85dvh] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl outline-none md:inset-x-auto md:bottom-4 md:left-4 md:w-96"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{t('panel')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={tc('close')}
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-ink/6"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <Group<MemberRole>
          label={t('role')}
          name="dev-role"
          value={c.role}
          onChange={(role) => {
            set({ role });
            refresh();
          }}
          options={(['owner', 'committee', 'gate'] as const).map((v) => ({
            value: v,
            label: t(`roles.${v}`),
          }))}
        />
        <Group<Locale>
          label={tc('language')}
          name="dev-locale"
          value={locale}
          onChange={(l) => {
            persistLocale(l);
            refresh();
          }}
          options={[
            { value: 'sw', label: 'Kiswahili' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Group<MockNetwork>
          label={t('network')}
          name="dev-network"
          value={c.network}
          onChange={(network) => set({ network })}
          options={(['online', 'slow', 'offline'] as const).map((v) => ({
            value: v,
            label: t(`networks.${v}`),
          }))}
        />
        <Group<number>
          label={t('failures')}
          name="dev-fail"
          value={c.failureRate}
          onChange={(failureRate) => set({ failureRate })}
          options={[0, 0.1, 0.3].map((v) => ({
            value: v,
            label: t(`failureRates.${String(v * 100) as '0' | '10' | '30'}`),
          }))}
        />
        <Group<PayOutcome>
          label={t('payOutcome')}
          name="dev-pay"
          value={c.payOutcome}
          onChange={(payOutcome) => set({ payOutcome })}
          options={(['success', 'declined', 'timeout', 'duplicate_webhook'] as const).map((v) => ({
            value: v,
            label: t(`payOutcomes.${v}`),
          }))}
        />
        <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
          <a
            className="font-semibold text-primary underline"
            href={`/c/${mock.sampleToken('delivered')}`}
            data-testid="dev-sample-card"
          >
            {t('sampleCard')}
          </a>
          {mock.sampleRetiredToken() ? (
            <a className="text-primary underline" href={`/c/${mock.sampleRetiredToken()}`}>
              {t('sampleCard')} (reissued)
            </a>
          ) : null}
          <a className="text-primary underline" href="/dev/states">
            {t('states')}
          </a>
          <button
            type="button"
            className="mt-1 min-h-10 self-start rounded-input border border-danger px-3 font-semibold text-danger"
            onClick={() => {
              mock.reset();
              setNotice(t('resetDone'));
              refresh();
            }}
          >
            {t('reset')}
          </button>
          {notice ? <p role="status">{notice}</p> : null}
        </div>
      </div>
    </div>
  );
}
