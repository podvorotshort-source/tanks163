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
  v.set(18, 4, zc - 1, 'glow_r'); v.set(18, 4, zc + 1, 'glow_r');
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
  v.box(25.5, 26.5, 10, 12, zc - 5, zc - 1, 'glow_r');
  return one(v, 28);
}

export function secDrone(): ModelDef {
  const v = new Vox(22, 12, 22), c = 11;
  v.ell(c, 5, c, 6, 4, 6, 'white');
  v.ell(c, 7, c, 5, 2.4, 5, 'white_d');
  v.ell(c + 4, 4, c, 2.6, 2.6, 2.6, 'gun_d'); v.ell(c + 5.6, 4, c, 1.2, 1.2, 1.2, 'glow_r');
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
  v.box(20, 23, 14, 18, zc - 3, zc + 3, 'gun_d'); v.set(22, 16, zc - 1, 'glow_r'); v.set(22, 16, zc + 1, 'glow_r');
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
  v.box(14, 18, 12, 15, zc - 11, zc - 10, 'glow_r');
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
  v.box(38.5, 39.5, 38, 39, zc - 11, zc - 9, 'glow_r');
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
  t.box(16, 17.5, 4, 24, tc - 14, tc + 8, 'glow_r');
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
  for (const zz of [zc - 6, zc + 6]) { v.cylX(26, zz, 2, 2, 8, 'gun'); v.cylX(26, zz, 1.2, 1.5, 3, 'glow_r'); }
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
  h.box(44, 47, 24, 76, c - 24, c + 24, 'glow_r');
  for (const y of [24, 38, 52, 64]) h.box(46, 68, y, y + 1.5, c - 24, c + 24, 'ice_l');
  h.box(50, 60, 25.5, 32, c - 20, c - 8, 'yel');                                    // сыр
  h.cylY(56, c + 12, 4, 25.5, 36, 'toy_g');                                         // бутылка
  h.box(48, 64, 39.5, 46, c - 6, c + 14, 'red_l');                                  // торт
  h.box(48, 64, 46, 47, c - 6, c + 14, 'white');
  for (let i = 0; i < 6; i++) h.ell(54 + i * 2, 66 + (i % 2), c - 18 + i * 7, 3, 2, 3, 'ice');
  h.box(44, 46, 24, 76, c - 24, c - 22, 'glow_r');
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
  for (const s of [-1, 1]) { gun(T, 40, 76, 10, tc + s * 10, 4, 'ice_d', 'steel'); T.cylX(10, tc + s * 10, 2, 74, 76.5, 'glow_r'); }
  pipe(T, 18, tc, 4, 22, 32, 'steel', 'ice');
  T.cylY(18, tc, 2.6, 31.9, 32.2, 'glow_r');
  return {
    size: 100,
    parts: [
      { name: 'hull', vox: h, pivot: [48, 0, c] },
      { name: 'turret', vox: T, pivot: [27, 0, tc], at: [-6, 80, 0] },
    ],
  };
}

// ---------------------------------------------------------------- препятствия (квартира)
const CLUTTER = ['red', 'toy_b', 'toy_g', 'yel', 'purple', 'orange'];
/** Мелочи на полу: кастрюля, подарок, мяч, бутылка, коробка из-под пиццы, рулон. */
export function clutter(v: number): ModelDef {
  const n = 32, b = new Vox(n, 26, n), c = n / 2;
  const k = v % 6, col = CLUTTER[v % 6];
  if (k === 0) { b.cylY(c, c, 12, 0, 18, 'steel'); b.cylY(c, c, 11, 2, 19, 0); b.cylY(c, c, 12.6, 17, 19, 'steel_l'); b.box(c + 11, c + 16, 13, 15, c - 2, c + 2, 'gun_d'); b.box(c - 16, c - 11, 13, 15, c - 2, c + 2, 'gun_d'); b.cylY(c, c, 10.5, 2, 3, 'red_d'); }
  else if (k === 1) { cbox(b, 4, 28, 0, 20, 4, 28, col, 1, 1); b.box(4, 28, 0, 20.4, c - 2, c + 2, 'gold'); b.box(c - 2, c + 2, 0, 20.4, 4, 28, 'gold'); b.ell(c - 3, 22, c, 3, 2, 2, 'gold'); b.ell(c + 3, 22, c, 3, 2, 2, 'gold'); }
  else if (k === 2) { b.sphere(c, 12, c, 11.5, col); b.paint((x, y, z) => (Math.abs(x - c) < 1.4 || Math.abs(y - 12) < 1.4 ? 'white' : undefined)); }
  else if (k === 3) { b.cylY(c, c, 5, 0, 18, 'toy_g'); b.cylY(c, c, 3, 18, 22, 'toy_g'); b.cylY(c, c, 1.8, 22, 25, 'white'); b.cylY(c, c, 5.2, 6, 12, 'paper'); }
  else if (k === 4) { cbox(b, 2, 30, 0, 4, 2, 30, 'cardboard', 0, 1); b.cylY(c, c, 8, 4, 4.6, 'red'); b.box(8, 24, 4, 4.4, 8, 24, 'cardboard_d'); }
  else { b.cylZ(c, 8, 8, 4, 28, 'white'); b.cylZ(c, 8, 3, 3.9, 28.1, 'cardboard'); }
  return one(b, n, [n, n]);
}

