import { describe, expect, it } from 'vitest';

import { CHUNKS_PER_SIDE, MAP_TILES, TILE_SIZE } from '@rust2d/shared';

import {
  TOTAL_CHUNKS,
  chunkIndex,
  chunkOfTile,
  chunkTileBounds,
  visibleChunks,
} from '../src/world/chunks';

describe('chunks', () => {
  it('256 chunks total (16x16)', () => {
    expect(TOTAL_CHUNKS).toBe(256);
    expect(CHUNKS_PER_SIDE).toBe(16);
  });

  it('chunkOfTile maps tiles to chunks', () => {
    expect(chunkOfTile(0, 0)).toEqual({ cx: 0, cy: 0 });
    expect(chunkOfTile(15, 15)).toEqual({ cx: 0, cy: 0 });
    expect(chunkOfTile(16, 0)).toEqual({ cx: 1, cy: 0 });
    expect(chunkOfTile(MAP_TILES - 1, MAP_TILES - 1)).toEqual({ cx: 15, cy: 15 });
  });

  it('chunkIndex is row-major', () => {
    expect(chunkIndex(0, 0)).toBe(0);
    expect(chunkIndex(1, 0)).toBe(1);
    expect(chunkIndex(0, 1)).toBe(16);
    expect(chunkIndex(15, 15)).toBe(255);
  });

  it('chunkTileBounds clamps to the map', () => {
    expect(chunkTileBounds(0, 0)).toEqual({ x0: 0, y0: 0, x1: 16, y1: 16 });
    expect(chunkTileBounds(15, 15)).toEqual({ x0: 240, y0: 240, x1: 256, y1: 256 });
  });

  it('visibleChunks covers the view rect, clamped to the map', () => {
    expect(visibleChunks(0, 0, 800, 600)).toEqual({ cx0: 0, cy0: 0, cx1: 1, cy1: 1 });
    const far = visibleChunks(MAP_TILES * TILE_SIZE - 100, MAP_TILES * TILE_SIZE - 100, 800, 600);
    expect(far.cx1).toBe(15);
    expect(far.cy1).toBe(15);
  });
});
