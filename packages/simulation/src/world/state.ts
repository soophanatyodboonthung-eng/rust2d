// World container — creation (with deterministic terrain from the seed)
// and the tick counter. Gameplay systems (movement, gather, combat, ...)
// arrive in Phase 2+ as pure functions over `World`.

import { MAP_TILES } from '@rust2d/shared';

import type { World } from '../types';
import { generateTerrain } from './terrain';

export function createWorld(seed: number, tiles: number = MAP_TILES): World {
  if (tiles <= 0) {
    throw new Error('createWorld: tiles must be positive');
  }
  return { seed, tiles, terrain: generateTerrain(seed, tiles), tick: 0 };
}

/** Advance the world by one simulation tick (mutates the passed world). */
export function advanceTick(world: World): void {
  world.tick += 1;
}
