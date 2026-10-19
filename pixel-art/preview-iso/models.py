"""Воксельные модели. Локальные оси: u — вперёд (нос), v — влево, z — вверх. Массив m[u, v, z] = материал."""
import numpy as np


def box(m, u0, u1, v0, v1, z0, z1, mat, mask=None):
    """Заполнить [u0,u1)×[v0,v1)×[z0,z1)."""
    sl = m[u0:u1, v0:v1, z0:z1]
    if mask is None:
        sl[...] = mat
    else:
        sl[mask[u0:u1, v0:v1, z0:z1]] = mat


def coords(m):
    U, V, Z = np.meshgrid(np.arange(m.shape[0]), np.arange(m.shape[1]), np.arange(m.shape[2]), indexing='ij')
    return U + 0.5, V + 0.5, Z + 0.5


def cyl_z(m, cu, cv, r, z0, z1, mat, M=None):
    U, V, Z = coords(m) if M is None else M
    sel = ((U - cu) ** 2 + (V - cv) ** 2 <= r * r) & (Z >= z0) & (Z < z1)
    m[sel] = mat
    return sel


def cyl_u(m, cv, cz, r, u0, u1, mat, M=None):
    U, V, Z = coords(m) if M is None else M
    sel = ((V - cv) ** 2 + (Z - cz) ** 2 <= r * r) & (U >= u0) & (U < u1)
    m[sel] = mat
    return sel


def sphere(m, cu, cv, cz, r, mat, M=None, sz=1.0):
    U, V, Z = coords(m) if M is None else M
    sel = (U - cu) ** 2 + (V - cv) ** 2 + ((Z - cz) / sz) ** 2 <= r * r
    m[sel] = mat
    return sel


# ======================================================================

def player_tank(M):
    m = np.zeros((46, 26, 19), np.uint8)
    G = coords(m)
    U, V, Z = G
    # гусеницы
    for v0 in (0, 20):
        box(m, 0, 34, v0, v0 + 6, 0, 7, M['track'])
        sel = (U >= 0) & (U < 34) & (V >= v0) & (V < v0 + 6) & (Z < 7)
        m[sel & ((np.floor(U) % 3) == 0)] = M['track_d']
        # скруглить концы
        for (uu, zz) in ((0, 0), (0, 6), (33, 0), (33, 6), (1, 0), (32, 0)):
            m[uu, v0:v0 + 6, zz] = 0
        # ведущее колесо и ленивец на торцах
        m[(np.abs(U - 2.5) < 1.5) & (Z > 1) & (Z < 5) & (V >= v0) & (V < v0 + 6)] = M['metal']
    # корпус
    box(m, 2, 32, 5, 21, 3, 9, M['navy'])
    hull = (U >= 26) & (Z > 9 - (U - 26) * 1.3)
    m[hull & (V >= 5) & (V < 21)] = 0
    # крылья
    for v0 in (0, 19):
        box(m, 3, 30, v0, v0 + 7, 7, 9, M['yellow'])
        m[(U >= 27) & (Z > 9 - (U - 27) * 1.5) & (V >= v0) & (V < v0 + 7) & (Z >= 7)] = 0
        # чёрно-жёлтая насечка
        for k in range(3):
            m[22 + k * 2, v0:v0 + 7, 8] = M['navy_d']
    # верхний лист корпуса
    box(m, 4, 26, 6, 20, 9, 10, M['yellow'])
    # моторная решётка
    for uu in range(4, 10):
        m[uu, 8:18, 9] = M['navy'] if uu % 2 else M['navy_d']
    m[4:10, 8:18, 10] = 0
    # фары
    m[31, 6, 7:9] = M['glow']; m[31, 19, 7:9] = M['glow']
    # башня
    cyl_z(m, 15, 13, 7.6, 10, 15, M['yellow'], G)
    cyl_z(m, 14.5, 13, 4.6, 15, 16, M['yellow_l'], G)
    # погон
    ring = ((U - 15) ** 2 + (V - 13) ** 2 <= 7.6 ** 2) & ((U - 15) ** 2 + (V - 13) ** 2 > 6.6 ** 2) & (Z >= 10) & (Z < 11)
    m[ring] = M['navy_d']
    # люк-сенсор
    cyl_z(m, 13, 13, 2.2, 15, 17, M['navy'], G)
    cyl_z(m, 13, 13, 1.3, 16, 17, M['glow'], G)
    # маска и ствол
    box(m, 20, 24, 10, 16, 10, 15, M['yellow_d'])
    cyl_u(m, 13, 12.5, 1.7, 24, 42, M['metal'], G)
    for uu in (28, 33):
        cyl_u(m, 13, 12.5, 2.3, uu, uu + 1, M['glow'], G)
    cyl_u(m, 13, 12.5, 2.7, 41, 45, M['metal_l'], G)
    cyl_u(m, 13, 12.5, 1.0, 43, 45, M['metal_d'], G)
    return m


