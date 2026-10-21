'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, PlugZap, RotateCcw, Save } from 'lucide-react';
import { RepositoryError } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import {
  PAYMENT_PROVIDERS,
  SNIPPE_ENVIRONMENTS,
  paymentProviderFields,
  type PaymentRouteView,
  type PaymentSettingsView,
} from '@harusi/schemas/payment-settings';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { Select, TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { formatRelative } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

/** Payment gateway settings (ADR 036). Admin staff only; secrets never reach the browser. */
export default function PaymentSettingsPage() {
  const t = useTranslations('ops.paymentSettings');
  const q = useQuery({
    queryKey: qk.ops('payment-settings'),
    queryFn: () => getRepository().opsPaymentSettings(),
  });
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-muted">{t('intro')}</p>
      <QueryState query={q} skeleton={<Skeleton className="h-96" />}>
        {(v) => (
          <>
            {v.routes.map((r) => (
              <RouteCard key={r.route} view={r} />
            ))}
            <Webhook view={v} />
          </>
        )}
      </QueryState>
    </div>
  );
}

function RouteCard({ view }: { view: PaymentRouteView }) {
  const t = useTranslations('ops.paymentSettings');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const routeName = t(`route.${view.route}`);
  const [provider, setProvider] = useState(view.provider);
  const [values, setValues] = useState<Record<string, string>>(view.fields);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // A save or reset returns fresh values: show them, and never keep a typed secret in the form.
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
  const store = (v: PaymentSettingsView) => queryClient.setQueryData(qk.ops('payment-settings'), v);

  const save = useMutation({
    mutationFn: () => getRepository().opsSavePayment(view.route, { provider, fields: values }),
    onSuccess: (v) => {
      setError(null);
      store(v);
      toast({ tone: 'success', title: t('saved') });
    },
    onError: (e) => setError(explain(e)),
  });
  const reset = useMutation({
    mutationFn: () => getRepository().opsResetPayment(view.route),
    onSuccess: (v) => {
      setConfirmReset(false);
      store(v);
      toast({ tone: 'success', title: t('resetDone') });
    },
    onError: (e) => setError(explain(e)),
  });
  const test = useMutation({
    mutationFn: () => getRepository().opsTestPayment(view.route),
    onSuccess: (r) =>
      toast(
        r.ok
          ? { tone: 'success', title: t('testOk') }
          : { tone: 'error', title: t('testFailed', { error: r.error ?? '' }) },
      ),
    onError: (e) =>
      toast({
        tone: 'error',
        title: t('testFailed', { error: e instanceof RepositoryError ? e.message : String(e) }),
      }),
  });

  const defs = paymentProviderFields(view.route, provider);
  // Saved secrets only count for the provider they were saved with.
  const secretHint = (key: string) => (provider === view.provider ? view.secrets[key] : undefined);
  const titleId = `pay-${view.route}`;

  return (
    <Card title={routeName} titleId={titleId}>
      <form
        className="flex flex-col gap-4"
        aria-labelledby={titleId}
        data-testid={`payment-settings-${view.route}`}
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
          {view.active ? t('active', { name: view.active }) : t('inactive')}
        </p>
        <Select
          label={t('provider')}
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setError(null);
          }}
          options={Object.keys(PAYMENT_PROVIDERS[view.route]).map((p) => ({
            value: p,
            label: t(`providers.${p}` as never),
          }))}
        />
        {provider === 'fake' ? <Banner tone="warning">{t('fakeWarning')}</Banner> : null}
        {defs.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {defs.map((f) => {
              const secret = 'secret' in f && f.secret;
              const required = 'required' in f && f.required;
              const hint = secret ? secretHint(f.key) : undefined;
              const help = t(`fieldHint.${f.key}` as never);
              if (f.key === 'environment')
                return (
                  <Select
                    key={f.key}
                    label={t('field.environment')}
                    hint={help}
                    value={values.environment || 'production'}
                    onChange={(e) => setValues((s) => ({ ...s, environment: e.target.value }))}
                    options={SNIPPE_ENVIRONMENTS.map((env) => ({
                      value: env,
                      label: t(`environments.${env}`),
                    }))}
                  />
                );
              return (
                <TextField
                  key={f.key}
                  label={t(`field.${f.key}` as never)}
                  optionalLabel={required ? undefined : tc('optional')}
                  type={secret ? 'password' : f.key === 'receiptEmail' ? 'email' : 'text'}
                  autoComplete="off"
                  spellCheck={false}
                  value={values[f.key] ?? ''}
                  placeholder={hint ? '••••••••' : undefined}
                  hint={
                    secret ? (
                      <>
                        {help} {hint ? t('secretSaved', { hint }) : t('secretNew')}
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
        ) : null}
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

      {view.active === 'snippe' ? (
        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-semibold">{t('test')}</h3>
          <p className="text-sm text-muted">{t('testBody')}</p>
          <div>
            <Button
              variant="secondary"
              loading={test.isPending}
              icon={<PlugZap className="size-4" aria-hidden="true" />}
              onClick={() => test.mutate()}
              data-testid="payment-test"
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

/** The address Snippe must post payment results to; without it no payment is ever confirmed. */
function Webhook({ view }: { view: PaymentSettingsView }) {
  const t = useTranslations('ops.paymentSettings');
  const [copied, setCopied] = useState(false);
  const w = view.webhooks[0];
  return (
    <Card title={t('webhook.title')} titleId="pay-webhook">
      <p className="mb-3 text-sm text-muted">{t('webhook.intro')}</p>
      {w ? (
        <div className="flex flex-wrap items-center gap-2">
          <code
            className="min-w-0 flex-1 rounded-input bg-bg px-2 py-2 text-sm break-all"
            data-testid="payment-webhook-url"
          >
            {w.url}
          </code>
          <Button
            variant="secondary"
            size="sm"
            icon={
              copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )
            }
            onClick={() => {
              void navigator.clipboard?.writeText(w.url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? t('webhook.copied') : t('webhook.copy')}
          </Button>
        </div>
      ) : (
        <Banner tone="warning">{t('webhook.missing')}</Banner>
      )}
    </Card>
  );
}
