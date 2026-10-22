#!/usr/bin/env python3
"""Generate People favicon and Apple icon from the approved Keystone Bars geometry."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "brand"))
import plannorium_mark as mark  # noqa: E402

SS = 4                 # supersampling factor
COVERAGE = 0.52        # mark height as a share of the tile; fits the inscribed circle


def hex_rgba(h: str) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def tile(size: int) -> Image.Image:
    big = size * SS
    scale = big * COVERAGE / mark.HEIGHT
    ox = (big - mark.WIDTH * scale) / 2
    oy = (big - mark.HEIGHT * scale) / 2
    px = lambda v: v * scale  # noqa: E731

    # The P silhouette: the stem column plus the bowl (a rectangle up to the
    # centre line, then a half disc).
    clip = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(clip)
    d.rectangle([ox, oy, ox + px(mark.BARS[0][1]), oy + px(mark.HEIGHT)], fill=255)
    d.rectangle([ox, oy, ox + px(mark.BOWL_CX), oy + px(2 * mark.BOWL_R)], fill=255)
    cx, cy, r = ox + px(mark.BOWL_CX), oy + px(mark.BOWL_CY), px(mark.BOWL_R)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)

    image = Image.new("RGBA", (big, big), hex_rgba(mark.OBSIDIAN))
    for x, w, h, part in mark.BARS:
        bar = Image.new("L", (big, big), 0)
        ImageDraw.Draw(bar).rounded_rectangle(
            [ox + px(x), oy, ox + px(x + w), oy + px(h)], radius=px(mark.RADIUS), fill=255
        )
        colour = mark.EMERALD if part == "key" else mark.LIMESTONE
        image.paste(Image.new("RGBA", (big, big), hex_rgba(colour)), (0, 0), ImageChops.multiply(bar, clip))
    return image.resize((size, size), Image.LANCZOS).convert("RGB")


def main() -> None:
    public = ROOT / "public"
    tile(512).save(public / "favicon-people.png", optimize=True)
    share = Image.new("RGB", (1200, 630), mark.OBSIDIAN)
    draw = ImageDraw.Draw(share)
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 108)
    sub = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 34)
    # Crop the icon's empty margins; the mark replaces the P in the name.
    share.paste(tile(160).crop((51, 38, 110, 122)), (100, 243))
    draw.text((166, 240), "lannorium", font=font, fill=mark.LIMESTONE, anchor="lt")
    end = 166 + draw.textlength("lannorium", font=font)
    draw.text((end + 25, 240), "People", font=font, fill="#9CA3AF", anchor="lt")
    draw.text((100, 365), "Staff directory & safety portal", font=sub, fill="#9CA3AF", anchor="lt")
    draw.rounded_rectangle((100, 190, 145, 196), radius=3, fill=mark.EMERALD)
    share.save(public / "favicon-people-og.png", optimize=True)
    tile(180).save(public / "favicon-apple.png", optimize=True)
    tile(256).save(public / "favicon.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

if __name__ == "__main__":
    main()
