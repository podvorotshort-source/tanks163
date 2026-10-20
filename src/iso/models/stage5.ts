// Ступень VI «Мегаполис»: шагоходы, сверхтяжёлые танки, бронепоезда, дронолёты. Небоскрёбы.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { tankSpec, wheel, gun, rotor, one, cbox, seams, tracks, pipe, leg } from './kit';

export function carsSwarm(): ModelDef {
  const v = new Vox(22, 10, 14), zc = 7;
  for (const x of [5, 16]) for (const z of [0.5, 11.5]) v.cylZ(x, 2.4, 2.4, z, z + 2, 'rubber');
  cbox(v, 1, 21, 2, 7, 1.5, 12.5, 'navy_l', 1, 1);
  v.cut(1, 1.3, 0, 21 + 1.3 * 4, 16, 22, 2, 8);
  v.box(12, 16, 6, 7.5, zc - 4, zc + 4, 'glass_d');
  v.box(6, 10, 7, 9, zc - 1, zc + 1, 'gun_d'); gun(v, 9, 15, 8, zc, 0.5);
  v.box(20.5, 21.3, 3, 4, 2.5, 4.5, 'lamp'); v.box(20.5, 21.3, 3, 4, 9.5, 11.5, 'lamp');
  return one(v, 20);
}

export function walker(): ModelDef {
  const h = new Vox(30, 22, 26), zc = 13;
  for (const s of [-1, 1]) leg(h, [15, 18, zc + s * 6], [21, 10, zc + s * 9], [14, 0.5, zc + s * 9], 1.8, 'steel_d', 'gun_d');
  h.cylY(15, zc, 4, 16, 20, 'gun_d');
  const t = new Vox(32, 16, 24), tc = 12;
  cbox(t, 4, 24, 0, 10, tc - 7, tc + 7, 'teal', 2, 2);
  t.box(20, 25, 4, 8, tc - 4, tc + 4, 'glass_d'); t.box(24, 25.5, 5, 7, tc - 3, tc + 3, 'glow_r');
  for (const s of [-1, 1]) { t.box(8, 18, 2, 7, tc + s * 9 - 2, tc + s * 9 + 2, 'teal_d'); gun(t, 16, 30, 4.5, tc + s * 9, 1.2, 'gun', 'gun_d'); t.cylX(4.5, tc + s * 9, 0.8, 29, 30.5, 'glow_r'); }
  return { size: 30, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: t, pivot: [14, 0, tc], at: [0, 20, 0] }] };
}

export function superTank(): ModelDef {
  return tankSpec({
    L: 48, W: 38, tH: 11, hH: 8, body: 'steel_d', dark: 'gun', light: 'steel', wheel: 'gun_l', tr: 11, tH2: 8, turret: 'steel_d', barrel: 30, bR: 2.6, round: false, wheels: 6,
    extra: (h, t, c) => {
      seams(h, c.x0, c.x1, c.yT - 8, c.yT, 0, 60, 8, 0, 0, 'gun');
      for (const zz of [c.zc - 20, c.zc + 19]) h.box(c.x0 + 4, c.x1 - 10, c.yT - 4, c.yT - 3, zz, zz + 1, 'glow_r');
      t.box(c.tcx - 15, c.tcx - 9, 1, 7, c.tcz - 9, c.tcz + 9, 'gun');
      for (const s of [-1, 1]) { t.box(c.tcx - 6, c.tcx + 2, c.TH, c.TH + 3, c.tcz + s * 6 - 2, c.tcz + s * 6 + 2, 'gun_d'); gun(t, c.tcx, c.tcx + 10, c.TH + 1.5, c.tcz + s * 6, 0.6); }
    },
  });
}

export function gunship(): ModelDef {
  const v = new Vox(48, 14, 44), zc = 22;
  v.ell(24, 6, zc, 20, 4.6, 6, 'steel_d');
  v.ell(36, 8, zc, 6, 3, 3.6, 'glass_d');
  v.fill((x, y, z) => (Math.abs(z - zc) < 21 - Math.abs(x - 22) * 0.9 && y > 4 && y < 6.5 ? 'steel' : undefined), 8, 38, 4, 7, 0, 44);
  v.box(2, 8, 6, 12, zc - 0.7, zc + 0.7, 'steel_d');
  for (const s of [-1, 1]) { v.cylX(5, zc + s * 10, 2.4, 10, 28, 'gun'); v.cylX(5, zc + s * 10, 1.6, 9, 10.2, 'fire'); gun(v, 30, 40, 4, zc + s * 4, 0.7); }
  v.box(6, 10, 5, 7, zc - 18, zc + 18, 'red');
  return one(v, 46);
}