/** Межкомнатная стена: обои с узором, плинтус, побелённый торец, розетка и выключатель. */
export function houseWall(): ModelDef {
  const X = 120, Z = 14, H = 76, b = new Vox(X, H, Z);
  b.box(0, X, 0, H, 0, Z, 'concrete_l');
  b.box(0, X, H - 3, H, 0, Z, 'white');
  b.paint((x, y, z) => ((z < 0.6 || z > Z - 0.6) && y > 6 && y < H - 4 ? (((Math.floor(x / 10) + Math.floor(y / 10)) % 2) && ((x + y) % 10 < 2) ? 'fabric_y' : (Math.floor(x / 10) % 2 ? 'cream' : 'paper')) : undefined));
  for (const z of [-0.2, Z - 0.8]) b.box(0, X, 0, 6, z, z + 1, 'wood_d');
  b.box(30, 35, 12, 16, Z - 0.6, Z + 0.3, 'white'); b.box(31.5, 33.5, 13, 15, Z, Z + 0.4, 'gun_d');      // розетка
  b.box(80, 84, 40, 46, -0.3, 0.6, 'white');                                                              // выключатель
  return one(b, X, [X, Z]);
}

const SOFA_COLS: [string, string][] = [['fabric_b', 'navy'], ['fabric_r', 'red_d'], ['green', 'green_d'], ['khaki', 'khaki_d']];
/** Диван: подушки сиденья, спинка, подлокотники, декоративные подушки, плед. */
export function sofa(v: number): ModelDef {
  const X = 200, Z = 84, b = new Vox(X, 64, Z), [col, dk] = SOFA_COLS[v % SOFA_COLS.length];
  for (const [x, z] of [[6, 6], [X - 10, 6], [6, Z - 10], [X - 10, Z - 10]]) b.box(x, x + 4, 0, 6, z, z + 4, 'wood_d');
  cbox(b, 0, X, 6, 22, 0, Z, dk, 2, 2);
  for (let i = 0; i < 3; i++) { const x0 = 18 + i * 55; cbox(b, x0, x0 + 54, 22, 32, 8, Z - 4, col, 2, 3); }
  cbox(b, 0, X, 22, 60, 0, 20, col, 2, 4);                                                             // спинка
  for (let i = 0; i < 3; i++) b.box(18 + i * 55, 19 + i * 55, 24, 58, 19, 20.4, dk);
  for (const x0 of [0, X - 18]) cbox(b, x0, x0 + 18, 22, 44, 0, Z, col, 3, 5);                          // подлокотники
  b.ell(40, 40, 30, 12, 9, 6, 'fabric_y'); b.ell(150, 40, 30, 12, 9, 6, 'white');
  b.fill((x, y, z) => (y < 34 + Math.sin(x * 0.2) * 1.5 && y > 30 && z > 30 && z < 60 ? 'red' : undefined), 120, 170, 30, 36, 30, 60);   // плед
  b.paint((x, y, z) => ((x + z) % 6 === 0 ? 'white' : undefined), 120, 170, 30, 36, 30, 60);
  return one(b, X, [X, Z]);
}

