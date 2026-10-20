// Ступень IV «Квартира»: взбесившаяся бытовая техника, стены, мебель.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { gun, rotor, one, cbox, seams, tracks, pipe, leg } from './kit';

export function cockroachBot(): ModelDef {
  const v = new Vox(20, 8, 16), zc = 8;
  for (const s of [-1, 1]) for (const x of [5, 10, 15]) v.seg([x, 3, zc + s * 2], [x + (x - 10) * 0.3, 0.5, zc + s * 7.5], 0.5, 'gun_d');
  v.ell(10, 3.5, zc, 7, 2.6, 4, 'brick_d');
  v.ell(9, 4.5, zc, 5.5, 1.6, 3.4, 'brick');
  v.box(9, 10, 5, 6, zc - 3, zc + 3, 'gun_d');
  v.ell(17, 3, zc, 2.2, 1.8, 2.4, 'gun');
  v.set(18, 4, zc - 1, 'lamp_r'); v.set(18, 4, zc + 1, 'lamp_r');
  for (const s of [-1, 1]) v.seg([18, 4, zc + s], [21, 7, zc + s * 4], 0.4, 'gun_d');
  return one(v, 18);
}

export function toaster(): ModelDef {
  const v = new Vox(30, 26, 22), zc = 11;
  for (const s of [-1, 1]) tracks(v, 3, 27, 6, zc + s * 8 - 3, zc + s * 8 + 3, 3, 'gun_l');
  cbox(v, 4, 26, 5, 22, zc - 8, zc + 8, 'chrome', 2, 2);
  v.box(4, 26, 5, 7, zc - 8.5, zc + 8.5, 'gun');
  for (const zz of [zc - 4, zc + 2]) { v.box(8, 22, 18, 22.5, zz, zz + 2, 'black'); v.box(9, 21, 19, 24, zz + 0.4, zz + 1.6, 'bread'); v.box(9, 21, 23, 24, zz + 0.4, zz + 1.6, 'dirt'); }
  v.box(24, 27, 12, 14, zc + 6, zc + 8, 'gun_d'); v.box(26, 28, 9, 15, zc + 6.5, zc + 7.5, 'red');
  v.box(25.5, 26.5, 10, 12, zc - 5, zc - 1, 'lamp_o');
  return one(v, 28);
}

export function secDrone(): ModelDef {
  const v = new Vox(22, 12, 22), c = 11;
  v.ell(c, 5, c, 6, 4, 6, 'white');
  v.ell(c, 7, c, 5, 2.4, 5, 'white_d');
  v.ell(c + 4, 4, c, 2.6, 2.6, 2.6, 'gun_d'); v.ell(c + 5.6, 4, c, 1.2, 1.2, 1.2, 'eye_r');
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) v.seg([c, 6, c], [c + a * 8, 7, c + b * 8], 0.6, 'gun');
  v.box(c - 2, c + 2, 0, 2, c - 1, c + 1, 'gun_d');
  const parts: PartDef[] = [{ name: 'body', vox: v }];
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) parts.push({ name: 'rotor', vox: rotor(3.5, 'steel_l', 2), at: [a * 8, 8, b * 8] });
  return { size: 22, parts };
}

export function mixerBot(): ModelDef {
  const v = new Vox(30, 30, 24), zc = 12;
  for (const s of [-1, 1]) leg(v, [12, 12, zc + s * 5], [16, 6, zc + s * 7], [12, 0.5, zc + s * 8], 1.6, 'steel', 'gun_d');
  cbox(v, 6, 22, 10, 24, zc - 6, zc + 6, 'orange', 2, 2);
  v.box(6, 22, 22, 25, zc - 6, zc + 6, 'orange_d');
  v.box(20, 23, 14, 18, zc - 3, zc + 3, 'gun_d'); v.set(22, 16, zc - 1, 'lamp_g'); v.set(22, 16, zc + 1, 'lamp_g');
  for (const zz of [zc - 3, zc + 3]) { v.cylX(13, zz, 1, 22, 28, 'chrome'); for (let x = 24; x < 30; x += 2) v.cylX(13, zz, 2.4, x, x + 1, 'chrome'); }   // венчики
  v.box(8, 12, 24, 28, zc - 1, zc + 1, 'gun');
  return one(v, 28);
}

