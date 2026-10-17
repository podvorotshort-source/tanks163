// Внешняя графика: PNG/WebP из assets/sprites (нарезанные листы, см. tools/slice.ts).
// Имя файла = ключ (hull_assault_3.png → 'hull_assault_3'). Если картинки нет,
// игра рисует процедурный спрайт — подмена прозрачная, по одной картинке.
//
// Картинка поворачивается и уменьшается со сглаживанием до нужного размера,
// затем альфа «защёлкивается» (чёткий силуэт) и добавляется тёмный контур в 1 px —
// получается пиксельный спрайт той же детальности, что и экран мира.

import type { PixelImage, RasterMode, SpriteDef } from './raster';

/** Деталь составного спрайта: картинка (key) или процедурный спрайт (def), в модельных единицах. */
export interface ExtPart {
  key?: string;
  def?: SpriteDef;
  x: number;
  y: number;
  /** Ширина картинки (для key). */
  w?: number;
  /** Масштаб процедурного спрайта (для def). */
  k?: number;
  a?: number;
}

export interface ExtSpec {
  key: string;
  /** Ширина картинки (по оси «нос вправо») в модельных единицах. */
  w: number;
  /** Точка картинки (в долях 0..1), которая встаёт в центр спрайта. По умолчанию — из манифеста или центр. */
  ax?: number;
  ay?: number;
  /** Перекраска цвета игрока (золото → зелень для 2P). */
  recolor?: 'p2' | null;
  /** Для препятствий: размер области (модельные единицы) — картинка встаёт низом на её нижний край. */
  foot?: [number, number];
  /** Для полос стен: замостить область плитками этого размера. */
  tile?: number;
  /** Без контура. */
  noOutline?: boolean;
  /** Затемнение (повреждённое препятствие). */
  dim?: number;
  /** Обесцветить (обломки). */
  gray?: boolean;
  /** Подкрасить (элитные/бонусные враги): цвет и сила 0..1. */
  tint?: [string, number];
  /** Повернуть оттенок цветных пикселей, градусы (варианты игрушек). */
  hue?: number;
  /** Растянуть ровно на область foot (вода, плоские пятна). */
  fill?: boolean;
  /** Детали поверх (модули на корпусе). */
  parts?: ExtPart[];
}

interface ExtImage {
  key: string;
  img: CanvasImageSource;
  w: number;
  h: number;
  /** Опорная точка по умолчанию (доли). */
  ax: number;
  ay: number;
  /** Толщина «массивной» части (башни: диаметр основания), px. */
  body: number;
  mips: HTMLCanvasElement[];
}

type Manifest = Record<string, { ax?: number; ay?: number }>;

