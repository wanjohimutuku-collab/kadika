import { describe, expect, it } from 'vitest';
import { fitWithin, shrinkPhoto } from './shrink-photo';

describe('fitWithin', () => {
  it('fits the longest side to 2048 px and keeps the shape', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1536, height: 2048 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('shrinkPhoto', () => {
  it('sends the original where the browser cannot decode it', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' });
    expect(await shrinkPhoto(file)).toBe(file);
  });
});
