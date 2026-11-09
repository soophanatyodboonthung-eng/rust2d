// Zombie — still vector-drawn (no zombie sprite in the atlas yet; the
// Phase 1 atlas covers player/tree/rock/bush/ground). Skia transform
// entries are plain numbers, so the whole transform array is driven by
// one derived shared value (the documented Skia pattern).

import { useDerivedValue } from 'react-native-reanimated';
import { Circle, Group } from '@shopify/react-native-skia';

import type { ZombiePool } from '../state';

export function ZombieView({ z }: { z: ZombiePool }) {
  const t = useDerivedValue(() => [{ translateX: z.x.value }, { translateY: z.y.value }]);
  return (
    <Group transform={t} opacity={z.active}>
      <Circle cx={0} cy={0} r={20} color="#5c7c3a" />
      <Circle cx={-7} cy={-5} r={3.5} color="#ff0000" />
      <Circle cx={7} cy={-5} r={3.5} color="#ff0000" />
      <Circle cx={0} cy={9} r={5} color="#3a4d22" />
    </Group>
  );
}