// Список файлов собирается сборщиком (в singlefile-сборке картинки встраиваются в HTML).
const URLS: Record<string, string> = (() => {
  try {
    return import.meta.glob('../../assets/sprites/*.{png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
  } catch {
    return {};
  }
})();
const MANIFEST: Manifest = (() => {
  try {
    const m = import.meta.glob('../../assets/sprites/manifest.json', { eager: true, import: 'default' }) as Record<string, Manifest>;
    return Object.values(m)[0] ?? {};
  } catch {
    return {};
  }
})();

const images = new Map<string, ExtImage>();
let ready = false;

/** Загрузка завершена (до этого результаты поиска картинок не кешируются). */
export function extReady(): boolean {
  return ready;
}
const recolored = new Map<string, ExtImage>();

export function extKeys(): string[] {
  return [...images.keys()];
}

export function hasExt(key: string): boolean {
  return images.has(key.toLowerCase());
}

/** Первый существующий ключ из списка (например, точное поколение, затем ближайшее). */
export function pickExt(...keys: string[]): string | null {
  for (const k of keys) if (images.has(k.toLowerCase())) return k.toLowerCase();
  return null;
}

function baseName(path: string): string {
  const f = path.split('/').pop()!;
  return f.replace(/\.(png|webp)$/i, '').toLowerCase();
}

/** Загрузить всю внешнюю графику (до старта игры). */
export async function loadExt(onProgress?: (done: number, total: number) => void): Promise<void> {
  const entries = Object.entries(URLS);
  let done = 0;
  await Promise.all(entries.map(async ([path, url]) => {
    const key = baseName(path);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const m = MANIFEST[key] ?? {};
      const ext: ExtImage = { key, img, w: img.naturalWidth, h: img.naturalHeight, ax: m.ax ?? 0.5, ay: m.ay ?? 0.5, body: img.naturalHeight, mips: [] };
      if (key.startsWith('turret_')) {
        const [ax, body] = turretPivot(img);
        if (m.ax === undefined) ext.ax = ax;
        ext.body = body;
      }
      images.set(key, ext);
    } catch (e) {
      console.warn('Не удалось загрузить картинку', key, e);
    }
    onProgress?.(++done, entries.length);
  }));
  ready = true;
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function pixels(src: CanvasImageSource, w: number, h: number): { c: HTMLCanvasElement; d: Uint32Array; id: ImageData } {
  const c = canvas(w, h);
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(src, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height);
  return { c, d: new Uint32Array(id.data.buffer), id };
}

/**
 * Ось вращения башни (ствол вправо): центр «массивной» части — столбцов,
 * высота которых больше половины максимальной (тонкий ствол не учитывается).
 */
function turretPivot(img: HTMLImageElement): [number, number] {
  const w = img.naturalWidth, h = img.naturalHeight;
  const { d } = pixels(img, w, h);
  const col = new Array<number>(w).fill(0);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (d[y * w + x] >>> 24 > 100) col[x]++;
  const max = Math.max(...col);
  let s = 0, n = 0;
  for (let x = 0; x < w; x++) if (col[x] > max * 0.6) { s += x; n++; }
  return [n ? (s / n + 0.5) / w : 0.5, max || h];
}

/** Цепочка уменьшенных вдвое копий — для качественного уменьшения. */
function mip(e: ExtImage, level: number): CanvasImageSource {
  if (level <= 0) return e.img;
  while (e.mips.length < level) {
    const prev = e.mips.length ? e.mips[e.mips.length - 1] : e.img;
    const pw = e.mips.length ? e.mips[e.mips.length - 1].width : e.w, ph = e.mips.length ? e.mips[e.mips.length - 1].height : e.h;
    const c = canvas(Math.max(1, Math.round(pw / 2)), Math.max(1, Math.round(ph / 2)));
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(prev, 0, 0, c.width, c.height);
    e.mips.push(c);
  }
  return e.mips[level - 1];
}

// --- Перекраска 2P: тёплые жёлто-оранжевые тона → зелёные -------------------

function recolorP2(e: ExtImage): ExtImage {
  let r = recolored.get(e.key);
  if (r) return r;
  const { c, d, id } = pixels(e.img, e.w, e.h);
  for (let i = 0; i < d.length; i++) {
    const v = d[i];
    if (v >>> 24 === 0) continue;
    const R = v & 255, G = (v >>> 8) & 255, B = (v >>> 16) & 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    const s = mx ? (mx - mn) / mx : 0;
    if (s < 0.3 || mx < 50) continue;
    let hue = 0;
    const dd = mx - mn;
    if (mx === R) hue = ((G - B) / dd) % 6;
    else if (mx === G) hue = (B - R) / dd + 2;
    else hue = (R - G) / dd + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
    if (hue < 22 || hue > 68) continue;
    // Сдвигаем к зелёному (~105°), сохраняя яркость и насыщенность.
    const nh = hue + 62;
    const [nr, ng, nb] = hsv(nh, s * 0.92, mx / 255);
    d[i] = (v & 0xff000000) | (nb << 16) | (ng << 8) | nr;
  }
  c.getContext('2d')!.putImageData(id, 0, 0);
  r = { ...e, key: e.key + '#p2', img: c, mips: [] };
  recolored.set(e.key, r);
  return r;
}

/** Тон (градусы), насыщенность и яркость (0..1) пикселя. */
function toHsv(R: number, G: number, B: number): [number, number, number] {
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), dd = mx - mn;
  let h = 0;
  if (dd) {
    if (mx === R) h = ((G - B) / dd) % 6;
    else if (mx === G) h = (B - R) / dd + 2;
    else h = (R - G) / dd + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? dd / mx : 0, mx / 255];
}

