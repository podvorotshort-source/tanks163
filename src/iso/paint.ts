// Художник земли: картинка ступени попиксельно, в экранной сетке изометрии (1 пиксель рисунка = 1 пиксель кадра
// при боевом масштабе ART_Z). Правила пиксель-арта: рампы с поворотом оттенка (тени холоднее, свет теплее),
// крупные пятна тона без шума, фактура — ручными «штампами» (травинки, цветы, камешки, рябь, булыжники),
// у приподнятых краёв — боковая грань и падающая тень. Свет — сверху-слева.
//
// Слои: материал и тон каждого пикселя → соседские правки (тень под кромкой травы, блик у берега) →
// штампы → боковые грани арены/реликвии с тенью → цвет. Арена ступени окружена миром следующей ступени
// (в масштабе этой) — он виден у краёв и при отъезде камеры.

import * as THREE from 'three';
import { ISO_X, ISO_Y } from '../client/camera';
import { STAGE_DEFS, type StageDef } from '../sim/content/stages';
import { STAGE_GROWTH } from '../sim/types';
import { Rng } from '../core/rng';
import { cellAt } from './ground';
import { PAL } from './vox';
import type { GroundLayer } from './renderer';

/** Боевой масштаб: пикселей кадра на единицу мира (одинаков на всех ступенях). */
export const ART_Z = 1.0;
const MARGIN = 180;
/** Насколько за край арены рисуется мир следующей ступени (ед.): камера у углов арены заглядывает за край. */
const OUTER = 520;
const G = STAGE_GROWTH;

// ---------------------------------------------------------------- цвет
const pack = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
};
const ramp = (...h: string[]) => h.map(pack);

// Рампы: от тени к свету, оттенок смещается (тень — к синему/фиолетовому, свет — к жёлтому).
const GRASS = ramp('#1d3f2e', '#245a31', '#2f7634', '#43933a', '#62b243', '#88cc4f', '#b4e270');
const DIRT = ramp('#3a2228', '#56342b', '#774a32', '#95633d', '#b07d4b', '#c99a62');
const TILE = ramp('#2a2a40', '#43465e', '#5d6479', '#7a8396', '#99a3b3', '#bcc5d0');
const WATER = ramp('#16295e', '#1b4386', '#2462ae', '#3383cc', '#55a6e0', '#93d0f0', '#dff5fb');
const STONE = ramp('#2a2636', '#45404f', '#635e6b', '#85818b', '#a8a5ad', '#cfccd2');
const WOOD = ramp('#34192a', '#552a25', '#76402c', '#975a35', '#b57540', '#cf9452', '#e8b874');
const SHADOW = pack('#1b1230');
const CARPET: number[][] = [
  ramp('#c9b49a', '#e6d6bd', '#f6ecd8'),   // 0 кремовый
  ramp('#6e1f2e', '#8f2a33', '#ac3a3c'),   // 1 тёмно-красный
  ramp('#1f2f6a', '#2c4592', '#3d5fb4'),   // 2 синий
  ramp('#9a2a30', '#bf3a3a', '#d8574a'),   // 3 красный
  ramp('#b07a1e', '#d9a232', '#f0c450'),   // 4 золотистый
];
const FLOWERS = ['#e8484a', '#f6d24a', '#f4f2f8', '#ec74ae', '#9a72e0'].map(pack);

const enum Mt { VOID = 0, GRASS, DIRT, TILE, WATER, RIM, WOOD, CARPET, GENERIC }
const RAMPS: Record<number, number[]> = { [Mt.GRASS]: GRASS, [Mt.DIRT]: DIRT, [Mt.TILE]: TILE, [Mt.WATER]: WATER, [Mt.RIM]: STONE, [Mt.WOOD]: WOOD };

