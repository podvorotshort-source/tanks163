"""Спрайты превью: танки, враги, препятствия, эффекты. Свет сверху-слева, контур OUT."""
import numpy as np
from px import Spr, m_rect, m_disc, m_ell, m_poly, shift, dilate, erode, edge_in, checker, hx
from pal import *


def rounded(s, x0, y0, x1, y1, c, r=1, **k):
    m = m_rect(s.w, s.h, x0, y0, x1, y1)
    for i in range(r):
        for (cx, cy) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            for j in range(r - i):
                dx = j if cx == x0 else -j
                dy = i if cy == y0 else -i
                m[cy + dy, cx + dx] = False
    return s.paint(m, c, **k)


# ======================================================================
# Танк игрока, поколение I «игрушка». Нос вправо.
# ======================================================================

def player_tank():
    s = Spr(52, 36)
    X0, X1, Y0, Y1 = 2, 37, 3, 32

    # гусеницы: видны сверху/снизу и на концах
    for ty0 in (Y0, Y1 - 7):
        ty1 = ty0 + 7
        rounded(s, X0, ty0, X1, ty1, METAL[1], r=2)
        for xx in range(X0 + 1, X1, 3):
            s.rect(xx, ty0 + 1, xx + 1, ty1 - 1, METAL[2], clip=True)
            s.rect(xx, ty0 + 1, xx, ty1 - 1, METAL[3], clip=True)
        s.rect(X0 + 2, ty0, X1 - 2, ty0, METAL[4], clip=True)
        s.rect(X0 + 2, ty1, X1 - 2, ty1, METAL[0])
    # корпус
    rounded(s, X0 + 3, Y0 + 5, X1 - 1, Y1 - 5, NAVY[2], r=1)
    s.rect(X0 + 3, Y1 - 6, X1 - 1, Y1 - 5, NAVY[1], clip=True)
    s.rect(X0 + 4, Y0 + 5, X1 - 2, Y0 + 5, NAVY[4])
    # жёлтые крылья над внутренней частью гусениц
    for (fy0, fy1) in ((Y0 + 3, Y0 + 9), (Y1 - 9, Y1 - 3)):
        pts = [(X0 + 6, fy0), (X1 - 8, fy0), (X1 - 4, fy0 + 3), (X1 - 4, fy1 - 1), (X1 - 6, fy1), (X0 + 7, fy1), (X0 + 5, fy1 - 2)]
        s.poly(pts, YEL[1])
        s.poly([(a, b - 1) for a, b in pts], YEL[3], clip=True)
        s.rect(X0 + 7, fy0, X1 - 9, fy0, YEL[5], only=YEL[3])
        s.rect(X0 + 6, fy0 + 1, X1 - 8, fy0 + 1, YEL[4], only=YEL[3])
        s.rect(X0 + 6, fy1 - 1, X1 - 6, fy1 - 1, YEL[2], only=YEL[3])
        for rx in range(X0 + 9, X1 - 8, 6):
            s.px(rx, fy0 + 3, YEL[1]); s.px(rx - 1, fy0 + 2, YEL[5])
        for k in range(3):
            s.px(X1 - 9 - k * 2, fy0 + 3, OUT); s.px(X1 - 8 - k * 2, fy0 + 3, YEL[4])
    # нос — скошенная плита между крыльями
    s.poly([(X1 - 6, Y0 + 10), (X1 - 1, Y0 + 11), (X1 - 1, Y1 - 11), (X1 - 6, Y1 - 10)], YEL[2])
    s.line([(X1 - 6, Y0 + 10), (X1 - 6, Y1 - 10)], YEL[4])
    s.line([(X1 - 1, Y0 + 11), (X1 - 1, Y1 - 11)], YEL[1])
    for fy in (Y0 + 6, Y1 - 7):
        s.rect(X1 - 2, fy, X1 - 1, fy + 1, BLUE[3]); s.px(X1 - 2, fy, BLUE[4])
    # моторный отсек: решётка
    s.rect(X0 + 4, Y0 + 11, X0 + 9, Y1 - 11, NAVY[1])
    for gy in range(Y0 + 12, Y1 - 11, 2):
        s.rect(X0 + 5, gy, X0 + 8, gy, NAVY[3])
    s.rect(X0 + 4, Y0 + 11, X0 + 9, Y0 + 11, NAVY[4])
    s.rect(X0 + 1, Y0 + 12, X0 + 3, Y0 + 13, METAL[3]); s.px(X0 + 1, Y0 + 13, METAL[1])

    # башня с тёмным погоном
    cx, cy, R = 20, 17.5, 8
    tur = m_disc(s.w, s.h, cx, cy, R)
    s.paint(dilate(tur, True), NAVY[0])
    s.paint(tur, YEL[1])
    s.paint(m_disc(s.w, s.h, cx - 0.6, cy - 0.8, R - 0.6) & tur, YEL[2])
    s.paint(m_disc(s.w, s.h, cx - 1.4, cy - 1.6, R - 1.6) & tur, YEL[3])
    s.paint(m_disc(s.w, s.h, cx - 3, cy - 3.2, R - 4.8) & tur, YEL[4])
    s.px(cx - 4, int(cy - 5), YEL[5]); s.px(cx - 5, int(cy - 4), YEL[5]); s.px(cx - 3, int(cy - 6), YEL[5])
    # маска орудия
    s.rect(26, 13, 30, 21, YEL[2]); s.rect(26, 13, 30, 13, YEL[4]); s.rect(26, 21, 30, 21, YEL[1]); s.rect(30, 14, 30, 20, YEL[1])
    # ствол
    s.rect(31, 15, 45, 19, METAL[2]); s.rect(31, 15, 45, 15, METAL[4]); s.rect(31, 16, 45, 16, METAL[3]); s.rect(31, 19, 45, 19, METAL[1])
    for bx in (34, 38):
        s.rect(bx, 14, bx + 1, 20, BLUE[2]); s.rect(bx, 14, bx, 20, BLUE[3]); s.px(bx, 15, BLUE[4])
    s.rect(45, 13, 49, 21, METAL[3]); s.rect(45, 13, 49, 13, METAL[5]); s.rect(49, 14, 49, 21, METAL[1]); s.rect(45, 21, 49, 21, METAL[1])
    s.rect(47, 15, 47, 19, METAL[0])
    # люк-сенсор
    hm = m_disc(s.w, s.h, 18, 16.5, 3)
    s.paint(dilate(hm), NAVY[1]); s.paint(hm, NAVY[2])
    s.disc(18, 16.5, 1.6, BLUE[2]); s.px(17, 16, BLUE[4]); s.px(18, 16, BLUE[3]); s.px(17, 15, BLUE[3])
    s.outline(OUT)
    return s


