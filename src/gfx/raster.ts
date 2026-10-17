// Процедурный пиксельный растеризатор.
//
// Спрайт описывается слоями простых форм в «модельных» единицах (ось +X —
// вперёд, +Y — вниз, центр — 0,0). Для каждого нужного размера и угла
// поворота спрайт растеризуется попиксельно БЕЗ сглаживания: для центра
// каждого пикселя ищется верхний слой, содержащий точку. Свет (фаска, тени
// от верхних слоёв) считается в экранных координатах — свет всегда сверху-
// слева, как у нарисованного вручную пиксель-арта, при любом повороте.
// Потом добавляется контур. Модуль чистый (без DOM) — работает и в Node.

import { rasterizeExt, extSize, type ExtSpec } from './ext';
import { RAMPS, type RampId, rampRgba, hexToRgb, packRgba } from './palette';

export type Shape =
  | { k: 'rect'; x: number; y: number; w: number; h: number; r?: number; rot?: number }
  | { k: 'circle'; x: number; y: number; r: number }
  | { k: 'ellipse'; x: number; y: number; rx: number; ry: number; rot?: number }
  | { k: 'poly'; pts: number[] }
  | { k: 'capsule'; x1: number; y1: number; x2: number; y2: number; r: number }
  | { k: 'ring'; x: number; y: number; r1: number; r2: number };

export type TexFn = (x: number, y: number, frame: number) => number;

export interface Layer {
  s: Shape;
  /** Рампа цвета. */
  c: RampId;
  /** Базовый тон 0..5. */
  t: number;
  /** Ширина фаски в экранных пикселях (по умолчанию 1, 0 — плоско). */
  bevel?: number;
  /** Сдвиг тона на освещённой кромке (по умолчанию +1). */
  hi?: number;
  /** Сдвиг тона на теневой кромке (по умолчанию -1). */
  lo?: number;
  /** Процедурная текстура: сдвиг тона в точке модели. */
  tex?: TexFn;
  /** Минимальный масштаб (пикс/ед.), при котором слой виден — LOD. */
  min?: number;
  /** Светящийся слой: без фаски и теней, без контура вокруг. */
  glow?: boolean;
  /** Отбрасывает тень на нижние слои (по умолчанию да). */
  cast?: boolean;
  /** Вырез: делает пиксель прозрачным. */
  hole?: boolean;
  /** Слой виден только в этих кадрах анимации. */
  frames?: number[];
}

export interface SpriteDef {
  id: string;
  layers: Layer[];
  /** Кадров анимации (по умолчанию 1). */
  frames?: number;
  /** Цвет контура; null — без контура; по умолчанию — самый тёмный тон соседнего слоя. */
  outline?: string | null;
  /** Поворачивается ли (32 угла) — по умолчанию да. */
  rotates?: boolean;
  /** Сила теней от верхних слоёв в экранных пикселях (по умолчанию 1.5). */
  castDist?: number;
  /** Внешняя картинка вместо слоёв (см. gfx/ext.ts). */
  ext?: ExtSpec;
}

export type RasterMode = 0 | 1 | 2; // 0 — обычный, 1 — белая вспышка, 2 — силуэт (для теней)

export interface PixelImage {
  w: number;
  h: number;
  data: Uint32Array;
}

// ---------------------------------------------------------------------------
// Компиляция форм в быстрые функции попадания
// ---------------------------------------------------------------------------

interface Compiled {
  x0: number; y0: number; x1: number; y1: number;
  hit: (x: number, y: number) => boolean;
  layer: Layer;
  rgba: Uint32Array;
  minScale: number;
  frames: number[] | null;
  idx: number;
}

