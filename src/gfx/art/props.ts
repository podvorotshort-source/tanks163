// Спрайты препятствий (вид сверху). Рисуются в локальных единицах ступени
// по размерам препятствия (w × h), не поворачиваются.

import { pickExt, type ExtSpec } from '../ext';
import type { RampId } from '../palette';
import { type Layer, type SpriteDef, rect, circ, ell, poly, ring, cap, sym, texSpeckle, texStripesX, texStripesY } from '../raster';
import { hash2 } from '../../core/math';

const cache = new Map<string, SpriteDef>();

const BLOCK_COLORS: RampId[] = ['toyRed', 'toyBlue', 'toyYellow', 'toyGreen', 'purple', 'pink'];
const CRAYON: RampId[] = ['toyRed', 'toyBlue', 'toyYellow', 'toyGreen', 'purple', 'rust'];
const BOOKS: RampId[] = ['blue', 'red', 'toyGreen', 'purple', 'rust'];
const ROOFS: RampId[] = ['rust', 'red', 'iron', 'olive', 'wood', 'steel'];

function crackTex(seed: number) {
  return (x: number, y: number) => {
    const v = Math.abs(Math.sin(x * 0.9 + seed) * 3 + Math.cos(y * 0.7 - seed) * 3 - (x - y) * 0.3);
    return v < 0.35 ? -2 : 0;
  };
}

