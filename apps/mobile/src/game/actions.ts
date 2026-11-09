// Game actions — attack / craft / eat / restart. Plain functions over
// GameState (no hooks); the loop reads attackQueued, the UI calls these.

import {
  BERRY_HUNGER,
  RECIPES,
  WORLD_H,
  WORLD_W,
  ZOMBIE_MAX,
  type ItemId,
} from '@rust2d/shared';

import type { GameState, NodePool } from './state';

export function useGameActions(state: GameState) {
  const doAttack = () => {
    state.attackQueued.value = 1;
  };

  // Crafting reads its costs from @rust2d/shared RECIPES (single source
  // of truth). Behaviour is identical to v1: axe = 3 wood, pickaxe =
  // 3 wood + 3 stone, one of each.
  const tryCraft = (recipeId: 'axe' | 'pickaxe') => {
    const recipe = RECIPES[recipeId];
    const have: Record<ItemId, number> = {
      wood: state.wood.value,
      stone: state.stone.value,
      berry: state.berry.value,
      axe: state.hasAxe.value,
      pickaxe: state.hasPickaxe.value,
    };
    const owned = recipeId === 'axe' ? state.hasAxe.value === 1 : state.hasPickaxe.value === 1;
    if (owned) return;
    if (!recipe.inputs.every((i) => have[i.itemId] >= i.qty)) return;
    for (const i of recipe.inputs) {
      if (i.itemId === 'wood') state.wood.value -= i.qty;
      else if (i.itemId === 'stone') state.stone.value -= i.qty;
      else if (i.itemId === 'berry') state.berry.value -= i.qty;
    }
    if (recipe.output.itemId === 'axe') state.hasAxe.value = 1;
    else if (recipe.output.itemId === 'pickaxe') state.hasPickaxe.value = 1;
  };
  const craftAxe = () => tryCraft('axe');
  const craftPickaxe = () => tryCraft('pickaxe');

  const eatBerry = () => {
    if (state.berry.value >= 1 && state.hunger.value < 100) {
      state.berry.value -= 1;
      state.hunger.value = Math.min(100, state.hunger.value + BERRY_HUNGER);
    }
  };

  const restart = () => {
    state.playerX.value = WORLD_W / 2;
    state.playerY.value = WORLD_H / 2;
    state.clock.value = 0;
    state.timeT.value = 0;
    state.day.value = 1;
    state.nightOp.value = 0;
    state.spawnTimer.value = 0;
    state.hp.value = 100;
    state.hunger.value = 100;
    state.wood.value = 0;
    state.stone.value = 0;
    state.berry.value = 0;
    state.kills.value = 0;
    state.hasAxe.value = 0;
    state.hasPickaxe.value = 0;
    state.attackQueued.value = 0;
    for (let i = 0; i < state.nodes.length; i++) {
      const n: NodePool = state.nodes[i];
      n.hp.value = n.maxHp;
      n.vis.value = 1;
      n.respawnAt.value = 0;
    }
    for (let i = 0; i < ZOMBIE_MAX; i++) {
      state.zombies[i].active.value = 0;
      state.zombies[i].hp.value = 0;
    }
    state.gameOver.value = 0;
  };

  return { doAttack, craftAxe, craftPickaxe, eatBerry, restart };
}