function compileShape(s: Shape): { hit: (x: number, y: number) => boolean; bb: [number, number, number, number] } {
  switch (s.k) {
    case 'rect': {
      const hw = s.w / 2, hh = s.h / 2, r = Math.min(s.r ?? 0, hw, hh);
      const rot = s.rot ?? 0;
      const cx = s.x, cy = s.y;
      if (!rot) {
        const ix = hw - r, iy = hh - r, rr = r * r;
        const hit = r > 0
          ? (x: number, y: number) => {
            const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
            if (dx > hw || dy > hh) return false;
            if (dx <= ix || dy <= iy) return true;
            const ex = dx - ix, ey = dy - iy;
            return ex * ex + ey * ey <= rr;
          }
          : (x: number, y: number) => Math.abs(x - cx) <= hw && Math.abs(y - cy) <= hh;
        return { hit, bb: [cx - hw, cy - hh, cx + hw, cy + hh] };
      }
      const c = Math.cos(-rot), sn = Math.sin(-rot);
      const ix = hw - r, iy = hh - r, rr = r * r;
      const hit = (x: number, y: number) => {
        const px = x - cx, py = y - cy;
        const dx = Math.abs(px * c - py * sn), dy = Math.abs(px * sn + py * c);
        if (dx > hw || dy > hh) return false;
        if (r <= 0 || dx <= ix || dy <= iy) return true;
        const ex = dx - ix, ey = dy - iy;
        return ex * ex + ey * ey <= rr;
      };
      const ext = Math.hypot(hw, hh);
      return { hit, bb: [cx - ext, cy - ext, cx + ext, cy + ext] };
    }
    case 'circle': {
      const { x: cx, y: cy, r } = s, rr = r * r;
      return { hit: (x, y) => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rr, bb: [cx - r, cy - r, cx + r, cy + r] };
    }
    case 'ellipse': {
      const { x: cx, y: cy, rx, ry } = s, rot = s.rot ?? 0;
      const c = Math.cos(-rot), sn = Math.sin(-rot);
      const irx = 1 / (rx * rx), iry = 1 / (ry * ry);
      const hit = (x: number, y: number) => {
        const px = x - cx, py = y - cy;
        const lx = px * c - py * sn, ly = px * sn + py * c;
        return lx * lx * irx + ly * ly * iry <= 1;
      };
      const e = Math.max(rx, ry);
      return { hit, bb: [cx - e, cy - e, cx + e, cy + e] };
    }
    case 'poly': {
      const p = s.pts, n = p.length >> 1;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < n; i++) {
        x0 = Math.min(x0, p[i * 2]); x1 = Math.max(x1, p[i * 2]);
        y0 = Math.min(y0, p[i * 2 + 1]); y1 = Math.max(y1, p[i * 2 + 1]);
      }
      const hit = (x: number, y: number) => {
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const xi = p[i * 2], yi = p[i * 2 + 1], xj = p[j * 2], yj = p[j * 2 + 1];
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      };
      return { hit, bb: [x0, y0, x1, y1] };
    }
    case 'capsule': {
      const { x1, y1, x2, y2, r } = s;
      const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1e-9, rr = r * r;
      const hit = (x: number, y: number) => {
        let t = ((x - x1) * dx + (y - y1) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = x1 + dx * t - x, qy = y1 + dy * t - y;
        return qx * qx + qy * qy <= rr;
      };
      return { hit, bb: [Math.min(x1, x2) - r, Math.min(y1, y2) - r, Math.max(x1, x2) + r, Math.max(y1, y2) + r] };
    }
    case 'ring': {
      const { x: cx, y: cy, r1, r2 } = s, a = r1 * r1, b = r2 * r2;
      const hit = (x: number, y: number) => {
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        return d >= a && d <= b;
      };
      return { hit, bb: [cx - r2, cy - r2, cx + r2, cy + r2] };
    }
  }
}

interface CompiledDef {
  layers: Compiled[];
  radius: number;
}

const compiledCache = new WeakMap<SpriteDef, CompiledDef>();

export function compileDef(def: SpriteDef): CompiledDef {
  let c = compiledCache.get(def);
  if (c) return c;
  let radius = 0;
  const layers: Compiled[] = def.layers.map((layer, idx) => {
    const { hit, bb } = compileShape(layer.s);
    for (const [x, y] of [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]]) {
      if (!layer.hole) radius = Math.max(radius, Math.hypot(x, y));
    }
    return {
      x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3], hit, layer, idx,
      rgba: rampRgba(layer.c),
      minScale: layer.min ?? 0,
      frames: layer.frames ?? null,
    };
  });
  // Радиус по углам ограничивающих рамок завышен для повёрнутых форм — это нормально.
  c = { layers, radius: radius || 1 };
  compiledCache.set(def, c);
  return c;
}

/** Ограничивающий радиус спрайта в модельных единицах. */
export function defRadius(def: SpriteDef): number {
  return compileDef(def).radius;
}

const OUTLINE_CACHE = new Map<string, number>();
function outlineColor(hex: string): number {
  let v = OUTLINE_CACHE.get(hex);
  if (v === undefined) {
    const [r, g, b] = hexToRgb(hex);
    v = packRgba(r, g, b);
    OUTLINE_CACHE.set(hex, v);
  }
  return v;
}

