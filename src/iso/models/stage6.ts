// Ступени VII «Танки-города» и VIII «Планета»: города на гусеницах, орбитальное оружие, пришельцы.
import { Vox, type ModelDef } from '../vox';
import { tankSpec, gun, one, cbox, seams, tracks, pipe, leg } from './kit';

// ================================================================ VII. Танки-города
/** Мини-город на крыше (дома-коробки с окнами). */
function skyline(v: Vox, x0: number, x1: number, z0: number, z1: number, y0: number, seed: number, maxH: number): void {
  for (let x = x0; x < x1 - 3; x += 5) for (let z = z0; z < z1 - 3; z += 5) {
    const r = Math.abs(Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453) % 1;
    const hh = 3 + Math.floor(r * maxH), col = ['concrete_l', 'cream', 'steel_l', 'sand', 'brick'][Math.floor(r * 97) % 5];
    v.box(x, x + 4, y0, y0 + hh, z, z + 4, col);
    for (let y = y0 + 1; y < y0 + hh - 1; y += 2) { v.box(x + 1, x + 3, y, y + 1, z - 0.1, z + 0.2, (x + y) % 3 ? 'glass_d' : 'lamp'); v.box(x + 3.8, x + 4.1, y, y + 1, z + 1, z + 3, 'glass_d'); }
    v.box(x, x + 4, y0 + hh, y0 + hh + 0.6, z, z + 4, 'gun');
  }
}

export function cityBlock(): ModelDef {
  const v = new Vox(24, 18, 20), zc = 10;
  for (const s of [-1, 1]) tracks(v, 1, 23, 5, zc + s * 7 - 2.5, zc + s * 7 + 2.5, 3, 'gun_l');
  cbox(v, 2, 22, 4, 7, 2, 18, 'concrete_d', 1, 0);
  skyline(v, 3, 22, 3, 18, 7, 3, 8);
  return one(v, 22);
}

export function crawler(): ModelDef {
  return tankSpec({
    L: 44, W: 36, tH: 10, hH: 8, body: 'concrete', dark: 'concrete_d', light: 'concrete_l', wheel: 'gun_l', tr: 10, tH2: 7, turret: 'gun', barrel: 22, bR: 2.2, twin: true, wheels: 6,
    extra: (h, t, c) => {
      skyline(h, c.x0 + 2, c.x0 + 16, c.zc - 14, c.zc + 14, c.yT, 7, 6);
      t.box(c.tcx - 6, c.tcx + 4, c.TH, c.TH + 3, c.tcz - 4, c.tcz + 4, 'gun_d');
      t.box(c.tcx + 3, c.tcx + 4.5, c.TH + 1, c.TH + 2, c.tcz - 3, c.tcz + 3, 'glow_c');
    },
  });
}

export function dropPod(): ModelDef {
  const v = new Vox(22, 28, 22), c = 11;
  v.cylY(c, c, 9, 0, 16, 'steel', 7);
  v.cylY(c, c, 7, 16, 24, 'steel_d', 2);
  v.cylY(c, c, 9.6, 2, 4, 'red');
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) v.box(c + a * 9 - 1, c + a * 9 + 1, 0, 10, c + b * 9 - 1, c + b * 9 + 1, 'gun_d');
  v.box(18, 20.5, 8, 14, c - 3, c + 3, 'glass_d');
  v.cylY(c, c, 3, 0, 1, 'fire');
  return one(v, 22);
}

export function stratoBomber(): ModelDef {
  const v = new Vox(48, 10, 72), c = 36;
  v.fill((x, y, z) => { const dz = Math.abs(z - c), lead = 44 - dz * 0.7, trail = 18 - dz * 0.35 + (dz > 20 ? (dz - 20) * 0.5 : 0); return x < lead && x > trail && y < 5 - dz * 0.05 + (dz < 8 ? 2 : 0) ? 'navy_d' : undefined; });
  v.paint((x, y) => (y > 3.5 ? 'navy' : undefined));
  v.box(30, 38, 5, 7, c - 3, c + 3, 'glass_d');
  for (const s of [-1, 1]) for (const k of [0, 1]) { const zz = c + s * (8 + k * 6); v.cylX(3, zz, 2, 12, 22, 'gun'); v.cylX(3, zz, 1.4, 11, 12.5, 'fire'); }
  v.box(20, 28, 0, 1, c - 4, c + 4, 'black');
  return one(v, 60);
}

