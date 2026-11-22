'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { GateSeatTag } from './seat-tag';
import { matchesSearch } from '@harusi/api-client';
import { extractShortCode } from '@harusi/schemas/short-code';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  Flashlight,
  Keyboard,
  Loader2,
  Lock,
  MessageSquareText,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  SwitchCamera,
  Upload,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  appendWebAdmission,
  buildWebAttendanceSnapshot,
  derivePinVaultKey,
  exportWebVaultEnvelope,
  getOrCreateWebVaultKey,
  loadWebAdmissions,
  matchScannedGuest,
  saveAndVerifyWebVault,
  verifyStoredWebVault,
  type ScanAdmissionMethod,
  type ScannerGuest,
  type WebAdmissionRecord,
  type WebVaultVerification,
} from '@/lib/web-gate-scanner';
import { playGateSound } from '@/lib/gate-audio';
import { canvasFromFile, frameFromVideo, releaseSmsReader, scanSmsImage } from '@/lib/sms-ocr';

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

interface TorchTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

export interface MobileGateScannerProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  brandName?: string;
  linkCode?: string;
  guests: ScannerGuest[];
  onCommitAdmission?: (input: {
    guest: ScannerGuest;
    partySize: number;
    method: ScanAdmissionMethod;
    rawCredential: string;
  }) => Promise<void> | void;
  vaultPassphrase?: string;
  locale?: string;
}

type ConfirmContext = {
  guest: ScannerGuest;
  method: ScanAdmissionMethod;
  rawCredential: string;
};

type ScanOutcome =
  | {
      kind: 'ok';
      guestName: string;
      shortCode: string;
      seats: number;
      partyAdmitted: number;
      chainDigest: string;
    }
  | {
      kind: 'duplicate';
      guestName: string;
      shortCode: string;
      seats: number;
      checkedInAt: string | null;
    }
  | {
      kind: 'error';
      title: string;
      detail: string;
    };

function playFeedbackTone(kind: 'ok' | 'warn' | 'alarm' | 'success'): void {
  playGateSound(kind === 'ok' || kind === 'success' ? 'success' : 'alarm');
}

