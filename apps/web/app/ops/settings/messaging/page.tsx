'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, RotateCcw, Save, Send } from 'lucide-react';
import { RepositoryError } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import {
  MESSAGING_PROVIDERS,
  providerFields,
  type MessagingRouteView,
  type MessagingSettingsView,
} from '@harusi/schemas/messaging-settings';
import { QueryState } from '@/components/console/query-state';
import { useStaffCan } from '@/components/ops/ops-ui';
import { Button } from '@/components/ui/button';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { Select, TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { formatRelative } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const isTemplate = (key: string) => key.startsWith('template');

/** SMS and WhatsApp provider settings (ADR 031). Admin staff only; secrets never reach the browser. */
export default function MessagingSettingsPage() {
  const t = useTranslations('ops.messaging');
  const canEdit = useStaffCan('settings');
  const q = useQuery({
    queryKey: qk.ops('messaging'),
    queryFn: () => getRepository().opsMessagingSettings(),
    enabled: canEdit,
  });
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-muted">{t('intro')}</p>
      <QueryState query={q} skeleton={<Skeleton className="h-96" />}>
        {(v) => (
          <>
            <ImportFromEnvironment />
            {v.routes.map((r) => (
              <RouteCard key={r.route} view={r} kenyaEnabled={v.kenyaEnabled} />
            ))}
            <Webhooks view={v} />
          </>
        )}
      </QueryState>
    </div>
  );
}