export function mobileFort(): ModelDef {
  const v = new Vox(60, 40, 60), c = 30;
  for (const s of [-1, 1]) tracks(v, 4, 56, 12, c + s * 22 - 6, c + s * 22 + 6, 5, 'gun_l');
  cbox(v, 6, 54, 10, 24, 6, 54, 'concrete', 4, 2);
  seams(v, 6, 54, 10, 24, 6, 54, 8, 0, 8, 'concrete_d');
  for (let x = 6; x < 54; x += 4) { v.box(x, x + 2, 24, 26, 6, 8, 'concrete'); v.box(x, x + 2, 24, 26, 52, 54, 'concrete'); }
  for (let z = 6; z < 54; z += 4) { v.box(6, 8, 24, 26, z, z + 2, 'concrete'); v.box(52, 54, 24, 26, z, z + 2, 'concrete'); }
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const tx = c + a * 20, tz = c + b * 20;
    v.cylY(tx, tz, 6, 10, 34, 'concrete_l'); v.cylY(tx, tz, 7, 32, 36, 'concrete_d');
    v.cylY(tx, tz, 4, 36, 39, 'roof', 1); gun(v, tx + 4, tx + 14, 30, tz, 1.4);
  }
  v.box(c - 8, c + 8, 24, 32, c - 8, c + 8, 'gun');
  v.box(c - 2, c + 2, 32, 34, c - 2, c + 2, 'lamp_r');
  return one(v, 58);
}

export function silo(): ModelDef {
  const v = new Vox(40, 34, 40), c = 20;
  v.cylY(c, c, 18, 0, 6, 'concrete_d', 16);
  v.cylY(c, c, 12, 6, 8, 'gun');
  v.cylY(c, c, 9, 7.5, 8.2, 'black');
  v.cylY(c, c, 4.4, 8, 26, 'white'); v.cylY(c, c, 4.4, 20, 23, 'red');
  v.cylY(c, c, 4.4, 26, 33, 'red', 0.4);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) v.box(c + a * 5 - 1, c + a * 5 + 1, 8, 13, c + b * 5 - 1, c + b * 5 + 1, 'gun_d');
  for (const s of [-1, 1]) v.box(c - 12, c + 12, 6, 8, c + s * 13 - 1, c + s * 13 + 1, 'yel');
  return one(v, 38);
}

export function megaWalker(): ModelDef {
  const h = new Vox(80, 48, 70), zc = 35;
  for (const [x, s] of [[58, -1], [58, 1], [22, -1], [22, 1]] as const) leg(h, [x, 34, zc + s * 14], [x + (x > 40 ? 10 : -10), 22, zc + s * 28], [x + (x > 40 ? 8 : -8), 1, zc + s * 30], 4, 'gun', 'gun_d');
  cbox(h, 14, 66, 30, 44, zc - 18, zc + 18, 'gun_d', 4, 2);
  const T = new Vox(70, 30, 56), tc = 28;
  cbox(T, 6, 50, 0, 18, tc - 20, tc + 20, 'steel_d', 4, 3);
  seams(T, 6, 50, 0, 18, tc - 20, tc + 20, 11, 0, 10, 'gun');
  T.box(44, 52, 6, 14, tc - 8, tc + 8, 'gun_d'); T.box(51.5, 53, 8, 12, tc - 6, tc + 6, 'glow_p');
  for (const s of [-1, 1]) { gun(T, 40, 68, 9, tc + s * 14, 3.2, 'gun', 'gun_d'); T.cylX(9, tc + s * 14, 1.6, 66, 68.5, 'glow_p'); }
  for (const zz of [tc - 8, tc, tc + 8]) pipe(T, 12, zz, 2.4, 18, 26, 'gun', 'gun_d');
  return { size: 76, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: T, pivot: [28, 0, tc], at: [0, 44, 0] }] };
}

