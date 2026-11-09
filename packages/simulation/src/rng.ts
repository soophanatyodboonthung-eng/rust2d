// Deterministic RNG — pure functions, no I/O. The client (node layout)
// and the server (world gen) share these so both sides derive the same
// world from the same seed.

/** mulberry32 — small, fast, deterministic PRNG. Returns [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 2D integer hash — deterministic pseudo-random value in [0, 1) for a
 * grid point. The basis of value noise (no permutation tables needed).
 */
export function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 974634211)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

/**
 * Smooth value noise at tile coords (tx, ty). `cell` is the noise grid
 * size in tiles — larger cells give broader features. Returns [0, 1).
 */
export function valueNoise(tx: number, ty: number, cell: number, seed: number): number {
  const gx = tx / cell;
  const gy = ty / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  // Smoothstep interpolation (no linear artefacts at cell borders).
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const v00 = hash2(x0, y0, seed);
  const v10 = hash2(x0 + 1, y0, seed);
  const v01 = hash2(x0, y0 + 1, seed);
  const v11 = hash2(x0 + 1, y0 + 1, seed);
  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return a + (b - a) * sy;
}