const WHITE = packRgba(255, 255, 255);
const FLASH_EDGE = packRgba(214, 212, 226);
const BLACK = packRgba(0, 0, 0);

/**
 * Растеризация спрайта.
 * @param scale  пикселей на модельную единицу
 * @param angle  угол поворота, рад (0 — вправо)
 * @param frame  кадр анимации
 * @param mode   0 — обычный, 1 — вспышка, 2 — силуэт
 * @param fixedSize  принудительный размер стороны холста (для одинаковых кадров)
 */
export function rasterize(def: SpriteDef, scale: number, angle: number, frame = 0, mode: RasterMode = 0, fixedSize = 0): PixelImage {
  if (def.ext) {
    const ang = def.rotates === false ? 0 : angle;
    const img = rasterizeExt(def.ext, scale, ang, mode, fixedSize || rasterSize(def, scale));
    if (img) {
      // Процедурные детали поверх картинки (модули без своей картинки).
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (const p of def.ext.parts ?? []) {
        if (!p.def) continue;
        const pi = rasterize(p.def, scale * (p.k ?? 1), ang + (p.a ?? 0), 0, mode);
        const cx = img.w / 2 + (p.x * ca - p.y * sa) * scale - pi.w / 2, cy = img.h / 2 + (p.x * sa + p.y * ca) * scale - pi.h / 2;
        const ox = Math.round(cx), oy = Math.round(cy);
        for (let j = 0; j < pi.h; j++) {
          const ty = oy + j;
          if (ty < 0 || ty >= img.h) continue;
          for (let i = 0; i < pi.w; i++) {
            const v = pi.data[j * pi.w + i];
            const tx = ox + i;
            if (v >>> 24 && tx >= 0 && tx < img.w) img.data[ty * img.w + tx] = v;
          }
        }
      }
      return img;
    }
  }
  const cd = compileDef(def);
  const N = fixedSize || Math.max(2, Math.ceil(cd.radius * scale * 2) + 3);
  const data = new Uint32Array(N * N);
  const owner = new Int16Array(N * N).fill(-1);
  const half = N / 2;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const inv = 1 / scale;

  // Отобранные по LOD и кадру слои (сверху вниз).
  const active: Compiled[] = [];
  for (let i = cd.layers.length - 1; i >= 0; i--) {
    const L = cd.layers[i];
    if (scale < L.minScale) continue;
    if (L.frames && !L.frames.includes(frame)) continue;
    active.push(L);
  }
  const nA = active.length;

  // Смещения света в модельных координатах (свет — из левого верхнего угла экрана).
  const toModel = (sx: number, sy: number): [number, number] => [(sx * ca + sy * sa) * inv, (-sx * sa + sy * ca) * inv];
  const castD = def.castDist ?? 1.5;
  const [cdx, cdy] = toModel(-castD * 0.7071, -castD * 0.7071);

  const topAt = (mx: number, my: number, below = nA): number => {
    for (let k = 0; k < below; k++) {
      const L = active[k];
      if (mx < L.x0 || mx > L.x1 || my < L.y0 || my > L.y1) continue;
      if (L.hit(mx, my)) return L.layer.hole ? -2 : k;
    }
    return -1;
  };
  const hitL = (L: Compiled, mx: number, my: number) => mx >= L.x0 && mx <= L.x1 && my >= L.y0 && my <= L.y1 && L.hit(mx, my);

  const bevelCache = new Map<number, [number, number]>();
  const bevelVec = (b: number): [number, number] => {
    let v = bevelCache.get(b);
    if (!v) { v = toModel(-b * 0.7071, -b * 0.7071); bevelCache.set(b, v); }
    return v;
  };

  for (let j = 0; j < N; j++) {
    const sy = j + 0.5 - half;
    for (let i = 0; i < N; i++) {
      const sx = i + 0.5 - half;
      const mx = (sx * ca + sy * sa) * inv;
      const my = (-sx * sa + sy * ca) * inv;
      const k = topAt(mx, my);
      if (k < 0) continue;
      const L = active[k], lay = L.layer;
      const p = j * N + i;
      owner[p] = L.idx;
      if (mode === 2) { data[p] = BLACK; continue; }
      if (mode === 1) { data[p] = WHITE; continue; }
      let tone = lay.t;
      if (lay.tex) tone += lay.tex(mx, my, frame);
      if (!lay.glow) {
        const b = lay.bevel ?? 1;
        if (b > 0) {
          const [bx, by] = bevelVec(b);
          if (!hitL(L, mx + bx, my + by)) tone += lay.hi ?? 1;
          else if (!hitL(L, mx - bx, my - by)) tone += lay.lo ?? -1;
        }
        // Тень от вышележащего слоя, который ближе к свету.
        const kk = topAt(mx + cdx, my + cdy, k);
        if (kk >= 0 && active[kk].layer.cast !== false && !active[kk].layer.glow) tone -= 1;
      }
      tone = tone < 0 ? 0 : tone > 5 ? 5 : Math.round(tone);
      data[p] = L.rgba[tone];
    }
  }

  // Контур: прозрачные пиксели, соседние с непрозрачными.
  if (def.outline !== null && mode !== 2) {
    const fixed = def.outline ? outlineColor(def.outline) : 0;
    const out = new Uint32Array(data);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const p = j * N + i;
        if (data[p] !== 0) continue;
        let o = -1;
        if (i > 0 && data[p - 1] !== 0) o = owner[p - 1];
        else if (i < N - 1 && data[p + 1] !== 0) o = owner[p + 1];
        else if (j > 0 && data[p - N] !== 0) o = owner[p - N];
        else if (j < N - 1 && data[p + N] !== 0) o = owner[p + N];
        if (o < 0) continue;
        const ol = cd.layers[o].layer;
        if (ol.glow) continue;
        out[p] = mode === 1 ? FLASH_EDGE : fixed || rampRgba(ol.c)[0];
      }
    }
    return { w: N, h: N, data: out };
  }
  return { w: N, h: N, data };
}

