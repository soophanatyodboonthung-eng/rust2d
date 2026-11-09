// Game loop — runs on the UI thread every frame (Reanimated
// useFrameCallback). This is the v1 single-player simulation, moved out of
// App.tsx verbatim except for one Phase 1 change: movement is blocked by
// water tiles (the map is real now). In Phase 2 this loop moves to the
// server; the client keeps only prediction + rendering.

import { Dimensions } from 'react-native';
import { useFrameCallback } from 'react-native-reanimated';

import {
  ATTACK_CD,
  ATTACK_RANGE,
  DAY_LEN,
  HUNGER_HP_DRAIN,
  HUNGER_RATE,
  NIGHT_LEN,
  NODE_RESPAWN,
  PLAYER_R,
  PLAYER_SPEED,
  TERRAIN_WALKABLE,
  TILE_SIZE,
  WORLD_H,
  WORLD_W,
  ZOMBIE_DMG,
  ZOMBIE_HIT_COOLDOWN,
  ZOMBIE_HP,
  ZOMBIE_MAX,
  ZOMBIE_R,
  ZOMBIE_SPAWN_DIST,
  ZOMBIE_SPAWN_INTERVAL,
  ZOMBIE_SPEED,
} from '@rust2d/shared';
import { tileAt, type World } from '@rust2d/simulation';

import type { GameState, NodePool, ZombiePool } from './state';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** True when the player may stand at world px (x, y) — water blocks. */
function canStandAt(world: World, x: number, y: number): boolean {
  const kind = tileAt(
    world.terrain,
    world.tiles,
    Math.floor(x / TILE_SIZE),
    Math.floor(y / TILE_SIZE),
  );
  return kind !== null && TERRAIN_WALKABLE[kind];
}

