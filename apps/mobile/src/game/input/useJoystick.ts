// Virtual joystick — left half of the screen, dynamic origin. Touch
// handling writes directly to the joystick shared values in GameState;
// the game loop reads them every frame. No React state in the hot path.

import { useRef } from 'react';
import { Dimensions, type GestureResponderEvent } from 'react-native';

import type { GameState } from '../state';

const { width: SCREEN_W } = Dimensions.get('window');
const JOY_RADIUS = 55;

export function useJoystick(state: GameState) {
  const joyTouchId = useRef<number | null>(null);

  const onTouchStart = (e: GestureResponderEvent) => {
    const { locationX, locationY, identifier } = e.nativeEvent;
    if (locationX < SCREEN_W * 0.5 && joyTouchId.current === null) {
      joyTouchId.current = identifier;
      state.joyBaseX.value = locationX;
      state.joyBaseY.value = locationY;
      state.joyKx.value = locationX;
      state.joyKy.value = locationY;
      state.joyDx.value = 0;
      state.joyDy.value = 0;
      state.joyOp.value = 1;
    }
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    const { locationX, locationY, identifier } = e.nativeEvent;
    if (joyTouchId.current === null || identifier !== joyTouchId.current) return;
    let dx = locationX - state.joyBaseX.value;
    let dy = locationY - state.joyBaseY.value;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS;
      dy = (dy / len) * JOY_RADIUS;
    }
    state.joyDx.value = dx / JOY_RADIUS;
    state.joyDy.value = dy / JOY_RADIUS;
    state.joyKx.value = state.joyBaseX.value + dx;
    state.joyKy.value = state.joyBaseY.value + dy;
  };

  const onTouchEnd = (e: GestureResponderEvent) => {
    if (joyTouchId.current === null || e.nativeEvent.identifier !== joyTouchId.current) return;
    joyTouchId.current = null;
    state.joyOp.value = 0;
    state.joyDx.value = 0;
    state.joyDy.value = 0;
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
