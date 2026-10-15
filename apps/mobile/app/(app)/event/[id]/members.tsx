import { useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useGlobalSearchParams } from 'expo-router';
import { formatPhone } from '@harusi/schemas/phone';
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
import type { GateLink, Member } from '@harusi/api-client';
import { getRepository } from '../../../../src/lib/repo';
import { parsePhone, useEventLocale } from '../../../../src/lib/country';

export default function Members() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const q = useMembers(id);
  const { country } = useEventLocale(id);
  const invite = useInviteMember(id);
  const revoke = useRevokeMember(id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'committee' | 'gate'>('committee');
  const [err, setErr] = useState<string | null>(null);
  const [target, setTarget] = useState<Member | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [link, setLink] = useState<GateLink | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const send = async () => {
    const p = parsePhone(phone, country);
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
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button label={t('team.invite')} onPress={() => setOpen(true)} />
            <Button
              variant="secondary"
              label={t('gateApp.createLink')}
              loading={linkBusy}
              onPress={async () => {
                setLinkBusy(true);
                try {
                  setLink(await getRepository().createGateLink(id));
                } catch {
                  setDone(t('states.errorBody'));
                } finally {
                  setLinkBusy(false);
                }
              }}
            />
          </View>
        }
      >
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
                <Txt bold>{m.name || formatPhone(m.phoneE164, country)}</Txt>
                <Txt size={14} color={c.muted}>
                  {formatPhone(m.phoneE164, country)} · {t(`team.role.${m.role}`)}
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
      <Sheet open={!!link} onClose={() => setLink(null)} title={t('gateApp.createLink')}>
        <Banner tone="warning" text={t('gateApp.linkShown')} />
        <Txt size={14} color={c.muted}>
          {t('gateApp.linkCode')}
        </Txt>
        <Txt size={28} bold>
          {link?.code}
        </Txt>
        <Txt size={14} color={c.muted}>
          {t('gateApp.linkPin')}
        </Txt>
        <Txt size={36} bold>
          {link?.pin}
        </Txt>
        <Txt size={14} color={c.muted}>
          {link?.url}
        </Txt>
        <Button
          variant="secondary"
          label={t('common.copy')}
          onPress={async () => {
            await Clipboard.setStringAsync(`${link?.url}  PIN ${link?.pin}`);
            setDone(t('common.copied'));
          }}
        />
        <Button label={t('common.done')} onPress={() => setLink(null)} />
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
