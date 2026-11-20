import { describe, expect, it, vi } from 'vitest';
import { playGateSound } from './gate-audio';

describe('gate audio feedback', () => {
  it('does not throw when AudioContext is undefined', () => {
    expect(() => playGateSound('success')).not.toThrow();
    expect(() => playGateSound('alarm')).not.toThrow();
  });

  it('interacts with AudioContext when available', () => {
    const mockOsc = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const mockCtx = {
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => ({ ...mockOsc })),
      createGain: vi.fn(() => ({ ...mockGain })),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const originalAudioContext = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = vi.fn(() => mockCtx);

    try {
      expect(() => playGateSound('success')).not.toThrow();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();

      mockCtx.createOscillator.mockClear();
      expect(() => playGateSound('alarm')).not.toThrow();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    } finally {
      (globalThis as unknown as { AudioContext?: unknown }).AudioContext = originalAudioContext;
    }
  });
});
