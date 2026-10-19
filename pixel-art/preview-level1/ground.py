"""Земля полигона: трава, тропинки, плиты дороги, пол комнаты за бортиком."""
import numpy as np
from PIL import Image
from px import hx, grid, shift, dilate, erode, m_disc, bayer
from pal import *

FRAME_X = 118          # левый бортик-доска песочницы
ARENA_X = 127


def vnoise(w, h, cell, rng):
    gw, gh = w // cell + 3, h // cell + 3
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray(g, 'F').resize((gw * cell, gh * cell), Image.BICUBIC)
    return np.array(im)[cell:cell + h, cell:cell + w]


def fbm(w, h, rng, cells=(64, 32, 16, 8), amps=(1, .55, .3, .16)):
    n = sum(a * vnoise(w, h, c, rng) for c, a in zip(cells, amps))
    n -= n.min()
    return n / n.max()


def seg_dist(x, y, a, b):
    ax, ay = a; bx, by = b
    vx, vy = bx - ax, by - ay
    t = np.clip(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(x - (ax + t * vx), y - (ay + t * vy))


def path_dist(x, y, pts):
    return np.min([seg_dist(x, y, pts[i], pts[i + 1]) for i in range(len(pts) - 1)], axis=0)


def put(rgb, m, c):
    rgb[m] = np.array(hx(c)[:3], np.float32)


def build(W, H, seed=7):
    rng = np.random.default_rng(seed)
    x, y = grid(W, H)
    rgb = np.zeros((H, W, 3), np.float32)
    arena = x >= ARENA_X

    # ---------------- раскладка
    road_h = arena & (y >= 270) & (y <= 301)
    road_v = (x >= 434) & (x <= 465) & (y < 270)
    road = road_h | road_v

    warp = (fbm(W, H, rng, cells=(32, 16, 8), amps=(1, .5, .25)) - 0.5) * 22
    d = np.minimum.reduce([
        path_dist(x, y, [(ARENA_X - 10, 132), (200, 166), (300, 188), (380, 176), (434, 152)]) - 12,
        path_dist(x, y, [(300, 188), (316, 232), (322, 270)]) - 9,
        np.hypot((x - 300) * 0.8, y - 188) - 34,
        path_dist(x, y, [(465, 120), (540, 96), (640, 104)]) - 6,
    ])
    dirt = arena & ~road & (d + warp < 0)
    # мелкие проплешины
    pn = fbm(W, H, rng, cells=(24, 12, 6), amps=(1, .5, .25))
    dirt |= arena & ~road & (pn > 0.86)
    grass = arena & ~road & ~dirt

    # ---------------- трава
    n = fbm(W, H, rng)
    fine = vnoise(W, H, 3, rng)
    v = n * 0.85 + fine * 0.3
    lvl = np.digitize(v, [0.38, 0.55, 0.78])          # 0..3
    for i, c in enumerate([GRASS[1], GRASS[2], GRASS[3], GRASS[4]]):
        put(rgb, grass & (lvl == i), c)
    # тёмные «ямки» между кустиками травы — короткие штрихи
    spots = grass & (rng.random((H, W)) < 0.035)
    put(rgb, spots & (lvl >= 2), GRASS[2])
    put(rgb, shift(spots, 0, 1) & grass & (lvl >= 2), GRASS[1])
    put(rgb, spots & (lvl < 2), GRASS[0])

    # пучки травы: светлые кончики с тенью у основания
    tufts = []
    for _ in range(int(W * H / 64)):
        tx, ty = int(rng.integers(ARENA_X, W)), int(rng.integers(2, H))
        if not grass[ty, tx]:
            continue
        tufts.append((tx, ty))
    def gp(px_, py_, c):
        if 0 <= px_ < W and 0 <= py_ < H and grass[py_, px_]:
            rgb[py_, px_] = hx(c)[:3]
    for tx, ty in tufts:
        l = lvl[ty, tx]
        tip = GRASS[5] if l >= 2 and rng.random() < 0.55 else GRASS[4]
        body = GRASS[3] if l >= 1 else GRASS[2]
        shape = int(rng.integers(0, 3))
        if shape == 0:            # «галочка»
            for px_, py_, c in ((tx, ty, GRASS[1]), (tx - 1, ty, GRASS[1]), (tx + 1, ty, GRASS[1]),
                                (tx, ty - 1, body), (tx - 1, ty - 1, tip), (tx + 1, ty - 1, tip), (tx, ty - 2, tip)):
                gp(px_, py_, c)
        elif shape == 1:          # одиночная травинка
            for px_, py_, c in ((tx, ty, GRASS[1]), (tx, ty - 1, body), (tx, ty - 2, tip)):
                gp(px_, py_, c)
        else:                     # широкий куст травы
            for px_, py_, c in ((tx - 1, ty, GRASS[1]), (tx, ty, GRASS[1]), (tx + 1, ty, GRASS[1]), (tx + 2, ty, GRASS[1]),
                                (tx - 1, ty - 1, body), (tx, ty - 1, tip), (tx + 1, ty - 1, body), (tx + 2, ty - 1, tip),
                                (tx, ty - 2, tip), (tx + 2, ty - 2, GRASS[5])):
                gp(px_, py_, c)
    # цветочки
    for _ in range(70):
        fx, fy = int(rng.integers(ARENA_X, W)), int(rng.integers(2, H - 2))
        if grass[fy, fx] and grass[fy + 1, fx]:
            c = [WHITE[3], GOLD[3], PINK[2], BLUE[3]][int(rng.integers(0, 4))]
            gp(fx, fy, c); gp(fx, fy + 1, GRASS[1])

    # ---------------- земля тропинок
    dn = fbm(W, H, rng, cells=(32, 16, 8, 4), amps=(1, .5, .3, .2))
    dl = np.digitize(dn, [0.32, 0.62])
    for i, c in enumerate([DIRT[1], DIRT[2], DIRT[3]]):
        put(rgb, dirt & (dl == i), c)
    # гравий: светлая точка + тень
    peb = dirt & (rng.random((H, W)) < 0.03)
    put(rgb, shift(peb, 1, 1) & dirt, DIRT[1])
    put(rgb, peb, DIRT[4])
    # камешки 2x2 и 3x2
    for _ in range(int(dirt.sum() / 220)):
        sx_, sy_ = int(rng.integers(ARENA_X, W - 3)), int(rng.integers(0, H - 3))
        if not dirt[sy_:sy_ + 3, sx_:sx_ + 4].all():
            continue
        wd = 2 + int(rng.integers(0, 2))
        rgb[sy_ + 2, sx_ + 1:sx_ + wd + 1] = hx(DIRT[0])[:3]
        rgb[sy_ + 1, sx_ + wd] = hx(DIRT[0])[:3]
        rgb[sy_:sy_ + 2, sx_:sx_ + wd] = hx(STONE[3])[:3]
        rgb[sy_, sx_] = hx(STONE[4])[:3]
        rgb[sy_ + 1, sx_ + wd - 1] = hx(STONE[2])[:3]

    # ---------------- плиты дороги
    slab_gap = np.zeros((H, W), bool)
    # горизонтальная дорога: 2 ряда плит 16x16 со сдвигом
    rx = x - ARENA_X
    row = (y - 270) // 16
    colh = (rx + (row % 2) * 8) // 16
    sxh = (rx + (row % 2) * 8) % 16
    syh = (y - 270) % 16
    # вертикальная: 2 колонки, ряды сдвинуты
    colv = (x - 434) // 16
    rowv = (y + (colv % 2) * 8) // 16
    sxv = (x - 434) % 16
    syv = (y + (colv % 2) * 8) % 16
    lx = np.where(road_h, sxh, sxv)
    ly = np.where(road_h, syh, syv)
    sid = np.where(road_h, row * 1000 + colh, 50000 + colv * 1000 + rowv)
    sn = fbm(W, H, rng, cells=(16, 8, 4), amps=(1, .5, .3))
    put(rgb, road, STONE[3])
    tint = (np.sin(sid * 12.9898) * 43758.5453) % 1.0       # своя яркость у каждой плиты
    put(rgb, road & (sn + tint * 0.4 < 0.55), STONE[2])
    put(rgb, road & (sn + tint * 0.3 > 1.05), STONE[4])
    put(rgb, road & ((lx == 1) | (ly == 1)) & (lx < 15) & (ly < 15), STONE[4])
    put(rgb, road & (lx == 1) & (ly == 1), STONE[5])
    put(rgb, road & ((lx == 14) | (ly == 14)) & (lx > 0) & (ly > 0), STONE[2])
    slab_gap = road & ((lx == 0) | (ly == 0) | (lx == 15) | (ly == 15))
    put(rgb, slab_gap, STONE[1])
    put(rgb, road & ((lx == 0) | (ly == 0)) & (lx < 15) & (ly < 15) & ((lx + ly) % 5 == 0), STONE[0])
    # трещины на некоторых плитах
    for _ in range(26):
        cx_, cy_ = int(rng.integers(ARENA_X, W)), int(rng.integers(0, H))
        if not road[cy_, cx_]:
            continue
        px_, py_ = cx_, cy_
        for k in range(int(rng.integers(3, 7))):
            if 0 <= px_ < W and 0 <= py_ < H and road[py_, px_] and not slab_gap[py_, px_]:
                rgb[py_, px_] = hx(STONE[1])[:3]
                if px_ + 1 < W and road[py_, px_ + 1] and not slab_gap[py_, px_ + 1]:
                    rgb[py_, px_ + 1] = hx(STONE[4])[:3]
            px_ += int(rng.integers(0, 2)); py_ += int(rng.integers(0, 2)) if k % 2 else 1
    # мох в щелях
    moss = slab_gap & (fbm(W, H, rng, cells=(12, 6), amps=(1, .5)) > 0.62)
    put(rgb, moss, GRASS[2])
    put(rgb, moss & (rng.random((H, W)) < 0.3), GRASS[4])

    # ---------------- края: трава выше земли и дороги, отбрасывает тень вниз-вправо
    low = dirt | road
    grass_up = shift(grass, 0, 1)            # над пикселем — трава
    grass_left = shift(grass, 1, 0)
    put(rgb, low & grass_up, DIRT[0] if True else None)
    put(rgb, road & grass_up, STONE[0])
    put(rgb, dirt & grass_left & ~grass_up, DIRT[1])
    put(rgb, road & grass_left & ~grass_up, STONE[1])
    # кромка травы над низиной — светлая
    put(rgb, grass & shift(low, 0, -1) & ~shift(low, 0, 1), GRASS[4])
    # торчащие в землю травинки по краю
    edge = grass & shift(low, 0, -1)
    ys_, xs_ = np.nonzero(edge)
    for i in range(len(xs_)):
        if rng.random() < 0.35:
            gx, gy = xs_[i], ys_[i] + 1
            if gy < H and low[gy, gx]:
                rgb[gy, gx] = hx(GRASS[3])[:3]

    # ---------------- пол комнаты слева: доски
    floor = x < FRAME_X
    plank = y // 11
    off = (np.sin(plank * 7.3) * 0.5 + 0.5) * 90
    seam_x = ((x + off) % 96).astype(int)
    put(rgb, floor, WOOD[2])
    wn = fbm(W, H, rng, cells=(24, 8, 4), amps=(1, .4, .3))
    grain = floor & (((x * 0.0 + y * 1.0 + np.sin(x / 9.0 + plank) * 1.3) % 11).astype(int) % 4 == 2) & (wn > 0.45)
    put(rgb, grain, WOOD[1])
    put(rgb, floor & (wn > 0.86), WOOD[3])
    put(rgb, floor & (y % 11 == 0), WOOD[4])
    put(rgb, floor & (y % 11 == 10), WOOD[0])
    put(rgb, floor & (seam_x == 0) & (y % 11 != 0), WOOD[0])
    put(rgb, floor & (seam_x == 1) & (y % 11 != 0) & (y % 11 != 10), WOOD[3])

    # ---------------- бортик песочницы
    fr = (x >= FRAME_X) & (x < ARENA_X)
    put(rgb, fr, WOOD[3])
    put(rgb, fr & (x == FRAME_X + 1), WOOD[5])
    put(rgb, fr & (x == FRAME_X + 2), WOOD[4])
    put(rgb, fr & (x == ARENA_X - 2), WOOD[2])
    put(rgb, fr & ((y + x * 3) % 37 < 2) & (x > FRAME_X + 2) & (x < ARENA_X - 2), WOOD[2])
    put(rgb, fr & ((x == FRAME_X) | (x == ARENA_X - 1)), OUT)
    # стыки досок бортика и гвозди
    for jy in range(0, H, 90):
        put(rgb, fr & (y == jy), OUT)
        put(rgb, fr & (y == jy + 1), WOOD[4])
        for ny in (jy + 6, jy + 84):
            if 0 <= ny < H:
                rgb[ny, FRAME_X + 4] = hx(METAL[4])[:3]
                rgb[ny + 1 if ny + 1 < H else ny, FRAME_X + 4] = hx(METAL[1])[:3]

    shadow = np.zeros((H, W), bool)
    # тень бортика на арену
    shadow |= arena & (x < ARENA_X + 3)
    shadow |= floor & (x >= FRAME_X - 0) & False
    return rgb, dict(grass=grass, dirt=dirt, road=road, arena=arena, floor=floor, shadow=shadow)
