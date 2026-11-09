// World container — the smallest real piece of simulation: creation and
// the tick counter. No gameplay systems live here in Phase 0; they are
// added one at a time in Phase 2+ as pure functions over `World`.

import type { World } from './types';

export function createWorld(seed: number, width: number, height: number): World {
  if (width <= 0 || height <= 0) {
    throw new Error('createWorld: width and height must be positive');
  }
  return { seed, width, height, tick: 0 };
}

/** Advance the world by one simulation tick (mutates the passed world). */
export function advanceTick(world: World): void {
  world.tick += 1;
}