export function armoredTrain(): ModelDef {
  const v = new Vox(72, 28, 26), zc = 13;
  v.box(0, 72, 0, 1, zc - 11, zc - 9, 'steel'); v.box(0, 72, 0, 1, zc + 9, zc + 11, 'steel');
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) wheel(v, 8 + i * 11, 4, 3.6, zc + s * 9 - 1.5, zc + s * 9 + 1.5, 'gun_d', 'red');
  cbox(v, 2, 70, 4, 18, zc - 10, zc + 10, 'army_d', 1, 2);
  v.cut(1, 1.2, 0, 70 + 1.2 * 6, 60, 72, 4, 19);
  seams(v, 2, 70, 4, 18, zc - 10, zc + 10, 9, 0, 0, 'camo');
  for (const zz of [zc - 10.5, zc + 9.5]) for (let x = 6; x < 60; x += 9) v.box(x, x + 3, 10, 12, zz, zz + 1, 'black');
  for (const x of [16, 40]) { v.cylY(x, zc, 6, 18, 23, 'army', 5); gun(v, x + 4, x + 18, 20.5, zc, 1.2); }
  pipe(v, 60, zc, 2.4, 18, 24, 'gun', 'gun_d');
  v.box(66, 71, 4, 9, zc - 8, zc + 8, 'red');
  v.box(70, 71, 12, 14, zc - 4, zc + 4, 'lamp');
  return one(v, 68);
}

export function droneCarrier(): ModelDef {
  const v = new Vox(56, 16, 56), c = 28;
  v.fill((x, y, z) => (Math.abs(x - c) + Math.abs(z - c) < 24 && y > 3 && y < 10 - Math.abs(x - c) * 0.08 ? 'gun' : undefined));
  v.box(c - 6, c + 10, 9, 13, c - 5, c + 5, 'gun_d');
  v.box(c + 8, c + 10.5, 10, 12, c - 4, c + 4, 'glow_r');
  v.box(c - 18, c + 6, 9.5, 10, c - 1, c + 1, 'yel');                               // взлётная полоса
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { v.cylY(c + a * 20, c + b * 20, 5.6, 5, 9, 'gun_d'); v.cylY(c + a * 20, c + b * 20, 4.6, 8.5, 9.2, 'black'); }
  v.box(c - 3, c + 3, 2, 4, c - 3, c + 3, 'glow_r');
  const parts: PartDef[] = [{ name: 'body', vox: v }];
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) parts.push({ name: 'rotor', vox: rotor(4.6, 'steel_l', 3), at: [a * 20, 8.5, b * 20] });
  return { size: 52, parts };
}

export function kamikazeDrone(): ModelDef {
  const v = new Vox(20, 8, 18), zc = 9;
  v.fill((x, y, z) => (Math.abs(z - zc) < (x - 2) * 0.55 && x < 18 && y > 2 && y < 4 ? 'gun' : undefined));
  v.ell(10, 3.5, zc, 7, 1.8, 2, 'gun_d');
  v.ell(17, 3.5, zc, 2.4, 1.5, 1.5, 'red');
  v.box(1, 3, 2, 5, zc - 1, zc + 1, 'glow_r');
  return one(v, 18);
}

