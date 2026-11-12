'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlugZap, RotateCcw, Save } from 'lucide-react';
import { RepositoryError } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import {
  FIREBASE_FIELDS,
  SIGNIN_PROVIDERS,
  type SignInProvider,
  type SignInSettingsView,
} from '@harusi/schemas/signin-settings';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { Select, TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { formatRelative } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

/** Login codes: our SMS route or Firebase Phone Auth (ADR 049). Admin staff only; the key is masked. */
export default function SignInSettingsPage() {
  const t = useTranslations('ops.signInSettings');
  const q = useQuery({
    queryKey: qk.ops('signin-settings'),
    queryFn: () => getRepository().opsSignInSettings(),
  });
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-muted">{t('intro')}</p>
      <QueryState query={q} skeleton={<Skeleton className="h-96" />}>
        {(v) => <SignInCard view={v} />}
      </QueryState>
    </div>
  );
}

function SignInCard({ view }: { view: SignInSettingsView }) {
  const t = useTranslations('ops.signInSettings');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<SignInProvider>(view.provider);
  const [values, setValues] = useState<Record<string, string>>(view.fields);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // A save or reset returns fresh values: show them, and never keep a typed key in the form.
  useEffect(() => {
    setProvider(view.provider);
    setValues(view.fields);
  }, [view]);

  const explain = (e: unknown) => {
    const missing = e instanceof RepositoryError ? e.details?.missing : undefined;
    if (Array.isArray(missing) && missing.length)
      return t('missing', {
        fields: missing.map((k) => t(`field.${String(k)}` as never)).join(', '),
      });
    return e instanceof RepositoryError ? e.message : String(e);
  };
  const store = (v: SignInSettingsView) => queryClient.setQueryData(qk.ops('signin-settings'), v);

  const save = useMutation({
    mutationFn: () => getRepository().opsSaveSignIn({ provider, fields: values }),
    onSuccess: (v) => {
      setError(null);
      store(v);
      toast({ tone: 'success', title: t('saved') });
    },
    onError: (e) => setError(explain(e)),
  });
  const reset = useMutation({
    mutationFn: () => getRepository().opsResetSignIn(),
    onSuccess: (v) => {
      setConfirmReset(false);
      store(v);
      toast({ tone: 'success', title: t('resetDone') });
    },
    onError: (e) => setError(explain(e)),
  });
  const test = useMutation({
    mutationFn: () => getRepository().opsTestSignIn(),
    onSuccess: (r) =>
      toast(
        r.ok
          ? { tone: 'success', title: t('testOk', { project: r.projectId ?? '' }) }
          : {
              tone: 'error',
              title: t('testFailed', { error: r.error ?? '' }),
              ...(r.authorizedDomains.length
                ? { description: t('domains', { domains: r.authorizedDomains.join(', ') }) }
                : {}),
            },
      ),
    onError: (e) =>
      toast({
        tone: 'error',
        title: t('testFailed', { error: e instanceof RepositoryError ? e.message : String(e) }),
      }),
  });

  const switching = provider === 'firebase' && view.provider !== 'firebase';

  return (
    <Card title={t('provider')} titleId="signin-settings">
      <form
        className="flex flex-col gap-4"
        aria-labelledby="signin-settings"
        data-testid="signin-settings"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <p className="text-sm text-muted">
          {view.source === 'database'
            ? t('source.database', {
                when: view.updatedAt ? formatRelative(view.updatedAt, locale) : '—',
                by: view.updatedBy ?? '—',
              })
            : t('source.environment')}{' '}
          {view.active === 'firebase' ? t('activeFirebase') : t('activeSms')}
        </p>
        {view.forcedSms ? <Banner tone="warning">{t('forced')}</Banner> : null}
        <Select
          label={t('provider')}
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as SignInProvider);
            setError(null);
          }}
          options={SIGNIN_PROVIDERS.map((p) => ({ value: p, label: t(`providers.${p}`) }))}
        />
        {switching ? <Banner tone="warning">{t('switchWarning')}</Banner> : null}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-semibold">{t('firebaseTitle')}</h3>
          <p className="text-sm text-muted">{t('firebaseIntro')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {FIREBASE_FIELDS.map((f) => {
            const secret = 'secret' in f && f.secret;
            const required = 'required' in f && f.required && provider === 'firebase';
            const saved = secret ? view.secrets[f.key] : undefined;
            const help = t(`fieldHint.${f.key}`);
            return (
              <TextField
                key={f.key}
                label={t(`field.${f.key}`)}
                optionalLabel={required ? undefined : tc('optional')}
                type={secret ? 'password' : 'text'}
                autoComplete="off"
                spellCheck={false}
                value={values[f.key] ?? ''}
                placeholder={saved ? '••••••••' : undefined}
                hint={
                  secret ? (
                    <>
                      {help} {saved ? t('secretSaved', { hint: saved }) : t('secretNew')}
                    </>
                  ) : (
                    help
                  )
                }
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            );
          })}
        </div>
        {error ? (
          <Banner tone="error">
            <span role="alert">{error}</span>
          </Banner>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            loading={save.isPending}
            icon={<Save className="size-4" aria-hidden="true" />}
          >
            {t('save')}
          </Button>
          {view.source === 'database' ? (
            <Button
              variant="ghost"
              icon={<RotateCcw className="size-4" aria-hidden="true" />}
              onClick={() => setConfirmReset(true)}
            >
              {t('reset')}
            </Button>
          ) : null}
        </div>
      </form>

      {view.secrets.apiKey ? (
        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-semibold">{t('test')}</h3>
          <p className="text-sm text-muted">{t('testBody')}</p>
          <div>
            <Button
              variant="secondary"
              loading={test.isPending}
              icon={<PlugZap className="size-4" aria-hidden="true" />}
              onClick={() => test.mutate()}
              data-testid="signin-test"
            >
              {t('test')}
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmSheet
        open={confirmReset}
        onOpenChange={setConfirmReset}
        tone="danger"
        title={t('resetTitle')}
        consequence={<p>{t('resetBody')}</p>}
        confirmLabel={t('reset')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </Card>
  );
}