export function kettle(): ModelDef {
  const v = new Vox(34, 32, 30), zc = 15;
  for (const s of [-1, 1]) tracks(v, 4, 30, 7, zc + s * 10 - 3, zc + s * 10 + 3, 4, 'gun_l');
  v.box(6, 28, 4, 7, zc - 8, zc + 8, 'gun_d');
  v.cylY(16, zc, 11, 6, 22, 'red', 8);
  v.cylY(16, zc, 11.5, 6, 8, 'gun');
  v.cylY(16, zc, 8.6, 21, 23, 'chrome');
  v.cylY(16, zc, 2, 23, 25, 'gun_d');
  v.seg([5, 10, zc], [3, 20, zc], 1.6, 'gun_d'); v.seg([3, 20, zc], [9, 24, zc], 1.6, 'gun_d');   // ручка
  v.seg([25, 12, zc], [33, 20, zc], 2.2, 'red'); v.cylX(20, zc, 2.6, 31, 34, 'gun_d');            // носик
  v.box(14, 18, 12, 15, zc - 11, zc - 10, 'lamp_o');
  return one(v, 32);
}

export function washer(): ModelDef {
  const v = new Vox(42, 44, 40), zc = 20;
  for (const s of [-1, 1]) tracks(v, 2, 40, 10, zc + s * 15 - 5, zc + s * 15 + 5, 4, 'gun_l');
  cbox(v, 4, 38, 8, 42, zc - 16, zc + 16, 'white', 2, 2);
  v.box(4, 38, 36, 42, zc - 16.5, zc + 16.5, 'white_d');
  v.cylX(22, zc, 11, 37, 39, 'steel');
  v.cylX(22, zc, 9, 38, 39.5, 'glass_d');
  v.fill((x, y, z) => ((y - 20) ** 2 + (z - zc + 3) ** 2 < 25 ? 'fabric_b' : undefined), 38.6, 39.4, 14, 26, zc - 9, zc + 3);
  v.box(38, 39, 37, 40, zc - 12, zc - 4, 'gun_d'); v.cylX(38.5, zc + 8, 2, 38, 40, 'steel_l');
  v.box(38.5, 39.5, 38, 39, zc - 11, zc - 9, 'lamp_g');
  v.box(36, 42, 8, 16, zc - 16, zc + 16, 'gun');                                   // таран
  for (let z = zc - 14; z < zc + 14; z += 4) v.box(41, 43, 9, 15, z, z + 2, 'gun_d');
  return one(v, 40);
}

export function tv(): ModelDef {
  const b = new Vox(20, 6, 30), c = 15;
  b.box(2, 18, 0, 3, 2, 28, 'wood_d'); b.box(4, 16, 3, 6, c - 3, c + 3, 'gun_d');
  const t = new Vox(24, 34, 36), tc = 18;
  cbox(t, 2, 16, 0, 28, tc - 17, tc + 17, 'wood', 1, 1);
  t.box(14, 17, 3, 25, tc - 15, tc + 9, 'gun_d');
  t.box(16, 17.5, 4, 24, tc - 14, tc + 8, 'glow_c');
  t.paint((x, y) => (Math.floor(y) % 3 === 0 ? 'glass' : undefined), 16, 18, 4, 24, tc - 14, tc + 8);
  for (const y of [8, 14]) t.cylX(y, tc + 13, 1.6, 15, 17.5, 'gold');
  t.seg([8, 28, tc - 4], [2, 34, tc - 12], 0.5, 'chrome'); t.seg([8, 28, tc + 4], [2, 34, tc + 12], 0.5, 'chrome');
  return { size: 34, parts: [{ name: 'body', vox: b }, { name: 'turret', vox: t, pivot: [9, 0, tc], at: [0, 6, 0] }] };
}

