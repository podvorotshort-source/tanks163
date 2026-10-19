"""Изометрическое превью первого уровня: воксельный мир → пиксель-арт 2:1.

  preview_x4.png    — обычный вид (480×270 ×4);
  preview_x3.png    — после шага отдаления (640×360 ×3);
  preview_phone.png — телефон 20:9 (600×270 ×4) с сенсорным управлением;
  turnaround.png    — танк игрока в 8 направлениях (рендер той же модели).
"""
import os
import sys
import time
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'preview-level1'))
from pal import *                       # noqa: E402
from px import Spr, Scene, hx, grid as grid2d, shift, dilate, m_disc   # noqa: E402
import sprites as S2                    # noqa: E402
import hud                              # noqa: E402
import vox                              # noqa: E402
import models as MD                     # noqa: E402

GX, GY, GZ = 700, 700, 64
T = np.array([340, 340])                # танк игрока
YB = 486                                # бортик песочницы (дальше — пол комнаты)
FACING = {'+x': 0, '+y': 1, '-x': 2, '-y': 3}


def materials():
    M = vox.Materials()
    M.add('soil', DIRT, 2)
    M.add('grass', GRASS, 3); M.add('grass_d', GRASS, 2); M.add('grass_l', GRASS, 4)
    M.add('blade', GRASS, 4, cast=False); M.add('blade_l', GRASS, 5, cast=False); M.add('blade_d', GRASS, 3, cast=False)
    M.add('flower', WHITE, 3, cast=False); M.add('flower_y', GOLD, 3, cast=False); M.add('flower_p', PINK, 2, cast=False)
    M.add('dirt', DIRT, 3); M.add('dirt_d', DIRT, 2); M.add('dirt_l', DIRT, 4); M.add('pebble', STONE, 4, cast=False)
    M.add('stone', STONE, 4); M.add('stone_d', STONE, 3); M.add('stone_l', STONE, 5); M.add('stone_gap', STONE, 2)
    M.add('moss', GRASS, 2, cast=False)
    M.add('wood', WOOD, 4); M.add('wood_d', WOOD, 3); M.add('wood_l', WOOD, 5)
    M.add('floor', WOOD, 3); M.add('floor_d', WOOD, 2); M.add('floor_l', WOOD, 4)
    M.add('water', WATER, 3, cast=False); M.add('water_d', WATER, 2, cast=False); M.add('water_l', WATER, 4, cast=False)
    M.add('water_ll', WATER, 5, cast=False)
    M.add('brick', BRICK, 4); M.add('brick2', BRICK, 3); M.add('mortar', BRICK, 2)
    M.add('metal', METAL, 4); M.add('metal_d', METAL, 3); M.add('metal_l', METAL, 5)
    M.add('navy', NAVY, 3); M.add('navy_d', NAVY, 2)
    M.add('yellow', YEL, 4); M.add('yellow_l', YEL, 5); M.add('yellow_d', YEL, 3)
    M.add('track', METAL, 2); M.add('track_d', METAL, 1)
    M.add('glow', BLUE, 3, emissive=True)
    M.add('red', RED, 4); M.add('red_l', RED, 5); M.add('red_d', RED, 3)
    M.add('white', WHITE, 3); M.add('pip', RED, 3)
    M.add('fire_glow', FIRE, 4, emissive=True)
    M.add('burnt', SMOKE, 2); M.add('burnt_d', SMOKE, 1); M.add('ember', FIRE, 3, emissive=True)
    M.add('rotor', WHITE, 2, cast=False)
    M.add('leaf', LEAF, 3); M.add('leaf_d', LEAF, 2); M.add('leaf_l', LEAF, 4); M.add('berry', RED, 4)
    M.add('hazard', GOLD, 3); M.add('gold', GOLD, 3); M.add('blue', BLUE, 2)
    M.add('gem', BLUE, 3, emissive=True); M.add('gem_g', GOLD, 3, emissive=True); M.add('gem_l', LEAF, 4, emissive=True)
    M.add('lily', LEAF, 4, cast=False)
    return M