/** Размер стороны холста для данного масштаба (одинаков для всех углов). */
export function rasterSize(def: SpriteDef, scale: number): number {
  if (def.ext) {
    let n = extSize(def.ext, scale, def.rotates !== false);
    for (const p of def.ext.parts ?? []) if (p.def) n = Math.max(n, Math.ceil((Math.hypot(p.x, p.y) + compileDef(p.def).radius * (p.k ?? 1)) * scale * 2) + 4);
    return n;
  }
  return Math.max(2, Math.ceil(compileDef(def).radius * scale * 2) + 3);
}

// ---------------------------------------------------------------------------
// Удобные конструкторы слоёв для описания спрайтов
// ---------------------------------------------------------------------------

type Opt = Partial<Omit<Layer, 's' | 'c' | 't'>>;

export const rect = (x: number, y: number, w: number, h: number, c: RampId, t: number, o: Opt & { r?: number; rot?: number } = {}): Layer => {
  const { r, rot, ...rest } = o;
  return { s: { k: 'rect', x, y, w, h, r, rot }, c, t, ...rest };
};
export const circ = (x: number, y: number, r: number, c: RampId, t: number, o: Opt = {}): Layer => ({ s: { k: 'circle', x, y, r }, c, t, ...o });
export const ell = (x: number, y: number, rx: number, ry: number, c: RampId, t: number, o: Opt & { rot?: number } = {}): Layer => {
  const { rot, ...rest } = o;
  return { s: { k: 'ellipse', x, y, rx, ry, rot }, c, t, ...rest };
};
export const poly = (pts: number[], c: RampId, t: number, o: Opt = {}): Layer => ({ s: { k: 'poly', pts }, c, t, ...o });
export const cap = (x1: number, y1: number, x2: number, y2: number, r: number, c: RampId, t: number, o: Opt = {}): Layer => ({ s: { k: 'capsule', x1, y1, x2, y2, r }, c, t, ...o });
export const ring = (x: number, y: number, r1: number, r2: number, c: RampId, t: number, o: Opt = {}): Layer => ({ s: { k: 'ring', x, y, r1, r2 }, c, t, ...o });

/** Зеркалит слой по оси X модели (y → -y) — для симметричных танков. */
export function mirrorY(l: Layer): Layer {
  const s = l.s;
  let ns: Shape;
  switch (s.k) {
    case 'rect': ns = { ...s, y: -s.y, rot: s.rot ? -s.rot : s.rot }; break;
    case 'circle': ns = { ...s, y: -s.y }; break;
    case 'ellipse': ns = { ...s, y: -s.y, rot: s.rot ? -s.rot : s.rot }; break;
    case 'poly': ns = { k: 'poly', pts: s.pts.map((v, i) => (i & 1 ? -v : v)) }; break;
    case 'capsule': ns = { ...s, y1: -s.y1, y2: -s.y2 }; break;
    case 'ring': ns = { ...s, y: -s.y }; break;
  }
  const tex = l.tex;
  return { ...l, s: ns, tex: tex ? (x, y, f) => tex(x, -y, f) : undefined };
}