function hsv(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

// --- Растеризация --------------------------------------------------------------

function source(spec: ExtSpec): ExtImage | null {
  const e = images.get(spec.key);
  if (!e) return null;
  return spec.recolor === 'p2' ? recolorP2(e) : e;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Масштаб картинки: пикселей экрана на пиксель картинки. */
function imgScale(spec: ExtSpec, e: ExtImage, scale: number): number {
  return (spec.w * scale) / e.w;
}

/** Опорная точка в пикселях картинки. */
function anchor(spec: ExtSpec, e: ExtImage): [number, number] {
  if (spec.foot) {
    // Препятствие: низ картинки — на нижний край области, центр по ширине.
    const k = e.w / spec.w; // пикселей картинки на единицу
    return [e.w / 2, e.h - (spec.foot[1] / 2) * k];
  }
  return [(spec.ax ?? e.ax) * e.w, (spec.ay ?? e.ay) * e.h];
}

/** Размер квадратного холста спрайта (пиксели). */
export function extSize(spec: ExtSpec, scale: number, rotates: boolean): number {
  const e = source(spec);
  if (!e) return 1;
  const k = imgScale(spec, e, scale);
  if (spec.tile && spec.foot) {
    const [fw, fh] = spec.foot;
    const over = (spec.tile * e.h) / e.w - spec.tile; // выступ плитки над областью
    return Math.ceil(Math.max(fw, fh + over * 2) * scale) + 4;
  }
  if (spec.fill && spec.foot) return Math.ceil(Math.max(spec.foot[0], spec.foot[1]) * scale) + 4;
  const [ax, ay] = anchor(spec, e);
  const dx = Math.max(ax, e.w - ax), dy = Math.max(ay, e.h - ay);
  let r = (rotates ? Math.hypot(dx, dy) : Math.max(dx, dy)) * k;
  for (const p of spec.parts ?? []) if (p.key && p.w) r = Math.max(r, (Math.hypot(p.x, p.y) + p.w * 0.75) * scale);
  return Math.ceil(r * 2) + 4;
}

let scratch: HTMLCanvasElement | null = null;

const OUTLINE = 0xff160e12; // ABGR: #120e16

export function rasterizeExt(spec: ExtSpec, scale: number, angle: number, mode: RasterMode, size: number): PixelImage | null {
  const e = source(spec);
  if (!e) return null;
  const S = size;
  if (!scratch) scratch = canvas(S, S);
  if (scratch.width < S || scratch.height < S) { scratch.width = Math.max(scratch.width, S); scratch.height = Math.max(scratch.height, S); }
  const x = scratch.getContext('2d', { willReadFrequently: true })!;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, S, S);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  const k = imgScale(spec, e, scale);
  // Уменьшение больше чем вдвое — через уменьшенную копию.
  let level = 0;
  while (k * Math.pow(2, level + 1) <= 1 && level < 6) level++;
  const src = mip(e, level), sk = k * Math.pow(2, level);
  if (spec.tile && spec.foot) {
    // Полоса стены: плитки рядами сверху вниз (нижние перекрывают верхние).
    const [fw, fh] = spec.foot;
    const cell = spec.tile;
    const nx = Math.max(1, Math.round(fw / cell)), ny = Math.max(1, Math.round(fh / cell));
    const cw = fw / nx, chh = fh / ny;
    const pw = cw * scale, ph = (cw * scale * e.h) / e.w;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = S / 2 + (-fw / 2 + (i + 0.5) * cw) * scale;
      const by = S / 2 + (-fh / 2 + (j + 1) * chh) * scale; // низ клетки
      x.drawImage(src, Math.round(cx - pw / 2), Math.round(by - ph), Math.round(pw), Math.round(ph));
    }
  } else if (spec.fill && spec.foot) {
    const [fw, fh] = spec.foot;
    x.drawImage(src, Math.round(S / 2 - (fw * scale) / 2), Math.round(S / 2 - (fh * scale) / 2), Math.round(fw * scale), Math.round(fh * scale));
  } else {
    const [ax, ay] = anchor(spec, e);
    x.translate(S / 2, S / 2);
    if (angle) x.rotate(angle);
    x.scale(sk, sk);
    const lk = Math.pow(2, level);
    x.drawImage(src, -ax / lk, -ay / lk);
    x.setTransform(1, 0, 0, 1, 0, 0);
  }
  // Детали-картинки (модули): в системе координат спрайта.
  for (const p of spec.parts ?? []) {
    if (!p.key || !p.w) continue;
    const pe = source({ key: p.key, w: p.w, recolor: spec.recolor });
    if (!pe) continue;
    const pk = (p.w * scale) / pe.w;
    let pl = 0;
    while (pk * Math.pow(2, pl + 1) <= 1 && pl < 6) pl++;
    x.translate(S / 2, S / 2);
    if (angle) x.rotate(angle);
    x.scale(scale, scale);
    x.translate(p.x, p.y);
    if (p.a) x.rotate(p.a);
    const ph = (p.w * pe.h) / pe.w;
    x.drawImage(mip(pe, pl), -p.w / 2, -ph / 2, p.w, ph);
    x.setTransform(1, 0, 0, 1, 0, 0);
  }
  const id = x.getImageData(0, 0, S, S);
  const d = new Uint32Array(id.data.buffer.slice(0));
  // Чёткий силуэт.
  for (let i = 0; i < d.length; i++) {
    const a = d[i] >>> 24;
    if (a < 110) d[i] = 0;
    else d[i] = (d[i] | 0xff000000) >>> 0;
  }
  if (spec.gray || spec.tint || spec.hue) {
    const tc = spec.tint ? hexRgb(spec.tint[0]) : null, ta = spec.tint ? spec.tint[1] : 0;
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      if (!v) continue;
      let r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
      if (spec.hue) {
        const [h, s2, vv] = toHsv(r, g, b);
        if (s2 > 0.25) [r, g, b] = hsv((h + spec.hue) % 360, s2, vv);
      }
      if (spec.gray) { const l = r * 0.3 + g * 0.59 + b * 0.11; r = g = b = Math.round(l * 0.85); }
      if (tc) {
        const l = (r * 0.3 + g * 0.59 + b * 0.11) / 160;
        r = Math.round(r + (tc[0] * l - r) * ta); g = Math.round(g + (tc[1] * l - g) * ta); b = Math.round(b + (tc[2] * l - b) * ta);
      }
      d[i] = (0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0;
    }
  }
  if (spec.dim) {
    const m = 1 - spec.dim;
    for (let i = 0; i < d.length; i++) if (d[i]) {
      const v = d[i];
      d[i] = 0xff000000 | (Math.round(((v >>> 16) & 255) * m) << 16) | (Math.round(((v >>> 8) & 255) * m) << 8) | Math.round((v & 255) * m);
    }
  }
  if (!spec.noOutline) {
    const o = new Uint32Array(d);
    for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
      const i = yy * S + xx;
      if (o[i]) continue;
      if ((xx > 0 && o[i - 1]) || (xx < S - 1 && o[i + 1]) || (yy > 0 && o[i - S]) || (yy < S - 1 && o[i + S])) d[i] = OUTLINE;
    }
  }
  if (mode === 1) for (let i = 0; i < d.length; i++) { if (d[i]) d[i] = 0xffffffff; }
  else if (mode === 2) for (let i = 0; i < d.length; i++) { if (d[i]) d[i] = 0xff000000; }
  return { w: S, h: S, data: d };
}

