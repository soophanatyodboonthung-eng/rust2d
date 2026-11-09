// Rust2D Online — Phase 1. Top-down 2D survival (Expo + Skia native).
// App is the composition root only: game state + loop + input live in
// src/game, rendering in src/game/render, UI in src/game/ui, HUD state
// in the Zustand store. The canvas never re-renders from React; HUD and
// chunk sets sync at 4 Hz.

import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { DAY_LEN } from '@rust2d/shared';

import { useGameActions } from './src/game/actions';
import { useJoystick } from './src/game/input/useJoystick';
import { GameCanvas } from './src/game/render/GameCanvas';
import { useGameState } from './src/game/state';
import { CraftPanel } from './src/game/ui/CraftPanel';
import { GameOverOverlay } from './src/game/ui/GameOverOverlay';
import { Hud } from './src/game/ui/Hud';
import { useGameLoop } from './src/game/useGameLoop';
import { useUiStore } from './src/stores/uiStore';

export default function App() {
  const state = useGameState();
  useGameLoop(state);
  const touch = useJoystick(state);
  const actions = useGameActions(state);

  // HUD sync at 4 Hz (cheap; the canvas itself never re-renders from React)
  useEffect(() => {
    const id = setInterval(() => {
      useUiStore.setState({
        hp: Math.ceil(state.hp.value),
        hunger: Math.ceil(state.hunger.value),
        wood: state.wood.value,
        stone: state.stone.value,
        berry: state.berry.value,
        day: state.day.value,
        night: state.timeT.value >= DAY_LEN,
        kills: state.kills.value,
        hasAxe: state.hasAxe.value === 1,
        hasPickaxe: state.hasPickaxe.value === 1,
        gameOver: state.gameOver.value === 1,
      });
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  return (
    <View style={styles.container}>
      <GameCanvas state={state} touch={touch} />
      <Hud />
      <CraftPanel
        onCraftAxe={actions.craftAxe}
        onCraftPickaxe={actions.craftPickaxe}
        onEatBerry={actions.eatBerry}
      />
      <TouchableOpacity style={styles.attackBtn} onPress={actions.doAttack} activeOpacity={0.7}>
        <Text style={styles.attackText}>⚔️</Text>
      </TouchableOpacity>
      <Text style={styles.hint} pointerEvents="none">
        ลากนิ้วซ้ายเพื่อเดิน • ปุ่ม ⚔️ เก็บของ / โจมตี
      </Text>
      <GameOverOverlay onRestart={actions.restart} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  attackBtn: {
    position: 'absolute',
    right: 22,
    bottom: 44,
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attackText: { fontSize: 32 },
  hint: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
});
