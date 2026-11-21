import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = {
  getAuthConfig: vi.fn(),
  startFirebaseSignIn: vi.fn(),
  requestOtp: vi.fn(),
};
const signInWithPhoneNumber = vi.fn();

vi.mock('./env', () => ({ USE_MOCKS: false }));
vi.mock('./repo', () => ({ getRepository: () => repo }));
vi.mock('firebase/app', () => ({ getApps: () => [{}], initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({
  getAuth: () => ({ languageCode: null }),
  RecaptchaVerifier: class {
    clear() {}
  },
  signInWithPhoneNumber: (...a: unknown[]) => signInWithPhoneNumber(...a),
  signOut: vi.fn(),
}));

const store = new Map<string, string>();
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

vi.stubGlobal('document', { createElement: () => ({}) });

const PHONE = '+255712480001';
const container = { replaceChildren: () => undefined } as unknown as HTMLElement;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  repo.getAuthConfig.mockResolvedValue({ otpProvider: 'firebase', firebase: { projectId: 'p' } });
  repo.startFirebaseSignIn.mockResolvedValue({ phone: PHONE });
  repo.requestOtp.mockResolvedValue({ resendAfterSeconds: 30 });
});

describe('Firebase-only phone sign-in for web', () => {
  it('uses Firebase when it sends the code', async () => {
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
    expect(err).toMatchObject({ reason: 'failed' });
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

  it('rejects without calling requestOtp if auth config is not firebase', async () => {
    vi.resetModules();
    repo.getAuthConfig.mockResolvedValueOnce({ otpProvider: 'sms' });
    const { startPhoneSignIn, FirebasePhoneError } = await import('./firebase-phone');
    const err = await startPhoneSignIn(PHONE, container, 'sw').catch((e) => e);
    expect(err).toBeInstanceOf(FirebasePhoneError);
    expect(err).toMatchObject({ reason: 'failed' });
    expect(repo.requestOtp).not.toHaveBeenCalled();
  });
});