export function mechTitan(): ModelDef {
  const h = new Vox(60, 40, 50), zc = 25;
  for (const s of [-1, 1]) {
    leg(h, [30, 32, zc + s * 12], [40, 18, zc + s * 16], [28, 1, zc + s * 16], 4, 'steel_d', 'gun');
    cbox(h, 18, 44, 0, 4, zc + s * 16 - 6, zc + s * 16 + 6, 'gun_d', 2, 1);
  }
  cbox(h, 18, 42, 30, 40, zc - 12, zc + 12, 'gun', 2, 2);
  const T = new Vox(62, 40, 64), tc = 32;
  cbox(T, 10, 44, 0, 28, tc - 16, tc + 16, 'steel_d', 4, 3);
  seams(T, 10, 44, 0, 28, tc - 16, tc + 16, 9, 9, 0, 'gun');
  T.box(38, 46, 14, 24, tc - 7, tc + 7, 'gun_d');
  T.box(45, 46.5, 17, 21, tc - 6, tc + 6, 'glow_r');
  T.box(18, 32, 28, 32, tc - 6, tc + 6, 'gun');
  for (const s of [-1, 1]) {
    cbox(T, 14, 40, 10, 30, tc + s * 23 - 7, tc + s * 23 + 7, 'steel', 3, 3);
    gun(T, 34, 60, 16, tc + s * 23, 4, 'gun', 'gun_d');
    T.cylX(16, tc + s * 23, 2.2, 58, 60.5, 'glow_r');
    for (let i = 0; i < 3; i++) T.cylX(16, tc + s * 23, 4.8, 38 + i * 6, 39 + i * 6, 'glow_r');
  }
  for (const zz of [tc - 8, tc + 8]) pipe(T, 14, zz, 2.6, 26, 34, 'gun', 'gun_d');
  return { size: 60, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: T, pivot: [28, 0, tc], at: [0, 38, 0] }] };
}

// ---------------------------------------------------------------- босс: Летающая крепость
// Гигантский бомбардировщик-крепость: фюзеляж с кабиной, крылья с турелями, бомбовый отсек.
// На корме — четыре мотора с пропеллерами (слабое место, раскалены).
export function bossSky(): ModelDef {
  const NX = 128, NZ = 140, c = NZ / 2;
  const v = new Vox(NX, 40, NZ);
  // фюзеляж
  v.fill((x, y, z) => {
    const t = x / NX, r = 13 * Math.min(1, Math.sin(Math.min(1, t * 1.15) * Math.PI) * 1.4 + 0.25);
    return (y - 18) ** 2 / 1.1 + (z - c) ** 2 < r * r ? 'steel_d' : undefined;
  }, 0, NX, 0, 40, 0, NZ);
  v.paint((x, y) => (y > 26 ? 'steel' : y < 10 ? 'gun' : undefined));
  seams(v, 0, NX, 0, 40, 0, NZ, 12, 0, 0, 'gun');
  // кабина-купол и нос
  v.ell(104, 26, c, 12, 6, 8, 'glass'); v.ell(106, 27, c, 7, 4, 5, 'glass_d');
  v.ell(120, 18, c, 6, 6, 6, 'gun_d'); gun(v, 118, 128, 18, c - 3, 1.2); gun(v, 118, 128, 18, c + 3, 1.2);
  // крылья
  v.fill((x, y, z) => {
    const dz = Math.abs(z - c); if (dz < 10 || dz > 68) return undefined;
    const lead = 86 - dz * 0.45, trail = 52 - dz * 0.1;
    return x < lead && x > trail && y > 15 && y < 21 - dz * 0.04 ? (y > 19 - dz * 0.04 ? 'steel_l' : 'steel') : undefined;
  }, 0, NX, 14, 22, 0, NZ);
  v.paint((x, y, z) => (Math.abs(z - c) > 58 ? 'red' : undefined), 0, NX, 14, 22, 0, NZ);
  for (const s of [-1, 1]) for (const k of [0, 1]) {
    const zz = c + s * (24 + k * 22), x0 = 56 - k * 4;
    v.cylX(17, zz, 5.6, x0 - 6, x0 + 30, 'gun');
    v.cylX(17, zz, 6.2, x0 + 24, x0 + 30, 'steel_l');
    v.cylX(17, zz, 4, x0 - 8, x0 - 5, 'fire');                                       // раскалённые сопла сзади
    v.cylY(x0 + 12, zz, 3.6, 22, 26, 'gun_d'); gun(v, x0 + 12, x0 + 22, 25, zz, 0.8);  // турель на крыле
  }
  // хвост
  v.fill((x, y, z) => (Math.abs(z - c) < 1.2 && y > 20 && y < 20 + (22 - x) * 0.9 + 14 ? 'steel_d' : undefined), 0, 24, 20, 40, c - 2, c + 2);
  v.fill((x, y, z) => (Math.abs(z - c) < 24 - x * 0.4 && x < 22 && y > 22 && y < 24 ? 'steel' : undefined), 0, 22, 22, 24, 0, NZ);
  v.box(0, 3, 24, 38, c - 1.5, c + 1.5, 'red');
  // моторы с пропеллерами на корме
  const motors: [number, number][] = [[c - 12, 14], [c + 12, 14], [c - 6, 26], [c + 6, 26]];
  for (const [zz, y] of motors) { v.cylX(y, zz, 4.4, 4, 18, 'gun_d'); v.cylX(y, zz, 3, 2, 4.5, 'fire'); v.cylX(y, zz, 4.8, 15, 17, 'lamp_o'); }
  // бомбовый отсек
  v.box(50, 82, 6, 8, c - 6, c + 6, 'black');
  for (let x = 52; x < 80; x += 6) v.box(x, x + 3, 5.5, 6.5, c - 5, c + 5, 'yel');
  // эмблема
  for (const s of [-1, 1]) v.box(70, 76, 19.5, 20.5, c + s * 40 - 3, c + s * 40 + 3, 'white');
  const parts: PartDef[] = [{ name: 'body', vox: v, pivot: [64, 0, c] }];
  for (const [zz, y] of motors) parts.push({ name: 'prop', vox: propX(9), pivot: [0.5, 9, 9], at: [2 - 64, y, zz - c], axis: 'x' });
  return { size: 124, parts };
}