def enemy_tank(M, burnt=False):
    m = np.zeros((34, 20, 14), np.uint8)
    G = coords(m)
    U, V, Z = G
    body, body_l, stripe, trk, trk_d = ('red', 'red_l', 'white', 'track', 'track_d')
    if burnt:
        body, body_l, stripe, trk, trk_d = ('burnt', 'burnt', 'burnt', 'burnt_d', 'burnt_d')
    for v0 in (0, 15):
        box(m, 0, 26, v0, v0 + 5, 0, 5, M[trk])
        m[(U < 26) & (V >= v0) & (V < v0 + 5) & (Z < 5) & ((np.floor(U) % 3) == 0)] = M[trk_d]
        m[0, v0:v0 + 5, 4] = 0; m[25, v0:v0 + 5, 4] = 0; m[0, v0:v0 + 5, 0] = 0; m[25, v0:v0 + 5, 0] = 0
    box(m, 1, 25, 3, 17, 2, 7, M[body])
    m[(U >= 21) & (Z > 7 - (U - 21) * 1.4)] = 0
    box(m, 2, 6, 4, 16, 7, 8, M[stripe])
    cyl_z(m, 12, 10, 5.4, 7, 10, M[body], G)
    cyl_z(m, 11.5, 10, 4.0, 10, 11, M[body_l], G)
    cyl_u(m, 10, 8.5, 1.3, 16, 31, M['metal' if not burnt else 'burnt_d'], G)
    cyl_u(m, 10, 8.5, 1.9, 29, 33, M['metal_l' if not burnt else 'burnt_d'], G)
    if not burnt:
        m[24, 4, 4:6] = M['fire_glow']; m[24, 15, 4:6] = M['fire_glow']
        m[12, 10, 11] = M['white']
    else:
        rng = np.random.default_rng(4)
        sel = np.argwhere(m > 0)
        for k in rng.choice(len(sel), 18, replace=False):
            u, v, z = sel[k]
            m[u, v, z] = M['ember']
    return m


def drone(M):
    m = np.zeros((26, 26, 8), np.uint8)
    G = coords(m)
    U, V, Z = G
    for (du, dv) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        for k in range(10):
            u, v = int(13 + du * k * 0.85), int(13 + dv * k * 0.85)
            m[u, v, 3] = M['metal']; m[min(25, u), min(25, v), 3] = M['metal']
        cu, cv = 13 + du * 8, 13 + dv * 8
        cyl_z(m, cu, cv, 1.2, 2, 5, M['metal_d'], G)
    sphere(m, 13, 13, 3.5, 5.2, M['red'], G, sz=0.7)
    sphere(m, 12.6, 12.6, 5.0, 2.6, M['white'], G, sz=0.7)
    m[17, 13, 3] = M['fire_glow']
    return m


