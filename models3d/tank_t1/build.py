"""Танк игрока, поколение I «игрушка». Запуск:
blender -b --factory-startup -P models3d/tank_t1/build.py [-- --nobake]
Результат: tank_t1.glb (узлы hull и turret; turret вращается вокруг своей оси), tank_t1.blend.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '.claude', 'skills', 'lowpoly-3d', 'scripts'))
import lp  # noqa: E402

NOBAKE = '--nobake' in sys.argv
lp.reset()

hull = lp.Part('hull')
TX = -0.2                                   # центр башни по X
turret = lp.Part('turret', pivot=(TX, 0, 1.86), parent=hull)

# ---------------------------------------------------------------- гусеницы и катки
TRACK_Y = 1.1          # центр гусеницы
TRACK_W = 0.78
RE, ZC, RR = 1.42, 0.56, 0.56           # концы овала: x = ±RE, центр по z, радиус
for side in (-1, 1):
    y = side * TRACK_Y
    # траки по овалу
    straight = 2 * RE
    per = 2 * straight + 2 * math.pi * RR
    n = 34
    link = per / n * 1.06                                   # траки внахлёст — лента без просветов
    for i in range(n):
        s = (i + 0.5) / n * per
        if s < straight:                                   # низ: вперёд
            x, z, ang = -RE + s, ZC - RR, 0.0
        elif s < straight + math.pi * RR:                  # передний полукруг
            a = (s - straight) / RR - math.pi / 2
            x, z, ang = RE + math.cos(a) * RR, ZC + math.sin(a) * RR, a + math.pi / 2
        elif s < 2 * straight + math.pi * RR:              # верх: назад
            x, z, ang = RE - (s - straight - math.pi * RR), ZC + RR, math.pi
        else:                                              # задний полукруг
            a = (s - 2 * straight - math.pi * RR) / RR + math.pi / 2
            x, z, ang = -RE + math.cos(a) * RR, ZC + math.sin(a) * RR, a + math.pi / 2
        # трак: брусок, повернуть по касательной (вокруг Y)
        nx, nz = -math.sin(ang), math.cos(ang)             # внешняя нормаль ленты
        if s < straight:
            nx, nz = 0, -1
        elif straight + math.pi * RR <= s < 2 * straight + math.pi * RR:
            nx, nz = 0, 1
        else:
            cx = RE if s < 2 * straight else -RE
            nx, nz = (x - cx) / RR, (z - ZC) / RR
        tang = math.atan2(nz, nx) - math.pi / 2
        hull.box((link, TRACK_W, 0.13), (x, y, z), 'rubber', bevel=0.035, segs=1, rot=(0, -tang, 0))
        # грунтозацеп посередине трака
        hull.box((0.12, TRACK_W * 0.55, 0.06), (x + nx * 0.08, y, z + nz * 0.08), 'rubber', bevel=0.02, segs=1, rot=(0, -tang, 0))
    # катки
    for wx in (-1.17, -0.39, 0.39, 1.17):
        hull.cyl(0.38, 0.56, (wx, y, 0.45), 'yellow', axis='y', verts=16, bevel=0.035, segs=1)
        hull.cyl(0.2, 0.62, (wx, y, 0.45), 'gunmetal', axis='y', verts=10, bevel=0.025, segs=1)
        hull.cyl(0.08, 0.68, (wx, y, 0.45), 'dark', axis='y', verts=8, bevel=0.015, segs=1)

# ---------------------------------------------------------------- корпус
hull.box((3.3, 1.5, 0.8), (0, 0, 0.7), 'dark', bevel=0.05, segs=1)                       # нижний корпус между гусеницами
hull.prism([(1.55, 0.32), (1.9, 0.5), (2.0, 1.12), (1.55, 1.12)], -0.78, 0.78, 'yellow', bevel=0.05, segs=1)   # нижний лобовой лист
hull.prism([(-1.9, 1.1), (1.86, 1.1), (2.08, 1.36), (1.38, 1.86), (-1.72, 1.86), (-1.95, 1.5)], -1.3, 1.3, 'yellow', bevel=0.07, segs=1)
# буксирные кольца
for y in (-0.45, 0.45):
    hull.torus(0.11, 0.035, (2.0, y, 0.6), 'gunmetal', axis='x', segs=(14, 6))
    hull.box((0.12, 0.12, 0.1), (1.94, y, 0.72), 'gunmetal', bevel=0.02, segs=1)
# фары: тёмная рамка + свет
for y in (-1.0, 1.0):
    hull.box((0.16, 0.38, 0.28), (2.0, y, 1.3), 'dark', bevel=0.035, segs=1, rot=(0, -0.62, 0))
    hull.box((0.04, 0.27, 0.16), (2.08, y, 1.33), 'lamp', bevel=0.01, segs=1, rot=(0, -0.62, 0))
# борта: ящики и клинья
for side in (-1, 1):
    hull.box((0.5, 0.16, 0.3), (0.45, side * 1.34, 1.45), 'gunmetal', bevel=0.06, segs=1, taper=(0.75, 1))
    hull.box((0.6, 0.42, 0.22), (-1.22, side * 0.98, 1.96), 'gunmetal', bevel=0.08, segs=1)
    hull.box((0.48, 0.34, 0.06), (-1.22, side * 0.98, 2.07), 'gunmetal', bevel=0.02, segs=1)
# решётка двигателя на корме
hull.box((0.5, 0.74, 0.08), (-1.4, 0.0, 1.89), 'dark', bevel=0.02, segs=1)
for k in range(3):
    hull.box((0.08, 0.6, 0.05), (-1.55 + k * 0.15, 0.0, 1.94), 'gunmetal', bevel=0.015, segs=1)
# задние фонари
for y in (-1.0, 1.0):
    hull.box((0.06, 0.18, 0.12), (-1.96, y, 1.45), 'lamp_red', bevel=0.01, segs=1)
# люк механика на лобовом листе
hull.box((0.5, 0.42, 0.06), (1.1, 0.62, 1.9), 'yellow_d', bevel=0.02, segs=1, rot=(0, -0.0, 0))
hull.cyl(0.05, 0.04, (1.1, 0.62, 1.94), 'gunmetal', verts=8, bevel=0)

# ---------------------------------------------------------------- башня
Z0, Z1 = 1.86, 2.72
BOT, TOP = (2.2, 1.95), (1.72, 1.5)
turret.frustum(BOT, TOP, Z0, Z1, 'yellow', loc=(TX, 0, 0), chamfer=0.42, bevel=0.07, segs=1)
turret.cyl(1.08, 0.1, (TX, 0, Z0 + 0.02), 'yellow_d', verts=24, bevel=0.02, segs=1)                 # погон
# звезда в круге на бортах башни (боковая грань наклонена)
from mathutils import Matrix, Vector  # noqa: E402
tilt = math.atan2((BOT[1] - TOP[1]) / 2, Z1 - Z0)
ZS = (Z0 + Z1) / 2
for side in (-1, 1):
    st = turret.star(0.22, (TX - 0.05, 0, 0), '+y', 'cream', ring=(0.34, 0.285), inner=0.42)
    st.data.transform(Matrix.Rotation(tilt, 4, 'X'))
    if side < 0:
        st.data.transform(Matrix.Scale(-1, 4, Vector((0, 1, 0))))
        st.data.flip_normals()
    yz = BOT[1] / 2 - ((BOT[1] - TOP[1]) / 2) * ((ZS - Z0) / (Z1 - Z0)) + 0.012
    st.data.transform(Matrix.Translation(Vector((0, side * yz, ZS))))
# люк
turret.cyl(0.52, 0.1, (TX - 0.25, 0.05, Z1 + 0.04), 'yellow_d', verts=20, bevel=0.03, segs=1)
turret.cyl(0.44, 0.14, (TX - 0.25, 0.05, Z1 + 0.11), 'gunmetal', verts=20, bevel=0.06, segs=1)
turret.box((0.54, 0.13, 0.09), (TX - 0.25, 0.05, Z1 + 0.2), 'gunmetal', bevel=0.035, segs=1)
# маска пушки с болтами
ZG = 2.28
turret.box((0.5, 0.98, 0.7), (0.8, 0, ZG), 'gunmetal', bevel=0.05, segs=1)
for (by, bz) in ((-0.35, ZG + 0.24), (0.35, ZG + 0.24), (-0.35, ZG - 0.24), (0.35, ZG - 0.24)):
    turret.cyl(0.055, 0.06, (1.03, by, bz), 'gunmetal', axis='x', verts=8, bevel=0.01, segs=1)
# ствол: толстый, с жёлтым кольцом и широким дульным концом
turret.cyl(0.25, 1.2, (1.55, 0, ZG), 'gunmetal', axis='x', verts=18, bevel=0.04, segs=1)
turret.cyl(0.29, 0.3, (1.95, 0, ZG), 'yellow', axis='x', verts=18, bevel=0.06, segs=1)
turret.cyl(0.34, 0.52, (2.38, 0, ZG), 'gunmetal', axis='x', verts=20, bevel=0.09, segs=1)
turret.cyl(0.2, 0.04, (2.63, 0, ZG), 'bore', axis='x', verts=16, bevel=0)
# антенна
AX, AY = TX - 0.58, -0.42
turret.box((0.2, 0.2, 0.12), (AX, AY, Z1 + 0.05), 'dark', bevel=0.025, segs=1)
turret.cyl(0.035, 1.0, (AX, AY, Z1 + 0.6), 'dark', verts=8, bevel=0)
turret.cyl(0.065, 0.16, (AX, AY, Z1 + 1.14), 'orange', verts=10, bevel=0.02, segs=1)

lp.finish([hull, turret], HERE, 'tank_t1', bake=not NOBAKE, size=1024)
