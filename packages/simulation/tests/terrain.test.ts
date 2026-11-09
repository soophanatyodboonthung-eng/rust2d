import { describe, expect, it } from 'vitest';

import { MAP_TILES } from '@rust2d/shared';

import { generateTerrain, terrainDistribution, tileAt } from '../src/world/terrain';

describe('generateTerrain', () => {
  it('is deterministic for the same seed', () => {
    expect(generateTerrain(1337)).toEqual(generateTerrain(1337));
  });

  it('produces a full 256x256 grid', () => {
    const terrain = generateTerrain(1337);
    expect(terrain.length).toBe(MAP_TILES * MAP_TILES);
  });

  it('has all four terrain kinds with sane shares (seed 1337)', () => {
    const d = terrainDistribution(generateTerrain(1337));
    const total = MAP_TILES * MAP_TILES;
    const share = (n: number) => n / total;
    expect(share(d.water)).toBeGreaterThan(0.02);
    expect(share(d.water)).toBeLessThan(0.3);
    expect(share(d.forest)).toBeGreaterThan(0.05);
    expect(share(d.forest)).toBeLessThan(0.4);
    expect(share(d.rock)).toBeGreaterThan(0.01);
    expect(share(d.rock)).toBeLessThan(0.25);
    expect(share(d.grass)).toBeGreaterThan(0.3);
  });

  it('spawn area (centre) is all grass', () => {
    const terrain = generateTerrain(1337);
    const c = Math.floor(MAP_TILES / 2);
    // Clearing is a circle of radius 6; assert the radius-5 disc inside it.
    for (let ty = c - 5; ty <= c + 5; ty++) {
      for (let tx = c - 5; tx <= c + 5; tx++) {
        const dx = tx - c;
        const dy = ty - c;
        if (dx * dx + dy * dy > 25) continue;
        expect(tileAt(terrain, MAP_TILES, tx, ty)).toBe('grass');
      }
    }
  });

  it('tileAt returns null outside the map', () => {
    const terrain = generateTerrain(1337);
    expect(tileAt(terrain, MAP_TILES, -1, 0)).toBeNull();
    expect(tileAt(terrain, MAP_TILES, 0, MAP_TILES)).toBeNull();
    expect(tileAt(terrain, MAP_TILES, MAP_TILES, MAP_TILES)).toBeNull();
  });
});
