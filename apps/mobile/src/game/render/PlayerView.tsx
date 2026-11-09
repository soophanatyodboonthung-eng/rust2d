// Player — the pixel-art sprite (1:1, 32x32), centred on the player
// position. The transform is one derived shared value, so movement never
// re-renders React.
//
// Fallback: if the atlas failed to load, the v1 vector player is drawn
// instead, so the player is never invisible.

import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { Circle, Group, Image } from '@shopify/react-native-skia';

import type { AtlasImages } from './atlas';

export function PlayerView({
  x,
  y,
  atlas,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  atlas: AtlasImages | null;
}) {
  const t = useDerivedValue(() => [{ translateX: x.value - 16 }, { translateY: y.value - 16 }]);
  const sprite = atlas?.player;
  return (
    <Group transform={t}>
      {sprite ? (
        <Image image={sprite} x={0} y={0} width={32} height={32} />
      ) : (
        <>
          <Circle cx={0} cy={0} r={21} color="#ffffff" opacity={0.85} />
          <Circle cx={0} cy={0} r={18} color="#3b82f6" />
          <Circle cx={0} cy={-6} r={3} color="#dbeafe" />
          <Circle cx={-6} cy={4} r={3} color="#1e3a8a" />
          <Circle cx={6} cy={4} r={3} color="#1e3a8a" />
        </>
      )}
    </Group>
  );
}
