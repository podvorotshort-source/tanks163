// Процедурная поверхность миров: цвет пикселя по мировой точке.
// ppu — пикселей на единицу (для уровня детализации).

import { pickExt, extPixels, extReady } from '../ext';
import { rampRgba, type RampId, packRgba } from '../palette';
import { vnoise, hash2 } from '../../core/math';
import { STAGE_DEFS } from '../../sim/content/stages';
import { STAGE_GROWTH } from '../../sim/types';

const R = (id: RampId) => rampRgba(id);
const OLIVE = R('olive'), GRASS = R('grass'), CARPET = R('carpet'), WOOD = R('wood'), SAND = R('sand');
const CONC = R('concrete'), ASPH = R('asphalt'), OCEAN = R('ocean'), KHAKI = R('khaki'), INK = R('ink');
const CREAM = R('cream'), RUST = R('rust'), TEAL = R('teal'), STEEL = R('steel'), PURPLE = R('purple');
const SPACE = packRgba(6, 5, 12);
const STAR = packRgba(220, 220, 255);

export type GroundFn = (x: number, y: number, ppu: number) => number;

function speck(x: number, y: number, s: number, seed: number): number {
  return hash2(Math.floor(x / s), Math.floor(y / s), seed);
}

// 0. Игрушечный полигон — печатный коврик-карта с сеткой и швом по краю.
const toyGround: GroundFn = (x, y, ppu) => {
  const s = STAGE_DEFS[0];
  const edge = Math.min(x, y, s.w - x, s.h - y);
  if (edge < 10) return edge < 3 ? KHAKI[1] : ((Math.floor((x + y) / 6) & 1) ? KHAKI[2] : KHAKI[3]);
  const n = vnoise(x * 0.006, y * 0.006, 3);
  let c = n > 0.62 ? OLIVE[2] : n > 0.38 ? OLIVE[1] : KHAKI[1];
  const g = 64;
  if ((x % g < 1.2 || y % g < 1.2) && ppu > 0.35) c = n > 0.5 ? OLIVE[3] : OLIVE[2];
  if (ppu > 0.6 && speck(x, y, 3, 1) < 0.08) c = n > 0.5 ? OLIVE[1] : KHAKI[2];
  return c;
};

// 1. Ковёр с орнаментом (арена) — в комнате.
const carpetGround: GroundFn = (x, y, ppu) => {
  const s = STAGE_DEFS[1];
  const cx = x - s.w / 2, cy = y - s.h / 2;
  const ax = Math.abs(cx), ay = Math.abs(cy);
  const edge = Math.min(x, y, s.w - x, s.h - y);
  if (edge < 26) {
    // Бахрома/кайма
    if (edge < 8) return (Math.floor(x / 4 + y / 4) & 1) ? CREAM[3] : CREAM[2];
    return ((Math.floor(x / 10) + Math.floor(y / 10)) & 1) ? CARPET[4] : CARPET[3];
  }
  // Концентрические рамки и ромбы.
  const ring = Math.max(ax / s.w * 1.8, ay / s.h * 1.8);
  const band = Math.floor(ring * 10);
  let c = band % 3 === 0 ? CARPET[2] : band % 3 === 1 ? CARPET[3] : CARPET[1];
  const d = (Math.abs((cx % 120 + 120) % 120 - 60) + Math.abs((cy % 120 + 120) % 120 - 60));
  if (d < 22 && band % 3 !== 0) c = CREAM[1];
  if (d < 8) c = CARPET[4];
  if (ppu > 0.4) {
    const f = speck(x, y, 2, 3);
    if (f < 0.12) c = CARPET[Math.max(0, (band % 3) + 0)];
  }
  return c;
};

// 2. Комната: паркет (вокруг ковра).
const roomGround: GroundFn = (x, y, ppu) => {
  const s = STAGE_DEFS[2];
  const edge = Math.min(x, y, s.w - x, s.h - y);
  if (edge < 30) return edge < 12 ? WOOD[0] : CREAM[2]; // плинтус и стена
  const pw = 40, ph = 160;
  const col = Math.floor(x / pw);
  const off = (col * 53) % ph;
  const row = Math.floor((y + off) / ph);
  const seam = (x % pw < 1.2) || ((y + off) % ph < 1.2);
  const h = hash2(col, row, 11);
  let c = h > 0.66 ? WOOD[3] : h > 0.33 ? WOOD[2] : WOOD[4];
  if (seam && ppu > 0.25) c = WOOD[1];
  else if (ppu > 0.5) {
    const grain = Math.sin(y * 0.15 + vnoise(x * 0.05, y * 0.01, col) * 8);
    if (grain > 0.88) c = WOOD[1 + (h > 0.5 ? 1 : 0)];
  }
  return c;
};

