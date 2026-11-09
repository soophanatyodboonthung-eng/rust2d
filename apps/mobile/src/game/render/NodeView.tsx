// Resource node — drawn from the pixel-art atlas (1:1, 32x32). The
// Group opacity is the node's visibility shared value (0 = gathered,
// 1 = alive), so gather/respawn never re-renders React.

import { Group, Image } from '@shopify/react-native-skia';

import type { NodePool } from '../state';
import type { AtlasImages } from './atlas';

const SPRITE_BY_KIND = { tree: 'tree', rock: 'rock', bush: 'bush' } as const;

export function NodeView({ node, atlas }: { node: NodePool; atlas: AtlasImages | null }) {
  const sprite = atlas?.[SPRITE_BY_KIND[node.kind]];
  if (!sprite) return null;
  return (
    <Group opacity={node.vis}>
      <Image image={sprite} x={node.x - 16} y={node.y - 16} width={32} height={32} />
    </Group>
  );
}