// ---------------------------------------------------------------- босс: Титан-мегаполис
// Целый город на гусеницах: шесть гусеничных тележек, платформа с небоскрёбами, главный калибр
// на башне-ратуше. В корме — открытый реактор (слабое место, светится).
export function bossTitan(): ModelDef {
  const NX = 128, NZ = 112, c = NZ / 2;
  const h = new Vox(NX, 70, NZ);
  for (const s of [-1, 1]) for (const k of [0, 1, 2]) tracks(h, 6 + k * 40, 42 + k * 40, 16, c + s * 42 - 10, c + s * 42 + 10, 3, 'gun_l', 'gun_d');
  cbox(h, 4, 124, 14, 30, 4, NZ - 4, 'concrete_d', 6, 2);
  seams(h, 4, 124, 14, 30, 4, NZ - 4, 15, 0, 0, 'gun');
  h.box(4, 124, 28, 30, 4, NZ - 4, 'asphalt');
  for (let x = 10; x < 120; x += 6) h.box(x, x + 3, 30, 30.4, c - 0.6, c + 0.6, 'yel');
  // небоскрёбы по краям
  for (const [x, z, w, hh, col] of [[12, 10, 14, 30, 'glass'], [12, 88, 14, 26, 'teal'], [30, 8, 10, 20, 'concrete_l'], [30, 92, 10, 18, 'cream'], [96, 10, 14, 22, 'glass'], [96, 88, 14, 24, 'teal'], [80, 8, 10, 14, 'brick'], [80, 94, 10, 12, 'sand'], [110, 30, 10, 12, 'concrete_l'], [110, 70, 10, 12, 'concrete_l']] as const) {
    h.box(x, x + w, 30, 30 + hh, z, z + w, col);
    h.paint((xx, yy, zz) => (Math.floor(yy) % 3 === 0 ? 'steel_l' : (Math.floor(xx + zz) % 3 === 0 ? (col === 'glass' || col === 'teal' ? 'steel' : 'glass_d') : undefined)), x, x + w, 31, 30 + hh, z, z + w);
    h.box(x + 2, x + w - 2, 30 + hh, 32 + hh, z + 2, z + w - 2, 'gun_d');
    if ((x + z) % 3 === 0) h.box(x + w / 2 - 0.5, x + w / 2 + 0.5, 32 + hh, 38 + hh, z + w / 2 - 0.5, z + w / 2 + 0.5, 'lamp_r');
  }
  skyline(h, 46, 76, 10, 30, 30, 11, 8);
  skyline(h, 46, 76, 82, 102, 30, 17, 8);
  // реактор в корме: купол, кольца, свечение
  h.cylX(44, c, 16, 0, 12, 'gun_d');
  h.cylX(44, c, 13, -0.5, 1, 'glow_c');
  h.cylX(44, c, 7, -1, 0.5, 'lamp');
  for (const r of [16.5, 15]) h.cylX(44, c, r, 4 + (r - 15) * 4, 6 + (r - 15) * 4, 'yel');
  for (const s of [-1, 1]) pipe(h, 8, c + s * 22, 4, 30, 60, 'gun', 'gun_d');
  // ратуша-башня с главным калибром
  const T = new Vox(96, 56, 64), tc = 32;
  T.cylY(30, tc, 22, 0, 14, 'concrete_l', 20);
  seams(T, 0, 96, 0, 14, 0, 64, 0, 5, 0, 'concrete');
  T.box(16, 44, 14, 34, tc - 12, tc + 12, 'cream');
  T.paint((x, y, z) => (Math.floor(y) % 4 === 0 ? 'cream' : (Math.floor(x + z) % 3 === 0 ? 'glass_d' : undefined)), 16, 44, 15, 33, tc - 12, tc + 12);
  T.fill((x, y, z) => (y < 34 + 10 - Math.max(Math.abs(x - 30), Math.abs(z - tc)) * 0.7 ? 'roof' : undefined), 16, 44, 34, 46, tc - 12, tc + 12);
  T.seg([30, 44, tc], [30, 54, tc], 0.6, 'gold'); T.sphere(30, 54, tc, 1.4, 'lamp_r');
  T.cylZ(30, 26, 3, tc - 12.6, tc - 11.9, 'white'); T.cylZ(30, 26, 3, tc + 11.9, tc + 12.6, 'white');
  for (const s of [-1, 1]) { gun(T, 40, 94, 8, tc + s * 9, 4.4, 'gun', 'gun_d'); for (let x = 50; x < 90; x += 10) T.cylX(8, tc + s * 9, 5.2, x, x + 2, 'gun_l'); T.cylX(8, tc + s * 9, 2, 92, 94.5, 'glow_c'); }
  return {
    size: 124,
    parts: [
      { name: 'hull', vox: h, pivot: [64, 0, c] },
      { name: 'turret', vox: T, pivot: [30, 0, tc], at: [6, 30, 0] },
    ],
  };
}