export function vacGiant(): ModelDef {
  const v = new Vox(70, 50, 50), zc = 25;
  for (const s of [-1, 1]) tracks(v, 6, 64, 14, zc + s * 18 - 6, zc + s * 18 + 6, 5, 'gun_l');
  cbox(v, 8, 52, 12, 36, zc - 16, zc + 16, 'red', 4, 4);
  seams(v, 8, 52, 12, 36, zc - 16, zc + 16, 11, 0, 0, 'red_d');
  v.cylY(30, zc, 10, 36, 44, 'glass');
  v.cylY(30, zc, 8, 36, 41, 'stone');
  v.cylY(30, zc, 10.6, 43, 45, 'gun_d');
  for (let i = 0; i < 10; i++) v.sphere(52 + i * 1.6, 28 - i * 2.4, zc, 3.6, i % 2 ? 'gun' : 'gun_l');   // шланг
  cbox(v, 58, 70, 0, 7, zc - 14, zc + 14, 'gun_d', 2, 1);
  v.box(68, 70.5, 0, 3, zc - 13, zc + 13, 'black');
  for (const zz of [zc - 6, zc + 6]) { v.cylX(26, zz, 2, 2, 8, 'gun'); v.cylX(26, zz, 1.2, 1.5, 3, 'lamp_o'); }
  return one(v, 64);
}

// ---------------------------------------------------------------- босс: Холодильник-крепость
// Двухкамерный холодильник на гусеницах. Морозилка — башня с ледяной пушкой. Дверца спереди
// распахнута (слабое место): внутри светится и видна заиндевевшая начинка.
export function bossFridge(): ModelDef {
  const NX = 96, NZ = 92, c = NZ / 2;
  const h = new Vox(NX, 84, NZ);
  for (const s of [-1, 1]) {
    tracks(h, 6, 90, 20, c + s * 34 - 11, c + s * 34 + 11, 6, 'steel_l', 'gun_d');
    cbox(h, 10, 86, 16, 24, c + s * 34 - 12, c + s * 34 + 12, 'steel', 3, 2);
  }
  h.box(12, 84, 6, 20, c - 24, c + 24, 'gun_d');
  // корпус-камера
  cbox(h, 14, 70, 18, 80, c - 28, c + 28, 'white', 4, 3);
  seams(h, 14, 70, 18, 80, c - 28, c + 28, 0, 31, 0, 'white_d');
  h.box(14, 70, 18, 22, c - 28.5, c + 28.5, 'gun');
  // ниша распахнутой дверцы (спереди): полки, свет, лёд
  h.box(46, 70, 24, 76, c - 24, c + 24, 0);
  h.box(44, 47, 24, 76, c - 24, c + 24, 'glow_c');
  for (const y of [24, 38, 52, 64]) h.box(46, 68, y, y + 1.5, c - 24, c + 24, 'ice_l');
  h.box(50, 60, 25.5, 32, c - 20, c - 8, 'yel');                                    // сыр
  h.cylY(56, c + 12, 4, 25.5, 36, 'toy_g');                                         // бутылка
  h.box(48, 64, 39.5, 46, c - 6, c + 14, 'red_l');                                  // торт
  h.box(48, 64, 46, 47, c - 6, c + 14, 'white');
  for (let i = 0; i < 6; i++) h.ell(54 + i * 2, 66 + (i % 2), c - 18 + i * 7, 3, 2, 3, 'ice');
  h.box(44, 46, 24, 76, c - 24, c - 22, 'glow_c');
  h.paint((x, y, z) => (y > 74 && x > 40 ? 'ice_l' : undefined), 40, 70, 74, 80, 0, NZ);
  // дверца, распахнутая вбок, с решётками-пушками и магнитиками
  const dz = c + 28;
  h.box(70, 74, 22, 78, dz, dz + 1, 0);
  cbox(h, 70, 76, 22, 78, dz - 2, dz + 30, 'white', 1, 1);
  h.box(70, 71, 26, 74, dz + 1, dz + 28, 'white_d');
  for (const y of [32, 46, 60]) h.box(66, 70, y, y + 2, dz + 2, dz + 27, 'chrome');
  for (const [y, z, col] of [[64, dz + 6, 'red'], [56, dz + 18, 'toy_b'], [40, dz + 10, 'toy_y']] as const) h.box(75.5, 77, y, y + 4, z, z + 4, col);
  h.box(70, 74, 48, 52, dz + 26, dz + 30, 'gun_d');                                // петля
  // морозильная камера сверху стоит отдельно — башня
  const T = new Vox(80, 36, 64), tc = 32;
  cbox(T, 8, 46, 0, 22, tc - 22, tc + 22, 'white', 3, 3);
  T.box(44, 47, 2, 20, tc - 20, tc + 20, 'white_d');
  T.box(46, 48, 8, 12, tc + 8, tc + 16, 'gun');
  T.paint((x, y) => (y > 18 ? 'ice_l' : undefined), 0, 80, 18, 22, 0, 64);
  for (let i = 0; i < 7; i++) T.cylY(10 + i * 5.5, tc - 22 + (i % 2), 1 + (i % 3) * 0.4, 16 - (i % 3) * 3, 22, 'ice');   // сосульки
  for (const s of [-1, 1]) { gun(T, 40, 76, 10, tc + s * 10, 4, 'ice_d', 'steel'); T.cylX(10, tc + s * 10, 2, 74, 76.5, 'glow_c'); }
  pipe(T, 18, tc, 4, 22, 32, 'steel', 'ice');
  T.cylY(18, tc, 2.6, 31.9, 32.2, 'glow_c');
  return {
    size: 100,
    parts: [
      { name: 'hull', vox: h, pivot: [48, 0, c] },
      { name: 'turret', vox: T, pivot: [27, 0, tc], at: [-6, 80, 0] },
    ],
  };
}

