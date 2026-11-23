import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import brandIcon from '../../assets/icon.png';
import { CameraView, type BarcodeSettings } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLiveCameraPermission } from '../lib/camera-permission';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isMockPayload } from '@harusi/api-client';
import type { BundleGuest, GateRole, ScanOutcome } from '@harusi/gate';
import { extractShortCode, extractShortCodeFromPartialSms } from '@harusi/schemas/short-code';
import { useLocale, useT } from '../lib/i18n';
import { useColors } from '../lib/theme';
import { Banner, Button, Field, Sheet, Txt } from '../ui/kit';
import { Icon } from '../ui/icons';
import { store } from '../lib/storage';
import { playResult } from './sound';
import { gateLabel } from './device';
import { useGate } from './use-gate';
import { SeatTag } from './SeatTag';
import {
  releaseMobileSmsReader,
  scanSmsFrames,
  scanSmsImage,
  type HarusiSmsOcrNative,
  type MobileSmsImage,
} from './sms-ocr';

const nativeSmsOcr = (NativeModules as { HarusiSmsOcr?: HarusiSmsOcrNative } | undefined)
  ?.HarusiSmsOcr;
if (nativeSmsOcr) {
  (globalThis as { __harusiNativeSmsOcr?: HarusiSmsOcrNative }).__harusiNativeSmsOcr = nativeSmsOcr;
}

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
  /** True when rendered inside the organizer event tabs (which already render AppHeader). */
  embedded?: boolean;
}

/**
 * The offline-first gate scanner (§17.5, ADR 059):
 * - Clean 2-mode viewfinder: **QR** (automatic barcode scan) and **SMS** (wide text-scanning window
 *   built for feature/disposable phones whose 2–3 line screens only show part of the SMS at a time).
 * - Multi-frame scroll stitching + partial SMS matching (matches visible name, `/s/` link, clipped
 *   code, or full code against the downloaded guest bundle).
 * - Uncluttered layout with a single compact attendance bar and a 3-action bottom dock.
 */