/** Пропеллер в плоскости YZ (ось вращения — x). */
function propX(r: number): Vox {
  const n = r * 2, v = new Vox(2, n, n);
  v.seg([0.5, r, 0.5], [0.5, r, n - 0.5], 0.7, 'gun_d');
  v.seg([0.5, 0.5, r], [0.5, n - 0.5, r], 0.7, 'gun_d');
  v.cylX(r, r, 1.6, 0, 2, 'red');
  return v;
}

// ---------------------------------------------------------------- препятствия
// ---------------------------------------------------------------- препятствия района и города
const FACADE = ['cream', 'white', 'concrete_l', 'sand', 'pink'];
/** Среднеэтажка: окна рядами (часть горит), карниз, на крыше — бак с водой, вентшахты, антенна. */
export function midrise(v: number): ModelDef {
  const n = 64, h = 70 + (v % 3) * 16, b = new Vox(n, h + 26, n), col = FACADE[v % 5];
  b.box(2, n - 2, 0, h, 2, n - 2, col);
  b.box(1, n - 1, 0, 5, 1, n - 1, 'concrete');
  for (let y = 10; y < h - 6; y += 10) for (let i = 7; i < n - 7; i += 8) {
    const lit = (i * 3 + y + v * 7) % 11 < 2;
    b.box(i, i + 5, y, y + 6, 1.4, 2.2, lit ? 'lamp' : 'glass_d'); b.box(1.4, 2.2, y, y + 6, i, i + 5, (i + y) % 13 < 2 ? 'lamp' : 'glass');
    b.box(i, i + 5, y, y + 6, n - 2.2, n - 1.4, 'glass_d'); b.box(n - 2.2, n - 1.4, y, y + 6, i, i + 5, 'glass_d');
    b.box(i - 0.5, i + 5.5, y - 1, y, 0.8, 2.4, 'white_d');
  }
  b.box(0.5, n - 0.5, h, h + 3, 0.5, n - 0.5, 'gun_d'); b.box(3, n - 3, h, h + 1, 3, n - 3, 'roof_d');
  b.cylY(16, 18, 7, h + 1, h + 4, 'wood_d'); for (let i = 0; i < 4; i++) b.seg([16 + Math.cos(i * 1.57) * 5, h + 4, 18 + Math.sin(i * 1.57) * 5], [16 + Math.cos(i * 1.57) * 5, h + 11, 18 + Math.sin(i * 1.57) * 5], 0.6, 'wood_d');
  b.cylY(16, 18, 7, h + 11, h + 21, 'wood'); b.fill((x, y, z) => (y < h + 25 - Math.hypot(x - 16, z - 18) * 0.6 ? 'gun_d' : undefined), 9, 24, h + 21, h + 26, 11, 26);   // бак на ножках
  cbox(b, 38, 54, h, h + 9, 36, 52, 'concrete_d', 1, 1);
  b.seg([46, h, 14], [46, h + 22, 14], 0.5, 'gun_d'); b.set(46, h + 22, 14, 'lamp_r');
  return one(b, n, [n, n]);
}

