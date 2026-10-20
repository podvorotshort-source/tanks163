// Общие детали моделей: колёса, винты, стволы, ноги, фигурки.
import { Vox, type ModelDef } from '../vox';
import { tracks } from './tanks';

export { tracks };

/** Колесо на борту (ось вдоль z). */
export function wheel(v: Vox, cx: number, cy: number, r: number, z0: number, z1: number, tire = 'rubber', hub = 'steel'): void {
  v.cylZ(cx, cy, r, z0, z1, tire);
  v.cylZ(cx, cy, r * 0.45, z0 - 0.01, z1 + 0.01, hub);
}

/** Ствол вдоль x. */
export function gun(v: Vox, x0: number, x1: number, y: number, z: number, r: number, col = 'gun', muzzle = 'gun_d'): void {
  v.cylX(y, z, r, x0, x1, col);
  v.cylX(y, z, r + 0.7, x1 - 2, x1, muzzle);
  v.cylX(y, z, Math.max(0.5, r * 0.5), x1 - 1, x1, 'black');
}

/** Простая модель-корпус с башней на гусеницах (для вражеских танков всех ступеней). */
export interface TankSpec {
  L: number; W: number; tH: number; hH: number; body: string; dark: string; light: string; track?: string; wheel?: string;
  tr: number; tH2: number; turret: string; barrel: number; bR: number; twin?: boolean; extra?: (h: Vox, t: Vox, c: { x0: number; x1: number; yT: number; zc: number; tcx: number; tcz: number; TH: number }) => void;
  round?: boolean; wheels?: number;
}
export function tankSpec(s: TankSpec): ModelDef {
  const NX = s.L + 8, NY = s.tH + s.hH + 4, NZ = s.W + 4;
  const h = new Vox(NX, NY, NZ), zc = NZ / 2, x0 = 4, x1 = 4 + s.L;
  const tw = Math.max(3, Math.round(s.W * 0.22));
  tracks(h, x0, x1, s.tH, zc - s.W / 2, zc - s.W / 2 + tw, s.wheels ?? 4, s.wheel ?? s.dark);
  tracks(h, x0, x1, s.tH, zc + s.W / 2 - tw, zc + s.W / 2, s.wheels ?? 4, s.wheel ?? s.dark);
  const yT = s.tH + s.hH;
  h.box(x0 + 1, x1 - 1, 2, s.tH, zc - s.W / 2 + tw, zc + s.W / 2 - tw, 'gun_d');
  h.box(x0, x1, s.tH - 1, yT, zc - s.W / 2 - 1, zc + s.W / 2 + 1, s.body);
  h.cut(1, 1.3, 0, x1 - 2 + 1.3 * yT, x1 - 8, x1 + 1, s.tH - 1, yT + 1);
  h.paint(() => s.light, x0, x1, yT - 1, yT, 0, NZ);
  h.paint(() => s.dark, x0, x1, s.tH - 1, s.tH, 0, NZ);
  const TNX = s.tr * 2 + s.barrel + 6, TNY = s.tH2 + 8, TNZ = s.tr * 2 + 6;
  const t = new Vox(TNX, TNY, TNZ), tcx = s.tr + 2, tcz = TNZ / 2;
  if (s.round !== false) t.cylY(tcx, tcz, s.tr, 0, s.tH2, s.turret, s.tr - 1.2);
  else { t.box(tcx - s.tr, tcx + s.tr + 1, 0, s.tH2, tcz - s.tr + 1, tcz + s.tr - 1, s.turret); t.cut(1, 1.5, 0, tcx + s.tr + 1 + 1.5, tcx + s.tr - 3, tcx + s.tr + 2, 0, s.tH2); }
  t.paint(() => s.light, 0, TNX, s.tH2 - 1, s.tH2, 0, TNZ);
  for (const bz of s.twin ? [tcz - 1.6, tcz + 1.6] : [tcz]) gun(t, tcx + s.tr - 1, tcx + s.tr - 1 + s.barrel, s.tH2 * 0.5, bz, s.bR);
  s.extra?.(h, t, { x0, x1, yT, zc, tcx, tcz, TH: s.tH2 });
  return { size: Math.round(s.L * 0.95), parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + s.L * 0.45 - NX / 2, yT, 0] }] };
}

