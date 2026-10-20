// Ступень I, враги и штаб: красная игрушечная армия (красный пластик/жесть, белые полосы, красные огоньки).
// Плотность как у танка игрока: ~1 воксель на пиксель кадра при обычном размере врага.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { track, barrel } from './hero';
import { cbox, rotor, wheel } from './kit';

const one = (v: Vox, size: number, foot?: [number, number]): ModelDef => ({ size, parts: [{ name: 'body', vox: v }], foot });

/** Пластиковый солдатик на подставке: каска, винтовка наперевес. */
export function soldier(): ModelDef {
  const v = new Vox(14, 18, 10), z = 5;
  v.ell(7, 0.6, z, 5.5, 0.8, 4.4, 'red_d');                                     // подставка
  v.box(5, 7, 1, 7, z - 2, z - 0.4, 'red'); v.box(6.5, 8.5, 1, 6, z + 0.4, z + 2, 'red');   // ноги (шаг)
  v.box(4.5, 8.5, 6, 11, z - 2.2, z + 2.2, 'red');                               // туловище
  v.box(5, 8, 7, 8, z - 2.3, z + 2.3, 'red_d');                                  // ремень
  v.box(5.5, 8, 11, 13.5, z - 1.4, z + 1.4, 'red_l');                            // голова
  v.ell(6.6, 14, z, 2.4, 1.1, 2.4, 'red_d');                                     // каска
  v.box(8, 13.5, 9, 10, z + 1.2, z + 2.2, 'gun_d');                              // винтовка
  v.box(8, 9.5, 8, 10, z + 0.6, z + 2.2, 'red');                                 // руки
  return one(v, 17);
}

/** Игрушечный танк: красная жесть, белая полоса, заводной ключ, красная фара. */
export function toyTank(): ModelDef {
  const L = 40, TW = 8, TH = 8, W = 30, NX = L + 6, NZ = W + 2, zc = NZ / 2, x0 = 3, x1 = 3 + L;
  const v = new Vox(NX, 22, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 4, 'gun', 'white_d');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 4, 'gun', 'white_d');
  v.box(x0 + 2, x1 - 2, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  const yb = TH - 2, yt = TH + 6, hz0 = TW - 1, hz1 = NZ - TW + 1;
  cbox(v, x0 + 1, x1 - 1, yb, yt, hz0, hz1, 'red', 1, 2);
  v.cut(0.8, 1, 0, 0.8 * (x1 - 9) + yt, x1 - 10, x1, yb, yt);
  v.paint((x, y) => (y >= yt - 3 && y < yt - 1.5 ? 'white' : undefined), x0, x1, yb, yt, 0, NZ);   // белая полоса
  v.paint(() => 'red_d', x0, x1, yb, yb + 1.2, 0, NZ);
  v.box(x1 - 3, x1 - 1, yb + 2, yb + 4, zc - 1.5, zc + 1.5, 'glow_r');                               // фара
  v.cylX(yt - 1, zc, 1.1, x0 - 4, x0 + 2, 'gold_d');                                                 // ключ
  v.box(x0 - 4, x0 - 3, yt - 4, yt + 2, zc - 3, zc + 3, 'gold');
  const t = new Vox(40, 12, 22), tc = 11, tcx = 11;
  t.cylY(tcx, tc, 8, 0, 6, 'red', 6.5);
  t.cylY(tcx, tc, 8.2, 2, 3.4, 'white');
  t.cylY(tcx, tc, 3, 6, 7.5, 'red_d');
  barrel(t, tcx + 6, tcx + 26, 3.5, tc, 1.6, 'gun_l', 'gun');
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [x0 + L * 0.45 - NX / 2, yt, 0] }] };
}