# ======================================================================
# Враг: красный игрушечный танк. Нос вправо (потом зеркалим).
# ======================================================================

def enemy_tank(burnt=False):
    s = Spr(36, 28)
    X0, X1, Y0, Y1 = 2, 25, 2, 24
    for ty0 in (Y0, Y1 - 5):
        rounded(s, X0, ty0, X1, ty0 + 5, METAL[1], r=2)
        for xx in range(X0 + 1, X1, 3):
            s.rect(xx, ty0 + 1, xx, ty0 + 4, METAL[3], clip=True)
        s.rect(X0 + 2, ty0 + 5, X1 - 2, ty0 + 5, METAL[0])
    rounded(s, X0 + 1, Y0 + 3, X1, Y1 - 3, RED[2], r=2)
    s.poly([(X0 + 1, Y0 + 3), (X1, Y0 + 3), (X1, Y0 + 9), (X0 + 1, Y0 + 9)], RED[3], clip=True)
    s.rect(X0 + 2, Y0 + 3, X1 - 2, Y0 + 3, RED[4])
    s.rect(X0 + 2, Y1 - 3, X1 - 1, Y1 - 3, RED[1])
    s.rect(X1, Y0 + 4, X1, Y1 - 4, RED[1])
    # белые полосы-«игрушка»
    s.rect(X0 + 3, Y0 + 6, X0 + 4, Y1 - 6, WHITE[2]); s.rect(X0 + 3, Y1 - 6, X0 + 4, Y1 - 6, WHITE[1])
    # фары
    s.px(X1 - 1, Y0 + 5, FIRE[4]); s.px(X1 - 1, Y1 - 5, FIRE[4])
    # башня
    cx, cy, R = 13, 13, 5.5
    t = m_disc(s.w, s.h, cx, cy, R)
    s.paint(dilate(t, True), OUT)
    s.paint(t, RED[1]); s.paint(m_disc(s.w, s.h, cx - .6, cy - .7, R - .6) & t, RED[2])
    s.paint(m_disc(s.w, s.h, cx - 1.3, cy - 1.4, R - 1.5) & t, RED[3])
    s.px(cx - 3, cy - 3, RED[5]); s.px(cx - 2, cy - 4, RED[4]); s.px(cx - 4, cy - 2, RED[4])
    # ствол
    s.rect(18, 11, 31, 14, METAL[2]); s.rect(18, 11, 31, 11, METAL[4]); s.rect(18, 14, 31, 14, METAL[1])
    s.rect(30, 10, 33, 15, METAL[3]); s.rect(30, 10, 33, 10, METAL[5]); s.rect(33, 11, 33, 15, METAL[1])
    # звезда-эмблема
    s.px(cx, cy, WHITE[3]); s.px(cx - 1, cy, WHITE[2]); s.px(cx + 1, cy, WHITE[2]); s.px(cx, cy - 1, WHITE[3]); s.px(cx, cy + 1, WHITE[1])
    s.outline(OUT)
    if burnt:
        mp = {}
        for i, c in enumerate(RED):
            mp[c] = SMOKE[max(0, min(4, i - 1))]
        for i, c in enumerate(METAL):
            mp[c] = SMOKE[max(0, min(3, i - 2))]
        for c in WHITE:
            mp[c] = SMOKE[2]
        mp[FIRE[4]] = FIRE[3]
        s = s.recolor(mp)
        # подпалины и тлеющие угли
        rng = np.random.default_rng(3)
        al = s.alpha
        for _ in range(26):
            x, y = int(rng.integers(0, s.w)), int(rng.integers(0, s.h))
            if al[y, x] and erode(al)[y, x]:
                s.px(x, y, SMOKE[0])
        for (x, y) in ((10, 9), (16, 17), (21, 8), (8, 18)):
            s.px(x, y, FIRE[3]); s.px(x + 1, y, FIRE[4])
    return s