/** Небоскрёб: стеклянные стены с импостами, уступы, светящиеся этажи, техническая надстройка, шпиль с огнём. */
export function tower(v: number): ModelDef {
  const n = 80, h = 170 + (v % 3) * 40, b = new Vox(n, h + 50, n), glass = ['glass', 'teal', 'blue_l'][v % 3], dark = glass === 'teal' ? 'teal_d' : 'glass_d';
  const step = (y: number) => (y > h * 0.75 ? 14 : y > h * 0.45 ? 8 : 2);
  b.fill((x, y, z) => { const s = step(y); return x >= s && x < n - s && z >= s && z < n - s ? dark : undefined; }, 0, n, 0, h, 0, n);
  b.paint((x, y, z) => { const s = step(y); const edge = Math.min(x - s, n - s - 1 - x, z - s, n - s - 1 - z); if (edge > 1) return undefined; if (Math.floor(y) % 6 === 0) return 'steel_l'; if (Math.floor(x + z) % 6 === 0) return 'steel'; return ((Math.floor(y / 6) * 7 + Math.floor((x + z) / 6) * 3 + v) % 13) < 2 ? 'lamp' : glass; });
  for (const y of [Math.round(h * 0.45), Math.round(h * 0.75)]) b.fill((x, y2, z) => { const s = step(y - 1); return x >= s && x < n - s && z >= s && z < n - s ? 'steel_d' : undefined; }, 0, n, y - 2, y, 0, n);
  b.box(0, n, 0, 12, 0, n, 'concrete_d'); b.box(1, n - 1, 2, 11, n - 1.4, n - 0.6, 'glass_d'); b.box(n / 2 - 8, n / 2 + 8, 0, 9, n - 1.2, n, 'lamp');   // вестибюль
  cbox(b, 22, n - 22, h, h + 14, 22, n - 22, 'steel', 1, 1);
  b.cylY(n / 2, n / 2, 3, h + 14, h + 30, 'steel_l'); b.cylY(n / 2, n / 2, 1.2, h + 30, h + 48, 'steel_l'); b.sphere(n / 2, h + 48, n / 2, 1.6, 'lamp_r');
  return one(b, n, [n, n]);
}

/** Панельная девятиэтажка: швы панелей, лоджии, подъезды с козырьками, машинные отделения лифтов на крыше. */
export function panelHouse(v: number): ModelDef {
  const X = 200, Z = 56, H = 120, b = new Vox(X, H + 18, Z), col = ['concrete_l', 'white', 'cream'][v % 3];
  b.box(0, X, 0, H, 0, Z, col);
  b.paint((x, y, z) => (Math.floor(y) % 13 === 0 || Math.floor(x) % 20 === 0 ? 'concrete' : undefined));
  for (let f = 0; f < 9; f++) for (let x = 6; x < X - 10; x += 20) {
    const y = 5 + f * 13, lit = (x * 3 + f * 7 + v) % 9 < 2;
    b.box(x, x + 9, y + 2, y + 9, Z - 0.6, Z + 0.4, lit ? 'lamp' : 'glass'); b.box(x, x + 9, y + 2, y + 9, -0.4, 0.6, 'glass_d');
    if (x % 40 === 26) { b.box(x - 2, x + 14, y, y + 1, Z, Z + 6, 'concrete'); b.box(x - 2, x + 14, y + 1, y + 6, Z + 5.4, Z + 6, (f + x + v) % 3 ? 'concrete_l' : 'fabric_b'); }
  }
  for (const x of [30, 100, 170]) { b.box(x - 7, x + 7, 0, 11, Z - 0.6, Z + 0.6, 'wood_d'); b.box(x - 9, x + 9, 11, 13, Z, Z + 6, 'concrete_d'); b.box(x + 7, x + 9, 8, 10, Z + 0.5, Z + 2, 'lamp'); }
  b.box(0, X, H, H + 2, 0, Z, 'roof_d');
  for (const x of [30, 100, 170]) cbox(b, x - 10, x + 10, H, H + 14, 16, 40, col, 1, 1);
  b.seg([60, H, 28], [60, H + 16, 28], 0.5, 'gun_d'); b.box(54, 66, H + 12, H + 13, 27.5, 28.5, 'gun_d');
  return one(b, X, [X, Z]);
}

