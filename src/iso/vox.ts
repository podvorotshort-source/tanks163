// Воксельные модели для изометрического пиксель-арта.
// Модель собирается кодом в сетке вокселей (x — нос, y — вверх, z — правый борт), затем превращается
// в сетку граней с цветами вершин и мягким затенением углов. 3D-вывод рисует её в низком разрешении
// с контуром — получается пиксель-арт, в котором поворот, рост и отъезд камеры не ломают пиксели.

import * as THREE from 'three';

// ---------------------------------------------------------------- палитра (общая для всей игры)
export const PAL: Record<string, string> = {
  // земля, природа
  grass: '#539236', grass_d: '#36702f', grass_l: '#7eb346', grass_ll: '#a8d05e', leaf: '#3f8530', leaf_d: '#28622a', leaf_l: '#68a63c', berry: '#e2483a',
  dirt: '#8f6942', dirt_d: '#6e4c33', dirt_l: '#ae8a57', sand: '#d9b77a', sand_d: '#b8955e',
  stone: '#8a90a0', stone_d: '#5f6578', stone_l: '#b4bac6', rock: '#6e6670', rock_d: '#4a4250', rock_l: '#958c96',
  water: '#3a9ad0', water_d: '#2a6fa8', water_l: '#7cc8e8', foam: '#d8f2f6', ice: '#a8e0f0', ice_d: '#6cb2d6', ice_l: '#e2f6fc',
  lava: '#f25c1a', lava_l: '#ffb238', lava_d: '#a8240e', ash: '#3c3540',
  // дерево, ткань, бумага
  wood: '#b07440', wood_d: '#7e4c28', wood_l: '#d39a5a', plank: '#c58a4e', fabric_r: '#c8424a', fabric_b: '#3e6cc0', fabric_y: '#e6b33a',
  paper: '#f2ead6', paper_d: '#cfc2a2', cream: '#efe3c8', cardboard: '#c39a62', cardboard_d: '#9a7444',
  // металл
  steel: '#8e96a8', steel_d: '#5c6478', steel_l: '#bcc4d0', gun: '#4a5064', gun_d: '#2f3241', gun_l: '#6e768a', black: '#1e1f28', chrome: '#d6dce6',
  rubber: '#2c2d36', rubber_l: '#43454f', brass: '#d4a53a', gold: '#f2c23a', gold_d: '#b8801e', copper: '#c8743a',
  // цвета техники
  yel: '#f2b92f', yel_d: '#c8861e', yel_l: '#ffe066', navy: '#2e3f68', navy_d: '#1c2645', navy_l: '#4a6296',
  green: '#5f8f3e', green_d: '#3f6a2c', green_l: '#8ab65a', red: '#d23a32', red_d: '#94202a', red_l: '#f2684a',
  blue: '#3e7ad6', blue_d: '#2a52a0', blue_l: '#76aaf0', white: '#e8e6ee', white_d: '#b8b4c6', orange: '#f08a2a', orange_d: '#b85818',
  purple: '#8a4ec0', purple_d: '#5c2e8a', pink: '#f07aa0', teal: '#2fa8a0', teal_d: '#1e7270', khaki: '#a8a060', khaki_d: '#7a7440',
  army: '#5d7a3a', army_d: '#46602c', army_l: '#7d9a4c', camo: '#6e6a3a', concrete: '#a4a2a0', concrete_d: '#7a7876', concrete_l: '#c8c6c2',
  asphalt: '#4a4a52', asphalt_d: '#38383f', asphalt_l: '#62626a', brick: '#b8523a', brick_d: '#8a3a2c', brick_l: '#d8724e', mortar: '#d8c8a8',
  brk: '#c4552f', brk_l: '#d96a3a', brk_ll: '#ec8f58', brk_d: '#97391f', brk_m: '#5c2620',
  stl: '#8692aa', stl_l: '#ccd5e3', stl_d: '#58627c', stl_s: '#363d55', stl_r: '#e6ecf5',
  // ЛЕГО (реликвия I ступени): оранжевый и серый пластик
  lego_o: '#f47d1e', lego_ol: '#ffad4a', lego_od: '#bf5513', lego_g: '#a2a8b4', lego_gl: '#d3d8e0', lego_gd: '#6c7384', shine: '#fff6e0',
  glass: '#7cc0e0', glass_d: '#4a86b0', roof: '#a8443a', roof_d: '#7a2e28', plastic: '#e0583a', toy_b: '#3a7ee0', toy_g: '#4ab84a', toy_y: '#f2c43a',
  bone: '#e8dcc0', bread: '#d89a50', flesh: '#c87a6a', alien: '#7a3ec0', alien_d: '#4a2280', alien_l: '#b07ae8', void: '#2a1840', crystal: '#9ae0f0', magma: '#e8401a',
  // светящееся (без света сцены)
  lamp: '#fff4c8', glow_y: '#ffd23a', glow_g: '#7cff5a', glow_r: '#ff4a26', magma_d: '#c8281a', lamp_r: '#ff5a3c', lamp_g: '#7cff6a', lamp_o: '#ffb238', eye_r: '#ff3020', glow_p: '#d070ff', glow_c: '#7ae8ff', fire: '#ff9a2a',
};
export const GLOW = new Set(['glow_y', 'glow_g', 'glow_r', 'lamp', 'lamp_r', 'lamp_g', 'lamp_o', 'eye_r', 'glow_p', 'glow_c', 'fire', 'lava', 'lava_l', 'magma']);

