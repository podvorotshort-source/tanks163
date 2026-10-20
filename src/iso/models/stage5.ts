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
  t.box(20, 25, 4, 8, tc - 4, tc + 4, 'glass_d'); t.box(24, 25.5, 5, 7, tc - 3, tc + 3, 'glow_c');
  for (const s of [-1, 1]) { t.box(8, 18, 2, 7, tc + s * 9 - 2, tc + s * 9 + 2, 'teal_d'); gun(t, 16, 30, 4.5, tc + s * 9, 1.2, 'gun', 'gun_d'); t.cylX(4.5, tc + s * 9, 0.8, 29, 30.5, 'glow_c'); }
  return { size: 30, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: t, pivot: [14, 0, tc], at: [0, 20, 0] }] };
}

export function superTank(): ModelDef {
  return tankSpec({
    L: 48, W: 38, tH: 11, hH: 8, body: 'steel_d', dark: 'gun', light: 'steel', wheel: 'gun_l', tr: 11, tH2: 8, turret: 'steel_d', barrel: 30, bR: 2.6, round: false, wheels: 6,
    extra: (h, t, c) => {
      seams(h, c.x0, c.x1, c.yT - 8, c.yT, 0, 60, 8, 0, 0, 'gun');
      for (const zz of [c.zc - 20, c.zc + 19]) h.box(c.x0 + 4, c.x1 - 10, c.yT - 4, c.yT - 3, zz, zz + 1, 'lamp_o');
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
  v.box(c + 8, c + 10.5, 10, 12, c - 4, c + 4, 'glow_c');
  v.box(c - 18, c + 6, 9.5, 10, c - 1, c + 1, 'yel');                               // взлётная полоса
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { v.cylY(c + a * 20, c + b * 20, 5.6, 5, 9, 'gun_d'); v.cylY(c + a * 20, c + b * 20, 4.6, 8.5, 9.2, 'black'); }
  v.box(c - 3, c + 3, 2, 4, c - 3, c + 3, 'lamp_r');
  const parts: PartDef[] = [{ name: 'body', vox: v }];
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) parts.push({ name: 'rotor', vox: rotor(4.6, 'steel_l', 3), at: [a * 20, 8.5, b * 20] });
  return { size: 52, parts };
}

export function kamikazeDrone(): ModelDef {
  const v = new Vox(20, 8, 18), zc = 9;
  v.fill((x, y, z) => (Math.abs(z - zc) < (x - 2) * 0.55 && x < 18 && y > 2 && y < 4 ? 'gun' : undefined));
  v.ell(10, 3.5, zc, 7, 1.8, 2, 'gun_d');
  v.ell(17, 3.5, zc, 2.4, 1.5, 1.5, 'red');
  v.box(1, 3, 2, 5, zc - 1, zc + 1, 'lamp_o');
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
  T.box(45, 46.5, 17, 21, tc - 6, tc + 6, 'glow_c');
  T.box(18, 32, 28, 32, tc - 6, tc + 6, 'gun');
  for (const s of [-1, 1]) {
    cbox(T, 14, 40, 10, 30, tc + s * 23 - 7, tc + s * 23 + 7, 'steel', 3, 3);
    gun(T, 34, 60, 16, tc + s * 23, 4, 'gun', 'gun_d');
    T.cylX(16, tc + s * 23, 2.2, 58, 60.5, 'glow_p');
    for (let i = 0; i < 3; i++) T.cylX(16, tc + s * 23, 4.8, 38 + i * 6, 39 + i * 6, 'glow_p');
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
const FACADE = ['concrete_l', 'brick', 'cream', 'steel_l', 'sand'];
export function midrise(v: number): ModelDef {
  const b = new Vox(16, 30, 16), col = FACADE[v % 5], h = 18 + (v % 3) * 4;
  b.box(1, 15, 0, h, 1, 15, col);
  for (let y = 2; y < h - 2; y += 3) for (let i = 2; i < 14; i += 3) { b.box(i, i + 2, y, y + 2, 0.6, 1.2, (i + y) % 7 ? 'glass_d' : 'lamp'); b.box(0.6, 1.2, y, y + 2, i, i + 2, (i * y) % 5 ? 'glass_d' : 'lamp'); b.box(i, i + 2, y, y + 2, 14.8, 15.4, 'glass_d'); b.box(14.8, 15.4, y, y + 2, i, i + 2, 'glass_d'); }
  b.box(0.5, 15.5, h, h + 1, 0.5, 15.5, 'gun_d');
  b.box(4, 9, h + 1, h + 3, 4, 8, 'steel');
  return one(b, 16, [16, 16]);
}

export function tower(v: number): ModelDef {
  const b = new Vox(20, 64, 20), h = 40 + (v % 3) * 8, glass = v % 2 ? 'glass' : 'teal';
  b.box(1, 19, 0, h, 1, 19, glass === 'glass' ? 'glass_d' : 'teal_d');
  b.paint((x, y, z) => (Math.floor(y) % 4 === 0 ? 'steel_l' : (Math.floor(x + z) % 4 === 0 ? 'steel' : glass)), 0, 20, 0, h, 0, 20);
  b.box(3, 17, h, h + 4, 3, 17, 'steel_d');
  b.box(5, 15, h + 4, h + 6, 5, 15, 'gun_d');
  b.seg([10, h + 6, 10], [10, h + 14, 10], 0.5, 'steel_l'); b.set(10, h + 14, 10, 'lamp_r');
  b.box(0.5, 19.5, 0, 4, 0.5, 19.5, 'concrete_d');
  return one(b, 20, [20, 20]);
}

void tracks;