# ======================================================================
# Дрон-квадрокоптер (сверху)
# ======================================================================

def drone(phase=0):
    s = Spr(30, 30)
    c = 14.5
    # лучи
    for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        s.line([(c, c), (c + dx * 9, c + dy * 9)], METAL[2], width=2)
    # роторы: размытые диски
    for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        rx, ry = c + dx * 9, c + dy * 9
        ring = m_disc(s.w, s.h, rx, ry, 5) & ~m_disc(s.w, s.h, rx, ry, 3.4)
        s.a[m_disc(s.w, s.h, rx, ry, 5)] = hx(WHITE[1], 70)
        s.a[ring] = hx(WHITE[2], 120)
        blade = m_rect(s.w, s.h, int(rx) - 4, int(ry), int(rx) + 4, int(ry)) if (phase + dx) % 2 else m_rect(s.w, s.h, int(rx), int(ry) - 4, int(rx), int(ry) + 4)
        s.paint(blade, WHITE[2])
        s.disc(rx, ry, 1, METAL[1])
        s.px(int(rx) - 1, int(ry) - 1, METAL[4])
    # корпус
    body = m_disc(s.w, s.h, c, c, 5)
    s.paint(dilate(body), OUT)
    s.paint(body, RED[2])
    s.paint(m_disc(s.w, s.h, c - .8, c - .8, 4) & body, RED[3])
    s.paint(m_disc(s.w, s.h, c - 1.5, c - 1.5, 2.2) & body, WHITE[2])
    s.px(int(c) - 2, int(c) - 2, WHITE[3])
    s.px(int(c) + 1, int(c) + 1, FIRE[5]); s.px(int(c) + 2, int(c) + 1, FIRE[4]); s.px(int(c) + 1, int(c) + 2, FIRE[3])
    # контур только у лучей и корпуса (роторы прозрачные — без контура)
    return s


# ======================================================================
# Препятствия (вид 3/4: верх + передняя грань)
# ======================================================================