function build(kind: string, w: number, h: number, v: number): Layer[] {
  const hw = w / 2, hh = h / 2, m = Math.min(w, h);
  switch (kind) {
    // --- Игрушечный полигон ---
    case 'brick': return [
      rect(0, 0, w, h, 'rust', 1, { bevel: 0 }),
      rect(-hw * 0.5 + (v ? hw * 0.5 : 0), -hh * 0.5, hw * (v ? 1.9 : 0.9), hh * 0.85, 'rust', 3),
      rect(v ? -hw * 0.5 : hw * 0.5, -hh * 0.5, hw * 0.9, hh * 0.85, 'rust', 3),
      rect(-hw * 0.5, hh * 0.5, hw * 0.9, hh * 0.85, 'rust', 3),
      rect(hw * 0.5, hh * 0.5, hw * 0.9, hh * 0.85, 'rust', 3, { tex: texSpeckle(0.15, -1, 1, v + 3) }),
    ];
    case 'steel': return [
      rect(0, 0, w, h, 'steel', 3, { bevel: 1.5, hi: 2 }),
      rect(0, 0, w * 0.45, h * 0.45, 'steel', 4, { hi: 1 }),
      rect(0, 0, w * 0.2, h * 0.2, 'steel', 2, { bevel: 0 }),
    ];
    case 'bush': return [
      ...[[-0.3, -0.3], [0.3, -0.25], [-0.25, 0.3], [0.3, 0.3], [0, 0]].map(([x, y], i) =>
        circ(x * w, y * h, m * (0.36 + 0.06 * ((v + i) % 3)), 'grass', 3 + ((i + v) % 2), { hi: 2, tex: texSpeckle(0.25, -1, 1.2, v * 3 + i) })),
    ];
    case 'water': return [
      rect(0, 0, w, h, 'ocean', 3, { bevel: 0, tex: (x, y, f) => (Math.sin(x * 0.45 + y * 0.2 + f * 1.6) > 0.82 ? 2 : Math.sin(x * 0.2 - y * 0.5 + f) > 0.9 ? 1 : 0) }),
      rect(0, -hh + 1, w, 2, 'ocean', 1, { bevel: 0 }),
    ];
    case 'toyCube': {
      const c = BLOCK_COLORS[v % BLOCK_COLORS.length];
      return [rect(0, 0, w, h, c, 3, { r: m * 0.08, hi: 2 }), rect(0, 0, w * 0.6, h * 0.6, c, 4, { r: m * 0.06 }), ring(0, 0, m * 0.1, m * 0.2, c, 2, { min: 0.5 })];
    }
    case 'crate': return [
      rect(0, 0, w, h, 'wood', 3, { r: 1, tex: texStripesX(Math.max(2, w / 4), -1) }),
      rect(0, 0, w * 0.92, h * 0.12, 'wood', 4), rect(0, 0, w * 0.12, h * 0.92, 'wood', 4),
      circ(0, 0, m * 0.2, 'toyRed', 4, { glow: true }),
      rect(0, 0, m * 0.25, m * 0.08, 'cream', 5, { glow: true, min: 0.3 }), rect(0, 0, m * 0.08, m * 0.25, 'cream', 5, { glow: true, min: 0.3 }),
    ];
    case 'steelWall': return [
      rect(0, 0, w, h, 'blue', 3, { bevel: 1, hi: 2, r: m * 0.1 }),
      rect(0, 0, w * 0.5, h * 0.5, 'sky', 4, { glow: true, min: 0.3 }),
    ];
    case 'hq': return [
      rect(0, 0, w, h, 'concrete', 3, { r: m * 0.06 }),
      rect(0, 0, w * 0.86, h * 0.86, 'olive', 3, { r: m * 0.04 }),
      poly(star5(0, 0, m * 0.3, m * 0.13), 'gold', 4, { hi: 1 }),
      ...sym(rect(w * 0.36, h * 0.36, m * 0.1, m * 0.1, 'toyRed', 4, { glow: true, min: 0.2 })),
      cap(-w * 0.3, -h * 0.3, -w * 0.3, -h * 0.55, m * 0.02, 'iron', 4),
      poly([-w * 0.3, -h * 0.55, -w * 0.05, -h * 0.47, -w * 0.3, -h * 0.4], 'toyRed', 4),
    ];
    // --- Детская ---
    case 'block': {
      const c = BLOCK_COLORS[v % BLOCK_COLORS.length];
      const n = Math.max(1, Math.round(w / 14));
      const k = Math.max(1, Math.round(h / 14));
      const l: Layer[] = [rect(0, 0, w, h, c, 3, { r: 1.5, hi: 1 })];
      for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) l.push(circ(-hw + (i + 0.5) * (w / n), -hh + (j + 0.5) * (h / k), Math.min(w / n, h / k) * 0.3, c, 4, { min: 0.25 }));
      return l;
    }
    case 'crayon': {
      const c = CRAYON[v % CRAYON.length];
      const horiz = w > h;
      const L = horiz ? w : h, T = horiz ? h : w;
      const pts = (x: number, y: number) => (horiz ? [x, y] : [y, x]);
      return [
        rect(0, 0, w, h, c, 3, { r: T * 0.3, tex: horiz ? texStripesX(T * 1.2, 0) : texStripesY(T * 1.2, 0) }),
        rect(...(pts(-L * 0.25, 0) as [number, number]), horiz ? L * 0.35 : T * 0.9, horiz ? T * 0.9 : L * 0.35, 'cream', 4),
        poly([...pts(L / 2 - T * 0.2, -T / 2), ...pts(L / 2 + T * 0.9, 0), ...pts(L / 2 - T * 0.2, T / 2)], c, 4),
      ];
    }
    case 'book': {
      const c = BOOKS[v % BOOKS.length];
      return [rect(2, 2, w, h, 'cream', 4, { r: 1 }), rect(0, 0, w, h, c, 3, { r: 1.5 }), rect(-hw + 4, 0, 5, h, c, 2), rect(4, -h * 0.15, w * 0.45, h * 0.12, 'gold', 4, { min: 0.4 })];
    }
    case 'marble': return [
      circ(0, 0, w / 2, 'glass', 3, { hi: 2 }),
      cap(-w * 0.25, w * 0.1, w * 0.2, -w * 0.15, w * 0.08, BLOCK_COLORS[v % 6], 4, { min: 0.3 }),
      circ(-w * 0.18, -w * 0.18, w * 0.1, 'white', 5, { glow: true, min: 0.3 }),
    ];
    case 'slipper': return [ell(0, 0, hw, hh, 'pink', 3, { hi: 2, tex: texSpeckle(0.1, -1, 2, 7) }), ell(hw * 0.15, 0, hw * 0.65, hh * 0.62, 'pink', 2), ell(hw * 0.6, 0, hw * 0.25, hh * 0.5, 'cream', 4)];
    case 'pillow': return [rect(0, 0, w, h, 'cream', 4, { r: m * 0.3, hi: 1, tex: texSpeckle(0.08, -1, 2, 2) }), rect(0, 0, w * 0.7, h * 0.5, 'sky', 4, { r: m * 0.2 })];
    case 'furnitureLeg': return [circ(0, 0, w / 2, 'wood', 3, { hi: 1, tex: (x, y) => (Math.floor(Math.hypot(x, y) / 4) & 1 ? -1 : 0) }), circ(0, 0, w * 0.3, 'wood', 4)];
    // --- Комната ---
    case 'bed': return [rect(0, 0, w, h, 'wood', 2, { r: 4 }), rect(-w * 0.05, 0, w * 0.86, h * 0.88, 'sky', 4, { r: 8, tex: texSpeckle(0.05, -1, 3, 4) }), rect(w * 0.3, 0, w * 0.18, h * 0.7, 'cream', 5, { r: 8 }), rect(-w * 0.25, 0, w * 0.4, h * 0.9, 'blue', 3, { r: 6, tex: texStripesY(18, -1) })];
    case 'wardrobe': return [rect(0, 0, w, h, 'wood', 3, { tex: texStripesX(w / 3, -1) }), rect(0, 0, 4, h, 'wood', 1, { bevel: 0 }), ...sym(circ(-6, h * 0.25, 3, 'gold', 4))];
    case 'desk': return [rect(0, 0, w, h, 'wood', 3, { r: 2, tex: (x, y) => (Math.sin(y * 0.4 + Math.sin(x * 0.05) * 3) > 0.85 ? -1 : 0) }), rect(-w * 0.2, -h * 0.1, w * 0.3, h * 0.4, 'cream', 4), rect(w * 0.25, h * 0.1, w * 0.12, h * 0.25, 'iron', 3)];
    case 'shelf': return [rect(0, 0, w, h, 'wood', 3), ...Array.from({ length: 8 }, (_, i) => rect(-w / 2 + 10 + i * (w - 20) / 8 + 6, 0, (w - 20) / 9, h * 0.8, BOOKS[i % 5], 3))];
    case 'box': return [rect(0, 0, w, h, 'sand', 3, { r: 1 }), rect(0, 0, w, h * 0.1, 'sand', 4), rect(0, 0, 3, h, 'khaki', 2, { bevel: 0 }), rect(w * 0.2, h * 0.2, w * 0.25, h * 0.15, 'cream', 4, { min: 0.3 })];
    case 'bookStack': return [rect(0, 0, w, h, BOOKS[v % 5], 3, { r: 1 }), rect(1.5, 1.5, w * 0.9, h * 0.85, BOOKS[(v + 2) % 5], 3, { r: 1 }), rect(3, 3, w * 0.8, h * 0.7, BOOKS[(v + 3) % 5], 4, { r: 1 })];
    case 'toyDebris': return [rect(0, 0, w, h * 0.8, BLOCK_COLORS[v % 6], 3, { r: 1, hi: 2 }), circ(0, 0, m * 0.2, BLOCK_COLORS[v % 6], 4, { min: 0.5 })];
    // --- Квартира ---
    case 'houseWall': return [rect(0, 0, w, h, 'concrete', 3, { tex: texSpeckle(0.05, -1, 3, 9) }), rect(0, 0, w * 0.96, h * 0.5, 'concrete', 4, { bevel: 0 })];
    case 'sofa': return [rect(0, 0, w, h, 'purple', 2, { r: 8 }), rect(0, h * 0.1, w * 0.84, h * 0.6, 'purple', 3, { r: 6, tex: texStripesX(w / 3, -1) }), ...sym(rect(0, 0, w * 0.1, h * 0.8, 'purple', 4, { r: 4 })).map((l, i) => ({ ...l, s: { ...(l.s as { k: 'rect'; x: number; y: number; w: number; h: number }), x: i ? w * 0.45 : -w * 0.45, y: 0 } }))];
    case 'table': return [rect(0, 0, w, h, 'wood', 3, { r: 4, tex: (x) => (Math.sin(x * 0.3) > 0.9 ? -1 : 0) }), circ(-w * 0.2, 0, m * 0.12, 'cream', 5), circ(w * 0.2, h * 0.1, m * 0.1, 'red', 4)];
    case 'fridge': return [rect(0, 0, w, h, 'cream', 4, { r: 3 }), rect(-w * 0.1, 0, 2, h * 0.9, 'cream', 2, { bevel: 0 }), rect(w * 0.3, -h * 0.25, 4, h * 0.2, 'iron', 3)];
    case 'tvStand': return [rect(0, 0, w, h, 'wood', 2, { r: 2 }), rect(0, -h * 0.1, w * 0.85, h * 0.3, 'ink', 1, { r: 1 }), rect(0, -h * 0.1, w * 0.8, h * 0.18, 'glass', 2, { min: 0.3 })];
    case 'plant': return [circ(0, 0, m * 0.32, 'rust', 3), ...[0, 1, 2, 3, 4].map(i => ell(Math.cos(i * 1.26) * m * 0.25, Math.sin(i * 1.26) * m * 0.25, m * 0.22, m * 0.1, 'grass', 4, { rot: i * 1.26 }))];
    case 'armchair': return [rect(0, 0, w, h, 'red', 2, { r: 6 }), rect(w * 0.05, 0, w * 0.6, h * 0.65, 'red', 3, { r: 5 })];
    case 'stove': return [rect(0, 0, w, h, 'concrete', 4, { r: 2 }), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => ring(x * w * 0.22, y * h * 0.22, m * 0.06, m * 0.14, 'ink', 1))];
    case 'clutter': return [rect(0, 0, w, h * 0.7, BLOCK_COLORS[v % 6], 3, { r: 2, hi: 2 })];
    // --- Улицы ---
    case 'house': {
      const c = ROOFS[v % ROOFS.length];
      const horiz = w >= h;
      return [
        rect(0, 0, w, h, c, 3, { tex: horiz ? texStripesY(4, -1) : texStripesX(4, -1) }),
        horiz ? rect(0, 0, w, 2, c, 5, { bevel: 0 }) : rect(0, 0, 2, h, c, 5, { bevel: 0 }),
        horiz ? rect(0, h * 0.25, w, h * 0.5, c, 2, { bevel: 0, tex: texStripesX(4, -1) }) : rect(w * 0.25, 0, w * 0.5, h, c, 2, { bevel: 0, tex: texStripesY(4, -1) }),
        rect(w * 0.3, -h * 0.25, m * 0.12, m * 0.16, 'iron', 2, { min: 0.3 }),
      ];
    }
    case 'tree': return [circ(0, 0, w / 2, 'grass', 3, { hi: 2, tex: texSpeckle(0.25, -1, 1.5, v) }), circ(-w * 0.12, -w * 0.12, w * 0.25, 'grass', 4)];
    case 'car': {
      const c = BLOCK_COLORS[v % 6];
      return [rect(0, 0, w, h, c, 3, { r: m * 0.3, hi: 2 }), rect(w > h ? w * 0.08 : 0, w > h ? 0 : -h * 0.08, w > h ? w * 0.35 : w * 0.8, w > h ? h * 0.8 : h * 0.35, 'glass', 3, { r: m * 0.15 })];
    }
    // --- Мегаполис ---
    case 'tower': {
      const c: RampId = v % 3 === 0 ? 'glass' : v % 3 === 1 ? 'concrete' : 'steel';
      return [
        rect(0, 0, w, h, c, 3, { tex: (x, y) => ((Math.floor(x / 5) + Math.floor(y / 5)) & 1 ? -1 : 0) }),
        rect(0, 0, w * 0.7, h * 0.7, c, 4, { bevel: 1 }),
        rect(0, 0, w * 0.3, h * 0.3, 'iron', 3),
        circ(w * 0.1, h * 0.1, m * 0.05, 'toyRed', 5, { glow: true, min: 0.15 }),
      ];
    }
    case 'midrise': return [rect(0, 0, w, h, ROOFS[v % 6], 3, { tex: texSpeckle(0.1, -1, 2, v) }), rect(w * 0.15, h * 0.1, w * 0.35, h * 0.3, 'iron', 2)];
    // --- Регион ---
    case 'mountain': return [
      ell(0, 0, hw, hh, 'concrete', 2, { tex: texSpeckle(0.08, -1, 3, v) }),
      ...Array.from({ length: 5 }, (_, i) => poly([
        (hash2(i, v, 1) - 0.5) * w * 0.6 - m * 0.15, (hash2(i, v, 2) - 0.5) * h * 0.6 + m * 0.12,
        (hash2(i, v, 1) - 0.5) * w * 0.6, (hash2(i, v, 2) - 0.5) * h * 0.6 - m * 0.18,
        (hash2(i, v, 1) - 0.5) * w * 0.6 + m * 0.15, (hash2(i, v, 2) - 0.5) * h * 0.6 + m * 0.12,
      ], 'concrete', 4, { hi: 2 })),
      ...Array.from({ length: 5 }, (_, i) => circ((hash2(i, v, 1) - 0.5) * w * 0.6, (hash2(i, v, 2) - 0.5) * h * 0.6 - m * 0.12, m * 0.04, 'white', 5, { min: 0.1 })),
    ];
    case 'cityDot': return [circ(0, 0, w / 2, 'concrete', 2, { tex: texSpeckle(0.3, 2, 1.2, v) }), circ(0, 0, w * 0.2, 'gold', 4, { glow: true, min: 0.1 })];
    // --- Планета ---
    case 'volcano': return [circ(0, 0, w / 2, 'rust', 2, { tex: texSpeckle(0.1, -1, 4, v) }), ring(0, 0, w * 0.14, w * 0.28, 'rust', 4), circ(0, 0, w * 0.14, 'fire', 4, { glow: true }), circ(0, 0, w * 0.07, 'fire', 5, { glow: true })];
    case 'crystal': return [poly([0, -h / 2, w * 0.4, -h * 0.1, w * 0.25, h / 2, -w * 0.25, h / 2, -w * 0.4, -h * 0.1], 'teal', 3, { hi: 2 }), poly([0, -h * 0.4, w * 0.15, 0, 0, h * 0.3, -w * 0.15, 0], 'teal', 5, { glow: true })];
    default: return [rect(0, 0, w, h, 'concrete', 3)];
  }
}