export function GateScreen(p: Props) {
  useKeepAwake();
  const t = useT();
  const { locale } = useLocale();
  const sw = locale === 'sw';
  const c = useColors();
  const g = useGate(p);
  const [perm, requestPerm] = useLiveCameraPermission();
  const [scanMode, setScanMode] = useState<'qr' | 'sms'>('qr');
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
  const [smsReading, setSmsReading] = useState(false);
  const [smsNotice, setSmsNotice] = useState<string | null>(null);
  const [smsInlineText, setSmsInlineText] = useState('');
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
      void releaseMobileSmsReader();
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
      const sc =
        extractShortCode(trimmed) ??
        extractShortCode(rawLast) ??
        extractShortCodeFromPartialSms(trimmed, curG.guests);
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
  const codeSuggestions =
    g.engine.current && code.trim().length >= 2 ? g.engine.current.search(code.trim(), 4) : [];
  const inlineSuggestions =
    g.engine.current && smsInlineText.trim().length >= 2
      ? g.engine.current.search(smsInlineText.trim(), 3)
      : [];
  const inlineMatchedCode =
    smsInlineText.trim().length >= 3
      ? (extractShortCode(smsInlineText) ?? extractShortCodeFromPartialSms(smsInlineText, g.guests))
      : null;
  const canOverride = p.role !== 'gate';

  const submitCode = async (rawValue?: string) => {
    if (!g.engine.current?.ready) return;
    const target = (rawValue ?? code).trim();
    if (!target) return;
    const resolved = extractShortCodeFromPartialSms(target, g.guests) ?? target;
    const o = await g.engine.current.scanCode(resolved);
    setSheet(null);
    setCode('');
    setSmsInlineText('');
    setSmsNotice(null);
    show(o);
  };

  /**
   * "Scan SMS" (ADR 059): switches the viewfinder into SMS mode and captures up to 3 quick frames
   * so guests with feature or disposable phones can hold or scroll their 2–3 line screen. Matches
   * full codes, clipped codes, short links (`/s/...`), or the guest's name in the visible fragment.
   */
  const handleScanSms = useCallback(
    async (sampleFrame?: MobileSmsImage) => {
      if (smsReading || !g.engine.current?.ready) return;
      setScanMode('sms');
      setSmsReading(true);
      setSmsNotice(null);
      try {
        if (sampleFrame) {
          const res = await scanSmsImage(sampleFrame, undefined, g.guests);
          if (res.kind === 'code') {
            const o = await g.engine.current.scanCode(res.code);
            setSmsInlineText('');
            show(o);
            return;
          }
        }

        const captured: MobileSmsImage[] = [];
        if (
          cameraActive &&
          cameraRef.current &&
          typeof cameraRef.current.takePictureAsync === 'function'
        ) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const pic = await cameraRef.current
              .takePictureAsync({ quality: 0.8, base64: true, skipProcessing: true })
              .catch(() => null);
            if (pic && (pic.uri || pic.base64)) {
              captured.push({ uri: pic.uri, base64: pic.base64 ?? undefined });
              const res = await scanSmsFrames(captured, undefined, g.guests);
              if (res.kind === 'code') {
                const o = await g.engine.current.scanCode(res.code);
                setSheet(null);
                setCode('');
                setSmsInlineText('');
                show(o);
                return;
              }
            }
            if (attempt < 2) {
              await new Promise<void>((r) => setTimeout(r, 380));
            }
          }
        }

        if (captured.length > 0) {
          const finalRes = await scanSmsFrames(captured, undefined, g.guests);
          if (finalRes.kind === 'code') {
            const o = await g.engine.current.scanCode(finalRes.code);
            setSheet(null);
            setCode('');
            setSmsInlineText('');
            show(o);
            return;
          }
          if (finalRes.kind === 'no_code' && finalRes.text) {
            setSmsInlineText(finalRes.text.slice(0, 64));
          }
        }

        setSmsNotice(t('gateApp.smsNotFound'));
      } finally {
        setSmsReading(false);
      }
    },
    [cameraActive, g.engine, g.guests, show, smsReading, t],
  );

  /** Fallback photo capture via the OS camera for reading an SMS screen. */
  const handlePhotoSms = useCallback(async () => {
    if (smsReading || !g.engine.current?.ready) return;
    setScanMode('sms');
    setSmsReading(true);
    setSmsNotice(null);
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      }).catch(() => null);
      const asset = res && !res.canceled ? res.assets?.[0] : null;
      if (!asset) return;
      const scanRes = await scanSmsImage(
        { uri: asset.uri, base64: asset.base64 ?? undefined },
        undefined,
        g.guests,
      );
      if (scanRes.kind === 'code') {
        const o = await g.engine.current.scanCode(scanRes.code);
        setSheet(null);
        setCode('');
        setSmsInlineText('');
        show(o);
        return;
      }
      if (scanRes.kind === 'no_code' && scanRes.text) {
        setSmsInlineText(scanRes.text.slice(0, 64));
      }
      setSmsNotice(t('gateApp.smsNotFound'));
    } finally {
      setSmsReading(false);
    }
  }, [g.engine, g.guests, show, smsReading, t]);

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
  const pct =
    g.stats.total > 0 ? Math.min(100, Math.round((g.stats.admitted / g.stats.total) * 100)) : 0;
  const detectedPartialCode =
    code.trim().length >= 3 ? extractShortCodeFromPartialSms(code, g.guests) : null;
  const sampleGuest = g.guests[0];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={p.embedded ? ['left', 'right'] : ['top', 'left', 'right']}
    >
      {/* Kiosk header (hidden when embedded inside the Organizer event tabs, which already show AppHeader) */}
      {!p.embedded ? (
        <View
          style={{
            backgroundColor: c.bg,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image
              source={brandIcon}
              accessibilityLabel={t('common.appName')}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: c.border,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 16.5,
                  fontWeight: '800',
                  color: c.ink,
                  letterSpacing: -0.3,
                }}
              >
                {coupleTitle}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: c.muted }}>
                {g.event?.venueName ? `${g.event.venueName} · ${gateBadge}` : gateBadge}
              </Text>
            </View>
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
                size={13}
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
                <Icon name="close" size={15} color={c.ink} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Top Segmented Mode Switcher: [ QR Code ] vs [ Scan SMS (Feature Phone) ] */}
      <View
        style={{
          flexDirection: 'row',
          alignSelf: 'center',
          backgroundColor: c.surface,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: c.border,
          padding: 3,
          marginTop: 4,
          gap: 4,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: scanMode === 'qr' }}
          accessibilityLabel="QR"
          onPress={() => {
            setScanMode('qr');
            setSmsNotice(null);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: scanMode === 'qr' ? c.primary : 'transparent',
          }}
        >
          <Icon name="qr" size={15} color={scanMode === 'qr' ? c.onPrimary : c.muted} />
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '800',
              color: scanMode === 'qr' ? c.onPrimary : c.ink,
            }}
          >
            {sw ? 'Skani QR' : 'Scan QR'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: scanMode === 'sms' }}
          accessibilityLabel={t('gateApp.scanSms')}
          testID="gate-mode-sms"
          onPress={() => {
            setScanMode('sms');
            setSmsNotice(null);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: scanMode === 'sms' ? c.primary : 'transparent',
          }}
        >
          <Icon name="smsText" size={15} color={scanMode === 'sms' ? c.onPrimary : c.primary} />
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '800',
              color: scanMode === 'sms' ? c.onPrimary : c.ink,
            }}
          >
            {t('gateApp.scanSms')}
          </Text>
        </Pressable>
      </View>

      {/* Centered Viewfinder (Square for QR, Wide 2–3 Line Window for Feature-Phone SMS) */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingHorizontal: 16,
        }}
      >
        {camOk ? (
          <>
            <View
              style={{
                width: scanMode === 'sms' ? 296 : 236,
                height: scanMode === 'sms' ? 168 : 236,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <View
                style={{
                  width: scanMode === 'sms' ? 284 : 224,
                  height: scanMode === 'sms' ? 156 : 224,
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
                    onBarcodeScanned={sheet || outcome || smsReading ? undefined : onScan}
                    onCameraReady={() => setCameraReady(true)}
                  />
                ) : null}

                {/* Horizontal SMS reading guide band for small feature/disposable phone screens */}
                {scanMode === 'sms' ? (
                  <View
                    pointerEvents="none"
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      justifyContent: 'space-between',
                      padding: 10,
                    }}
                  >
                    <View
                      style={{
                        alignSelf: 'center',
                        backgroundColor: 'rgba(11,14,17,0.82)',
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ color: c.primary, fontSize: 10.5, fontWeight: '800' }}>
                        {sw
                          ? 'SIMU YA TOCHI · HATA SEHEMU YA SMS INATOSHA'
                          : 'FEATURE PHONE · PARTIAL SMS WORKS'}
                      </Text>
                    </View>

                    <View
                      style={{
                        height: 68,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: c.primary,
                        borderStyle: 'dashed',
                        backgroundColor: smsReading
                          ? 'rgba(31,224,134,0.16)'
                          : 'rgba(11,14,17,0.28)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 10,
                        gap: 4,
                      }}
                    >
                      {smsReading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ActivityIndicator color={c.primary} size="small" />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                            {t('gateApp.readingSms')}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 11.5,
                            fontWeight: '700',
                            textAlign: 'center',
                          }}
                        >
                          {sw
                            ? 'Lenga mistari 2–3 inayoonekana (Jina, /s/… au Namba)'
                            : 'Align the 2–3 visible lines (Name, /s/… or Code)'}
                        </Text>
                      )}
                    </View>

                    <View style={{ height: 4 }} />
                  </View>
                ) : null}
              </View>

              {/* Corner reticle brackets */}
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
                    width: 32,
                    height: 32,
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
                    width: 32,
                    height: 32,
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
                    width: 32,
                    height: 32,
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
                    width: 32,
                    height: 32,
                    borderBottomWidth: 4,
                    borderRightWidth: 4,
                    borderColor: c.primary,
                    borderBottomRightRadius: 22,
                  }}
                />
              </View>
            </View>

            {/* Clean camera control strip: Torch, Primary Scan SMS action, Sound */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('gateApp.torch')}
                onPress={() => setTorch((x) => !x)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: torch ? c.primary : c.surface,
                  borderWidth: 1,
                  borderColor: torch ? c.primary : c.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="torch" size={17} color={torch ? c.onPrimary : c.ink} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('gateApp.scanSms')}
                testID="gate-scan-sms"
                disabled={smsReading}
                onPress={() => void handleScanSms()}
                style={{
                  height: 40,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  backgroundColor: scanMode === 'sms' ? c.primary : c.surface,
                  borderWidth: 1.5,
                  borderColor: c.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  opacity: smsReading ? 0.7 : 1,
                }}
              >
                {smsReading ? (
                  <ActivityIndicator
                    size="small"
                    color={scanMode === 'sms' ? c.onPrimary : c.primary}
                  />
                ) : (
                  <Icon
                    name="smsText"
                    size={16}
                    color={scanMode === 'sms' ? c.onPrimary : c.primary}
                  />
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: scanMode === 'sms' ? c.onPrimary : c.ink,
                  }}
                >
                  {smsReading
                    ? t('gateApp.readingSms')
                    : scanMode === 'sms'
                      ? sw
                        ? 'Soma Skrini ya SMS'
                        : 'Capture SMS Screen'
                      : t('gateApp.scanSms')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('gateApp.haptics')}
                onPress={() => {
                  toggleSound();
                  toggleHaptics();
                }}
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
                <Icon name={sound ? 'soundOn' : 'soundOff'} size={17} color={c.ink} />
              </Pressable>
            </View>

            {/* In SMS mode: inline partial-SMS assistant so partial feature-phone screens match in 1 tap */}
            {scanMode === 'sms' ? (
              <View
                style={{
                  alignSelf: 'stretch',
                  backgroundColor: c.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 10,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={smsInlineText}
                    onChangeText={setSmsInlineText}
                    placeholder={
                      sw
                        ? 'Au andika sehemu ya SMS (mf. 4821, Juma, /s/…)…'
                        : 'Or type visible SMS fragment (e.g. 4821, Juma, /s/…)…'
                    }
                    placeholderTextColor={c.muted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={() => {
                      if (inlineMatchedCode) void submitCode(inlineMatchedCode);
                      else if (inlineSuggestions[0])
                        void submitCode(inlineSuggestions[0].shortCode);
                      else if (smsInlineText.trim()) void submitCode(smsInlineText);
                    }}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: c.bg,
                      borderWidth: 1,
                      borderColor: c.border,
                      paddingHorizontal: 10,
                      color: c.ink,
                      fontSize: 13.5,
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('gateApp.photoSms')}
                    onPress={() => void handlePhotoSms()}
                    style={{
                      height: 38,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: c.bg,
                      borderWidth: 1,
                      borderColor: c.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Icon name="camera" size={14} color={c.primary} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.ink }}>
                      {sw ? 'Picha' : 'Photo'}
                    </Text>
                  </Pressable>
                </View>

                {inlineMatchedCode ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={inlineMatchedCode}
                    onPress={() => void submitCode(inlineMatchedCode)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: c.primarySoft,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: c.primary,
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: c.primary }}>
                      {sw
                        ? `Imetambuliwa kwenye SMS: ${inlineMatchedCode}`
                        : `Matched from SMS: ${inlineMatchedCode}`}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: c.primary }}>
                      {`${t('gateApp.confirm')} →`}
                    </Text>
                  </Pressable>
                ) : null}

                {inlineSuggestions.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {inlineSuggestions.map((r) => (
                      <Pressable
                        key={r.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${r.displayName} ${r.shortCode}`}
                        onPress={() => void submitCode(r.shortCode)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: c.bg,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: c.primary,
                          paddingVertical: 5,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: c.ink }}>
                          {r.displayName}
                        </Text>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.primary }}>
                          {r.shortCode} →
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : sampleGuest ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 11, color: c.muted }}>
                      {smsNotice ?? t('gateApp.smsHint')}
                    </Text>
                    {g.isDemoMode ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={sw ? 'Mfano wa SMS fupi' : 'Demo partial SMS'}
                        onPress={() =>
                          void handleScanSms({
                            text: `Habari ${sampleGuest.displayName}, unaalikwa kwenye harusi...`,
                          })
                        }
                        style={{
                          borderRadius: 999,
                          backgroundColor: c.primarySoft,
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: c.primary }}>
                          {sw ? 'Jaribu SMS Fupi' : 'Try Partial SMS'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <View
            style={{
              padding: 20,
              gap: 10,
              backgroundColor: c.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border,
              alignSelf: 'stretch',
              justifyContent: 'center',
            }}
          >
            <Txt size={18} bold>
              {t('gateApp.cameraNeeded')}
            </Txt>
            <Txt size={14} color={c.muted}>
              {t('gateApp.cameraBody')}
            </Txt>
            {perm?.canAskAgain === false ? (
              <Button
                label={t('gateApp.openSettings')}
                onPress={() => void Linking.openSettings()}
              />
            ) : (
              <Button label={t('gateApp.grant')} icon="gate" onPress={() => void requestPerm()} />
            )}
            <Button
              variant="secondary"
              icon="smsText"
              label={t('gateApp.photoSms')}
              onPress={() => void handlePhotoSms()}
            />
          </View>
        )}
      </View>

      {/* Compact single-row attendance & encrypted vault bar (tapping opens Sync & Vault sheet) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Encrypted Local Vault"
        onPress={() => {
          setSheet('sync');
          void g.verifyLocalAttendance();
        }}
        style={{
          marginHorizontal: 16,
          marginBottom: 8,
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border,
          paddingVertical: 8,
          paddingHorizontal: 12,
          gap: 6,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            <Txt size={12.5} bold color={c.ink} style={{ fontVariant: ['tabular-nums'] } as never}>
              {t('gateApp.arrived', { admitted: g.stats.admitted, total: g.stats.total })}
            </Txt>
            <Text style={{ color: c.muted, fontSize: 12 }}>·</Text>
            <Txt
              size={12}
              bold
              color={c.primary}
              style={{ fontVariant: ['tabular-nums'] } as never}
            >
              {t('gateApp.people', { count: g.stats.admittedPeople })}
            </Txt>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon
              name="shield"
              size={13}
              color={g.vaultReport?.ok ? c.primary : g.vaultReport ? c.danger : c.muted}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: g.vaultReport?.ok ? c.primary : c.muted,
                fontVariant: ['tabular-nums'],
              }}
            >
              {`#${(g.vaultReport?.chainDigest || '00000000').slice(0, 6)} ›`}
            </Text>
          </View>
        </View>

        <View style={{ height: 4, borderRadius: 999, backgroundColor: c.bg, overflow: 'hidden' }}>
          <View
            style={{
              height: 4,
              borderRadius: 999,
              width: `${Math.max(g.stats.admitted > 0 ? 3 : 0, pct)}%`,
              backgroundColor: c.primary,
            }}
          />
        </View>
      </Pressable>

      {/* Bottom 3-Action Check-in Dock: Type Number · Scan SMS · Search Guest */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#12161B',
          borderTopWidth: 1,
          borderColor: c.border,
          minHeight: 58,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gateApp.typeCode')}
          onPress={() => {
            setSmsNotice(null);
            setSheet('code');
          }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            paddingHorizontal: 6,
          }}
        >
          <Icon name="edit" size={17} color={c.ink} />
          <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: c.ink }}>
            {t('gateApp.typeCode')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gateApp.scanSms')}
          disabled={smsReading}
          onPress={() => {
            if (scanMode !== 'sms') {
              setScanMode('sms');
              setSmsNotice(null);
            } else {
              void handleScanSms();
            }
          }}
          style={{
            flex: 1.15,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            paddingHorizontal: 8,
            opacity: smsReading ? 0.75 : 1,
          }}
        >
          <Icon name="smsText" size={19} color={c.onPrimary} />
          <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '900', color: c.onPrimary }}>
            {smsReading ? t('gateApp.readingSms') : t('gateApp.scanSms')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gateApp.searchPlaceholder')}
          onPress={() => setSheet('search')}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            paddingHorizontal: 6,
          }}
        >
          <Icon name="search" size={17} color={c.ink} />
          <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: c.ink }}>
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

      <Sheet
        open={sheet === 'code'}
        onClose={() => {
          setSheet(null);
          setSmsNotice(null);
        }}
        title={t('gateApp.typeCode')}
      >
        {smsNotice ? <Banner tone="info" text={smsNotice} /> : null}
        <Field
          label={t('gateApp.typeCodeLabel')}
          hint={
            sw
              ? 'Andika namba (mf. KH-4823) au sehemu yoyote ya SMS inayoonekana kwenye simu ndogo'
              : 'Enter code (e.g. KH-4823) or any visible part of the SMS on a small phone screen'
          }
          value={code}
          onChangeText={(next) => {
            const extracted = next.length > 8 ? extractShortCode(next) : null;
            setCode(extracted ?? next);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void submitCode()}
        />

        {detectedPartialCode ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={detectedPartialCode}
            onPress={() => void submitCode(detectedPartialCode)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: c.primarySoft,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.primary,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Txt size={14} bold color={c.primary}>
              {sw
                ? `Kadi iliyotambuliwa: ${detectedPartialCode}`
                : `Matched card: ${detectedPartialCode}`}
            </Txt>
            <Txt size={13} bold color={c.primary}>
              {`${t('gateApp.confirm')} →`}
            </Txt>
          </Pressable>
        ) : null}

        {codeSuggestions.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Txt size={12} bold color={c.muted}>
              {sw ? 'Wageni wanaolingana na sehemu hiyo:' : 'Matching guests from partial text:'}
            </Txt>
            {codeSuggestions.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.displayName} ${r.shortCode}`}
                onPress={() => void submitCode(r.shortCode)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: c.bg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Txt size={14} bold>
                    {r.displayName}
                  </Txt>
                  <Txt size={12} color={c.muted}>
                    {r.shortCode}
                    {r.phoneLast4 ? ` · …${r.phoneLast4}` : ''}
                    {r.groupLabel ? ` · ${r.groupLabel}` : ''}
                  </Txt>
                </View>
                <Txt size={13} bold color={c.primary}>
                  {t('gateApp.confirm')}
                </Txt>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              icon="smsText"
              label={t('gateApp.photoSms')}
              loading={smsReading}
              onPress={() => void handlePhotoSms()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              icon="copy"
              label={sw ? 'Bandika SMS' : 'Paste SMS'}
              onPress={async () => {
                const clip = (await Clipboard.getStringAsync().catch(() => '')).trim();
                if (!clip) return;
                const extracted =
                  extractShortCode(clip) ?? extractShortCodeFromPartialSms(clip, g.guests);
                setCode(extracted ?? clip);
              }}
            />
          </View>
        </View>
        <Button label={t('gateApp.go')} onPress={() => void submitCode()} />
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
