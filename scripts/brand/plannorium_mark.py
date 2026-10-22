"""
The Plannorium mark ("Keystone Bars"), defined as geometry: the single source
for every Plannorium logo file in this repo.

A capital P whose silhouette is sliced into three rounded bars: the tall stem,
a middle bar (the keystone, emerald) and a right bar whose outer edge follows
the bowl. The mark is the P of the wordmark, so its height is the cap height.
Approved Oct 2026 (identity study, round 2, "P1").

Units: the mark is 70 wide and 100 tall (the cap height). y points down.
"""
from __future__ import annotations

WIDTH = 70.0
HEIGHT = 100.0
RADIUS = 4.0                    # corner radius of every bar

# The P silhouette's bowl: a half disc to the right of x = 38, from y 0 to 64.
BOWL_CX, BOWL_CY, BOWL_R = 38.0, 32.0, 32.0

# (x, width, height, part) for each bar, left to right.
BARS = (
    (0.0, 21.0, 100.0, "stem"),
    (26.0, 19.0, 64.0, "key"),
    (50.0, 20.0, 64.0, "bowl"),
)

OBSIDIAN = "#0B0B0C"
LIMESTONE = "#E9E5DC"
EMERALD = "#10B981"


def svg(ink: str = LIMESTONE, key: str = EMERALD, size: int | None = None) -> str:
    """The mark as a standalone SVG (transparent ground)."""
    dims = f' height="{size}" width="{round(size * WIDTH / HEIGHT, 2)}"' if size else ""
    rects = "".join(
        f'<rect x="{x:g}" y="0" width="{w:g}" height="{h:g}" rx="{RADIUS:g}" fill="{key if part == "key" else ink}"/>'
        for x, w, h, part in BARS
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH:g} {HEIGHT:g}"{dims}>'
        "<title>Plannorium</title>"
        '<defs><clipPath id="plannorium-p">'
        f'<path d="M0 0 H{BOWL_CX:g} A{BOWL_R:g} {BOWL_R:g} 0 0 1 {BOWL_CX:g} {2 * BOWL_R:g} H0 Z"/>'
        f'<rect x="0" y="0" width="{BARS[0][1]:g}" height="{HEIGHT:g}"/>'
        "</clipPath></defs>"
        f'<g clip-path="url(#plannorium-p)">{rects}</g></svg>\n'
    )