def brick_block(M, size=16, h=16, seed=0):
    rng = np.random.default_rng(seed)
    m = np.zeros((size, size, h), np.uint8)
    U, V, Z = np.meshgrid(np.arange(size), np.arange(size), np.arange(h), indexing='ij')
    row = Z // 4
    mortar = (Z % 4 == 3)
    off = (row % 2) * 4
    mortar |= ((U + off) % 8 == 7) & ((V == 0) | (V == size - 1))
    mortar |= ((V + off) % 8 == 7) & ((U == 0) | (U == size - 1))
    # верх: кладка видна сверху
    top = Z == h - 1
    mortar_top = top & (((U + (V // 4 % 2) * 4) % 8 == 7) | (V % 4 == 3))
    m[...] = M['brick']
    alt = rng.random((size // 4 + 2, size // 4 + 2, h // 4 + 1)) < 0.35
    m[alt[U // 4, V // 4, row]] = M['brick2']
    m[(mortar & ~top) | mortar_top] = M['mortar']
    # сколы на углах
    for _ in range(3):
        u, v = rng.choice([0, size - 1]), rng.choice([0, size - 1])
        m[u, v, h - 1 - rng.integers(0, 4):] = 0
    return m


def crate(M, s=14, h=12):
    m = np.zeros((s, s, h), np.uint8)
    m[...] = M['metal']
    U, V, Z = np.meshgrid(np.arange(s), np.arange(s), np.arange(h), indexing='ij')
    side = (U == s - 1) | (V == s - 1) | (U == 0) | (V == 0)
    m[side & (((U + V) % 4) == 1) & (Z < h - 2) & (Z > 1)] = M['metal_d']
    m[2:s - 2, 2:s - 2, h - 1] = 0
    m[2:s - 2, 2:s - 2, h - 2] = M['metal_d']
    m[4:s - 4, s // 2 - 1:s // 2 + 1, h - 2] = M['metal_l']
    for (u, v) in ((0, 0), (0, s - 1), (s - 1, 0), (s - 1, s - 1)):
        m[u, v, :] = M['metal_l']
    m[:, :, 0] = M['metal_d']
    m[(Z == 1) & side] = M['hazard']
    m[(Z == 1) & side & (((U + V) // 2) % 2 == 0)] = M['navy_d']
    return m


def bush(M, r=7, seed=0):
    rng = np.random.default_rng(seed)
    S = int(r * 3 + 2)
    m = np.zeros((S, S, int(r * 2.2 + 2)), np.uint8)
    U, V, Z = coords(m)
    c = S / 2
    blobs = [(c, c, r * 0.9, r)]
    for _ in range(5):
        a = rng.random() * 6.28
        d = r * (0.45 + 0.4 * rng.random())
        rr = r * (0.5 + 0.3 * rng.random())
        blobs.append((c + np.cos(a) * d, c + np.sin(a) * d, rr * 0.9, rr))
    full = np.zeros(m.shape, bool)
    for (bu, bv, bz, br) in blobs:
        full |= (U - bu) ** 2 + (V - bv) ** 2 + ((Z - bz) * 1.15) ** 2 <= br * br
    noise = rng.random(m.shape)
    # «листва»: кучки светлых вокселей сверху
    m[full] = M['leaf']
    m[full & (noise < 0.28)] = M['leaf_d']
    m[full & (noise > 0.84) & (Z > r * 0.8)] = M['leaf_l']
    m[full & (noise > 0.985)] = M['berry']
    return m


def barrel(M):
    m = np.zeros((10, 10, 13), np.uint8)
    G = coords(m)
    cyl_z(m, 5, 5, 4.6, 0, 12, M['red'], G)
    for z in (2, 7):
        cyl_z(m, 5, 5, 4.6, z, z + 1, M['red_d'], G)
    cyl_z(m, 5, 5, 4.6, 11, 12, M['red_d'], G)
    cyl_z(m, 5, 5, 3.6, 11, 12, M['red'], G)
    m[3, 3, 11] = M['metal_l']
    U, V, Z = G
    m[(V > 9) & (Z >= 4) & (Z < 6) & (U > 3) & (U < 7)] = M['hazard']
    return m


def die(M, s=28):
    m = np.zeros((s, s, s), np.uint8)
    U, V, Z = coords(m)
    c = s / 2
    # скруглённый куб: суперэллипсоид
    sel = (np.abs(U - c) ** 6 + np.abs(V - c) ** 6 + np.abs(Z - c) ** 6) <= (c ** 6) * 1.0
    m[sel] = M['white']
    pip = M['pip']

    def pips(face, pts):
        for (a, b) in pts:
            if face == 'top':
                d = ((U - a) ** 2 + (V - b) ** 2 <= 5.5) & (Z > s - 2)
            elif face == 'x':
                d = ((V - a) ** 2 + (Z - b) ** 2 <= 5.5) & (U > s - 2)
            else:
                d = ((U - a) ** 2 + (Z - b) ** 2 <= 5.5) & (V > s - 2)
            m[d & sel] = pip
    q = s / 4
    pips('top', [(q, q), (c, c), (s - q, s - q)])
    pips('x', [(q, q), (s - q, s - q), (q, s - q), (s - q, q)])
    pips('y', [(c, c), (q, q), (s - q, s - q), (q, s - q), (s - q, q)])
    return m


def ball(M, r=20):
    S = 2 * r + 2
    m = np.zeros((S, S, S), np.uint8)
    U, V, Z = coords(m)
    c = S / 2
    sel = (U - c) ** 2 + (V - c) ** 2 + (Z - c) ** 2 <= r * r
    ang = np.arctan2(V - c, U - c)
    seg = ((ang + np.pi) / (2 * np.pi) * 6).astype(int) % 6
    cols = ['red', 'gold', 'blue', 'white', 'red', 'leaf_l']
    for i, k in enumerate(cols):
        m[sel & (seg == i)] = M[k]
    m[sel & ((U - c) ** 2 + (V - c) ** 2 < 9) & (Z > c)] = M['white']
    return m


def gem(M, mat='gem'):
    m = np.zeros((5, 5, 7), np.uint8)
    U, V, Z = coords(m)
    sel = np.abs(U - 2.5) + np.abs(V - 2.5) + np.abs(Z - 3.5) * 0.7 <= 2.6
    m[sel] = M[mat]
    return m


def medkit(M):
    m = np.zeros((10, 8, 7), np.uint8)
    m[...] = M['white']
    m[4:6, 1:7, 6] = M['red']; m[2:8, 3:5, 6] = M['red']
    m[4:6, 7, 2:6] = M['red']; m[9, 3:5, 2:6] = M['red']
    return m
