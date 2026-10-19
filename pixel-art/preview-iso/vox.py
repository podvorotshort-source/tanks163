"""Воксельный мир → изометрический пиксель-арт 2:1.

Камера ортографическая: азимут 45°, высота 30° — линии земли идут ровно 2:1.
Один воксель = 2 px по горизонтали, 1 px по вертикали на земле, высота вокселя ≈1.22 px.
Каждый пиксель экрана — луч (DDA по сетке): материал, грань (верх/левая/правая), глубина, объект.
Затем: тени (луч к свету), свет граней по палитре, блик на рёбрах, тёмный контур по краям объектов.
"""
import numpy as np

SQ2 = np.sqrt(2.0)
E = np.radians(30.0)
D = np.array([-np.cos(E) / SQ2, -np.cos(E) / SQ2, -np.sin(E)])     # направление взгляда
RIGHT = np.array([1 / SQ2, -1 / SQ2, 0.0])
DOWN = np.array([np.sin(E) / SQ2, np.sin(E) / SQ2, -np.cos(E)])
SCALE = SQ2                                                          # px на единицу мира
LIGHT = np.array([-0.55, 0.45, 1.0]); LIGHT /= np.linalg.norm(LIGHT)
ZK = np.cos(E) * SCALE                                               # px на воксель высоты

FACE_TOP, FACE_LEFT, FACE_RIGHT = 0, 1, 2


def project(x, y, z, C, W, H):
    """Мир → экран (пиксели) для окна W×H с центром C."""
    p = np.array([x, y, z], float) - C
    return p @ RIGHT * SCALE + W / 2, p @ DOWN * SCALE + H / 2


