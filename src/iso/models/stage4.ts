// Ступень V «Улицы»: настоящая армия — пехота, БТР, танки, САУ, вертолёты. Дома, деревья, машины.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { tankSpec, wheel, gun, rotor, one, cbox, seams, tracks, pipe, figure } from './kit';

export function infantry(): ModelDef {
  const v = new Vox(16, 12, 16);
  figure(v, 5, 5, 'army', 'army_d', 'flesh', 'gun_d', 1);
  figure(v, 10, 11, 'army', 'army_d', 'flesh', 'gun_d', 1);
  return one(v, 14);
}

const wheelsRow = (v: Vox, xs: number[], zc: number, hw: number, r: number) => { for (const x of xs) for (const s of [-1, 1]) wheel(v, x, r, r, zc + s * hw - (s > 0 ? 0 : 3), zc + s * hw + (s > 0 ? 3 : 0), 'rubber', 'army_d'); };

export function apc(): ModelDef {
  const h = new Vox(44, 20, 28), zc = 14;
  wheelsRow(h, [9, 18, 27, 36], zc, 11, 4);
  cbox(h, 4, 42, 4, 14, zc - 11, zc + 11, 'army', 1, 2);
  h.cut(1, 1.4, 0, 42 + 1.4 * 9, 32, 43, 4, 15);
  h.cut(-1, 1.6, 0, -4 + 1.6 * 10, 3, 10, 4, 15);
  seams(h, 4, 42, 4, 14, zc - 11, zc + 11, 10, 0, 0, 'army_d');
  for (const z of [zc - 8, zc + 8]) h.box(30, 33, 12, 14, z - 1.5, z + 1.5, 'glass_d');
  h.box(8, 20, 14, 15, zc - 6, zc - 2, 'army_d');
  const t = new Vox(24, 8, 12), tc = 6;
  t.cylY(6, tc, 4, 0, 4, 'army_l', 3);
  gun(t, 9, 22, 2, tc, 0.9, 'gun', 'gun_d');
  return { size: 42, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: t, pivot: [6, 0, tc], at: [2, 14, 0] }] };
}

export function mbt(): ModelDef {
  return tankSpec({
    L: 36, W: 28, tH: 8, hH: 6, body: 'army', dark: 'army_d', light: 'army_l', tr: 8, tH2: 5, turret: 'army', barrel: 22, bR: 1.5, round: false, wheels: 5,
    extra: (h, t, c) => {
      t.box(c.tcx - 9, c.tcx - 4, 0, 4, c.tcz - 7, c.tcz + 7, 'army_d');
      t.cylY(c.tcx - 2, c.tcz + 3, 2, c.TH, c.TH + 1.5, 'army_d');
      t.box(c.tcx + 2, c.tcx + 5, c.TH, c.TH + 2, c.tcz - 5, c.tcz - 2, 'gun');
      h.box(c.x0 + 1, c.x0 + 4, c.yT - 1, c.yT + 2, c.zc - 9, c.zc + 9, 'army_d');
    },
  });
}

export function attackHeli(): ModelDef {
  const v = new Vox(52, 18, 24), zc = 12;
  v.ell(30, 8, zc, 12, 6, 5, 'army');
  v.ell(36, 10, zc, 5, 4, 3.6, 'glass_d');
  v.seg([20, 9, zc], [2, 11, zc], 2, 'army'); v.box(1, 5, 9, 17, zc - 0.6, zc + 0.6, 'army_d');
  for (const s of [-1, 1]) { v.box(26, 34, 6, 7, zc + s * 5, zc + s * 11, 'army_d'); for (let i = 0; i < 2; i++) v.cylX(5, zc + s * (8 + i * 2.5), 1.2, 25, 35, i ? 'gun' : 'red'); }
  v.box(38, 44, 3, 5, zc - 1, zc + 1, 'gun_d'); gun(v, 42, 50, 3.5, zc, 0.7);
  for (const s of [-1, 1]) v.seg([24, 1, zc + s * 5], [36, 1, zc + s * 5], 0.6, 'gun_d');
  v.cylY(30, zc, 1.4, 14, 16, 'gun_d');
  const parts: PartDef[] = [{ name: 'body', vox: v }, { name: 'rotor', vox: rotor(20, 'gun_d', 2), at: [4, 16, 0] }];
  return { size: 46, parts };
}

export function spg(): ModelDef {
  return tankSpec({
    L: 40, W: 28, tH: 8, hH: 5, body: 'khaki', dark: 'khaki_d', light: 'sand', tr: 9, tH2: 9, turret: 'khaki', barrel: 28, bR: 2, round: false,
    extra: (h, t, c) => {
      t.box(c.tcx - 10, c.tcx + 9, 0, c.TH, c.tcz - 8, c.tcz + 8, 'khaki');
      t.box(c.tcx - 10, c.tcx + 9, c.TH - 1, c.TH, c.tcz - 8, c.tcz + 8, 'sand');
      t.cylX(c.TH * 0.5, c.tcz, 2.8, c.tcx + 34, c.tcx + 37, 'gun_d');
      h.box(c.x0, c.x0 + 3, 3, 8, c.zc - 10, c.zc + 10, 'gun_d');
    },
  });
}

