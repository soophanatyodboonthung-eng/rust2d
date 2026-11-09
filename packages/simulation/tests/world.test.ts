import { describe, expect, it } from 'vitest';

import { advanceTick, createWorld } from '../src/world';

describe('createWorld', () => {
  it('returns the seed, dimensions and tick 0', () => {
    const world = createWorld(1337, 1600, 1200);
    expect(world.seed).toBe(1337);
    expect(world.width).toBe(1600);
    expect(world.height).toBe(1200);
    expect(world.tick).toBe(0);
  });

  it('rejects non-positive dimensions', () => {
    expect(() => createWorld(1, 0, 100)).toThrow();
    expect(() => createWorld(1, 100, -5)).toThrow();
  });
});

describe('advanceTick', () => {
  it('increments the tick by 1 per call', () => {
    const world = createWorld(1, 100, 100);
    advanceTick(world);
    expect(world.tick).toBe(1);
    advanceTick(world);
    expect(world.tick).toBe(2);
  });

  it('reaches 20 ticks after 20 calls (one second at 20 ticks/s)', () => {
    const world = createWorld(1, 100, 100);
    for (let i = 0; i < 20; i++) advanceTick(world);
    expect(world.tick).toBe(20);
  });
});