/** Пара симметричных слоёв. */
export const sym = (l: Layer): Layer[] => [l, mirrorY(l)];

/** Сдвиг и масштаб набора слоёв (для сборки составных спрайтов). */
export function transformLayers(layers: Layer[], dx: number, dy: number, k = 1, rotate = 0): Layer[] {
  const c = Math.cos(rotate), s = Math.sin(rotate);
  const tp = (x: number, y: number): [number, number] => [(x * c - y * s) * k + dx, (x * s + y * c) * k + dy];
  return layers.map(l => {
    const sh = l.s;
    let ns: Shape;
    switch (sh.k) {
      case 'rect': { const [x, y] = tp(sh.x, sh.y); ns = { ...sh, x, y, w: sh.w * k, h: sh.h * k, r: sh.r ? sh.r * k : sh.r, rot: (sh.rot ?? 0) + rotate }; break; }
      case 'circle': { const [x, y] = tp(sh.x, sh.y); ns = { ...sh, x, y, r: sh.r * k }; break; }
      case 'ellipse': { const [x, y] = tp(sh.x, sh.y); ns = { ...sh, x, y, rx: sh.rx * k, ry: sh.ry * k, rot: (sh.rot ?? 0) + rotate }; break; }
      case 'poly': {
        const pts: number[] = [];
        for (let i = 0; i < sh.pts.length; i += 2) { const [x, y] = tp(sh.pts[i], sh.pts[i + 1]); pts.push(x, y); }
        ns = { k: 'poly', pts }; break;
      }
      case 'capsule': { const [x1, y1] = tp(sh.x1, sh.y1); const [x2, y2] = tp(sh.x2, sh.y2); ns = { ...sh, x1, y1, x2, y2, r: sh.r * k }; break; }
      case 'ring': { const [x, y] = tp(sh.x, sh.y); ns = { ...sh, x, y, r1: sh.r1 * k, r2: sh.r2 * k }; break; }
    }
    const tex = l.tex;
    return {
      ...l, s: ns,
      tex: tex ? (x: number, y: number, f: number) => {
        // обратное преобразование точки в исходные координаты
        const px = (x - dx) / k, py = (y - dy) / k;
        return tex(px * c + py * s, -px * s + py * c, f);
      } : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Стандартные текстуры
// ---------------------------------------------------------------------------

/** Траки гусениц: полосы поперёк, бегущие при смене кадра. */
export const texTreads = (period = 3, frames = 4): TexFn => (x, _y, f) => {
  const v = Math.floor((x + (f / frames) * period * (period > 0 ? 1 : -1)) / (period / 2));
  return (v & 1) ? -1 : 0;
};

/** Крапинки (детерминированный шум в модельных координатах). */
export const texSpeckle = (density = 0.12, delta = -1, cell = 1, seed = 7): TexFn => (x, y) => {
  const xi = Math.floor(x / cell), yi = Math.floor(y / cell);
  let h = (Math.imul(xi, 374761393) + Math.imul(yi, 668265263) + seed * 97) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h >>> 0) / 4294967296) < density ? delta : 0;
};

/** Камуфляжные пятна. */
export const texCamo = (scale = 5, seed = 3): TexFn => (x, y) => {
  const v = Math.sin(x / scale + seed) * Math.cos(y / (scale * 0.8) - seed * 0.7) + Math.sin((x + y) / (scale * 1.7) + seed * 2);
  return v > 0.7 ? -1 : v < -0.9 ? 1 : 0;
};

/** Полосы по Y (для заклёпок, рёбер). */
export const texStripesY = (period: number, delta = -1): TexFn => (_x, y) => (Math.floor(y / (period / 2)) & 1 ? delta : 0);
export const texStripesX = (period: number, delta = -1): TexFn => x => (Math.floor(x / (period / 2)) & 1 ? delta : 0);

export const sumTex = (...fs: TexFn[]): TexFn => (x, y, f) => {
  let s = 0;
  for (const fn of fs) s += fn(x, y, f);
  return s;
};

export { RAMPS };
