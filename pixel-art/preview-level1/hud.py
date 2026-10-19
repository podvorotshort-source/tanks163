"""Интерфейс превью — в той же пиксельной сетке (480×270), рисуется поверх мира."""
import numpy as np
from PIL import Image
from px import Spr, hx, m_disc, m_rect, m_poly, dilate
from pal import *

G = {
    '0': ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
    '1': "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
    '2': ".###.|#...#|....#|...#.|..#..|.#...|#####",
    '3': "####.|....#|....#|.###.|....#|....#|####.",
    '4': "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
    '5': "#####|#....|####.|....#|....#|#...#|.###.",
    '6': "..##.|.#...|#....|####.|#...#|#...#|.###.",
    '7': "#####|....#|...#.|..#..|.#...|.#...|.#...",
    '8': ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
    '9': ".###.|#...#|#...#|.####|....#|...#.|.##..",
    ':': ".|#|.|.|.|#|.",
    'У': "#...#|#...#|#...#|.####|....#|....#|.###.",
    'Р': "####.|#...#|#...#|####.|#....|#....|#....",
    'К': "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
    'А': ".###.|#...#|#...#|#####|#...#|#...#|#...#",
    'М': "#...#|##.##|#.#.#|#...#|#...#|#...#|#...#",
    'Е': "#####|#....|#....|####.|#....|#....|#####",
    'Х': "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    'Ш': "#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#####",
    'Г': "#####|#....|#....|#....|#....|#....|#....",
    'И': "#...#|#..##|#.#.#|#.#.#|##..#|#...#|#...#",
    'Н': "#...#|#...#|#...#|#####|#...#|#...#|#...#",
    'О': ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
    'Л': "..###|.#..#|.#..#|.#..#|.#..#|#...#|#...#",
    'Ь': "#....|#....|#....|####.|#...#|#...#|####.",
    'Д': "..##.|.#.#.|.#.#.|.#.#.|.#.#.|#####|#...#",
    'Т': "#####|..#..|..#..|..#..|..#..|..#..|..#..",
    'В': "####.|#...#|#...#|####.|#...#|#...#|####.",
    'Ы': "#...#|#...#|#...#|##..#|#.#.#|#.#.#|##..#",
    'Й': "#.#.#|#...#|#..##|#.#.#|##..#|#...#|#...#",
    '×': ".....|#...#|.#.#.|..#..|.#.#.|#...#|.....",
    '/': "....#|...#.|...#.|..#..|.#...|.#...|#....",
    'Q': ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
    'E': "#####|#....|#....|####.|#....|#....|#####",
    'R': "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
    ' ': "...|...|...|...|...|...|...",
}


def text(img, s, x, y, c=WHITE[3], sh=OUT):
    p = img.load()
    cx = x
    for ch in s:
        rows = G[ch].split('|')
        w = len(rows[0])
        for j, r in enumerate(rows):
            for i, v in enumerate(r):
                if v == '#':
                    for (dx, dy, col) in ((1, 1, sh), (0, 0, c)):
                        X, Y = cx + i + dx, y + j + dy
                        if 0 <= X < img.width and 0 <= Y < img.height:
                            if col == sh and p[X, Y][:3] == hx(c)[:3]:
                                continue
                            p[X, Y] = hx(col)
        cx += w + 1
    return cx


def text_w(s):
    return sum(len(G[ch].split('|')[0]) + 1 for ch in s) - 1


def put(img, spr, x, y):
    img.alpha_composite(Image.fromarray(spr.a, 'RGBA'), (int(x), int(y)))


def panel(w, h, alpha=215):
    s = Spr(w, h)
    m = m_rect(w, h, 0, 0, w - 1, h - 1)
    for (a, b) in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        m[b, a] = False
    s.a[m] = hx(OUT)
    inner = m_rect(w, h, 1, 1, w - 2, h - 2)
    s.a[inner] = hx(NAVY[1], alpha)
    s.a[m_rect(w, h, 1, 1, w - 2, 1)] = hx(NAVY[3])
    s.a[m_rect(w, h, 1, 1, 1, h - 2)] = hx(NAVY[3])
    s.a[m_rect(w, h, 2, h - 2, w - 2, h - 2)] = hx(NAVY[0])
    s.a[m_rect(w, h, w - 2, 2, w - 2, h - 2)] = hx(NAVY[0])
    return s


def bar(w, h, frac, ramp, seg=0):
    s = Spr(w, h)
    s.rect(0, 0, w - 1, h - 1, OUT)
    s.rect(1, 1, w - 2, h - 2, NAVY[0])
    f = int(round((w - 2) * frac))
    if f > 0:
        s.rect(1, 1, f, h - 2, ramp[2])
        s.rect(1, 1, f, 1, ramp[3])
        if h > 4:
            s.rect(1, 2, f, 2, ramp[4] if len(ramp) > 4 else ramp[3])
        s.rect(1, h - 2, f, h - 2, ramp[1])
        s.rect(f, 1, f, h - 2, ramp[4] if len(ramp) > 4 else ramp[3])
    if seg:
        for sx in range(seg, w - 1, seg):
            s.rect(sx, 1, sx, h - 2, OUT)
    return s