const names: string[] = [''];
const index = new Map<string, number>();
const colors: THREE.Color[] = [new THREE.Color(0)];
export function mi(name: string): number {
  let i = index.get(name);
  if (i === undefined) {
    const hex = PAL[name] ?? name;
    i = names.length; names.push(name); index.set(name, i); colors.push(new THREE.Color(hex));
  }
  return i;
}

// ---------------------------------------------------------------- сетка вокселей
export class Vox {
  d: Uint8Array;
  constructor(public nx: number, public ny: number, public nz: number) { this.d = new Uint8Array(nx * ny * nz); }
  idx(x: number, y: number, z: number): number { return x + this.nx * (y + this.ny * z); }
  get(x: number, y: number, z: number): number { return x < 0 || y < 0 || z < 0 || x >= this.nx || y >= this.ny || z >= this.nz ? 0 : this.d[this.idx(x, y, z)]; }
  set(x: number, y: number, z: number, m: string | number): void {
    x |= 0; y |= 0; z |= 0;
    if (x >= 0 && y >= 0 && z >= 0 && x < this.nx && y < this.ny && z < this.nz) this.d[this.idx(x, y, z)] = typeof m === 'string' ? mi(m) : m;
  }
  /** Заполнить по условию (центры ячеек). fn вернёт имя цвета, 0 — стереть, undefined — не трогать. */
  fill(fn: (x: number, y: number, z: number, cur: number) => string | number | undefined, x0 = 0, x1 = this.nx, y0 = 0, y1 = this.ny, z0 = 0, z1 = this.nz): this {
    const ax = Math.max(0, Math.floor(x0)), bx = Math.min(this.nx, Math.ceil(x1));
    const ay = Math.max(0, Math.floor(y0)), by = Math.min(this.ny, Math.ceil(y1));
    const az = Math.max(0, Math.floor(z0)), bz = Math.min(this.nz, Math.ceil(z1));
    for (let z = az; z < bz; z++) for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) {
      const i = this.idx(x, y, z);
      const m = fn(x + 0.5, y + 0.5, z + 0.5, this.d[i]);
      if (m !== undefined) this.d[i] = typeof m === 'string' ? mi(m) : m;
    }
    return this;
  }
  /** Брус [x0,x1)×[y0,y1)×[z0,z1). */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: string | number): this { return this.fill(() => m, x0, x1, y0, y1, z0, z1); }
  /** Брус с центром по z (симметричный по бортам). */
  boxc(x0: number, x1: number, y0: number, y1: number, hw: number, m: string | number): this { const c = this.nz / 2; return this.box(x0, x1, y0, y1, c - hw, c + hw, m); }
  cylY(cx: number, cz: number, r: number, y0: number, y1: number, m: string | number, r2 = r): this {
    return this.fill((x, y, z) => { const t = (y - y0) / Math.max(1e-6, y1 - y0), rr = r + (r2 - r) * t; return (x - cx) ** 2 + (z - cz) ** 2 <= rr * rr ? m : undefined; }, cx - Math.max(r, r2) - 1, cx + Math.max(r, r2) + 1, y0, y1, cz - Math.max(r, r2) - 1, cz + Math.max(r, r2) + 1);
  }
  cylX(cy: number, cz: number, r: number, x0: number, x1: number, m: string | number, r2 = r): this {
    return this.fill((x, y, z) => { const t = (x - x0) / Math.max(1e-6, x1 - x0), rr = r + (r2 - r) * t; return (y - cy) ** 2 + (z - cz) ** 2 <= rr * rr ? m : undefined; }, x0, x1, cy - Math.max(r, r2) - 1, cy + Math.max(r, r2) + 1, cz - Math.max(r, r2) - 1, cz + Math.max(r, r2) + 1);
  }
  cylZ(cx: number, cy: number, r: number, z0: number, z1: number, m: string | number): this {
    return this.fill((x, y, z) => ((x - cx) ** 2 + (y - cy) ** 2 <= r * r ? m : undefined), cx - r - 1, cx + r + 1, cy - r - 1, cy + r + 1, z0, z1);
  }
  ell(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, m: string | number): this {
    return this.fill((x, y, z) => (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1 ? m : undefined), cx - rx - 1, cx + rx + 1, cy - ry - 1, cy + ry + 1, cz - rz - 1, cz + rz + 1);
  }
  sphere(cx: number, cy: number, cz: number, r: number, m: string | number): this { return this.ell(cx, cy, cz, r, r, r, m); }
  /** Толстый отрезок (ноги, антенны, балки). */
  seg(a: [number, number, number], b: [number, number, number], r: number, m: string | number): this {
    const [ax, ay, az] = a, [bx, by, bz] = b;
    const vx = bx - ax, vy = by - ay, vz = bz - az, L2 = vx * vx + vy * vy + vz * vz || 1;
    return this.fill((x, y, z) => {
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy + (z - az) * vz) / L2));
      const dx = x - (ax + vx * t), dy = y - (ay + vy * t), dz = z - (az + vz * t);
      return dx * dx + dy * dy + dz * dz <= r * r ? m : undefined;
    }, Math.min(ax, bx) - r - 1, Math.max(ax, bx) + r + 1, Math.min(ay, by) - r - 1, Math.max(ay, by) + r + 1, Math.min(az, bz) - r - 1, Math.max(az, bz) + r + 1);
  }
  /** Срезать по плоскости: стереть всё, где a·x + b·y + c·z > d (скосы брони). */
  cut(a: number, b: number, c: number, d: number, x0 = 0, x1 = this.nx, y0 = 0, y1 = this.ny, z0 = 0, z1 = this.nz): this {
    return this.fill((x, y, z) => (a * x + b * y + c * z > d ? 0 : undefined), x0, x1, y0, y1, z0, z1);
  }
  /** Перекрасить существующие воксели в области. */
  paint(fn: (x: number, y: number, z: number, cur: number) => string | number | undefined, x0 = 0, x1 = this.nx, y0 = 0, y1 = this.ny, z0 = 0, z1 = this.nz): this {
    return this.fill((x, y, z, c) => (c ? fn(x, y, z, c) : undefined), x0, x1, y0, y1, z0, z1);
  }
  /** Зеркально скопировать левую половину по z на правую. */
  mirrorZ(): this {
    for (let z = 0; z < this.nz / 2; z++) for (let y = 0; y < this.ny; y++) for (let x = 0; x < this.nx; x++) {
      const v = this.d[this.idx(x, y, z)];
      if (v) this.d[this.idx(x, y, this.nz - 1 - z)] = v;
    }
    return this;
  }
}