export function cityDot(v: number): ModelDef {
  const b = new Vox(24, 20, 24), c = 12;
  b.cylY(c, c, 11.5, 0, 2, 'concrete_d');
  b.cylY(c, c, 11, 2, 2.4, 'asphalt');
  for (let i = 0; i < 9; i++) { const a = i * 2.39996 + v, r = Math.sqrt(i / 9) * 8; const x = c + Math.cos(a) * r, z = c + Math.sin(a) * r, hh = 4 + ((i * 7 + v * 3) % 9) * (1 - r / 12) * 1.6; b.box(x - 1.6, x + 1.6, 2, 2 + hh, z - 1.6, z + 1.6, ['glass', 'concrete_l', 'cream', 'teal'][(i + v) % 4]); b.box(x - 1.6, x + 1.6, 2 + hh, 2.6 + hh, z - 1.6, z + 1.6, 'gun'); }
  return one(b, 24, [24, 24]);
}

export function mountain(v: number): ModelDef {
  const b = new Vox(40, 30, 32);
  b.fill((x, y, z) => {
    const dx = (x - 20) / 20, dz = (z - 16) / 16, d = Math.hypot(dx, dz);
    const n = Math.sin(x * 0.7 + v) * Math.cos(z * 0.6) * 2.4 + Math.sin(x * 0.23 + z * 0.31 + v * 2) * 3;
    const hh = (1 - d) * 26 + n;
    if (y > hh || d > 1) return undefined;
    return y > 19 + n * 0.3 ? 'white' : y > 14 ? 'rock_l' : y < 3 ? 'grass_d' : 'rock';
  });
  return one(b, 40, [40, 32]);
}

// ================================================================ VIII. Планета
export function meteorite(): ModelDef {
  const v = new Vox(24, 14, 16), zc = 8;
  v.fill((x, y, z) => (Math.hypot(x - 16, y - 7, z - zc) < 5.4 + Math.sin(x * 3 + y * 2 + z) * 0.8 ? ((x + y + z) % 3 ? 'rock' : 'rock_d') : undefined));
  v.fill((x, y, z) => (Math.hypot((x - 9) * 0.4, y - 7, z - zc) < 3.4 - (16 - x) * 0.1 && x < 12 ? (x < 6 ? 'lava_l' : 'fire') : undefined), 0, 12, 0, 14, 0, 16);
  v.set(20, 9, zc, 'magma');
  return one(v, 20);
}

