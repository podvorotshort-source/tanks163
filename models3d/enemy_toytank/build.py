"""Враг ступени I «Игрушечный танк» (toyTank): красная заводная игрушка. Запуск:
blender -b --factory-startup -P models3d/enemy_toytank/build.py [-- --nobake]
Узлы: hull, turret (вращается вокруг своей оси).
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '.claude', 'skills', 'lowpoly-3d', 'scripts'))
import lp  # noqa: E402

NOBAKE = '--nobake' in sys.argv
lp.reset()

TX = -0.12
Z0, Z1 = 1.3, 1.68
hull = lp.Part('hull')
turret = lp.Part('turret', pivot=(TX, 0, Z0), parent=hull)

# ---------------------------------------------------------------- гусеницы и 3 катка
TRACK_Y, TRACK_W = 0.8, 0.56
RE, ZC, RR = 1.05, 0.42, 0.42
for side in (-1, 1):
    y = side * TRACK_Y
    straight = 2 * RE
    per = 2 * straight + 2 * math.pi * RR
    n = 30
    link = per / n * 1.06                                   # траки внахлёст — лента без просветов
    for i in range(n):
        s = (i + 0.5) / n * per
        if s < straight:
            x, z, nx, nz = -RE + s, ZC - RR, 0, -1
        elif s < straight + math.pi * RR:
            a = (s - straight) / RR - math.pi / 2
            x, z = RE + math.cos(a) * RR, ZC + math.sin(a) * RR
            nx, nz = math.cos(a), math.sin(a)
        elif s < 2 * straight + math.pi * RR:
            x, z, nx, nz = RE - (s - straight - math.pi * RR), ZC + RR, 0, 1
        else:
            a = (s - 2 * straight - math.pi * RR) / RR + math.pi / 2
            x, z = -RE + math.cos(a) * RR, ZC + math.sin(a) * RR
            nx, nz = math.cos(a), math.sin(a)
        tang = math.atan2(nz, nx) - math.pi / 2
        hull.box((link, TRACK_W, 0.11), (x, y, z), 'rubber', bevel=0.025, segs=1, rot=(0, -tang, 0))
        hull.box((0.09, TRACK_W * 0.5, 0.05), (x + nx * 0.07, y, z + nz * 0.07), 'rubber', bevel=0.015, segs=1, rot=(0, -tang, 0))
    # 4 катка стоят на нижней ветви ленты (низ катка = внутренняя поверхность трака)
    WR = 0.33
    for wx in (-1.04, -0.35, 0.35, 1.04):
        hull.cyl(WR, 0.44, (wx, y, 0.055 + WR), 'white', axis='y', verts=14, bevel=0.03, segs=1)
        hull.cyl(0.15, 0.5, (wx, y, 0.055 + WR), 'red', axis='y', verts=10, bevel=0.02, segs=1)
        hull.cyl(0.06, 0.56, (wx, y, 0.055 + WR), 'dark', axis='y', verts=8, bevel=0.01, segs=1)

# ---------------------------------------------------------------- корпус
hull.box((2.4, 1.04, 0.6), (0, 0, 0.58), 'dark', bevel=0.04, segs=1)
hull.prism([(-1.48, 0.82), (1.4, 0.82), (1.58, 0.9), (1.6, 1.08), (1.28, Z0), (-1.32, Z0), (-1.52, 1.06)], -0.98, 0.98, 'red', bevel=0.05, segs=1)
# белые гоночные полосы по крыше
for y in (-0.3, 0.3):
    hull.box((2.4, 0.16, 0.03), (-0.05, y, Z0 + 0.01), 'white', bevel=0.01, segs=1)
    hull.box((0.4, 0.16, 0.03), (1.44 + 0.57 * 0.012, y, 1.19 + 0.82 * 0.012), 'white', bevel=0.01, segs=1, rot=(0, 0.6, 0))
# фары-«глаза»
for y in (-0.62, 0.62):
    hull.box((0.08, 0.3, 0.16), (1.62, y, 0.99), 'dark', bevel=0.02, segs=1)
    hull.box((0.03, 0.22, 0.1), (1.66, y, 0.99), 'lamp', bevel=0.008, segs=1)
# заводной ключ сзади
hull.cyl(0.06, 0.4, (-1.65, 0, 1.0), 'gold', axis='x', verts=10, bevel=0.01, segs=1)
hull.cyl(0.1, 0.06, (-1.52, 0, 1.0), 'gold', axis='x', verts=12, bevel=0.01, segs=1)
for y in (-0.19, 0.19):
    hull.torus(0.15, 0.055, (-1.88, y, 1.0), 'gold', axis='x', segs=(16, 8))
hull.box((0.08, 0.16, 0.12), (-1.88, 0, 1.0), 'gold', bevel=0.02, segs=1)

# ---------------------------------------------------------------- башня-купол
turret.cyl(0.68, 0.26, (TX, 0, Z0 + 0.13), 'red', verts=16, bevel=0.04, segs=1)
turret.cyl(0.6, 0.18, (TX, 0, Z0 + 0.35), 'red', verts=16, r2=0.44, bevel=0.03, segs=1)
turret.cyl(0.26, 0.07, (TX - 0.06, 0, Z0 + 0.47), 'white', verts=14, bevel=0.02, segs=1)
turret.cyl(0.7, 0.05, (TX, 0, Z0 + 0.02), 'red_d', verts=18, bevel=0.01, segs=1)
# короткий толстый ствол с белым дулом
ZG = Z0 + 0.2
turret.box((0.32, 0.5, 0.34), (TX + 0.68, 0, ZG), 'gunmetal', bevel=0.03, segs=1)
turret.cyl(0.13, 0.6, (TX + 1.05, 0, ZG), 'gunmetal', axis='x', verts=12, bevel=0.02, segs=1)
turret.cyl(0.19, 0.24, (TX + 1.43, 0, ZG), 'white', axis='x', verts=14, bevel=0.035, segs=1)
turret.cyl(0.11, 0.03, (TX + 1.56, 0, ZG), 'bore', axis='x', verts=12, bevel=0)

lp.finish([hull, turret], HERE, 'enemy_toytank', bake=not NOBAKE, size=1024)