/** Обеденный стол: ножки, скатерть с бахромой, ваза с цветами, тарелки и чашки. */
export function table(): ModelDef {
  const X = 180, Z = 120, H = 52, b = new Vox(X, H + 32, Z);
  for (const [x, z] of [[8, 8], [X - 14, 8], [8, Z - 14], [X - 14, Z - 14]]) b.box(x, x + 6, 0, H, z, z + 6, 'wood_d');
  b.box(0, X, H - 4, H, 0, Z, 'wood');
  b.box(-2, X + 2, H, H + 1, -2, Z + 2, 'white');                                                     // скатерть
  b.fill((x, y, z) => ((x < 0 || x > X || z < 0 || z > Z) && y > H - 10 && y < H ? 'white' : undefined), -2, X + 2, H - 10, H, -2, Z + 2);
  b.paint((x, y, z) => ((Math.floor(x / 10) + Math.floor(z / 10)) % 2 ? 'red' : undefined), -2, X + 2, H, H + 1, -2, Z + 2);
  b.paint((x, y) => (y < H - 8 && Math.floor(x) % 3 === 0 ? 'red' : undefined), -2, X + 2, H - 10, H, -2, Z + 2);
  b.cylY(X / 2, Z / 2, 7, H + 1, H + 16, 'glass'); b.cylY(X / 2, Z / 2, 5, H + 15, H + 17, 'glass_d');
  for (const [dx, dz, col] of [[-5, 0, 'red'], [4, -3, 'toy_y'], [2, 5, 'pink'], [-2, -5, 'purple']] as [number, number, string][]) { b.seg([X / 2, H + 15, Z / 2], [X / 2 + dx * 1.6, H + 26, Z / 2 + dz * 1.6], 0.6, 'grass_d'); b.sphere(X / 2 + dx * 1.6, H + 27, Z / 2 + dz * 1.6, 3, col); }
  for (const [x, z] of [[40, 30], [140, 30], [40, 90], [140, 90]]) { b.cylY(x, z, 12, H + 1, H + 2, 'white_d'); b.cylY(x, z, 9, H + 1.5, H + 2.2, 'white'); b.cylY(x + 14, z, 4, H + 1, H + 7, 'cream'); }
  return one(b, X, [X, Z]);
}

/** Холодильник: эмаль, две дверцы, ручки, магниты, на крыше — коробки. */
export function fridge(): ModelDef {
  const X = 90, Z = 76, H = 150, b = new Vox(X, H + 20, Z);
  cbox(b, 0, X, 0, H, 0, Z, 'white', 3, 3);
  b.paint((x, y, z) => (Math.min(z, Z - z) < 1.5 ? 'white_d' : undefined));
  b.box(X - 0.5, X + 0.5, 4, H - 4, 3, Z - 3, 'white');
  b.box(X - 0.5, X + 1, 98, 100, 2, Z - 2, 'white_d');
  for (const y of [[40, 90], [110, 140]]) b.box(X + 1, X + 3, y[0], y[1], 8, 11, 'chrome');
  for (const [y, z, col] of [[124, 40, 'red'], [118, 56, 'toy_y'], [70, 50, 'blue'], [60, 30, 'toy_g']] as [number, number, string][]) b.box(X + 0.5, X + 1.5, y, y + 5, z, z + 6, col);
  b.box(X + 0.5, X + 1.2, 70, 90, 24, 40, 'paper');
  cbox(b, 10, 60, H, H + 14, 10, 60, 'cardboard', 1, 1);
  return one(b, X, [X, Z]);
}

/** Тумба с телевизором: плоский экран (светится заставкой), колонки, приставка, комнатное растение. */
export function tvStand(): ModelDef {
  const X = 200, Z = 70, b = new Vox(X, 110, Z);
  cbox(b, 0, X, 0, 30, 0, Z, 'wood_d', 1, 1);
  for (const x of [8, 72, 136]) b.box(x, x + 56, 4, 26, Z - 0.5, Z + 0.3, 'wood');
  b.box(80, 120, 30, 34, 20, 50, 'gun_d');
  b.box(20, 180, 38, 104, 30, 36, 'black');                                                          // экран
  b.box(22, 178, 40, 102, 35.6, 36.4, 'navy_d');
  b.paint((x, y) => (y > 70 && y < 74 && x > 40 && x < 160 ? 'blue_l' : x > 60 && x < 100 && y > 50 && y < 66 ? 'blue' : undefined), 22, 178, 40, 102, 36, 36.5);
  b.box(96, 104, 30, 38, 30, 36, 'gun_d');
  for (const x of [6, 182]) { b.box(x, x + 12, 30, 70, 20, 50, 'gun'); b.cylZ(x + 6, 56, 4, 49, 50.5, 'gun_d'); b.cylZ(x + 6, 42, 3, 49, 50.5, 'gun_d'); }
  b.box(130, 160, 30, 36, 50, 66, 'black'); b.set(155, 34, 66, 'lamp_g');
  return one(b, X, [X, Z]);
}

