// Мелкие детали земли: травинки, цветы, камешки, ворсинки, крошки. Только украшение (без столкновений).
import { Vox, type ModelDef } from '../vox';

const one = (v: Vox, n: number): ModelDef => ({ size: n, parts: [{ name: 'body', vox: v }] });

export function tuft(k: number): ModelDef {
  const v = new Vox(7, 6, 7), cols = ['grass_l', 'grass_ll', 'leaf_l'];
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + k, x = 3.5 + Math.cos(a) * 1.6, z = 3.5 + Math.sin(a) * 1.6; v.seg([3.5, 0, 3.5], [x, 3 + ((i + k) % 3), z], 0.5, cols[(i + k) % 3]); }
  return one(v, 7);
}
export function flower(k: number): ModelDef {
  const v = new Vox(5, 7, 5), col = ['red', 'yel_l', 'white', 'pink', 'purple'][k % 5];
  v.seg([2.5, 0, 2.5], [2.5, 4, 2.5], 0.45, 'leaf');
  v.box(1.5, 3.5, 4, 5, 1.5, 3.5, col); v.set(2, 5, 2, 'yel');
  return one(v, 5);
}
export function pebble(k: number): ModelDef {
  const v = new Vox(6, 3, 6);
  v.ell(3, 0.8, 3, 2 + (k % 2) * 0.6, 1.4, 1.8, k % 3 ? 'stone' : 'stone_l');
  return one(v, 6);
}
export function lint(k: number): ModelDef {
  const v = new Vox(8, 2, 8), col = ['fabric_b', 'fabric_r', 'white_d', 'yel'][k % 4];
  v.seg([1, 0.5, 2 + (k % 3)], [7, 0.5, 5 - (k % 2)], 0.45, col);
  return one(v, 8);
}
export function crumb(k: number): ModelDef {
  const v = new Vox(5, 3, 5);
  v.ell(2.5, 0.8, 2.5, 1.6, 1, 1.4, ['bread', 'stone_l', 'white_d', 'toy_y'][k % 4]);
  return one(v, 5);
}
export function bush(k: number): ModelDef {
  const v = new Vox(8, 7, 8);
  v.sphere(4, 3, 4, 3, k % 2 ? 'leaf' : 'leaf_d'); v.sphere(3.4, 4, 3.4, 2, 'leaf_l');
  return one(v, 8);
}
export function rock(k: number): ModelDef {
  const v = new Vox(8, 5, 8);
  v.ell(4, 1.2, 4, 3, 2.4, 2.6, k % 2 ? 'rock' : 'rock_d'); v.ell(3.3, 2, 3.4, 1.4, 1, 1.4, 'rock_l');
  return one(v, 8);
}
export function litter(k: number): ModelDef {
  const v = new Vox(6, 2, 6);
  if (k % 2) v.cylY(3, 3, 2.2, 0, 0.6, 'gun'); else v.box(1, 5, 0, 1, 2, 4, ['paper', 'red', 'white'][k % 3]);
  return one(v, 6);
}

/** Какие детали и где: по цвету клетки земли ступени. [вид, размер в единицах мира, доля]. */
export function decoFor(s: number, c: string): [string, number] | null {
  const r = Math.random();
  if (s === 0) {
    if (c.startsWith('grass')) return r < 0.7 ? ['tuft', 7] : ['flower', 5];
    if (c.startsWith('dirt')) return ['pebble', 5];
    return null;
  }
  if (s === 1) return c.startsWith('fabric') || c === 'cream' ? ['lint', 9] : null;
  if (s === 2) return c.startsWith('wood') || c === 'plank' ? (r < 0.6 ? ['crumb', 4] : ['lint', 8]) : null;
  if (s === 3) return ['crumb', 4];
  if (s === 4) return c.startsWith('grass') ? (r < 0.7 ? ['tuft', 8] : ['flower', 6]) : c.startsWith('asphalt') ? ['litter', 6] : null;
  if (s === 5) return c.startsWith('grass') ? ['bush', 10] : c.startsWith('asphalt') ? ['litter', 5] : null;
  if (s === 6) return c.startsWith('leaf') || c.startsWith('grass') ? ['bush', 14] : null;
  if (s === 7) return c.startsWith('rock') || c === 'ash' ? ['rock', 10] : c === 'grass_d' || c === 'leaf' ? ['bush', 10] : null;
  return null;
}

export const DECO: Record<string, (k: number) => ModelDef> = { tuft, flower, pebble, lint, crumb, bush, rock, litter };
