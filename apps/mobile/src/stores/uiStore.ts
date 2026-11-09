// Zustand UI store — HUD state only. The game simulation lives in shared
// values (src/game/state.ts) and syncs here at 4 Hz; the canvas itself
// never re-renders from React. No simulation state belongs in this store.

import { create } from 'zustand';

export interface HudState {
  hp: number;
  hunger: number;
  wood: number;
  stone: number;
  berry: number;
  day: number;
  night: boolean;
  kills: number;
  hasAxe: boolean;
  hasPickaxe: boolean;
  gameOver: boolean;
}

export const useUiStore = create<HudState>()(() => ({
  hp: 100,
  hunger: 100,
  wood: 0,
  stone: 0,
  berry: 0,
  day: 1,
  night: false,
  kills: 0,
  hasAxe: false,
  hasPickaxe: false,
  gameOver: false,
}));
