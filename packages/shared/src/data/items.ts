// Item definitions — data-driven. Moved verbatim from the v1 prototype
// (App.tsx), where items were implicit counters (wood/stone/berry) and
// boolean flags (hasAxe/hasPickaxe). No behaviour lives here: stack limits
// and durability are defined for the future inventory system (Phase 3)
// and are NOT enforced by the v1 client.

export type ItemId = 'wood' | 'stone' | 'berry' | 'axe' | 'pickaxe';

export type ItemCategory = 'resource' | 'tool';

export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  stackMax: number;
  /** null = no durability (v1 tools do not wear out). */
  durability: number | null;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wood: { id: 'wood', name: 'Wood', category: 'resource', stackMax: 999, durability: null },
  stone: { id: 'stone', name: 'Stone', category: 'resource', stackMax: 999, durability: null },
  berry: { id: 'berry', name: 'Berry', category: 'resource', stackMax: 999, durability: null },
  axe: { id: 'axe', name: 'Axe', category: 'tool', stackMax: 1, durability: null },
  pickaxe: { id: 'pickaxe', name: 'Pickaxe', category: 'tool', stackMax: 1, durability: null },
};