// ---------------------------------------------------------------- сетка граней
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];
for (const f of FACES) {
  const [a, b, c] = f.c.map(v => new THREE.Vector3(...(v as [number, number, number])));
  const cr = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  if (cr.dot(new THREE.Vector3(...(f.n as [number, number, number]))) < 0) f.c.reverse();
}
const AO = [0.55, 0.72, 0.87, 1];
const hash3 = (x: number, y: number, z: number) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export interface MeshOpts {
  /** Сдвиг начала координат (в вокселях): по умолчанию центр по x/z, низ по y. */
  pivot?: [number, number, number];
  /** Размер вокселя в единицах модели. */
  scale?: number;
  /** Разброс яркости вокселей (живость цвета). */
  jitter?: number;
  /** Не строить нижние грани (стоит на земле). */
  bottom?: boolean;
}

/** Две геометрии: обычная (с освещением) и светящаяся (без освещения), может быть null. */
export function meshVox(v: Vox, o: MeshOpts = {}): { lit: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null } {
  const s = o.scale ?? 1, jit = o.jitter ?? 0.05;
  const [px, py, pz] = o.pivot ?? [v.nx / 2, 0, v.nz / 2];
  const bufs = [{ p: [] as number[], n: [] as number[], c: [] as number[] }, { p: [] as number[], n: [] as number[], c: [] as number[] }];
  const solid = (x: number, y: number, z: number) => v.get(x, y, z) > 0;
  const cc = new THREE.Color();
  for (let z = 0; z < v.nz; z++) for (let y = 0; y < v.ny; y++) for (let x = 0; x < v.nx; x++) {
    const m = v.d[x + v.nx * (y + v.ny * z)];
    if (!m) continue;
    const glow = GLOW.has(names[m]);
    const B = bufs[glow ? 1 : 0];
    const j = 1 + (hash3(x, y, z) - 0.5) * jit * 2;
    for (let fi = 0; fi < 6; fi++) {
      if (fi === 3 && !o.bottom) continue;
      const f = FACES[fi], nx = f.n[0], ny = f.n[1], nz = f.n[2];
      if (solid(x + nx, y + ny, z + nz)) continue;
      const vs: number[][] = [];
      for (const cn of f.c) {
        let ao = 3;
        if (!glow) {
          const ox = x + nx, oy = y + ny, oz = z + nz;
          const ax: number[][] = [];
          if (nx === 0) ax.push([cn[0] * 2 - 1, 0, 0]);
          if (ny === 0) ax.push([0, cn[1] * 2 - 1, 0]);
          if (nz === 0) ax.push([0, 0, cn[2] * 2 - 1]);
          const s1 = solid(ox + ax[0][0], oy + ax[0][1], oz + ax[0][2]) ? 1 : 0;
          const s2 = solid(ox + ax[1][0], oy + ax[1][1], oz + ax[1][2]) ? 1 : 0;
          const cr = solid(ox + ax[0][0] + ax[1][0], oy + ax[0][1] + ax[1][1], oz + ax[0][2] + ax[1][2]) ? 1 : 0;
          ao = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
        }
        cc.copy(colors[m]).multiplyScalar(j * AO[ao]);
        vs.push([(x + cn[0] - px) * s, (y + cn[1] - py) * s, (z + cn[2] - pz) * s, cc.r, cc.g, cc.b]);
      }
      // два треугольника (0,1,2) (0,2,3)
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const q = vs[k];
        B.p.push(q[0], q[1], q[2]); B.n.push(nx, ny, nz); B.c.push(q[3], q[4], q[5]);
      }
    }
  }
  const mk = (B: { p: number[]; n: number[]; c: number[] }) => {
    if (!B.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
    g.computeBoundingSphere();
    return g;
  };
  return { lit: mk(bufs[0]), glow: mk(bufs[1]) };
}

