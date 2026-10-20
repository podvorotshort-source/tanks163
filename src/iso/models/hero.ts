// Танки игроков, новые облики. Ось x — нос, y — вверх, z — борт; 1 воксель ≈ 1 пиксель кадра в бою.
// Принципы (пиксель-арт): широкие гусеницы с читаемыми траками и катками, крупная пушка с дульным тормозом,
// выразительный силуэт (наклонный лоб, гранёная башня, корма с решётками и трубами), деталь подчёркивает форму.
// Облик II — форма поглощённого Заводного генерала: серые бронеплиты со светящимися швами.
// У босса швы красные (магма), у игроков — их цвет (1P жёлтый, 2P зелёный).

import { Vox, type ModelDef, type PartDef } from '../vox';
import type { TankClass } from './tanks';

interface Paint { main: string; dark: string; light: string; trim: string; metal: string; glow: string }
const P1: Paint = { main: 'yel', dark: 'yel_d', light: 'yel_l', trim: 'navy', metal: 'steel', glow: 'glow_y' };
const P2: Paint = { main: 'green_l', dark: 'green', light: 'grass_ll', trim: 'navy', metal: 'steel', glow: 'glow_g' };

const k = (cls: TankClass) => (cls === 'scout' ? 0.9 : cls === 'heavy' ? 1.1 : 1);

/** Гусеница: лента с выступающими траками сверху и снизу, внутри — тёмная полость с катками, ведущая звезда спереди.
 *  outer — z внешней стороны (там катки). */
export function track(v: Vox, x0: number, x1: number, h: number, z0: number, z1: number, outer: number, n: number, wheel: string, rim: string): void {
  const r = h / 2;
  const inProfile = (x: number, y: number) => {
    const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
    return (x - cx) ** 2 + (y - r) ** 2 <= r * r;
  };
  for (let z = z0; z < z1; z++) for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) {
    const X = x + 0.5, Y = y + 0.5;
    if (!inProfile(X, Y)) continue;
    // лента — внешний обвод толщиной 2; внутри — тёмная полость
    const inner = inProfile(X + (X < x0 + r ? 2 : X > x1 - r ? -2 : 0), Y) && Y > 2 && Y < h - 2 && X > x0 + 2 && X < x1 - 2;
    if (inner) { v.set(x, y, z, 'gun_d'); continue; }
    v.set(x, y, z, x % 3 === 0 ? 'rubber_l' : 'rubber');
  }
  // траки-грунтозацепы: выступают над лентой сверху и снизу через 3 вокселя
  for (let x = Math.ceil(x0 + r - 1); x < x1 - r + 1; x += 3) {
    v.box(x, x + 1.5, h, h + 1, z0, z1, 'gun');
  }
  // катки на внешней стороне
  const span = x1 - x0 - h * 0.9;
  for (let i = 0; i < n; i++) {
    const cx = x0 + h * 0.45 + (span * (i + 0.5)) / n, cy = h / 2 - 0.3, R = h / 2 - 1.6;
    v.cylZ(cx, cy, R, outer, outer + 1, wheel);
    v.cylZ(cx, cy, R * 0.62, outer - 0.01, outer + 1.01, rim);
    v.cylZ(cx, cy, R * 0.25, outer - 0.02, outer + 1.02, 'gun_d');
  }
  // ведущая звезда спереди (зубья) и ленивец сзади
  const sx = x1 - r, sy = r;
  for (let a = 0; a < 12; a++) {
    const an = (a / 12) * Math.PI * 2;
    if (a % 2) v.set(Math.floor(sx + Math.cos(an) * (r - 1.6)), Math.floor(sy + Math.sin(an) * (r - 1.6)), outer, 'gun');
  }
  v.cylZ(sx, sy, r * 0.42, outer - 0.01, outer + 1.01, rim);
  v.cylZ(x0 + r, r, r * 0.42, outer - 0.01, outer + 1.01, rim);
}