export function contCrawler(): ModelDef {
  return tankSpec({
    L: 50, W: 40, tH: 11, hH: 9, body: 'alien_d', dark: 'void', light: 'alien', wheel: 'glow_p', tr: 11, tH2: 8, turret: 'alien_d', barrel: 22, bR: 2.4, wheels: 6,
    extra: (h, t, c) => {
      for (const zz of [c.zc - 22, c.zc + 21]) for (let x = c.x0 + 4; x < c.x1 - 10; x += 7) h.box(x, x + 3, c.yT - 5, c.yT - 2, zz, zz + 1, 'glow_p');
      t.cylX(c.TH * 0.5, c.tcz, 1.4, c.tcx + 30, c.tcx + 34, 'glow_p');
      t.sphere(c.tcx - 3, c.TH + 1, c.tcz, 3, 'glow_c');
    },
  });
}

export function orbitalSat(): ModelDef {
  const v = new Vox(24, 12, 44), c = 22;
  cbox(v, 6, 18, 2, 10, c - 4, c + 4, 'gold', 1, 1);
  v.box(16, 20, 4, 8, c - 2, c + 2, 'gun_d'); v.box(19.5, 21, 5, 7, c - 1, c + 1, 'eye_r');
  for (const s of [-1, 1]) { v.box(11, 13, 5.5, 6.5, c + s * 4, c + s * 7, 'steel'); v.box(4, 20, 5.6, 6.4, c + s * 7, c + s * 21, 'blue_d'); v.paint((x, y, z) => (Math.floor(x) % 4 === 0 || Math.floor(z) % 4 === 0 ? 'steel_l' : undefined), 4, 20, 5, 7, s > 0 ? c + 7 : c - 21, s > 0 ? c + 21 : c - 7); }
  v.seg([12, 10, c], [12, 12, c], 0.5, 'steel_l');
  return one(v, 30);
}

export function voidSpider(): ModelDef {
  const v = new Vox(40, 18, 40), c = 20;
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const x = 13 + i * 5; leg(v, [x, 8, c + s * 4], [x + (i - 1.5) * 3, 14, c + s * 13], [x + (i - 1.5) * 6, 0.5, c + s * 19], 1.1, 'void', 'alien'); }
  v.ell(14, 8, c, 8, 5, 6.5, 'alien_d');
  v.ell(13, 10, c, 5, 2.6, 4, 'glow_p');
  v.ell(26, 7, c, 5, 3.6, 4.2, 'void');
  for (const [y, z] of [[9, c - 2], [9, c + 2], [8, c - 1], [8, c + 1]]) v.set(30, y, z, 'eye_r');
  v.seg([30, 5, c - 2], [34, 3, c - 3], 0.6, 'alien_l'); v.seg([30, 5, c + 2], [34, 3, c + 3], 0.6, 'alien_l');
  return one(v, 34);
}