export function armoredCar(): ModelDef {
  const v = new Vox(36, 16, 22), zc = 11;
  wheelsRow(v, [9, 27], zc, 8, 4.4);
  cbox(v, 3, 34, 4, 12, zc - 8, zc + 8, 'army_l', 1, 1);
  v.cut(1, 1.2, 0, 34 + 1.2 * 7, 26, 35, 4, 13);
  v.box(20, 26, 10, 12.5, zc - 6, zc + 6, 'glass_d');
  v.box(33, 36, 3, 6, zc - 7, zc + 7, 'gun_d');
  v.cylY(14, zc, 3, 12, 14, 'army_d'); gun(v, 14, 26, 13, zc, 0.6);
  return one(v, 34);
}

export function heavyTank(): ModelDef {
  return tankSpec({
    L: 50, W: 38, tH: 11, hH: 8, body: 'army_d', dark: 'camo', light: 'army', tr: 11, tH2: 8, turret: 'army_d', barrel: 26, bR: 2.4, twin: true, wheels: 6,
    extra: (h, t, c) => {
      for (const zz of [c.zc - 21, c.zc + 20]) for (let x = c.x0 + 3; x < c.x1 - 8; x += 6) h.box(x, x + 5, c.yT - 6, c.yT - 1, zz, zz + 1, 'camo');
      t.box(c.tcx - 14, c.tcx - 8, 1, 7, c.tcz - 9, c.tcz + 9, 'camo');
      pipe(t, c.tcx - 3, c.tcz - 6, 1.6, c.TH, c.TH + 3, 'gun', 'gun_d');
      gun(t, c.tcx, c.tcx + 10, c.TH + 2, c.tcz + 5, 0.6);
    },
  });
}

export function mlrs(): ModelDef {
  const h = new Vox(60, 22, 30), zc = 15;
  wheelsRow(h, [10, 22, 40, 50], zc, 11, 4.6);
  cbox(h, 4, 58, 5, 10, zc - 11, zc + 11, 'army_d', 1, 1);
  cbox(h, 42, 58, 9, 20, zc - 10, zc + 10, 'army', 2, 2);
  h.box(54, 57, 13, 18, zc - 9, zc + 9, 'glass_d');
  const t = new Vox(36, 16, 22), tc = 11;
  cbox(t, 0, 32, 0, 12, tc - 9, tc + 9, 'army', 1, 1);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { t.cylX(3 + j * 3.4, tc - 6 + i * 4, 1.3, 31, 32.5, 'gun_d'); t.cylX(3 + j * 3.4, tc - 6 + i * 4, 0.7, 32, 33, 'red'); }
  return { size: 58, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: t, pivot: [10, 0, tc], at: [-14, 10, 0] }] };
}

// ---------------------------------------------------------------- босс: Асфальтовый каток
// Дорожный каток-исполин: громадный передний валец, кабина, бак со смолой, дымящие трубы.
// Сзади — открытый мотор с вентилятором (слабое место).
export function bossRoller(): ModelDef {
  const NX = 120, NZ = 90, c = NZ / 2;
  const h = new Vox(NX, 80, NZ);
  // передний валец
  h.cylZ(96, 22, 22, c - 38, c + 38, 'steel');
  h.cylZ(96, 22, 22.6, c - 38, c - 34, 'yel'); h.cylZ(96, 22, 22.6, c + 34, c + 38, 'yel');
  h.paint((x, y) => ((Math.floor(Math.atan2(y - 22, x - 96) * 6) % 2 === 0) ? 'steel_l' : undefined), 70, 120, 0, 46, c - 34, c + 34);
  h.cylZ(96, 22, 6, c - 39, c + 39, 'gun_d');
  // рама-вилка
  for (const s of [-1, 1]) cbox(h, 70, 102, 28, 40, c + s * 40 - 3, c + s * 40 + 3, 'yel', 1, 1);
  cbox(h, 66, 80, 26, 46, c - 40, c + 40, 'yel_d', 2, 2);
  // задние колёса
  for (const s of [-1, 1]) { h.cylZ(26, 16, 16, c + s * 32 - 8, c + s * 32 + 8, 'rubber'); h.cylZ(26, 16, 8, c + s * 32 - 8.5, c + s * 32 + 8.5, 'yel'); h.cylZ(26, 16, 3, c + s * 32 - 9, c + s * 32 + 9, 'gun_d'); }
  // корпус
  cbox(h, 6, 72, 18, 40, c - 24, c + 24, 'yel', 4, 3);
  seams(h, 6, 72, 18, 40, c - 24, c + 24, 13, 0, 0, 'yel_d');
  for (let x = 10; x < 70; x += 8) h.box(x, x + 4, 38, 40.5, c - 25, c + 25, 'black');   // «зебра»
  h.paint((x) => (Math.floor(x / 4) % 2 ? 'yel' : undefined), 10, 70, 38, 41, c - 25, c + 25);
  // кабина
  cbox(h, 38, 64, 40, 66, c - 18, c + 18, 'yel', 2, 2);
  h.box(50, 64.5, 46, 62, c - 16, c + 16, 'glass');
  h.box(37, 65, 66, 69, c - 20, c + 20, 'gun_d');
  h.box(52, 54, 69, 72, c - 12, c + 12, 'lamp_o');                                      // мигалка
  for (const zz of [c - 6, c + 6]) h.box(52, 54.5, 69, 73, zz - 2, zz + 2, 'lamp_o');
  // бак со смолой
  h.cylX(50, c, 9, 12, 36, 'gun_d'); h.cylX(50, c, 9.4, 14, 16, 'yel'); h.cylX(50, c, 9.4, 32, 34, 'yel');
  h.cylY(24, c, 4, 58, 60, 'black');
  // трубы
  for (const zz of [c - 14, c + 14]) pipe(h, 30, zz, 3, 40, 72, 'gun', 'gun_d');
  // мотор сзади: решётка, вентилятор, жар
  cbox(h, 0, 10, 18, 40, c - 20, c + 20, 'gun_d', 2, 2);
  h.cylX(29, c, 9, -0.5, 1, 'gun');
  h.paint((x, y, z) => ((Math.floor(Math.atan2(y - 29, z - c) * 2.5) % 2 === 0) ? 'lamp_o' : 'fire'), -1, 1.2, 20, 39, c - 9, c + 9);
  h.cylX(29, c, 2.5, -1, 1.5, 'gun_d');
  for (let y = 21; y < 38; y += 3) { h.box(0, 1, y, y + 1, c - 19, c - 11, 'fire'); h.box(0, 1, y, y + 1, c + 11, c + 19, 'fire'); }
  return { size: 104, parts: [{ name: 'body', vox: h, pivot: [60, 0, c] }] };
}