/** Ствол вдоль x: казённая муфта, эжектор посередине, дульный тормоз с прорезями. */
export function barrel(t: Vox, x0: number, x1: number, y: number, z: number, r: number, col: string, dark: string, bore = 'black'): void {
  t.cylX(y, z, r + 0.7, x0, x0 + 5, dark);
  t.cylX(y, z, r, x0, x1 - 4, col);
  const mid = x0 + (x1 - x0) * 0.5;
  t.cylX(y, z, r + 0.6, mid - 1.5, mid + 1.5, dark);
  t.box(x1 - 4.5, x1, y - r - 0.8, y + r + 0.8, z - r - 1.4, z + r + 1.4, dark);       // дульный тормоз
  for (const xx of [x1 - 3.5, x1 - 1.5]) { t.box(xx, xx + 1, y - r + 0.2, y + r - 0.2, z - r - 1.5, z - r - 0.4, 0); t.box(xx, xx + 1, y - r + 0.2, y + r - 0.2, z + r + 0.4, z + r + 1.5, 0); }
  t.cylX(y, z, Math.max(0.6, r * 0.55), x1 - 0.6, x1 + 0.01, bore);
}

/** Короткая толстая гаубица (фугас): казённая муфта, эжектор, раструб дула. */
export function howitzer(t: Vox, x0: number, x1: number, y: number, z: number, r: number, col: string, dark: string, bore = 'black'): void {
  t.cylX(y, z, r + 0.8, x0, x0 + 3, dark);
  t.cylX(y, z, r, x0, x1 - 3, col);
  const mid = x0 + (x1 - x0) * 0.45;
  t.cylX(y, z, r + 0.9, mid - 1.5, mid + 1.5, dark);
  t.cylX(y, z, r + 1.3, x1 - 3, x1, dark);                                            // раструб
  t.cylX(y, z, r + 0.6, x1 - 3, x1 - 2, col);
  t.cylX(y, z, r * 0.65, x1 - 1.6, x1 + 0.01, bore);
}

/** Огнемёт: ствол-брандспойт с кольцами, топливная трубка сверху, сопло и запальник (светится). */
export function flamer(t: Vox, x0: number, x1: number, y: number, z: number, r: number, col: string, dark: string, pilot = 'fire'): void {
  t.cylX(y, z, r, x0, x1 - 3, col);
  for (let x = x0 + 3; x < x1 - 4; x += 4) t.cylX(y, z, r + 0.6, x, x + 1, dark);
  t.cylX(y + r + 0.9, z, 0.8, x0, x1 - 4, 'gun_d');                                    // топливная трубка
  t.box(x1 - 6, x1 - 5, y, y + r + 1.6, z - 0.5, z + 0.5, 'gun_d');
  t.cylX(y, z, r + 0.4, x1 - 3, x1 - 1, dark, r + 1.2);                               // сопло (раструб)
  t.cylX(y, z, r + 1.2, x1 - 1, x1, 'copper');                                         // закопчённое медное сопло
  t.cylX(y, z, r * 0.6, x1 - 1, x1 + 0.01, 'black');
  t.set(x1 - 1, y - r - 1, z, pilot); t.set(x1, y - r - 1, z, pilot);                  // запальник
}

/** Покрасить верхнюю поверхность (самый верхний воксель столбца) в области. */
function topPaint(v: Vox, x0: number, x1: number, z0: number, z1: number, fn: (x: number, z: number, y: number) => string | undefined): void {
  for (let z = Math.floor(z0); z < z1; z++) for (let x = Math.floor(x0); x < x1; x++) {
    for (let y = v.ny - 1; y >= 0; y--) {
      if (!v.get(x, y, z)) continue;
      const c = fn(x + 0.5, z + 0.5, y);
      if (c) v.set(x, y, z, c);
      break;
    }
  }
}

/** Гранёная башня: тело с обрезанными углами, лобовым и бортовыми скосами. */
function turretBody(t: Vox, tcx: number, tcz: number, bl: number, blb: number, br: number, bh: number, col: string, chamfer = 3.5, front = 0.9): void {
  t.fill((x, y, z) => {
    const dx = x - tcx, dz = Math.abs(z - tcz);
    if (dx > bl || dx < -blb || dz > br) return undefined;
    if ((dx > 0 ? dx / bl : -dx / blb) * bl + dz > bl + br - chamfer) return undefined;   // срезанные углы
    if (dx > bl - 5 && y > bh - (dx - (bl - 5)) * front) return undefined;                  // лобовой скос
    if (dz > br - 2 && y > bh - 1) return undefined;                                        // бортовые скосы
    return col;
  }, 0, t.nx, 0, bh, 0, t.nz);
}

/** Командирская башенка с перископами. */
function cupola(t: Vox, x: number, z: number, y: number, r: number, S: Paint): void {
  t.cylY(x, z, r, y, y + 2, S.dark);
  t.cylY(x, z, r - 1, y + 2, y + 2.8, S.metal);
  for (const [dx, dz] of [[r - 0.4, 0], [0, r - 0.4], [-(r - 0.4), 0], [0, -(r - 0.4)]]) t.set(x + dx, y + 1, z + dz, 'glass_d');
}

