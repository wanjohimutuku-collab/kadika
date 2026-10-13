'use client';

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Link2, ShieldAlert, UserMinus, UserPlus } from 'lucide-react';
import type { GateLink, Member } from '@harusi/api-client';
import { normalizeTzPhone } from '@harusi/schemas/phone';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Avatar, Banner, Card, EmptyState, Skeleton, StatusPill } from '@/components/ui/display';
import { BottomSheet, ConfirmSheet } from '@/components/ui/overlay';
import { PhoneField, TextField } from '@/components/ui/form';
import { QrBlock } from '@/components/ui/qr-block';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useSession } from '@/lib/queries';
import { formatDateShort, formatPhone, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('team');
  const tn = useTranslations('nav');
  const tv = useTranslations('validation');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const members = useQuery({
    queryKey: qk.members(id),
    queryFn: () => getRepository().listMembers(id),
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'committee' | 'gate'>('committee');
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [revoking, setRevoking] = useState<Member | null>(null);
  const [link, setLink] = useState<GateLink | null>(null);
  const [pinVisible, setPinVisible] = useState(false);

  const invite = useMutation({
    mutationFn: (e164: string) =>
      getRepository().inviteMember(id, { name: name.trim(), phoneE164: e164, role }),
    onSuccess: async (m) => {
      toast({ tone: 'success', title: t('invited', { name: m.name }) });
      setInviteOpen(false);
      setName('');
      setPhone('');
      await queryClient.invalidateQueries({ queryKey: qk.members(id) });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const revoke = useMutation({
    mutationFn: (m: Member) => getRepository().revokeMember(id, m.id),
    onSuccess: async (m) => {
      toast({ tone: 'success', title: t('revoked', { name: m.name }) });
      setRevoking(null);
      await queryClient.invalidateQueries({ queryKey: qk.members(id) });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const gateLink = useMutation({
    mutationFn: () => getRepository().createGateLink(id),
    onSuccess: (l) => {
      setLink(l);
      setPinVisible(true);
    },
    onError: (e) =>
      toast({
        tone: 'error',
        title: (e as { code?: string }).code === 'offline' ? ts('offlineBanner') : ts('errorTitle'),
      }),
  });

  if (session.data && session.data.role !== 'owner') {
    return <EmptyState icon={<ShieldAlert className="size-7" />} title={tn('ownerOnly')} />;
  }

  const copy = async (text: string) => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    toast({ tone: 'success', title: tc('copied') });
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            onClick={() => setInviteOpen(true)}
          >
            {t('invite')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card title={t('members')} titleId="mem-h">
          <QueryState query={members} skeleton={<Skeleton lines={5} />}>
            {(list) => (
              <ul className="flex flex-col divide-y divide-border" data-testid="members">
                {list.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 py-3',
                      m.status === 'revoked' && 'opacity-60',
                    )}
                  >
                    <Avatar name={m.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-sm text-muted">
                        {formatPhone(m.phoneE164)} ·{' '}
                        {m.lastActiveAt
                          ? t('lastActive', { time: formatRelative(m.lastActiveAt, locale) })
                          : t('never')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill
                        tone={
                          m.role === 'owner' ? 'primary' : m.role === 'gate' ? 'info' : 'neutral'
                        }
                      >
                        {t(`role.${m.role}`)}
                      </StatusPill>
                      {m.status !== 'active' ? (
                        <StatusPill tone={m.status === 'invited' ? 'warning' : 'danger'}>
                          {t(`status.${m.status}`)}
                        </StatusPill>
                      ) : null}
                      {m.role !== 'owner' && m.status !== 'revoked' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<UserMinus className="size-4" aria-hidden="true" />}
                          onClick={() => setRevoking(m)}
                        >
                          {t('revoke')}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>

        <Card title={t('gateLink')} titleId="gl-h">
          <p className="mb-3 text-sm text-muted">{t('gateLinkHelp')}</p>
          {link ? (
            <div className="flex flex-col gap-3" data-testid="gate-link">
              <div className="self-center rounded-card border border-border bg-white p-2">
                <QrBlock payload={link.url} alt={t('qrAlt')} size={168} />
              </div>
              <div className="flex items-center gap-2 rounded-input border border-border bg-bg p-2">
                <Link2 className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{link.url}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Copy className="size-4" aria-hidden="true" />}
                  onClick={() => copy(link.url)}
                >
                  {t('copyLink')}
                </Button>
              </div>
              {pinVisible ? (
                <>
                  <Banner tone="warning" title={t('pinOnce')} />
                  <div className="flex items-center justify-between gap-2 rounded-input border-2 border-primary p-3">
                    <span className="flex items-center gap-2">
                      <KeyRound className="size-5 text-primary" aria-hidden="true" />
                      <span className="text-sm text-muted">{t('pin')}</span>
                      <span
                        className="font-mono text-2xl font-bold tracking-[0.3em]"
                        data-testid="gate-pin"
                      >
                        {link.pin}
                      </span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => copy(link.pin)}>
                      {t('copyPin')}
                    </Button>
                  </div>
                  <Button variant="secondary" onClick={() => setPinVisible(false)}>
                    {t('hidePin')}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted">{t('pin')}: ••••••</p>
              )}
              <p className="text-sm text-muted">
                {t('expires', { date: formatDateShort(link.expiresAt, locale) })}
              </p>
            </div>
          ) : null}
          <Button
            className="mt-3"
            variant={link ? 'secondary' : 'primary'}
            onClick={() => gateLink.mutate()}
            loading={gateLink.isPending}
            data-testid="generate-gate-link"
          >
            {t('generate')}
          </Button>
        </Card>
      </div>

      <BottomSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title={t('inviteTitle')}
        closeLabel={tc('close')}
        footer={
          <Button
            loading={invite.isPending}
            disabled={name.trim().length < 2}
            onClick={() => {
              const r = normalizeTzPhone(phone);
              if (!r.ok) return setPhoneError(tv(`phone.${r.error}`));
              setPhoneError(undefined);
              invite.mutate(r.e164);
            }}
          >
            {t('send')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField
            label={t('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
          <PhoneField label={t('phone')} value={phone} onChange={setPhone} error={phoneError} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t('roleLabel')}</legend>
            {(['committee', 'gate'] as const).map((r) => (
              <label
                key={r}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-card border-2 p-3',
                  role === r ? 'border-primary' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="mt-1 size-5 accent-[var(--hp-primary)]"
                />
                <span>
                  <span className="block font-semibold">{t(`role.${r}`)}</span>
                  <span className="text-sm text-muted">{t(`roleHelp.${r}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={revoking ? t('revokeTitle', { name: revoking.name }) : ''}
        consequence={revoking ? t('revokeBody', { name: revoking.name }) : ''}
        confirmLabel={t('revoke')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={revoke.isPending}
        onConfirm={() => {
          if (revoking) revoke.mutate(revoking);
        }}
      />
    </>
  );
}
