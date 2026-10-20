// Земля ступеней: сетка клеток с цветами (пиксельные «плитки» в изометрии).
// Каждая ступень вложена в следующую: арена ступени n — «реликвия» в мире n+1 (в 4 раза крупнее).
// Поэтому вокруг арены всегда видна земля следующего мира, а отъезд камеры при переходе непрерывен.

import * as THREE from 'three';
import { PAL } from './vox';
import { STAGE_DEFS } from '../sim/content/stages';
import { STAGE_GROWTH } from '../sim/types';

// ---------------------------------------------------------------- шум
function hash(x: number, y: number, s: number): number { let h = (x * 374761393 + y * 668265263 + s * 974634257) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, s: number, oct = 3): number {
  let t = 0, amp = 1, sum = 0;
  for (let i = 0; i < oct; i++) { t += vnoise(x, y, s + i * 17) * amp; sum += amp; amp *= 0.5; x *= 2.03; y *= 2.03; }
  return t / sum;
}
/** Расстояние до ломаной (тропинки, реки, дороги). */
function segD(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - ax - vx * t, y - ay - vy * t);
}

export interface Cell { c: string; h?: number }

// ---------------------------------------------------------------- стили ступеней (координаты — единицы ступени)

type Style = (x: number, y: number, w: number, h: number) => Cell;

const toyGround: Style = (x, y, w, h) => {
  const n = fbm(x / 160, y / 160, 3), m = fbm(x / 40, y / 40, 9);
  // песчаные тропинки по «полигону»
  const d = Math.min(segD(x, y, 0, h * 0.3, w, h * 0.42), segD(x, y, w * 0.32, 0, w * 0.5, h), segD(x, y, w * 0.7, 0, w * 0.82, h));
  if (d + (m - 0.5) * 40 < 26) return { c: m > 0.62 ? 'dirt_l' : m < 0.4 ? 'dirt_d' : 'dirt', h: -0.6 };
  // плиточная дорога через центр
  if (Math.abs(y - h / 2) < 34 && x > w * 0.12 && x < w * 0.88) {
    const tx = Math.floor(x / 22), ty = Math.floor((y - h / 2 + 34) / 22);
    return { c: (tx + ty) % 2 ? 'stone' : hash(tx, ty, 4) > 0.75 ? 'stone_d' : 'stone_l' };
  }
  return { c: n > 0.6 ? 'grass_l' : n < 0.38 ? 'grass_d' : m > 0.7 ? 'grass_ll' : 'grass' };
};

const carpet: Style = (x, y, w, h) => {
  // ковёр с орнаментом на дощатом полу
  const bx = Math.min(x, w - x), by = Math.min(y, h - y), b = Math.min(bx, by);
  if (b < 120) {
    const plank = Math.floor(y / 90), seam = (x + hash(plank, 0, 2) * 400) % 400 < 6;
    return { c: seam || y % 90 < 5 ? 'wood_d' : plank % 3 === 0 ? 'wood_l' : 'wood', h: -1 };
  }
  const k = b - 120;
  if (k < 40) return { c: Math.floor(k / 10) % 2 ? 'fabric_y' : 'fabric_r' };
  const cx = x - w / 2, cy = (y - h / 2) * 1.6, r = Math.hypot(cx, cy);
  const ring = Math.floor(r / 120) % 4;
  const diamond = (Math.abs(cx) + Math.abs(cy)) % 160 < 18;
  return { c: diamond ? 'cream' : ['fabric_r', 'cream', 'fabric_b', 'cream'][ring] };
};

const roomFloor: Style = (x, y) => {
  // паркет «ёлочкой» и коврик
  const s = 60, i = Math.floor(x / s), j = Math.floor(y / s), fx = x - i * s, fy = y - j * s;
  const horiz = (i + j) % 2 === 0;
  const plank = horiz ? Math.floor(fy / 15) : Math.floor(fx / 15);
  const seam = horiz ? fy % 15 < 2 : fx % 15 < 2;
  const t = hash(i * 7 + plank, j, 3);
  return { c: seam ? 'wood_d' : t > 0.66 ? 'wood_l' : t < 0.25 ? 'plank' : 'wood' };
};