# ---------------------------------------------------------------- иконки 14×14

def icon(kind):
    s = Spr(14, 14)
    if kind == 'heart':
        s = Spr(9, 8)
        s.poly([(0, 2), (2, 0), (4, 2), (6, 0), (8, 2), (8, 3), (4, 7), (0, 3)], RED[3])
        s.px(1, 1, RED[5]); s.px(2, 1, RED[4]); s.px(1, 2, RED[4])
        s.rect(4, 6, 4, 6, RED[1]); s.rect(5, 5, 6, 4, RED[2])
        s.outline(OUT); return s
    if kind == 'bolt':
        s = Spr(7, 10)
        s.poly([(4, 0), (0, 5), (3, 5), (2, 9), (6, 3), (3, 3)], BLUE[3]); s.px(3, 1, BLUE[4]); s.px(2, 3, BLUE[4])
        s.outline(OUT); return s
    if kind == 'cannon':
        s.rect(1, 6, 12, 8, METAL[3]); s.rect(1, 6, 12, 6, METAL[5]); s.rect(1, 8, 12, 8, METAL[1])
        s.rect(4, 5, 4, 9, BLUE[3]); s.rect(7, 5, 7, 9, BLUE[3]); s.rect(11, 5, 12, 9, METAL[4])
        s.px(4, 5, BLUE[4]); s.px(7, 5, BLUE[4])
    elif kind == 'rocket':
        s.poly([(3, 10), (9, 4), (11, 2), (11, 2), (10, 5), (4, 11)], WHITE[2])
        s.poly([(9, 4), (11, 2), (10, 5)], RED[3])
        s.rect(4, 8, 5, 9, RED[3]); s.px(2, 9, RED[2]); s.px(4, 11, RED[2])
        s.px(1, 12, FIRE[4]); s.px(2, 11, FIRE[3]); s.px(1, 11, FIRE[3]); s.px(2, 12, FIRE[2]); s.px(0, 13, FIRE[2])
        s.px(6, 6, WHITE[3]); s.px(7, 5, WHITE[3])
    elif kind == 'flame':
        s.poly([(7, 0), (11, 6), (11, 10), (8, 13), (5, 13), (2, 10), (2, 6), (5, 4), (6, 6)], FIRE[2])
        s.poly([(7, 3), (10, 8), (9, 12), (5, 12), (4, 9), (6, 7)], FIRE[3])
        s.poly([(7, 7), (8, 10), (7, 12), (6, 12), (5, 10)], FIRE[4])
        s.px(7, 11, FIRE[5])
    elif kind == 'shield':
        s.poly([(2, 1), (11, 1), (11, 7), (7, 12), (6, 12), (2, 7)], BLUE[1])
        s.poly([(3, 2), (10, 2), (10, 7), (7, 11), (6, 11), (3, 7)], BLUE[2])
        s.poly([(3, 2), (6, 2), (6, 11), (3, 7)], BLUE[3])
        s.px(4, 3, BLUE[4]); s.px(4, 4, BLUE[4])
    elif kind == 'mine':
        s.disc(6.5, 7, 4, METAL[2]); s.disc(6, 6.5, 3, METAL[3]); s.px(5, 5, METAL[5])
        s.rect(6, 1, 7, 2, METAL[3]); s.px(6, 1, RED[4]); s.px(7, 1, RED[3])
        s.px(6, 7, RED[4])
    elif kind == 'repair':
        s.rect(5, 1, 8, 12, RED[3]); s.rect(1, 5, 12, 8, RED[3]); s.rect(5, 1, 8, 1, RED[4]); s.rect(1, 5, 12, 5, RED[4])
        s.rect(6, 2, 7, 11, WHITE[3]); s.rect(2, 6, 11, 7, WHITE[3])
    elif kind == 'tank':
        s.rect(1, 2, 11, 3, METAL[2]); s.rect(1, 10, 11, 11, METAL[2])
        s.rect(2, 4, 11, 9, YEL[3]); s.rect(2, 4, 11, 4, YEL[4]); s.rect(2, 9, 11, 9, YEL[1])
        s.disc(6, 6.5, 2.5, YEL[2]); s.px(5, 6, BLUE[3]); s.rect(8, 6, 13, 7, METAL[3])
    s.outline(OUT)
    return s