// ---------------------------------------------------------------- препятствия
const CLUTTER = ['red', 'toy_b', 'toy_g', 'yel', 'purple', 'orange'];
export function clutter(v: number): ModelDef {
  const b = new Vox(16, 14, 16);
  const k = v % 5, col = CLUTTER[v % 6];
  if (k === 0) { b.cylY(8, 8, 6, 0, 10, 'steel'); b.cylY(8, 8, 6.4, 9, 11, 'gun'); b.box(12, 15, 4, 8, 7, 9, 'gun'); }                  // кастрюля
  else if (k === 1) { b.box(1, 15, 0, 3, 2, 14, col); b.box(3, 13, 3, 12, 4, 12, 'white'); b.box(3, 13, 12, 13, 4, 12, col); }          // коробка с подарком
  else if (k === 2) { b.ell(8, 4, 8, 7, 4, 6, col); b.ell(8, 7, 8, 4, 3, 3, 'white'); }                                                   // мяч-подушка
  else if (k === 3) { b.cylY(8, 8, 3, 0, 12, 'toy_g'); b.cylY(8, 8, 1.4, 12, 14, 'white'); }                                              // бутылка
  else { b.box(2, 14, 0, 6, 2, 14, 'cardboard'); b.box(2, 14, 5.5, 6, 7, 9, 'paper'); }
  return one(b, 16, [16, 16]);
}

export function houseWall(): ModelDef {
  const b = new Vox(24, 30, 8);
  b.box(0, 24, 0, 28, 0, 8, 'concrete_l');
  b.box(0, 24, 0, 3, -0.01, 8.01, 'wood_d');
  b.paint((x, y, z) => ((z < 0.6 || z > 7.4) && y > 3 && y < 27 ? ((Math.floor(x / 3) + Math.floor(y / 4)) % 2 ? 'cream' : 'paper') : undefined));
  b.box(0, 24, 27, 30, 0, 8, 'white_d');
  return one(b, 24, [24, 8]);
}

export function sofa(v: number): ModelDef {
  const b = new Vox(52, 18, 22), col = ['fabric_r', 'fabric_b', 'green'][v % 3];
  b.box(2, 50, 0, 3, 2, 20, 'wood_d');
  cbox(b, 1, 51, 3, 9, 1, 21, col, 1, 1);
  for (const x of [5, 18.5, 32]) cbox(b, x, x + 13, 9, 11, 4, 19, col, 1, 1);
  cbox(b, 1, 51, 3, 18, 1, 6, col, 1, 2);                                             // спинка
  for (const x of [0, 46]) cbox(b, x, x + 6, 3, 13, 1, 21, col, 1, 2);               // подлокотники
  b.paint((x, y) => (y < 5 ? undefined : undefined));
  return one(b, 52, [52, 22]);
}

