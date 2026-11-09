// World and gameplay constants — verbatim values from the v1 prototype
// (App.tsx). These are the single source of truth from Phase 0 on; the
// client and (later) the server both import them instead of hardcoding.

import type { ItemId } from './items';

// World (v1 prototype world; the 256x256-tile persistent world arrives
// in Phase 1 and will replace these dimensions)
export const WORLD_W = 1600;
export const WORLD_H = 1200;
export const WORLD_SEED = 1337;

// Player
export const PLAYER_R = 18;
export const PLAYER_SPEED = 230;

// Zombies (night only in v1)
export const ZOMBIE_R = 20;
export const ZOMBIE_SPEED = 75;
export const ZOMBIE_HP = 3;
export const ZOMBIE_DMG = 8;
export const ZOMBIE_MAX = 6;
export const ZOMBIE_SPAWN_INTERVAL = 4; // seconds between spawns at night
export const ZOMBIE_SPAWN_DIST = 540; // px from the player
export const ZOMBIE_HIT_COOLDOWN = 1; // seconds between hits on the player

// Combat / gathering
export const ATTACK_RANGE = 140;
export const ATTACK_CD = 0.35; // seconds between attacks

// Day / night cycle
export const DAY_LEN = 60; // seconds
export const NIGHT_LEN = 30; // seconds

// Survival
export const HUNGER_RATE = 0.35; // hunger/s drain
export const HUNGER_HP_DRAIN = 2; // hp/s while hunger is 0
export const BERRY_HUNGER = 30; // hunger restored by one berry

// Resource nodes
export const NODE_RESPAWN = 45; // seconds
export const NODE_SEED = 1337;
export const NODE_MARGIN = 90; // px from the world edge
export const NODE_MIN_DIST = 100; // px between nodes
export const NODE_CENTER_MIN_DIST = 200; // px from the world centre
export const NODE_COUNTS = { tree: 10, rock: 8, bush: 6 } as const;
export const NODE_HP = { tree: 3, rock: 4, bush: 2 } as const;
export const NODE_YIELD: Record<keyof typeof NODE_HP, ItemId> = {
  tree: 'wood',
  rock: 'stone',
  bush: 'berry',
};

export type NodeKind = keyof typeof NODE_HP;

// Server tick (Phase 2 target; the v1 client runs its own frame loop)
export const TICK_RATE = 20; // ticks per second
export const TICK_MS = 1000 / TICK_RATE;
