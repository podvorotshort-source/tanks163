"""Препятствия ступени I «Игрушечный полигон» и игрушки детской (видны при отъезде ×24).
blender -b --factory-startup -P models3d/props_t1/build.py [-- --nobake] [-- --only brick,steel]
Каждая модель — отдельный .glb (один узел 'prop', начало координат — центр основания).
Размеры — из игры: блок укрытия ≈ танк (26 px ≈ 3.7 м), куст 44 px ≈ 6.3 м, пруд 80×60 px ≈ 11.4×8.6 м.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '.claude', 'skills', 'lowpoly-3d', 'scripts'))
import lp  # noqa: E402

NOBAKE = '--nobake' in sys.argv
ONLY = None
if '--only' in sys.argv:
    ONLY = sys.argv[sys.argv.index('--only') + 1].split(',')


def want(name):
    return ONLY is None or name in ONLY


def brick():
    lp.reset()
    P = lp.Part('prop')
    S, H = 3.7, 3.7
    rnd = random.Random(3)
    P.box((S - 0.3, S - 0.3, H - 0.25), (0, 0, (H - 0.25) / 2), 'mortar', bevel=0.04, segs=1)
    rows, gap = 4, 0.07
    rh = (H - 0.3) / rows
    n = 3
    bl = S / n
    for r in range(rows):
        z = r * rh + rh / 2
        off = (bl / 2) * (r % 2)
        for side in range(4):
            for i in range(n + 1):
                c = -S / 2 + i * bl + off - bl / 2 + bl / 2
                c0, c1 = max(-S / 2, c - bl / 2 + gap / 2), min(S / 2, c + bl / 2 - gap / 2)
                if c1 - c0 < 0.25:
                    continue
                ln, mid = c1 - c0, (c0 + c1) / 2
                m = 'brick' if rnd.random() < 0.6 else 'brick2'
                if side >= 2:                       # углы занимают боковины по X — без наложения граней
                    c0, c1 = max(c0, -S / 2 + 0.42), min(c1, S / 2 - 0.42)
                    if c1 - c0 < 0.25:
                        continue
                    ln, mid = c1 - c0, (c0 + c1) / 2
                if side == 0:
                    P.box((0.4, ln, rh - gap), (S / 2 - 0.2, mid, z), m, bevel=0.06, segs=1)
                elif side == 1:
                    P.box((0.4, ln, rh - gap), (-S / 2 + 0.2, -mid, z), m, bevel=0.06, segs=1)
                elif side == 2:
                    P.box((ln, 0.4, rh - gap), (-mid, S / 2 - 0.2, z), m, bevel=0.06, segs=1)
                else:
                    P.box((ln, 0.4, rh - gap), (mid, -S / 2 + 0.2, z), m, bevel=0.06, segs=1)
    # верх: кирпичи «ёлочкой» рядами
    tz = H - 0.15
    rws = 5
    w = S / rws
    for j in range(rws):
        off = (S / 4) * (j % 2)
        k = 2
        for i in range(-1, k + 1):
            c = -S / 2 + i * (S / k) + off
            c0, c1 = max(-S / 2, c + gap / 2), min(S / 2, c + S / k - gap / 2)
            if c1 - c0 < 0.3:
                continue
            m = 'brick' if rnd.random() < 0.6 else 'brick2'
            P.box((c1 - c0, w - gap, 0.3), ((c0 + c1) / 2, -S / 2 + w * j + w / 2, tz), m, bevel=0.06, segs=1)
    lp.finish([P], HERE, 'prop_brick', bake=not NOBAKE, size=1024)


def steel():
    lp.reset()
    P = lp.Part('prop')
    S = 3.7
    P.box((S, S, S - 0.1), (0, 0, (S - 0.1) / 2), 'steel', bevel=0.14, segs=1)
    # утопленная крышка с крестом и болтами
    P.box((S - 0.9, S - 0.9, 0.12), (0, 0, S - 0.1), 'steel_d', bevel=0.05, segs=1)
    P.box((S - 1.2, 0.36, 0.1), (0, 0, S - 0.02), 'steel', bevel=0.04, segs=1, rot=(0, 0, math.pi / 4))
    P.box((S - 1.2, 0.36, 0.1), (0, 0, S - 0.02), 'steel', bevel=0.04, segs=1, rot=(0, 0, -math.pi / 4))
    for (x, y) in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        P.cyl(0.16, 0.12, (x * (S / 2 - 0.3), y * (S / 2 - 0.3), S - 0.06), 'steel_d', verts=8, bevel=0.03, segs=1)
    # накладки на боках с болтами
    for ax in range(4):
        a = ax * math.pi / 2
        cx, cy = math.cos(a) * (S / 2 + 0.03), math.sin(a) * (S / 2 + 0.03)
        P.box((0.1, S - 1.0, S - 1.3), (cx, cy, S / 2 - 0.05), 'steel_d', bevel=0.04, segs=1, rot=(0, 0, a))
        for (u, v) in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
            ox, oy = -math.sin(a) * u * (S / 2 - 0.75), math.cos(a) * u * (S / 2 - 0.75)
            P.cyl(0.11, 0.1, (cx + math.cos(a) * 0.06 + ox, cy + math.sin(a) * 0.06 + oy, S / 2 - 0.05 + v * (S / 2 - 0.9)),
                  'steel', axis='x' if ax % 2 == 0 else 'y', verts=8, bevel=0.02, segs=1)
    lp.finish([P], HERE, 'prop_steel', bake=not NOBAKE, size=1024)


def bush(seed=1, name='prop_bush'):
    lp.reset()
    P = lp.Part('prop')
    rnd = random.Random(seed)
    blobs = [(0, 0, 1.55, 1.9)]
    for k in range(6):
        a = k / 6 * 2 * math.pi + rnd.random() * 0.4
        d = 1.6 + rnd.random() * 0.5
        blobs.append((math.cos(a) * d, math.sin(a) * d, 1.0 + rnd.random() * 0.4, 1.15 + rnd.random() * 0.35))
    for k in range(3):
        a = rnd.random() * 2 * math.pi
        blobs.append((math.cos(a) * 0.8, math.sin(a) * 0.8, 2.3 + rnd.random() * 0.3, 1.05))
    for (x, y, z, r) in blobs:
        P.sphere(r, (x, y, z), 'leaf' if rnd.random() < 0.6 else 'leaf_d', subdiv=2, scale=(1, 1, 0.85),
                 rot=(rnd.random(), rnd.random(), rnd.random()))
    # ягоды
    for k in range(6):
        a = rnd.random() * 2 * math.pi
        P.sphere(0.16, (math.cos(a) * 2.2, math.sin(a) * 2.2, 1.4 + rnd.random() * 0.8), 'red', subdiv=1)
    lp.finish([P], HERE, name, bake=not NOBAKE, size=1024)


def pond():
    lp.reset()
    P = lp.Part('prop')
    W, D = 11.4, 8.6
    P.box((W - 0.6, D - 0.6, 0.2), (0, 0, -0.35), 'mud', bevel=0.1, segs=1)
    rnd = random.Random(5)
    n = 44
    for i in range(n):
        t = i / n * 2 * math.pi
        # скруглённый прямоугольник (суперэллипс)
        c, s = math.cos(t), math.sin(t)
        x = (W / 2 - 0.35) * math.copysign(abs(c) ** 0.5, c)
        y = (D / 2 - 0.35) * math.copysign(abs(s) ** 0.5, s)
        r = 0.6 + rnd.random() * 0.25
        P.sphere(r, (x, y, 0.05), 'stone', subdiv=1, scale=(1.15, 1.0, 0.65), rot=(0, 0, rnd.random() * 3))
    lp.finish([P], HERE, 'prop_pond', bake=not NOBAKE, size=1024)


# ------------------------------------------------------------- игрушки детской (масштаб задаёт игра)

def block(color, name):
    lp.reset()
    P = lp.Part('prop')
    P.box((1, 1, 1), (0, 0, 0.5), 'paper', bevel=0.09, segs=1)
    for ax, n, c in (('+x', (1, 0, 0), (0.5, 0, 0.5)), ('-x', (-1, 0, 0), (-0.5, 0, 0.5)), ('+y', (0, 1, 0), (0, 0.5, 0.5)),
                     ('-y', (0, -1, 0), (0, -0.5, 0.5)), ('+z', (0, 0, 1), (0, 0, 1.0))):
        size = tuple(0.08 if n[i] else 0.74 for i in range(3))
        P.box(size, c, color, bevel=0.03, segs=1)
        P.star(0.24, tuple(c[i] + n[i] * 0.04 for i in range(3)), ax, 'paper', depth=0.03, inner=0.45)
    lp.finish([P], HERE, name, bake=not NOBAKE, size=512)


def crayon(color, name):
    lp.reset()
    P = lp.Part('prop')
    L = 6.0
    P.cyl(0.45, L, (0, 0, 0.45), color, axis='x', verts=6, bevel=0.04, segs=1)
    P.cyl(0.47, 3.2, (-0.4, 0, 0.45), 'paper', axis='x', verts=6, bevel=0.03, segs=1)
    for x in (-1.9, 1.1):
        P.cyl(0.48, 0.18, (x, 0, 0.45), color, axis='x', verts=6, bevel=0.02, segs=1)
    P.cyl(0.45, 1.0, (L / 2 + 0.5, 0, 0.45), color, axis='x', verts=6, r2=0.12, bevel=0.02, segs=1)
    lp.finish([P], HERE, name, bake=not NOBAKE, size=512)


def ball():
    lp.reset()
    P = lp.Part('prop')
    cols = ['red', 'yellow', 'blue', 'paper', 'red', 'green']

    def seg(c):
        a = math.atan2(c.y, c.x)
        if abs(c.z) > 0.92:
            return 'paper'
        return cols[int((a + math.pi) / (2 * math.pi) * 6) % 6]
    P.sphere(1.0, (0, 0, 1.0), 'red', subdiv=3, colors=seg, smooth=True)
    lp.finish([P], HERE, 'toy_ball', bake=not NOBAKE, size=512)


def book(color, name):
    lp.reset()
    P = lp.Part('prop')
    P.box((7, 5, 0.18), (0, 0, 0.09), color, bevel=0.06, segs=1)
    P.box((6.7, 4.7, 0.9), (0.1, 0, 0.6), 'paper', bevel=0.04, segs=1)
    P.box((7, 5, 0.18), (0, 0, 1.11), color, bevel=0.06, segs=1)
    P.box((0.4, 5.02, 1.2), (-3.4, 0, 0.6), color, bevel=0.08, segs=1)
    P.box((3.2, 0.06, 0.5), (0.6, -2.5, 1.1), 'yellow', bevel=0.02, segs=1)
    lp.finish([P], HERE, name, bake=not NOBAKE, size=512)


if want('brick'): brick()
if want('steel'): steel()
if want('bush'): bush()
if want('pond'): pond()
if want('toys'):
    block('red', 'toy_block_red'); block('blue', 'toy_block_blue'); block('green', 'toy_block_green')
    crayon('red', 'toy_crayon_red'); crayon('blue', 'toy_crayon_blue'); crayon('green', 'toy_crayon_green')
    ball()
    book('blue', 'toy_book_blue'); book('purple', 'toy_book_purple')
