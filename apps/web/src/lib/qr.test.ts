import { describe, expect, it } from 'vitest';
import { minPrintSizeMm, printQrIssues, qrMatrix, qrPath } from './qr';

describe('QR', () => {
  const payload = 'v1.0192f1a0.abcdef12.2.1.MOCKSIG';
  it('builds a version-appropriate matrix with error correction M', () => {
    const m = qrMatrix(payload);
    expect(m.size).toBeGreaterThanOrEqual(25);
    expect(m.modules.filter(Boolean).length).toBeGreaterThan(100);
  });
  it('offsets the path by a 4-module quiet zone', () => {
    const d = qrPath(qrMatrix(payload));
    expect(d.startsWith('M4 4')).toBe(true);
  });
  it('enforces the §6.4 print size rules', () => {
    expect(printQrIssues(25, 25)).toEqual([]);
    expect(printQrIssues(20, 25)).toEqual(['min_size']);
    expect(printQrIssues(20, 29)).toEqual(['min_size', 'module_size']);
    expect(printQrIssues(25, 33)).toEqual(['module_size']);
    expect(printQrIssues(27, 33)).toEqual([]);
    expect(minPrintSizeMm(29)).toBe(25);
    expect(minPrintSizeMm(37)).toBe(29.6);
  });
});