// 3. Квартира: плитка, ламинат, ковролин по «комнатам».
const houseGround: GroundFn = (x, y, ppu) => {
  const s = STAGE_DEFS[3];
  const edge = Math.min(x, y, s.w - x, s.h - y);
  if (edge < 40) return edge < 16 ? CONC[1] : CONC[3];
  const room = (x < 960 ? 0 : x < 1920 ? 1 : 2) + (y < 810 ? 0 : 3);
  switch (room % 4) {
    case 0: { // кухонная плитка
      const t = 36;
      if ((x % t < 1.5 || y % t < 1.5) && ppu > 0.2) return CONC[2];
      return ((Math.floor(x / t) + Math.floor(y / t)) & 1) ? CREAM[3] : CREAM[4];
    }
    case 1: { // ламинат
      const pw = 30;
      const col = Math.floor(y / pw);
      const off = (col * 71) % 200;
      if (((y % pw) < 1.2 || ((x + off) % 200) < 1.2) && ppu > 0.25) return SAND[1];
      return hash2(col, Math.floor((x + off) / 200), 4) > 0.5 ? SAND[3] : SAND[2];
    }
    case 2: return speck(x, y, 3, 9) < 0.2 ? STEEL[2] : STEEL[3]; // ковролин
    default: return speck(x, y, 4, 5) < 0.1 ? TEAL[2] : TEAL[3];
  }
};

// 4. Улицы: дороги, тротуары, газоны.
const streetGround: GroundFn = (x, y, ppu) => {
  const bx = ((x % 480) + 480) % 480, by = ((y % 405) + 405) % 405;
  const road = bx < 50 || by < 60;
  if (road) {
    const cxr = bx < 50, cyr = by < 60;
    if (cxr && Math.abs(bx - 25) < 1 && ((y / 18) | 0) % 2 === 0 && !cyr && ppu > 0.2) return CREAM[4];
    if (cyr && Math.abs(by - 30) < 1 && ((x / 18) | 0) % 2 === 0 && !cxr && ppu > 0.2) return CREAM[4];
    return speck(x, y, 2, 7) < 0.06 ? ASPH[1] : ASPH[2];
  }
  if (bx < 60 || by < 70 || bx > 470 || by > 395) return ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? CONC[3] : CONC[4];
  const n = vnoise(x * 0.02, y * 0.02, 5);
  return n > 0.55 ? GRASS[3] : n > 0.3 ? GRASS[2] : GRASS[4];
};

// 5. Мегаполис: бетон, магистрали, река.
const megaGround: GroundFn = (x, y, ppu) => {
  const river = Math.abs(y - 810 - Math.sin(x * 0.004) * 220) < 70;
  if (river) return speck(x, y, 3, 2) < 0.08 ? OCEAN[3] : OCEAN[2];
  const hw = Math.abs(((x + 300) % 720) - 360) < 22 || Math.abs(((y + 200) % 540) - 270) < 22;
  if (hw) return ((x / 12 | 0) + (y / 12 | 0)) % 9 === 0 && ppu > 0.15 ? CREAM[3] : ASPH[2];
  const n = vnoise(x * 0.01, y * 0.01, 7);
  if (n > 0.72) return GRASS[2];
  return speck(x, y, 6, 1) < 0.15 ? CONC[2] : CONC[3];
};

// 6. Регион: поля-лоскуты, реки, дороги.
const regionGround: GroundFn = (x, y) => {
  const river = Math.abs(y - 600 - Math.sin(x * 0.003) * 300 - Math.sin(x * 0.011) * 60) < 26;
  if (river) return OCEAN[3];
  const road = Math.abs(x - 900 - Math.sin(y * 0.004) * 200) < 6 || Math.abs(y - 1200 - Math.sin(x * 0.005) * 100) < 6;
  if (road) return CONC[2];
  const fx = Math.floor(x / 90), fy = Math.floor(y / 70);
  const h = hash2(fx, fy, 13);
  const pal = h < 0.3 ? GRASS : h < 0.55 ? OLIVE : h < 0.75 ? SAND : GRASS;
  const k = h < 0.75 ? 2 + ((fx + fy) & 1) : 3;
  if ((x % 90 < 1 || y % 70 < 1)) return pal[1];
  return pal[k];
};