// ---------------------------------------------------------------- шум
const hash = (x: number, y: number, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(x: number, y: number, s: number): number {
  return vnoise(x, y, s) * 0.64 + vnoise(x * 2.3, y * 2.3, s + 7) * 0.36;
}
function segD(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return len(px - ax - vx * t, py - ay - vy * t);
}

// ---------------------------------------------------------------- материалы ступеней
interface Smp { m: number; t: number; a: number }
interface Rect { x0: number; y0: number; x1: number; y1: number }

/** Пруды (вода из препятствий ступени) — для мягких берегов. */
class Ponds {
  private cells = new Map<number, Rect[]>();
  constructor(rects: Rect[]) {
    for (const r of rects) for (let cx = Math.floor((r.x0 - 20) / 128); cx <= Math.floor((r.x1 + 20) / 128); cx++) for (let cy = Math.floor((r.y0 - 20) / 128); cy <= Math.floor((r.y1 + 20) / 128); cy++) {
      const k = cx * 4096 + cy;
      let a = this.cells.get(k); if (!a) this.cells.set(k, (a = []));
      a.push(r);
    }
  }
  /** Знаковое расстояние до воды (отрицательное — в воде), берега скруглены. */
  sdf(x: number, y: number): number {
    const a = this.cells.get(Math.floor(x / 128) * 4096 + Math.floor(y / 128));
    if (!a) return 99;
    let d = 99;
    for (const r of a) {
      const hw = (r.x1 - r.x0) / 2, hh = (r.y1 - r.y0) / 2, rr = Math.min(hw, hh) * 0.75;
      const qx = Math.abs(x - (r.x0 + hw)) - (hw - rr), qy = Math.abs(y - (r.y0 + hh)) - (hh - rr);
      const o = len(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
      if (o < 14) d = Math.min(d, o + (vnoise(x / 22, y / 22, 5) - 0.5) * 8);
    }
    return d;
  }
}

const pondCache = new Map<string, Ponds>();
let lastPond: { s: number; seed: number; p: Ponds } | null = null;
function pondsOf(s: number, seed: number): Ponds {
  if (lastPond && lastPond.s === s && lastPond.seed === seed) return lastPond.p;
  const key = s + ':' + seed;
  let p = pondCache.get(key);
  if (!p) {
    const def = STAGE_DEFS[s];
    const props = def.props(new Rng((seed ^ (s * 7919)) >>> 0), def);
    p = new Ponds(props.filter(q => q.kind === 'water').map(q => ({ x0: q.x - q.w / 2, y0: q.y - q.h / 2, x1: q.x + q.w / 2, y1: q.y + q.h / 2 })));
    pondCache.set(key, p);
  }
  lastPond = { s, seed, p };
  return p;
}

const RELICS: (Rect | null)[] = Array.from({ length: 9 }, (_, s) => {
  if (s < 1 || s > 7) return null;
  const st = STAGE_DEFS[s], pv = STAGE_DEFS[s - 1];
  return { x0: st.relicX - pv.w / G / 2, y0: st.relicY - pv.h / G / 2, x1: st.relicX + pv.w / G / 2, y1: st.relicY + pv.h / G / 2 };
});
const relicRect = (s: number): Rect | null => RELICS[s] ?? null;
const len = (a: number, b: number) => Math.sqrt(a * a + b * b);
const inRect = (r: Rect, x: number, y: number) => x >= r.x0 && y >= r.y0 && x < r.x1 && y < r.y1;

/** Ступень I: игрушечный полигон — трава, грунтовые тропы, пруды с каменными берегами. */
function toy(x: number, y: number, ponds: Ponds, o: Smp): void {
  const w = 2880, h = 1620;
  const d = ponds.sdf(x, y);
  if (d < 0) { const dp = -d; o.m = Mt.WATER; o.t = dp < 7 ? 4 : dp < 20 ? 3 : 2; return; }
  if (d < 10) { o.m = Mt.RIM; o.t = 1; return; }
  const pd = Math.min(segD(x, y, 0, h * 0.28, w, h * 0.44), segD(x, y, w * 0.3, 0, w * 0.48, h), segD(x, y, w * 0.72, 0, w * 0.84, h));
  const m = pd < 60 ? fbm(x / 48, y / 48, 9) : 0.5;
  if (pd + (m - 0.5) * 46 < 34) { o.m = Mt.DIRT; o.t = m > 0.62 ? 4 : m < 0.38 ? 2 : 3; return; }
  const n = fbm(x / 190, y / 190, 3), n2 = vnoise(x / 34, y / 34, 21);
  o.m = Mt.GRASS;
  o.t = n > 0.6 ? 4 : n < 0.37 ? 2 : 3;
  if (n2 > 0.8 && o.t < 5) o.t++;
}

/** Ступень II: детская — дощатый пол, большой ковёр с орнаментом, круглый коврик. */
function nursery(x: number, y: number, o: Smp): void {
  const cx0 = 170, cx1 = 900, cy0 = 190, cy1 = 1430;
  if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) {
    o.m = Mt.CARPET;
    const b = Math.min(x - cx0, cx1 - x, y - cy0, cy1 - y);
    if (b < 12) { o.a = 0; o.t = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 ? 1 : 2; return; }     // бахрома
    if (b < 38) { o.a = 1; o.t = 1; return; }
    if (b < 54) { o.a = 4; o.t = 1; return; }
    if (b < 96) { o.a = 2; o.t = (Math.floor((x + y) / 18) % 2) ? 1 : 2; return; }
    if (b < 108) { o.a = 0; o.t = 1; return; }
    const u = x - (cx0 + cx1) / 2, v = y - (cy0 + cy1) / 2, dd = Math.abs(u) + Math.abs(v) * 0.7;
    if (dd < 150) { o.a = dd < 60 ? 4 : dd < 70 ? 0 : 2; o.t = 1; return; }
    if (dd < 164) { o.a = 0; o.t = 1; return; }
    const lat = (Math.abs(u) + Math.abs(v)) % 130, lat2 = (Math.abs(u) + 130 - Math.abs(v) % 130) % 130;
    o.a = lat < 9 || lat2 < 9 ? 0 : 3; o.t = 1;
    return;
  }
  const ex = (x - 2330) / 300, ey = (y - 1200) / 230, er = len(ex, ey);
  if (er < 1) {
    o.m = Mt.CARPET;
    const ring = Math.floor(er * 7);
    o.a = [4, 2, 0, 2, 0, 1, 2][ring]; o.t = er > 0.96 ? 0 : 1;
    return;
  }
  // дощатый пол: доски вдоль x, швы и торцы, волокна
  const W = 52, row = Math.floor(y / W), fy = y / W - row;
  const L = 420, off = hash(row, 1, 2) * L, fx = ((x + off) % L) / L;
  o.m = Mt.WOOD;
  if (fy < 0.035) { o.t = 1; return; }
  if (fy < 0.075) { o.t = 4; return; }
  if (fx * L < 2.5) { o.t = 1; return; }
  const bt = hash(row, Math.floor((x + off) / L), 3);
  let t = bt < 0.3 ? 2 : bt > 0.75 ? 4 : 3;
  const g = Math.sin(x * 0.045 + fbm(x / 140, y / 9, 6) * 7 + row);
  if (g > 0.93) t--; else if (g < -0.97) t++;
  o.t = t;
}

const genCols = new Map<string, number>();
const genRamps: number[][] = [];
function genericIdx(c: string): number {
  let i = genCols.get(c);
  if (i === undefined) {
    const col = new THREE.Color(PAL[c] ?? c);
    const hsl = { h: 0, s: 0, l: 0 }; col.getHSL(hsl);
    const r: number[] = [];
    for (let k = 0; k < 5; k++) {
      const dl = (k - 2) * 0.09, dh = (k - 2) * 0.025;
      const cc = new THREE.Color().setHSL((hsl.h + (dl < 0 ? 0.05 * (2 - k) / 2 : -dh) + 1) % 1, Math.min(1, hsl.s * (k === 4 ? 0.85 : 1)), Math.min(0.95, Math.max(0.04, hsl.l + dl)));
      r.push(pack('#' + cc.getHexString()));
    }
    i = genRamps.length; genRamps.push(r); genCols.set(c, i);
  }
  return i;
}

/** Материал точки ступени s (с реликвией прежней ступени внутри). */
function sample(s: number, x: number, y: number, seed: number, o: Smp): void {
  const rr = relicRect(s);
  if (rr && inRect(rr, x, y)) { sample(s - 1, (x - rr.x0) * G, (y - rr.y0) * G, seed, o); return; }
  o.a = 0;
  if (s === 0) toy(x, y, pondsOf(0, seed), o);
  else if (s === 1) nursery(x, y, o);
  else {
    const c = cellAt(Math.min(s, 8), x, y);
    o.m = Mt.GENERIC; o.a = genericIdx(c.c);
    const n = fbm(x / 120, y / 120, s * 3);
    o.t = n > 0.64 ? 3 : n < 0.34 ? 1 : 2;
  }
}

// ---------------------------------------------------------------- штампы (dx, dy, сдвиг тона)
type Stamp = [number, number, number][];
const TUFTS: Stamp[] = [
  [[0, -2, 2], [-1, -1, 1], [1, -1, 1], [-1, 0, -1], [0, 0, -1], [1, 0, -1]],
  [[0, -1, 2], [0, 0, -1], [1, 0, -1]],
  [[-1, -1, 1], [1, -2, 2], [2, -1, 1], [0, 0, -1], [1, 0, -1], [2, 0, -1]],
  [[0, 0, -1], [1, 0, -1], [-1, 0, -1], [0, 1, -2], [1, 1, -1]],
];

export interface PaintResult extends GroundLayer { stage: number }

/** Нарисовать землю ступени s. Генератор: отдаёт управление каждые ~N строк (для фоновой подготовки). */
export function* paintStage(s: number, seed: number): Generator<void, PaintResult> {
  const st = STAGE_DEFS[s];
  const W = st.w, H = st.h, Z = ART_Z;
  // границы рисунка: ромб арены + поля
  const u0 = Math.floor(-H * ISO_X * Z) - MARGIN, u1 = Math.ceil(W * ISO_X * Z) + MARGIN;
  const v0 = -MARGIN, v1 = Math.ceil((W + H) * ISO_Y * Z) + MARGIN;
  const w = u1 - u0, h = v1 - v0, N = w * h;
  const mat = new Uint8Array(N), tone = new Int8Array(N), aux = new Uint8Array(N), ov = new Uint32Array(N), shade = new Uint8Array(N), outer = new Uint8Array(N);
  const o: Smp = { m: 0, t: 0, a: 0 };
  const next = s + 1 <= 7 ? STAGE_DEFS[s + 1] : null;
  const KU = 1 / (2 * ISO_X * Z), KV = 1 / (2 * ISO_Y * Z);
  // 1. материал и тон
  for (let j = 0; j < h; j++) {
    const bv = (v0 + j + 0.5) * KV;
    for (let i = 0; i < w; i++) {
      const au = (u0 + i + 0.5) * KU;
      const x = au + bv, y = bv - au;
      const k = j * w + i;
      if (x >= 0 && y >= 0 && x < W && y < H) sample(s, x, y, seed, o);
      else if ((outer[k] = 1) && (x < -OUTER || y < -OUTER || x > W + OUTER || y > H + OUTER)) { o.m = Mt.VOID; o.t = 0; o.a = 0; }
      else if (next) sample(s + 1, next.relicX + (x - W / 2) / G, next.relicY + (y - H / 2) / G, seed, o);
      else { const n = fbm(x / 260, y / 160, 1); o.m = Mt.WOOD; o.t = n > 0.6 ? 4 : 3; o.a = 0; }
      mat[k] = o.m; tone[k] = o.t; aux[k] = o.a;
    }
    if (j % 60 === 59) yield;
  }
  // 2. соседские правки: тень под кромкой травы на тропе, тень берега в воде, блик у кромки
  for (let j = 3; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, m = mat[k];
    if (m === Mt.DIRT || m === Mt.TILE) {
      if (mat[k - w] === Mt.GRASS || mat[k - 2 * w] === Mt.GRASS) tone[k] = Math.max(0, tone[k] - 1);
    } else if (m === Mt.WATER) {
      if (mat[k - w] === Mt.RIM || mat[k - 2 * w] === Mt.RIM || mat[k - 3 * w] === Mt.RIM) tone[k] = 1;
    } else if (m === Mt.GRASS) {
      if (mat[k + w] === Mt.DIRT && j + 1 < h) tone[k] = Math.min(6, tone[k] + 1);
    }
  }
  yield;
  // 3. штампы
  const put = (i: number, j: number, d: number, only: number) => {
    if (i < 0 || j < 0 || i >= w || j >= h) return;
    const k = j * w + i;
    if (mat[k] !== only) return;
    const r = RAMPS[only];
    tone[k] = Math.max(0, Math.min(r.length - 1, tone[k] + d));
  };
  const paint = (i: number, j: number, c: number, only?: number) => {
    if (i < 0 || j < 0 || i >= w || j >= h) return;
    const k = j * w + i;
    if (only !== undefined && mat[k] !== only) return;
    ov[k] = c;
  };
  for (let j = 2; j < h - 2; j++) {
    for (let i = 2; i < w - 2; i++) {
      const k = j * w + i, m = mat[k], r = hash(i, j, 77 + s);
      if (m === Mt.GRASS) {
        if (r < 0.045) for (const [dx, dy, d] of TUFTS[Math.floor(hash(i, j, 5) * 4)]) put(i + dx, j + dy, d, Mt.GRASS);
        else if (r < 0.0475) { const c = FLOWERS[Math.floor(hash(i, j, 6) * 5)]; paint(i, j, c, Mt.GRASS); if (hash(i, j, 8) < 0.5) paint(i + 1, j, c, Mt.GRASS); put(i, j + 1, -2, Mt.GRASS); }
      } else if (m === Mt.DIRT) {
        if (r < 0.012) { paint(i, j, STONE[4], Mt.DIRT); paint(i + 1, j, STONE[3], Mt.DIRT); put(i, j + 1, -1, Mt.DIRT); put(i + 1, j + 1, -1, Mt.DIRT); }
        else if (r < 0.04) { put(i, j, -1, Mt.DIRT); put(i + 1, j, -1, Mt.DIRT); }
        else if (r < 0.055) put(i, j, 1, Mt.DIRT);
      } else if (m === Mt.WATER) {
        if (tone[k] >= 2 && r < 0.008) { const L = 2 + Math.floor(hash(i, j, 3) * 4); for (let q = 0; q < L; q++) put(i + q, j, q === 0 || q === L - 1 ? 1 : 2, Mt.WATER); }
        else if (r < 0.0105) paint(i, j, WATER[6], Mt.WATER);
        else if (tone[k] <= 3 && r < 0.0111) {
          // кувшинка
          for (let dy = -2; dy <= 2; dy++) for (let dx = -4; dx <= 4; dx++) {
            if ((dx / 4.6) ** 2 + (dy / 2.2) ** 2 > 1 || (dy < 0 && dx >= 1 && dx <= 3 && dy >= -2 + (dx - 1) * 0)) continue;
            paint(i + dx, j + dy, dy >= 1 ? GRASS[2] : dx < 0 && dy < 0 ? GRASS[5] : GRASS[4], Mt.WATER);
          }
          if (hash(i, j, 11) < 0.3) paint(i - 1, j - 1, FLOWERS[3], Mt.WATER);
        }
      } else if (m === Mt.RIM) {
        if (r < 0.16) {
          // булыжник: светлый верх, тёмный низ
          for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
            if ((dx / 2.6) ** 2 + (dy / 1.6) ** 2 > 1) continue;
            put(i + dx, j + dy, dy < 0 ? 3 : dy === 0 ? 2 : 1, Mt.RIM);
          }
        }
      } else if (m === Mt.TILE) {
        if (r < 0.0015) { put(i, j, -2, Mt.TILE); put(i + 1, j + 1, -2, Mt.TILE); put(i + 2, j + 1, -2, Mt.TILE); }
      } else if (m === Mt.WOOD) {
        if (r < 0.002) put(i, j, -2, Mt.WOOD);
      }
    }
    if (j % 120 === 119) yield;
  }
  // 4. боковые грани приподнятых областей (арена над миром следующей ступени, реликвия над полом) и их тени
  const relic = relicRect(s);
  const raised: { r: Rect; side: number; top: number[]; edge: number[] }[] = [
    { r: { x0: 0, y0: 0, x1: W, y1: H }, side: 7, top: [GRASS[4], GRASS[2]], edge: [DIRT[3], DIRT[3], DIRT[2], DIRT[2], DIRT[1]] },
  ];
  if (relic) raised.push({ r: relic, side: 3, top: [GRASS[5]], edge: [GRASS[2], GRASS[1]] });
  for (const R of raised) {
    const near = 2 + (R.side + 6) * KV;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const au = (u0 + i + 0.5) * KU, bv = (v0 + j + 0.5) * KV;
      const x = au + bv, y = bv - au;
      // только у нижних кромок (x1 или y1) снаружи
      if (x < R.r.x0 - 1 || y < R.r.y0 - 1 || x > R.r.x1 + near || y > R.r.y1 + near) continue;
      if (inRect(R.r, x, y)) continue;
      const k = j * w + i;
      for (let q = 1; q <= R.side + 5; q++) {
        const xa = x - q * KV, ya = y - q * KV;
        if (!inRect(R.r, xa, ya)) continue;
        if (q <= R.side) {
          const right = R.r.x1 - xa < R.r.y1 - ya;               // правая грань — в тени
          const layers = [...R.top, ...R.edge];
          let c = layers[Math.min(layers.length - 1, q - 1 < R.top.length ? q - 1 : R.top.length + Math.floor((q - 1 - R.top.length) * R.edge.length / Math.max(1, R.side - R.top.length)))];
          if (right) c = darken(c);
          ov[k] = c; mat[k] = 255;
        } else shade[k] = Math.max(shade[k], 6 - (q - R.side));
        break;
      }
    }
    yield;
  }
  // 5. цвет
  const img = new ImageData(w, h), d32 = new Uint32Array(img.data.buffer);
  for (let k = 0; k < N; k++) {
    let c: number;
    if (mat[k] === Mt.VOID) { d32[k] = 0; continue; }
    if (ov[k]) c = ov[k];
    else {
      const m = mat[k];
      if (m === Mt.CARPET) { const r = CARPET[aux[k]]; let t = tone[k]; if (((k % w) + 2 * Math.floor(k / w)) % 4 === 0) t = Math.max(0, t - 1); c = r[Math.max(0, Math.min(2, t))]; }
      else if (m === Mt.GENERIC) c = genRamps[aux[k]][Math.max(0, Math.min(4, tone[k]))];
      else { const r = RAMPS[m] ?? GRASS; c = r[Math.max(0, Math.min(r.length - 1, tone[k]))]; }
    }
    if (shade[k]) c = mixc(c, SHADOW, Math.min(0.45, shade[k] * 0.09));
    d32[k] = outer[k] ? (c & 0x00ffffff) | 0x80000000 : c;
  }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d')!.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return { tex, u0, v0, w, h, stage: s };
}

function darken(c: number): number { return mixc(c, SHADOW, 0.3); }
function mixc(a: number, b: number, t: number): number {
  const r = (a & 255) + ((b & 255) - (a & 255)) * t, g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t, bl = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  return (0xff000000 | (Math.round(bl) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
}

/** Нарисовать сразу (без пауз). */
export function paintNow(s: number, seed: number): PaintResult {
  const g = paintStage(s, seed);
  for (;;) { const r = g.next(); if (r.done) return r.value; }
}

/** Пиксели рисунка для точки мира (на земле). */
export function artUV(x: number, y: number): [number, number] {
  return [(x - y) * ISO_X * ART_Z, (x + y) * ISO_Y * ART_Z];
}

export type { StageDef };
