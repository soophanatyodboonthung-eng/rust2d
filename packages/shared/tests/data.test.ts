import { describe, expect, it } from 'vitest';

import { ITEMS, type ItemId } from '../src/data/items';
import { RECIPES } from '../src/data/recipes';
import {
  DAY_LEN,
  NIGHT_LEN,
  NODE_COUNTS,
  NODE_HP,
  NODE_YIELD,
  WORLD_H,
  WORLD_W,
} from '../src/data/world';
import { WorldState } from '../src/state';

describe('items', () => {
  it('every item has a positive stack limit', () => {
    for (const item of Object.values(ITEMS)) {
      expect(item.stackMax).toBeGreaterThanOrEqual(1);
    }
  });

  it('tools are single-stack, resources stack', () => {
    expect(ITEMS.axe.stackMax).toBe(1);
    expect(ITEMS.pickaxe.stackMax).toBe(1);
    expect(ITEMS.wood.stackMax).toBeGreaterThan(1);
  });
});

describe('recipes', () => {
  it('every recipe input and output references a known item', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(ITEMS[recipe.output.itemId]).toBeDefined();
      expect(recipe.output.qty).toBeGreaterThan(0);
      for (const input of recipe.inputs) {
        expect(ITEMS[input.itemId]).toBeDefined();
        expect(input.qty).toBeGreaterThan(0);
      }
    }
  });

  it('v1 recipes match the prototype costs', () => {
    expect(RECIPES.axe.inputs).toEqual([{ itemId: 'wood', qty: 3 }]);
    expect(RECIPES.pickaxe.inputs).toEqual([
      { itemId: 'wood', qty: 3 },
      { itemId: 'stone', qty: 3 },
    ]);
  });
});

describe('world constants', () => {
  it('world dimensions are positive', () => {
    expect(WORLD_W).toBeGreaterThan(0);
    expect(WORLD_H).toBeGreaterThan(0);
  });

  it('day + night cycle is 90 seconds', () => {
    expect(DAY_LEN + NIGHT_LEN).toBe(90);
  });

  it('node counts, hp and yields cover every node kind', () => {
    const kinds = Object.keys(NODE_COUNTS) as (keyof typeof NODE_COUNTS)[];
    expect(kinds).toHaveLength(3);
    for (const kind of kinds) {
      expect(NODE_HP[kind]).toBeGreaterThan(0);
      expect(ITEMS[NODE_YIELD[kind] as ItemId]).toBeDefined();
    }
    const total = Object.values(NODE_COUNTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(520); // 220 trees + 170 rocks + 130 bushes (Phase 1 density)
  });
});

describe('WorldState', () => {
  it('starts at tick 0', () => {
    const state = new WorldState();
    expect(state.tick).toBe(0);
  });
});
