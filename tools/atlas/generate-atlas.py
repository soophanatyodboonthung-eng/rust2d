#!/usr/bin/env python3
"""Generate the Rust2D pixel-art atlas from tools/atlas/sprites.json.

Pure stdlib (no Pillow) so it runs identically on this VM and on the
GitHub Actions runner. Outputs (gitignored build artifacts):
  apps/mobile/assets/sprites/atlas.png  — RGBA atlas, one 32x32 frame
                                          per sprite, laid out in a grid
  apps/mobile/assets/sprites/atlas.json — frame rects keyed by sprite name

Source of truth is sprites.json: ground tiles are procedural (base colour
+ seeded speckles), entity sprites are hand-drawn 16x16 maps scaled 2x
(nearest-neighbour) so the pixel-art look survives.
"""

import json
import random
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent / "sprites.json"
OUT_DIR = ROOT / "apps" / "mobile" / "assets" / "sprites"
TILE = 32


def hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    h = hex_color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def write_png(path: Path, width: int, height: int, rows: list[bytearray]) -> None:
    """Write an RGBA PNG (colour type 6), one scanline per row."""

    def chunk(typ: bytes, data: bytes) -> bytes:
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    idat = zlib.compress(raw, 9)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def render_sprite(frame: dict) -> list[bytearray]:
    rows = frame["rows"]
    palette = frame["palette"]
    scale = frame.get("scale", 1)
    width = len(rows[0])
    for i, row in enumerate(rows):
        if len(row) != width:
            raise ValueError(f"{frame['name']}: row {i} has {len(row)} chars, expected {width}")
        for ch in row:
            if ch != "." and ch not in palette:
                raise ValueError(f"{frame['name']}: unknown palette char '{ch}'")
    out: list[bytearray] = []
    for row in rows:
        px_row = bytearray()
        for ch in row:
            colour = (0, 0, 0, 0) if ch == "." else hex_to_rgba(palette[ch])
            px_row.extend(colour * scale)
        for _ in range(scale):
            out.append(bytearray(px_row))
    return out


def render_ground(frame: dict) -> list[bytearray]:
    rng = random.Random(frame["seed"])
    base = hex_to_rgba(frame["base"])
    speckles = [hex_to_rgba(c) for c in frame["speckles"]]
    density = frame["density"]
    out: list[bytearray] = []
    for _ in range(TILE):
        row = bytearray()
        for _ in range(TILE):
            if rng.random() < density:
                row.extend(rng.choice(speckles))
            else:
                row.extend(base)
        out.append(row)
    return out


def render_water(frame: dict) -> list[bytearray]:
    rng = random.Random(frame["seed"])
    base = hex_to_rgba(frame["base"])
    dark = hex_to_rgba(frame["dark"])
    streak = hex_to_rgba(frame["streak"])
    out: list[bytearray] = []
    for _ in range(TILE):
        row = bytearray()
        for _ in range(TILE):
            row.extend(dark if rng.random() < 0.06 else base)
        out.append(row)
    # A few short horizontal light streaks (2 px tall) for a water shimmer.
    for _ in range(3):
        y = rng.randrange(3, TILE - 3)
        x = rng.randrange(0, TILE - 12)
        length = rng.randrange(6, 13)
        for dy in (0, 1):
            for dx in range(length):
                i = (x + dx) * 4
                out[y + dy][i : i + 4] = bytes(streak)
    return out


def main() -> int:
    spec = json.loads(SRC.read_text())
    columns = spec["columns"]
    frames = spec["frames"]
    rows_total = (len(frames) + columns - 1) // columns
    atlas_w = columns * TILE
    atlas_h = rows_total * TILE

    atlas: list[bytearray] = [bytearray(atlas_w * 4) for _ in range(atlas_h)]
    manifest: dict[str, dict[str, int]] = {}

    for idx, frame in enumerate(frames):
        kind = frame["kind"]
        if kind == "sprite":
            pixels = render_sprite(frame)
        elif kind == "ground":
            pixels = render_ground(frame)
        elif kind == "water":
            pixels = render_water(frame)
        else:
            raise ValueError(f"unknown frame kind '{kind}' for {frame['name']}")
        if len(pixels) != TILE or len(pixels[0]) != TILE * 4:
            raise ValueError(f"{frame['name']}: rendered {len(pixels)}x{len(pixels[0]) // 4}, expected {TILE}x{TILE}")
        col = idx % columns
        row = idx // columns
        ox, oy = col * TILE, row * TILE
        for y in range(TILE):
            dst = atlas[oy + y]
            dst[ox * 4 : (ox + TILE) * 4] = pixels[y]
        manifest[frame["name"]] = {"x": ox, "y": oy, "w": TILE, "h": TILE}

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_png(OUT_DIR / "atlas.png", atlas_w, atlas_h, atlas)
    (OUT_DIR / "atlas.json").write_text(
        json.dumps({"tile": TILE, "frames": manifest}, indent=2) + "\n"
    )
    print(f"atlas: {atlas_w}x{atlas_h}, {len(frames)} frames -> {OUT_DIR / 'atlas.png'}")
    for name, rect in manifest.items():
        print(f"  {name}: {rect}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