export function useGameLoop(s: GameState): void {
  useFrameCallback((fi) => {
    const dt = Math.min((fi.timeSincePreviousFrame ?? 16.7) / 1000, 0.05);
    if (s.gameOver.value === 1) return;
    s.clock.value += dt;

    // Day / night cycle
    s.timeT.value += dt;
    const cycle = DAY_LEN + NIGHT_LEN;
    if (s.timeT.value >= cycle) {
      s.timeT.value -= cycle;
      s.day.value += 1;
      for (let i = 0; i < ZOMBIE_MAX; i++) s.zombies[i].active.value = 0;
    }
    const night = s.timeT.value >= DAY_LEN ? 1 : 0;
    const targetOp = night === 1 ? 0.5 : 0;
    s.nightOp.value += (targetOp - s.nightOp.value) * Math.min(1, dt * 2);

    // Hunger drains HP when empty
    s.hunger.value = Math.max(0, s.hunger.value - HUNGER_RATE * dt);
    if (s.hunger.value <= 0) s.hp.value = Math.max(0, s.hp.value - HUNGER_HP_DRAIN * dt);

    // Movement (joystick) + water block + collision with solid nodes.
    // Axis-separated movement so the player slides along water edges.
    const mx = s.joyDx.value;
    const my = s.joyDy.value;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0.02) {
      const nx = mx / Math.max(1, len);
      const ny = my / Math.max(1, len);
      let px = s.playerX.value + nx * PLAYER_SPEED * dt;
      if (!canStandAt(s.world, px, s.playerY.value)) px = s.playerX.value;
      let py = s.playerY.value + ny * PLAYER_SPEED * dt;
      if (!canStandAt(s.world, px, py)) py = s.playerY.value;
      for (let i = 0; i < s.nodes.length; i++) {
        const n = s.nodes[i];
        if (n.kind === 'bush' || n.vis.value === 0) continue;
        const dx = px - n.x;
        const dy = py - n.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minD = PLAYER_R + 24;
        if (d < minD && d > 0.001) {
          px = n.x + (dx / d) * minD;
          py = n.y + (dy / d) * minD;
        }
      }
      s.playerX.value = Math.min(WORLD_W - PLAYER_R, Math.max(PLAYER_R, px));
      s.playerY.value = Math.min(WORLD_H - PLAYER_R, Math.max(PLAYER_R, py));
    }

    // Camera follows player (negative translate, clamped to the world)
    s.camTX.value = -Math.min(
      WORLD_W - SCREEN_W,
      Math.max(0, s.playerX.value - SCREEN_W / 2),
    );
    s.camTY.value = -Math.min(
      WORLD_H - SCREEN_H,
      Math.max(0, s.playerY.value - SCREEN_H / 2),
    );

    // Node respawn
    for (let i = 0; i < s.nodes.length; i++) {
      const n = s.nodes[i];
      if (n.vis.value === 0 && s.clock.value >= n.respawnAt.value) {
        n.hp.value = n.maxHp;
        n.vis.value = 1;
      }
    }

    // Attack / gather (queued by the attack button)
    if (s.attackQueued.value === 1) {
      s.attackQueued.value = 0;
      if (s.clock.value - s.lastAttack.value >= ATTACK_CD) {
        s.lastAttack.value = s.clock.value;
        let bestD = ATTACK_RANGE;
        let bestNode: NodePool | null = null;
        let bestZombie: ZombiePool | null = null;
        for (let i = 0; i < s.nodes.length; i++) {
          const n = s.nodes[i];
          if (n.vis.value === 0) continue;
          const d = Math.hypot(s.playerX.value - n.x, s.playerY.value - n.y);
          if (d < bestD) {
            bestD = d;
            bestNode = n;
            bestZombie = null;
          }
        }
        for (let i = 0; i < ZOMBIE_MAX; i++) {
          const z = s.zombies[i];
          if (z.active.value === 0) continue;
          const d = Math.hypot(s.playerX.value - z.x.value, s.playerY.value - z.y.value);
          if (d < bestD) {
            bestD = d;
            bestZombie = z;
            bestNode = null;
          }
        }
        if (bestNode !== null) {
          const n = bestNode;
          let dmg = 1;
          if (n.kind === 'tree' && s.hasAxe.value === 1) dmg = 3;
          if (n.kind === 'rock' && s.hasPickaxe.value === 1) dmg = 3;
          const gain = Math.min(dmg, n.hp.value);
          n.hp.value -= dmg;
          if (n.kind === 'tree') s.wood.value += gain;
          else if (n.kind === 'rock') s.stone.value += gain;
          else s.berry.value += gain;
          if (n.hp.value <= 0) {
            n.vis.value = 0;
            n.respawnAt.value = s.clock.value + NODE_RESPAWN;
          }
        } else if (bestZombie !== null) {
          const z = bestZombie;
          const dmg = s.hasAxe.value === 1 || s.hasPickaxe.value === 1 ? 2 : 1;
          z.hp.value -= dmg;
          if (z.hp.value <= 0) {
            z.active.value = 0;
            s.kills.value += 1;
          }
        }
      }
    }

    // Zombie spawning (night only)
    if (night === 1) {
      s.spawnTimer.value += dt;
      if (s.spawnTimer.value >= ZOMBIE_SPAWN_INTERVAL) {
        s.spawnTimer.value = 0;
        let activeCount = 0;
        let freeIdx = -1;
        for (let i = 0; i < ZOMBIE_MAX; i++) {
          if (s.zombies[i].active.value === 1) activeCount++;
          else if (freeIdx === -1) freeIdx = i;
        }
        if (activeCount < ZOMBIE_MAX && freeIdx !== -1) {
          const z = s.zombies[freeIdx];
          const ang = Math.random() * Math.PI * 2;
          z.x.value = Math.min(
            WORLD_W - 30,
            Math.max(30, s.playerX.value + Math.cos(ang) * ZOMBIE_SPAWN_DIST),
          );
          z.y.value = Math.min(
            WORLD_H - 30,
            Math.max(30, s.playerY.value + Math.sin(ang) * ZOMBIE_SPAWN_DIST),
          );
          z.hp.value = ZOMBIE_HP;
          z.active.value = 1;
        }
      }
    }

    // Zombie AI: walk to player, hit when close
    for (let i = 0; i < ZOMBIE_MAX; i++) {
      const z = s.zombies[i];
      if (z.active.value === 0) continue;
      const dx = s.playerX.value - z.x.value;
      const dy = s.playerY.value - z.y.value;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.01) {
        const step = Math.min(d, ZOMBIE_SPEED * dt);
        z.x.value += (dx / d) * step;
        z.y.value += (dy / d) * step;
      }
      if (d < PLAYER_R + ZOMBIE_R + 6 && s.clock.value - z.lastHit.value >= ZOMBIE_HIT_COOLDOWN) {
        z.lastHit.value = s.clock.value;
        s.hp.value = Math.max(0, s.hp.value - ZOMBIE_DMG);
      }
    }

    if (s.hp.value <= 0) s.gameOver.value = 1;
  });
}
