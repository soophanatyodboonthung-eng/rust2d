// Resource node — drawn from the pixel-art atlas (1:1, 32x32). The
// Group opacity is the node's visibility shared value (0 = gathered,
// 1 = alive), so gather/respawn never re-renders React.
//
// Fallback: if the atlas failed to load, the v1 vector shapes are drawn
// instead, so the map is never empty — a missing atlas must not hide
// every node in the world.

import { Circle, Group, Image, Rect } from '@shopify/react-native-skia';

import type { NodePool } from '../state';
import type { AtlasImages } from './atlas';

const SPRITE_BY_KIND = { tree: 'tree', rock: 'rock', bush: 'bush' } as const;

export function NodeView({ node, atlas }: { node: NodePool; atlas: AtlasImages | null }) {
  const sprite = atlas?.[SPRITE_BY_KIND[node.kind]];
  if (sprite) {
    return (
      <Group opacity={node.vis}>
        <Image image={sprite} x={node.x - 16} y={node.y - 16} width={32} height={32} />
      </Group>
    );
  }

  if (node.kind === 'tree') {
    return (
      <Group opacity={node.vis}>
        <Rect x={node.x - 6} y={node.y} width={12} height={28} color="#7c4a21" />
        <Circle cx={node.x} cy={node.y - 8} r={26} color="#2f9e44" />
        <Circle cx={node.x - 11} cy={node.y + 2} r={14} color="#37b24d" />
      </Group>
    );
  }
  if (node.kind === 'rock') {
    return (
      <Group opacity={node.vis}>
        <Circle cx={node.x} cy={node.y} r={26} color="#868e96" />
        <Circle cx={node.x - 8} cy={node.y - 8} r={10} color="#adb5bd" />
      </Group>
    );
  }
  return (
    <Group opacity={node.vis}>
      <Circle cx={node.x} cy={node.y} r={22} color="#2b8a3e" />
      <Circle cx={node.x - 8} cy={node.y - 6} r={4} color="#e03131" />
      <Circle cx={node.x + 8} cy={node.y - 4} r={4} color="#e03131" />
      <Circle cx={node.x} cy={node.y + 8} r={4} color="#e03131" />
    </Group>
  );
}