export function MobileGateScanner({
  open,
  onClose,
  eventId,
  eventTitle,
  brandName = 'HarusiPass',
  linkCode,
  guests,
  onCommitAdmission,
  vaultPassphrase,
  locale = 'sw',
}: MobileGateScannerProps) {
  const sw = locale.startsWith('sw');

  const [cameraState, setCameraState] = useState<'starting' | 'live' | 'unavailable'>('starting');
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [detectorSupported, setDetectorSupported] = useState(false);

  const [confirmCtx, setConfirmCtx] = useState<ConfirmContext | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [smsReading, setSmsReading] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vaultSheetOpen, setVaultSheetOpen] = useState(false);

  const [localCheckedMap, setLocalCheckedMap] = useState<
    Record<string, { checkedInAt: string; partyAdmitted: number }>
  >({});
  const [admissions, setAdmissions] = useState<WebAdmissionRecord[]>([]);
  const [vaultVerification, setVaultVerification] = useState<WebVaultVerification | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });
  const vaultKeyRef = useRef<{ secretId: string; key: Uint8Array } | null>(null);

  const getVaultKey = useCallback((): Uint8Array => {
    const secretId = vaultPassphrase ? `pin:${vaultPassphrase}` : 'device';
    if (vaultKeyRef.current?.secretId === secretId) return vaultKeyRef.current.key;
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
    const key = vaultPassphrase
      ? derivePinVaultKey(vaultPassphrase, storage)
      : getOrCreateWebVaultKey(storage);
    vaultKeyRef.current = { secretId, key };
    return key;
  }, [vaultPassphrase]);

  // Hydrate existing local encrypted attendance snapshot on open.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const storage = window.localStorage;
    const key = getVaultKey();
    const existing = loadWebAdmissions(storage, key, eventId);
    setAdmissions(existing);
    if (existing.length > 0) {
      const checkedMap: Record<string, { checkedInAt: string; partyAdmitted: number }> = {};
      for (const rec of existing) {
        checkedMap[rec.guestId] = {
          checkedInAt: rec.scannedAt,
          partyAdmitted: rec.partyAdmitted,
        };
      }
      setLocalCheckedMap(checkedMap);
    }
    setVaultVerification(verifyStoredWebVault(storage, key, eventId));
  }, [open, eventId, getVaultKey]);

  // Monitor online status while overlay is mounted.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(window.navigator.onLine);
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  const mergedGuests = useMemo<ScannerGuest[]>(() => {
    return guests.map((g) => {
      const local = localCheckedMap[g.id];
      if (!local || g.status === 'checked_in') return g;
      return {
        ...g,
        status: 'checked_in',
        checkedInAt: local.checkedInAt,
        partyAdmitted: local.partyAdmitted,
      };
    });
  }, [guests, localCheckedMap]);

  const counts = useMemo(() => {
    const invitees = mergedGuests.filter((g) => g.cardKind !== 'contribution');
    const checkedIn = invitees.filter((g) => g.status === 'checked_in' || g.checkedInAt);
    const confirmedOrIn = invitees.filter(
      (g) => g.status === 'confirmed' || g.status === 'checked_in' || g.checkedInAt,
    );
    const remaining = Math.max(0, invitees.length - checkedIn.length);
    const peopleAdmitted = checkedIn.reduce(
      (sum, g) => sum + (g.partyAdmitted > 0 ? g.partyAdmitted : (g.rsvpPartySize ?? 1)),
      0,
    );
    const expectedBase = Math.max(confirmedOrIn.length, checkedIn.length, invitees.length);
    const progressPct =
      expectedBase > 0 ? Math.min(100, Math.round((checkedIn.length / expectedBase) * 100)) : 0;

    return {
      totalGuests: invitees.length,
      checkedIn: checkedIn.length,
      remaining,
      peopleAdmitted,
      expectedBase,
      progressPct,
    };
  }, [mergedGuests]);

  const sampleCandidates = useMemo(
    () =>
      mergedGuests
        .filter((g) => g.cardKind !== 'contribution' && g.status !== 'checked_in' && !g.checkedInAt)
        .slice(0, 3),
    [mergedGuests],
  );

  const filteredSearchGuests = useMemo(() => {
    const eligible = mergedGuests.filter((g) => g.cardKind !== 'contribution');
    const q = searchQuery.trim();
    if (!q) return eligible.slice(0, 20);
    return eligible.filter((g) => matchesSearch(g, q)).slice(0, 25);
  }, [mergedGuests, searchQuery]);

  const evaluateRawScan = useCallback(
    (rawValue: string, method: ScanAdmissionMethod) => {
      const result = matchScannedGuest(mergedGuests, rawValue);
      if (result.kind === 'ok') {
        const g = result.guest;
        const max = Math.max(1, g.partySizeAllowed);
        const initialParty = Math.min(max, Math.max(1, g.rsvpPartySize ?? 1));
        setPartySize(initialParty);
        setCodeSheetOpen(false);
        setSearchSheetOpen(false);
        setOutcome(null);
        setConfirmCtx({ guest: g, method, rawCredential: rawValue });
        if (soundOn) playFeedbackTone('ok');
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(25);
        }
        return;
      }

      if (result.kind === 'duplicate') {
        if (soundOn) playFeedbackTone('alarm');
        setConfirmCtx(null);
        setCodeSheetOpen(false);
        setSearchSheetOpen(false);
        setOutcome({
          kind: 'duplicate',
          guestName: result.guest.displayName,
          shortCode: result.guest.shortCode,
          seats: result.guest.partySizeAllowed,
          checkedInAt: result.guest.checkedInAt,
        });
        return;
      }

      if (result.kind === 'contribution_only') {
        if (soundOn) playFeedbackTone('alarm');
        setConfirmCtx(null);
        setOutcome({
          kind: 'error',
          title: sw ? 'Kadi ya mchango tu' : 'Contribution card only',
          detail: sw
            ? `${result.guest.displayName} ana kadi ya mchango tu (haina kiingilio langoni).`
            : `${result.guest.displayName} holds a contribution-only card and cannot be admitted at the gate.`,
        });
        return;
      }

      if (result.kind === 'revoked') {
        if (soundOn) playFeedbackTone('alarm');
        setConfirmCtx(null);
        setOutcome({
          kind: 'error',
          title: sw ? 'Kadi imebatilishwa' : 'Card was reissued',
          detail: sw
            ? `Kadi ya ${result.guest.displayName} ilitolewa upya; tumia toleo jipya la kadi.`
            : `${result.guest.displayName}'s card was reissued. Please scan their newest card.`,
        });
        return;
      }

      if (soundOn) playFeedbackTone('alarm');
      setConfirmCtx(null);
      setOutcome({
        kind: 'error',
        title: sw ? 'Msimbo haujatambuliwa' : 'Ticket not found',
        detail: sw
          ? 'Hakikisha QR au namba (mf. KH-4823) ni ya hafla hii.'
          : 'Confirm this QR code or ticket number belongs to this event.',
      });
    },
    [mergedGuests, soundOn, sw],
  );

  // Manage live camera stream lifecycle.
  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined' || !open) return;
    stopCamera();
    setCameraState('starting');
    setCameraNote(null);

    const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    setDetectorSupported(typeof ctor === 'function');

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraState('unavailable');
      setCameraNote(
        window.isSecureContext
          ? sw
            ? 'Kamera haipatikani kwenye kivinjari hiki.'
            : 'Camera API is unavailable in this browser.'
          : sw
            ? 'Kamera ya moja kwa moja inahitaji HTTPS kwenye simu. Tumia picha, demo au weka namba.'
            : 'Live mobile camera requires HTTPS (or localhost). Use Photo Scan, Demo Scan, or Type number.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === 'function') {
        const caps = track.getCapabilities() as TorchTrackCapabilities;
        setTorchSupported(Boolean(caps.torch));
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState('live');
    } catch {
      setCameraState('unavailable');
      setCameraNote(
        sw
          ? 'Ruhusa ya kamera haikutolewa. Unaweza kupiga picha ya QR au kuweka namba.'
          : 'Camera permission unavailable. Take a QR photo below or type the ticket number.',
      );
    }
  }, [facingMode, open, stopCamera, sw]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      void releaseSmsReader();
      return;
    }
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  // Continuous QR frame detection while camera is live and no modal/sheet is blocking.
  useEffect(() => {
    if (
      !open ||
      cameraState !== 'live' ||
      confirmCtx ||
      outcome ||
      codeSheetOpen ||
      searchSheetOpen ||
      vaultSheetOpen
    ) {
      return;
    }
    const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (typeof Ctor !== 'function') return;

    let detector: BarcodeDetectorInstance;
    try {
      detector = new Ctor({ formats: ['qr_code'] });
    } catch {
      return;
    }

    let cancelled = false;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (cancelled || !video || video.readyState < 2) return;
      void detector
        .detect(video)
        .then((codes) => {
          if (cancelled || !codes || codes.length === 0) return;
          const raw = codes[0]?.rawValue?.trim();
          if (!raw) return;
          const now = Date.now();
          if (lastScanRef.current.value === raw && now - lastScanRef.current.at < 2500) {
            return;
          }
          lastScanRef.current = { value: raw, at: now };
          evaluateRawScan(raw, 'qr');
        })
        .catch(() => {
          // Ignore transient frame decode errors.
        });
    }, 240);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    open,
    cameraState,
    confirmCtx,
    outcome,
    codeSheetOpen,
    searchSheetOpen,
    vaultSheetOpen,
    evaluateRawScan,
  ]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      const advanced: TorchConstraintSet[] = [{ torch: next }];
      await track.applyConstraints({ advanced });
      setTorchOn(next);
    } catch {
      // Ignore unsupported device torch toggles.
    }
  }, [torchOn, torchSupported]);

  const handlePhotoCapture = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (typeof Ctor !== 'function' || typeof createImageBitmap !== 'function') {
        setOutcome({
          kind: 'error',
          title: sw ? 'Tumia Weka Namba' : 'QR image decode unavailable',
          detail: sw
            ? 'Kivinjari hiki hakina BarcodeDetector. Weka namba ya kadi moja kwa moja.'
            : 'This browser does not support BarcodeDetector on images. Please enter the short code.',
        });
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new Ctor({ formats: ['qr_code'] });
        const hits = await detector.detect(bitmap);
        bitmap.close();
        const raw = hits[0]?.rawValue?.trim();
        if (!raw) {
          setOutcome({
            kind: 'error',
            title: sw ? 'QR haikuonekana' : 'No QR code detected',
            detail: sw
              ? 'Jaribu kupiga picha karibu zaidi au weka namba ya tiketi.'
              : 'Move closer so the QR code fills the frame, or type the ticket code.',
          });
          return;
        }
        evaluateRawScan(raw, 'qr');
      } catch {
        setOutcome({
          kind: 'error',
          title: sw ? 'Imeshindwa kusoma picha' : 'Could not read image',
          detail: sw ? 'Jaribu tena au tumia Weka Namba.' : 'Please try again or use Type Number.',
        });
      }
    },
    [evaluateRawScan, sw],
  );

  /**
   * "Scan SMS" (ADR 059): read the card number off the invitation SMS on the guest's phone screen,
   * from the live camera frame or from a photo, then check it like a typed number.
   */
  const handleScanSms = useCallback(
    async (file?: File) => {
      if (smsReading) return;
      setSmsReading(true);
      try {
        const image = file
          ? await canvasFromFile(file)
          : videoRef.current
            ? frameFromVideo(videoRef.current)
            : null;
        if (!image) {
          setOutcome({
            kind: 'error',
            title: sw ? 'Hakuna picha' : 'No picture',
            detail: sw
              ? 'Kamera haijawa tayari. Jaribu tena au tumia Weka Namba.'
              : 'The camera is not ready yet. Try again or use Type number.',
          });
          return;
        }
        const r = await scanSmsImage(image);
        if (r.kind === 'code') {
          evaluateRawScan(r.code, 'code');
          return;
        }
        if (soundOn) playFeedbackTone('warn');
        setOutcome(
          r.kind === 'no_code'
            ? {
                kind: 'error',
                title: sw ? 'Namba haikuonekana kwenye SMS' : 'No card number found in the SMS',
                detail: sw
                  ? 'Shikilia simu ya mgeni karibu na kamera ili mstari wa "Namba:" uonekane wazi, kisha jaribu tena. Au andika namba.'
                  : 'Hold the guest’s phone close so the "Code:" line is sharp and fills the frame, then try again. Or type the number.',
              }
            : {
                kind: 'error',
                title: sw ? 'Kusoma SMS hakupatikani' : 'SMS reading unavailable',
                detail: sw
                  ? 'Mara ya kwanza kusoma SMS kunahitaji intaneti. Kwa sasa andika namba iliyo kwenye SMS.'
                  : 'The first SMS scan needs an internet connection. For now, type the number shown in the SMS.',
              },
        );
      } catch {
        setOutcome({
          kind: 'error',
          title: sw ? 'Imeshindwa kusoma SMS' : 'Could not read the SMS',
          detail: sw ? 'Jaribu tena au tumia Weka Namba.' : 'Please try again or use Type number.',
        });
      } finally {
        setSmsReading(false);
      }
    },
    [evaluateRawScan, smsReading, soundOn, sw],
  );

  const handleCommitCheckIn = useCallback(async () => {
    if (!confirmCtx || submitting) return;
    setSubmitting(true);
    try {
      await onCommitAdmission?.({
        guest: confirmCtx.guest,
        partySize,
        method: confirmCtx.method,
        rawCredential: confirmCtx.rawCredential,
      });

      const nowIso = new Date().toISOString();
      setLocalCheckedMap((prev) => ({
        ...prev,
        [confirmCtx.guest.id]: { checkedInAt: nowIso, partyAdmitted: partySize },
      }));

      const nextRecords = appendWebAdmission(admissions, {
        id: `webscan-${Date.now()}`,
        eventId,
        guestId: confirmCtx.guest.id,
        displayName: confirmCtx.guest.displayName,
        shortCode: confirmCtx.guest.shortCode,
        partyAdmitted: partySize,
        scannedAt: nowIso,
        gateName: linkCode ? `Gate ${linkCode}` : 'Mobile Web Gate',
        method: confirmCtx.method,
        rawCredential: confirmCtx.rawCredential,
      });
      setAdmissions(nextRecords);

      let digestHex = nextRecords[nextRecords.length - 1]?.entryHash ?? '';
      if (typeof window !== 'undefined') {
        const snap = buildWebAttendanceSnapshot(
          eventId,
          eventTitle,
          linkCode ?? 'WEB',
          nextRecords,
        );
        const verification = saveAndVerifyWebVault(window.localStorage, getVaultKey(), snap);
        setVaultVerification(verification);
        digestHex = verification.chainDigest;
      }

      if (soundOn) playFeedbackTone('ok');
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([40, 30, 60]);
      }

      const admittedGuest = confirmCtx.guest;
      setConfirmCtx(null);
      setOutcome({
        kind: 'ok',
        guestName: admittedGuest.displayName,
        shortCode: admittedGuest.shortCode,
        seats: admittedGuest.partySizeAllowed,
        partyAdmitted: partySize,
        chainDigest: digestHex.slice(0, 12),
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    admissions,
    confirmCtx,
    eventId,
    eventTitle,
    getVaultKey,
    linkCode,
    onCommitAdmission,
    partySize,
    soundOn,
    submitting,
  ]);

  const handleVerifyVaultNow = useCallback(() => {
    if (typeof window === 'undefined') return;
    const result = verifyStoredWebVault(window.localStorage, getVaultKey(), eventId);
    setVaultVerification(result);
  }, [eventId, getVaultKey]);

  const handleCodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    evaluateRawScan(codeInput.trim(), 'code');
    setCodeInput('');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0B0E11] text-[#F3F5F7] select-none"
      role="dialog"
      aria-modal="true"
      aria-label={sw ? 'Skani ya lango kwa simu' : 'Mobile gate scanner'}
      data-testid="mobile-gate-scanner"
    >
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col justify-between px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#1FE086]/15 text-[#1FE086] ring-1 ring-[#1FE086]/35">
              <QrCode className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold tracking-wider text-[#F3F5F7] uppercase">
                {brandName}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[#9AA4B2]">
                {isOnline ? (
                  <Wifi className="size-3 text-[#1FE086]" aria-hidden="true" />
                ) : (
                  <WifiOff className="size-3 text-amber-400" aria-hidden="true" />
                )}
                <span>
                  {isOnline ? (sw ? 'Mtandaoni' : 'Online') : sw ? 'Nje ya mtandao' : 'Offline'}
                </span>
                {linkCode ? (
                  <span className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-[#D7DFE8]">
                    {linkCode}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVaultSheetOpen(true)}
              aria-label={sw ? 'Hifadhi ya siri' : 'Encrypted Vault'}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-[#1FE086]/35 bg-[#1FE086]/10 px-2.5 text-[11px] font-semibold text-[#1FE086] hover:bg-[#1FE086]/20"
            >
              <Lock className="size-3.5" aria-hidden="true" />
              <span>Vault</span>
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-label={
                soundOn ? (sw ? 'Zima sauti' : 'Mute sound') : sw ? 'Washa sauti' : 'Enable sound'
              }
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#171C22] text-[#C2CBD6] hover:bg-white/10"
            >
              {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={sw ? 'Funga skana' : 'Close scanner'}
              data-testid="mobile-scanner-close"
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#171C22] text-[#F3F5F7] hover:bg-white/15"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* Event title + instruction */}
        <div className="mt-1.5 text-center">
          <h2 className="truncate text-lg font-bold tracking-tight text-white">
            {sw ? 'Ukaguzi wa Lango' : 'Gate Check-in'}
          </h2>
          <p className="truncate text-xs text-[#9AA4B2]">
            {eventTitle} · {sw ? 'Skani QR ya mgeni kuingia' : 'Scan guest QR code to admit'}
          </p>
        </div>

        {/* Square QR viewfinder */}
        <div className="my-2 flex flex-col items-center">
          <div className="relative aspect-square w-full max-w-[min(64vw,34dvh,260px)] overflow-hidden rounded-3xl border border-white/12 bg-[#12171D] shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cameraState === 'live' ? 'size-full object-cover' : 'hidden'}
            />

            {/* Corner Reticle */}
            <div className="pointer-events-none absolute inset-4">
              <span className="absolute top-0 left-0 size-7 rounded-tl-xl border-t-[3.5px] border-l-[3.5px] border-[#1FE086]" />
              <span className="absolute top-0 right-0 size-7 rounded-tr-xl border-t-[3.5px] border-r-[3.5px] border-[#1FE086]" />
              <span className="absolute bottom-0 left-0 size-7 rounded-bl-xl border-b-[3.5px] border-l-[3.5px] border-[#1FE086]" />
              <span className="absolute right-0 bottom-0 size-7 rounded-br-xl border-r-[3.5px] border-b-[3.5px] border-[#1FE086]" />
              {cameraState === 'live' ? (
                <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[#1FE086]/80 shadow-[0_0_12px_#1FE086]" />
              ) : null}
            </div>

            {/* Camera live but BarcodeDetector unsupported banner */}
            {cameraState === 'live' && !detectorSupported ? (
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-[#0B0E11]/85 px-2.5 py-1.5 text-center text-[11px] text-[#C2CBD6] backdrop-blur">
                {sw
                  ? 'Kivinjari hakina QR auto-read — tumia Demo Scan au Weka namba.'
                  : 'Live QR decoder unsupported here — tap Demo Scan or Type number.'}
              </div>
            ) : null}

            {/* Fallback overlay when camera cannot start */}
            {cameraState !== 'live' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-5 text-center">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#1FE086]/12 text-[#1FE086] ring-1 ring-[#1FE086]/30">
                  <Camera className="size-5" aria-hidden="true" />
                </span>
                <p className="text-xs leading-snug text-[#C2CBD6]">
                  {cameraState === 'starting'
                    ? sw
                      ? 'Inawasha kamera…'
                      : 'Starting camera…'
                    : (cameraNote ?? (sw ? 'Kamera haiko tayari.' : 'Camera unavailable.'))}
                </p>
                {cameraState === 'unavailable' ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15">
                      <Upload className="size-3.5 text-[#1FE086]" aria-hidden="true" />
                      <span>{sw ? 'Piga picha QR' : 'Photo QR'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => {
                          void handlePhotoCapture(e.target.files?.[0]);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15">
                      <MessageSquareText className="size-3.5 text-[#1FE086]" aria-hidden="true" />
                      <span>{sw ? 'Piga picha SMS' : 'Photo SMS'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        data-testid="mobile-scanner-photo-sms"
                        onChange={(e) => {
                          void handleScanSms(e.target.files?.[0]);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#171C22] px-3 py-1.5 text-xs font-medium text-[#C2CBD6] hover:bg-white/10"
                    >
                      <RefreshCw className="size-3" aria-hidden="true" />
                      {sw ? 'Jaribu tena' : 'Retry'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Action strip beneath viewfinder (Torch + Flip + Scan SMS + Demo Scan) */}
          <div className="mt-2.5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void toggleTorch()}
              disabled={!torchSupported}
              aria-label={sw ? 'Washa tochi' : 'Toggle flash'}
              className={`inline-flex size-10 items-center justify-center rounded-full border transition ${
                torchOn
                  ? 'border-[#1FE086] bg-[#1FE086] text-[#05140C]'
                  : 'border-white/12 bg-[#171C22] text-[#D7DFE8] disabled:opacity-40'
              }`}
            >
              <Flashlight className="size-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
              aria-label={sw ? 'Geuza kamera' : 'Flip camera'}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-[#171C22] text-[#D7DFE8] hover:bg-white/10"
            >
              <SwitchCamera className="size-4" aria-hidden="true" />
            </button>

            {cameraState === 'live' ? (
              <button
                type="button"
                data-testid="mobile-scanner-scan-sms"
                onClick={() => void handleScanSms()}
                disabled={smsReading}
                aria-busy={smsReading}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-[#171C22] px-3.5 text-xs font-semibold text-[#D7DFE8] hover:bg-white/10 disabled:opacity-70"
              >
                {smsReading ? (
                  <Loader2 className="size-3.5 animate-spin text-[#1FE086]" aria-hidden="true" />
                ) : (
                  <MessageSquareText className="size-3.5 text-[#1FE086]" aria-hidden="true" />
                )}
                <span>
                  {smsReading
                    ? sw
                      ? 'Inasoma SMS…'
                      : 'Reading SMS…'
                    : sw
                      ? 'Skani SMS'
                      : 'Scan SMS'}
                </span>
              </button>
            ) : null}

            {sampleCandidates.length > 0 ? (
              <button
                type="button"
                data-testid="mobile-scanner-demo-scan"
                onClick={() => {
                  const pick = sampleCandidates[0]!;
                  evaluateRawScan(pick.token ?? pick.shortCode, 'demo');
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#1FE086]/40 bg-[#1FE086]/12 px-3.5 text-xs font-semibold text-[#1FE086] hover:bg-[#1FE086]/20"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>{sw ? 'Demo Skani' : 'Demo Scan'}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Ticket counts + Encrypted Vault status card */}
        <section
          aria-label={sw ? 'Idadi ya tiketi na hifadhi' : 'Ticket counts and vault'}
          className="rounded-2xl border border-white/10 bg-[#171C22] p-3"
        >
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#C2CBD6]">
              {sw ? 'Hesabu ya Tiketi' : 'Ticket Counts'}
            </span>
            <span
              className="tabular font-semibold text-[#1FE086]"
              data-testid="mobile-scanner-counts"
            >
              {counts.checkedIn} / {counts.totalGuests} {sw ? 'wameingia' : 'admitted'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#0F1318] px-2 py-1.5">
              <p className="tabular text-base font-bold text-[#1FE086]">{counts.checkedIn}</p>
              <p className="text-[10px] text-[#8E98A6]">{sw ? 'Wameingia' : 'Checked in'}</p>
            </div>
            <div className="rounded-xl bg-[#0F1318] px-2 py-1.5">
              <p className="tabular text-base font-bold text-white">{counts.remaining}</p>
              <p className="text-[10px] text-[#8E98A6]">{sw ? 'Waliobaki' : 'Remaining'}</p>
            </div>
            <div className="rounded-xl bg-[#0F1318] px-2 py-1.5">
              <p className="tabular text-base font-bold text-[#D7DFE8]">{counts.peopleAdmitted}</p>
              <p className="text-[10px] text-[#8E98A6]">{sw ? 'Watu wote' : 'Headcount'}</p>
            </div>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#1FE086] transition-all"
              style={{ width: `${counts.progressPct}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => setVaultSheetOpen(true)}
            data-testid="mobile-scanner-vault-trigger"
            className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-white/8 bg-[#10151B] px-2.5 py-1.5 text-left text-[11px] hover:border-[#1FE086]/40"
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-[#D7DFE8]">
              <ShieldCheck
                className={`size-3.5 ${
                  vaultVerification?.valid ? 'text-[#1FE086]' : 'text-[#8E98A6]'
                }`}
                aria-hidden="true"
              />
              {sw ? 'Hifadhi Iliyosimbwa · Thibitisha Hapa' : 'Encrypted Vault · Local Verify'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                vaultVerification?.valid
                  ? 'bg-[#1FE086]/15 text-[#1FE086]'
                  : 'bg-white/8 text-[#9AA4B2]'
              }`}
            >
              {vaultVerification?.valid
                ? `#${vaultVerification.chainDigest.slice(0, 6)}`
                : sw
                  ? 'TAYARI'
                  : 'READY'}
            </span>
          </button>
        </section>

        {/* Bottom 3-slot dock matching dark obsidian + mint card aesthetic */}
        <nav
          aria-label={sw ? 'Zana za lango' : 'Gate scanner actions'}
          className="mt-2.5 grid grid-cols-3 items-stretch gap-2"
        >
          <button
            type="button"
            data-testid="mobile-scanner-type-code"
            onClick={() => {
              setCodeInput('');
              setCodeSheetOpen(true);
            }}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#171C22] px-2 py-2 text-[11px] font-semibold text-[#D7DFE8] hover:bg-white/10"
          >
            <Keyboard className="size-4 text-[#9AA4B2]" aria-hidden="true" />
            <span>{sw ? 'Weka namba' : 'Type number'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfirmCtx(null);
              setOutcome(null);
              setCodeSheetOpen(false);
              setSearchSheetOpen(false);
              setVaultSheetOpen(false);
            }}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#1FE086] px-2 py-2 text-[11px] font-bold text-[#05140C] shadow-[0_8px_24px_-6px_rgba(31,224,134,0.55)]"
          >
            <QrCode className="size-4" aria-hidden="true" />
            <span>{sw ? 'Skani Lango' : 'Gate Check-in'}</span>
          </button>

          <button
            type="button"
            data-testid="mobile-scanner-search-open"
            onClick={() => {
              setSearchQuery('');
              setSearchSheetOpen(true);
            }}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#171C22] px-2 py-2 text-[11px] font-semibold text-[#D7DFE8] hover:bg-white/10"
          >
            <Search className="size-4 text-[#9AA4B2]" aria-hidden="true" />
            <span>{sw ? 'Tafuta jina' : 'Search name'}</span>
          </button>
        </nav>
      </div>

      {/* Confirm Check-In Bottom Sheet */}
      {confirmCtx ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl border border-white/12 bg-[#141A21] p-5 text-[#F3F5F7] shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#1FE086] uppercase">
                  {sw ? 'Thibitisha Kiingilio' : 'Confirm Gate Check-In'}
                </p>
                <h3 className="mt-1 text-xl font-bold text-white">
                  {confirmCtx.guest.displayName}
                </h3>
                <p className="mt-0.5 text-xs text-[#9AA4B2]">
                  {confirmCtx.guest.groupLabel} ·{' '}
                  <span className="font-mono text-[#D7DFE8]">{confirmCtx.guest.shortCode}</span>
                </p>
                <GateSeatTag
                  seats={confirmCtx.guest.partySizeAllowed}
                  locale={sw ? 'sw' : 'en'}
                  className="mt-2.5 text-[#1FE086]"
                />
              </div>
              <button
                type="button"
                onClick={() => setConfirmCtx(null)}
                aria-label={sw ? 'Funga' : 'Close'}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/8 text-[#C2CBD6]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-[#0E1318] p-3.5">
              <p className="text-xs font-medium text-[#9AA4B2]">
                {sw
                  ? `Idadi ya watu wanaoingia (upeo ${confirmCtx.guest.partySizeAllowed})`
                  : `People entering (allowed max ${confirmCtx.guest.partySizeAllowed})`}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  disabled={partySize <= 1}
                  aria-label={sw ? 'Punguza idadi' : 'Decrease party size'}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-[#171C22] text-white disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <span className="tabular text-3xl font-bold text-white">{partySize}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPartySize((p) =>
                      Math.min(Math.max(1, confirmCtx.guest.partySizeAllowed), p + 1),
                    )
                  }
                  disabled={partySize >= Math.max(1, confirmCtx.guest.partySizeAllowed)}
                  aria-label={sw ? 'Ongeza idadi' : 'Increase party size'}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-[#171C22] text-white disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={submitting}
                data-testid="mobile-scanner-confirm-admit"
                onClick={() => void handleCommitCheckIn()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1FE086] px-5 text-sm font-bold text-[#05140C] disabled:opacity-60"
              >
                {submitting
                  ? sw
                    ? 'Inahifadhi…'
                    : 'Saving…'
                  : sw
                    ? 'RUHUSU AINGIE →'
                    : 'CONFIRM CHECK-IN →'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCtx(null)}
                className="min-h-11 w-full rounded-full text-xs font-semibold text-[#9AA4B2] hover:text-white"
              >
                {sw ? 'GHAIRI' : 'CANCEL'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Outcome Bottom Sheet */}
      {outcome ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl border border-white/12 bg-[#141A21] p-5 text-center text-[#F3F5F7] shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-3 inline-flex size-14 items-center justify-center rounded-full bg-[#1FE086]/15">
              {outcome.kind === 'ok' ? (
                <CheckCircle2 className="size-8 text-[#1FE086]" />
              ) : (
                <AlertTriangle
                  className={`size-8 ${
                    outcome.kind === 'duplicate' ? 'text-amber-400' : 'text-rose-400'
                  }`}
                />
              )}
            </div>

            {outcome.kind === 'ok' ? (
              <div data-testid="mobile-scanner-outcome-ok">
                <h3 className="text-xl font-bold text-white">
                  {sw ? 'Mgeni Ameruhusiwa!' : "You're Checked-In!"}
                </h3>
                <p className="mt-1 text-sm text-[#C2CBD6]">
                  {outcome.guestName} ·{' '}
                  <span className="font-mono text-[#1FE086]">{outcome.shortCode}</span>
                </p>
                <GateSeatTag
                  seats={outcome.seats}
                  locale={sw ? 'sw' : 'en'}
                  className="mt-2.5 text-[#1FE086]"
                />
                <p className="mt-2 text-xs text-[#9AA4B2]">
                  {sw
                    ? `Watu ${outcome.partyAdmitted} wamehifadhiwa kwenye Vault (#${outcome.chainDigest})`
                    : `${outcome.partyAdmitted} admitted · Saved to Encrypted Vault (#${outcome.chainDigest})`}
                </p>
              </div>
            ) : outcome.kind === 'duplicate' ? (
              <div>
                <h3 className="text-xl font-bold text-amber-300">
                  {sw ? 'Tayari Ameingia' : 'Already Checked In'}
                </h3>
                <p className="mt-1 text-sm text-[#C2CBD6]">
                  {outcome.guestName} ({outcome.shortCode})
                </p>
                <GateSeatTag
                  seats={outcome.seats}
                  locale={sw ? 'sw' : 'en'}
                  className="mt-2.5 text-amber-300"
                />
                <p className="mt-1.5 text-xs text-[#9AA4B2]">
                  {sw
                    ? 'Tiketi hii ilishasajiliwa langoni.'
                    : 'This invitation has already been admitted.'}
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-rose-300">{outcome.title}</h3>
                <p className="mt-1.5 text-xs text-[#C2CBD6]">{outcome.detail}</p>
              </div>
            )}

            <button
              type="button"
              data-testid="mobile-scanner-outcome-done"
              onClick={() => setOutcome(null)}
              className="mt-5 min-h-12 w-full rounded-full bg-[#1FE086] px-5 text-sm font-bold text-[#05140C]"
            >
              {sw ? 'IMEKAMILIKA ✓' : 'DONE ✓'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Type Short Code Sheet */}
      {codeSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl border border-white/12 bg-[#141A21] p-5 text-[#F3F5F7] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {sw ? 'Weka Namba ya Tiketi' : 'Enter Ticket Number'}
              </h3>
              <button
                type="button"
                onClick={() => setCodeSheetOpen(false)}
                aria-label={sw ? 'Funga' : 'Close'}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/8 text-[#C2CBD6]"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[#9AA4B2]">
              {sw
                ? 'Andika herufi 2 na tarakimu 4 (mf. KH-4823) au bandika ujumbe mzima wa SMS.'
                : 'Enter the 2 letters and 4 digits (e.g. KH-4823) or paste the full SMS message.'}
            </p>
            <form onSubmit={handleCodeSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  autoCapitalize="characters"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="KH-4823"
                  data-testid="mobile-scanner-code-input"
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-white/15 bg-[#0B0E11] px-4 text-center font-mono text-2xl font-bold tracking-widest text-white uppercase outline-none focus:border-[#1FE086]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const clip = (await navigator.clipboard.readText()).trim();
                      if (!clip) return;
                      setCodeInput(extractShortCode(clip) ?? clip);
                    } catch {
                      // Clipboard read permission denied or unavailable.
                    }
                  }}
                  className="h-12 shrink-0 rounded-2xl border border-white/15 bg-[#171C22] px-3.5 text-xs font-semibold text-[#1FE086] hover:bg-white/10"
                >
                  {sw ? 'Bandika SMS' : 'Paste SMS'}
                </button>
              </div>
              {codeInput.trim().length > 8 && extractShortCode(codeInput) ? (
                <p className="text-center text-xs font-semibold text-[#1FE086]">
                  {sw
                    ? `Msimbo uliopatikana: ${extractShortCode(codeInput)}`
                    : `Detected code: ${extractShortCode(codeInput)}`}
                </p>
              ) : null}
              {sampleCandidates.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9AA4B2]">
                  <span>{sw ? 'Mifano:' : 'Quick codes:'}</span>
                  {sampleCandidates.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setCodeInput(g.shortCode)}
                      className="rounded-lg border border-white/10 bg-[#171C22] px-2 py-0.5 font-mono text-[#1FE086] hover:bg-white/10"
                    >
                      {g.shortCode}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="submit"
                data-testid="mobile-scanner-code-submit"
                className="min-h-12 w-full rounded-full bg-[#1FE086] px-5 text-sm font-bold text-[#05140C]"
              >
                {sw ? 'Tafuta Tiketi →' : 'Verify Code →'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Search Guest Sheet */}
      {searchSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[82dvh] w-full max-w-md flex-col rounded-t-3xl border border-white/12 bg-[#141A21] p-5 text-[#F3F5F7] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {sw ? 'Tafuta Mgeni' : 'Search Guest List'}
              </h3>
              <button
                type="button"
                onClick={() => setSearchSheetOpen(false)}
                aria-label={sw ? 'Funga' : 'Close'}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/8 text-[#C2CBD6]"
              >
                <X className="size-4" />
              </button>
            </div>
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={sw ? 'Jina, namba ya kadi au simu…' : 'Name, ticket code or phone…'}
              data-testid="mobile-scanner-search-input"
              className="mt-3 h-11 w-full shrink-0 rounded-2xl border border-white/15 bg-[#0B0E11] px-4 text-sm text-white outline-none focus:border-[#1FE086]"
            />
            <ul className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {filteredSearchGuests.map((g) => {
                const isAdmitted = g.status === 'checked_in' || Boolean(g.checkedInAt);
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isAdmitted) {
                          evaluateRawScan(g.shortCode, 'manual');
                          return;
                        }
                        const max = Math.max(1, g.partySizeAllowed);
                        setPartySize(Math.min(max, Math.max(1, g.rsvpPartySize ?? 1)));
                        setSearchSheetOpen(false);
                        setConfirmCtx({
                          guest: g,
                          method: 'manual',
                          rawCredential: g.shortCode,
                        });
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#0E1318] px-3.5 py-2.5 text-left hover:border-[#1FE086]/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{g.displayName}</p>
                        <p className="truncate text-xs text-[#9AA4B2]">
                          {g.shortCode} · {g.groupLabel}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          isAdmitted ? 'bg-white/10 text-[#9AA4B2]' : 'bg-[#1FE086] text-[#05140C]'
                        }`}
                      >
                        {isAdmitted ? (sw ? 'Ameingia' : 'Checked in') : sw ? 'Ruhusu' : 'Admit'}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredSearchGuests.length === 0 ? (
                <li className="py-8 text-center text-xs text-[#9AA4B2]">
                  {sw ? 'Hakuna mgeni aliyepatikana.' : 'No matching guest found.'}
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Encrypted Vault Verification Bottom Sheet */}
      {vaultSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[84dvh] w-full max-w-md flex-col rounded-t-3xl border border-white/12 bg-[#141A21] p-5 text-[#F3F5F7] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#1FE086]" aria-hidden="true" />
                <h3 className="text-lg font-bold text-white">
                  {sw ? 'Hifadhi Iliyosimbwa' : 'Encrypted Attendance Vault'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVaultSheetOpen(false)}
                aria-label={sw ? 'Funga' : 'Close'}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/8 text-[#C2CBD6]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-[#0E1318] p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#9AA4B2]">
                  {sw ? 'Hali ya Uthibitisho' : 'Verification'}
                </span>
                <span
                  data-testid="mobile-scanner-vault-status"
                  className={`rounded-full px-2.5 py-0.5 font-bold ${
                    vaultVerification?.valid
                      ? 'bg-[#1FE086]/15 text-[#1FE086]'
                      : 'bg-white/10 text-[#C2CBD6]'
                  }`}
                >
                  {vaultVerification?.valid
                    ? sw
                      ? 'IMETHIBITISHWA HAPA ✓'
                      : 'VERIFIED LOCALLY ✓'
                    : (vaultVerification?.reason ??
                      (sw ? 'Bado haina rekodi' : 'No saved records'))}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-[#8E98A6]">{sw ? 'Walioingia' : 'Saved Attending'}</dt>
                  <dd className="tabular font-semibold text-white">
                    {vaultVerification?.recordCount ?? 0} ({vaultVerification?.totalPeople ?? 0}{' '}
                    {sw ? 'watu' : 'people'})
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8E98A6]">{sw ? 'Mnyororo (Digest)' : 'Chain Digest'}</dt>
                  <dd className="font-mono font-semibold text-[#1FE086]">
                    #
                    {vaultVerification
                      ? vaultVerification.chainDigest.slice(0, 12)
                      : '000000000000'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[#8E98A6]">
                    {sw ? 'Usimbaji (Storage)' : 'Cipher & Storage'}
                  </dt>
                  <dd className="font-mono text-[11px] text-[#D7DFE8]">
                    CTR-SHA256 + HMAC-SHA256 (localStorage ksweb:v1 ·{' '}
                    {vaultVerification?.sealedBytes ?? 0} B)
                  </dd>
                </div>
              </dl>
            </div>

            <ul className="mt-3 flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1 text-xs">
              {(vaultVerification?.records ?? []).map((rec) => (
                <li
                  key={rec.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0E1318] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{rec.displayName}</p>
                    <p className="font-mono text-[11px] text-[#8E98A6]">
                      {rec.shortCode} · {rec.partyAdmitted} {sw ? 'watu' : 'ppl'} · #
                      {rec.entryHash.slice(0, 8)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1FE086]">✓ SHA-256</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                data-testid="mobile-scanner-vault-verify"
                onClick={handleVerifyVaultNow}
                className="min-h-11 w-full rounded-full border border-[#1FE086]/45 bg-[#1FE086]/15 px-4 text-xs font-bold text-[#1FE086] hover:bg-[#1FE086]/25"
              >
                {sw ? 'Thibitisha Vault Bila Mtandao Sasa' : 'Verify Local Vault Offline Now'}
              </button>
              <button
                type="button"
                data-testid="mobile-scanner-vault-export"
                onClick={() => {
                  if (typeof window === 'undefined') return;
                  const sealed = exportWebVaultEnvelope(window.localStorage, eventId);
                  if (!sealed) return;
                  const blob = new Blob([sealed], { type: 'application/octet-stream' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `kadi-attending-${eventId.replace(/[^a-zA-Z0-9_-]/g, '')}.ksenc`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={!vaultVerification?.valid}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-[#171C22] px-4 text-xs font-semibold text-[#D7DFE8] hover:bg-white/10 disabled:opacity-40"
              >
                <Download className="size-3.5" aria-hidden="true" />
                <span>{sw ? 'Pakua Hifadhi (.ksenc)' : 'Export Encrypted .ksenc'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
