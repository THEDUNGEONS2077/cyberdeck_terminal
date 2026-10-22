#!/usr/bin/env python3
"""
scripts/make-bridge-icons.py: draws the bridge extension's icons
(bridge/icons/icon-{16,32,48,128}.png).

The same picture as public/icon.svg: an accent `>` prompt and block
cursor on black, in a dark HUD frame. Drawn 8x larger and scaled down,
for smooth edges. Run once after changing the design (needs Pillow):

    python3 -I scripts/make-bridge-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'bridge' / 'icons'
ACCENT = (57, 255, 20, 255)  # --accent
LINE = (18, 48, 26, 255)  # --line
BLACK = (0, 0, 0, 255)


def draw(size: int) -> Image.Image:
    """The icon at `size` px: drawn on a 32-unit grid at 8x, then scaled down."""
    s = size * 8
    u = s / 32  # one unit of the 32x32 SVG
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=3 * u, fill=BLACK)
    d.rounded_rectangle([1.5 * u, 1.5 * u, 30.5 * u, 30.5 * u], radius=2 * u, outline=LINE, width=max(1, round(u)))
    # The `>`: two strokes, 3 units wide, square ends.
    d.line([(7 * u, 10 * u), (13 * u, 16 * u), (7 * u, 22 * u)], fill=ACCENT, width=round(3 * u), joint='curve')
    # The block cursor.
    d.rectangle([16 * u, 19 * u, 25 * u, 23 * u], fill=ACCENT)
    return im.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        draw(size).save(OUT / f'icon-{size}.png')
        print(f'wrote bridge/icons/icon-{size}.png')