/** Игрушечный джип: колёса-шины, лобовое стекло, дуга, пулемёт на турели. */
export function jeep(): ModelDef {
  const v = new Vox(44, 20, 28), zc = 14;
  for (const x of [10, 33]) for (const [z0, z1] of [[1, 6], [22, 27]]) wheel(v, x, 5, 5, z0, z1, 'rubber', 'white_d');
  cbox(v, 3, 42, 4, 11, 4, 24, 'red', 1, 1);
  v.cut(1, 1.4, 0, 42 + 1.4 * 8, 34, 43, 4, 12);
  v.box(3, 42, 9, 10, 3.5, 24.5, 'white');                                       // полоса
  v.box(28, 30, 11, 17, 5, 23, 'gun_d'); v.box(28.5, 29.5, 12, 16.5, 6, 22, 'glass');   // лобовое стекло
  v.box(6, 26, 11, 12, 6, 22, 'red_d');                                           // салон
  v.box(8, 12, 11, 15, 8, 20, 'gun_d');                                           // сиденья
  v.seg([10, 11, 5], [12, 19, 5], 0.6, 'gun'); v.seg([10, 11, 23], [12, 19, 23], 0.6, 'gun'); v.seg([12, 19, 5], [12, 19, 23], 0.6, 'gun');   // дуга
  v.box(40, 42, 6, 8, 5, 8, 'glow_r'); v.box(40, 42, 6, 8, 20, 23, 'glow_r');
  const t = new Vox(24, 10, 12), tc = 6;
  t.cylY(6, tc, 2.4, 0, 3, 'gun_d');
  barrel(t, 7, 22, 3.5, tc, 0.9, 'gun', 'gun_d');
  t.box(4, 9, 3, 6, tc - 2, tc + 2, 'gun');
  return { size: 42, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [6, 0, tc], at: [-6, 11, 0] }] };
}

/** Игрушечный вертолёт: каплевидный фюзеляж, стекло кабины, хвост с винтом, лыжи, пусковые блоки. */
export function heli(): ModelDef {
  const v = new Vox(60, 22, 30), zc = 15;
  v.ell(32, 10, zc, 14, 7.5, 7, 'red');
  v.ell(40, 12, zc, 6.5, 5, 5, 'glass');
  v.ell(41, 13, zc, 4, 3, 3.6, 'glass_d');
  v.paint((x, y) => (y > 6.5 && y < 8.5 ? 'white' : undefined), 18, 46, 0, 22, 0, 30);
  v.seg([20, 11, zc], [2, 13, zc], 2.2, 'red');
  v.box(1, 6, 11, 21, zc - 0.8, zc + 0.8, 'red_d');                               // киль
  v.cylZ(4, 17, 3.5, zc + 1, zc + 2, 'gun_l');                                   // хвостовой винт
  for (const s of [-1, 1]) {
    v.seg([24, 1, zc + s * 7], [44, 1, zc + s * 7], 0.8, 'gun_d');
    v.seg([28, 1, zc + s * 7], [29, 5, zc + s * 5], 0.6, 'gun_d'); v.seg([40, 1, zc + s * 7], [39, 5, zc + s * 5], 0.6, 'gun_d');
    v.box(28, 38, 7, 9, zc + s * 7 - 1, zc + s * 12, 'red_d');                    // крылышко
    v.cylX(7, zc + s * 11, 1.6, 27, 39, 'gun'); v.cylX(7, zc + s * 11, 0.9, 38.5, 39.5, 'glow_r');
  }
  v.cylY(32, zc, 1.6, 17, 19, 'gun_d');
  const parts: PartDef[] = [{ name: 'body', vox: v }, { name: 'rotor', vox: rotor(22, 'gun_d', 2), at: [2, 18, 0] }];
  return { size: 54, parts };
}

