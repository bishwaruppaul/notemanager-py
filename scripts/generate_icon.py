"""Generate icon.ico and favicon.ico — bold note icon using Pillow."""
from PIL import Image, ImageDraw

BG = (79, 70, 229)  # #4f46e5
WHITE = (255, 255, 255)
BASE = 24


def draw_icon(img_size):
    s = lambda v: int(round(v * img_size / BASE))
    img = Image.new('RGBA', (img_size, img_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Background rounded rect
    r = s(3)
    x0, y0, x1, y1 = s(2), s(1), s(22), s(23)
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=BG + (255,))

    # Folded corner (white triangle)
    fold_pts = [(s(14), s(1)), (s(14), s(8)), (s(21), s(8))]
    d.polygon(fold_pts, fill=WHITE + (200,))

    # Text lines — thick white on solid bg
    lw = max(1, round(s(2)))
    d.line([s(6), s(9), s(13), s(9)], fill=WHITE, width=lw)
    d.line([s(6), s(13), s(18), s(13)], fill=WHITE, width=lw)
    d.line([s(6), s(17), s(15), s(17)], fill=WHITE + (200,), width=lw)
    d.line([s(6), s(20.5), s(14), s(20.5)], fill=WHITE + (160,), width=lw)

    return img


def main():
    sizes = [16, 24, 32, 48, 64, 128, 256]
    icon = draw_icon(256)
    icon.save(
        'icon.ico', format='ICO', sizes=[(s, s) for s in sizes],
    )
    print('icon.ico written')

    fav = draw_icon(32)
    fav.save(
        'src/static/favicon.ico', format='ICO',
        sizes=[(16, 16), (32, 32)],
    )
    print('src/static/favicon.ico written')


if __name__ == '__main__':
    main()