const apartment: Style = (x, y, w, h) => {
  // комнаты: кухонная плитка, ковры, коридор с ламинатом
  const room = (x < w * 0.38 ? 0 : x < w * 0.7 ? 1 : 2) + (y < h * 0.5 ? 0 : 3);
  if (room === 0 || room === 5) { const t = Math.floor(x / 40) + Math.floor(y / 40); return { c: t % 2 ? 'white' : 'stone_l' }; }
  if (room === 1 || room === 4) { const n = fbm(x / 90, y / 90, 6); return { c: n > 0.55 ? 'fabric_b' : 'blue_d' }; }
  const plank = Math.floor(y / 50); const seam = (x + hash(plank, 1, 5) * 300) % 300 < 4 || y % 50 < 3;
  return { c: seam ? 'wood_d' : plank % 2 ? 'wood_l' : 'plank' };
};

const streets: Style = (x, y) => {
  // кварталы: асфальт с разметкой, тротуары, газоны
  const B = 360, ix = ((x % B) + B) % B, iy = ((y % B) + B) % B;
  const road = ix < 70 || iy < 70;
  if (road) {
    const mark = (ix < 70 && Math.abs(ix - 35) < 2 && Math.floor(y / 30) % 2) || (iy < 70 && Math.abs(iy - 35) < 2 && Math.floor(x / 30) % 2);
    return { c: mark ? 'white' : 'asphalt', h: -0.5 };
  }
  if (ix < 86 || iy < 86 || ix > B - 16 || iy > B - 16) return { c: 'concrete_l' };
  const n = fbm(x / 70, y / 70, 8);
  return { c: n > 0.6 ? 'grass_l' : 'grass' };
};

const megapolis: Style = (x, y) => {
  const B = 240, ix = ((x % B) + B) % B, iy = ((y % B) + B) % B;
  if (ix < 44 || iy < 44) return { c: (ix < 44 && Math.abs(ix - 22) < 1.5) || (iy < 44 && Math.abs(iy - 22) < 1.5) ? 'yel' : 'asphalt_d', h: -0.5 };
  const blk = hash(Math.floor(x / B), Math.floor(y / B), 7);
  if (blk < 0.15) return { c: fbm(x / 40, y / 40, 2) > 0.5 ? 'grass' : 'grass_d' };
  return { c: blk < 0.55 ? 'concrete' : 'concrete_d' };
};

const titans: Style = (x, y) => {
  // вид с высоты: поля-лоскуты, леса, реки, дороги-нити
  const river = Math.abs(y - 800 - Math.sin(x / 300) * 220) < 36;
  if (river) return { c: 'water', h: -1 };
  const n = fbm(x / 500, y / 500, 4);
  if (n < 0.36) return { c: fbm(x / 60, y / 60, 5) > 0.5 ? 'leaf_d' : 'leaf' };
  const fi = Math.floor((x + Math.sin(y / 200) * 40) / 160), fj = Math.floor(y / 130);
  const t = hash(fi, fj, 9);
  if ((x + 7) % 480 < 8 || (y + 11) % 390 < 8) return { c: 'dirt_d' };
  return { c: t < 0.3 ? 'grass_l' : t < 0.55 ? 'khaki' : t < 0.75 ? 'grass' : 'sand' };
};

const planet: Style = (x, y) => {
  // поверхность планеты: океаны, материки, лёд, лава
  const n = fbm(x / 700, y / 700, 11, 4), m = fbm(x / 120, y / 120, 13);
  if (n < 0.42) return { c: n < 0.36 ? 'water_d' : 'water', h: -1 };
  if (n < 0.45) return { c: 'sand' };
  if (m > 0.72 && n > 0.6) return { c: 'lava', h: -0.5 };
  if (n > 0.66) return { c: m > 0.5 ? 'rock_l' : 'rock' };
  const lat = Math.abs(y / 1620 - 0.5);
  if (lat > 0.42) return { c: 'ice_l' };
  return { c: m > 0.55 ? 'leaf' : m < 0.35 ? 'ash' : 'grass_d' };
};