class Materials:
    def __init__(self):
        self.ramps = [None]
        self.top = [0]          # индекс цвета верхней грани в рампе
        self.emissive = [False]
        self.cast = [False]     # отбрасывает тень
        self.names = {'air': 0}

    def add(self, name, ramp, top=3, emissive=False, cast=True):
        self.names[name] = len(self.ramps)
        self.ramps.append([tuple(int(c.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) for c in ramp])
        self.top.append(top)
        self.emissive.append(emissive)
        self.cast.append(cast)
        return self.names[name]

    def __getitem__(self, k):
        return self.names[k]


def dda(grid, solid, O, d, max_iter):
    """Пакетный обход сетки. Возвращает материал, ось входа, t, ячейку первого твёрдого вокселя."""
    GX, GY, GZ = grid.shape
    N = O.shape[0]
    cell = np.floor(O).astype(np.int32)
    step = np.where(d > 0, 1, -1).astype(np.int32)
    tdel = np.abs(1.0 / np.where(d == 0, 1e-9, d))
    tmax = ((cell + (step > 0)) - O) / np.where(d == 0, 1e-9, d)
    tmax = np.where(d == 0, 1e30, tmax)
    out_m = np.zeros(N, np.uint8)
    out_ax = np.full(N, -1, np.int8)
    out_t = np.full(N, 1e9, np.float32)
    out_c = np.zeros((N, 3), np.int32)
    act = np.arange(N)
    # стартовая ячейка
    c = cell
    inb = (c[:, 0] >= 0) & (c[:, 0] < GX) & (c[:, 1] >= 0) & (c[:, 1] < GY) & (c[:, 2] >= 0) & (c[:, 2] < GZ)
    for _ in range(max_iter):
        if act.size == 0:
            break
        tm = tmax[act]
        ax = np.argmin(tm, axis=1)
        r = np.arange(act.size)
        t_now = tm[r, ax]
        cell[act, ax] += step[ax]
        tmax[act, ax] += tdel[ax]
        c = cell[act]
        inb = (c[:, 0] >= 0) & (c[:, 0] < GX) & (c[:, 1] >= 0) & (c[:, 1] < GY) & (c[:, 2] >= 0) & (c[:, 2] < GZ)
        m = np.zeros(act.size, np.uint8)
        ci = c[inb]
        m[inb] = grid[ci[:, 0], ci[:, 1], ci[:, 2]]
        hit = solid[m]
        if hit.any():
            h = act[hit]
            out_m[h] = m[hit]
            out_ax[h] = ax[hit]
            out_t[h] = t_now[hit]
            out_c[h] = c[hit]
        # выход за пределы в сторону движения — луч закончился
        gone = hit.copy()
        for k in range(3):
            if step[k] < 0:
                gone |= c[:, k] < 0
            else:
                gone |= c[:, k] >= grid.shape[k]
        act = act[~gone]
    return out_m, out_ax, out_t, out_c


def render(grid, ids, mats, C, W, H, shadows=True, outline=(26, 19, 34)):
    GX, GY, GZ = grid.shape
    C = np.asarray(C, float)
    py, px = np.mgrid[0:H, 0:W]
    a = (px + 0.5 - W / 2) / SCALE
    b = (py + 0.5 - H / 2) / SCALE
    P = C[None, None] + a[..., None] * RIGHT + b[..., None] * DOWN
    P = P.reshape(-1, 3)
    t0 = (GZ - 0.001 - P[:, 2]) / D[2]
    O = P + t0[:, None] * D
    solid = np.array([i > 0 for i in range(256)])
    m, ax, t, cell = dda(grid, solid, O, D, int(GZ * 4 + 40))
    hitp = O + t[:, None] * D
    face = np.select([ax == 2, ax == 1, ax == 0], [FACE_TOP, FACE_LEFT, FACE_RIGHT], -1)

    # тени
    shade = np.zeros(m.shape, bool)
    if shadows:
        idx = np.nonzero(m > 0)[0]
        nrm = np.zeros((idx.size, 3))
        f = face[idx]
        nrm[f == FACE_TOP, 2] = 1; nrm[f == FACE_LEFT, 1] = 1; nrm[f == FACE_RIGHT, 0] = 1
        So = hitp[idx] + nrm * 0.002 + LIGHT * 0.001
        cast = np.array([i < len(mats.cast) and mats.cast[i] for i in range(256)])
        sm, _, _, _ = dda(grid, cast, So, LIGHT, int(GZ * 4 + 40))
        shade[idx] = sm > 0
        # грани, отвёрнутые от света, — в своей тени
        lam = np.zeros(idx.size)
        lam[f == FACE_TOP] = LIGHT[2]; lam[f == FACE_LEFT] = LIGHT[1]; lam[f == FACE_RIGHT] = LIGHT[0]
        shade[idx[lam <= 0]] = False     # (их тон уже задан гранью)

    oid = np.zeros(m.shape, np.int32)
    ok = m > 0
    oid[ok] = ids[cell[ok, 0], cell[ok, 1], cell[ok, 2]]

    m = m.reshape(H, W); face = face.reshape(H, W); shade = shade.reshape(H, W)
    t = t.reshape(H, W); oid = oid.reshape(H, W)

    # тон: верх = top, левая = top-1, правая = top-2; тень −2; блик ребра +1
    level = np.zeros((H, W), np.int32)
    topi = np.array(mats.top + [0] * (256 - len(mats.top)))
    level = topi[m] - np.select([face == FACE_LEFT, face == FACE_RIGHT], [1, 2], 0)
    level -= shade * 2
    # блик: верхняя грань, под которой (на экране) боковая грань того же объекта
    below_face = np.roll(face, -1, 0); below_id = np.roll(oid, -1, 0)
    rim = (face == FACE_TOP) & (below_face != FACE_TOP) & (below_id == oid) & (oid > 0) & ~shade
    # вертикальное ребро: левая грань рядом с правой
    right_face = np.roll(face, -1, 1); right_id = np.roll(oid, -1, 1)
    rim |= (face == FACE_LEFT) & (right_face == FACE_RIGHT) & (right_id == oid) & (oid > 0)
    level += rim
    emis = np.array(mats.emissive + [False] * (256 - len(mats.emissive)))[m]
    level = np.where(emis, topi[m], level)

    img = np.zeros((H, W, 3), np.float32)
    for mi in np.unique(m):
        if mi == 0:
            continue
        rp = np.array(mats.ramps[mi], np.float32)
        sel = m == mi
        lv = np.clip(level[sel], 0, len(rp) - 1)
        img[sel] = rp[lv]
    # тень чуть холоднее
    img[shade] *= np.array([0.92, 0.94, 1.06], np.float32)

    # контур: пиксель фона/дальнего объекта рядом с ближним объектом
    out = np.zeros((H, W), bool)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nid = np.roll(np.roll(oid, dy, 0), dx, 1)
        nt = np.roll(np.roll(t, dy, 0), dx, 1)
        out |= (nid > 0) & (nid != oid) & (nt < t - 1.5)
    out[0, :] = out[-1, :] = False; out[:, 0] = out[:, -1] = False
    img[out] = outline
    return img, dict(m=m, face=face, t=t, oid=oid, shade=shade)
