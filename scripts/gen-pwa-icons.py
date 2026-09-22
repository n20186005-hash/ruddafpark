"""Generate PWA icons from the existing apple-touch-icon.png brand mark.

The source is a 180x180 RGBA raster with a transparent background, so we
composite the mark onto the brand "night" background (#102b29) at the sizes
required by installable PWAs: 192, 512, and a 512 maskable variant with the
mark kept inside the safe zone.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "brand", "apple-touch-icon.png")
OUT_DIR = os.path.join(ROOT, "public", "icons")
BG = (16, 43, 41, 255)  # #102b29

os.makedirs(OUT_DIR, exist_ok=True)
mark = Image.open(SRC).convert("RGBA")


def render(size, mark_fraction):
    canvas = Image.new("RGBA", (size, size), BG)
    target = int(round(size * mark_fraction))
    logo = mark.resize((target, target), Image.LANCZOS)
    pos = ((size - target) // 2, (size - target) // 2)
    canvas.paste(logo, pos, logo)
    return canvas


render(192, 0.82).save(os.path.join(OUT_DIR, "icon-192.png"), "PNG")
render(512, 0.82).save(os.path.join(OUT_DIR, "icon-512.png"), "PNG")
# Maskable: keep the mark inside the 80% safe zone (use ~60% to be safe).
render(512, 0.60).save(os.path.join(OUT_DIR, "icon-maskable-512.png"), "PNG")

print("PWA icons written to", OUT_DIR)
