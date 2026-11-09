// Chunk helpers — the map is 256x256 tiles, split into 16x16-tile chunks
// (16 chunks per side, 256 chunks total). The client loads and renders
// chunks around the camera; the server sends state per AoI chunk.

import { CHUNKS_PER_SIDE, CHUNK_TILES, MAP_TILES, TILE_SIZE } from '@rust2d/shared';

export const TOTAL_CHUNKS = CHUNKS_PER_SIDE * CHUNKS_PER_SIDE;

/** Chunk coords (cx, cy) for a tile. */
export function chunkOfTile(tx: number, ty: number): { cx: number; cy: number } {
  return { cx: Math.floor(tx / CHUNK_TILES), cy: Math.floor(ty / CHUNK_TILES) };
}

/** Flat chunk index (row-major) for chunk coords. */
export function chunkIndex(cx: number, cy: number): number {
  return cy * CHUNKS_PER_SIDE + cx;
}

/** Tile bounds of a chunk, clamped to the map: [x0, y0, x1, y1). */
export function chunkTileBounds(
  cx: number,
  cy: number,
): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
} {
  return {
    x0: cx * CHUNK_TILES,
    y0: cy * CHUNK_TILES,
    x1: Math.min((cx + 1) * CHUNK_TILES, MAP_TILES),
    y1: Math.min((cy + 1) * CHUNK_TILES, MAP_TILES),
  };
}

/**
 * Chunks intersecting a world-space view rect (viewX/viewY = top-left
 * corner in px, viewW/viewH = size in px), clamped to the map.
 * The caller adds a margin (e.g. 1 chunk) for preloading.
 */
export function visibleChunks(
  viewX: number,
  viewY: number,
  viewW: number,
  viewH: number,
): { cx0: number; cy0: number; cx1: number; cy1: number } {
  const chunkPx = CHUNK_TILES * TILE_SIZE;
  return {
    cx0: Math.max(0, Math.floor(viewX / chunkPx)),
    cy0: Math.max(0, Math.floor(viewY / chunkPx)),
    cx1: Math.min(CHUNKS_PER_SIDE - 1, Math.floor((viewX + viewW - 1) / chunkPx)),
    cy1: Math.min(CHUNKS_PER_SIDE - 1, Math.floor((viewY + viewH - 1) / chunkPx)),
  };
}
