import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BundleGuest, GateRole, ScanOutcome } from '@harusi/gate';
import { gateColorsAaa } from '@harusi/ui-tokens';
import { useT } from '../lib/i18n';
import { useColors } from '../lib/theme';
import { Banner, Button, Field, Sheet, Txt } from '../ui/kit';
import { store } from '../lib/storage';
import { playResult } from './sound';
import { gateLabel } from './device';
import { useGate } from './use-gate';

const OVERLAY_MS = 2500;
const timeOf = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 3 * 3_600_000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

interface Props {
  eventId: string;
  role: GateRole;
  token: () => string | null;
  refresh?: () => Promise<void>;
}

/** The offline-first scanner (§17.5): viewfinder, torch, typed number, search, full-screen results. */
export function GateScreen(p: Props) {
  useKeepAwake();
  const t = useT();
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

  const onScan = useCallback(
    async ({ data }: { data: string }) => {
      if (busy.current || !g.engine.current) return;
      busy.current = true;
      try {
        show(await g.engine.current.scanQr(data));
      } catch {
        busy.current = false;
      }
    },
    [g.engine, show],
  );

  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<BundleGuest | null>(null);
  const [reason, setReason] = useState('');
  const results =
    g.engine.current && query.trim().length >= 2 ? g.engine.current.search(query) : [];
  const canOverride = p.role !== 'gate';

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

  const statusLine = `${t('gateApp.gateName')} ${gateLabel(g.deviceId)} · ${g.online ? '●' : '○'} ${g.online ? t('gateApp.online') : t('gateApp.offline')}`;
  const pendingLine =
    g.stats.pending > 0 ? ` · ${t('states.syncPending', { n: g.stats.pending })}` : '';
  const camOk = perm?.granted;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top', 'left', 'right']}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('gateApp.syncTitle')}
        onPress={() => setSheet('sync')}
        style={{ padding: 12, backgroundColor: c.surface, minHeight: 56, justifyContent: 'center' }}
      >
        <Txt bold>
          {statusLine}
          {pendingLine}
        </Txt>
        <Txt size={14} color={c.muted}>
          {t('gateApp.arrived', { admitted: g.stats.admitted, total: g.stats.total })}
        </Txt>
      </Pressable>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {camOk ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={outcome ? undefined : onScan}
          />
        ) : (
          <View
            style={{
              padding: 24,
              gap: 12,
              backgroundColor: c.bg,
              alignSelf: 'stretch',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <Txt size={20} bold>
              {t('gateApp.cameraNeeded')}
            </Txt>
            <Txt>{t('gateApp.cameraBody')}</Txt>
            {perm?.canAskAgain === false ? (
              <Button
                label={t('gateApp.openSettings')}
                onPress={() => void Linking.openSettings()}
              />
            ) : (
              <Button label={t('gateApp.grant')} onPress={() => void requestPerm()} />
            )}
          </View>
        )}
        {camOk ? (
          <View
            pointerEvents="none"
            style={{
              width: 240,
              height: 240,
              borderWidth: 3,
              borderColor: '#fff',
              borderRadius: 16,
            }}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: c.surface }}>
        <Button
          label={`🔦 ${t('gateApp.torch')}`}
          variant="secondary"
          onPress={() => setTorch((x) => !x)}
          style={{ flex: 1 }}
        />
        <Button
          label={`⌨ ${t('gateApp.typeCode')}`}
          variant="secondary"
          onPress={() => setSheet('code')}
          style={{ flex: 1 }}
        />
        <Button label={sound ? '🔊' : '🔇'} variant="secondary" onPress={toggleSound} />
        <Button label={`${haptics ? '📳' : '🔕'}`} variant="secondary" onPress={toggleHaptics} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('gateApp.searchPlaceholder')}
        onPress={() => setSheet('search')}
        style={{
          padding: 16,
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderColor: c.border,
          minHeight: 56,
          justifyContent: 'center',
        }}
      >
        <Txt color={c.muted}>🔍 {t('gateApp.searchPlaceholder')}</Txt>
      </Pressable>

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
        />
        <Button
          label={t('gateApp.go')}
          onPress={async () => {
            const o = await g.engine.current!.scanCode(code);
            setSheet(null);
            setCode('');
            show(o);
          }}
        />
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
            <Txt size={20} bold>
              {t('gate.confirmTitle', { name: picked.displayName })}
            </Txt>
            <Txt>
              {t('gateApp.people', { count: picked.partySizeAllowed })} · {picked.groupLabel ?? ''}
            </Txt>
            <Button
              label={t('gateApp.confirm')}
              onPress={async () => {
                const o = await g.engine.current!.admitManual(picked.id);
                setPicked(null);
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
                onPress={() => setPicked(r)}
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

/** Full-screen result: colour + icon + word, never colour alone (§17.5, §17.12). */
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
  const fill =
    outcome.kind === 'admit'
      ? gateColorsAaa.admit
      : outcome.kind === 'duplicate'
        ? gateColorsAaa.duplicate
        : gateColorsAaa.deny;
  const icon = outcome.kind === 'admit' ? '✔' : outcome.kind === 'duplicate' ? '⚠' : '✖';
  const word =
    outcome.kind === 'admit'
      ? t('gateApp.admit')
      : outcome.kind === 'duplicate'
        ? t('gateApp.duplicate')
        : t('gateApp.invalid');
  const guest = outcome.kind === 'deny' ? null : outcome.guest;
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={word}
      onPress={onDismiss}
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 16,
        },
      ]}
    >
      <Text style={{ color: '#fff', fontSize: 96 }}>{icon}</Text>
      <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', textAlign: 'center' }}>
        {word}
      </Text>
      {guest ? (
        <Text style={{ color: '#fff', fontSize: 36, fontWeight: '700', textAlign: 'center' }}>
          {guest.displayName}
        </Text>
      ) : null}
      {outcome.kind === 'admit' ? (
        <Text style={{ color: '#fff', fontSize: 32 }}>
          {t('gateApp.people', { count: outcome.partyAdmitted })}
        </Text>
      ) : null}
      {guest?.groupLabel ? (
        <Text style={{ color: '#fff', fontSize: 32 }}>{guest.groupLabel}</Text>
      ) : null}
      {outcome.kind === 'duplicate' ? (
        <Text style={{ color: '#fff', fontSize: 32, textAlign: 'center' }}>
          {t('gateApp.dupDetail', {
            time: timeOf(outcome.first.at),
            gate: gateOf(outcome.first.deviceId),
          })}
        </Text>
      ) : null}
      {outcome.kind === 'deny' ? (
        <Text style={{ color: '#fff', fontSize: 32, textAlign: 'center' }}>
          {t(`gateApp.reason.${outcome.reason}`)}
        </Text>
      ) : null}
      <View style={{ gap: 8, alignSelf: 'stretch' }}>
        {outcome.kind === 'duplicate' ? (
          <>
            <Button label={t('gateApp.ok')} variant="secondary" onPress={onDismiss} />
            {canOverride ? (
              <Button label={t('gateApp.override')} variant="secondary" onPress={onOverride} />
            ) : null}
          </>
        ) : null}
        {outcome.kind === 'deny' ? (
          <Button label={t('gateApp.findByName')} variant="secondary" onPress={onSearch} />
        ) : null}
      </View>
    </Pressable>
  );
}