export function lance(): ModelDef {
  const b = new Vox(40, 10, 40), c = 20;
  b.cylY(c, c, 18, 0, 4, 'gun_d', 15); b.cylY(c, c, 10, 4, 8, 'steel_d');
  for (const [a, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.box(c + a * 15 - 2, c + a * 15 + 2, 0, 6, c + z * 15 - 2, c + z * 15 + 2, 'gun');
  const t = new Vox(50, 40, 20), tc = 10;
  t.seg([6, 0, tc], [18, 30, tc], 3, 'steel');
  t.cylZ(18, 30, 4, tc - 4, tc + 4, 'gun_d');
  t.cylX(30, tc, 3.6, 10, 46, 'steel_l', 1.6);
  for (let x = 14; x < 44; x += 6) t.cylX(30, tc, 4.6, x, x + 1.4, 'glow_c');
  t.cylX(30, tc, 1.4, 45, 49, 'lamp');
  return { size: 40, parts: [{ name: 'body', vox: b }, { name: 'turret', vox: t, pivot: [6, 0, tc], at: [0, 8, 0] }] };
}

export function moonlet(): ModelDef {
  const v = new Vox(56, 56, 56), c = 28;
  v.sphere(c, 28, c, 24, 'stone');
  const craters: [number, number, number, number][] = [[c + 18, 36, c + 6, 6], [c - 6, 44, c - 14, 5], [c + 4, 30, c - 22, 4.6], [c - 20, 26, c + 10, 5.4], [c + 8, 50, c + 8, 4]];
  for (const [x, y, z, r] of craters) { v.fill((xx, yy, zz) => (Math.hypot(xx - x, yy - y, zz - z) < r ? 0 : undefined)); v.paint((xx, yy, zz) => (Math.hypot(xx - x, yy - y, zz - z) < r + 1.4 ? 'stone_d' : undefined)); }
  v.paint((x, y) => (y < 8 ? 'stone_d' : undefined));
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const tx = c + a * 16, tz = c + b * 16; v.cylY(tx, tz, 4, 44, 50, 'gun_d'); gun(v, tx + 3, tx + 13, 47, tz, 1.4); }
  v.box(c - 3, c + 3, 52, 55, c - 3, c + 3, 'glow_p');
  return one(v, 54);
}

export function starTitan(): ModelDef {
  const h = new Vox(70, 50, 60), zc = 30;
  for (const s of [-1, 1]) {
    leg(h, [34, 38, zc + s * 12], [44, 22, zc + s * 18], [32, 1, zc + s * 18], 4.6, 'alien_d', 'void');
    cbox(h, 20, 48, 0, 5, zc + s * 18 - 7, zc + s * 18 + 7, 'void', 2, 1);
  }
  cbox(h, 22, 48, 36, 48, zc - 14, zc + 14, 'void', 3, 2);
  const T = new Vox(70, 50, 72), tc = 36;
  T.ell(28, 18, tc, 20, 18, 18, 'alien_d');
  T.paint((x, y, z) => (y > 28 ? 'alien' : undefined));
  seams(T, 0, 70, 0, 50, 0, 72, 0, 7, 0, 'void');
  T.ell(44, 22, tc, 5, 6, 8, 'void'); T.ell(47, 23, tc, 3, 3, 6, 'glow_c');
  for (const s of [-1, 1]) {
    T.ell(26, 26, tc + s * 22, 10, 9, 9, 'alien');
    for (let i = 0; i < 3; i++) T.seg([26, 32, tc + s * (20 + i * 3)], [20 - i * 2, 46, tc + s * (24 + i * 4)], 1.2, 'alien_l');
    gun(T, 30, 66, 16, tc + s * 24, 3.6, 'void', 'alien_d');
    T.cylX(16, tc + s * 24, 1.8, 64, 66.5, 'glow_p');
  }
  T.sphere(28, 34, tc, 4, 'glow_p');
  return { size: 78, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: T, pivot: [28, 0, tc], at: [0, 44, 0] }] };
}