/** Антенна, закреплённая на башне, с огоньком цвета игрока. */
function antenna(t: Vox, x: number, y: number, z: number, h: number, S: Paint): void {
  t.cylY(x, z, 1, y, y + 1, 'gun');
  t.seg([x, y, z], [x - 2, y + h, z], 0.45, 'gun_d');
  t.set(x - 2, y + h, z, S.glow);
}

const hullParts = (v: Vox, t: Vox, NX: number, NZ: number, tcx: number, tcz: number, tx: number, yt: number, size: number): ModelDef => ({
  size,
  parts: [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [tx - NX / 2, yt, 0] },
  ],
});

/** Общий размер облика I: разведчик меньше, тяжёлый крупнее (все рисуются в одном масштабе). */
const SIZE_I = 48;

// ======================================================================== облик I
/** Облик I: лёгкий танк — жёлтый (1P) / зелёный (2P) с тёмно-синей отделкой; корпус и орудие по классу. */
export function heroI(cls: TankClass, pl: 0 | 1): ModelDef {
  const S = pl ? P2 : P1;
  return cls === 'scout' ? scoutI(S) : cls === 'heavy' ? heavyI(S) : assaultI(S);
}

/** Штурмовик: средний универсальный танк, коробчатая башня, короткая толстая фугасная гаубица, дымовые мортирки. */
function assaultI(S: Paint): ModelDef {
  const L = 48, TW = 11, TH = 11, W = 38;
  const NX = L + 6, NZ = W + 2, zc = NZ / 2, x0 = 3, x1 = 3 + L;
  const v = new Vox(NX, 26, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 5, 'gun', S.metal);
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 5, 'gun', S.metal);
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  const hz0 = TW - 1, hz1 = NZ - TW + 1, yb = TH - 2, yt = TH + 8;
  v.box(x0 + 1, x1 - 1, yb, yt, hz0, hz1, S.main);
  v.cut(0.75, 1, 0, 0.75 * (x1 - 10) + yt, x1 - 11, x1, yb, yt);
  v.cut(-1.3, 1, 0, -1.3 * (x0 + 5) + yt, x0, x0 + 6, yb, yt);
  // надгусеничные полки с ящиками ЗИП
  for (const [z0, z1] of [[1, hz0], [hz1, NZ - 1]]) {
    v.box(x0 + 4, x1 - 6, TH + 1, TH + 2, z0, z1, S.dark);
    v.box(x0 + 8, x0 + 16, TH + 2, TH + 5, z0 + 1, z1 - 1, S.trim);
    v.box(x0 + 22, x0 + 28, TH + 2, TH + 4, z0 + 1, z1 - 1, 'wood');
  }
  v.paint(() => S.trim, x0, x1, yb, yb + 1.5, hz0, hz1);
  v.paint((x, y) => (y > yt - 1 ? S.light : undefined), x0 + 6, x1 - 10, yt - 1, yt, hz0, hz0 + 1);
  for (const zz of [hz0 + 2, hz1 - 4]) { v.box(x1 - 4, x1 - 2, yb + 3, yb + 5, zz, zz + 2, 'lamp'); v.box(x1 - 1, x1 + 1, yb, yb + 2, zz, zz + 2, 'gun_d'); }
  v.box(x1 - 9, x1 - 6, yt - 1, yt + 0.2, zc - 3, zc + 3, S.dark);
  for (let i = 0; i < 5; i++) v.box(x0 + 6 + i * 2, x0 + 7 + i * 2, yt - 1, yt, zc - 7, zc + 7, 'gun_d');
  for (const zz of [hz0 + 3, hz1 - 3]) { v.cylX(yt - 3, zz, 1.4, x0 - 2, x0 + 4, 'gun'); v.cylX(yt - 3, zz, 0.8, x0 - 2.2, x0 - 1, 'black'); }

  // башня: широкая коробчатая, мощная маска, короткая гаубица
  const TNX = 56, TNZ = 32, tcx = 20, tcz = TNZ / 2;
  const t = new Vox(TNX, 26, TNZ);
  const bl = 12, br = 11.5, bh = 10;
  turretBody(t, tcx, tcz, bl, bl + 1, br, bh, S.main, 2.5, 0.7);
  t.paint(() => S.trim, 0, TNX, 0, 1.2, 0, TNZ);
  t.box(tcx + bl - 3, tcx + bl + 3, 1, bh - 1, tcz - 5, tcz + 5, S.dark);                      // маска
  howitzer(t, tcx + bl + 2, tcx + bl + 2 + 17, 5, tcz, 3, 'gun_l', 'gun');
  // дымовые мортирки по бокам башни (по три трубки)
  for (const zs of [-1, 1]) for (let i = 0; i < 3; i++) {
    const zz = tcz + zs * (br - 0.5), xx = tcx + 3 - i * 2.2;
    t.cylY(xx, zz + zs * 0.8, 0.9, bh - 4, bh, 'gun_d');
  }
  cupola(t, tcx - 4, tcz + 4, bh, 3.4, S);
  t.box(tcx - 8, tcx - 3, bh, bh + 0.8, tcz - 7, tcz - 2, S.dark);
  t.box(tcx - bl - 7, tcx - bl, 1, 7, tcz - 8, tcz + 8, 'gun_d');                               // корзина
  for (const zz of [tcz - 7, tcz - 3, tcz + 1, tcz + 5]) t.box(tcx - bl - 6, tcx - bl - 1, 2, 6.5, zz, zz + 3, 'army');   // снарядные ящики
  antenna(t, tcx - bl + 1, bh, tcz - br + 2, 12, S);
  t.box(tcx + 2, tcx + 5, bh - 0.4, bh, tcz - 2, tcz - 1, S.trim); t.box(tcx + 2, tcx + 5, bh - 0.4, bh, tcz + 1, tcz + 2, S.trim);
  return hullParts(v, t, NX, NZ, tcx, tcz, x0 + L * 0.44, yt, SIZE_I);
}

