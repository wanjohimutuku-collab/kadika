import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderCardPreviewToCanvas,
  cardPreviewToBlob,
  shareCardImageViaWhatsApp,
  downloadCardImage,
  type CardImageOptions,
} from './card-canvas';

describe('card-canvas', () => {
  const sampleOptions: CardImageOptions = {
    coupleNames: 'Asha & Juma',
    partnerA: 'Asha',
    partnerB: 'Juma',
    eventKind: 'Harusi',
    dateStart: '2026-12-12T14:00:00Z',
    venueName: 'Serena Hotel, Dar es Salaam',
    guestName: 'Baraka Mwinyi',
    shortCode: 'KH-4826',
    locale: 'sw',
    scale: 2,
  };

  let mockCtx: Record<string, ReturnType<typeof vi.fn>>;
  let mockCanvas: Record<string, unknown>;

  beforeEach(() => {
    mockCtx = {
      scale: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      roundRect: vi.fn(),
      arc: vi.fn(),
      translate: vi.fn(),
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((cb: (b: Blob | null) => void) =>
        cb(new Blob(['mock-png-data'], { type: 'image/png' })),
      ),
    };

    const g = globalThis as unknown as Record<string, unknown>;

    g.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {
          href: '',
          download: '',
          click: vi.fn(),
          remove: vi.fn(),
        };
      }),
      body: {
        appendChild: vi.fn(),
      },
    };

    g.URL = {
      createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/mock-uuid'),
      revokeObjectURL: vi.fn(),
    };

    g.File = class MockFile {
      name: string;
      type: string;
      constructor(
        public parts: unknown[],
        name: string,
        options?: { type?: string },
      ) {
        this.name = name;
        this.type = options?.type || '';
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders card to canvas with proper dimensions and scale', () => {
    const canvas = renderCardPreviewToCanvas(sampleOptions);

    expect(canvas.width).toBe(640 * 2);
    expect(canvas.height).toBe(940 * 2);
    expect(mockCtx.scale).toHaveBeenCalledWith(2, 2);
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  it('converts card preview to blob', async () => {
    const blob = await cardPreviewToBlob(sampleOptions);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  it('triggers download with proper filename', async () => {
    await downloadCardImage(sampleOptions, 'kadi-test.png');
    const doc = (
      globalThis as unknown as Record<string, { body: { appendChild: ReturnType<typeof vi.fn> } }>
    ).document;
    expect(doc?.body.appendChild).toHaveBeenCalled();
  });

  it('shares via Web Share API when file sharing is supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: mockShare,
        canShare: mockCanShare,
      },
      configurable: true,
      writable: true,
    });

    const res = await shareCardImageViaWhatsApp(sampleOptions, { messageText: 'Mwaliko' });

    expect(res.shared).toBe(true);
    expect(res.method).toBe('native-file-share');
    expect(mockShare).toHaveBeenCalled();
  });

  it('falls back to download and WhatsApp url when canShare is unsupported', async () => {
    const mockOpen = vi.fn();
    const g = globalThis as unknown as Record<string, unknown>;
    g.window = { open: mockOpen };
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: undefined,
        canShare: undefined,
      },
      configurable: true,
      writable: true,
    });

    const res = await shareCardImageViaWhatsApp(sampleOptions, { messageText: 'Mwaliko' });

    expect(res.shared).toBe(true);
    expect(res.method).toBe('download-and-whatsapp');
    expect(mockOpen).toHaveBeenCalled();
    const url = String(mockOpen.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('https://api.whatsapp.com/send?');
    expect(url).toContain('Mwaliko');
  });
});
