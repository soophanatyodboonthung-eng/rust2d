// Core simulation types. Plain data only — no classes with behaviour,
// so a World can be serialized, snapshotted and tested trivially.
// Systems (movement, gather, combat, ...) arrive in Phase 2+ and operate
// on these types as pure functions.

export interface World {
  /** World-generation seed (deterministic layout). */
  seed: number;
  width: number;
  height: number;
  /** Simulation tick counter. Advances by 1 per server tick (20/s). */
  tick: number;
}