/** Разведчик: низкий узкий клин, четыре больших катка, маленькая плоская башня, длинная тонкая бронебойная пушка. */
function scoutI(S: Paint): ModelDef {
  const L = 46, TW = 8, TH = 10, W = 30;
  const NX = L + 6, NZ = W + 2, zc = NZ / 2, x0 = 3, x1 = 3 + L;
  const v = new Vox(NX, 22, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 4, 'gun', S.metal);
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 4, 'gun', S.metal);
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  const hz0 = TW - 1, hz1 = NZ - TW + 1, yb = TH - 2, yt = TH + 5;
  // корпус: низкий, длинный пологий лоб, крылья над гусеницами
  v.box(x0 + 1, x1 - 1, yb, yt, hz0, hz1, S.main);
  v.cut(0.4, 1, 0, 0.4 * (x1 - 16) + yt, x1 - 17, x1, yb, yt);
  v.cut(-1.4, 1, 0, -1.4 * (x0 + 4) + yt, x0, x0 + 5, yb, yt);
  // нос клином в плане
  v.fill((x, y, z, c) => (c && x - (x1 - 8) > Math.min(z - hz0, hz1 - z) * 1.1 ? 0 : undefined), x1 - 9, x1, TH + 1, yt, hz0, hz1);
  for (const [z0, z1] of [[1, hz0], [hz1, NZ - 1]]) {
    v.box(x0 + 2, x1 - 3, TH + 1, TH + 2, z0, z1, S.main);                                  // крылья
    v.box(x1 - 6, x1 - 2, TH, TH + 1, z0, z1, S.dark);
  }
  v.paint(() => S.trim, x0, x1, yb, yb + 1.2, hz0, hz1);
  // «гоночная» полоса цвета отделки по оси, от носа до кормы
  topPaint(v, x0, x1, zc - 2, zc + 2, (x, z) => (Math.abs(z - zc) < 1 ? S.light : S.trim));
  for (const zz of [hz0 + 1, hz1 - 3]) v.box(x1 - 5, x1 - 3, TH + 1, TH + 3, zz, zz + 2, 'lamp');
  // корма: решётка и один большой глушитель
  for (let i = 0; i < 4; i++) v.box(x0 + 4 + i * 2, x0 + 5 + i * 2, yt - 1, yt, zc - 6, zc - 3, 'gun_d');
  v.cylX(yt - 2, hz1 - 3, 1.6, x0 - 2, x0 + 4, 'gun'); v.cylX(yt - 2, hz1 - 3, 0.9, x0 - 2.2, x0 - 1, 'black');

  // башня: маленькая, плоская, сдвинута назад; длинная тонкая пушка
  const TNX = 64, TNZ = 24, tcx = 14, tcz = TNZ / 2;
  const t = new Vox(TNX, 24, TNZ);
  const bl = 9, br = 7.5, bh = 6;
  turretBody(t, tcx, tcz, bl, bl + 2, br, bh, S.main, 4, 0.7);
  t.paint(() => S.trim, 0, TNX, 0, 1, 0, TNZ);
  t.box(tcx + bl - 2, tcx + bl + 2, 1, bh - 1, tcz - 2.5, tcz + 2.5, S.dark);
  barrel(t, tcx + bl + 1, tcx + bl + 1 + 38, 3.5, tcz, 1.3, 'gun_l', 'gun');
  // оптика: коробка прицела-дальномера справа, перископ
  t.box(tcx - 1, tcx + 4, bh, bh + 3, tcz + 2, tcz + 6, S.dark);
  t.box(tcx + 4, tcx + 5, bh + 1, bh + 2.5, tcz + 2.5, tcz + 5.5, 'glass');
  t.box(tcx - 5, tcx - 2, bh, bh + 0.8, tcz - 5, tcz - 1, S.dark);
  // две длинные антенны
  antenna(t, tcx - bl, bh - 1, tcz - br + 2, 15, S);
  antenna(t, tcx - bl, bh - 1, tcz + br - 2, 10, S);
  return hullParts(v, t, NX, NZ, tcx, tcz, x0 + L * 0.38, yt, SIZE_I);
}