/** Комнатное растение: керамический горшок, пышная листва. */
export function plant(v: number): ModelDef {
  const n = 60, b = new Vox(n, 90, n), c = n / 2, pot = ['terracotta', 'white', 'blue'][v % 3];
  b.cylY(c, c, 15, 0, 26, pot === 'terracotta' ? 'orange_d' : pot, 18);
  b.cylY(c, c, 18.6, 24, 28, pot === 'terracotta' ? 'orange' : pot === 'white' ? 'white_d' : 'blue_d');
  b.cylY(c, c, 16, 27, 28.5, 'dirt_d');
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 6 + (i % 4) * 4, hy = 40 + (i * 13) % 40;
    b.seg([c, 28, c], [c + Math.cos(a) * r, hy, c + Math.sin(a) * r], 0.7, 'grass_d');
    b.ell(c + Math.cos(a) * (r + 6), hy + 2, c + Math.sin(a) * (r + 6), 9, 3, 5, i % 3 ? 'leaf' : 'leaf_l');
  }
  return one(b, n, [n, n]);
}

const ARM_COLS = ['fabric_r', 'fabric_b', 'green', 'fabric_y'];
/** Кресло: глубокое сиденье, высокая спинка, округлые подлокотники, подушка. */
export function armchair(v: number): ModelDef {
  const n = 90, b = new Vox(n, 80, n), col = ARM_COLS[v % ARM_COLS.length];
  for (const [x, z] of [[6, 6], [n - 10, 6], [6, n - 10], [n - 10, n - 10]]) b.box(x, x + 4, 0, 8, z, z + 4, 'wood_d');
  cbox(b, 0, n, 8, 30, 0, n, col, 3, 3);
  cbox(b, 14, n - 4, 30, 40, 14, n - 14, col, 2, 3);
  cbox(b, 0, 22, 30, 76, 0, n, col, 3, 5);
  for (const z0 of [0, n - 16]) cbox(b, 6, n, 30, 52, z0, z0 + 16, col, 3, 5);
  b.ell(40, 46, n / 2, 8, 10, 14, 'white');
  b.paint((x, y, z) => ((x + y + z) % 9 === 0 ? 'white' : undefined), 0, n, 8, 76, 0, n);
  return one(b, n, [n, n]);
}

/** Плита: эмаль, четыре конфорки (одна раскалена), духовка со стеклом, кастрюля и сковорода. */
export function stove(): ModelDef {
  const X = 90, Z = 84, H = 76, b = new Vox(X, H + 30, Z);
  cbox(b, 0, X, 0, H, 0, Z, 'white', 2, 1);
  b.box(X - 0.5, X + 0.5, 10, 50, 10, Z - 10, 'gun_d'); b.box(X - 0.4, X + 0.7, 16, 44, 16, Z - 16, 'glass_d');
  b.box(X + 0.5, X + 3, 52, 55, 12, Z - 12, 'chrome');
  for (let i = 0; i < 4; i++) b.cylX(64, 14 + i * 18, 3, X, X + 3, 'gun');
  b.box(0, X, H, H + 1, 0, Z, 'gun_d');
  for (const [x, z, hot] of [[24, 22, false], [66, 22, true], [24, 62, false], [66, 62, false]] as [number, number, boolean][]) { b.cylY(x, z, 14, H, H + 2, 'black'); b.cylY(x, z, 10, H + 1.5, H + 2.2, hot ? 'lava' : 'gun'); }
  b.cylY(24, 62, 13, H + 2, H + 18, 'steel'); b.cylY(24, 62, 12, H + 4, H + 18.1, 0); b.cylY(24, 62, 11, H + 4, H + 14, 'fabric_r'); b.box(37, 46, H + 14, H + 16, 60, 64, 'gun_d');
  b.cylY(24, 22, 14, H + 2, H + 6, 'gun_d'); b.box(38, 62, H + 4, H + 6, 20, 24, 'gun_d');
  for (let i = 0; i < 3; i++) b.ell(20 + i * 5, H + 7, 20 + (i % 2) * 5, 3, 1, 2.5, 'yel_l');           // яичница
  b.box(0, 4, H, H + 24, 0, Z, 'white'); b.box(0, 4.4, H + 10, H + 20, 10, Z - 10, 'gun');          // задняя панель с часами
  b.box(3.6, 4.6, H + 13, H + 17, Z / 2 - 6, Z / 2 + 6, 'glow_r');
  return one(b, X, [X, Z]);
}
