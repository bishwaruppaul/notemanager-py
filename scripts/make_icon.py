"""
Generate a flat material-style .ico file for NoteManagerPy.

Usage: python scripts/make_icon.py

Requires: Pillow (pip install Pillow)
"""

import os
from PIL import Image, ImageDraw


SIZES = [16, 32, 48, 64]
COLOR_PRIMARY = (79, 70, 229)      # #4f46e5
COLOR_PRIMARY_DARK = (55, 48, 163)  # #3730a3
COLOR_WHITE = (255, 255, 255)
COLOR_LINE = (199, 210, 254)       # #c7d2fe

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(ROOT_DIR, 'icon.ico')


def draw_note_icon(size):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Proportions based on 24x24 viewBox
    s = size / 24.0

    def px(v):
        return int(v * s + 0.5)

    # Rounded document body
    margin = px(2)
    body_w = px(20)
    body_h = px(22)
    body_x = margin
    body_y = px(1)
    r = px(3)

    # Draw filled rectangle with rounded corners
    draw.rounded_rectangle(
        [body_x, body_y, body_x + body_w, body_y + body_h],
        radius=r,
        fill=COLOR_PRIMARY
    )

    # Folded corner triangle
    corner_x1 = px(14)
    corner_y1 = px(1)
    corner_x2 = px(21)
    corner_y2 = px(8)
    corner_x3 = px(14)
    corner_y3 = px(8)
    draw.polygon([(corner_x1, corner_y1), (corner_x2, corner_y2), (corner_x3, corner_y3)],
                 fill=COLOR_PRIMARY_DARK)

    # Text lines
    lines = [
        (8, 8, px(1.6), COLOR_WHITE, 0.9),
        (12.5, 12.5, px(1.6), COLOR_WHITE, 0.9),
        (17, 17, px(1.5), COLOR_LINE, 0.65),
        (20.5, 20.5, px(1.4), COLOR_LINE, 0.45),
    ]
    line_start = px(6)
    line_end_long = px(18)  # for second line
    line_end_med = px(15)   # for third line
    line_end_short = px(14)  # for fourth line
    line_ends = [px(13), line_end_long, line_end_med, line_end_short]

    for i, (y_pos, _, width, color, _) in enumerate(lines):
        y = px(y_pos)
        end_x = line_ends[i]
        draw.line([(line_start, y), (end_x, y)],
                  fill=(*color, int(255 * 0.9)), width=max(1, width))

    return im


def main():
    images = []
    for size in SIZES:
        im = draw_note_icon(size)
        images.append(im)

    # ICO saves all sizes as frames
    images[0].save(
        OUTPUT_PATH,
        format='ICO',
        sizes=[(s, s) for s in SIZES],
        append_images=images[1:],
    )
    kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f'Icon created: {OUTPUT_PATH} ({kb:.1f} KB)')
    print(f'  Sizes: {", ".join(f"{s}x{s}" for s in SIZES)}')


if __name__ == '__main__':
    main()
