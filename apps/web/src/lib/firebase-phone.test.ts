import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = {
  getAuthConfig: vi.fn(),
  startFirebaseSignIn: vi.fn(),
  requestOtp: vi.fn(),
};
const signInWithPhoneNumber = vi.fn();
const initializeRecaptchaConfig = vi.fn();

vi.mock('./env', () => ({ USE_MOCKS: false }));
vi.mock('./repo', () => ({ getRepository: () => repo }));
vi.mock('firebase/app', () => ({ getApps: () => [{}], initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({
  getAuth: () => ({ languageCode: null }),
  RecaptchaVerifier: class {
    clear() {}
  },
  signInWithPhoneNumber: (...a: unknown[]) => signInWithPhoneNumber(...a),
  initializeRecaptchaConfig: (...a: unknown[]) => initializeRecaptchaConfig(...a),
  signOut: vi.fn(),
}));

const store = new Map<string, string>();
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

/** The v2 picture challenge as the watchdog sees it: an iframe whose grandparent is shown or hidden. */
let challenge: 'none' | 'visible' | 'hidden' = 'none';
const challengeBox = {};
vi.stubGlobal('document', {
  createElement: () => ({}),
  querySelector: () =>
    challenge === 'none' ? null : { parentElement: { parentElement: challengeBox } },
});
vi.stubGlobal('getComputedStyle', () => ({ visibility: challenge }));

const PHONE = '+255712480001';
const container = { replaceChildren: () => undefined } as unknown as HTMLElement;

beforeEach(() => {
  store.clear();
  challenge = 'none';
  vi.useRealTimers();
  vi.clearAllMocks();
  repo.getAuthConfig.mockResolvedValue({ otpProvider: 'firebase', firebase: { projectId: 'p' } });
  repo.startFirebaseSignIn.mockResolvedValue({ phone: PHONE });
  repo.requestOtp.mockResolvedValue({ resendAfterSeconds: 30 });
  initializeRecaptchaConfig.mockResolvedValue(undefined);
});

describe('Firebase-only phone sign-in for web', () => {
  it('uses Firebase when it sends the code', async () => {
    vi.resetModules();
    const { startPhoneSignIn, hasPendingCode } = await import('./firebase-phone');
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    expect(await startPhoneSignIn(PHONE, container, 'sw')).toBe('firebase');
    expect(hasPendingCode(PHONE)).toBe(true);
    expect(repo.requestOtp).not.toHaveBeenCalled();
  });

  it('throws FirebasePhoneError without falling back to SMS when Firebase refuses (503, error 39)', async () => {
    const { startPhoneSignIn, hasPendingCode, FirebasePhoneError } =
      await import('./firebase-phone');
    signInWithPhoneNumber.mockRejectedValue(
      Object.assign(new Error('Firebase: Error (auth/error-code:-39).'), {
        code: 'auth/error-code:-39',
      }),
    );
    const err = await startPhoneSignIn(PHONE, container, 'sw').catch((e) => e);
    expect(err).toBeInstanceOf(FirebasePhoneError);
    expect(err).toMatchObject({ reason: 'undeliverable' });
    expect(repo.requestOtp).not.toHaveBeenCalled();
    expect(hasPendingCode(PHONE)).toBe(false);
  });

  it('maps rate-limit errors from Firebase without falling back to SMS', async () => {
    const { startPhoneSignIn, FirebasePhoneError } = await import('./firebase-phone');
    signInWithPhoneNumber.mockRejectedValue({ code: 'auth/too-many-requests' });
    const err = await startPhoneSignIn(PHONE, container, 'sw').catch((e) => e);
    expect(err).toBeInstanceOf(FirebasePhoneError);
    expect(err).toMatchObject({ reason: 'too_many' });
    expect(repo.requestOtp).not.toHaveBeenCalled();
  });

  it('still reports a wrong number instead of falling back', async () => {
    const { startPhoneSignIn, FirebasePhoneError } = await import('./firebase-phone');
    signInWithPhoneNumber.mockRejectedValue({ code: 'auth/invalid-phone-number' });
    const err = await startPhoneSignIn(PHONE, container, 'sw').catch((e) => e);
    expect(err).toBeInstanceOf(FirebasePhoneError);
    expect(err).toMatchObject({ reason: 'invalid_phone' });
    expect(repo.requestOtp).not.toHaveBeenCalled();
  });

  it('reports a reCAPTCHA Enterprise refusal as blocked, not as a generic failure', async () => {
    const { startPhoneSignIn, FirebasePhoneError } = await import('./firebase-phone');
    for (const code of ['auth/invalid-app-credential', 'auth/missing-recaptcha-token']) {
      signInWithPhoneNumber.mockRejectedValueOnce({ code });
      const err = await startPhoneSignIn(PHONE, container, 'sw').catch((e) => e);
      expect(err).toBeInstanceOf(FirebasePhoneError);
      expect(err).toMatchObject({ reason: 'blocked' });
    }
  });

  it('loads the reCAPTCHA Enterprise config once, and still signs in when the project has none', async () => {
    vi.resetModules();
    initializeRecaptchaConfig.mockRejectedValue(new Error('recaptchaKey undefined'));
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    const { prepareFirebaseSignIn, startPhoneSignIn } = await import('./firebase-phone');
    await prepareFirebaseSignIn();
    expect(await startPhoneSignIn(PHONE, container, 'sw')).toBe('firebase');
    expect(initializeRecaptchaConfig).toHaveBeenCalledTimes(1);
  });

  it('rejects without calling requestOtp if auth config is not firebase', async () => {
    vi.resetModules();
    repo.getAuthConfig.mockResolvedValueOnce({ otpProvider: 'sms' });
    const { startPhoneSignIn, FirebasePhoneError } = await import('./firebase-phone');
    const err = await startPhoneSignIn(PHONE, container, 'sw').catch((e) => e);
    expect(err).toBeInstanceOf(FirebasePhoneError);
    expect(err).toMatchObject({ reason: 'failed' });
    expect(repo.requestOtp).not.toHaveBeenCalled();
  });

  it('gives up with timeout when the picture challenge is closed without being solved', async () => {
    vi.resetModules();
    const { startPhoneSignIn, hasPendingCode } = await import('./firebase-phone');
    vi.useFakeTimers();
    signInWithPhoneNumber.mockReturnValue(new Promise(() => undefined)); // Firebase never settles
    const result = startPhoneSignIn(PHONE, container, 'sw').catch((e) => e);
    await vi.waitFor(() => expect(signInWithPhoneNumber).toHaveBeenCalled());
    challenge = 'visible';
    await vi.advanceTimersByTimeAsync(10_000); // the visitor looks at the puzzle
    challenge = 'hidden'; // …and clicks outside it
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await result).toMatchObject({ reason: 'timeout' });
    expect(hasPendingCode(PHONE)).toBe(false);
  });

  it('keeps waiting while the challenge is open, and gives up after the overall cap', async () => {
    vi.resetModules();
    const { startPhoneSignIn, SEND_TIMEOUT_MS } = await import('./firebase-phone');
    vi.useFakeTimers();
    signInWithPhoneNumber.mockReturnValue(new Promise(() => undefined));
    let settled: unknown = 'pending';
    void startPhoneSignIn(PHONE, container, 'sw').catch((e) => (settled = e));
    await vi.waitFor(() => expect(signInWithPhoneNumber).toHaveBeenCalled());
    challenge = 'visible';
    await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS - 1_000);
    expect(settled).toBe('pending');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(settled).toMatchObject({ reason: 'timeout' });
  });

  it('still sends when the challenge is solved and closes', async () => {
    vi.resetModules();
    const { startPhoneSignIn } = await import('./firebase-phone');
    vi.useFakeTimers();
    let finish!: (v: unknown) => void;
    signInWithPhoneNumber.mockReturnValue(new Promise((r) => (finish = r)));
    const result = startPhoneSignIn(PHONE, container, 'sw');
    await vi.waitFor(() => expect(signInWithPhoneNumber).toHaveBeenCalled());
    challenge = 'visible';
    await vi.advanceTimersByTimeAsync(5_000);
    challenge = 'hidden';
    finish({ confirm: vi.fn() }); // the solved puzzle lets Firebase send at once
    expect(await result).toBe('firebase');
  });
});
