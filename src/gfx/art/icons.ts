// Иконки 16×16 (модель −8..8): бонусы, оружие, способности, улучшения.

import { pickExt, extIcon } from '../ext';
import { type Layer, type SpriteDef, rect, circ, ell, poly, cap, ring, sym, rasterize, texStripesY } from '../raster';
import { makeCanvas } from '../screen';

const L: Record<string, () => Layer[]> = {
  // Бонусы
  p_star: () => [poly(star5(0, 0.5, 7.6, 3.3), 'gold', 4, { hi: 1 }), poly(star5(0, 0.5, 4, 1.7), 'gold', 5, { bevel: 0 })],
  p_clock: () => [circ(0, 0.5, 7, 'blue', 3), circ(0, 0.5, 5.6, 'cream', 5), cap(0, 0.5, 0, -3.5, 0.6, 'ink', 1, { bevel: 0 }), cap(0, 0.5, 3, 0.5, 0.6, 'ink', 1, { bevel: 0 }), rect(0, -7, 3, 2, 'blue', 4)],
  p_helmet: () => [ell(0, 1, 7.5, 6.4, 'olive', 3, { hi: 2 }), rect(0, 5.5, 16, 3, 'olive', 2), ell(-2, -1, 2.4, 1.6, 'olive', 5, { bevel: 0 }), poly(star5(0, 1.5, 2.4, 1), 'red', 4)],
  p_grenade: () => [ell(0, 1.5, 5.6, 6.4, 'toyGreen', 3, { hi: 2 }), ...[-2.5, 0, 2.5].map(y => rect(0, 1.5 + y, 10, 0.7, 'toyGreen', 1, { bevel: 0 })), rect(0, -5.4, 4, 2.4, 'iron', 3), ring(3, -6.4, 0.8, 1.8, 'steel', 4)],
  p_shovel: () => [cap(-4.5, 4.5, 3, -3, 0.9, 'wood', 3), poly([3, -3, 7.5, -5, 6.5, -7.5, 4.5, -7.5, 1.5, -5.5], 'steel', 4, { hi: 1 }), rect(-5.5, 5.5, 4, 1.6, 'wood', 4, { rot: -0.78 })],
  p_tank: () => [...sym(rect(0, 4.6, 14, 3.6, 'iron', 2, { r: 1.4 })), rect(0, 0, 12, 7, 'gold', 3, { r: 1 }), circ(-0.5, 0, 3.2, 'gold', 4), rect(4.5, 0, 6, 1.6, 'iron', 3)],
  p_repair: () => [rect(0, 0, 14, 12, 'red', 3, { r: 2 }), rect(0, 0, 8, 2.6, 'white', 5), rect(0, 0, 2.6, 8, 'white', 5), rect(0, -6.5, 5, 2, 'red', 2)],
  // Оружие
  w_ap: () => [cap(-6, 3, 4, -4, 2.2, 'gold', 4, { hi: 1 }), poly([4, -4, 7.5, -7, 6, -3], 'steel', 4), cap(-6, 3, -4.5, 2, 2.3, 'rust', 3)],
  w_he: () => [ell(0, 0, 4.6, 6.8, 'red', 3, { rot: 0.7, hi: 2 }), poly([3, -5, 6.5, -7.5, 5.5, -3.5], 'iron', 4), ring(-1.2, 1.2, 1, 2.2, 'gold', 4)],
  w_mg: () => [...[-4.5, -1.5, 1.5, 4.5].map(x => cap(x, 4, x + 1, -5, 1.1, 'gold', 4)), rect(0, 4.5, 14, 2.4, 'olive', 3)],
  w_rockets: () => [cap(-5, 5, 4, -4, 1.9, 'cream', 4, { hi: 1 }), poly([4, -4, 7.6, -7.6, 5.6, -2.4], 'red', 4), ...sym(poly([-4.5, 4.5, -7.6, 3.2, -6, 6], 'red', 3)), circ(-6.5, 6.5, 1.4, 'fire', 4, { glow: true })],
  w_flame: () => [poly([0, -7.6, 4.8, -1, 4, 4, 0, 7, -4, 4, -4.8, -1, -1.5, -3, -1, -6], 'fire', 3), poly([0, -3, 2.6, 1.2, 0, 5, -2.6, 1.2], 'fire', 5, { glow: true })],
  w_mines: () => [ell(0, 1.5, 7.4, 4.6, 'iron', 3, { hi: 2 }), ell(0, 0.5, 4.4, 2.6, 'iron', 4), circ(0, 0, 1.4, 'red', 4, { glow: true }), ...[-5, 5].map(x => rect(x, -1, 1.2, 3, 'iron', 2))],
  w_tesla: () => [rect(0, 4.5, 8, 5, 'steel', 3), ring(0, -1, 1.5, 3.4, 'rust', 4), poly([1.5, -7.5, -2, -1.5, 0.8, -1.5, -1.5, 4.5, 3.6, -3, 0.6, -3, 3, -7.5], 'teal', 5, { glow: true })],
  w_ram: () => [poly([-7, -6, 5, -7.5, 7.6, 0, 5, 7.5, -7, 6, -3, 0], 'steel', 3, { hi: 2 }), ...[-4, 0, 4].map(y => poly([5.5, y - 1.2, 7.8, y, 5.5, y + 1.2], 'steel', 5))],
  // Способности
  a_dash: () => [poly([-7, -4, 3, -4, 3, -7, 7.8, 0, 3, 7, 3, 4, -7, 4], 'sky', 4, { hi: 1 }), ...[-6, -3].map(x => rect(x, 0, 1.4, 6, 'sky', 2, { bevel: 0 }))],
  a_volley: () => [circ(0, 0, 2.6, 'red', 4), ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return cap(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * 7.4, Math.sin(a) * 7.4, 1, 'fire', 4); })],
  a_fortress: () => [poly([0, -7.6, 6.6, -4.6, 6, 2, 0, 7.6, -6, 2, -6.6, -4.6], 'gold', 4, { hi: 1 }), poly([0, -4.5, 3.6, -2.8, 3.3, 1.3, 0, 4.4, -3.3, 1.3, -3.6, -2.8], 'gold', 2)],
  a_repair: () => [cap(-5, 5, 3, -3, 1.4, 'steel', 4, { hi: 1 }), ring(4, -4, 1.6, 3.6, 'steel', 4), rect(-3.5, 3.5, 3, 3, 'red', 4, { glow: true })],
  a_airstrike: () => [ring(0, 0, 4.2, 6.2, 'red', 3), rect(0, 0, 16, 1.2, 'red', 4, { bevel: 0 }), rect(0, 0, 1.2, 16, 'red', 4, { bevel: 0 }), circ(0, 0, 1.6, 'fire', 5, { glow: true })],
  a_emp: () => [ring(0, 0, 5.6, 7.4, 'teal', 4, { glow: true }), ring(0, 0, 2.4, 3.8, 'teal', 5, { glow: true }), circ(0, 0, 1.2, 'white', 5, { glow: true })],
  a_shockwave: () => [ring(0, 0, 6, 7.6, 'sky', 4), ring(0, 0, 3, 4.4, 'sky', 3), circ(0, 0, 1.6, 'white', 5)],
  a_minefield: () => [...[0, 1, 2, 3, 4].map(i => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return circ(Math.cos(a) * 5, Math.sin(a) * 5, 2.2, 'iron', 4); }), circ(0, 0, 1.6, 'red', 4, { glow: true })],
  a_overdrive: () => [poly([2, -7.8, -5, 1, -0.5, 1, -2.5, 7.8, 5, -1.5, 0.5, -1.5], 'gold', 5, { glow: true })],
  a_drone: () => [...[[1, 1], [1, -1], [-1, 1], [-1, -1]].flatMap(([x, y]) => [cap(0, 0, x * 4.6, y * 4.6, 0.7, 'iron', 2), ring(x * 4.8, y * 4.8, 1.2, 2.6, 'steel', 4)]), rect(0, 0, 5, 4, 'teal', 4, { r: 1 })],
  a_wall: () => [...[-5, 0, 5].flatMap(x => [rect(x, -3, 4.6, 4.6, 'blue', 4, { hi: 1 }), rect(x + 2.5, 2.4, 4.6, 4.6, 'blue', 3, { hi: 1 })])],
  a_magma: () => [...[-0.5, 0, 0.5].map(t => cap(-6, 4, -6 + Math.cos(-0.5 + t) * 13, 4 + Math.sin(-0.5 + t) * 13, 1.2, 'fire', 4, { glow: true })), rect(-5, 4.5, 7, 5, 'steel', 3, { hi: 1 }), circ(-5, 4.5, 1.6, 'red', 5, { glow: true })],
  a_gravity: () => [circ(0, 0, 2.4, 'ink', 0), ...[0, 1, 2].map(i => ring(0, 0, 3.4 + i * 1.6, 4 + i * 1.6, 'purple', 3 + (i % 2)))],
  // Общие улучшения
  s_caliber: () => [cap(0, 6, 0, -4, 3, 'gold', 4, { hi: 1 }), poly([-3, -4, 0, -8, 3, -4], 'steel', 4), rect(0, 6.5, 7, 1.6, 'rust', 3)],
  s_loader: () => [ring(0, 0, 4, 7.2, 'steel', 3, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 1.9) & 1 ? 1 : 0) }), circ(0, 0, 2.2, 'gold', 4)],
  s_ballistics: () => [cap(-6, 6, 6, -6, 0.8, 'sky', 4), poly([6, -6, 1.5, -5, 5, -1.5], 'sky', 5), ...[-1, 1].map(k => cap(-6 + k * 2.5, 6 + k * 2.5 - 5, -2 + k * 2.5, 2 + k * 2.5 - 5, 0.5, 'sky', 2))],
  s_explosives: () => [poly(star5(0, 0, 7.6, 3.6).map((v, i) => v * (i % 4 === 0 ? 1.05 : 0.95)), 'fire', 4), circ(0, 0, 2.6, 'fire', 5, { glow: true })],
  s_napalmMix: () => [rect(0, 2, 10, 11, 'red', 3, { r: 1.5 }), rect(0, -5.5, 4, 3, 'iron', 3), poly([0, -1.5, 2.5, 2.5, 0, 5.5, -2.5, 2.5], 'fire', 5, { glow: true })],
  s_thermite: () => [poly([0, -7.6, 5, 0, 3, 6.5, -3, 6.5, -5, 0], 'fire', 4), poly([0, -3, 2.5, 1.5, 0, 5, -2.5, 1.5], 'white', 5, { glow: true })],
  s_duration: () => [poly([-5.5, -7.5, 5.5, -7.5, 1, 0, 5.5, 7.5, -5.5, 7.5, -1, 0], 'sand', 4, { hi: 1 }), poly([-3, 5.5, 3, 5.5, 0, 2.5], 'gold', 5)],
  s_armor: () => [poly([0, -7.6, 6.6, -4.6, 6, 2, 0, 7.6, -6, 2, -6.6, -4.6], 'steel', 4, { hi: 2 }), rect(0, 0, 1.4, 9, 'steel', 2, { bevel: 0 })],
  s_hull: () => [rect(0, 0, 14, 10, 'olive', 3, { r: 1.5, hi: 2 }), ...[-4.5, 0, 4.5].flatMap(x => [circ(x, -3, 0.9, 'olive', 5), circ(x, 3, 0.9, 'olive', 5)])],
  s_engine: () => [rect(0, 1, 13, 9, 'iron', 3, { r: 1 }), ...[-4, -1.3, 1.3, 4].map(x => rect(x, -5, 1.6, 4, 'iron', 4)), circ(0, 1, 2.5, 'fire', 4, { glow: true })],
  s_optics: () => [ring(0, 0, 4.6, 7, 'steel', 4), ring(0, 0, 1, 2, 'red', 4), rect(0, 0, 14, 0.8, 'red', 4, { bevel: 0 }), rect(0, 0, 0.8, 14, 'red', 4, { bevel: 0 })],
  s_regen: () => [rect(0, 0, 12, 4, 'lime', 4, { r: 1, glow: true }), rect(0, 0, 4, 12, 'lime', 4, { r: 1, glow: true })],
  s_tactics: () => [rect(0, 0, 14, 11, 'ink', 2, { r: 1.5 }), rect(0, -0.5, 12, 8, 'teal', 3, { tex: texStripesY(2, 1) }), poly([-4, 2, -1, -2, 1, 0, 4, -3], 'lime', 5)],
  s_crit: () => [ring(0, 0, 5.4, 7.2, 'red', 4), circ(0, 0, 2, 'red', 5, { glow: true }), ...[0, 1, 2, 3].map(i => { const a = i * Math.PI / 2; return cap(Math.cos(a) * 3.4, Math.sin(a) * 3.4, Math.cos(a) * 7.4, Math.sin(a) * 7.4, 0.6, 'red', 3); })],
  s_critDmg: () => [poly([0, -7.6, 3, -2, 7.6, 0, 3, 2, 0, 7.6, -3, 2, -7.6, 0, -3, -2], 'red', 4, { hi: 2 }), circ(0, 0, 1.8, 'white', 5, { glow: true })],
  s_luck: () => [...[[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]].map(([x, y]) => circ(x, y, 3.4, 'lime', 4, { hi: 1 })), cap(0, 0, 3, 7, 0.7, 'lime', 2)],
  s_tutor: () => [rect(0, 1, 13, 11, 'blue', 3, { r: 1 }), rect(0, 1, 1, 11, 'blue', 1, { bevel: 0 }), poly(star5(3.5, -1.5, 3, 1.3), 'gold', 5)],
  s_press: () => [...sym(rect(0, 4.8, 15, 4.4, 'iron', 2, { r: 2, tex: (x) => (Math.floor(x / 1.5) & 1 ? -1 : 0) })), rect(0, 0, 9, 4, 'iron', 4)],
  syn: () => [ring(-2.6, 0, 2.6, 4.6, 'gold', 4, { hi: 1 }), ring(2.6, 0, 2.6, 4.6, 'purple', 4, { hi: 1 })],
  f_repair: () => L.p_repair(),
  f_scrap: () => [ring(0, 0, 2, 5.6, 'steel', 4, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 2.5) & 1 ? -2 : 0) }), circ(0, 0, 2, 'ink', 0, { bevel: 0 })],
  // Классы (для меню)
  c_scout: () => [...sym(rect(0, 5, 15, 3, 'iron', 2, { r: 1 })), poly([-7, -3.4, 4, -3.4, 7.5, 0, 4, 3.4, -7, 3.4], 'gold', 3), rect(4, 0, 9, 1.4, 'steel', 3)],
  c_assault: () => [...sym(rect(0, 5.2, 15, 3.6, 'iron', 2, { r: 1 })), rect(0, 0, 14, 8, 'gold', 3, { r: 1 }), circ(-1, 0, 3.4, 'gold', 4), rect(5, 0, 7, 2.2, 'iron', 3)],
  c_heavy: () => [...sym(rect(0, 5.4, 16, 4.4, 'iron', 2, { r: 1 })), rect(0, 0, 15, 9.6, 'gold', 3, { r: 1 }), circ(-1, 0, 4, 'gold', 4), rect(5, 0, 5, 3, 'iron', 3), circ(7.5, 0, 1, 'fire', 4, { glow: true })],
  lock: () => [ring(0, -2.5, 2.4, 4, 'steel', 4), rect(0, 3, 11, 8, 'gold', 3, { r: 1 }), rect(0, 3, 1.6, 3.4, 'ink', 0, { bevel: 0 })],
  trophy: () => [poly([-6, -7, 6, -7, 4.5, 0, 1.5, 2.5, 1.5, 5, 4, 6.5, 4, 7.5, -4, 7.5, -4, 6.5, -1.5, 5, -1.5, 2.5, -4.5, 0], 'gold', 4, { hi: 1 }), ring(-6, -4, 1.2, 2.4, 'gold', 3), ring(6, -4, 1.2, 2.4, 'gold', 3)],
  skull: () => [circ(0, -1, 6, 'cream', 4), rect(0, 5, 6, 4, 'cream', 4), ...sym(circ(2.4, -1, 1.6, 'ink', 0, { bevel: 0 })), rect(0, 2.4, 1.2, 2, 'ink', 0, { bevel: 0 })],
  gear: () => L.f_scrap(),
};