/** Стол с глобусом — мир «за» последней ступенью (финал). */
const desk: Style = (x, y) => {
  const plank = Math.floor(y / 260), g = Math.sin(x / 90 + Math.sin(y / 140 + plank) * 2);
  return { c: y % 260 < 8 ? 'wood_d' : g > 0.85 ? 'wood_l' : 'wood' };
};

export const STYLES: Style[] = [toyGround, carpet, roomFloor, apartment, streets, megapolis, titans, planet, desk];

/** Цвет клетки ступени s в её координатах, с реликвией предыдущей ступени. */
export function cellAt(s: number, x: number, y: number): Cell {
  if (s > 0 && s < 8) {
    const st = STAGE_DEFS[s], prev = STAGE_DEFS[s - 1], G = STAGE_GROWTH;
    const rx0 = st.relicX - prev.w / G / 2, ry0 = st.relicY - prev.h / G / 2;
    if (x >= rx0 && y >= ry0 && x < rx0 + prev.w / G && y < ry0 + prev.h / G) return cellAt(s - 1, (x - rx0) * G, (y - ry0) * G);
  }
  const d = STAGE_DEFS[Math.min(s, 7)];
  return STYLES[s](x, y, d?.w ?? 2880, d?.h ?? 1620);
}

const col = new THREE.Color();
/** Плита земли: клетки cs×cs в прямоугольнике [x0..x1]×[y0..y1] (координаты ступени s). */
export function groundMesh(s: number, x0: number, y0: number, x1: number, y1: number, cs: number, mat: THREE.Material): THREE.Mesh {
  const nx = Math.ceil((x1 - x0) / cs), ny = Math.ceil((y1 - y0) / cs);
  const pos = new Float32Array(nx * ny * 18), nor = new Float32Array(nx * ny * 18), cl = new Float32Array(nx * ny * 18);
  let o = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * cs, y = y0 + j * cs;
    const c = cellAt(s, x + cs / 2, y + cs / 2);
    col.set(PAL[c.c] ?? c.c);
    const jit = 1 + (hash(i, j, s + 5) - 0.5) * 0.05;
    col.multiplyScalar(jit);
    const hgt = (c.h ?? 0) * (cs / 10);
    const quad = [[x, y], [x, y + cs], [x + cs, y + cs], [x, y], [x + cs, y + cs], [x + cs, y]];
    for (const [qx, qy] of quad) {
      pos[o] = qx; pos[o + 1] = hgt; pos[o + 2] = qy;
      nor[o] = 0; nor[o + 1] = 1; nor[o + 2] = 0;
      cl[o] = col.r; cl[o + 1] = col.g; cl[o + 2] = col.b;
      o += 3;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

/** Бортик арены (рамка) — чтобы граница мира читалась. */
export function frameMesh(s: number, w: number, h: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const colName = ['wood_l', 'fabric_y', 'wood_d', 'white_d', 'concrete_l', 'concrete', 'rock_l', 'rock'][s] ?? 'wood';
  const t = Math.max(w, h) * 0.012, hh = t * 0.9;
  const box = (bw: number, bd: number, x: number, y: number) => {
    const geo = new THREE.BoxGeometry(bw, hh, bd);
    const c = new THREE.Color(PAL[colName]);
    const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const top = geo.attributes.position.getY(i) > 0; const k = top ? 1.08 : 0.8; arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.Mesh(geo, mat); m.position.set(x, hh / 2 - 0.5, y); m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  box(w + t * 2, t, w / 2, -t / 2); box(w + t * 2, t, w / 2, h + t / 2);
  box(t, h, -t / 2, h / 2); box(t, h, w + t / 2, h / 2);
  return g;
}
