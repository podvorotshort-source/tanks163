"""Превью первого уровня «Игрушечный полигон» в настоящем пиксель-арте.

Мир рисуется в родных пикселях (640×360), экран — окно 480×270, увеличение только целое:
  preview_x4.png — обычный вид (480×270 ×4 = 1920×1080);
  preview_x3.png — после шага отдаления камеры (640×360 ×3 = 1920×1080): пиксель меньше, но такой же чёткий;
  preview_phone.png — телефон 20:9 (600×270 ×4 = 2400×1080) с сенсорным управлением.
Запуск: python build.py
"""
import os
import numpy as np
from PIL import Image
from px import Scene, Spr, hx, grid, shift, dilate, m_disc, m_ell
from pal import *
import ground
import sprites as S
import hud

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
W, H = 640, 360
TX, TY = 300, 188                    # танк игрока (центр)
rng = np.random.default_rng(5)


def decal_dark(sc, m, k):
    sc.rgb[m] *= k


def build_world():
    rgb, M = ground.build(W, H)
    sc = Scene(W, H)
    sc.rgb = rgb
    x, y = grid(W, H)

    # ---------- декали на земле
    # следы гусениц за танком: две чёткие полосы с поперечными траками, к хвосту бледнеют
    for side in (-11, 11):
        for t in range(0, 110):
            px_ = TX - 14 - t
            if px_ < ground.ARENA_X:
                break
            py_ = TY + side + int(round(np.sin(t / 26.0) * 6 * (t / 110)))
            fade = t / 110
            for w in range(-2, 3):
                yy = py_ + w
                if M['road'][yy, px_]:
                    continue
                if (t % 3 == 0) or abs(w) == 2:
                    sc.rgb[yy, px_] *= 0.72 + 0.22 * fade
                elif fade < 0.7:
                    sc.rgb[yy, px_] *= 0.9 + 0.1 * fade
    # старые воронки
    for (cx, cy, r, seed) in ((214, 238, 13, 1), (392, 170, 15, 2), (520, 150, 8, 3)):
        n = ground.fbm(W, H, np.random.default_rng(seed), cells=(8, 4), amps=(1, .5))
        d = np.hypot(x - cx, (y - cy) * 1.25)
        outer = d < r + (n - .5) * 8
        inner = d < r * 0.55 + (n - .5) * 5
        decal_dark(sc, outer, 0.62)
        decal_dark(sc, inner, 0.6)
        sc.rgb[outer & ~shift(outer, 1, 1)] *= 0.8
        emb = inner & (np.random.default_rng(seed).random((H, W)) < 0.04)
        sc.rgb[emb] = hx(FIRE[3])[:3]
        sc.rgb[shift(emb, 1, 0) & inner] = hx(FIRE[2])[:3]

    # ---------- объекты (центр, спрайт, тень)
    objs = []

    def add(spr, cx, cy, sh=(3, 3), layer=0):
        objs.append((layer, cy + spr.h // 2, cx, cy, spr, sh))

    # пол комнаты: игрушки
    add(S.die(), 88, 232, sh=(4, 4))
    add(S.ball(), 30, 300, sh=(5, 5))

    # пруд — это «земля», рисуем сразу
    p = S.pond()
    sc.blit_c(p, 545, 218, shadow=(2, 2))
    sc.apply_shadow()
    sc.blit_c(p, 545, 218)

    # кирпичные укрытия
    for (cx, cy, cr) in ((196, 104, False), (221, 104, True), (196, 128, False),
                         (382, 248, False), (407, 248, False),
                         (540, 82, True), (565, 82, False), (590, 82, False)):
        add(S.brick_block(cracked=cr), cx, cy)
    # металлические ящики
    for (cx, cy) in ((168, 214), (189, 214), (178, 236), (262, 64), (610, 300), (488, 236)):
        add(S.crate(), cx, cy)
    # кусты и деревья
    for (cx, cy, r, sd, big) in ((150, 54, 7, 1, False), (338, 64, 10, 4, True), (612, 176, 9, 6, True),
                                 (478, 330, 7, 2, False), (226, 330, 9, 8, True), (148, 290, 6, 3, False),
                                 (372, 118, 6, 9, False), (612, 250, 6, 5, False), (264, 254, 6, 12, False),
                                 (500, 40, 8, 13, True)):
        add(S.bush(r, sd, big), cx, cy, sh=(3, 4))
    add(S.barrel(), 418, 304); add(S.barrel(), 431, 300); add(S.barrel(), 476, 186)

    # подбираемое
    for (cx, cy, g) in ((356, 222, S.gem()), (366, 214, S.gem()), (348, 232, S.gem(GOLD)),
                        (252, 160, S.gem()), (420, 228, S.gem(LEAF))):
        add(g, cx, cy, sh=(2, 2))
    add(S.star(), 330, 150, sh=(2, 3))
    add(S.medkit(), 248, 300, sh=(2, 2))

    # враги
    et = S.enemy_tank().flip_x()
    add(et, 462, 208, sh=(3, 3), layer=1)
    add(et, 500, 172, sh=(3, 3), layer=1)
    add(S.enemy_tank().rot90(-1), 405, 112, sh=(3, 3), layer=1)   # едет вниз
    add(S.enemy_tank(burnt=True), 214, 236, sh=(3, 3), layer=1)    # обломки в воронке
    add(S.drone(0), 248, 120, sh=(6, 8), layer=2)
    add(S.drone(1), 352, 282, sh=(6, 8), layer=2)

    # игрок
    pt = S.player_tank()
    add(pt, TX + 7, TY, sh=(3, 3), layer=1)

    # тени: все разом, одна маска
    for (layer, _, cx, cy, spr, sh) in objs:
        sc.blit_c(spr, cx, cy, shadow=sh)
    sc.apply_shadow()
    for (layer, _, cx, cy, spr, sh) in sorted(objs, key=lambda o: (o[0] >= 2, o[1])):
        sc.blit_c(spr, cx, cy)

    # ---------- бой
    lights = []
    # залп игрока: энергоимпульсы к взрывающемуся врагу
    mx, my = TX + 7 + 26, TY - 1
    sc.blit(S.muzzle_blue(), mx - 2, my - 6)
    lights.append((mx + 4, my, 20, BLUE[2], 0.45))
    for i, bx in enumerate((mx + 16, mx + 34, mx + 52)):
        b = S.bolt(9 if i else 11)
        sc.blit(b, bx, my - 3 - i)
        lights.append((bx + 6, my - i, 11, BLUE[2], 0.4))
    # взрыв врага у старой воронки
    ex, ey = 392, 168
    for (dx, dy, r, sd) in ((-14, -12, 7, 1), (10, -16, 6, 2), (-2, -22, 8, 3), (16, -2, 5, 4)):
        sp = S.smoke_puff(r, sd)
        sc.blit_c(sp, ex + dx, ey + dy)
    sc.blit_c(S.explosion(1, 17), ex, ey)
    lights.append((ex, ey, 64, FIRE[3], 0.55))
    lights.append((ex, ey, 30, FIRE[5], 0.35))
    for i in range(10):
        a = i * 0.63 + 0.3
        sc.blit_c(S.debris(i), ex + np.cos(a) * (26 + i % 3 * 5), ey + np.sin(a) * (22 + i % 4 * 4))
    # вражеские пули в игрока
    for (bx, by) in ((432, 204), (410, 201), (388, 198)):
        b = S.bullet().flip_x()
        sc.blit(b, bx, by)
        lights.append((bx + 3, by + 2, 12, FIRE[3], 0.45))
    for (bx, by) in ((470, 168), (452, 172)):
        sc.blit(S.bullet().flip_x(), bx, by)
        lights.append((bx + 3, by + 2, 12, FIRE[3], 0.45))
    # дым над обломками
    for (dx, dy, r, sd) in ((0, -16, 5, 11), (4, -26, 6, 12), (-2, -38, 7, 13)):
        sc.blit_c(S.smoke_puff(r, sd, lit=True), 214 + dx, 236 + dy, alpha=0.85)
    lights.append((214, 236, 22, FIRE[2], 0.35))
    # фары и сенсоры
    lights.append((TX - 5, TY - 1, 10, BLUE[2], 0.35))
    for g in ((356, 222), (366, 214), (252, 160)):
        lights.append((g[0], g[1], 9, BLUE[2], 0.4))
    lights.append((330, 150, 14, GOLD[2], 0.4))
    sc.add_light(lights, levels=5)
    return sc


def main():
    sc = build_world()
    world = sc.image()
    world.save(os.path.join(OUT_DIR, 'world_1x.png'))

    # вид ×4: окно 480×270 вокруг танка
    vx, vy = TX - 240, TY - 138
    v4 = world.crop((vx, vy, vx + 480, vy + 270)).convert('RGBA')
    hud.draw_pc(v4)
    v4.save(os.path.join(OUT_DIR, 'preview_1x.png'))
    v4.resize((1920, 1080), Image.NEAREST).save(os.path.join(OUT_DIR, 'preview_x4.png'))

    # после шага отдаления: весь мир 640×360 ×3 (интерфейс в тех же пикселях экрана — рисуем в 480×270 ×4)
    v3 = world.convert('RGBA').resize((1920, 1080), Image.NEAREST)
    ui = Image.new('RGBA', (480, 270), (0, 0, 0, 0))
    hud.draw_pc(ui, level=7, time='06:48', hp=0.62, xp=0.35, zoom_note=True)
    v3.alpha_composite(ui.resize((1920, 1080), Image.NEAREST))
    v3.save(os.path.join(OUT_DIR, 'preview_x3.png'))

    # телефон 20:9
    vx = TX - 300
    ph = world.crop((vx, vy, vx + 600, vy + 270)).convert('RGBA')
    hud.draw_phone(ph)
    ph.resize((2400, 1080), Image.NEAREST).save(os.path.join(OUT_DIR, 'preview_phone.png'))


if __name__ == '__main__':
    main()