/** Броневой танк: тяжёлый, наклонная броня, экраны с номером, толстый ствол. */
export function armorToy(): ModelDef {
  const L = 46, TW = 11, TH = 10, W = 38, NX = L + 6, NZ = W + 2, zc = NZ / 2, x0 = 3, x1 = 3 + L;
  const v = new Vox(NX, 26, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 5, 'gun', 'gun_l');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 5, 'gun', 'gun_l');
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  const yb = TH - 2, yt = TH + 8;
  cbox(v, x0 + 1, x1 - 1, yb, yt, 1, NZ - 1, 'red_d', 1, 3);
  v.cut(0.9, 1, 0, 0.9 * (x1 - 12) + yt, x1 - 13, x1, yb, yt);
  for (const [zo, zi] of [[0, 1], [NZ - 1, NZ]]) {                               // экраны с белыми номерами
    v.box(x0 + 4, x1 - 8, TH * 0.4, yb + 2, zo, zi, 'red');
    for (const dx of [0, 3]) v.box(x0 + 16 + dx, x0 + 17 + dx, TH * 0.4 + 2, yb, zo - 0.01, zi + 0.01, 'white');
  }
  for (let i = 0; i < 4; i++) v.box(x0 + 5 + i * 2, x0 + 6 + i * 2, yt - 1, yt, zc - 6, zc + 6, 'gun_d');
  v.box(x1 - 4, x1 - 2, yb + 3, yb + 5, zc - 7, zc - 5, 'glow_r'); v.box(x1 - 4, x1 - 2, yb + 3, yb + 5, zc + 5, zc + 7, 'glow_r');
  const t = new Vox(56, 14, 28), tc = 14, tcx = 14;
  t.fill((x, y, z) => { const dx = x - tcx, dz = Math.abs(z - tc); if (dx > 11 || dx < -12 || dz > 10) return undefined; if (Math.abs(dx) + dz > 18) return undefined; if (dx > 6 && y > 8 - (dx - 6)) return undefined; return 'red'; }, 0, 56, 0, 8, 0, 28);
  t.paint((x, y) => (y < 1.2 ? 'red_d' : y > 6.8 ? 'red_l' : undefined));
  t.box(tcx - 16, tcx - 11, 1, 6, tc - 7, tc + 7, 'gun_d');
  barrel(t, tcx + 9, tcx + 36, 4, tc, 2.4, 'gun_l', 'gun');
  t.cylY(tcx - 4, tc + 4, 2.8, 8, 10, 'gun'); t.set(tcx - 4, 10, tc + 4, 'glow_r');
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [x0 + L * 0.45 - NX / 2, yt, 0] }] };
}

/** Игрушечный миномёт: гусеничная платформа с открытым кузовом и толстой трубой, задранной вверх. */
export function mortar(): ModelDef {
  const L = 40, TW = 9, TH = 8, W = 32, NX = L + 4, NZ = W + 2, zc = NZ / 2, x0 = 2, x1 = 2 + L;
  const v = new Vox(NX, 18, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 4, 'gun', 'white_d');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 4, 'gun', 'white_d');
  cbox(v, x0 + 1, x1 - 1, TH - 2, TH + 5, TW - 1, NZ - TW + 1, 'red', 1, 1);
  v.box(x0 + 4, x1 - 4, TH + 2, TH + 5.2, TW + 1, NZ - TW - 1, 'red_d');           // открытый кузов
  v.box(x0 + 5, x0 + 11, TH + 2, TH + 5, TW + 2, TW + 7, 'gold_d');                // ящик мин
  v.paint((x, y) => (y >= TH + 3.5 ? 'white' : undefined), x0, x1, TH + 3.5, TH + 4.5, 0, TW + 0.5);
  const t = new Vox(30, 30, 16), tc = 8;
  t.cylY(8, tc, 4.5, 0, 3, 'gun_d');
  t.seg([8, 2, tc], [20, 20, tc], 3.2, 'gun');
  t.seg([19, 18.5, tc], [21, 21.5, tc], 3.8, 'gun_d');
  t.seg([20.5, 21, tc], [21, 22, tc], 2, 'black');
  t.seg([8, 2, tc - 4], [14, 9, tc - 3], 0.7, 'gun_d'); t.seg([8, 2, tc + 4], [14, 9, tc + 3], 0.7, 'gun_d');
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [8, 0, tc], at: [-2, TH + 5, 0] }] };
}

