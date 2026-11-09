// Game canvas — the Skia world view. The camera Group transform is a
// shared value (per-frame, no React re-render); the visible node list and
// chunk set update at most 4 Hz from the camera position. Terrain draws
// from cached chunk surfaces (TerrainView); the flat green rect underneath
// is the fallback before the atlas / chunks load.

import { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';

import { WORLD_H, WORLD_W } from '@rust2d/shared';

import type { GameState, NodePool } from '../state';
import { useAtlas } from './atlas';
import { NodeView } from './NodeView';
import { PlayerView } from './PlayerView';
import { TerrainView, type ViewRect } from './TerrainView';
import { ZombieView } from './ZombieView';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NODE_CULL_MARGIN = 48;

export interface TouchHandlers {
  onTouchStart: (e: GestureResponderEvent) => void;
  onTouchMove: (e: GestureResponderEvent) => void;
  onTouchEnd: (e: GestureResponderEvent) => void;
}

export function GameCanvas({ state, touch }: { state: GameState; touch: TouchHandlers }) {
  const atlas = useAtlas();
  const [viewRect, setViewRect] = useState<ViewRect>({ x: 0, y: 0, w: SCREEN_W, h: SCREEN_H });

  // View-rect sync at 4 Hz (same cadence as the HUD) — only set when the
  // camera actually moved, so the chunk set / culled list stay stable.
  useEffect(() => {
    const id = setInterval(() => {
      setViewRect((prev) => {
        const next = { x: -state.camTX.value, y: -state.camTY.value, w: SCREEN_W, h: SCREEN_H };
        if (prev.x === next.x && prev.y === next.y) return prev;
        return next;
      });
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  const camTransform = useDerivedValue(() => [
    { translateX: state.camTX.value },
    { translateY: state.camTY.value },
  ]);
  const joyTransform = useDerivedValue(() => [
    { translateX: state.joyKx.value },
    { translateY: state.joyKy.value },
  ]);

  // Culling: only nodes near the viewport are mounted. Node positions are
  // static, so this list changes only when the camera crosses the margin.
  const visibleNodes = useMemo<{ node: NodePool; index: number }[]>(() => {
    const m = NODE_CULL_MARGIN;
    return state.nodes
      .map((node, index) => ({ node, index }))
      .filter(
        ({ node: n }) =>
          n.x > viewRect.x - m &&
          n.x < viewRect.x + viewRect.w + m &&
          n.y > viewRect.y - m &&
          n.y < viewRect.y + viewRect.h + m,
      );
  }, [state.nodes, viewRect]);

  return (
    <Canvas
      style={styles.canvas}
      onTouchStart={touch.onTouchStart}
      onTouchMove={touch.onTouchMove}
      onTouchEnd={touch.onTouchEnd}
    >
      <Group transform={camTransform}>
        <Rect x={0} y={0} width={WORLD_W} height={WORLD_H} color="#3f7a34" />
        {atlas && <TerrainView world={state.world} atlas={atlas} viewRect={viewRect} />}
        {visibleNodes.map(({ node, index }) => (
          <NodeView key={`n${index}`} node={node} atlas={atlas} />
        ))}
        {state.zombies.map((z, i) => (
          <ZombieView key={`z${i}`} z={z} />
        ))}
        <PlayerView x={state.playerX} y={state.playerY} atlas={atlas} />
      </Group>
      <Rect
        x={0}
        y={0}
        width={SCREEN_W}
        height={SCREEN_H}
        color="#0b1530"
        opacity={state.nightOp}
      />
      <Circle
        cx={state.joyBaseX}
        cy={state.joyBaseY}
        r={55}
        color="rgba(255,255,255,0.15)"
        opacity={state.joyOp}
      />
      <Group transform={joyTransform} opacity={state.joyOp}>
        <Circle cx={0} cy={0} r={24} color="rgba(255,255,255,0.4)" />
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
});