/** Винт вертолёта/дрона: отдельная часть 'rotor' (вращается). */
export function rotor(r: number, col = 'gun_d', blades = 2): Vox {
  const n = Math.ceil(r * 2 + 2), v = new Vox(n, 2, n), c = n / 2;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI;
    v.seg([c - Math.cos(a) * r, 0.5, c - Math.sin(a) * r], [c + Math.cos(a) * r, 0.5, c + Math.sin(a) * r], 0.6, col);
  }
  v.cylY(c, c, 1.2, 0, 2, 'steel');
  return v;
}

/** Человечек-фигурка (солдатик, пехота). Смотрит вдоль x. */
export function figure(v: Vox, cx: number, cz: number, body: string, dark: string, skin: string, gunCol: string, s = 1, base?: string): void {
  const y0 = base ? 1 : 0;
  if (base) v.ell(cx, 0.5, cz, 3.2 * s, 0.6, 2.6 * s, base);
  v.box(cx - 1 * s, cx + 1 * s, y0, y0 + 4 * s, cz - 1.8 * s, cz - 0.4 * s, dark);    // ноги
  v.box(cx - 1 * s, cx + 1 * s, y0, y0 + 4 * s, cz + 0.4 * s, cz + 1.8 * s, dark);
  v.box(cx - 1.4 * s, cx + 1.4 * s, y0 + 4 * s, y0 + 8 * s, cz - 2 * s, cz + 2 * s, body);   // туловище
  v.box(cx - 1.2 * s, cx + 1.2 * s, y0 + 8 * s, y0 + 10 * s, cz - 1.2 * s, cz + 1.2 * s, skin); // голова
  v.box(cx - 1.6 * s, cx + 1.6 * s, y0 + 10 * s, y0 + 11 * s, cz - 1.6 * s, cz + 1.6 * s, dark); // каска
  v.box(cx + 1, cx + 5 * s, y0 + 6 * s, y0 + 7 * s, cz + 0.6 * s, cz + 1.6 * s, gunCol);     // винтовка
}

/** Модель из одной части. */
export const one = (vox: Vox, size: number, foot?: [number, number]): ModelDef => ({ size, parts: [{ name: 'body', vox }], foot });

/** Брус со скошенными вертикальными рёбрами (c) и верхними кромками (ct). */
export function cbox(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: string, c = 2, ct = c): void {
  v.fill((x, y, z) => {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z), dy = y1 - y;
    if (dx + dz < c + 0.6) return undefined;
    if (ct > 0 && (dx + dy < ct + 0.6 || dz + dy < ct + 0.6)) return undefined;
    return m;
  }, x0, x1, y0, y1, z0, z1);
}

/** Швы панелей: перекрасить уже стоящие воксели по сетке (шаги sx/sy/sz, 0 — не резать по оси). */
export function seams(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, sx: number, sy: number, sz: number, col: string): void {
  v.paint((x, y, z) => {
    const fx = sx && Math.floor(x - x0) % sx === 0, fy = sy && Math.floor(y - y0) % sy === 0, fz = sz && Math.floor(z - z0) % sz === 0;
    return fx || fy || fz ? col : undefined;
  }, x0, x1, y0, y1, z0, z1);
}

/** Заклёпки по линии вдоль x на борту z (через шаг). */
export function rivets(v: Vox, x0: number, x1: number, y: number, z: number, step: number, col: string): void {
  for (let x = x0; x < x1; x += step) v.set(x, y, z, col);
}

/** Ряд труб/выхлопов вдоль y. */
export function pipe(v: Vox, x: number, z: number, r: number, y0: number, y1: number, col: string, rim = 'gun_d'): void {
  v.cylY(x, z, r, y0, y1, col);
  v.cylY(x, z, r + 0.6, y1 - 1, y1, rim);
  v.cylY(x, z, Math.max(0.5, r - 0.8), y1 - 1, y1 + 0.01, 'black');
}

/** Нога-сегмент робота/паука: бедро и голень. */
export function leg(v: Vox, hip: [number, number, number], knee: [number, number, number], foot: [number, number, number], r: number, col: string, joint = 'gun_d'): void {
  v.seg(hip, knee, r, col); v.seg(knee, foot, r * 0.8, col);
  v.sphere(knee[0], knee[1], knee[2], r * 1.25, joint);
  v.ell(foot[0], foot[1] + 0.5, foot[2], r * 1.6, r * 0.7, r * 1.4, joint);
}
