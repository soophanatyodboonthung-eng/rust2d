// Game state — all mutable game values live here as Reanimated shared
// values (read directly by Skia, never by React state). Created once by
// useGameState() in App and passed to the loop, input and renderer.
// In Phase 2 the simulation moves to the server; this state becomes the
// client-side mirror (prediction + interpolation) instead of the sim.

import { useMemo } from 'react';
import { makeMutable, useSharedValue, type SharedValue } from 'react-native-reanimated';

import {
  NODE_CENTER_MIN_DIST,
  NODE_COUNTS,
  NODE_HP,
  NODE_MARGIN,
  NODE_MIN_DIST,
  NODE_SEED,
  WORLD_H,
  WORLD_SEED,
  WORLD_W,
  ZOMBIE_MAX,
  type NodeKind,
} from '@rust2d/shared';
import { createWorld, mulberry32, type World } from '@rust2d/simulation';

export type NodeDef = { kind: NodeKind; x: number; y: number; maxHp: number };
export type NodePool = NodeDef & {
  hp: SharedValue<number>;
  vis: SharedValue<number>;
  respawnAt: SharedValue<number>;
};
export type ZombiePool = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  hp: SharedValue<number>;
  active: SharedValue<number>;
  lastHit: SharedValue<number>;
};

export interface GameState {
  /** Deterministic terrain (256x256 tiles) shared by loop + renderer. */
  world: World;
  // Player / camera / time
  playerX: SharedValue<number>;
  playerY: SharedValue<number>;
  camTX: SharedValue<number>;
  camTY: SharedValue<number>;
  clock: SharedValue<number>;
  timeT: SharedValue<number>;
  day: SharedValue<number>;
  nightOp: SharedValue<number>;
  spawnTimer: SharedValue<number>;
  lastAttack: SharedValue<number>;
  attackQueued: SharedValue<number>;
  gameOver: SharedValue<number>;
  // Survival state
  hp: SharedValue<number>;
  hunger: SharedValue<number>;
  wood: SharedValue<number>;
  stone: SharedValue<number>;
  berry: SharedValue<number>;
  kills: SharedValue<number>;
  hasAxe: SharedValue<number>;
  hasPickaxe: SharedValue<number>;
  // Joystick
  joyBaseX: SharedValue<number>;
  joyBaseY: SharedValue<number>;
  joyKx: SharedValue<number>;
  joyKy: SharedValue<number>;
  joyDx: SharedValue<number>;
  joyDy: SharedValue<number>;
  joyOp: SharedValue<number>;
  // Entity pools (stable across renders; makeMutable, not hooks in a loop)
  nodes: NodePool[];
  zombies: ZombiePool[];
}

// Deterministic node layout: same map every run (seeded from NODE_SEED).
function buildNodeDefs(): NodeDef[] {
  const rand = mulberry32(NODE_SEED);
  const defs: NodeDef[] = [];
  const kinds: NodeKind[] = [
    ...Array<NodeKind>(NODE_COUNTS.tree).fill('tree'),
    ...Array<NodeKind>(NODE_COUNTS.rock).fill('rock'),
    ...Array<NodeKind>(NODE_COUNTS.bush).fill('bush'),
  ];
  for (const kind of kinds) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 40; attempt++) {
      x = NODE_MARGIN + rand() * (WORLD_W - NODE_MARGIN * 2);
      y = NODE_MARGIN + rand() * (WORLD_H - NODE_MARGIN * 2);
      const dc = Math.hypot(x - WORLD_W / 2, y - WORLD_H / 2);
      const okFar = defs.every((d) => Math.hypot(x - d.x, y - d.y) > NODE_MIN_DIST);
      if (dc > NODE_CENTER_MIN_DIST && okFar) break;
    }
    defs.push({ kind, x, y, maxHp: NODE_HP[kind] });
  }
  return defs;
}

const NODE_DEFS = buildNodeDefs();

export function useGameState(): GameState {
  const world = useMemo(() => createWorld(WORLD_SEED), []);
  const playerX = useSharedValue(WORLD_W / 2);
  const playerY = useSharedValue(WORLD_H / 2);
  const camTX = useSharedValue(0);
  const camTY = useSharedValue(0);
  const clock = useSharedValue(0);
  const timeT = useSharedValue(0);
  const day = useSharedValue(1);
  const nightOp = useSharedValue(0);
  const spawnTimer = useSharedValue(0);
  const lastAttack = useSharedValue(-10);
  const attackQueued = useSharedValue(0);
  const gameOver = useSharedValue(0);

  const hp = useSharedValue(100);
  const hunger = useSharedValue(100);
  const wood = useSharedValue(0);
  const stone = useSharedValue(0);
  const berry = useSharedValue(0);
  const kills = useSharedValue(0);
  const hasAxe = useSharedValue(0);
  const hasPickaxe = useSharedValue(0);

  const joyBaseX = useSharedValue(0);
  const joyBaseY = useSharedValue(0);
  const joyKx = useSharedValue(0);
  const joyKy = useSharedValue(0);
  const joyDx = useSharedValue(0);
  const joyDy = useSharedValue(0);
  const joyOp = useSharedValue(0);

  const nodes = useMemo<NodePool[]>(
    () =>
      NODE_DEFS.map((d) => ({
        ...d,
        hp: makeMutable(d.maxHp),
        vis: makeMutable(1),
        respawnAt: makeMutable(0),
      })),
    [],
  );
  const zombies = useMemo<ZombiePool[]>(
    () =>
      Array.from({ length: ZOMBIE_MAX }, () => ({
        x: makeMutable(0),
        y: makeMutable(0),
        hp: makeMutable(0),
        active: makeMutable(0),
        lastHit: makeMutable(-10),
      })),
    [],
  );

  return {
    world,
    playerX,
    playerY,
    camTX,
    camTY,
    clock,
    timeT,
    day,
    nightOp,
    spawnTimer,
    lastAttack,
    attackQueued,
    gameOver,
    hp,
    hunger,
    wood,
    stone,
    berry,
    kills,
    hasAxe,
    hasPickaxe,
    joyBaseX,
    joyBaseY,
    joyKx,
    joyKy,
    joyDx,
    joyDy,
    joyOp,
    nodes,
    zombies,
  };
}