export function table(): ModelDef {
  const b = new Vox(36, 20, 24);
  for (const [x, z] of [[2, 2], [32, 2], [2, 20], [32, 20]]) b.box(x, x + 2, 0, 16, z, z + 2, 'wood_d');
  b.box(0, 36, 16, 18, 0, 24, 'wood');
  b.box(4, 32, 18, 18.5, 4, 20, 'white');
  b.cylY(12, 12, 3, 18, 19.5, 'white'); b.cylY(24, 10, 2, 18, 22, 'glass');
  return one(b, 36, [36, 24]);
}

export function fridge(): ModelDef {
  const b = new Vox(22, 40, 18);
  cbox(b, 0, 22, 0, 40, 0, 18, 'white', 1, 1);
  b.box(21, 22.5, 26, 27, 0, 18, 'white_d');
  b.box(21.5, 23, 28, 34, 3, 4, 'chrome'); b.box(21.5, 23, 14, 22, 3, 4, 'chrome');
  b.box(21.5, 22.5, 30, 33, 9, 12, 'red'); b.box(21.5, 22.5, 18, 21, 12, 15, 'toy_b');
  return one(b, 22, [22, 18]);
}

export function tvStand(): ModelDef {
  const b = new Vox(40, 26, 14);
  b.box(0, 40, 0, 10, 0, 14, 'wood_d');
  b.box(1, 39, 2, 9, 13.5, 14.2, 'wood');
  b.box(6, 34, 10, 11, 4, 10, 'gun_d');
  b.box(4, 36, 11, 26, 6, 8, 'black');
  b.box(5, 35, 12, 25, 7.9, 8.4, 'navy');
  b.paint((x, y) => (x + y * 0.6 > 28 && x + y * 0.6 < 32 ? 'blue_l' : undefined), 5, 35, 12, 25, 7.9, 8.4);
  return one(b, 40, [40, 14]);
}

export function plant(v: number): ModelDef {
  const b = new Vox(16, 26, 16), c = 8;
  b.cylY(c, c, 5, 0, 7, v % 2 ? 'brick' : 'white', 6);
  b.cylY(c, c, 5, 6, 7, 'dirt_d');
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 2 + (i % 3) * 1.6, top = 14 + (i * 5) % 11; b.seg([c, 7, c], [c + Math.cos(a) * r, top, c + Math.sin(a) * r], 1.4, i % 2 ? 'leaf' : 'leaf_l'); }
  return one(b, 16, [16, 16]);
}

export function armchair(v: number): ModelDef {
  const b = new Vox(22, 18, 22), col = ['fabric_y', 'fabric_r', 'purple'][v % 3];
  cbox(b, 1, 21, 2, 9, 1, 21, col, 1, 1);
  cbox(b, 1, 6, 2, 18, 1, 21, col, 1, 2);
  for (const z of [0, 17]) cbox(b, 1, 21, 2, 13, z, z + 5, col, 1, 1);
  b.box(2, 20, 0, 2, 2, 20, 'wood_d');
  return one(b, 22, [22, 22]);
}

export function stove(): ModelDef {
  const b = new Vox(20, 22, 18);
  cbox(b, 0, 20, 0, 20, 0, 18, 'white', 1, 1);
  b.box(19.5, 20.5, 3, 13, 3, 15, 'gun_d'); b.box(19.6, 20.6, 4, 12, 4, 14, 'glass_d');
  for (const [x, z] of [[5, 5], [5, 13], [14, 5], [14, 13]]) { b.cylY(x, z, 3, 20, 20.6, 'gun_d'); b.cylY(x, z, 1.6, 20.4, 21, 'gun'); }
  for (let z = 3; z < 16; z += 3) b.cylX(16, z, 0.8, 20, 21, 'black');
  return one(b, 20, [20, 18]);
}

void gun;
