import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { API_URL } from '../../src/lib/repo';
import { getDeviceId, gateLabel } from '../../src/gate/device';
import { applyMaskedInput, mask } from '../../src/gate/mask';
import { saveGateSession } from '../../src/gate/gate-session';
import { useT } from '../../src/lib/i18n';
import { Banner, Button, Field, Screen, Txt } from '../../src/ui/kit';

/** A gate agent opens the link (or types the code), enters the PIN and is in; no account needed. */
export default function GateJoin() {
  const { code: param } = useLocalSearchParams<{ code: string }>();
  const t = useT();
  const [code, setCode] = useState(String(param ?? '').toUpperCase());
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setCode(String(param ?? '').toUpperCase()), [param]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${API_URL}/v1/gate/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, pin, deviceId, deviceName: `Lango ${gateLabel(deviceId)}` }),
      });
      const j = (await res.json()) as {
        accessToken?: string;
        expiresAt?: string;
        event?: { id: string; coupleNames: string };
        error?: { code: string; details?: { attemptsLeft?: number } };
      };
      if (!res.ok || !j.accessToken || !j.event) {
        const c = j.error?.code;
        setError(
          c === 'locked'
            ? t('gateApp.joinLocked')
            : c === 'not_found'
              ? t('gateApp.joinInvalid')
              : t('gateApp.joinWrong', { attempts: j.error?.details?.attemptsLeft ?? 4 }),
        );
        return;
      }
      await saveGateSession({
        token: j.accessToken,
        expiresAt: j.expiresAt!,
        eventId: j.event.id,
        eventName: j.event.coupleNames,
      });
      router.replace(`/gate/${j.event.id}`);
    } catch {
      setError(t('states.offlineBanner'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          label={t('gateApp.joinGo')}
          loading={busy}
          disabled={pin.length < 4}
          onPress={join}
        />
      }
    >
      <Txt size={24} bold>
        {t('gateApp.joinTitle')}
      </Txt>
      <Txt>{t('gateApp.joinBody')}</Txt>
      <Field
        label={t('gateApp.linkCode')}
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Field
        label={t('gateApp.pin')}
        value={mask(pin)}
        onChangeText={(v) => setPin((p) => applyMaskedInput(p, v))}
        keyboardType="number-pad"
        importantForAutofill="no"
        textContentType="none"
        maxLength={8}
        error={error}
        onSubmitEditing={join}
      />
      <Banner text={t('auth.trust')} />
    </Screen>
  );
}