/** Ряд гаражей: железные ворота разных цветов, плоская крыша из рубероида. */
export function garages(v: number): ModelDef {
  const X = 140, Z = 40, b = new Vox(X, 26, Z);
  b.box(0, X, 0, 22, 0, Z, 'concrete');
  b.box(-1, X + 1, 22, 24, -1, Z + 1, 'roof_d');
  const cols = ['green_d', 'blue_d', 'red_d', 'gun', 'khaki_d', 'orange_d'];
  for (let i = 0; i < 7; i++) { const x = 2 + i * 20; b.box(x, x + 16, 1, 19, Z - 0.5, Z + 0.4, cols[(i + v) % 6]); b.box(x + 7.6, x + 8.4, 1, 19, Z, Z + 0.6, 'gun_d'); b.box(x + 10, x + 12, 9, 11, Z, Z + 0.8, 'steel_l'); }
  return one(b, X, [X, Z]);
}

/** Строительный кран: решётчатая башня, стрела с противовесом, кабина, крюк. */
export function crane(): ModelDef {
  const n = 30, H = 220, b = new Vox(200, H + 20, n), c = n / 2, bx = 40;
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) b.seg([bx + dx, 0, c + dz], [bx + dx, H, c + dz], 0.8, 'orange');
  for (let y = 0; y < H; y += 10) { b.seg([bx - 5, y, c - 5], [bx + 5, y + 10, c - 5], 0.5, 'orange_d'); b.seg([bx - 5, y, c + 5], [bx + 5, y + 10, c + 5], 0.5, 'orange_d'); b.seg([bx - 5, y, c - 5], [bx - 5, y + 10, c + 5], 0.5, 'orange_d'); b.box(bx - 6, bx + 6, y, y + 1, c - 6, c + 6, 'orange'); }
  cbox(b, bx - 9, bx + 9, 0, 6, c - 9, c + 9, 'concrete', 1, 1);
  b.box(0, 196, H, H + 4, c - 2, c + 2, 'orange'); for (let x = 2; x < 196; x += 8) b.seg([x, H, c], [x + 4, H + 4, c], 0.5, 'orange_d');
  cbox(b, 4, 24, H - 10, H, c - 6, c + 6, 'concrete_d', 1, 1);                                                    // противовес
  cbox(b, bx + 6, bx + 16, H - 10, H, c - 5, c + 5, 'white', 1, 1); b.box(bx + 15.5, bx + 16.5, H - 8, H - 2, c - 4, c + 4, 'glass');
  b.seg([bx, H + 4, c], [bx, H + 18, c], 0.8, 'orange'); b.seg([bx, H + 18, c], [4, H + 4, c], 0.4, 'gun_d'); b.seg([bx, H + 18, c], [190, H + 4, c], 0.4, 'gun_d');
  b.seg([150, H, c], [150, 70, c], 0.3, 'gun_d'); b.box(146, 154, 62, 70, c - 3, c + 3, 'toy_y'); b.box(140, 160, 50, 62, c - 8, c + 8, 'concrete');   // крюк с плитой
  b.set(bx, H + 19, c, 'lamp_r');
  return one(b, 200, [200, n]);
}

/** Фонтан: каменная чаша, струи (светлая вода), бортик. */
export function fountain(): ModelDef {
  const n = 80, c = n / 2, b = new Vox(n, 40, n);
  b.cylY(c, c, 38, 0, 8, 'stone_l'); b.cylY(c, c, 34, 2, 8.1, 'water'); b.cylY(c, c, 35, 7, 8, 'stone');
  b.cylY(c, c, 8, 0, 18, 'stone_l'); b.cylY(c, c, 14, 18, 22, 'stone'); b.cylY(c, c, 12, 20, 22.1, 'water_l');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.seg([c, 22, c], [c + Math.cos(a) * 20, 9, c + Math.sin(a) * 20], 0.7, 'foam'); }
  b.seg([c, 22, c], [c, 36, c], 1, 'foam'); b.sphere(c, 36, c, 2.4, 'foam');
  return one(b, n, [n, n]);
}
void tracks;