/** Copies the credentials set in the server's environment into saved settings (ADR 036). */
function ImportFromEnvironment() {
  const t = useTranslations('ops.messaging');
  const toast = useToast();
  const queryClient = useQueryClient();
  const run = useMutation({
    mutationFn: () => getRepository().opsImportMessagingFromEnvironment(),
    onSuccess: ({ imported, ...view }) => {
      queryClient.setQueryData(qk.ops('messaging'), view);
      toast(
        imported.length
          ? {
              tone: 'success',
              title: t('importEnv.done', {
                routes: imported.map((r) => t(`route.${r}`)).join(', '),
              }),
            }
          : { tone: 'info', title: t('importEnv.nothing') },
      );
    },
    onError: (e) =>
      toast({ tone: 'error', title: e instanceof RepositoryError ? e.message : String(e) }),
  });
  return (
    <Card title={t('importEnv.title')} titleId="msg-import-env">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{t('importEnv.body')}</p>
        <p className="text-sm text-muted">{t('importEnv.after')}</p>
        <div>
          <Button
            variant="secondary"
            loading={run.isPending}
            icon={<DatabaseZap className="size-4" aria-hidden="true" />}
            onClick={() => run.mutate()}
            data-testid="messaging-import-env"
          >
            {t('importEnv.button')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RouteCard({ view, kenyaEnabled }: { view: MessagingRouteView; kenyaEnabled: boolean }) {
  const t = useTranslations('ops.messaging');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const routeName = t(`route.${view.route}`);
  const [provider, setProvider] = useState(view.provider);
  const [values, setValues] = useState<Record<string, string>>(view.fields);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [testTo, setTestTo] = useState('');

  // A save or reset returns fresh values: show them, and never keep a typed secret in the form.
  useEffect(() => {
    setProvider(view.provider);
    setValues(view.fields);
  }, [view]);

  // A missing-fields refusal names the fields in the panel's language; anything else as it came.
  const explain = (e: unknown) => {
    const missing = e instanceof RepositoryError ? e.details?.missing : undefined;
    if (Array.isArray(missing) && missing.length)
      return t('missing', {
        fields: missing.map((k) => t(`field.${String(k)}` as never)).join(', '),
      });
    return e instanceof RepositoryError ? e.message : String(e);
  };
  const store = (v: MessagingSettingsView) => queryClient.setQueryData(qk.ops('messaging'), v);
  const save = useMutation({
    mutationFn: () => getRepository().opsSaveMessaging(view.route, { provider, fields: values }),
    onSuccess: (v) => {
      setError(null);
      store(v);
      toast({ tone: 'success', title: t('saved', { route: routeName }) });
    },
    onError: (e) => setError(explain(e)),
  });
  const reset = useMutation({
    mutationFn: () => getRepository().opsResetMessaging(view.route),
    onSuccess: (v) => {
      setConfirmReset(false);
      store(v);
      toast({ tone: 'success', title: t('resetDone', { route: routeName }) });
    },
    onError: (e) => setError(explain(e)),
  });
  const test = useMutation({
    mutationFn: () => getRepository().opsTestMessaging(view.route, testTo),
    onSuccess: (r) =>
      toast(
        r.ok
          ? { tone: 'success', title: t('testOk', { provider: r.provider }) }
          : { tone: 'error', title: t('testFailed', { error: r.error ?? '' }) },
      ),
    onError: (e) =>
      toast({
        tone: 'error',
        title: t('testFailed', { error: e instanceof RepositoryError ? e.message : String(e) }),
      }),
  });

  const defs = providerFields(view.route, provider);
  // Saved secrets only count for the provider they were saved with.
  const secretHint = (key: string) => (provider === view.provider ? view.secrets[key] : undefined);
  const field = (f: (typeof defs)[number]) => {
    const secret = 'secret' in f && f.secret;
    const required = 'required' in f && f.required;
    const hint = secret ? secretHint(f.key) : undefined;
    return (
      <TextField
        key={f.key}
        label={t(`field.${f.key}` as never)}
        optionalLabel={required ? undefined : tc('optional')}
        type={secret ? 'password' : 'text'}
        autoComplete="off"
        spellCheck={false}
        value={values[f.key] ?? ''}
        placeholder={hint ? '••••••••' : undefined}
        hint={secret ? (hint ? t('secretSaved', { hint }) : t('secretNew')) : undefined}
        onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
      />
    );
  };
  const main = defs.filter((f) => !isTemplate(f.key));
  const tpl = defs.filter((f) => isTemplate(f.key) && !f.key.endsWith('Ke'));
  const tplKe = kenyaEnabled ? defs.filter((f) => isTemplate(f.key) && f.key.endsWith('Ke')) : [];
  const titleId = `msg-${view.route}`;

  return (
    <Card title={routeName} titleId={titleId}>
      <form
        className="flex flex-col gap-4"
        aria-labelledby={titleId}
        data-testid={`messaging-${view.route}`}
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
            : t('source.environment')}
          {view.active ? ` · ${t('active', { name: view.active })}` : null}
        </p>
        <Select
          label={t('provider')}
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setError(null);
          }}
          options={Object.keys(MESSAGING_PROVIDERS[view.route]).map((p) => ({
            value: p,
            label: t(`providers.${p}` as never),
          }))}
        />
        {provider === 'fake' ? <Banner tone="warning">{t('fakeWarning')}</Banner> : null}
        {main.length ? <div className="grid gap-4 md:grid-cols-2">{main.map(field)}</div> : null}
        {tpl.length ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-semibold">{t('templates')}</legend>
            <div className="grid gap-4 md:grid-cols-2">{tpl.map(field)}</div>
          </fieldset>
        ) : null}
        {tplKe.length ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-semibold">{t('templatesKe')}</legend>
            <div className="grid gap-4 md:grid-cols-2">{tplKe.map(field)}</div>
          </fieldset>
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

      <form
        className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (testTo.trim()) test.mutate();
        }}
      >
        <h3 className="w-full font-semibold">{t('test')}</h3>
        <TextField
          wrapperClassName="min-w-56 flex-1"
          label={t('testTo')}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder="0712 345 678"
        />
        <Button
          type="submit"
          variant="secondary"
          loading={test.isPending}
          disabled={!testTo.trim()}
          icon={<Send className="size-4" aria-hidden="true" />}
        >
          {t('testSend')}
        </Button>
      </form>

      <ConfirmSheet
        open={confirmReset}
        onOpenChange={setConfirmReset}
        tone="danger"
        title={t('resetTitle', { route: routeName })}
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

function Webhooks({ view }: { view: MessagingSettingsView }) {
  const t = useTranslations('ops.messaging');
  return (
    <Card title={t('webhooks')} titleId="msg-webhooks">
      <p className="mb-3 text-sm text-muted">{t('webhooksIntro')}</p>
      <ul className="flex flex-col gap-2">
        {view.webhooks.map((w) => (
          <li key={w.path} className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {t(`route.${w.route}`)} · {t(`providers.${w.provider}` as never)}
            </span>
            <code className="rounded-input bg-bg px-2 py-1 text-sm break-all">
              {API_URL}
              {w.path}
            </code>
          </li>
        ))}
      </ul>
    </Card>
  );
}