// ---------------------------------------------------------------- препятствия
const CAR = ['red', 'blue', 'white', 'yel', 'green', 'orange'];
export function car(v: number): ModelDef {
  const b = new Vox(24, 10, 12), zc = 6, col = CAR[v % 6];
  for (const x of [5, 18]) for (const z of [0.5, 9.5]) b.cylZ(x, 2, 2, z, z + 2, 'rubber');
  cbox(b, 1, 23, 1.5, 5, 1, 11, col, 1, 1);
  cbox(b, 6, 17, 5, 8.5, 1.5, 10.5, col, 1, 1);
  b.box(14, 16.8, 5, 8, 1.6, 10.4, 'glass'); b.box(6.5, 8, 5, 8, 1.6, 10.4, 'glass_d');
  b.box(22.5, 23.2, 3, 4, 2, 4, 'lamp'); b.box(22.5, 23.2, 3, 4, 8, 10, 'lamp');
  b.box(0.8, 1.4, 3, 4, 2, 4, 'lamp_r'); b.box(0.8, 1.4, 3, 4, 8, 10, 'lamp_r');
  return one(b, 24, [24, 12]);
}

const WALL = ['brick', 'cream', 'white', 'concrete_l', 'sand'];
export function house(v: number): ModelDef {
  const b = new Vox(30, 30, 24), wall = WALL[v % 5], roof = v % 2 ? 'roof' : 'gun';
  b.box(1, 29, 0, 16, 1, 23, wall);
  if (wall === 'brick') b.paint((x, y, z) => ((Math.floor(y) % 3 === 2) || ((Math.floor(x + (Math.floor(y / 3) % 2) * 2 + z) % 5) === 0) ? 'brick_d' : undefined), 0, 30, 0, 16, 0, 24);
  b.fill((x, y, z) => (y < 16 + 7 - Math.abs(z - 12) * 0.6 ? wall : undefined), 1.2, 28.8, 16, 28, 1.2, 22.8);
  b.fill((x, y, z) => (y < 16 + 7.6 - Math.abs(z - 12) * 0.6 ? (Math.floor(z) % 2 ? roof : roof === 'roof' ? 'roof_d' : 'gun_d') : undefined), 0, 30, 16, 28, 0, 24);
  for (const x of [5, 13, 21]) for (const y of [4, 10]) { b.box(x, x + 4, y, y + 4, 0.5, 1, 'glass'); b.box(x, x + 4, y, y + 4, 23, 23.5, 'glass'); }
  b.box(24, 27, 0, 7, 0.4, 1, 'wood_d');
  pipe(b, 22, 6, 1.6, 20, 28, 'brick_d', 'gun_d');
  return one(b, 30, [30, 24]);
}

export function tree(v: number): ModelDef {
  const b = new Vox(16, 24, 16), c = 8;
  b.cylY(c, c, 1.4, 0, 9, 'wood_d');
  const leaves = v % 3 === 2 ? ['orange', 'orange_d'] : ['leaf', 'leaf_d'];
  b.sphere(c, 13, c, 6, leaves[1]);
  b.sphere(c - 1, 15, c - 1, 5.4, leaves[0]);
  b.sphere(c + 2, 18, c + 1, 3.6, v % 3 === 2 ? 'yel' : 'leaf_l');
  return one(b, 16, [16, 16]);
}

void tracks;
