import { describe, expect, it } from 'vitest';

import { hash2, mulberry32, valueNoise } from '../src/rng';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(1337);
    const b = mulberry32(1337);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('returns values in [0, 1)', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('hash2 / valueNoise', () => {
  it('hash2 is deterministic and in [0, 1)', () => {
    expect(hash2(3, 5, 1337)).toBe(hash2(3, 5, 1337));
    expect(hash2(3, 5, 1337)).toBeGreaterThanOrEqual(0);
    expect(hash2(3, 5, 1337)).toBeLessThan(1);
    expect(hash2(3, 5, 1337)).not.toBe(hash2(4, 5, 1337));
  });

  it('valueNoise is smooth — neighbouring tiles are close', () => {
    const a = valueNoise(10, 10, 24, 1337);
    const b = valueNoise(11, 10, 24, 1337);
    expect(Math.abs(a - b)).toBeLessThan(0.2);
  });
});