def fbm2(w, h, rng, cells=(64, 32, 16, 8), amps=(1, .55, .3, .16)):
    n = np.zeros((w, h), np.float32)
    for c, a in zip(cells, amps):
        g = rng.random((w // c + 3, h // c + 3)).astype(np.float32)
        im = Image.fromarray(g, 'F').resize(((h // c + 3) * c, (w // c + 3) * c), Image.BICUBIC)
        n += a * np.array(im)[c:c + w, c:c + h]
    n -= n.min()
    return n / n.max()


def seg_dist(x, y, a, b):
    ax, ay = a; bx, by = b
    vx, vy = bx - ax, by - ay
    t = np.clip(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(x - (ax + t * vx), y - (ay + t * vy))


def build_ground(M, rng):
    X, Y = np.meshgrid(np.arange(GX), np.arange(GY), indexing='ij')
    Hm = np.full((GX, GY), 8, np.int32)
    top = np.full((GX, GY), M['grass'], np.uint8)
    side = np.full((GX, GY), M['soil'], np.uint8)
    arena = Y < YB - 4
    frame = (Y >= YB - 4) & (Y < YB)
    floor = Y >= YB

    # трава: три тона по шуму
    n = fbm2(GX, GY, rng)
    fine = rng.random((GX, GY))
    v = n + (fine - 0.5) * 0.06
    top[arena & (v < 0.40)] = M['grass_d']
    top[arena & (v > 0.66)] = M['grass_l']

    # тропинки (на 1 воксель ниже травы)
    warp = (fbm2(GX, GY, rng, cells=(32, 16, 8), amps=(1, .5, .25)) - .5) * 16
    tx, ty = T
    d = np.minimum.reduce([
        seg_dist(X, Y, (tx - 260, ty - 30), (tx - 120, ty + 6)) - 9,
        seg_dist(X, Y, (tx - 120, ty + 6), (tx + 90, ty - 4)) - 11,
        seg_dist(X, Y, (tx, ty), (tx + 10, ty + 140)) - 8,
        np.hypot(X - tx, Y - ty) - 30,
        seg_dist(X, Y, (tx + 122, ty - 60), (tx + 300, ty - 90)) - 7,
    ])
    dirt = arena & (d + warp < 0)
    dn = fbm2(GX, GY, rng, cells=(16, 8, 4), amps=(1, .5, .3))
    Hm[dirt] = 7
    top[dirt] = M['dirt']
    top[dirt & (dn < 0.35)] = M['dirt_d']
    top[dirt & (dn > 0.68)] = M['dirt_l']

    # дорога из плит: полоса вдоль y и вдоль x
    road = arena & (((X >= tx + 90) & (X < tx + 126)) | ((Y >= ty - 154) & (Y < ty - 118)))
    gap = road & ((X % 12 == 0) | (Y % 12 == 0))
    Hm[road] = 8
    tile_id = (X // 12) * 7919 + (Y // 12) * 104729
    tint = (np.sin(tile_id * 0.0137) * 43758.5) % 1.0
    top[road] = M['stone']
    top[road & (tint < 0.3)] = M['stone_d']
    top[road & (tint > 0.85)] = M['stone_l']
    # фаска плиты: светлый верхний-левый край
    top[road & ~gap & ((X % 12 == 1) | (Y % 12 == 1))] = M['stone_l']
    Hm[gap] = 7
    top[gap] = M['stone_gap']
    top[gap & (fbm2(GX, GY, rng, cells=(12, 6), amps=(1, .5)) > 0.62)] = M['moss']

    # пруд
    pc = (tx - 130, ty - 46)
    pr = ((X - pc[0]) / 34) ** 2 + ((Y - pc[1]) / 24) ** 2
    pond = pr <= 1
    Hm[pond] = 6
    top[pond] = M['water']
    top[pond & (pr > 0.72)] = M['water_d']
    rip = rng.random((GX, GY))
    top[pond & (pr < 0.6) & (rip < 0.02)] = M['water_l']
    # блики-рябь: короткие штрихи вдоль x
    for (a, b, l) in ((-14, 8, 6), (6, 12, 5), (-2, -8, 7), (16, -4, 4), (-22, -2, 3)):
        sel = (X >= pc[0] + a) & (X < pc[0] + a + l) & (Y == pc[1] + b) & pond
        top[sel] = M['water_ll']
        top[shift(sel, 0, 1) & pond] = M['water_l']

    # бортик и пол комнаты
    Hm[frame] = 12
    top[frame] = M['wood_l']; side[frame] = M['wood']
    top[frame & (X % 90 < 2)] = M['wood_d']
    Hm[floor] = 2
    plank = (Y - YB) // 9
    off = (np.sin(plank * 7.3) * 0.5 + 0.5) * 60
    top[floor] = M['floor']
    top[floor & (((X + off) % 70) < 1)] = M['floor_d']
    top[floor & ((Y - YB) % 9 == 0)] = M['floor_d']
    top[floor & ((Y - YB) % 9 == 1) & (fbm2(GX, GY, rng, cells=(16, 8), amps=(1, .5)) > 0.5)] = M['floor_l']
    side[floor] = M['floor_d']

    grid = np.zeros((GX, GY, GZ), np.uint8)
    Z = np.arange(GZ)[None, None, :]
    below = Z < (Hm[..., None] - 1)
    grid[below] = np.broadcast_to(side[..., None], grid.shape)[below]
    at = Z == (Hm[..., None] - 1)
    grid[at] = np.broadcast_to(top[..., None], grid.shape)[at]

    # травинки над травой
    grass = arena & ~dirt & ~road & ~pond
    r = rng.random((GX, GY))
    bl = grass & (r < 0.09)
    hb = Hm[bl]
    xs, ys = np.nonzero(bl)
    mats = np.where(rng.random(xs.size) < 0.5, M['blade'], M['blade_l'])
    mats = np.where(v[xs, ys] < 0.4, M['blade_d'], mats)
    grid[xs, ys, hb] = mats
    tall = rng.random(xs.size) < 0.25
    grid[xs[tall], ys[tall], hb[tall] + 1] = M['blade_l']
    # цветочки
    fl = grass & (r > 0.9985)
    xs, ys = np.nonzero(fl)
    grid[xs, ys, Hm[xs, ys]] = rng.choice([M['flower'], M['flower_y'], M['flower_p']], xs.size)
    # камешки на тропинках
    pb = dirt & (r > 0.97)
    xs, ys = np.nonzero(pb)
    grid[xs, ys, Hm[xs, ys]] = M['pebble']
    # кувшинки
    for (a, b, rr) in ((-18, 4, 3.2), (-10, 10, 2.4), (14, -9, 3.4), (22, 6, 2.6), (4, -14, 2.4)):
        sel = (np.hypot(X - pc[0] - a, Y - pc[1] - b) <= rr) & pond
        grid[sel, 6] = M['lily']
    return grid, Hm, pc


def stamp(grid, ids, m, cx, cy, z, face='+x', oid=1):
    r = np.rot90(m, FACING[face], axes=(0, 1))
    sx, sy, sz = r.shape
    x0, y0 = int(cx - sx // 2), int(cy - sy // 2)
    sub = grid[x0:x0 + sx, y0:y0 + sy, z:z + sz]
    msk = r[:sub.shape[0], :sub.shape[1], :sub.shape[2]] > 0
    sub[msk] = r[:sub.shape[0], :sub.shape[1], :sub.shape[2]][msk]
    ids[x0:x0 + sx, y0:y0 + sy, z:z + sz][msk] = oid


def build_world():
    rng = np.random.default_rng(7)
    M = materials()
    grid, Hm, pc = build_ground(M, rng)
    ids = np.zeros(grid.shape, np.uint16)
    tx, ty = T
    nid = [10]

    def put(m, x, y, face='+x', z=None, oid=None):
        x, y = int(x), int(y)
        if z is None:
            z = int(Hm[x, y])
        if oid is None:
            nid[0] += 1
            oid = nid[0]
        stamp(grid, ids, m, x, y, z, face, oid)
        return oid

    # бортик — тоже объект (с контуром)
    ids[:, YB - 4:YB, :12][grid[:, YB - 4:YB, :12] > 0] = 2

    # камни вокруг пруда
    for i in range(34):
        a = i / 34 * 6.283 + rng.random() * 0.08
        x = pc[0] + np.cos(a) * 36
        y = pc[1] + np.sin(a) * 26
        st = np.zeros((9, 9, 7), np.uint8)
        MD.sphere(st, 4.5, 4.5, 2.0, 3.4 + rng.random() * 1.2, M['stone'], sz=0.8)
        MD.sphere(st, 4.0, 4.0, 3.2, 2.2, M['stone_l'], sz=0.8)
        put(st, x, y, z=6, oid=3)

    # игрушки на полу комнаты
    put(MD.die(M), tx + 8, YB + 40)
    put(MD.ball(M), tx + 110, YB + 70, z=2)

    # кирпичные укрытия
    for (dx, dy, sd) in ((-96, 70, 1), (-80, 70, 2), (-96, 86, 3), (40, -96, 4), (56, -96, 5), (72, -96, 6),
                         (150, 10, 7), (150, 26, 8), (-40, -140, 9)):
        put(MD.brick_block(M, seed=sd), tx + dx, ty + dy)
    # ящики
    for (dx, dy) in ((-60, 118), (-44, 118), (-60, 134), (160, 110), (-150, 60), (60, 90)):
        put(MD.crate(M), tx + dx, ty + dy)
    # кусты
    for (dx, dy, r, sd) in ((-30, -70, 7, 1), (-180, -120, 9, 2), (40, 60, 6, 3), (-110, 150, 8, 4), (190, -40, 8, 5),
                            (-200, 40, 7, 6), (100, 140, 6, 7), (20, -200, 9, 8), (-150, -10, 6, 9), (230, 60, 9, 10),
                            (-60, 20, 5, 11)):
        put(MD.bush(M, r, sd), tx + dx, ty + dy)
    # бочки
    for (dx, dy) in ((130, 60), (132, 72), (144, 64), (80, -128)):
        put(MD.barrel(M), tx + dx, ty + dy)
    # подбираемое (парит над землёй)
    for (dx, dy, g) in ((40, 20, 'gem'), (52, 12, 'gem'), (34, 36, 'gem_g'), (-40, -30, 'gem'), (70, 40, 'gem_l')):
        put(MD.gem(M, g), tx + dx, ty + dy, z=int(Hm[tx + dx, ty + dy]) + 3)
    put(MD.medkit(M), tx - 70, ty + 60)

    # враги
    put(MD.enemy_tank(M), tx + 40, ty - 130, face='+y')
    put(MD.enemy_tank(M), tx + 110, ty - 40, face='-x')
    put(MD.enemy_tank(M), tx + 170, ty - 120, face='+y')
    put(MD.enemy_tank(M, burnt=True), tx - 80, ty + 30, face='+x')
    put(MD.drone(M), tx - 70, ty - 60, z=28)
    put(MD.drone(M), tx + 60, ty + 70, z=30)
    # игрок: нос в −y (на экране — вверх-вправо)
    put(MD.player_tank(M), tx, ty, face='-y', z=8)
    return grid, ids, M


# ---------------------------------------------------------------- эффекты (2D поверх)

def line21(n, thick, ramp):
    """Снаряд вдоль изо-диагонали вверх-вправо (2:1)."""
    s = Spr(n + 4, n // 2 + 6)
    pts = [(2 + k, s.h - 3 - k // 2) for k in range(n)]
    core = np.zeros((s.h, s.w), bool)
    for (x, y) in pts:
        core[y, x] = True
    body = dilate(core) if thick else core
    s.paint(dilate(body, True), ramp[1])
    s.paint(body, ramp[2])
    s.paint(core, ramp[3])
    for (x, y) in pts[n // 2:]:
        s.px(x, y, ramp[4])
    return s


def fx(img, C, W, H):
    sc = Scene(W, H)
    sc.rgb = img
    tx, ty = T
    P = lambda x, y, z: vox.project(x, y, z, C, W, H)     # noqa: E731
    lights = []
    # залп игрока: ствол смотрит в −y
    mx, my = P(tx + 0.5, ty - 25, 21)
    star = Spr(13, 11)
    star.poly([(0, 5), (6, 3), (12, 5), (6, 7)], BLUE[2]); star.poly([(6, 0), (8, 5), (6, 10), (4, 5)], BLUE[2])
    star.poly([(3, 5), (6, 4), (9, 5), (6, 6)], BLUE[4]); star.px(6, 5, WHITE[3])
    sc.blit_c(star, mx, my)
    lights.append((mx, my, 18, BLUE[2], 0.45))
    for k, dist in enumerate((16, 34, 52)):
        bx, by = P(tx + 0.5, ty - 25 - dist, 21 - k * 0.6)
        b = line21(12, True, BLUE)
        sc.blit_c(b, bx, by)
        lights.append((bx, by, 11, BLUE[2], 0.4))
    # взрыв врага, в которого попали
    ex, ey = P(tx + 4, ty - 100, 14)
    for (dx, dy, r, sd) in ((-14, -12, 7, 1), (10, -16, 6, 2), (-2, -22, 8, 3), (16, -2, 5, 4)):
        sc.blit_c(S2.smoke_puff(r, sd), ex + dx, ey + dy)
    sc.blit_c(S2.explosion(1, 17), ex, ey)
    lights.append((ex, ey, 64, FIRE[3], 0.55)); lights.append((ex, ey, 28, FIRE[5], 0.35))
    for i in range(10):
        a = i * 0.63 + 0.3
        sc.blit_c(S2.debris(i), ex + np.cos(a) * (26 + i % 3 * 5), ey + np.sin(a) * (20 + i % 4 * 4))
    # вражеские пули: летят к игроку (на экране — вниз-влево)
    for (x0, y0) in ((tx + 40, ty - 112), (tx + 92, ty - 40)):
        for k in range(2):
            bx, by = P(x0 - (0 if x0 == tx + 40 else 14 + k * 16), y0 + (16 + k * 16 if x0 == tx + 40 else 0), 10)
            b = line21(6, False, FIRE).flip_x()
            b = Spr(b.w, b.h); b.a = line21(6, False, FIRE).a[::-1, ::-1].copy()
            sc.blit_c(b, bx, by)
            lights.append((bx, by, 11, FIRE[3], 0.45))
    # дым над обломками
    wx, wy = P(tx - 80, ty + 30, 14)
    for (dx, dy, r, sd) in ((0, -8, 5, 11), (5, -18, 6, 12), (-1, -30, 7, 13)):
        sc.blit_c(S2.smoke_puff(r, sd), wx + dx, wy + dy, alpha=0.85)
    lights.append((wx, wy, 22, FIRE[2], 0.35))
    # кристаллы и фары
    for (dx, dy, c) in ((40, 20, BLUE), (52, 12, BLUE), (34, 36, GOLD), (-40, -30, BLUE), (70, 40, LEAF)):
        gx, gy = P(tx + dx, ty + dy, 13)
        lights.append((gx, gy, 9, c[2], 0.4))
    # роторы дронов: полупрозрачные диски (горизонтальный круг → эллипс 2:1)
    for (dx, dy, dz) in ((-70, -60, 28), (60, 70, 30)):
        for (a, c) in ((-8, -8), (8, -8), (-8, 8), (8, 8)):
            rx_, ry_ = P(tx + dx + a, ty + dy + c, dz + 6)
            ex_ = Spr(17, 9)
            yy, xx = np.mgrid[0:9, 0:17]
            d = ((xx - 8) / 7.2) ** 2 + ((yy - 4) / 3.6) ** 2
            ex_.a[d <= 1] = hx(WHITE[2], 70)
            ex_.a[(d <= 1) & (d > 0.62)] = hx(WHITE[3], 150)
            ex_.a[(np.abs(yy - 4) < 1) & (np.abs(xx - 8) < 7)] = hx(WHITE[3], 190)
            sc.blit_c(ex_, rx_, ry_)
    hx_, hy_ = P(tx, ty - 16, 17)
    lights.append((hx_, hy_, 12, BLUE[2], 0.3))
    sc.add_light(lights, levels=5)
    return sc.rgb


def render_view(grid, ids, M, W, H):
    C = np.array([T[0], T[1], 8.0])
    t0 = time.time()
    img, info = vox.render(grid, ids, M, C, W, H)
    img = fx(img, C, W, H)
    print(f'  {W}x{H}: {time.time() - t0:.1f}s')
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')


def turnaround(M):
    """Танк игрока в 8 направлениях: 4 прямых + 4 диагональных (модель повёрнута до вокселизации)."""
    tank = MD.player_tank(M)
    out = []
    for ang in range(0, 360, 45):
        g = np.zeros((90, 90, 24), np.uint8)
        i = np.zeros(g.shape, np.uint16)
        if ang % 90 == 0:
            stamp(g, i, tank, 45, 45, 1, ['+x', '+y', '-x', '-y'][ang // 90], 5)
        else:
            # поворот на 45°: обратное отображение с выборкой ближайшего вокселя
            a = np.radians(ang)
            X, Y = np.meshgrid(np.arange(90) + 0.5 - 45, np.arange(90) + 0.5 - 45, indexing='ij')
            u = X * np.cos(a) + Y * np.sin(a) + tank.shape[0] / 2
            v = -X * np.sin(a) + Y * np.cos(a) + tank.shape[1] / 2
            ui, vi = np.floor(u).astype(int), np.floor(v).astype(int)
            ok = (ui >= 0) & (ui < tank.shape[0]) & (vi >= 0) & (vi < tank.shape[1])
            g[ok, 1:1 + tank.shape[2]] = tank[ui[ok], vi[ok], :]
            i[g > 0] = 5
        img, _ = vox.render(g, i, M, np.array([45.0, 45.0, 4.0]), 76, 64)
        bg = (img.sum(-1) == 0)
        rgba = np.dstack([np.clip(img, 0, 255).astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)])
        out.append(rgba)
    sheet = np.zeros((64, 76 * 8, 4), np.uint8)
    for k, im in enumerate(out):
        sheet[:, k * 76:(k + 1) * 76] = im
    bgc = np.zeros_like(sheet); bgc[..., :3] = hx(GRASS[2])[:3]; bgc[..., 3] = 255
    a = sheet[..., 3:4] / 255.0
    comp = (sheet[..., :3] * a + bgc[..., :3] * (1 - a)).astype(np.uint8)
    Image.fromarray(comp, 'RGB').resize((76 * 8 * 4, 64 * 4), Image.NEAREST).save(os.path.join(HERE, 'turnaround.png'))


def main():
    t0 = time.time()
    grid, ids, M = build_world()
    print(f'мир: {time.time() - t0:.1f}s')
    v4 = render_view(grid, ids, M, 480, 270).convert('RGBA')
    v4.save(os.path.join(HERE, 'world_480.png'))
    hud.draw_pc(v4)
    v4.resize((1920, 1080), Image.NEAREST).save(os.path.join(HERE, 'preview_x4.png'))

    v3 = render_view(grid, ids, M, 640, 360).convert('RGBA').resize((1920, 1080), Image.NEAREST)
    ui = Image.new('RGBA', (480, 270), (0, 0, 0, 0))
    hud.draw_pc(ui, level=7, time='06:48', hp=0.62, xp=0.35, zoom_note=True)
    v3.alpha_composite(ui.resize((1920, 1080), Image.NEAREST))
    v3.save(os.path.join(HERE, 'preview_x3.png'))

    ph = render_view(grid, ids, M, 600, 270).convert('RGBA')
    hud.draw_phone(ph)
    ph.resize((2400, 1080), Image.NEAREST).save(os.path.join(HERE, 'preview_phone.png'))

    turnaround(M)
    print(f'всего: {time.time() - t0:.1f}s')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'quick':
        grid, ids, M = build_world()
        render_view(grid, ids, M, 480, 270).save(os.path.join(HERE, 'quick.png'))
        Image.open(os.path.join(HERE, 'quick.png')).resize((1920, 1080), Image.NEAREST).save(os.path.join(HERE, 'quick_x4.png'))
    else:
        main()
