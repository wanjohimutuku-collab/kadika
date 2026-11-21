import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import brandIcon from '../../assets/icon.png';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CameraView, type BarcodeSettings } from 'expo-camera';
import { useLiveCameraPermission } from '../../src/lib/camera-permission';
import { API_URL } from '../../src/lib/repo';
import { getDeviceId, gateLabel } from '../../src/gate/device';
import { DEMO_EVENT_ID } from '../../src/gate/demo-bundle';
import { applyMaskedInput, mask } from '../../src/gate/mask';
import { saveGateSession } from '../../src/gate/gate-session';
import { gateCodeFrom } from '../../src/gate/join-code';
import { useLocale, useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/session';
import { spacing, useColors } from '../../src/lib/theme';
import { AppHeader } from '../../src/ui/header';
import { Icon } from '../../src/ui/icons';
import { Banner, BezelCard, Button, Field, Pill, Screen, Txt } from '../../src/ui/kit';

const CORNERS = [
  { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
] as const;

const BARCODE_SETTINGS: BarcodeSettings = { barcodeTypes: ['qr'] };

/** A gate agent opens the link (or scans the host's gate QR / types the code), enters the PIN and is in; no account needed. */
export default function GateJoin() {
  const { code: param } = useLocalSearchParams<{ code: string }>();
  const t = useT();
  const { locale } = useLocale();
  const { session } = useSession();
  const sw = locale === 'sw';
  const c = useColors();
  const [perm, requestPerm] = useLiveCameraPermission();
  const [focused, setFocused] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [code, setCode] = useState(gateCodeFrom(String(param ?? '')));
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pinRef = useRef<TextInput>(null);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setScanning(false);
      };
    }, []),
  );
  useEffect(() => setCode(gateCodeFrom(String(param ?? ''))), [param]);
  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) void requestPerm();
  }, [perm, requestPerm]);

  const stopCameraBeforeNav = async () => {
    setScanning(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 180));
  };

  const openScanner = async () => {
    if (perm?.granted) {
      setScanning(true);
      return;
    }
    if (perm?.canAskAgain === false) {
      void Linking.openSettings();
      return;
    }
    const res = await requestPerm();
    if (res.granted) setScanning(true);
  };

  const enterMockGate = async () => {
    await saveGateSession({
      token: 'mock-gate-token',
      expiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
      eventId: DEMO_EVENT_ID,
      eventName: 'Asha & Juma',
    });
    await stopCameraBeforeNav();
    router.replace(`/gate/${DEMO_EVENT_ID}`);
  };

  const join = async () => {
    const cleanCode = gateCodeFrom(code);
    const cleanPin = pin.trim();
    if (cleanCode.length < 4 || cleanPin.length < 4) return;
    if (cleanCode === 'DEMO') {
      await enterMockGate();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 4000);
      let res: Response;
      try {
        res = await fetch(`${API_URL}/v1/gate/join`, {
          method: 'POST',
          signal: ctl.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: cleanCode,
            pin: cleanPin,
            deviceId,
            deviceName: `Lango ${gateLabel(deviceId)}`,
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      const j = (await res.json()) as {
        accessToken?: string;
        expiresAt?: string;
        event?: { id: string; coupleNames: string };
        error?: { code: string; details?: { attemptsLeft?: number } };
      };
      if (!res.ok || !j.accessToken || !j.event) {
        const errCode = j.error?.code;
        setError(
          errCode === 'locked'
            ? t('gateApp.joinLocked')
            : errCode === 'not_found'
              ? sw
                ? 'Kiungo hiki hakipo au kimeisha muda wake.'
                : 'Gate link not found or expired.'
              : t('gateApp.joinWrong', { attempts: j.error?.details?.attemptsLeft ?? 4 }),
        );
        return;
      }
      await stopCameraBeforeNav();
      await saveGateSession({
        token: j.accessToken,
        expiresAt: j.expiresAt!,
        eventId: j.event.id,
        eventName: j.event.coupleNames,
      });
      router.replace(`/gate/${j.event.id}`);
    } catch {
      setError(
        sw
          ? 'Imeshindwa kuwasiliana na seva. Angalia mtandao au tumia Demo Gate.'
          : 'Could not reach the server. Check your connection or try Demo Gate below.',
      );
    } finally {
      setBusy(false);
    }
  };

  const cleanCode = gateCodeFrom(code);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={t('gateApp.joinTitle')}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />
      <Screen
        footer={
          <Button
            label={t('gateApp.joinGo')}
            icon="gate"
            loading={busy}
            disabled={pin.trim().length < 4 || cleanCode.length < 4}
            onPress={join}
          />
        }
      >
        {/* Centered dark + mint-green check-in join header */}
        <View style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs }}>
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: c.primary,
              backgroundColor: c.primarySoft,
              paddingHorizontal: 12,
              paddingVertical: 5,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Image
              source={brandIcon}
              accessibilityLabel={t('common.appName')}
              style={{ width: 18, height: 18, borderRadius: 4 }}
            />
            <Text style={{ color: c.ink, fontSize: 11.5, fontWeight: '700' }}>
              {`${t('common.appName')} · ${t('gateJoinPage.eyebrow')}`}
            </Text>
          </View>
          <Text
            style={{
              color: c.ink,
              fontSize: 22,
              fontWeight: '800',
              textAlign: 'center',
              letterSpacing: -0.3,
              marginTop: spacing.xs,
            }}
          >
            {t('gateJoinPage.title')}
          </Text>
          <Text
            style={{
              color: c.muted,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {t('gateApp.joinBody')}
          </Text>
        </View>

        {/* Live QR scanner viewfinder for the host's gate-link QR, with camera-permission fallback */}
        {perm?.granted ? (
          scanning && focused ? (
            <View
              style={{
                width: 228,
                height: 228,
                alignSelf: 'center',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <View
                style={{
                  width: 216,
                  height: 216,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#12161B',
                }}
              >
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={BARCODE_SETTINGS}
                  onBarcodeScanned={({ data }) => {
                    if (!scanning) return;
                    const parsed = gateCodeFrom(data);
                    if (parsed.length >= 4) {
                      setCode(parsed);
                      setScannedCode(parsed);
                      setError(null);
                      setScanning(false);
                      setTimeout(() => pinRef.current?.focus(), 120);
                    }
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={() => setScanning(false)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: 'rgba(11,14,17,0.8)',
                    borderWidth: 1,
                    borderColor: c.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="close" size={17} color={c.ink} />
                </Pressable>
              </View>
              <View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  borderRadius: 22,
                }}
              >
                {CORNERS.map((corner, idx) => (
                  <View
                    key={idx}
                    style={[
                      {
                        position: 'absolute',
                        width: 34,
                        height: 34,
                        borderColor: c.primary,
                      },
                      corner,
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {scannedCode && scannedCode === cleanCode ? (
                <View style={{ alignSelf: 'center' }}>
                  <Pill
                    tone="success"
                    icon="checkCircle"
                    label={`${t('gateJoinPage.codeLabel')}: ${scannedCode}`}
                  />
                </View>
              ) : null}
              <Button
                variant="secondary"
                icon="qr"
                label={t('gateApp.start')}
                onPress={() => setScanning(true)}
              />
            </View>
          )
        ) : (
          <View
            style={{
              height: 200,
              borderRadius: 20,
              backgroundColor: c.surface,
              padding: spacing.lg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.md,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Icon name="qr" size={32} color={c.primary} />
            <Txt bold color={c.ink}>
              {t('gateApp.cameraNeeded')}
            </Txt>
            <Button
              label={perm?.canAskAgain === false ? t('gateApp.openSettings') : t('gateApp.grant')}
              onPress={() => void openScanner()}
            />
          </View>
        )}

        <BezelCard coreStyle={{ gap: spacing.md }}>
          <Field
            label={t('gateApp.codeOrLink')}
            value={code}
            onFocus={() => setScanning(false)}
            onChangeText={(v) => {
              const next = gateCodeFrom(v);
              setCode(next);
              if (scannedCode && next !== scannedCode) setScannedCode(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Field
            inputRef={pinRef}
            label={t('gateApp.pin')}
            value={mask(pin)}
            onFocus={() => setScanning(false)}
            onChangeText={(v) => setPin((p) => applyMaskedInput(p, v))}
            keyboardType="number-pad"
            importantForAutofill="no"
            textContentType="none"
            maxLength={8}
            error={error}
            onSubmitEditing={join}
          />
        </BezelCard>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              icon="qr"
              label={sw ? 'Jaribu Demo' : 'Demo Gate'}
              onPress={() => void enterMockGate()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              icon="phone"
              label={sw ? 'Mandaaji' : 'Organizer'}
              onPress={async () => {
                await stopCameraBeforeNav();
                router.push(session ? '/events' : '/phone');
              }}
            />
          </View>
        </View>

        <Banner text={t('gateJoinPage.trust')} />
      </Screen>
    </View>
  );
}