function star5(cx: number, cy: number, R: number, r: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  return pts;
}

// Внешняя графика: prop_<kind>.png. Полосы стен мостятся плитками, вода растягивается,
// игрушки разных вариантов перекрашиваются по тону.
const TILED = new Set(['brick', 'steel', 'steelWall', 'block', 'houseWall']);
const FILLED = new Set(['water']);
const HUED = new Set(['block', 'toyCube', 'crayon', 'marble', 'book', 'pillow', 'slipper']);

/** Определение спрайта препятствия. damaged — показать трещины. */
export function propDef(kind: string, w: number, h: number, v: number, damaged = false): SpriteDef {
  const rw = Math.round(w * 2) / 2, rh = Math.round(h * 2) / 2;
  const key = `prop:${kind}:${rw}:${rh}:${v}:${damaged ? 1 : 0}`;
  let d = cache.get(key);
  if (!d) {
    const ek = pickExt(`prop_${kind}`);
    if (ek) {
      let ext: ExtSpec;
      if (TILED.has(kind)) { const cell = Math.min(rw, rh); ext = { key: ek, w: cell, tile: cell, foot: [rw, rh] }; }
      else if (FILLED.has(kind)) ext = { key: ek, w: rw, foot: [rw, rh], fill: true };
      else ext = { key: ek, w: rw, foot: [rw, rh] };
      if (HUED.has(kind) && v) ext.hue = (v * 83) % 360;
      if (damaged) ext.dim = 0.3;
      d = { id: key + ':ext', layers: [], rotates: false, ext };
      cache.set(key, d);
      return d;
    }
    let layers = build(kind, rw, rh, v);
    if (damaged) layers = layers.map((l, i) => (i === 0 || i === 1 ? { ...l, tex: crackTex(v + i) } : l));
    d = { id: key, layers, rotates: false, frames: kind === 'water' ? 4 : 1, castDist: Math.min(2.5, Math.max(1, Math.min(w, h) * 0.05)) };
    cache.set(key, d);
  }
  return d;
}

/** Высота для тени (визуальная «высота» препятствия). */
export function propHeight(kind: string): number {
  switch (kind) {
    case 'water': return 0;
    case 'bush': case 'tree': return 0.5;
    case 'tower': return 3;
    case 'wardrobe': case 'fridge': case 'houseWall': return 2;
    case 'mountain': case 'volcano': return 1.5;
    default: return 1;
  }
}

export { star5 };