// 7. Планета: континенты, океаны, кратеры.
const planetGround: GroundFn = (x, y) => {
  const n = vnoise(x * 0.002, y * 0.002, 21) * 0.65 + vnoise(x * 0.008, y * 0.008, 22) * 0.35;
  if (n < 0.42) return n < 0.32 ? OCEAN[1] : OCEAN[2];
  if (n < 0.45) return SAND[4];
  const lat = Math.abs(y - 810) / 810;
  if (lat > 0.85) return CREAM[4];
  const crater = vnoise(x * 0.02, y * 0.02, 23);
  if (crater > 0.82) return RUST[1];
  return n > 0.7 ? RUST[3] : n > 0.58 ? GRASS[2] : OLIVE[3];
};

const space: GroundFn = (x, y) => {
  const h = hash2(Math.floor(x / 3), Math.floor(y / 3), 99);
  return h > 0.997 ? STAR : h > 0.99 ? PURPLE[1] : SPACE;
};

const PAINTERS: GroundFn[] = [toyGround, carpetGround, roomGround, houseGround, streetGround, megaGround, regionGround, planetGround];

/**
 * Поверхность в точке ступени n с учётом мира за пределами арены
 * (там — уже следующий масштаб, с пересчётом координат).
 */
export function groundAt(n: number, x: number, y: number, ppu: number, depth = 0): number {
  const s = STAGE_DEFS[n];
  if (!s) return space(x, y, ppu);
  if (x >= 0 && y >= 0 && x <= s.w && y <= s.h) {
    const t = groundTex(n);
    return t ? texSample(t, x, y, ppu) : PAINTERS[n](x, y, ppu);
  }
  const next = STAGE_DEFS[n + 1];
  if (!next || depth > 2) return n >= 7 ? space(x, y, ppu) : INK[1];
  const G = STAGE_GROWTH;
  return groundAt(n + 1, next.relicX + (x - s.w / 2) / G, next.relicY + (y - s.h / 2) / G, ppu * G, depth + 1);
}

export { PAINTERS };

// ---------------------------------------------------------------------------
// Внешняя текстура поверхности: ground_<1..8>.png (бесшовная), с мип-уровнями.
// ---------------------------------------------------------------------------

/** Сторона плитки текстуры в единицах ступени (танк в начале ступени — 28). */
const TILE_UNITS = 224;

interface Tex { levels: { w: number; h: number; d: Uint32Array }[] }
const texCache = new Map<number, Tex | null>();

function groundTex(n: number): Tex | null {
  let t = texCache.get(n);
  if (t !== undefined) return t;
  const key = pickExt(`ground_${n + 1}`);
  const px = key ? extPixels(key, 1024) : null;
  if (!px) {
    if (extReady()) texCache.set(n, null);
    return null;
  }
  const levels = [px];
  while (levels[levels.length - 1].w > 8) {
    const p = levels[levels.length - 1];
    const w = p.w >> 1, h = p.h >> 1, d = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const v = p.d[(y * 2 + dy) * p.w + x * 2 + dx];
        r += v & 255; g += (v >>> 8) & 255; b += (v >>> 16) & 255;
      }
      d[y * w + x] = (0xff000000 | ((b >> 2) << 16) | ((g >> 2) << 8) | (r >> 2)) >>> 0;
    }
    levels.push({ w, h, d });
  }
  t = { levels };
  texCache.set(n, t);
  return t;
}

function texSample(t: Tex, x: number, y: number, ppu: number): number {
  const base = t.levels[0];
  // Текселей на пиксель экрана → уровень.
  const tpp = base.w / TILE_UNITS / Math.max(1e-6, ppu);
  let L = 0;
  while (L < t.levels.length - 1 && tpp / Math.pow(2, L + 1) >= 0.85) L++;
  const lv = t.levels[L];
  const u = ((x / TILE_UNITS) % 1 + 1) % 1, v = ((y / TILE_UNITS) % 1 + 1) % 1;
  const c = lv.d[Math.min(lv.h - 1, Math.floor(v * lv.h)) * lv.w + Math.min(lv.w - 1, Math.floor(u * lv.w))];
  // Крупные пятна яркости — чтобы не было заметно повторение плитки.
  const m = 0.93 + vnoise(x / (TILE_UNITS * 2.3), y / (TILE_UNITS * 2.3), 77) * 0.14;
  const r = Math.min(255, (c & 255) * m), g = Math.min(255, ((c >>> 8) & 255) * m), b = Math.min(255, ((c >>> 16) & 255) * m);
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}