// ---------------------------------------------------------------- босс: Пожиратель планет
// Космическое чудовище-танк: хитиновый панцирь с шипами, шесть суставчатых лап, гигантская пасть
// спереди с челюстями-бивнями. В глубине пасти светится ядро (слабое место).
export function bossEater(): ModelDef {
  const NX = 132, NZ = 120, c = NZ / 2;
  const h = new Vox(NX, 60, NZ);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = 30 + i * 26;
    leg(h, [x, 26, c + s * 22], [x + (i - 1) * 8, 40, c + s * 46], [x + (i - 1) * 16, 1, c + s * 56], 4.4, 'void', 'alien_d');
    h.cylY(x + (i - 1) * 16, c + s * 56, 2, 0, 3, 'alien_l');
  }
  // брюхо и панцирь
  h.ell(56, 24, c, 50, 18, 34, 'void');
  h.fill((x, y, z) => { const r = ((x - 54) / 50) ** 2 + ((y - 30) / 24) ** 2 + ((z - c) / 36) ** 2; return r < 1 && y > 26 ? (Math.floor((x - 54) / 9 + 100) % 2 ? 'alien_d' : 'alien') : undefined; });
  h.paint((x, y, z) => (Math.abs(z - c) < 2.5 && y > 40 ? 'alien_l' : undefined));
  // шипы по хребту и бортам
  for (let i = 0; i < 8; i++) { const x = 16 + i * 10, top = 30 + Math.sqrt(Math.max(0, 1 - ((x - 54) / 50) ** 2)) * 24; h.seg([x, top - 2, c], [x - 6, top + 10 - Math.abs(i - 4), c], 2 - i * 0.1, 'bone'); }
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) h.seg([24 + i * 16, 34, c + s * 30], [18 + i * 16, 40, c + s * 42], 1.4, 'bone');
  // светящиеся жилы
  for (const s of [-1, 1]) h.paint((x, y, z) => (Math.abs(z - c - s * (14 + Math.sin(x * 0.2) * 4)) < 1 && y > 30 ? 'glow_p' : undefined));
  // пасть: челюсти-бивни, зубы, ядро
  h.fill((x, y, z) => { const r = ((x - 100) / 18) ** 2 + ((y - 24) / 18) ** 2 + ((z - c) / 26) ** 2; return r < 1 ? 'alien_d' : undefined; });
  h.fill((x, y, z) => { const r = ((x - 112) / 16) ** 2 + ((y - 24) / 13) ** 2 + ((z - c) / 19) ** 2; return r < 1 ? 0 : undefined; });
  h.paint((x, y, z) => { const r = ((x - 112) / 18) ** 2 + ((y - 24) / 15) ** 2 + ((z - c) / 21) ** 2; return r < 1 ? 'red_d' : undefined; });
  h.sphere(104, 24, c, 8, 'magma'); h.sphere(104, 24, c, 5, 'lava_l'); h.sphere(108, 24, c, 3, 'lamp');
  for (let i = 0; i < 9; i++) { const z = c - 16 + i * 4; h.seg([114, 37, z], [118, 30, z], 1, 'bone'); h.seg([114, 11, z], [118, 18, z], 1, 'bone'); }
  for (const s of [-1, 1]) { h.seg([108, 20, c + s * 20], [132, 12, c + s * 14], 3.2, 'bone'); h.seg([126, 13, c + s * 16], [131, 20, c + s * 12], 2, 'bone'); }
  // глаза
  for (const s of [-1, 1]) for (const k of [0, 1]) h.sphere(94 - k * 6, 42 - k * 2, c + s * (12 + k * 6), 3 - k * 0.6, 'eye_r');
  return { size: 128, parts: [{ name: 'body', vox: h, pivot: [62, 0, c] }] };
}

export function crystal(v: number): ModelDef {
  const b = new Vox(24, 30, 24), c = 12;
  const cols = [['crystal', 'ice_l'], ['glow_p', 'alien_l'], ['glow_c', 'ice'], ['crystal', 'glow_c']][v % 4];
  b.ell(c, 1, c, 10, 2, 9, 'rock_d');
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + v, r = i ? 5 : 0, x = c + Math.cos(a) * r, z = c + Math.sin(a) * r, hh = i ? 12 + (i * 5 + v) % 8 : 26; b.seg([x, 1, z], [x + (x - c) * 0.6, hh, z + (z - c) * 0.6], i ? 2 : 3.2, i % 2 ? cols[0] : cols[1]); }
  return one(b, 24, [24, 24]);
}

export function volcano(v: number): ModelDef {
  const b = new Vox(48, 30, 48), c = 24;
  b.fill((x, y, z) => {
    const d = Math.hypot(x - c, z - c) / 24, n = Math.sin(x * 0.5 + v) * Math.cos(z * 0.45) * 1.6;
    const hh = (1 - d) * 34 + n;
    if (d > 1 || y > Math.min(hh, 26)) return undefined;
    if (d < 0.2 && y > 20) return 0;
    return y < 3 ? 'ash' : d < 0.28 && y > 22 ? 'lava_d' : 'rock_d';
  });
  b.cylY(c, c, 4.6, 19, 22, 'lava');
  b.cylY(c, c, 2.4, 21, 22.4, 'lava_l');
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + v; b.paint((x, y, z) => { const ang = Math.atan2(z - c, x - c); return Math.abs(((ang - a + 9.42) % 6.283) - 3.14) < 0.12 && y > 4 ? 'lava' : undefined; }); }
  return one(b, 48, [48, 48]);
}