def brick_block(w=24, depth=14, hgt=10, cracked=False):
    s = Spr(w + 2, depth + hgt + 3)
    x0, x1 = 1, w
    ty0, ty1 = 1, depth
    fy0, fy1 = depth + 1, depth + hgt
    # верх: кирпичи, видимые сверху
    s.rect(x0, ty0, x1, ty1, BRICK[4])
    for r, by in enumerate(range(ty0, ty1 + 1, 5)):
        off = 0 if r % 2 == 0 else 6
        s.rect(x0, by + 4, x1, by + 4, BRICK[2], clip=True) if by + 4 <= ty1 else None
        for bx in range(x0 - off, x1 + 1, 12):
            if bx + 11 >= x0:
                s.rect(max(x0, bx + 11), by, max(x0, bx + 11), min(ty1, by + 3), BRICK[2], clip=True)
            if x0 <= bx + 1 <= x1:
                s.rect(max(x0, bx), by, min(x1, bx + 9), by, BRICK[5], only=BRICK[4])
            if bx + 10 <= x1 and bx + 10 >= x0:
                s.rect(bx + 10, by + 1, bx + 10, min(ty1, by + 3), BRICK[3], only=BRICK[4])
    # перед: кирпичи сбоку
    s.rect(x0, fy0, x1, fy1, BRICK[2])
    for r, by in enumerate(range(fy0, fy1 + 1, 4)):
        off = 3 if r % 2 else 9
        s.rect(x0, by + 3, x1, by + 3, BRICK[1], clip=True) if by + 3 <= fy1 else None
        for bx in range(x0 - off, x1 + 1, 12):
            if x0 <= bx <= x1:
                s.rect(bx, by, bx, min(fy1, by + 2), BRICK[1])
            if x0 <= bx + 1 <= x1:
                s.rect(max(x0, bx + 1), by, min(x1, bx + 8), by, BRICK[3], only=BRICK[2])
    s.rect(x0, fy0, x1, fy0, BRICK[5])        # ребро
    s.rect(x0, fy0 + 1, x1, fy0 + 1, BRICK[3], only=BRICK[2])
    s.rect(x0, fy1, x1, fy1, BRICK[0])
    s.rect(x1, fy0 + 1, x1, fy1, BRICK[1])
    if cracked:
        for (a, b) in ((7, 4), (8, 5), (8, 6), (9, 7), (15, 18), (16, 19), (16, 20)):
            s.px(a, b, BRICK[0])
    s.outline(OUT)
    return s