/** Танк на батарейках: большой, на корме — пара батареек со светящимися индикаторами, двойная пушка. */
export function bigToy(): ModelDef {
  const L = 60, TW = 14, TH = 13, W = 52, NX = L + 8, NZ = W + 2, zc = NZ / 2, x0 = 4, x1 = 4 + L;
  const v = new Vox(NX, 40, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 6, 'gun', 'white_d');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 6, 'gun', 'white_d');
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  const yb = TH - 2, yt = TH + 9;
  cbox(v, x0 + 1, x1 - 1, yb, yt, TW - 2, NZ - TW + 2, 'red', 2, 3);
  v.cut(0.8, 1, 0, 0.8 * (x1 - 13) + yt, x1 - 14, x1, yb, yt);
  v.paint((x, y) => (y >= yt - 4 && y < yt - 2.5 ? 'white' : undefined), x0, x1, yb, yt, 0, NZ);
  v.paint(() => 'red_d', x0, x1, yb, yb + 1.5, 0, NZ);
  // батарейки: медный плюс, чёрный корпус, светящаяся шкала заряда
  for (const zz of [zc - 7, zc + 7]) {
    v.cylX(yt + 5, zz, 5.5, x0 + 2, x0 + 24, 'black');
    v.cylX(yt + 5, zz, 5.6, x0 + 15, x0 + 24, 'copper');
    v.cylX(yt + 5, zz, 2.2, x0 + 24, x0 + 26, 'steel_l');
    for (let i = 0; i < 4; i++) v.box(x0 + 4 + i * 2.5, x0 + 5.5 + i * 2.5, yt + 10, yt + 10.6, zz - 1, zz + 1, 'glow_r');
  }
  v.box(x1 - 4, x1 - 2, yb + 3, yb + 5, zc - 10, zc - 7, 'glow_r'); v.box(x1 - 4, x1 - 2, yb + 3, yb + 5, zc + 7, zc + 10, 'glow_r');
  const t = new Vox(70, 16, 34), tc = 17, tcx = 17;
  t.cylY(tcx, tc, 13, 0, 9, 'red', 11);
  t.cylY(tcx, tc, 13.2, 3, 5, 'white');
  t.cylY(tcx - 3, tc + 5, 3.5, 9, 11, 'gun'); t.set(tcx - 3, 11, tc + 5, 'glow_r');
  t.box(tcx + 9, tcx + 15, 1, 8, tc - 7, tc + 7, 'red_d');
  for (const bz of [tc - 3.5, tc + 3.5]) barrel(t, tcx + 13, tcx + 46, 4.5, bz, 2.1, 'gun_l', 'gun');
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [x0 + L * 0.55 - NX / 2, yt, 0] }] };
}

/** Коробка-штаб: картонная крепость с бойницами, флагом и светящимися прорезями. */
export function toyBunker(): ModelDef {
  const n = 60, v = new Vox(n, 52, n), c = n / 2;
  cbox(v, 4, n - 4, 0, 30, 4, n - 4, 'cardboard', 1, 1);
  v.paint((x, y, z) => ((Math.floor(y) % 10 === 0) ? 'cardboard_d' : undefined), 4, n - 4, 0, 30, 4, n - 4);
  for (const zz of [3.5, n - 4.5]) v.box(4, n - 4, 0, 30, zz, zz + 1, 'cardboard');
  v.box(4, n - 4, 28, 30, c - 2, c + 2, 'paper');                                   // скотч
  // зубцы и клапаны коробки
  for (let x = 6; x < n - 6; x += 8) { v.box(x, x + 4, 30, 34, 4, 7, 'cardboard_d'); v.box(x, x + 4, 30, 34, n - 7, n - 4, 'cardboard_d'); }
  for (let z = 6; z < n - 6; z += 8) { v.box(4, 7, 30, 34, z, z + 4, 'cardboard_d'); v.box(n - 7, n - 4, 30, 34, z, z + 4, 'cardboard_d'); }
  // бойницы с красным светом
  for (const [x, z] of [[n - 4.5, c - 10], [n - 4.5, c + 6], [c - 10, n - 4.5], [c + 6, n - 4.5]]) v.box(x, x + 1.2, 14, 18, z, z + 4, 'glow_r');
  // нарисованная звезда
  for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + (a / 5) * Math.PI * 2; v.seg([n - 4, 20, c], [n - 4, 20 + Math.sin(an) * 7, c + Math.cos(an) * 7], 0.8, 'red'); }
  // флаг
  v.seg([12, 30, 12], [12, 51, 12], 0.6, 'gun_d');
  v.box(12, 13, 42, 50, 12, 24, 'red'); v.box(12, 13.2, 45, 47, 14, 22, 'white');
  return one(v, n, [n, n]);
}

