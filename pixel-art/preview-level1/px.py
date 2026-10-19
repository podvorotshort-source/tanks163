"""Мини-библиотека для превью: спрайты и сцена на numpy, всё в родных пикселях."""
import numpy as np
from PIL import Image, ImageDraw


def hx(c, a=255):
    if isinstance(c, tuple):
        return c if len(c) == 4 else (*c, a)
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


# ---------------------------------------------------------------- маски

def grid(w, h):
    y, x = np.mgrid[0:h, 0:w]
    return x, y


def m_rect(w, h, x0, y0, x1, y1):
    m = np.zeros((h, w), bool)
    m[max(0, y0):max(0, y1 + 1), max(0, x0):max(0, x1 + 1)] = True
    return m


def m_disc(w, h, cx, cy, r, k=0.6):
    """Круг без «прыщей»: (x-cx)²+(y-cy)² <= r²+k·r."""
    x, y = grid(w, h)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + k * r


def m_ell(w, h, cx, cy, rx, ry):
    x, y = grid(w, h)
    return ((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1.0


def m_poly(w, h, pts):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).polygon([(round(a), round(b)) for a, b in pts], fill=255)
    return np.array(im) > 0


def m_line(w, h, pts, width=1):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).line([(round(a), round(b)) for a, b in pts], fill=255, width=width)
    return np.array(im) > 0


def shift(m, dx, dy):
    o = np.zeros_like(m)
    h, w = m.shape
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    o[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = m[ys0:ys1, xs0:xs1]
    return o


def dilate(m, diag=False):
    o = m.copy()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (1, -1), (-1, 1), (-1, -1)) if diag else ()):
        o |= shift(m, dx, dy)
    return o


def erode(m):
    return ~dilate(~m)


def edge_in(m):
    """Пиксели маски, у которых есть сосед вне маски (внутренний контур)."""
    return m & ~erode(m)


BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def bayer(w, h):
    return np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w]


def checker(w, h, ph=0):
    x, y = grid(w, h)
    return ((x + y + ph) & 1) == 0


# ---------------------------------------------------------------- спрайт

class Spr:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)

    @property
    def alpha(self):
        return self.a[..., 3] > 0

    def paint(self, m, c, clip=False, only=None):
        m = m.copy()
        if clip:
            m &= self.alpha
        if only is not None:
            oc = np.array(hx(only)[:3])
            m &= np.all(self.a[..., :3] == oc, axis=-1) & self.alpha
        self.a[m] = hx(c)
        return self

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = hx(c)

    def pxs(self, pts, c):
        for x, y in pts:
            self.px(x, y, c)

    def erase(self, m):
        self.a[m] = 0

    # фигуры
    def rect(self, x0, y0, x1, y1, c, **k):
        return self.paint(m_rect(self.w, self.h, x0, y0, x1, y1), c, **k)

    def disc(self, cx, cy, r, c, **k):
        return self.paint(m_disc(self.w, self.h, cx, cy, r), c, **k)

    def ell(self, cx, cy, rx, ry, c, **k):
        return self.paint(m_ell(self.w, self.h, cx, cy, rx, ry), c, **k)

    def poly(self, pts, c, **k):
        return self.paint(m_poly(self.w, self.h, pts), c, **k)

    def line(self, pts, c, width=1, **k):
        return self.paint(m_line(self.w, self.h, pts, width), c, **k)

    def outline(self, c, diag=False):
        m = self.alpha
        self.a[dilate(m, diag) & ~m] = hx(c)
        return self

    def copy(self):
        s = Spr(self.w, self.h)
        s.a = self.a.copy()
        return s

    def flip_x(self):
        s = self.copy(); s.a = s.a[:, ::-1].copy(); return s

    def rot90(self, k=1):
        s = Spr(self.h if k % 2 else self.w, self.w if k % 2 else self.h)
        s.a = np.rot90(self.a, k).copy()
        return s

    def recolor(self, mapping):
        s = self.copy()
        for old, new in mapping.items():
            oc = np.array(hx(old)[:3])
            m = np.all(self.a[..., :3] == oc, axis=-1) & self.alpha
            s.a[m] = hx(new)
        return s

    def save(self, path, scale=1):
        im = Image.fromarray(self.a, 'RGBA')
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        im.save(path)


# ---------------------------------------------------------------- сцена

class Scene:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), np.float32)
        self.shadow = np.zeros((h, w), bool)

    def fill(self, m, c, alpha=1.0):
        col = np.array(hx(c)[:3], np.float32)
        self.rgb[m] = self.rgb[m] * (1 - alpha) + col * alpha

    def blit(self, s, x, y, alpha=1.0, shadow=None):
        """Спрайт левым верхним углом в (x, y). shadow=(dx,dy) — добавить тень в общую маску."""
        x, y = int(round(x)), int(round(y))
        h, w = s.h, s.w
        X0, Y0 = max(0, x), max(0, y)
        X1, Y1 = min(self.w, x + w), min(self.h, y + h)
        if X0 >= X1 or Y0 >= Y1:
            return
        sub = s.a[Y0 - y:Y1 - y, X0 - x:X1 - x]
        if shadow is not None:
            dx, dy = shadow
            ms = np.zeros((self.h, self.w), bool)
            ms[Y0:Y1, X0:X1] = sub[..., 3] > 0
            self.shadow |= shift(ms, dx, dy)
            return
        a = (sub[..., 3:4].astype(np.float32) / 255.0) * alpha
        dst = self.rgb[Y0:Y1, X0:X1]
        self.rgb[Y0:Y1, X0:X1] = dst * (1 - a) + sub[..., :3].astype(np.float32) * a

    def blit_c(self, s, cx, cy, **k):
        self.blit(s, cx - s.w // 2, cy - s.h // 2, **k)

    def apply_shadow(self, tint=(0.52, 0.55, 0.72)):
        self.rgb[self.shadow] *= np.array(tint, np.float32)
        self.shadow[:] = False

    def add_light(self, lights, levels=5):
        """Свечение полосами (квантованное) — остаётся в пиксельной сетке."""
        x, y = grid(self.w, self.h)
        acc = np.zeros((self.h, self.w, 3), np.float32)
        for (cx, cy, r, c, k) in lights:
            d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
            i = np.clip(1 - d, 0, 1) ** 1.6
            i = np.floor(i * levels) / levels
            acc += i[..., None] * np.array(hx(c)[:3], np.float32)[None, None] * k
        acc = np.clip(acc, 0, 255)
        # «экран»: светлое не пересвечивается, тёмное подсвечивается цветом источника
        self.rgb = 255 - (255 - self.rgb) * (1 - acc / 255)

    def image(self):
        return Image.fromarray(np.clip(self.rgb, 0, 255).astype(np.uint8), 'RGB')