def crate(w=20, depth=12, hgt=9):
    s = Spr(w + 2, depth + hgt + 3)
    x0, x1 = 1, w
    ty0, ty1, fy0, fy1 = 1, depth, depth + 1, depth + hgt
    s.rect(x0, ty0, x1, ty1, METAL[3])
    s.rect(x0, ty0, x1, ty0, METAL[5]); s.rect(x0, ty0, x0, ty1, METAL[4])
    s.rect(x0 + 2, ty0 + 2, x1 - 2, ty1 - 2, METAL[2])            # крышка утоплена
    s.rect(x0 + 3, ty0 + 3, x1 - 2, ty1 - 2, METAL[3])
    s.rect(x0 + 3, ty1 - 2, x1 - 2, ty1 - 2, METAL[4])
    s.rect(x1 - 2, ty0 + 3, x1 - 2, ty1 - 2, METAL[4])
    s.rect(x0 + 3, ty0 + 3, x1 - 3, ty0 + 3, METAL[2])
    # ручка/знак
    s.rect(w // 2 - 2, (ty0 + ty1) // 2, w // 2 + 3, (ty0 + ty1) // 2, METAL[1])
    s.rect(w // 2 - 2, (ty0 + ty1) // 2 - 1, w // 2 + 3, (ty0 + ty1) // 2 - 1, METAL[4])
    # уголки
    for (a, b) in ((x0, ty0), (x1 - 1, ty0), (x0, ty1 - 1), (x1 - 1, ty1 - 1)):
        s.rect(a, b, a + 1, b + 1, METAL[5] if a == x0 and b == ty0 else METAL[4])
    # перед
    s.rect(x0, fy0, x1, fy1, METAL[2])
    s.rect(x0, fy0, x1, fy0, METAL[4])
    for rx in range(x0 + 3, x1, 4):
        s.rect(rx, fy0 + 2, rx, fy1 - 1, METAL[1]); s.rect(rx + 1, fy0 + 2, rx + 1, fy1 - 1, METAL[3])
    s.rect(x0, fy1, x1, fy1, METAL[0])
    s.rect(x1, fy0, x1, fy1, METAL[1])
    for a in (x0 + 1, x1 - 1):
        s.px(a, fy0 + 2, METAL[5]); s.px(a, fy1 - 2, METAL[4])
    s.outline(OUT)
    return s


def bush(r=7, seed=0, big=False):
    rng = np.random.default_rng(seed)
    n = 7 if big else 4
    W = int(r * 4 + 6)
    s = Spr(W, int(r * 3.4 + 6))
    cx, cy = W / 2, r * 1.9 + 2
    blobs = [(cx, cy, r)]
    for i in range(n):
        a = rng.random() * 6.28
        d = r * (0.55 + 0.35 * rng.random())
        blobs.append((cx + np.cos(a) * d * 1.25, cy + np.sin(a) * d * 0.8, r * (0.55 + 0.3 * rng.random())))
    blobs.sort(key=lambda b: b[1])
    full = np.zeros((s.h, s.w), bool)
    for (bx, by, br) in blobs:
        full |= m_disc(s.w, s.h, bx, by, br)
    s.paint(full, LEAF[1])
    for (bx, by, br) in blobs:       # каждый шар — своя светотень
        m = m_disc(s.w, s.h, bx, by, br)
        s.paint(m_disc(s.w, s.h, bx - .9, by - 1.1, br - .9) & m, LEAF[2])
        s.paint(m_disc(s.w, s.h, bx - 1.8, by - 2.2, br - 2.2) & m, LEAF[3])
        s.paint(m_disc(s.w, s.h, bx - 2.6, by - 3, max(1, br - 4)) & m, LEAF[4])
        hx_, hy_ = int(bx - br * .45), int(by - br * .55)
        for (a, b) in ((0, 0), (1, 0), (0, 1), (-1, 1)):
            if full[hy_ + b, hx_ + a]:
                s.px(hx_ + a, hy_ + b, LEAF[5] if (a, b) == (0, 0) else LEAF[4])
    # листва: зубчики по краю и тёмные щели
    e = edge_in(full)
    ys, xs = np.nonzero(e)
    for i in range(len(xs)):
        if rng.random() < 0.25:
            s.px(xs[i], ys[i], LEAF[0])
    for _ in range(int(r * 3)):
        x, y = int(rng.integers(0, s.w)), int(rng.integers(0, s.h))
        if erode(erode(full))[y, x]:
            s.px(x, y, LEAF[1]); s.px(x - 1, y - 1, LEAF[4])
    if big:
        for _ in range(5):
            x, y = int(rng.integers(0, s.w)), int(rng.integers(0, s.h))
            if erode(erode(full))[y, x]:
                s.px(x, y, RED[4]); s.px(x, y + 1, RED[1])
    s.outline(OUT)
    return s


def barrel():
    s = Spr(14, 19)
    s.rect(1, 4, 12, 16, RED[2])
    s.ell(6.5, 16, 5.5, 2, RED[1])
    s.rect(1, 4, 2, 16, RED[3]); s.rect(3, 4, 3, 15, RED[4]); s.rect(11, 4, 12, 16, RED[1])
    for ry in (8, 13):
        s.rect(1, ry, 12, ry, RED[1]); s.rect(2, ry - 1, 4, ry - 1, RED[4])
    # знак огня
    s.px(7, 10, GOLD[3]); s.px(6, 11, GOLD[2]); s.px(7, 11, GOLD[3]); s.px(8, 11, GOLD[2]); s.px(7, 9, GOLD[2])
    # крышка
    s.ell(6.5, 4, 5.5, 2.5, RED[3])
    s.ell(6.5, 4, 4.5, 1.5, RED[1])
    s.ell(6.0, 3.6, 3.5, 1, RED[2])
    s.px(8, 3, METAL[4]); s.px(8, 4, METAL[1])
    s.rect(2, 2, 5, 2, RED[5], only=RED[3])
    s.outline(OUT)
    return s


def pond():
    W, H = 92, 58
    s = Spr(W, H)
    cx, cy = W / 2, H / 2
    rng = np.random.default_rng(11)
    water = m_ell(W, H, cx, cy, 39, 23)
    s.paint(water, WATER[2])
    # глубина и тень бортика (свет сверху-слева → тень у верхнего-левого края воды)
    s.paint(m_ell(W, H, cx + 2, cy + 2, 33, 18) & water, WATER[2])
    s.paint(water & ~shift(water, 3, 3), WATER[1])
    s.paint(water & ~shift(water, 1, 2), WATER[0])
    s.paint(m_ell(W, H, cx + 6, cy + 3, 14, 7) & water, WATER[1])
    # блики-рябь
    for (a, b, l) in ((cx - 18, cy + 8, 6), (cx + 10, cy + 12, 4), (cx - 4, cy - 6, 5), (cx + 22, cy - 2, 3), (cx - 26, cy - 2, 3)):
        s.rect(int(a), int(b), int(a + l), int(b), WATER[4], clip=True)
        s.rect(int(a + 1), int(b - 1), int(a + l - 2), int(b - 1), WATER[5], clip=True)
    s.paint(water & ~shift(water, -2, -2) & ~(~shift(water, 3, 3)), WATER[3])
    # кувшинки
    for (lx, ly, r) in ((cx - 22, cy + 3, 3.5), (cx - 14, cy + 9, 2.5), (cx + 16, cy - 8, 3.5), (cx + 25, cy + 6, 2.5), (cx + 6, cy - 13, 2.5)):
        m = m_disc(W, H, lx, ly, r)
        s.paint(m & ~m_poly(W, H, [(lx, ly), (lx + r + 2, ly - 2), (lx + r + 2, ly + 1)]), LEAF[3])
        s.paint(shift(m, 1, 1) & ~m & water, WATER[0])
        s.px(int(lx - 1), int(ly - 1), LEAF[5]); s.px(int(lx), int(ly - 1), LEAF[4])
    s.px(int(cx - 22), int(cy + 2), PINK[3]); s.px(int(cx - 23), int(cy + 2), PINK[2]); s.px(int(cx - 22), int(cy + 3), PINK[1])
    # каменный бортик из валунов
    stones = []
    for i in range(30):
        a = i / 30 * 6.283 + rng.random() * 0.1
        stones.append((cx + np.cos(a) * 41, cy + np.sin(a) * 25, 3.2 + rng.random() * 1.6))
    stones.sort(key=lambda t: t[1])
    for (sx, sy, r) in stones:
        m = m_disc(W, H, sx, sy, r)
        s.paint(dilate(m), OUT)
        s.paint(m, STONE[2])
        s.paint(m_disc(W, H, sx - .7, sy - .8, r - .7) & m, STONE[3])
        s.paint(m_disc(W, H, sx - 1.4, sy - 1.6, r - 2) & m, STONE[4])
        s.px(int(sx - r * .5), int(sy - r * .5), STONE[5])
        s.paint(m & ~shift(m, -1, -1), STONE[1])
    return s


def die():
    s = Spr(44, 46)
    x0, x1, ty0, ty1, fy1 = 2, 41, 2, 29, 42
    rounded(s, x0, ty0, x1, fy1, WHITE[1], r=3)
    rounded(s, x0, ty0, x1, ty1, WHITE[2], r=3)
    s.rect(x0 + 2, ty0, x1 - 3, ty0, WHITE[3]); s.rect(x0, ty0 + 2, x0, ty1 - 3, WHITE[3])
    s.rect(x0 + 2, ty0 + 1, x1 - 4, ty0 + 1, WHITE[3])
    s.rect(x0 + 1, ty1 + 1, x1 - 1, ty1 + 1, WHITE[3])
    s.rect(x1, ty1 + 2, x1, fy1 - 2, WHITE[0])
    s.rect(x0 + 2, fy1, x1 - 2, fy1, WHITE[0])

    def pip(px_, py_, rx=2.5, ry=2.5, front=False):
        m = m_ell(s.w, s.h, px_, py_, rx, ry)
        s.paint(m, RED[2]); s.paint(m & ~shift(m, 1, 1), RED[0]); s.paint(m & ~shift(m, -1, -1), RED[3])
    for (a, b) in ((11, 9), (21.5, 15.5), (32, 22)):            # верх — 3
        pip(a, b)
    for (a, b) in ((11, 34.5), (32, 34.5), (11, 39), (32, 39)):  # перед — 4 (сплюснуто)
        pip(a, b, 2.5, 1.2, True)
    s.outline(OUT)
    return s


def ball():
    R = 34
    s = Spr(2 * R + 4, 2 * R + 4)
    c = R + 2
    m = m_disc(s.w, s.h, c, c, R)
    x, y = np.mgrid[0:s.h, 0:s.w][::-1]
    ang = np.arctan2(y - c + 6, x - c + 4)
    seg = ((ang + np.pi) / (2 * np.pi) * 6).astype(int) % 6
    cols = [(RED[2], RED[3], RED[4]), (GOLD[1], GOLD[2], GOLD[3]), (BLUE[0], BLUE[1], BLUE[2]),
            (WHITE[0], WHITE[1], WHITE[2]), (RED[2], RED[3], RED[4]), (LEAF[2], LEAF[3], LEAF[4])]
    d = np.hypot(x - (c - 9), y - (c - 10)) / R
    for i, (dk, md, lt) in enumerate(cols):
        sm = m & (seg == i)
        s.paint(sm, dk)
        s.paint(sm & (d < 1.15), md)
        s.paint(sm & (d < 0.55), lt)
    # центр-пупок и блик
    s.disc(c - 4, c - 6, 3, WHITE[2]); s.disc(c - 4, c - 6, 1.5, WHITE[3])
    s.paint(m_ell(s.w, s.h, c - 14, c - 18, 5, 3) & m, WHITE[3])
    s.paint(m & ~shift(m, -2, -2), OUT if False else SMOKE[1])
    s.outline(OUT)
    return s


# ======================================================================
# Подбираемое
# ======================================================================

def star():
    s = Spr(15, 15)
    c = 7
    pts = []
    for i in range(10):
        a = -np.pi / 2 + i * np.pi / 5
        r = 6.6 if i % 2 == 0 else 2.9
        pts.append((c + np.cos(a) * r, c + 0.5 + np.sin(a) * r))
    s.poly(pts, GOLD[2])
    s.poly([(a - 0.6, b - 0.8) for a, b in pts], GOLD[3], clip=True)
    s.px(c - 1, c - 1, GOLD[4]); s.px(c, c - 2, GOLD[4]); s.px(c - 1, c, GOLD[4])
    s.paint(s.alpha & ~shift(s.alpha, -1, -1), GOLD[1])
    s.outline(OUT)
    return s


def gem(col=BLUE):
    s = Spr(9, 11)
    s.poly([(4, 1), (7, 4), (4, 9), (1, 4)], col[1])
    s.poly([(4, 1), (4, 9), (1, 4)], col[2])
    s.poly([(4, 1), (7, 4), (1, 4)], col[3])
    s.px(3, 3, col[4]); s.px(4, 2, col[4])
    s.outline(OUT)
    return s


def medkit():
    s = Spr(16, 15)
    rounded(s, 1, 1, 14, 12, WHITE[1], r=1)
    rounded(s, 1, 1, 14, 8, WHITE[2], r=1)
    s.rect(2, 1, 13, 1, WHITE[3])
    s.rect(6, 2, 9, 7, RED[3]); s.rect(4, 4, 11, 5, RED[3]); s.px(6, 2, RED[4]); s.px(4, 4, RED[4])
    s.rect(1, 9, 14, 9, WHITE[3]); s.rect(6, 10, 9, 11, RED[2])
    s.outline(OUT)
    return s


# ======================================================================
# Снаряды и эффекты
# ======================================================================

def bolt(length=10):
    s = Spr(length + 2, 7)
    s.rect(1, 2, length, 4, BLUE[2])
    s.rect(3, 1, length - 1, 5, BLUE[2])
    s.rect(1, 3, 2, 3, BLUE[1])
    s.rect(4, 2, length, 4, BLUE[3])
    s.rect(6, 3, length, 3, BLUE[4])
    s.px(length + 1, 3, BLUE[4])
    return s


def bullet():
    s = Spr(9, 5)
    s.rect(1, 1, 7, 3, FIRE[3]); s.rect(0, 2, 0, 2, FIRE[2])
    s.rect(3, 1, 7, 3, FIRE[4]); s.rect(5, 2, 8, 2, FIRE[5])
    s.px(1, 1, FIRE[2]); s.px(1, 3, FIRE[2])
    return s


def muzzle_blue():
    s = Spr(15, 13)
    c = (4, 6)
    s.poly([(0, 6), (6, 2), (14, 6), (6, 10)], BLUE[2])
    s.poly([(2, 6), (6, 3), (12, 6), (6, 9)], BLUE[3])
    s.poly([(3, 6), (6, 4), (9, 6), (6, 8)], BLUE[4])
    s.px(6, 0, BLUE[3]); s.px(6, 1, BLUE[2]); s.px(6, 12, BLUE[3]); s.px(6, 11, BLUE[2])
    return s


def explosion(seed=1, R=16):
    rng = np.random.default_rng(seed)
    S = int(R * 2.6)
    s = Spr(S, S)
    c = S / 2
    blobs = [(c, c, R * 0.62)]
    for i in range(9):
        a = rng.random() * 6.28
        d = R * (0.3 + 0.45 * rng.random())
        blobs.append((c + np.cos(a) * d, c + np.sin(a) * d, R * (0.28 + 0.22 * rng.random())))
    full = np.zeros((S, S), bool)
    for (bx, by, br) in blobs:
        full |= m_disc(S, S, bx, by, br)
    s.paint(full, FIRE[1])
    for (bx, by, br) in blobs:
        s.paint(m_disc(S, S, bx - .6, by - 1.0, br - 1.2) & full, FIRE[2])
    for (bx, by, br) in blobs:
        s.paint(m_disc(S, S, bx - 1, by - 1.6, br - 2.6) & full, FIRE[3])
    s.paint(m_disc(S, S, c - 1, c - 1.5, R * 0.42), FIRE[4])
    s.paint(m_disc(S, S, c - 1.5, c - 2, R * 0.22), FIRE[5])
    # язычки
    for i in range(7):
        a = rng.random() * 6.28
        for k in range(3):
            d = R * (0.85 + k * 0.14)
            x, y = int(c + np.cos(a) * d), int(c + np.sin(a) * d)
            s.px(x, y, [FIRE[3], FIRE[2], FIRE[1]][k])
    # искры
    for i in range(14):
        a = rng.random() * 6.28
        d = R * (1.05 + 0.2 * rng.random())
        x, y = int(c + np.cos(a) * d), int(c + np.sin(a) * d)
        s.px(x, y, FIRE[5] if i % 3 else FIRE[4])
    return s


def smoke_puff(r, seed=0, lit=True):
    rng = np.random.default_rng(seed)
    S = int(r * 2.8 + 4)
    s = Spr(S, S)
    c = S / 2
    blobs = [(c, c, r)] + [(c + rng.normal() * r * .5, c + rng.normal() * r * .4, r * (.5 + .3 * rng.random())) for _ in range(3)]
    full = np.zeros((S, S), bool)
    for b in blobs:
        full |= m_disc(S, S, *b)
    s.paint(full, SMOKE[1])
    for (bx, by, br) in blobs:
        s.paint(m_disc(S, S, bx - .8, by - 1, br - 1) & full, SMOKE[2])
        s.paint(m_disc(S, S, bx - 1.6, by - 2, br - 2.4) & full, SMOKE[3])
    if lit:
        s.paint(m_disc(S, S, c - r * .4, c - r * .5, max(1, r * .3)) & full, SMOKE[4])
    return s


def debris(seed=0):
    rng = np.random.default_rng(seed)
    s = Spr(4, 4)
    s.rect(0, 0, 2, 1, METAL[2]); s.px(0, 0, METAL[4]); s.px(2, 1, METAL[0])
    if rng.random() < .5:
        s.px(1, 2, METAL[1])
    return s