/** Ящик снабжения: доски, металлические уголки, красный крест. */
export function crate(): ModelDef {
  const n = 36, v = new Vox(n, 30, n);
  v.box(0, n, 0, 28, 0, n, 'wood');
  v.paint((x, y, z) => ((x < 1 || x > n - 1 || z < 1 || z > n - 1 || y > 27) && Math.floor((y > 27 ? x : y) / 7) % 2 ? 'wood_l' : undefined));
  v.paint((x, y, z) => ((x < 1 || x > n - 1 || z < 1 || z > n - 1 || y > 27) && Math.floor(y > 27 ? x : y) % 7 === 0 ? 'wood_d' : undefined));
  for (const [x, z] of [[0, 0], [n - 3, 0], [0, n - 3], [n - 3, n - 3]]) v.box(x, x + 3, 0, 28, z, z + 3, 'gun_l');
  v.box(0, n, 26, 28.4, 0, n, 'gun_l'); v.box(2, n - 2, 27, 28.6, 2, n - 2, 'wood');
  for (const [a, b] of [[n / 2 - 2, n / 2 + 2]]) { v.box(a, b, 28.5, 29, 9, n - 9, 'red'); v.box(9, n - 9, 28.5, 29, a, b, 'red'); }
  return one(v, n, [n, n]);
}

/** Штаб: бункер с мешками песка, звездой и флагом. */
export function hq(): ModelDef {
  const n = 64, v = new Vox(n, 46, n), c = n / 2;
  // мешки с песком по кругу
  for (let a = 0; a < 28; a++) { const an = (a / 28) * Math.PI * 2; const x = c + Math.cos(an) * 28, z = c + Math.sin(an) * 28; v.ell(x, 2.5, z, 3.6, 2.6, 2.6, a % 2 ? 'sand' : 'sand_d'); v.ell(x + Math.cos(an + 0.11) * 0.5, 6.5, z + Math.sin(an + 0.11) * 0.5, 3.4, 2.4, 2.4, a % 2 ? 'sand_d' : 'sand'); }
  cbox(v, 12, n - 12, 0, 20, 12, n - 12, 'army', 3, 3);
  v.paint((x, y) => (Math.floor(y) % 6 === 0 ? 'army_d' : undefined), 12, n - 12, 0, 20, 12, n - 12);
  v.box(16, n - 16, 20, 24, 16, n - 16, 'army_d');
  v.box(n - 12.5, n - 11.5, 6, 12, c - 6, c + 6, 'gun_d');                          // дверь
  v.box(n - 12.5, n - 11.4, 13, 15, c - 9, c - 7, 'glow_r');
  for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + (a / 5) * Math.PI * 2; v.seg([c, 24, c], [c + Math.cos(an) * 8, 24, c + Math.sin(an) * 8], 1, 'gold'); }
  v.seg([18, 24, 18], [18, 45, 18], 0.6, 'gun_d');
  v.box(18, 19, 37, 44, 18, 31, 'red');
  v.seg([n - 18, 24, 20], [n - 20, 33, 22], 0.5, 'gun_d'); v.set(n - 20, 33, 22, 'glow_r');   // антенна
  return one(v, n, [n, n]);
}