/** Тяжёлый: широкая высокая крепость, бронеэкраны с заклёпками, шесть катков, приземистая башня с огнемётом,
 *  баки с горючей смесью на корме. */
function heavyI(S: Paint): ModelDef {
  const L = 54, TW = 13, TH = 12, W = 46;
  const NX = L + 8, NZ = W + 2, zc = NZ / 2, x0 = 4, x1 = 4 + L;
  const v = new Vox(NX, 32, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 6, 'gun', S.metal);
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 6, 'gun', S.metal);
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  const hz0 = TW - 2, hz1 = NZ - TW + 2, yb = TH - 2, yt = TH + 9;
  // высокий корпус: крутой толстый лоб, корма уступом
  v.box(x0 + 1, x1 - 1, yb, yt, hz0, hz1, S.main);
  v.cut(1.1, 1, 0, 1.1 * (x1 - 9) + yt, x1 - 10, x1, yb, yt);
  v.cut(-1.6, 1, 0, -1.6 * (x0 + 4) + yt, x0, x0 + 5, yb, yt);
  // лобовая бронеплита-накладка и заклёпки на ней
  const gl = 1.1 * (x1 - 9) + yt;
  v.paint((x, y) => (1.1 * x + y > gl - 1.6 ? S.dark : undefined), x1 - 11, x1, yb + 2, yt, hz0 + 2, hz1 - 2);
  for (let z = hz0 + 4; z < hz1 - 3; z += 4) for (const y of [yb + 4, yt - 3]) v.set(Math.floor((gl - 0.5 - y) / 1.1), y, z, 'steel_l');
  // бортовые бронеэкраны над гусеницами: плиты с заклёпками, низ катков виден
  for (const [z0, z1] of [[0, 1], [NZ - 1, NZ]]) {
    v.box(x0 + 3, x1 - 3, TH * 0.45, TH + 2, z0, z1, S.main);
    v.box(x0 + 3, x1 - 3, TH * 0.45, TH * 0.45 + 1, z0, z1, S.trim);
    v.box(x0 + 3, x1 - 3, TH + 1, TH + 2, z0, z1, S.light);
    for (let x = x0 + 4; x < x1 - 3; x += 12) v.box(x, x + 1, TH * 0.45 + 1, TH + 1, z0, z1, S.dark);   // стыки плит
    for (let x = x0 + 6; x < x1 - 4; x += 6) v.set(x, TH - 1, z0, 'steel_l');
  }
  for (const [z0, z1] of [[1, hz0], [hz1, NZ - 1]]) v.box(x0 + 2, x1 - 4, TH + 1, TH + 2, z0, z1, S.dark);
  v.paint(() => S.trim, x0, x1, yb, yb + 2, hz0, hz1);
  for (let x = x0 + 8; x < x1 - 10; x += 4) for (const zz of [hz0, hz1 - 1]) v.set(x, yt - 2, zz, S.dark);   // заклёпки по борту
  for (const zz of [hz0 + 2, hz1 - 4]) v.box(x1 - 2, x1, yb + 2, yb + 4, zz, zz + 2, 'lamp');
  // корма: два бака горючей смеси поперёк, с полосами и крышками
  for (const xx of [x0 + 5, x0 + 12]) {
    v.cylZ(xx, yt + 3, 3.2, hz0 + 2, hz1 - 2, 'steel');
    v.cylZ(xx, yt + 3, 3.3, hz0 + 5, hz0 + 7, S.trim); v.cylZ(xx, yt + 3, 3.3, hz1 - 7, hz1 - 5, S.trim);
    v.cylZ(xx, yt + 3, 3.25, zc - 1, zc + 1, 'red');
    v.cylZ(xx, yt + 3, 1.4, hz0 + 1, hz0 + 2, 'orange'); v.cylZ(xx, yt + 3, 1.4, hz1 - 2, hz1 - 1, 'orange');
    v.box(xx - 1, xx + 1, yt, yt + 1, hz0 + 3, hz1 - 3, 'gun_d');                          // ложемент
  }
  for (const zz of [hz0 + 3, hz1 - 3]) { v.cylY(x0 + 1, zz, 1.6, yt - 4, yt + 2, 'gun'); v.cylY(x0 + 1, zz, 0.9, yt + 1.2, yt + 2.1, 'black'); }

  // башня: приземистая широкая, литая, с огнемётом и баком на корме башни
  const TNX = 54, TNZ = 34, tcx = 20, tcz = TNZ / 2;
  const t = new Vox(TNX, 26, TNZ);
  const bl = 11, br = 12.5, bh = 8;
  turretBody(t, tcx, tcz, bl, bl + 1, br, bh, S.main, 6, 1.1);
  t.paint(() => S.trim, 0, TNX, 0, 1.4, 0, TNZ);
  t.paint((x, y) => (y > bh - 1 ? S.light : undefined), 0, TNX, bh - 1, bh, 0, TNZ);
  t.box(tcx + bl - 3, tcx + bl + 2, 1, bh - 1, tcz - 4, tcz + 4, S.dark);
  flamer(t, tcx + bl + 1, tcx + bl + 1 + 15, 4, tcz, 2.2, 'steel', 'gun');
  // шланг от бака к огнемёту
  t.seg([tcx - bl - 2, 5, tcz - 6], [tcx + bl - 2, 4, tcz - 6], 0.7, 'rubber');
  t.seg([tcx + bl - 2, 4, tcz - 6], [tcx + bl + 3, 4, tcz - 3], 0.7, 'rubber');
  // кормовой бак башни
  t.cylZ(tcx - bl - 3, 5, 3.6, tcz - 9, tcz + 9, 'steel');
  t.cylZ(tcx - bl - 3, 5, 3.7, tcz - 1, tcz + 1, 'red');
  t.cylZ(tcx - bl - 3, 5, 1.5, tcz + 9, tcz + 10, 'orange');
  cupola(t, tcx - 3, tcz + 4, bh, 3.6, S);
  // смотровые блоки по лбу
  for (const zz of [tcz - 6, tcz + 5]) t.box(tcx + bl - 5, tcx + bl - 3, bh - 3, bh - 1, zz, zz + 1, 'glass_d');
  antenna(t, tcx - bl + 2, bh, tcz - br + 3, 11, S);
  return { ...hullParts(v, t, NX, NZ, tcx, tcz, x0 + L * 0.5, yt, SIZE_I), muzzles: [[bl + 16, 4.5, 0.5]] };
}

