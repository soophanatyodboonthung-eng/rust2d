// Terrain — the 256x256 tile map rendered as cached chunk surfaces.
// Each 16x16-tile chunk is drawn once to a 512x512 offscreen surface
// (from the atlas tiles) and blitted every frame; chunks outside the
// camera are never built, and the cache is capped (LRU, 16 chunks ≈ 16 MB).
// The visible chunk set changes only when the camera crosses a chunk
// boundary, so this never re-renders inside the frame loop.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Skia, type SkImage } from '@shopify/react-native-skia';

import { CHUNKS_PER_SIDE, CHUNK_TILES, TILE_SIZE } from '@rust2d/shared';
import {
  chunkIndex,
  chunkTileBounds,
  hash2,
  tileAt,
  visibleChunks,
  type World,
} from '@rust2d/simulation';

import type { AtlasImages } from './atlas';

const CHUNK_PX = CHUNK_TILES * TILE_SIZE; // 512
const MAX_CACHED_CHUNKS = 16;
const VIEW_MARGIN_CHUNKS = 1;

export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ChunkRender {
  key: number;
  cx: number;
  cy: number;
  image: SkImage;
}

function spriteForTile(world: World, tx: number, ty: number): string {
  const kind = tileAt(world.terrain, world.tiles, tx, ty);
  if (kind === 'forest') return 'forest';
  if (kind === 'rock') return 'rock_ground';
  if (kind === 'water') return 'water';
  // Deterministic grass variation so the ground does not look tiled.
  return hash2(tx, ty, 7) < 0.5 ? 'grass' : 'grass2';
}

export function TerrainView({
  world,
  atlas,
  viewRect,
}: {
  world: World;
  atlas: AtlasImages;
  viewRect: ViewRect;
}) {
  const [chunks, setChunks] = useState<ChunkRender[]>([]);
  const cacheRef = useRef(new Map<number, SkImage>());
  const lastKeysRef = useRef<string>('');

  const rect = useMemo(() => {
    const v = visibleChunks(viewRect.x, viewRect.y, viewRect.w, viewRect.h);
    return {
      cx0: Math.max(0, v.cx0 - VIEW_MARGIN_CHUNKS),
      cy0: Math.max(0, v.cy0 - VIEW_MARGIN_CHUNKS),
      cx1: Math.min(CHUNKS_PER_SIDE - 1, v.cx1 + VIEW_MARGIN_CHUNKS),
      cy1: Math.min(CHUNKS_PER_SIDE - 1, v.cy1 + VIEW_MARGIN_CHUNKS),
    };
  }, [viewRect]);

  useEffect(() => {
    const cache = cacheRef.current;
    const wanted: number[] = [];
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        wanted.push(chunkIndex(cx, cy));
      }
    }

    // Build any chunk surface that is not cached yet.
    const paint = Skia.Paint();
    for (const key of wanted) {
      if (cache.has(key)) continue;
      const cx = key % CHUNKS_PER_SIDE;
      const cy = Math.floor(key / CHUNKS_PER_SIDE);
      const surface = Skia.Surface.MakeOffscreen(CHUNK_PX, CHUNK_PX);
      if (!surface) continue;
      const canvas = surface.getCanvas();
      const b = chunkTileBounds(cx, cy);
      for (let ty = b.y0; ty < b.y1; ty++) {
        for (let tx = b.x0; tx < b.x1; tx++) {
          const sprite = atlas[spriteForTile(world, tx, ty)];
          if (!sprite) continue;
          canvas.drawImageRect(
            sprite,
            Skia.XYWHRect(0, 0, TILE_SIZE, TILE_SIZE),
            Skia.XYWHRect(
              (tx - b.x0) * TILE_SIZE,
              (ty - b.y0) * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE,
            ),
            paint,
          );
        }
      }
      const img = surface.makeImageSnapshot();
      surface.dispose();
      if (img) cache.set(key, img);
    }

    // Evict the farthest chunks when the cache is over the cap.
    if (cache.size > MAX_CACHED_CHUNKS) {
      const ccx = (rect.cx0 + rect.cx1) / 2;
      const ccy = (rect.cy0 + rect.cy1) / 2;
      const entries = [...cache.entries()]
        .map(([key, img]) => {
          const cx = key % CHUNKS_PER_SIDE;
          const cy = Math.floor(key / CHUNKS_PER_SIDE);
          return { key, img, d: (cx - ccx) ** 2 + (cy - ccy) ** 2 };
        })
        .sort((a, b) => b.d - a.d);
      for (const e of entries.slice(MAX_CACHED_CHUNKS)) {
        e.img.dispose();
        cache.delete(e.key);
      }
    }

    const keys = wanted.filter((k) => cache.has(k));
    const keysStr = keys.join(',');
    if (keysStr !== lastKeysRef.current) {
      lastKeysRef.current = keysStr;
      setChunks(
        keys.map((key) => ({
          key,
          cx: key % CHUNKS_PER_SIDE,
          cy: Math.floor(key / CHUNKS_PER_SIDE),
          image: cache.get(key)!,
        })),
      );
    }
  }, [rect, world, atlas]);

  return (
    <>
      {chunks.map((c) => (
        <Image
          key={c.key}
          image={c.image}
          x={c.cx * CHUNK_PX}
          y={c.cy * CHUNK_PX}
          width={CHUNK_PX}
          height={CHUNK_PX}
        />
      ))}
    </>
  );
}