def slot(kind, num=None, cd=0.0, size=20, key=None, img=None, x=0, y=0):
    p = panel(size, size, alpha=200)
    put(img, p, x, y)
    ic = icon(kind)
    put(img, ic, x + (size - ic.w) // 2, y + (size - ic.h) // 2)
    if cd > 0:
        h = int((size - 4) * cd)
        ov = Spr(size, size)
        ov.a[m_rect(size, size, 2, 2 + (size - 4 - h), size - 3, size - 3)] = hx(OUT, 150)
        put(img, ov, x, y)
    if num is not None:
        text(img, str(num), x + size - text_w(str(num)) - 1, y + size - 6, WHITE[3])
    if key is not None:
        text(img, key, x + 2, y + 2, GOLD[3])


# ---------------------------------------------------------------- ПК

def top_bar(img, level, time, hp, xp, en=0.7):
    # игрок
    put(img, panel(118, 32), 4, 4)
    pp = panel(24, 24, alpha=255)
    put(img, pp, 8, 8)
    put(img, icon('tank'), 13, 13)
    put(img, icon('heart'), 35, 9)
    put(img, bar(70, 7, hp, RED + [RED[5]], seg=10), 46, 9)
    put(img, icon('bolt'), 36, 18)
    put(img, bar(70, 5, en, BLUE), 46, 21)
    # опыт и уровень
    W = img.width
    bw = 170
    bx = (W - bw) // 2
    put(img, panel(bw + 40, 17), bx - 34, 4)
    text(img, 'УР', bx - 29, 9, GOLD[3])
    text(img, str(level), bx - 15, 9, WHITE[3])
    put(img, bar(bw, 7, xp, GOLD), bx, 9)
    # таймер и пауза
    tw = text_w(time)
    put(img, panel(tw + 30, 17), W - tw - 34, 4)
    text(img, time, W - tw - 28, 9, WHITE[3])
    px_ = W - 14
    put(img, _pause(), px_ - 1, 8)


def _pause():
    s = Spr(9, 9)
    s.rect(1, 1, 3, 7, WHITE[3]); s.rect(5, 1, 7, 7, WHITE[3])
    s.rect(1, 7, 3, 7, WHITE[1]); s.rect(5, 7, 7, 7, WHITE[1])
    s.outline(OUT)
    return s


def draw_pc(img, level=3, time='02:41', hp=0.8, xp=0.64, zoom_note=False):
    top_bar(img, level, time, hp, xp)
    H = img.height
    # оружие (слева снизу)
    for i, (k, n, cd) in enumerate((('cannon', None, 0), ('rocket', 12, 0.4), ('flame', None, 0), ('mine', 3, 0.8))):
        slot(k, n, cd, img=img, x=4 + i * 22, y=H - 24)
    # способности (справа снизу)
    W = img.width
    for i, (k, key, cd) in enumerate((('shield', 'Q', 0), ('repair', 'E', 0.55), ('rocket', 'R', 0))):
        slot(k, None, cd, size=24, key=key, img=img, x=W - 84 + i * 27, y=H - 28)
    if zoom_note:
        s = 'КАМЕРА ×3'
        tw = text_w(s)
        put(img, panel(tw + 12, 15), (W - tw) // 2 - 6, H - 22)
        text(img, s, (W - tw) // 2, H - 18, GOLD[3])


# ---------------------------------------------------------------- телефон

def circle_spr(r, fill, alpha, ring, ring_a):
    S = int(r * 2 + 3)
    s = Spr(S, S)
    m = m_disc(S, S, S / 2 - .5, S / 2 - .5, r)
    s.a[m] = hx(fill, alpha)
    s.a[dilate(m) & ~m] = hx(OUT, 200)
    s.a[m & ~np.roll(np.roll(m, 1, 0), 1, 1)] = hx(ring, ring_a)
    return s


def draw_phone(img):
    W, H = img.width, img.height
    top_bar(img, 3, '02:41', 0.8, 0.64)
    # оружие — под панелью игрока, мелко
    for i, (k, n, cd) in enumerate((('cannon', None, 0), ('rocket', 12, 0.4), ('flame', None, 0), ('mine', 3, 0.8))):
        slot(k, n, cd, size=18, img=img, x=4 + i * 20, y=40)
    # виртуальный джойстик (вне безопасной зоны выреза — отступ слева)
    jx, jy = 70, H - 62
    base = circle_spr(34, NAVY[1], 110, NAVY[4], 160)
    put(img, base, jx - base.w // 2, jy - base.h // 2)
    knob = circle_spr(15, NAVY[3], 220, NAVY[4], 255)
    put(img, knob, jx + 10 - knob.w // 2, jy - 4 - knob.h // 2)
    k2 = circle_spr(9, NAVY[4], 200, WHITE[1], 160)
    put(img, k2, jx + 8 - k2.w // 2, jy - 6 - k2.h // 2)
    # кнопки способностей — веером у большого пальца
    for (bx, by, r, k, cd) in ((W - 46, H - 50, 22, 'shield', 0), (W - 98, H - 30, 15, 'repair', 0.55), (W - 84, H - 86, 15, 'rocket', 0)):
        b = circle_spr(r, NAVY[2], 210, NAVY[4], 255)
        put(img, b, bx - b.w // 2, by - b.h // 2)
        ic = icon(k)
        if r > 18:
            ic = Spr(ic.w * 2, ic.h * 2); ic.a = np.kron(icon(k).a, np.ones((2, 2, 1), np.uint8))
        put(img, ic, bx - ic.w // 2, by - ic.h // 2)
        if cd:
            m = m_disc(b.w, b.h, b.w / 2 - .5, b.h / 2 - .5, r) & (np.mgrid[0:b.h, 0:b.w][0] < b.h * cd)
            ov = Spr(b.w, b.h); ov.a[m] = hx(OUT, 150)
            put(img, ov, bx - b.w // 2, by - b.h // 2)
