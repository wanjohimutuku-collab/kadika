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

const PHONE = '+255712480001';
const container = {} as HTMLElement;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  repo.getAuthConfig.mockResolvedValue({ otpProvider: 'firebase', firebase: { projectId: 'p' } });
  repo.startFirebaseSignIn.mockResolvedValue({ phone: PHONE });
  repo.requestOtp.mockResolvedValue({ resendAfterSeconds: 30 });
});

describe('Firebase phone sign-in with SMS fallback', () => {
  it('uses Firebase when it sends the code', async () => {
    const { startPhoneSignIn, hasPendingCode, usesSmsFallback } = await import('./firebase-phone');
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    expect(await startPhoneSignIn(PHONE, container, 'sw')).toBe('firebase');
    expect(hasPendingCode(PHONE)).toBe(true);
    expect(usesSmsFallback(PHONE)).toBe(false);
    expect(repo.requestOtp).not.toHaveBeenCalled();
  });

  it('sends our own SMS code when Firebase refuses after the reCAPTCHA (503, error 39)', async () => {
    const { startPhoneSignIn, hasPendingCode, usesSmsFallback } = await import('./firebase-phone');
    signInWithPhoneNumber.mockRejectedValue(
      Object.assign(new Error('Firebase: Error (auth/error-code:-39).'), {
        code: 'auth/error-code:-39',
      }),
    );
    expect(await startPhoneSignIn(PHONE, container, 'sw')).toBe('sms');
    expect(repo.requestOtp).toHaveBeenCalledWith(PHONE, { fallback: true, language: 'sw' });
    expect(hasPendingCode(PHONE)).toBe(false);
    expect(usesSmsFallback(PHONE)).toBe(true);
    // a resend goes straight to our SMS code, without asking Firebase again
    signInWithPhoneNumber.mockClear();
    expect(await startPhoneSignIn(PHONE, container, 'sw')).toBe('sms');
    expect(signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it('still reports a wrong number instead of falling back', async () => {
    const { startPhoneSignIn, FirebasePhoneError } = await import('./firebase-phone');
    signInWithPhoneNumber.mockRejectedValue({ code: 'auth/invalid-phone-number' });
    await expect(startPhoneSignIn(PHONE, container, 'sw')).rejects.toBeInstanceOf(
      FirebasePhoneError,
    );
    expect(repo.requestOtp).not.toHaveBeenCalled();
  });
});
