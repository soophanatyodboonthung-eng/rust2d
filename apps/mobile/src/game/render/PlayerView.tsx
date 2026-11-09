// Player — the pixel-art sprite (1:1, 32x32), centred on the player
// position. The transform is one derived shared value, so movement never
// re-renders React.

import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { Group, Image } from '@shopify/react-native-skia';

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
  if (!sprite) return null;
  return (
    <Group transform={t}>
      <Image image={sprite} x={0} y={0} width={32} height={32} />
    </Group>
  );
}
