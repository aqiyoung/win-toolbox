#!/usr/bin/env python3
"""Generate multi-resolution icons from SVG source"""

import cairosvg
from PIL import Image
import io
import os

SVG = os.path.join(os.path.dirname(__file__), 'logo.svg')
OUT_DIR = os.path.dirname(__file__)

# 1) macOS ICNS — not needed for Windows, skip

# 2) Windows ICO — embed all typical sizes
ico_sizes = [16, 24, 32, 48, 64, 96, 128, 256]
ico_imgs = []
for s in ico_sizes:
    png_data = cairosvg.svg2png(url=SVG, output_width=s, output_height=s)
    img = Image.open(io.BytesIO(png_data))
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    ico_imgs.append(img)

ico_path = os.path.join(OUT_DIR, 'icon.ico')
# Pillow ICO save: largest first
ico_imgs[-1].save(
    ico_path,
    format='ICO',
    sizes=[(img.width, img.height) for img in ico_imgs],
    append_images=ico_imgs[:-1],
)
print(f'  {ico_path} (multi-size ICO)')

# 3) PNG for Store / about dialog
for size in [256]:
    png_data = cairosvg.svg2png(url=SVG, output_width=size, output_height=size)
    png_path = os.path.join(OUT_DIR, f'logo-{size}.png')
    with open(png_path, 'wb') as f:
        f.write(png_data)
    print(f'  {png_path} ({size}x{size})')

print('Done.')
