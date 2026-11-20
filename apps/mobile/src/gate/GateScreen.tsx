import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeSettings } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isMockPayload } from '@harusi/api-client';
import type { BundleGuest, GateRole, ScanOutcome } from '@harusi/gate';
import { normalizeShortCode } from '@harusi/schemas/short-code';
import { useLocale, useT } from '../lib/i18n';
import { useColors } from '../lib/theme';
import { Banner, Button, Field, Sheet, Txt } from '../ui/kit';
import { Icon } from '../ui/icons';
import { store } from '../lib/storage';
import { playResult } from './sound';
import { gateLabel } from './device';
import { useGate } from './use-gate';
import { SeatTag } from './SeatTag';

const OVERLAY_MS = 2500;
const BARCODE_SETTINGS: BarcodeSettings = { barcodeTypes: ['qr'] };
const timeOf = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 3 * 3_600_000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

interface Props {
  eventId: string;
  eventName?: string;
  role: GateRole;
  token: () => string | null;
  refresh?: () => Promise<void>;
  onLeave?: () => void;
}

/** The offline-first scanner (§17.5): viewfinder, torch, typed number, search, full-screen results. */
export function GateScreen(p: Props) {
  useKeepAwake();
  const t = useT();
  const { locale } = useLocale();
  const sw = locale === 'sw';
  const c = useColors();
  const g = useGate(p);
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [haptics, setHaptics] = useState(true);
  useEffect(() => {
    void store.get('harusi.gate.haptics').then((v) => v !== null && setHaptics(v === '1'));
  }, []);
  const [sound, setSound] = useState(true);
  useEffect(() => {
    void store.get('harusi.gate.sound').then((v) => v !== null && setSound(v === '1'));
  }, []);
  const toggleSound = () =>
    setSound((x) => {
      void store.set('harusi.gate.sound', x ? '0' : '1');
      return !x;
    });
  const toggleHaptics = () =>
    setHaptics((x) => {
      void store.set('harusi.gate.haptics', x ? '0' : '1');
      return !x;
    });
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [sheet, setSheet] = useState<'code' | 'search' | 'sync' | 'override' | null>(null);
  const busy = useRef(false); // the next scan is accepted only after the overlay is dismissed
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOutcome(null);
    busy.current = false;
    void g.refreshStats();
  }, [g]);

  const show = useCallback(
    (o: ScanOutcome) => {
      busy.current = true;
      setOutcome(o);
      if (haptics && Platform.OS !== 'web') {
        void Haptics.notificationAsync(
          o.kind === 'admit'
            ? Haptics.NotificationFeedbackType.Success
            : o.kind === 'duplicate'
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Error,
        );
      }
      if (sound) void playResult(o.kind === 'deny' ? 'deny' : o.kind);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(dismiss, OVERLAY_MS);
      void g.refreshStats();
    },
    [dismiss, g, haptics, sound],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const scanCtx = useRef({ g, show });
  scanCtx.current = { g, show };

  const onScan = useCallback(async ({ data }: { data: string }) => {
    const { g: curG, show: curShow } = scanCtx.current;
    if (busy.current || !curG.engine.current) return;
    busy.current = true;
    try {
      if (curG.isDemoMode && isMockPayload(data)) {
        const guestShort = data.split('.')[2] ?? '';
        const guest = curG.findByGuestShort(guestShort);
        if (guest) {
          curShow(await curG.engine.current.admitManual(guest.id));
          return;
        }
      }
      const trimmed = data.trim();
      const rawLast = trimmed.split(/[/?#]/).filter(Boolean).pop() ?? trimmed;
      const sc = normalizeShortCode(trimmed) ?? normalizeShortCode(rawLast);
      if (sc) {
        curShow(await curG.engine.current.scanCode(sc));
        return;
      }
      const qrToken = rawLast.startsWith('v1.') ? rawLast : trimmed;
      const qrOutcome = await curG.engine.current.scanQr(qrToken);
      if (qrOutcome.kind === 'admit') {
        await curG.rememberSignedToken(qrOutcome.guest.id, qrToken);
      }
      curShow(qrOutcome);
    } catch {
      busy.current = false;
    }
  }, []);

  const cameraRef = useRef<CameraView>(null);
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const camOk = Boolean(perm?.granted);
  const shouldRunCamera = focused && camOk && g.state === 'ready';
  useEffect(() => {
    if (!shouldRunCamera) {
      setCameraActive(false);
      setCameraReady(false);
      return;
    }
    const tId = setTimeout(() => setCameraActive(true), 250);
    return () => clearTimeout(tId);
  }, [shouldRunCamera]);

  useEffect(() => {
    if (!cameraActive || cameraReady) return;
    const tId = setTimeout(() => {
      void cameraRef.current?.resumePreview();
    }, 800);
    return () => clearTimeout(tId);
  }, [cameraActive, cameraReady]);

  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<BundleGuest | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [reason, setReason] = useState('');
  const results =
    g.engine.current && query.trim().length >= 2 ? g.engine.current.search(query) : [];
  const canOverride = p.role !== 'gate';
  const submitCode = async () => {
    if (!g.engine.current?.ready) return;
    const o = await g.engine.current.scanCode(code);
    setSheet(null);
    setCode('');
    show(o);
  };

  // ---- first run: the list has to be downloaded once
  if (g.state === 'opening' || g.state === 'downloading')
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 12 }}
      >
        <Txt size={24} bold>
          {t('gateApp.downloading')}
        </Txt>
        <Txt color={c.muted}>{g.stats.total ? `${g.stats.total}` : ''}</Txt>
      </SafeAreaView>
    );
  if (g.state === 'failed')
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 12 }}
      >
        <Banner tone="danger" text={t('gateApp.downloadFailed')} />
        <Button label={t('common.retry')} onPress={g.retryDownload} />
      </SafeAreaView>
    );

  const coupleTitle = g.event?.coupleNames ?? p.eventName ?? t('common.appName');
  const gateBadge = `${t('gateApp.gateName')} ${gateLabel(g.deviceId)}`;
  const remaining = Math.max(0, g.stats.total - g.stats.admitted);
  const pct =
    g.stats.total > 0 ? Math.min(100, Math.round((g.stats.admitted / g.stats.total) * 100)) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      {/* Compact dark top bar */}
      <View
        style={{
          backgroundColor: c.bg,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: c.primarySoft,
              borderWidth: 1,
              borderColor: c.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{ color: c.primary, fontSize: 11.5, fontWeight: '900', letterSpacing: 0.4 }}
            >
              KS
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.7,
              color: c.primary,
              textTransform: 'uppercase',
            }}
          >
            {`${t('common.appName')} · ${gateBadge}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gateApp.syncTitle')}
            onPress={() => {
              setSheet('sync');
              void g.verifyLocalAttendance();
            }}
            style={{
              height: 32,
              borderRadius: 16,
              paddingHorizontal: 10,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Icon
              name={g.online ? 'sync' : 'offline'}
              size={14}
              color={g.online ? c.primary : c.saffron}
            />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.ink }}>
              {g.online ? t('gateApp.online') : t('gateApp.offline')}
              {g.stats.pending > 0 ? ` (${g.stats.pending})` : ''}
            </Text>
          </Pressable>
          {p.onLeave ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('nav.switchEvent')}
              onPress={p.onLeave}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={16} color={c.ink} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Centered title + venue subtitle */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 6,
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 24,
            fontWeight: '800',
            color: c.ink,
            textAlign: 'center',
            letterSpacing: -0.4,
          }}
        >
          {coupleTitle}
        </Text>
        {g.event?.venueName ? (
          <Text numberOfLines={1} style={{ fontSize: 13.5, color: c.muted, textAlign: 'center' }}>
            {g.event.venueName}
          </Text>
        ) : null}
      </View>

      {/* Centered square QR viewfinder + circular mint-green Torch control */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          paddingHorizontal: 20,
        }}
      >
        {camOk ? (
          <>
            <View
              style={{
                width: 244,
                height: 244,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <View
                style={{
                  width: 232,
                  height: 232,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#12161B',
                }}
              >
                {cameraActive ? (
                  <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    enableTorch={torch}
                    barcodeScannerSettings={BARCODE_SETTINGS}
                    onBarcodeScanned={sheet || outcome ? undefined : onScan}
                    onCameraReady={() => setCameraReady(true)}
                  />
                ) : null}
              </View>
              <View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  borderRadius: 22,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 36,
                    height: 36,
                    borderTopWidth: 4,
                    borderLeftWidth: 4,
                    borderColor: c.primary,
                    borderTopLeftRadius: 22,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 36,
                    height: 36,
                    borderTopWidth: 4,
                    borderRightWidth: 4,
                    borderColor: c.primary,
                    borderTopRightRadius: 22,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: 36,
                    height: 36,
                    borderBottomWidth: 4,
                    borderLeftWidth: 4,
                    borderColor: c.primary,
                    borderBottomLeftRadius: 22,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 36,
                    height: 36,
                    borderBottomWidth: 4,
                    borderRightWidth: 4,
                    borderColor: c.primary,
                    borderBottomRightRadius: 22,
                  }}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sound ? '🔊' : '🔇'}
                onPress={toggleSound}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>{sound ? '🔊' : '🔇'}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`🔦 ${t('gateApp.torch')}`}
                onPress={() => setTorch((x) => !x)}
                style={{ alignItems: 'center', gap: 5 }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: torch ? '#FFFFFF' : c.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>🔦</Text>
                </View>
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                    color: torch ? c.primary : c.ink,
                    textTransform: 'uppercase',
                  }}
                >
                  {`🔦 ${t('gateApp.torch')}`}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={haptics ? '📳' : '🔕'}
                onPress={toggleHaptics}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>{haptics ? '📳' : '🔕'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View
            style={{
              padding: 24,
              gap: 12,
              backgroundColor: c.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border,
              alignSelf: 'stretch',
              justifyContent: 'center',
            }}
          >
            <Txt size={20} bold>
              {t('gateApp.cameraNeeded')}
            </Txt>
            <Txt color={c.muted}>{t('gateApp.cameraBody')}</Txt>
            {perm?.canAskAgain === false ? (
              <Button
                label={t('gateApp.openSettings')}
                onPress={() => void Linking.openSettings()}
              />
            ) : (
              <Button label={t('gateApp.grant')} icon="gate" onPress={() => void requestPerm()} />
            )}
          </View>
        )}
      </View>

      {/* Sleek Dark Ticket Counts Card */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 10,
          backgroundColor: c.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border,
          padding: 12,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: c.primarySoft,
              borderRadius: 12,
              paddingVertical: 7,
              paddingHorizontal: 8,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '900',
                color: c.primary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {g.stats.admitted}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>
              {t('overview.kpiAttended')}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: c.saffronSoft,
              borderRadius: 12,
              paddingVertical: 7,
              paddingHorizontal: 8,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '900',
                color: c.saffron,
                fontVariant: ['tabular-nums'],
              }}
            >
              {remaining}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: c.saffron }}>
              {t('billing.status.pending')}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: c.bg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              paddingVertical: 7,
              paddingHorizontal: 8,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '900',
                color: c.ink,
                fontVariant: ['tabular-nums'],
              }}
            >
              {g.stats.total}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: c.muted }}>
              {`${t('import.summary.total')} · ${t('billing.resource.cards')}`}
            </Text>
          </View>
        </View>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: c.bg, overflow: 'hidden' }}>
          <View
            style={{
              height: 6,
              borderRadius: 999,
              width: `${Math.max(g.stats.admitted > 0 ? 3 : 0, pct)}%`,
              backgroundColor: c.primary,
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Txt size={12} bold color={c.ink} style={{ fontVariant: ['tabular-nums'] } as never}>
            {t('gateApp.arrived', { admitted: g.stats.admitted, total: g.stats.total })}
          </Txt>
          <Txt size={12} color={c.muted} style={{ fontVariant: ['tabular-nums'] } as never}>
            {t('billing.left', { n: remaining })}
          </Txt>
          <Txt size={12} bold color={c.primary} style={{ fontVariant: ['tabular-nums'] } as never}>
            {`${t('gateApp.people', { count: g.stats.admittedPeople })} / ${g.stats.totalPeople}`}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Encrypted Local Vault"
          onPress={() => setSheet('sync')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.bg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: g.vaultReport?.ok ? '#1E3A2F' : c.border,
            paddingVertical: 7,
            paddingHorizontal: 10,
            gap: 8,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon
              name="shield"
              size={14}
              color={g.vaultReport?.ok ? c.primary : g.vaultReport ? c.danger : c.muted}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 11.5,
                fontWeight: '700',
                color: c.ink,
              }}
            >
              {g.vaultReport?.ok
                ? sw
                  ? 'Hifadhi Iliyosimbwa · Imethibitishwa Ndani'
                  : 'Encrypted Vault · Verified Locally'
                : g.vaultReport
                  ? sw
                    ? 'Hifadhi Iliyosimbwa · Ukaguzi Umefeli'
                    : 'Encrypted Vault · Check Failed'
                  : sw
                    ? 'Hifadhi Iliyosimbwa · Tayari'
                    : 'Encrypted Vault · Ready'}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: g.vaultReport?.ok ? c.primary : c.muted,
              fontVariant: ['tabular-nums'],
            }}
          >
            {`${g.vaultReport?.recordCount ?? g.stats.admitted} · #${(g.vaultReport?.chainDigest || '00000000').slice(0, 8)} ›`}
          </Text>
        </Pressable>
      </View>

      {/* Bottom 3-Slot Check-in Dock */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#12161B',
          borderTopWidth: 1,
          borderColor: c.border,
          minHeight: 64,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`⌨ ${t('gateApp.typeCode')}`}
          onPress={() => setSheet('code')}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            paddingHorizontal: 6,
          }}
        >
          <Icon name="edit" size={18} color={c.muted} />
          <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: c.muted }}>
            {`⌨ ${t('gateApp.typeCode')}`}
          </Text>
        </Pressable>

        <View
          style={{
            flex: 1.15,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            paddingHorizontal: 8,
          }}
        >
          <Icon name="qr" size={20} color={c.onPrimary} />
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '900', color: c.onPrimary }}>
            {t('gateApp.gateName')}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gateApp.searchPlaceholder')}
          onPress={() => setSheet('search')}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            paddingHorizontal: 6,
          }}
        >
          <Icon name="search" size={18} color={c.muted} />
          <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: c.muted }}>
            {sw ? 'Tafuta mgeni' : 'Search guest'}
          </Text>
        </Pressable>
      </View>

      {outcome ? (
        <ResultOverlay
          outcome={outcome}
          onDismiss={dismiss}
          canOverride={canOverride}
          onOverride={() => {
            if (timer.current) clearTimeout(timer.current);
            setSheet('override');
          }}
          onSearch={() => {
            dismiss();
            setSheet('search');
          }}
          gateOf={(id) => `${t('gateApp.gateName')} ${gateLabel(id)}`}
        />
      ) : null}

      <Sheet open={sheet === 'code'} onClose={() => setSheet(null)} title={t('gateApp.typeCode')}>
        <Field
          label={t('gateApp.typeCodeLabel')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submitCode}
        />
        <Button label={t('gateApp.go')} onPress={submitCode} />
      </Sheet>

      <Sheet
        open={sheet === 'search'}
        onClose={() => {
          setSheet(null);
          setPicked(null);
        }}
        title={t('gateApp.searchPlaceholder')}
      >
        {picked ? (
          <>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 22,
                backgroundColor: '#222A33',
                alignSelf: 'center',
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 4,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: c.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={24} color={c.onPrimary} />
              </View>
            </View>
            <Txt size={20} bold style={{ textAlign: 'center' } as never}>
              {t('gate.confirmTitle', { name: picked.displayName })}
            </Txt>
            <Txt color={c.muted} style={{ textAlign: 'center' } as never}>
              {t('gateApp.people', { count: picked.partySizeAllowed })} · {picked.groupLabel ?? ''}
            </Txt>
            <SeatTag seats={picked.partySizeAllowed} locale={locale} color={c.primary} />
            {picked.partySizeAllowed > 1 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 18,
                  paddingVertical: 6,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={sw ? 'Punguza idadi' : 'Decrease party size'}
                  disabled={partySize <= 1}
                  onPress={() => setPartySize((n) => Math.max(1, n - 1))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: partySize <= 1 ? 0.4 : 1,
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '800', color: c.ink }}>−</Text>
                </Pressable>
                <View style={{ alignItems: 'center', minWidth: 52 }}>
                  <Text
                    style={{
                      fontSize: 26,
                      fontWeight: '900',
                      color: c.primary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {partySize}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.muted }}>
                    {sw ? `kati ya ${picked.partySizeAllowed}` : `of ${picked.partySizeAllowed}`}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={sw ? 'Ongeza idadi' : 'Increase party size'}
                  disabled={partySize >= picked.partySizeAllowed}
                  onPress={() => setPartySize((n) => Math.min(picked.partySizeAllowed, n + 1))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: partySize >= picked.partySizeAllowed ? 0.4 : 1,
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '800', color: c.ink }}>+</Text>
                </Pressable>
              </View>
            ) : null}
            <Button
              label={t('gateApp.confirm')}
              onPress={async () => {
                const o = await g.engine.current!.admitManual(picked.id, partySize);
                setPicked(null);
                setPartySize(1);
                setSheet(null);
                setQuery('');
                show(o);
              }}
            />
            <Button
              variant="secondary"
              label={t('common.cancel')}
              onPress={() => setPicked(null)}
            />
          </>
        ) : (
          <>
            <Field
              label={t('gate.search')}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoFocus
            />
            {query.trim().length >= 2 && results.length === 0 ? (
              <Txt color={c.muted}>{t('gateApp.noMatch')}</Txt>
            ) : null}
            {results.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={r.displayName}
                onPress={() => {
                  setPicked(r);
                  setPartySize(Math.max(1, r.partySizeAllowed));
                }}
                style={{
                  minHeight: 56,
                  justifyContent: 'center',
                  borderBottomWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Txt bold>{r.displayName}</Txt>
                <Txt size={14} color={c.muted}>
                  {r.shortCode}
                  {r.phoneLast4 ? ` · …${r.phoneLast4}` : ''}
                  {r.groupLabel ? ` · ${r.groupLabel}` : ''}
                </Txt>
              </Pressable>
            ))}
          </>
        )}
      </Sheet>

      <Sheet open={sheet === 'sync'} onClose={() => setSheet(null)} title={t('gateApp.syncTitle')}>
        <View
          style={{
            backgroundColor: c.bg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: g.vaultReport?.ok ? c.primary : c.border,
            padding: 14,
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <View
              style={{ flex: 1, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="shield" size={16} color={c.primary} />
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: c.ink }}
              >
                {sw ? 'Hifadhi Iliyosimbwa' : 'Encrypted Vault'}
              </Text>
            </View>
            <View
              style={{
                flexShrink: 0,
                backgroundColor: g.vaultReport?.ok ? c.primarySoft : '#2E1619',
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: '800',
                  color: g.vaultReport?.ok ? c.primary : c.danger,
                }}
              >
                {g.vaultReport?.ok
                  ? sw
                    ? 'IMETHIBITISHWA ✔'
                    : 'VERIFIED LOCALLY ✔'
                  : sw
                    ? 'HAIJATHIBITISHWA'
                    : 'UNVERIFIED'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 11.5, color: c.muted }}>
            {'CTR-SHA512 + HMAC-SHA512 · Ed25519'}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: c.surface,
                borderRadius: 12,
                padding: 10,
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 11, color: c.muted }}>
                {sw ? 'Mahudhurio Yaliyohifadhiwa' : 'Saved Attending'}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: c.ink,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {`${g.vaultReport?.recordCount ?? 0} (${g.vaultReport?.peopleCount ?? 0} ${sw ? 'watu' : 'people'})`}
              </Text>
            </View>

            <View
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: c.surface,
                borderRadius: 12,
                padding: 10,
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 11, color: c.muted }}>
                {sw ? 'Sahihi za Ed25519' : 'Ed25519 Signatures'}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: c.primary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {`${g.vaultReport?.signaturesVerified ?? 0} / ${g.vaultReport?.recordCount ?? 0}`}
              </Text>
            </View>

            <View
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: c.surface,
                borderRadius: 12,
                padding: 10,
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 11, color: c.muted }}>
                {sw ? 'Muhtasari wa Mnyororo' : 'Chain Digest'}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: c.ink,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {`#${(g.vaultReport?.chainDigest || '00000000').slice(0, 12)}`}
              </Text>
            </View>

            <View
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: c.surface,
                borderRadius: 12,
                padding: 10,
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 11, color: c.muted }}>
                {sw ? 'Faili la Ndani' : 'Local Storage'}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>
                {g.vaultReport?.fileUri ? 'SQLite + .ksenc' : 'SQLite KV Vault'}
              </Text>
            </View>
          </View>

          {g.vaultReport && !g.vaultReport.ok && g.vaultReport.error ? (
            <Banner tone="danger" text={g.vaultReport.error} />
          ) : null}

          {g.vaultReport?.verifiedAt ? (
            <Text style={{ fontSize: 11.5, color: c.muted }}>
              {`${sw ? 'Ilithibitishwa saa' : 'Verified at'} ${timeOf(g.vaultReport.verifiedAt)}`}
            </Text>
          ) : null}

          <Button
            label={sw ? 'Thibitisha Ndani (Offline)' : 'Verify Locally Offline'}
            icon="check"
            loading={g.vaultBusy}
            onPress={() => void g.verifyLocalAttendance()}
          />
          <Button
            variant="secondary"
            label={sw ? 'Hifadhi Data Iliyosimbwa' : 'Save Encrypted Data'}
            icon="shield"
            loading={g.vaultBusy}
            onPress={() => void g.saveEncryptedAttendance()}
          />
          <Button
            variant="secondary"
            label={sw ? 'Shiriki Hifadhi (.ksenc)' : 'Share Encrypted Backup (.ksenc)'}
            icon="download"
            onPress={async () => {
              const res = await g.exportEncryptedEnvelope();
              if (!res) return;
              const digest = (g.vaultReport?.chainDigest || '00000000').slice(0, 12);
              await Share.share({
                title: `${coupleTitle} (.ksenc)`,
                url: res.fileUri ?? undefined,
                message: `${coupleTitle} · #${digest}\n${res.envelope}`,
              }).catch(() => undefined);
            }}
          />

          {g.vaultReport && g.vaultReport.records.length > 0 ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>
                {sw ? 'Wageni Waliothibitishwa Ndani' : 'Locally Verified Attending Records'}
              </Text>
              {g.vaultReport.records.map((rec) => (
                <View
                  key={rec.guestId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: c.surface,
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 13, fontWeight: '700', color: c.ink }}
                    >
                      {rec.displayName}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 11, color: c.muted, fontVariant: ['tabular-nums'] }}
                    >
                      {`${rec.shortCode} · +${rec.partyAdmitted} · #${rec.recordHash.slice(0, 8)}`}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: c.primarySoft,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: c.primary }}>
                      {rec.signedToken ? '✔ Ed25519' : '✔ HMAC'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Txt>{t('gateApp.syncPending', { n: g.stats.pending })}</Txt>
        <Txt color={c.muted}>
          {g.lastSync
            ? t('gateApp.syncLast', { time: timeOf(g.lastSync) })
            : t('gateApp.syncNever')}
        </Txt>
        {g.syncError ? <Banner tone="warning" text={t('gateApp.syncFailed')} /> : null}
        <Button
          label={t('gateApp.syncNow')}
          onPress={async () => {
            await g.syncNow();
          }}
        />
        {p.onLeave ? (
          <Button
            variant="ghost"
            icon="gate"
            label={t('nav.switchEvent')}
            onPress={() => {
              setSheet(null);
              p.onLeave?.();
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={sheet === 'override'}
        onClose={() => {
          setSheet(null);
          dismiss();
        }}
        title={t('gateApp.override')}
      >
        <Field label={t('gateApp.overrideReason')} value={reason} onChangeText={setReason} />
        <Button
          label={t('gateApp.overrideGo')}
          disabled={reason.trim().length < 3}
          onPress={async () => {
            if (outcome?.kind === 'duplicate')
              await g.engine.current!.override(outcome.guest.id, reason);
            setReason('');
            setSheet(null);
            dismiss();
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}

/** Bottom-sheet check-in result: colour + icon + word, never colour alone (§17.5, §17.12). */
function ResultOverlay({
  outcome,
  onDismiss,
  canOverride,
  onOverride,
  onSearch,
  gateOf,
}: {
  outcome: ScanOutcome;
  onDismiss: () => void;
  canOverride: boolean;
  onOverride: () => void;
  onSearch: () => void;
  gateOf: (deviceId: string) => string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const accentColor =
    outcome.kind === 'admit' ? '#1FE086' : outcome.kind === 'duplicate' ? '#F5A623' : '#FF5A5F';
  const icon = outcome.kind === 'admit' ? '✔' : outcome.kind === 'duplicate' ? '⚠' : '✖';
  const word =
    outcome.kind === 'admit'
      ? t('gateApp.admit')
      : outcome.kind === 'duplicate'
        ? t('gateApp.duplicate')
        : t('gateApp.invalid');
  const guest = outcome.kind === 'deny' ? null : outcome.guest;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={word}
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'flex-end',
        },
      ]}
    >
      <Pressable style={{ flex: 1 }} onPress={onDismiss} />
      <View
        style={{
          backgroundColor: '#171C22',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderColor: '#262F38',
          padding: 24,
          gap: 14,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{word}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onDismiss}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#0B0E11',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={18} color="#8B95A1" />
          </Pressable>
        </View>

        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            backgroundColor: '#222A33',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: accentColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#061A10', fontSize: 34, fontWeight: '900' }}>{icon}</Text>
          </View>
        </View>

        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>
          {word}
        </Text>
        {guest ? (
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            {guest.displayName}
          </Text>
        ) : null}
        {guest ? (
          <SeatTag seats={guest.partySizeAllowed} locale={locale} color={accentColor} />
        ) : null}
        {outcome.kind === 'admit' ? (
          <Text style={{ color: '#8B95A1', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
            {t('gateApp.people', { count: outcome.partyAdmitted })}
          </Text>
        ) : null}
        {guest?.groupLabel ? (
          <Text style={{ color: '#8B95A1', fontSize: 15, textAlign: 'center' }}>
            {guest.groupLabel}
          </Text>
        ) : null}
        {outcome.kind === 'duplicate' ? (
          <Text style={{ color: '#8B95A1', fontSize: 15, textAlign: 'center' }}>
            {t('gateApp.dupDetail', {
              time: timeOf(outcome.first.at),
              gate: gateOf(outcome.first.deviceId),
            })}
          </Text>
        ) : null}
        {outcome.kind === 'deny' ? (
          <Text style={{ color: '#8B95A1', fontSize: 15, textAlign: 'center' }}>
            {t(`gateApp.reason.${outcome.reason}`)}
          </Text>
        ) : null}

        <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 4 }}>
          <Button label={t('gateApp.ok')} onPress={onDismiss} />
          {outcome.kind === 'duplicate' && canOverride ? (
            <Button label={t('gateApp.override')} variant="secondary" onPress={onOverride} />
          ) : null}
          {outcome.kind === 'deny' ? (
            <Button label={t('gateApp.findByName')} variant="secondary" onPress={onSearch} />
          ) : null}
        </View>
      </View>
    </View>
  );
}
