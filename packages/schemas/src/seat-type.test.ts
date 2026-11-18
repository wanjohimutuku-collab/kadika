import { describe, expect, it } from 'vitest';
import { parseSeatType, seatsFor, seatType } from './seat-type';

describe('seat type', () => {
  it('names a 1-seat card Single (S) and a 2-seat card Double (D)', () => {
    expect(seatType(1)).toBe('S');
    expect(seatType(2)).toBe('D');
    expect(seatType(4)).toBeNull();
    expect(seatType(0)).toBe('S');
  });

  it('maps a type to its seats', () => {
    expect(seatsFor('S')).toBe(1);
    expect(seatsFor('D')).toBe(2);
  });

  it('reads S/D, words and numbers from an import column', () => {
    for (const v of ['S', 's', 'Single', 'single', 'Mmoja', '1']) expect(parseSeatType(v)).toBe(1);
    for (const v of ['D', 'd', 'Double', 'DOUBLE', 'Wawili', 'Mbili', '2'])
      expect(parseSeatType(v)).toBe(2);
    expect(parseSeatType('5')).toBe(5);
    expect(parseSeatType('40')).toBe(10);
    expect(parseSeatType('')).toBeNull();
    expect(parseSeatType('x')).toBeNull();
  });
});