// ---------------------------------------------------------------- модели из частей

export interface PartDef {
  name: string;
  vox: Vox;
  /** Точка вращения части в вокселях (по умолчанию центр низа). */
  pivot?: [number, number, number];
  /** Где стоит pivot части относительно начала модели (в вокселях). */
  at?: [number, number, number];
  /** Ось вращения части (по умолчанию y — башни). */
  axis?: 'x' | 'y' | 'z';
}

export interface ModelDef {
  parts: PartDef[];
  /** Характерный размер модели в вокселях (сопоставляется с size сущности). */
  size: number;
  /** Для препятствий: размер основания в вокселях (x, z) — растягивается на w×h препятствия. */
  foot?: [number, number];
}

export interface BuiltPart { name: string; lit: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null; at: THREE.Vector3; axis: 'x' | 'y' | 'z' }
export interface BuiltModel { parts: BuiltPart[]; size: number; foot?: [number, number] }

/** Собрать геометрии частей (единицы — воксели; масштаб задаёт вывод). */
export function buildModel(def: ModelDef): BuiltModel {
  return {
    size: def.size,
    foot: def.foot,
    parts: def.parts.map(p => {
      const g = meshVox(p.vox, { pivot: p.pivot });
      const at = new THREE.Vector3(...(p.at ?? [0, 0, 0]));
      return { name: p.name, lit: g.lit, glow: g.glow, at, axis: p.axis ?? 'y' };
    }),
  };
}
