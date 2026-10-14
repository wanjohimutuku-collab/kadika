import { useState } from 'react';
import { View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { normalizeTzPhone, formatTzPhone } from '@harusi/schemas/phone';
import { useInviteMember, useMembers, useRevokeMember } from '../../../../src/lib/queries';
import { useT } from '../../../../src/lib/i18n';
import { useColors } from '../../../../src/lib/theme';
import { AppHeader } from '../../../../src/ui/header';
import {
  Banner,
  Button,
  ConfirmSheet,
  ErrorState,
  Field,
  Pill,
  Row,
  Screen,
  Segmented,
  Sheet,
  Skeleton,
  Txt,
} from '../../../../src/ui/kit';
import type { Member } from '@harusi/api-client';

export default function Members() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const q = useMembers(id);
  const invite = useInviteMember(id);
  const revoke = useRevokeMember(id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'committee' | 'gate'>('committee');
  const [err, setErr] = useState<string | null>(null);
  const [target, setTarget] = useState<Member | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const send = async () => {
    const p = normalizeTzPhone(phone);
    if (name.trim().length < 2) return setErr(t('validation.name.too_short'));
    if (!p.ok) return setErr(t(`validation.phone.${p.error}`));
    setErr(null);
    try {
      await invite.mutateAsync({ name: name.trim(), phoneE164: p.e164, role });
      setDone(t('team.invited', { name: name.trim() }));
      setOpen(false);
      setName('');
      setPhone('');
    } catch {
      setErr(t('states.errorBody'));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('team.title')} onBack={() => router.back()} />
      <Screen footer={<Button label={t('team.invite')} onPress={() => setOpen(true)} />}>
        {done ? <Banner tone="success" text={done} /> : null}
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          q.data.map((m) => (
            <Row
              key={m.id}
              onPress={m.role === 'owner' ? undefined : () => setTarget(m)}
              label={m.name}
            >
              <View style={{ flex: 1 }}>
                <Txt bold>{m.name || formatTzPhone(m.phoneE164)}</Txt>
                <Txt size={14} color={c.muted}>
                  {formatTzPhone(m.phoneE164)} · {t(`team.role.${m.role}`)}
                </Txt>
              </View>
              <Pill
                label={t(`team.status.${m.status}`)}
                tone={m.status === 'active' ? 'success' : 'neutral'}
              />
            </Row>
          ))
        )}
      </Screen>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('team.inviteTitle')}>
        <Field label={t('team.name')} value={name} onChangeText={setName} />
        <Field
          label={t('team.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={err}
        />
        <Txt bold size={14}>
          {t('team.roleLabel')}
        </Txt>
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: 'committee', label: t('team.role.committee') },
            { value: 'gate', label: t('team.role.gate') },
          ]}
        />
        <Txt size={14} color={c.muted}>
          {t(`team.roleHelp.${role}`)}
        </Txt>
        <Button label={t('team.send')} loading={invite.isPending} onPress={send} />
      </Sheet>
      <ConfirmSheet
        open={!!target}
        danger
        title={t('team.revokeTitle', { name: target?.name ?? '' })}
        body={t('team.revokeBody', { name: target?.name ?? '' })}
        confirmLabel={t('team.revoke')}
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          const m = target!;
          await revoke.mutateAsync(m.id.includes(':') ? m.id : m.id).catch(() => null);
          setDone(t('team.revoked', { name: m.name }));
        }}
      />
    </View>
  );
}