// ======================================================================== облик II (форма генерала)
/** Облик II и босс ступени I: тяжёлая машина из серых бронеплит, швы светятся (glow), двойная пушка,
 *  на корме — заводной ключ (у босса — слабое место). */
export function heroII(cls: TankClass, glow: string, boss = false): ModelDef {
  const c = k(cls);
  const L = Math.round(56 * c), TW = Math.round(13 * c), TH = 13, W = Math.round(46 * c);
  const NX = L + 10, NZ = W + 4, zc = NZ / 2, x0 = 6, x1 = 6 + L;
  const v = new Vox(NX, 32, NZ);
  track(v, x0, x1, TH, 2, 2 + TW, 2, 6, 'gun', 'steel_d');
  track(v, x0, x1, TH, NZ - 2 - TW, NZ - 2, NZ - 3, 6, 'gun', 'steel_d');
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 2 + TW, NZ - 2 - TW, 'gun_d');
  // бортовые экраны: плиты с прорезями-швами, светящимися изнутри
  for (const [zo, zi] of [[1, 2], [NZ - 2, NZ - 1]]) {
    v.box(x0 + 3, x1 - 5, TH * 0.45, TH + 1, zo, zi, 'steel_d');
    for (let x = x0 + 12; x < x1 - 6; x += 10) v.box(x, x + 1, TH * 0.45 + 1, TH, zo, zi, glow);
    v.box(x0 + 3, x1 - 5, TH * 0.45, TH * 0.45 + 1, zo, zi, 'gun_d');
  }
  // корпус: широкий, клиновидный нос, бронеплиты со швами
  const hz0 = 2, hz1 = NZ - 2, yb = TH - 1, yt = TH + 8;
  v.box(x0 + 1, x1 - 1, yb, yt, hz0, hz1, 'steel');
  v.cut(0.9, 1, 0, 0.9 * (x1 - 13) + yt, x1 - 14, x1, yb, yt);
  v.cut(0, 1, 1.2, yt + 1.2 * (hz1 - 4), 0, NX, yb, yt, hz1 - 6, hz1);
  v.cut(0, 1, -1.2, yt - 1.2 * (hz0 + 4), 0, NX, yb, yt, hz0, hz0 + 6);
  v.cut(-1.4, 1, 0, -1.4 * (x0 + 6) + yt, x0, x0 + 7, yb, yt);
  v.paint(() => 'steel_d', x0, x1, yb, yb + 2, 0, NZ);
  for (let x = x0 + 9; x < x1 - 12; x += 9) v.paint(() => 'gun_d', x, x + 1, yt - 1, yt, hz0 + 4, hz1 - 4);   // швы плит
  // светящийся шов-«галочка» на лбу и фары
  for (let i = 0; i < 9; i++) { v.set(x1 - 9 + i * 0.5, yt - 2 - i * 0.6, zc - 1 - i, glow); v.set(x1 - 9 + i * 0.5, yt - 2 - i * 0.6, zc + i, glow); }
  for (const zz of [hz0 + 4, hz1 - 6]) v.box(x1 - 3, x1 - 1, yb + 2, yb + 4, zz, zz + 2, glow);
  // моторный отсек: решётка над раскалённым нутром
  v.box(x0 + 5, x0 + 22, yt - 1, yt, zc - 11, zc + 11, glow);
  for (let i = 0; i < 9; i++) v.box(x0 + 5 + i * 2, x0 + 6 + i * 2, yt - 1, yt + 0.6, zc - 11, zc + 11, 'gun_d');
  // выхлопы
  for (const zz of [hz0 + 5, hz1 - 5]) { v.cylY(x0 + 3, zz, 1.6, yt - 2, yt + 4, 'gun'); v.cylY(x0 + 3, zz, 0.9, yt + 3.2, yt + 4.1, glow); }
  v.paint((x, y, z) => ((z < hz0 + 1 || z > hz1 - 1) && y >= yb + 2 && y < yb + 3 ? glow : undefined), x0 + 4, x1 - 6, yb, yt, 0, NZ);   // светящийся шов по борту
  if (boss) for (let x = x0 + 4; x < x1 - 14; x += 3) for (const zz of [hz0 + 0.5, hz1 - 1.5]) v.set(x, yt - 3, zz, 'steel_l');   // заклёпки

  // ---------------- башня: широкая гранёная, двойная пушка, светящаяся смотровая щель
  const TNX = Math.round(84 * c), TNZ = Math.round(40 * c), tcx = Math.round(24 * c), tcz = TNZ / 2;
  const t = new Vox(TNX, 30, TNZ);
  const bl = Math.round(14 * c), br = Math.round(12 * c), bh = 10;
  t.fill((x, y, z) => {
    const dx = x - tcx, dz = Math.abs(z - tcz);
    if (dx > bl || dx < -bl - 2 || dz > br) return undefined;
    if (Math.abs(dx + 1) + dz > bl + br - 4) return undefined;
    if (dx > bl - 7 && y > bh - (dx - (bl - 7)) * 0.8) return undefined;
    if (dz > br - 3 && y > bh - (dz - (br - 3)) * 0.9) return undefined;
    return 'steel';
  }, 0, TNX, 0, bh, 0, TNZ);
  t.paint(() => 'steel_d', 0, TNX, 0, 1.5, 0, TNZ);
  t.paint((x, y, z) => (Math.abs(z - tcz) > br - 4 && y > 2 && y < 4.5 ? glow : undefined));         // боковые светящиеся полосы
  t.paint((x, y) => (x < tcx - bl + 2 && y > 2 && y < 4.5 ? glow : undefined));                       // и на корме
  t.box(tcx + bl - 6, tcx + bl - 5, 5, 7, tcz - 5, tcz + 5, glow);                                    // смотровая щель
  t.box(tcx + bl - 4, tcx + bl + 3, 1, bh - 2, tcz - 7, tcz + 7, 'steel_d');                          // маска
  // спаренное орудие по классу: у босса и разведчика — длинные пушки (у разведчика тоньше и длиннее),
  // у штурмовика — короткие толстые гаубицы, у тяжёлого — огнемёты со светящимися запальниками
  const gx0 = tcx + bl + 2;
  for (const bz of [tcz - 4, tcz + 4]) {
    if (boss) barrel(t, gx0, gx0 + Math.round(32 * c), 4.5, bz, 2.1, 'gun', 'gun_d', glow);
    else if (cls === 'scout') barrel(t, gx0, gx0 + 42, 4.5, bz, 1.4, 'gun', 'gun_d', glow);
    else if (cls === 'assault') howitzer(t, gx0, gx0 + 19, 4.5, bz + Math.sign(bz - tcz) * 0.6, 2.8, 'gun', 'gun_d', glow);
    else flamer(t, gx0, gx0 + 15, 4, bz, 2, 'gun', 'gun_d', glow);
  }
  t.cylY(tcx - 5, tcz + 5, 4, bh, bh + 2.5, 'steel_d');
  t.cylY(tcx - 5, tcz + 5, 2.6, bh + 2.5, bh + 3.2, 'gun');
  t.box(tcx - 6, tcx - 4, bh + 2.5, bh + 3.3, tcz + 4, tcz + 6, glow);
  t.box(tcx - bl - 9, tcx - bl + 1, 1, 8, tcz - 9, tcz + 9, 'steel_d');                               // кормовая ниша
  for (let z = tcz - 8; z < tcz + 8; z += 3) t.box(tcx - bl - 9.5, tcx - bl - 8.5, 2, 7, z, z + 1, glow);
  t.seg([tcx - bl, bh, tcz - br + 3], [tcx - bl - 2, bh + 16, tcz - br + 2], 0.5, 'gun_d');
  t.set(tcx - bl - 2, bh + 16, tcz - br + 2, glow);
  if (boss) for (let x = tcx - bl; x < tcx + bl - 6; x += 3) t.set(x, bh - 1, tcz - br + 3, 'steel_l');

  // ---------------- заводной ключ на корме (вращается вокруг x)
  const key = new Vox(14, 22, 22), kc = 11;
  key.cylX(kc, kc, 1.6, 6, 14, 'gold_d');
  key.cylX(kc, kc, 2.4, 11, 14, 'gold');
  key.fill((x, y, z) => (x > 2 && x < 6 && (((y - kc) / 9.5) ** 2 + ((z - kc) / 4.2) ** 2 < 1 || ((y - kc) / 4.2) ** 2 + ((z - kc) / 9.5) ** 2 < 1) ? 'gold' : undefined));
  key.fill((x, y, z) => (x > 2.5 && x < 5.5 && (((y - kc) / 2.4) ** 2 + ((z - kc) / 2.4) ** 2 < 1) ? glow : undefined));

  const parts: PartDef[] = [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.46 - NX / 2, yt, 0] },
    { name: 'key', vox: key, pivot: [14, kc, kc], at: [x0 - NX / 2, TH + 6, 0], axis: 'x' },
  ];
  if (!boss) return { size: 56, parts, muzzles: cls === 'heavy' ? [[bl + 17, 4.5, -3.5], [bl + 17, 4.5, 4.5]] : undefined };   // общий масштаб: разведчик меньше, тяжёлый крупнее
  // босс — та же форма вдвое подробнее (каждый воксель → 2×2×2), чтобы на крупном плане не было «кубиков»
  return {
    size: L * 2,
    parts: parts.map(p => ({ ...p, vox: up2(p.vox), pivot: p.pivot ? (p.pivot.map(q => q * 2) as [number, number, number]) : undefined, at: p.at ? (p.at.map(q => q * 2) as [number, number, number]) : undefined })),
  };
}

function up2(v: Vox): Vox {
  const o = new Vox(v.nx * 2, v.ny * 2, v.nz * 2);
  for (let z = 0; z < v.nz; z++) for (let y = 0; y < v.ny; y++) for (let x = 0; x < v.nx; x++) {
    const m = v.d[v.idx(x, y, z)];
    if (!m) continue;
    for (let a = 0; a < 8; a++) o.d[o.idx(x * 2 + (a & 1), y * 2 + ((a >> 1) & 1), z * 2 + (a >> 2))] = m;
  }
  return o;
}
