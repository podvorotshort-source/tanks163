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

// ======================================================================== облик I
/** Облик I: лёгкий танк — жёлтый (1P) / зелёный (2P) с тёмно-синей отделкой. */
export function heroI(cls: TankClass, pl: 0 | 1): ModelDef {
  const S = pl ? P2 : P1, c = k(cls);
  const L = Math.round(48 * c), TW = Math.round(11 * c), TH = 11, W = Math.round(38 * c);
  const NX = L + 6, NZ = W + 2, zc = NZ / 2, x0 = 3, x1 = 3 + L;
  const v = new Vox(NX, 26, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 5, 'gun', S.metal);
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 5, 'gun', S.metal);
  // нижний корпус между гусеницами
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  // верхний корпус: чуть шире промежутка, наклонный лоб, скошенная корма
  const hz0 = TW - 1, hz1 = NZ - TW + 1, yb = TH - 2, yt = TH + 8;
  v.box(x0 + 1, x1 - 1, yb, yt, hz0, hz1, S.main);
  v.cut(0.75, 1, 0, 0.75 * (x1 - 10) + yt, x1 - 11, x1, yb, yt);
  v.cut(-1.3, 1, 0, -1.3 * (x0 + 5) + yt, x0, x0 + 6, yb, yt);
  // отделка: тёмная полоса по низу корпуса, светлая кромка по верху
  v.paint(() => S.trim, x0, x1, yb, yb + 1.5, 0, NZ);
  v.paint((x, y) => (y > yt - 1 ? S.light : undefined), x0 + 6, x1 - 10, yt - 1, yt, hz0, hz0 + 1);
  // фары и буксирные крюки
  for (const zz of [hz0 + 2, hz1 - 4]) { v.box(x1 - 4, x1 - 2, yb + 3, yb + 5, zz, zz + 2, 'lamp'); v.box(x1 - 1, x1 + 1, yb, yb + 2, zz, zz + 2, 'gun_d'); }
  // люк мехвода на лобовом листе
  v.box(x1 - 9, x1 - 6, yt - 1, yt + 0.2, zc - 3, zc + 3, S.dark);
  // решётка моторного отделения и выхлопные трубы на корме
  for (let i = 0; i < 5; i++) v.box(x0 + 6 + i * 2, x0 + 7 + i * 2, yt - 1, yt, zc - 7, zc + 7, 'gun_d');
  for (const zz of [hz0 + 3, hz1 - 3]) { v.cylX(yt - 3, zz, 1.4, x0 - 2, x0 + 4, 'gun'); v.cylX(yt - 3, zz, 0.8, x0 - 2.2, x0 - 1, 'black'); }
  // ящики ЗИП на корме
  v.box(x0 + 4, x0 + 10, yt, yt + 3, hz0 + 1, hz0 + 5, S.trim);
  v.box(x0 + 4, x0 + 9, yt, yt + 2, hz1 - 5, hz1 - 1, 'wood');
  v.box(x0 + 4, x0 + 9, yt + 0.8, yt + 1.2, hz1 - 5, hz1 - 1, 'wood_d');

  // ---------------- башня: гранёная, с маской, командирской башенкой, корзиной на корме и антенной
  const TS = c, TNX = Math.round(70 * TS), TNZ = Math.round(30 * TS), tcx = Math.round(20 * TS), tcz = TNZ / 2;
  const t = new Vox(TNX, 26, TNZ);
  const bl = Math.round(13 * TS), br = Math.round(10.5 * TS), bh = 10;
  t.fill((x, y, z) => {
    const dx = x - tcx, dz = Math.abs(z - tcz);
    if (dx > bl || dx < -bl - 1 || dz > br) return undefined;
    if (Math.abs(dx + 0.5) + dz > bl + br - 3.5) return undefined;                 // скошенные углы
    if (dx > bl - 5 && y > bh - (dx - (bl - 5)) * 0.9) return undefined;           // лобовой скос
    if (dz > br - 2 && y > bh - 1) return undefined;                                // бортовые скосы
    return S.main;
  }, 0, TNX, 0, bh, 0, TNZ);
  t.paint(() => S.trim, 0, TNX, 0, 1.2, 0, TNZ);
  // маска орудия и ствол
  t.box(tcx + bl - 3, tcx + bl + 2, 1, bh - 1, tcz - 4, tcz + 4, S.dark);
  barrel(t, tcx + bl + 1, tcx + bl + 1 + Math.round(28 * TS), 5, tcz, cls === 'scout' ? 1.9 : cls === 'heavy' ? 2.7 : 2.3, 'gun_l', 'gun');
  // командирская башенка с люком и перископами, люк заряжающего
  t.cylY(tcx - 4, tcz + 4, 3.4, bh, bh + 2, S.dark);
  t.cylY(tcx - 4, tcz + 4, 2.4, bh + 2, bh + 2.8, S.metal);
  for (const [dx, dz] of [[3, 0], [0, 3], [-3, 0], [0, -3]]) t.set(tcx - 4 + dx, bh + 1, tcz + 4 + dz, 'glass_d');
  t.box(tcx - 7, tcx - 2, bh, bh + 0.8, tcz - 7, tcz - 2, S.dark);
  // корзина на корме башни: ящик и свёрнутый брезент
  t.box(tcx - bl - 7, tcx - bl, 1, 6, tcz - 7, tcz + 7, 'gun_d');
  t.box(tcx - bl - 6, tcx - bl, 2, 6.5, tcz - 6, tcz - 1, 'wood');
  t.cylZ(tcx - bl - 3, 5, 2, tcz + 1, tcz + 6, 'army');
  // антенна (закреплена на башне) с огоньком цвета игрока
  t.seg([tcx - bl + 1, bh, tcz - br + 2], [tcx - bl - 1, bh + 13, tcz - br + 1], 0.45, 'gun_d');
  t.set(tcx - bl - 1, bh + 13, tcz - br + 1, S.glow);
  // эмблема — шеврон цвета отделки на крыше
  t.box(tcx + 2, tcx + 5, bh - 0.4, bh, tcz - 2, tcz - 1, S.trim); t.box(tcx + 2, tcx + 5, bh - 0.4, bh, tcz + 1, tcz + 2, S.trim);
  return {
    size: L,
    parts: [
      { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
      { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.44 - NX / 2, yt, 0] },
    ],
  };
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
  for (const bz of [tcz - 4, tcz + 4]) barrel(t, tcx + bl + 2, tcx + bl + 2 + Math.round(32 * c), 4.5, bz, 2.1, 'gun', 'gun_d', glow);
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
  if (!boss) return { size: L, parts };
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
