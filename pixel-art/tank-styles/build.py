"""Танки игрока в трёх пиксельных стилях: 8-бит (NES), 16-бит (SNES), HD-пиксель.

Вид сверху, ствол смотрит вправо. Для каждого стиля — 4 поколения облика:
I игрушка, III детальная копия, V современный ОБТ, VIII планетарный титан.
Всё рисуется кодом в родном разрешении; увеличение — только целое.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".claude", "skills", "pixel-art-studio", "scripts"))
from pixelstudio import Sprite, ramp, mix, hex2rgba
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
TEMP = "#ff00fe"

# ---------------------------------------------------------------- стили

def nes_ramp(d, m, l):            # NES: 3 цвета на материал, края — те же
    return [d, d, m, l, l]

STYLES = {
    "nes": dict(
        name="8-бит (NES)", size=32, scale=6, detail=0, bevel=1,
        outline="#000000",
        body=nes_ramp("#a85000", "#f8b800", "#fcfc78"),
        steel=nes_ramp("#000000", "#7c7c7c", "#bcbcbc"),
        dark=nes_ramp("#000000", "#3c3c3c", "#7c7c7c"),
        track=nes_ramp("#000000", "#3c3c3c", "#7c7c7c"),
        camo="#887000", red="#d82800", glow=nes_ramp("#0058f8", "#3cbcfc", "#fcfcfc"),
        lamp="#fcfcfc",
    ),
    "snes": dict(
        name="16-бит (SNES)", size=48, scale=4, detail=1, bevel=1,
        outline="#1b1626",
        body=ramp("#f2b51e", 5, hue_shift=22, dark=0.55, light=0.75),
        steel=ramp("#6b7488", 5, hue_shift=16, dark=0.55, light=0.65),
        dark=ramp("#3a3f52", 5, hue_shift=12, dark=0.5, light=0.5),
        track=ramp("#383848", 5, hue_shift=10, dark=0.55, light=0.55),
        camo="#7d7a2c", red="#e0402a", glow=ramp("#34a8ff", 5, hue_shift=0, dark=0.5, light=0.9),
        lamp="#fff6c8",
    ),
    "hd": dict(
        name="HD-пиксель", size=64, scale=3, detail=2, bevel=2,
        outline="#140f1c",
        body=ramp("#f0b020", 5, hue_shift=26, dark=0.6, light=0.8),
        steel=ramp("#687088", 5, hue_shift=18, dark=0.6, light=0.7),
        dark=ramp("#353a4c", 5, hue_shift=14, dark=0.55, light=0.55),
        track=ramp("#34323f", 5, hue_shift=10, dark=0.6, light=0.6),
        camo="#71712e", red="#ea4630", glow=ramp("#30a8ff", 5, hue_shift=0, dark=0.5, light=0.92),
        lamp="#fff8d0",
    ),
}

# Поколения: доли от размера холста.
GENS = {
    1: dict(title="I · игрушка",       L=.60, Wd=.54, tw=.13, tr=.15, bl=.26, bt=.08, cx=.46),
    3: dict(title="III · копия",       L=.72, Wd=.60, tw=.14, tr=.15, bl=.36, bt=.07, cx=.42),
    5: dict(title="V · ОБТ",           L=.78, Wd=.64, tw=.14, tr=.17, bl=.42, bt=.07, cx=.40),
    8: dict(title="VIII · титан",      L=.86, Wd=.80, tw=.17, tr=.20, bl=.40, bt=.06, cx=.40),
}

# ---------------------------------------------------------------- помощники

def mask_of(s, color=TEMP):
    im = s._img(); p = im.load(); c = hex2rgba(color)[:3]
    return {(x, y) for y in range(s.h) for x in range(s.w) if p[x, y][3] and p[x, y][:3] == c}


def bevel(s, m, R, width=1):
    """Объём по маске: свет сверху-слева, тень снизу-справа (кольца по ширине)."""
    def ring(x, y, d):  # какие стороны маски ближе d пикселей
        up = any((x, y - k) not in m for k in range(1, d + 1))
        lf = any((x - k, y) not in m for k in range(1, d + 1))
        dn = any((x, y + k) not in m for k in range(1, d + 1))
        rt = any((x + k, y) not in m for k in range(1, d + 1))
        return up, lf, dn, rt
    for (x, y) in m:
        c = R[2]
        for d in range(width, 0, -1):
            up, lf, dn, rt = ring(x, y, d)
            outer = d == 1
            if dn:   c = R[0] if outer else R[1]
            elif rt: c = R[1] if outer else mix(R[1], R[2], .5) if width > 1 else R[1]
            elif up: c = R[4] if outer else R[3]
            elif lf: c = R[3]
        s.px(x, y, c)


def part(s, draw, R, width=1):
    draw(TEMP)
    m = mask_of(s)
    bevel(s, m, R, width)
    return m


def P(v, n):
    return int(round(v * n))

# ---------------------------------------------------------------- танк

def draw_tank(st, gen):
    n, dt, bw = st["size"], st["detail"], st["bevel"]
    g = GENS[gen]
    s = Sprite(n, n)
    B, S, D, T, G = st["body"], st["steel"], st["dark"], st["track"], st["glow"]
    hull_R = D if gen == 8 else B

    cy = n / 2
    x0 = P(g["cx"] - g["L"] / 2, n) + 1
    x1 = P(g["cx"] + g["L"] / 2, n)
    half = g["Wd"] * n / 2
    ty0, ty1 = int(cy - half), int(cy + half) - 1
    tw = max(3, P(g["tw"], n))

    # --- гусеницы
    for (a, b) in ((ty0, ty0 + tw - 1), (ty1 - tw + 1, ty1)):
        m = part(s, lambda c: s.rect(x0, a, x1, b, c), T, 1)
        step = 2 if dt == 0 else 3
        if dt == 2:                                 # HD: звенья по 4 пикселя
            mid = (a + b) // 2
            for x in range(x0 + 1, x1):
                k = (x - x0) % 4
                if k == 0: s.line(x, a + 1, x, b - 1, T[0])
                elif k == 1: s.line(x, a + 1, x, b - 1, T[3])
                elif k == 3: s.line(x, a + 1, x, b - 1, T[1])
                if k == 2: s.px(x, mid, T[4]); s.px(x, mid + 1, T[1])
            continue
        for x in range(x0 + 1, x1, step):           # траки
            s.line(x, a + 1, x, b - 1, T[0] if dt == 0 else T[1], only=T[2])
        if dt:                                      # гребень по центру трака
            mid = (a + b) // 2
            for x in range(x0 + 2, x1, step):
                s.px(x, mid, T[3])

    # --- боковые экраны (титан)
    if gen == 8:
        for (a, b) in ((ty0 - 1, ty0 + tw // 2), (ty1 - tw // 2, ty1 + 1)):
            part(s, lambda c: s.rect(x0 + 3, a, x1 - 4, b, c), D, bw)
            for x in range(x0 + 8, x1 - 5, 7 if dt else 6):
                s.line(x, a + 1, x, b - 1, D[0])
            s.line(x0 + 5, (a + b) // 2, x1 - 6, (a + b) // 2, B[3])   # жёлтая полоса

    # --- корпус
    hy0, hy1 = ty0 + tw - 2 - (1 if gen == 1 else 0), ty1 - tw + 2 + (1 if gen == 1 else 0)
    if gen == 1:
        hy0, hy1 = ty0 + 1, ty1 - 1
    hx0, hx1 = x0 - 1, x1 + 1
    ch = max(2, n // 12) if gen >= 3 else max(1, n // 16)      # фаски носа
    pts = [(hx0 + 1, hy0), (hx1 - ch, hy0), (hx1, hy0 + ch), (hx1, hy1 - ch),
           (hx1 - ch, hy1), (hx0 + 1, hy1), (hx0, hy1 - 1), (hx0, hy0 + 1)]
    if gen == 1:   # игрушка: корпус уже, гусеницы видны сверху
        hy0, hy1 = ty0 + tw - 1, ty1 - tw + 1
        r = max(2, n // 14)
        pts = [(hx0 + r, hy0), (hx1 - r, hy0), (hx1, hy0 + r), (hx1, hy1 - r),
               (hx1 - r, hy1), (hx0 + r, hy1), (hx0, hy1 - r), (hx0, hy0 + r)]
    hull = part(s, lambda c: s.polygon(pts, c), hull_R, bw)

    # --- детали корпуса
    rear = hx0 + 2
    # задние фонари
    s.px(hx0, hy0 + 2, st["red"]); s.px(hx0, hy1 - 2, st["red"])
    if dt:
        s.px(hx0, hy0 + 3, st["red"]); s.px(hx0, hy1 - 3, st["red"])
    # передние фары
    if gen >= 3:
        for yy in (hy0 + ch + 1, hy1 - ch - 1):
            s.px(hx1, yy, st["lamp"] if gen < 8 else G[4])
    # решётка двигателя
    if gen >= 3 or dt:
        gx0, gx1 = rear + 1, rear + 1 + (2 if dt == 0 else 3 + dt)
        gy0, gy1 = int(cy) - (2 + dt * 2), int(cy) + (1 + dt * 2)
        s.rect(gx0, gy0, gx1, gy1, D[0] if gen != 8 else "#000000")
        for yy in range(gy0 + 1, gy1, 2):
            s.line(gx0, yy, gx1, yy, D[2] if gen != 8 else D[1])
    # шов палубы
    if gen >= 3 and dt:
        sx = hx1 - ch - 2 - dt
        s.line(sx, hy0 + 2, sx, hy1 - 2, hull_R[1])
        s.line(sx + 1, hy0 + 2, sx + 1, hy1 - 2, hull_R[3])
    # заклёпки игрушки
    if gen == 1:
        for (xx, yy) in ((hx0 + 3, hy0 + 2), (hx0 + 3, hy1 - 2), (hx1 - 3, hy0 + 2), (hx1 - 3, hy1 - 2)):
            s.px(xx, yy, S[1]);
            if dt: s.px(xx - 1, yy - 1, S[4])
    # камуфляж
    if gen == 3:
        blobs = [(.30, .38, .10), (.55, .62, .09), (.72, .40, .07), (.38, .66, .06), (.62, .32, .05)]
        for bx, by, br in blobs:
            rr = max(1, P(br, n) // 2)
            s.circle(P(bx, n), P(by, n), rr, st["camo"], fill=True, only=hull_R[2])
            s.circle(P(bx, n), P(by, n), rr, mix(st["camo"], hull_R[0], .35), fill=True, only=hull_R[0])
        # канистры на корме
        s.rect(hx0 + 1, hy0 - 1, hx0 + 2 + dt * 2, hy0 + 1, st["camo"])
        s.rect(hx0 + 1, hy1 - 1, hx0 + 2 + dt * 2, hy1 + 1, st["camo"])
    # динамическая защита
    if gen == 5:
        bs = 2 if dt < 2 else 3
        for (yy) in (hy0 + 1, hy1 - bs):
            for xx in range(hx0 + 4 + dt, hx1 - ch - 1, bs + 1):
                s.rect(xx, yy, xx + bs - 1, yy + bs - 1, S[2])
                s.px(xx, yy, S[4]); s.px(xx + bs - 1, yy + bs - 1, S[0])
    # энергетические линии титана
    if gen == 8:
        for yy in (hy0 + 2, hy1 - 2):
            s.line(hx0 + 4, yy, hx1 - ch - 2, yy, G[2])
            if dt: s.line(hx0 + 4, yy + (1 if yy < cy else -1), hx1 - ch - 2, yy + (1 if yy < cy else -1), G[1])
        for yy in (hy0 + 2, hy1 - 2):
            s.px(hx1 - ch - 2, yy, G[4])
        # жёлтые угловые пластины
        part(s, lambda c: s.polygon([(hx1 - ch - 1, hy0 + 1), (hx1 - 1, hy0 + ch + 1), (hx1 - 1, hy1 - ch - 1),
                                      (hx1 - ch - 1, hy1 - 1), (hx1 - ch - 3, hy1 - 1), (hx1 - ch - 3, hy0 + 1)], c), B, 1)

    # --- HD: дизеринг света, износ, заклёпки, копоть
    if dt == 2:
        mid, hi, lo = hull_R[2], hull_R[3], hull_R[1]
        s.noise(hx0, hy0, hx1, hy1, hull_R[4], density=.012, seed=gen, only=mid)
        s.noise(hx0, hy0, hx1, hy1, hull_R[0], density=.01, seed=gen + 9, only=mid)
        for xx in range(hx0 + 6, hx1 - ch - 3, 6):
            for yy in (hy0 + 2, hy1 - 3):
                if s.get(xx, yy) and s.get(xx, yy)[:3] == hex2rgba(mid)[:3]:
                    s.px(xx, yy, hull_R[0]); s.px(xx - 1, yy - 1, hull_R[4])
        s.noise(hx0 + 1, int(cy) - 7, hx0 + 9, int(cy) + 6, D[1], density=.35, seed=3, only=mid)
    # --- ствол(ы)
    tcx, tcy = P(g["cx"] + .02, n) - (0 if gen < 5 else 2), int(cy)
    tr = max(3, P(g["tr"], n))
    bt = max(2, P(g["bt"], n))
    tip = min(n - 2, tcx + tr + P(g["bl"], n))
    barrels = [(tcy - bt // 2, tcy - bt // 2 + bt - 1)]
    if gen == 8:
        off = max(2, bt)
        barrels = [(tcy - off - bt // 2, tcy - off - bt // 2 + bt - 1), (tcy + off - bt // 2 + (1 if bt % 2 == 0 else 0), tcy + off - bt // 2 + bt - 1 + (1 if bt % 2 == 0 else 0))]
    barrel_R = B if gen == 1 else S
    for (a, b) in barrels:
        part(s, lambda c: s.rect(tcx, a, tip, b, c), barrel_R, 1)
        if gen >= 3:   # дульный тормоз
            mb = 2 + dt
            part(s, lambda c: s.rect(tip - mb + 1, a - 1, tip, b + 1, c), S if gen < 8 else D, 1)
            if gen == 8:
                s.line(tip, a, tip, b, G[3])
        if gen == 5 and dt:  # эжектор
            ex = tcx + tr + (tip - tcx - tr) // 3
            part(s, lambda c: s.rect(ex, a - 1, ex + 2 + dt, b + 1, c), S, 1)

    # --- падающая тень башни на корпус (16-бит/HD)
    if dt:
        sh = 2 if dt == 1 else 3
        def shadow(c):
            if gen in (1, 3): s.circle(tcx + sh, tcy + sh, tr, c, fill=True)
            else: s.rect(tcx - tr + sh, tcy - tr + sh, tcx + tr + sh, tcy + tr + sh, c)
        im = s._img(); before = im.copy()
        shadow(TEMP)
        p, q = im.load(), before.load()
        for y in range(n):
            for x in range(n):
                if p[x, y][:3] == (255, 0, 254):
                    o = q[x, y]
                    p[x, y] = o if not o[3] else tuple(int(v * .62) for v in o[:3]) + (255,)
    # --- башня
    if gen in (1, 3):
        tur = part(s, lambda c: s.circle(tcx, tcy, tr + (1 if dt else 0), c, fill=True), B, bw)
    else:
        k = max(2, tr // 2 - (1 if gen == 5 else 0))
        rx0, rx1 = tcx - tr - (2 if gen == 5 else 1), tcx + tr + 1
        tp = [(rx0 + k, tcy - tr), (rx1 - k + 1, tcy - tr), (rx1, tcy - k), (rx1, tcy + k),
              (rx1 - k + 1, tcy + tr), (rx0 + k, tcy + tr), (rx0, tcy + k), (rx0, tcy - k)]
        if gen == 5:   # клиновидная лобовая броня
            tp = [(rx0 + 1, tcy - tr + 1), (rx1 - k, tcy - tr), (rx1 + 1, tcy - 1), (rx1 + 1, tcy + 1),
                  (rx1 - k, tcy + tr), (rx0 + 1, tcy + tr - 1), (rx0, tcy + k), (rx0, tcy - k)]
        tur = part(s, lambda c: s.polygon(tp, c), B if gen == 5 else D, bw)
    if True:
        tur_edge = [(x, y) for (x, y) in tur if any((x + a, y + b) not in tur for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        oc = st["outline"] if dt < 2 else mix(st["outline"], (D if gen == 8 else B)[0], .4)
        for (x, y) in tur_edge:
            if dt or (x, y + 1) not in tur or (x + 1, y) not in tur:
                s.px(x, y, oc)
        if gen == 8:   # жёлтый ободок
            for (x, y) in tur:
                if any((x + dx, y + dy) not in tur for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    pass
            ring_pts = [(x, y) for (x, y) in tur]
    # люк / ядро
    if gen == 8:
        cr = max(2, tr // 2)
        s.circle(tcx, tcy, cr, G[0], fill=True)
        s.circle(tcx, tcy, cr - 1, G[2], fill=True)
        s.circle(tcx, tcy, max(0, cr - 2 - (1 if dt == 2 else 0)), G[4], fill=True)
        s.px(tcx - 1, tcy - 1, "#ffffff")
        if dt:   # ореол
            s.circle(tcx, tcy, cr + 1, G[0], only=D[2])
            if dt == 2: s.circle(tcx, tcy, cr + 2, G[0], only=D[2]); s.circle(tcx, tcy, cr + 1, G[1])
        # жёлтые щёки башни
        for sgn in (-1, 1):
            yy = tcy + sgn * (tr - 1)
            s.line(tcx - tr + 2, yy, tcx + tr - 2, yy, B[3 if sgn < 0 else 1])
    else:
        hr = max(1, tr // 2 - (0 if dt else 0))
        hx = tcx - (1 if gen == 1 else tr // 3)
        s.circle(hx, tcy, hr, hull_R[0] if gen != 1 else B[0], fill=True)
        s.circle(hx, tcy, max(0, hr - 1), D[1] if gen == 1 else hull_R[1], fill=True)
        if dt:
            s.px(hx - hr + 1, tcy - hr + 1 if hr > 1 else tcy - 1, B[4])
        if gen == 1 and dt == 0:
            s.circle(hx, tcy, hr, D[1], fill=True)
    # антенна (копия/ОБТ)
    if gen in (3, 5):
        ax, ay = tcx - tr + 1, tcy - tr + 1 + (1 if gen == 5 else 0)
        s.line(ax, ay, ax - 3 - dt * 2, ay - 3 - dt * 2, D[0])
        s.px(ax - 3 - dt * 2, ay - 3 - dt * 2, st["red"] if gen == 3 else D[3])
    # командирская башенка (ОБТ)
    if gen == 5:
        cx2, cy2 = tcx - tr // 3 + 1, tcy + tr // 2
        s.circle(cx2, cy2, max(1, tr // 4), S[1], fill=True)
        s.px(cx2, cy2, S[4])

    s.outline(st["outline"], where="outside")
    if dt == 2:   # выборочный контур: на светлой стороне светлее
        im = s._img(); p = im.load(); oc = hex2rgba(st["outline"])
        soft = hex2rgba(mix(st["outline"], "#6a5a48", .55))
        for y in range(n):
            for x in range(n):
                if p[x, y] == oc and ((y + 1 < n and p[x, y + 1][3] and p[x, y + 1] != oc) or (x + 1 < n and p[x + 1, y][3] and p[x + 1, y] != oc)):
                    p[x, y] = soft
    return s

# ---------------------------------------------------------------- вывод

def main():
    font_path = "C:/Windows/Fonts/arialbd.ttf"
    fbig = ImageFont.truetype(font_path, 22)
    fsm = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 15)
    cell, pad, left, top = 200, 16, 190, 44
    gens = list(GENS)
    W = left + len(gens) * (cell + pad) + pad
    H = top + len(STYLES) * (cell + pad) + pad
    sheet = Image.new("RGBA", (W, H), "#2a2f26")
    d = ImageDraw.Draw(sheet)
    for j, gk in enumerate(gens):
        d.text((left + j * (cell + pad) + cell // 2, 22), GENS[gk]["title"], font=fsm, fill="#e8e4d0", anchor="mm")
    for i, (key, st) in enumerate(STYLES.items()):
        y = top + i * (cell + pad)
        d.text((16, y + cell // 2 - 12), st["name"], font=fbig, fill="#f4e9c0", anchor="lm")
        d.text((16, y + cell // 2 + 14), f'{st["size"]}×{st["size"]} px, ×{st["scale"]}', font=fsm, fill="#a9ad95", anchor="lm")
        row = []
        for j, gk in enumerate(gens):
            s = draw_tank(st, gk)
            s.save_png(os.path.join(OUT, f"{key}_gen{gk}.png"))
            s.save_png(os.path.join(OUT, f"{key}_gen{gk}_x{st['scale']}.png"), scale=st["scale"])
            row.append(s)
            im = s.composite(0).resize((st["size"] * st["scale"],) * 2, Image.NEAREST)
            x = left + j * (cell + pad)
            d.rectangle([x, y, x + cell - 1, y + cell - 1], fill="#4a5638")
            # тень
            sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
            a = im.split()[3].point(lambda v: 70 if v else 0)
            sh.putalpha(a)
            o = (cell - im.width) // 2
            sheet.alpha_composite(sh, (x + o + st["scale"] * 2, y + o + st["scale"] * 2))
            sheet.alpha_composite(im, (x + o, y + o))
    sheet.save(os.path.join(OUT, "tank_styles_sheet.png"))
    print("ok", W, H)


if __name__ == "__main__":
    main()
