'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { normalizeShortCode } from '@harusi/schemas/short-code';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form';
import { LanguageChip } from '@/components/ui/language-chip';

/** `/k`: open a card with only the short code from an SMS or paper card (P3). */
export function CodeEntry() {
  const t = useTranslations('short');
  const tv = useTranslations('validation');
  const tc = useTranslations('card');
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6">
      <span
        className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <KeyRound className="size-7" />
      </span>
      <h1 className="text-2xl font-semibold">{t('enterTitle')}</h1>
      <p className="text-lg">{t('enterBody')}</p>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const code = normalizeShortCode(value);
          if (!code) {
            setError(tv('code.invalid'));
            return;
          }
          setBusy(true);
          setError(null);
          try {
            const { getRepository } = await import('@/lib/repo');
            const { token } = await getRepository().resolveShortCode(code);
            router.push(`/c/${token}`);
          } catch {
            setError(t('notFound'));
            setBusy(false);
          }
        }}
      >
        <TextField
          label={t('enterLabel')}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="KH-4826"
          hint={t('enterHelp')}
          error={error ?? undefined}
          className="font-mono text-xl tracking-[0.15em]"
          name="code"
        />
        <Button type="submit" size="lg" block loading={busy}>
          {t('enterSubmit')}
        </Button>
      </form>
      <p className="flex items-center gap-2 text-sm text-muted">
        <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
        {tc('trustNever')}
      </p>
      <LanguageChip className="self-center" />
    </main>
  );
}
