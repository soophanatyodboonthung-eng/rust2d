import { describe, expect, it } from 'vitest';

import { MAP_TILES } from '@rust2d/shared';

import { advanceTick, createWorld } from '../src/world/state';

describe('createWorld', () => {
  it('returns the seed, tile size, terrain grid and tick 0', () => {
    const world = createWorld(1337);
    expect(world.seed).toBe(1337);
    expect(world.tiles).toBe(MAP_TILES);
    expect(world.terrain).toBeInstanceOf(Uint8Array);
    expect(world.terrain.length).toBe(MAP_TILES * MAP_TILES);
    expect(world.tick).toBe(0);
  });

  it('two worlds from the same seed have identical terrain', () => {
    expect(createWorld(1337).terrain).toEqual(createWorld(1337).terrain);
  });

  it('different seeds give different terrain', () => {
    expect(createWorld(1337).terrain).not.toEqual(createWorld(42).terrain);
  });

  it('rejects non-positive tile counts', () => {
    expect(() => createWorld(1, 0)).toThrow();
    expect(() => createWorld(1, -5)).toThrow();
  });
});

describe('advanceTick', () => {
  it('increments the tick by 1 per call', () => {
    const world = createWorld(1, 100);
    advanceTick(world);
    expect(world.tick).toBe(1);
    advanceTick(world);
    expect(world.tick).toBe(2);
  });

  it('reaches 20 ticks after 20 calls (one second at 20 ticks/s)', () => {
    const world = createWorld(1, 100);
    for (let i = 0; i < 20; i++) advanceTick(world);
    expect(world.tick).toBe(20);
  });
});
