// Crafting recipes — data-driven. Values are verbatim from the v1
// prototype (axe = 3 wood, pickaxe = 3 wood + 3 stone). The server will
// validate these in Phase 4; the v1 client reads them for its craft
// buttons. `station: null` means hand-craftable.

import type { ItemId } from './items';

export interface RecipeInput {
  itemId: ItemId;
  qty: number;
}

export interface Recipe {
  id: string;
  output: { itemId: ItemId; qty: number };
  inputs: RecipeInput[];
  /** Crafting station required, null = hand-craftable. */
  station: string | null;
}

export const RECIPES: Record<string, Recipe> = {
  axe: {
    id: 'axe',
    output: { itemId: 'axe', qty: 1 },
    inputs: [{ itemId: 'wood', qty: 3 }],
    station: null,
  },
  pickaxe: {
    id: 'pickaxe',
    output: { itemId: 'pickaxe', qty: 1 },
    inputs: [
      { itemId: 'wood', qty: 3 },
      { itemId: 'stone', qty: 3 },
    ],
    station: null,
  },
};
