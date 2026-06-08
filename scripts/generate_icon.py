"""Generate icon.ico and favicon.ico — flat note icon using Pillow."""
from PIL import Image, ImageDraw

C1 = (79, 70, 229)  # #4f46e5
C2 = (99, 102, 241)  # #6366f1
FOLD = (55, 48, 163)  # #3730a3
WHITE = (255, 255, 255)
BASE = 256


def lerp(a, b, t):
    return int(a + (b - a) * t)


def draw_icon(img_size):
    s = lambda v: int(round(v * img_size / BASE))
    img = Image.new('RGBA', (img_size, img_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = s(3)

    # Draw gradient rounded rect manually by filling rows clipped to mask
    x0, y0, x1, y1 = s(2), s(1), s(22), s(23)
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0) if y1 != y0 else 0
        c = (lerp(C1[0], C2[0], t), lerp(C1[1], C2[1], t), lerp(C1[2], C2[2], t), 255)
        # Left/right padding for rounded corners
        dy_top = y - y0
        dy_bot = y1 - y - 1
        pad_left = max(0, r - max(dy_top, dy_bot)) if dy_top < r or dy_bot < r else 0
        pad_right = pad_left
        if dy_top < r:
            pad_left = r - int((r * r - (r - dy_top) * (r - dy_top)) ** 0.5)
            pad_right = pad_left
        if dy_bot < r:
            p = r - int((r * r - (r - dy_bot) * (r - dy_bot)) ** 0.5)
            pad_left = max(pad_left, p)
            pad_right = max(pad_right, p)
        d.line([x0 + pad_left, y, x1 - pad_right, y], fill=c, width=1)

    # Folded corner
    fold_pts = [(s(14), s(1)), (s(14), s(8)), (s(21), s(8))]
    d.polygon(fold_pts, fill=FOLD + (64,))

    # Text lines
    lw = max(1, s(1.6))
    d.line([s(6), s(8), s(13), s(8)], fill=WHITE + (230,), width=lw)
    d.line([s(6), s(12.5), s(18), s(12.5)], fill=WHITE + (230,), width=lw)
    d.line([s(6), s(17), s(15), s(17)], fill=WHITE + (153,), width=lw)
    d.line([s(6), s(20.5), s(14), s(20.5)], fill=WHITE + (102,), width=lw)

    return img


def main():
    sizes = [16, 24, 32, 48, 64, 128, 256]
    icon = draw_icon(BASE)
    icon.save(
        'icon.ico', format='ICO', sizes=[(s, s) for s in sizes],
        append_images=[draw_icon(s) for s in sizes],
    )
    print('icon.ico written')

    fav = draw_icon(32)
    fav.save(
        'src/static/favicon.ico', format='ICO',
        sizes=[(16, 16), (32, 32)],
        append_images=[draw_icon(16), draw_icon(32)],
    )
    print('src/static/favicon.ico written')


if __name__ == '__main__':
    main()