const defs = new Map<string, SpriteDef>();
const canvases = new Map<string, HTMLCanvasElement>();

export function iconDef(id: string): SpriteDef {
  let d = defs.get(id);
  if (!d) {
    const fn = L[id] ?? L.syn;
    d = { id: 'icon:' + id, layers: fn(), rotates: false };
    defs.set(id, d);
  }
  return d;
}

/** Иконка 16×16 (или кратная) как холст. */
export function iconCanvas(id: string, scale = 1): HTMLCanvasElement {
  const key = id + '@' + scale;
  let c = canvases.get(key);
  if (!c) {
    const ek = pickExt('icon_' + id);
    const ext = ek ? extIcon(ek, Math.round(18 * scale)) : null;
    if (ext) { canvases.set(key, ext); return ext; }
    const img = rasterize(iconDef(id), scale, 0, 0, 0, Math.round(18 * scale));
    c = makeCanvas(img.w, img.h);
    const x = c.getContext('2d')!;
    x.putImageData(new ImageData(new Uint8ClampedArray(img.data.buffer as ArrayBuffer), img.w, img.h), 0, 0);
    canvases.set(key, c);
  }
  return c;
}

export const ICON_IDS = Object.keys(L);

function star5(cx: number, cy: number, R: number, r: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  return pts;
}