/** Картинка как есть, вписанная в квадрат size×size (иконки), с чётким силуэтом. */
export function extIcon(key: string, size: number): HTMLCanvasElement | null {
  const e = images.get(key);
  if (!e) return null;
  const k = Math.min(size / e.w, size / e.h);
  const spec: ExtSpec = { key, w: e.w * k, noOutline: true };
  const img = rasterizeExt(spec, 1, 0, 0, size);
  if (!img) return null;
  const c = canvas(size, size);
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data.buffer as ArrayBuffer), size, size), 0, 0);
  return c;
}

/** Размер картинки, px. */
export function extSizePx(key: string): [number, number, number] | null {
  const e = images.get(key.toLowerCase());
  return e ? [e.w, e.h, e.body] : null;
}

/** Пиксели картинки (для текстур поверхности). */
export function extPixels(key: string, maxSide = 512): { w: number; h: number; d: Uint32Array } | null {
  const e = images.get(key);
  if (!e) return null;
  const k = Math.min(1, maxSide / Math.max(e.w, e.h));
  const w = Math.max(1, Math.round(e.w * k)), h = Math.max(1, Math.round(e.h * k));
  const c = canvas(w, h);
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.drawImage(e.img, 0, 0, w, h);
  return { w, h, d: new Uint32Array(x.getImageData(0, 0, w, h).data.buffer) };
}

/** Сколько кадров раскадровки prefix_1, prefix_2, … есть. */
export function extFrames(prefix: string): number {
  let n = 0;
  while (images.has(`${prefix}_${n + 1}`)) n++;
  return n;
}

const frameCache = new Map<string, HTMLCanvasElement | null>();
/** Кадр/картинка, уменьшенная до ширины px (квантуется), с чётким силуэтом, без контура. */
export function extFrame(key: string, px: number): HTMLCanvasElement | null {
  const q = Math.max(2, Math.round(Math.exp(Math.round(Math.log(Math.max(2, px)) / 0.1) * 0.1)));
  const ck = key + '@' + q;
  let c = frameCache.get(ck);
  if (c !== undefined) return c;
  const spec: ExtSpec = { key, w: q, noOutline: true };
  const S = extSize(spec, 1, false);
  const img = rasterizeExt(spec, 1, 0, 0, S);
  c = null;
  if (img) {
    c = canvas(S, S);
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data.buffer as ArrayBuffer), S, S), 0, 0);
  }
  if (frameCache.size > 600) frameCache.clear();
  frameCache.set(ck, c);
  return c;
}

/** Исходная картинка (для эффектов-раскадровок). */
export function extImage(key: string): CanvasImageSource | null {
  return images.get(key)?.img ?? null;
}

export function extDims(key: string): [number, number] | null {
  const e = images.get(key);
  return e ? [e.w, e.h] : null;
}
