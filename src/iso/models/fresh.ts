// Новые враги ступеней VI (район: стройка и коммунальная техника), VII (бронетрамвай), VIII (страна: колонны,
// тягачи, крылатые ракеты, дирижабли) и X (тарелки, кометы, звёздные пушки). Метка вражеской армии —
// красные огоньки и красные полосы. Плотность ~1 воксель на пиксель кадра.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { track, barrel } from './hero';
import { cbox, wheel, rotor, one } from './kit';

const wheels = (v: Vox, xs: number[], z0: number, z1: number, r: number, hub = 'steel') => { for (const x of xs) for (const [a, b] of [[z0 - 3, z0], [z1, z1 + 3]]) wheel(v, x, r, r, a, b, 'rubber', hub); };

// ============================================================================ VI. Район
/** Мини-погрузчик: жёлтый кузов, ковш спереди, кабина-клетка, красный проблесковый маячок. */
export function loader(): ModelDef {
  const v = new Vox(26, 18, 18), zc = 9;
  wheels(v, [7, 17], 3, 15, 3.4);
  cbox(v, 3, 20, 3, 9, 3, 15, 'yel_d', 1, 1);
  v.box(5, 14, 9, 16, 4, 14, 'gun'); v.box(5.4, 13.6, 9.6, 15.4, 4.4, 13.6, 0); v.box(13, 14, 10, 15, 4.6, 13.4, 'glass');
  v.box(4, 15, 15, 16, 3.5, 14.5, 'yel_d');
  v.box(20, 25, 1, 6, 2, 16, 'steel'); v.box(24, 26, 0, 2, 2, 16, 'steel_l');                        // ковш
  v.seg([16, 8, 3], [21, 4, 3], 0.7, 'gun_d'); v.seg([16, 8, 15], [21, 4, 15], 0.7, 'gun_d');
  v.box(4, 20, 6, 7, 2.6, 15.4, 'red');                                                              // красная полоса
  v.box(9, 11, 16, 18, zc - 1, zc + 1, 'glow_r');
  return one(v, 22);
}

/** Бульдозер: широкий отвал с зубьями, гусеницы, кабина, выхлопная труба, красные полосы на отвале. */
export function bulldozer(): ModelDef {
  const L = 34, TW = 9, TH = 9, W = 30, NX = L + 12, NZ = W + 6, zc = NZ / 2, x0 = 3, x1 = x0 + L;
  const v = new Vox(NX, 26, NZ);
  track(v, x0, x1, TH, 3, 3 + TW, 3, 4, 'gun', 'steel_d');
  track(v, x0, x1, TH, NZ - 3 - TW, NZ - 3, NZ - 4, 4, 'gun', 'steel_d');
  cbox(v, x0 + 2, x1 - 4, TH - 2, TH + 6, 6, NZ - 6, 'yel_d', 1, 1);
  cbox(v, x0 + 4, x0 + 16, TH + 6, TH + 15, 9, NZ - 9, 'yel_d', 1, 1); v.box(x0 + 15.6, x0 + 16.2, TH + 8, TH + 14, 10, NZ - 10, 'glass');
  v.cylY(x1 - 10, zc + 6, 1.2, TH + 6, TH + 14, 'gun_d');
  // отвал: изогнутая плита перед гусеницами
  v.fill((x, y, z) => { const c = x1 + 3 + Math.pow((y - 8) / 9, 2) * 3; return Math.abs(x - c) < 1.5 && y < 17 ? ((Math.floor(z / 4) + Math.floor(y / 4)) % 2 && y > 8 ? 'red' : 'steel') : undefined; }, x1, x1 + 8, 0, 17, 0, NZ);
  for (let z = 1; z < NZ - 1; z += 3) v.box(x1 + 3.5, x1 + 5.5, 0, 1.5, z, z + 1.5, 'steel_l');
  for (const s of [-1, 1]) v.seg([x1 - 6, TH + 2, zc + s * 10], [x1 + 2, 9, zc + s * 10], 1, 'gun_d');
  v.box(x0 + 8, x0 + 10, TH + 15, TH + 16.5, zc - 1, zc + 1, 'glow_r');
  return one(v, 36);
}

/** Автокран-турель: колёсное шасси, поворотная платформа с телескопической стрелой-пушкой. */
export function craneTruck(): ModelDef {
  const v = new Vox(46, 18, 24), zc = 12;
  wheels(v, [8, 18, 30, 39], 4, 20, 3.6);
  cbox(v, 2, 44, 4, 9, 4, 20, 'orange_d', 1, 1);
  cbox(v, 36, 45, 9, 17, 5, 19, 'orange', 1, 1); v.box(44.6, 45.2, 11, 16, 6, 18, 'glass');
  v.box(2, 44, 7, 8, 3.6, 20.4, 'red');
  for (const s of [-1, 1]) { v.box(4, 8, 2, 4, zc + s * 12 - 1.5, zc + s * 12 + 1.5, 'gun_d'); v.box(30, 34, 2, 4, zc + s * 12 - 1.5, zc + s * 12 + 1.5, 'gun_d'); }   // опоры
  v.box(43, 45, 17, 18.5, zc - 1, zc + 1, 'glow_r');
  const t = new Vox(56, 16, 16), tc = 8;
  cbox(t, 0, 16, 0, 8, 1, 15, 'orange', 1, 1);
  t.box(2, 14, 8, 10, 4, 12, 'gun'); t.box(8, 10, 8, 10.6, 6, 10, 'glow_r');
  t.seg([8, 7, tc], [44, 12, tc], 2.4, 'orange_d'); t.seg([14, 8.2, tc], [52, 13.6, tc], 1.6, 'yel_d');
  barrel(t, 46, 56, 13.8, tc, 1.2, 'gun', 'gun_d', 'glow_r');
  return { size: 40, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [8, 0, tc], at: [-6, 9, 0] }] };
}

/** Бетономешалка-миномёт: грузовик с вращающимся полосатым барабаном, из горловины которого летят бетонные «мины». */
export function mixerTruck(): ModelDef {
  const v = new Vox(48, 26, 24), zc = 12;
  wheels(v, [8, 18, 38], 4, 20, 3.8);
  cbox(v, 2, 46, 4, 8, 4, 20, 'gun', 1, 1);
  cbox(v, 36, 47, 8, 18, 4, 20, 'white', 1, 1); v.box(46.6, 47.2, 11, 17, 5, 19, 'glass'); v.box(36, 47, 12, 13, 3.6, 20.4, 'red');
  v.box(45, 47, 18, 19.5, zc - 2, zc + 2, 'glow_r');
  const d = new Vox(36, 24, 24), c = 12;
  d.fill((x, y, z) => { const r = Math.hypot(y - c, z - c), R = x < 6 ? 6 + x * 0.9 : x > 26 ? 11 - (x - 26) * 0.7 : 11; return r < R ? ((Math.floor((Math.atan2(z - c, y - c) * 3 + x * 0.5)) % 2) ? 'orange' : 'white') : undefined; }, 0, 36, 0, 24, 0, 24);
  d.cylX(c, c, 3, 33, 36, 'gun_d'); d.cylX(c, c, 1.6, 35.5, 36.1, 'glow_r');
  return { size: 42, parts: [{ name: 'hull', vox: v }, { name: 'spin', vox: d, pivot: [18, c, c], at: [-6, 16, 0], axis: 'x' }] };
}

/** Дрон-прораб: оранжевая каска-корпус, четыре винта, прожектор и красный огонёк. */
export function inspectDrone(): ModelDef {
  const v = new Vox(26, 10, 26), c = 13;
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { v.seg([c, 4, c], [c + a * 9, 4, c + b * 9], 0.8, 'gun'); v.cylY(c + a * 9, c + b * 9, 2.4, 3, 5, 'gun_d'); }
  v.ell(c, 5, c, 6, 4, 5, 'orange'); v.box(c - 6.5, c + 6.5, 4, 5, c - 5.5, c + 5.5, 'orange_d');
  v.box(c + 5, c + 7, 2, 4, c - 1.5, c + 1.5, 'lamp'); v.set(c, 9, c, 'glow_r');
  const parts: PartDef[] = [{ name: 'body', vox: v }];
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) parts.push({ name: 'rotor', vox: rotor(4, 'steel_l', 2), at: [a * 9, 6, b * 9] });
  return { size: 24, parts };
}

/** Подрывник: пикап, гружёный ящиками динамита с мигающими красными таймерами. */
export function demoTruck(): ModelDef {
  const v = new Vox(34, 18, 20), zc = 10;
  wheels(v, [7, 26], 3, 17, 3.4);
  cbox(v, 2, 32, 3, 9, 3, 17, 'army_d', 1, 1);
  cbox(v, 20, 32, 9, 15, 4, 16, 'army_d', 1, 1); v.box(31.6, 32.2, 10, 14, 5, 15, 'glass');
  for (const [x, z] of [[5, 6], [5, 12], [11, 6], [11, 12]]) { v.box(x, x + 5, 9, 13, z, z + 4, 'red'); v.box(x + 1, x + 4, 13, 13.6, z + 1, z + 3, 'black'); v.set(x + 2, 13.6, z + 2, 'glow_r'); }
  v.box(2, 32, 6, 7, 2.6, 17.4, 'red');
  return one(v, 26);
}

/** Карьерный самосвал: огромные колёса, кузов с козырьком над кабиной, лестница, красные огни. */
export function dumpTruck(): ModelDef {
  const v = new Vox(66, 40, 44), zc = 22;
  for (const x of [12, 52]) for (const [z0, z1] of [[0, 9], [35, 44]]) { v.cylZ(x, 10, 10, z0, z1, 'rubber'); v.cylZ(x, 10, 5, z0 - 0.1, z1 + 0.1, 'yel_d'); for (let a = 0; a < 16; a++) { const an = (a / 16) * Math.PI * 2; v.box(x + Math.cos(an) * 9.6 - 0.5, x + Math.cos(an) * 9.6 + 0.5, 10 + Math.sin(an) * 9.6 - 0.5, 10 + Math.sin(an) * 9.6 + 0.5, z0, z1, 'rubber_l'); } }
  v.box(4, 62, 10, 16, 10, 34, 'gun_d');
  v.fill((x, y, z) => (y > 16 && y < 34 && z > 3 && z < 41 && y < 16 + (x - 2) * 0.6 + 6 ? 'yel_d' : undefined), 2, 50, 16, 34, 3, 41);   // кузов
  v.box(6, 50, 30, 31, 4, 40, 'yel'); v.box(8, 48, 24, 30.5, 6, 38, 'dirt_d');
  v.box(48, 62, 16, 32, 8, 36, 'yel_d'); v.box(48, 64, 32, 34, 3, 41, 'yel');                          // кабина и козырёк
  v.box(61.6, 62.2, 22, 30, 10, 34, 'glass');
  v.box(2, 62, 18, 19, 2.6, 41.4, 'red');
  for (const z of [6, 38]) v.box(62, 63, 18, 21, z - 2, z + 2, 'glow_r');
  for (let y = 4; y < 30; y += 3) v.box(60, 62, y, y + 1, 40, 42, 'gun');
  return one(v, 60);
}

/** Башенный кран (враг-спаунер): решётчатая башня, стрела, кабина с красными окнами, крюк с контейнером. */
export function towerCrane(): ModelDef {
  const n = 30, H = 70, v = new Vox(80, H + 10, n), c = n / 2, bx = 22;
  cbox(v, bx - 10, bx + 10, 0, 6, c - 10, c + 10, 'concrete', 1, 1);
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) v.seg([bx + dx, 6, c + dz], [bx + dx, H, c + dz], 0.6, 'orange');
  for (let y = 6; y < H; y += 6) { v.seg([bx - 3, y, c - 3], [bx + 3, y + 6, c - 3], 0.4, 'orange_d'); v.seg([bx - 3, y, c + 3], [bx + 3, y + 6, c + 3], 0.4, 'orange_d'); }
  v.box(0, 80, H, H + 3, c - 2, c + 2, 'orange'); for (let x = 2; x < 78; x += 6) v.seg([x, H, c], [x + 3, H + 3, c], 0.4, 'orange_d');
  cbox(v, 0, 10, H - 8, H, c - 5, c + 5, 'concrete_d', 1, 1);
  cbox(v, bx + 4, bx + 12, H - 8, H, c - 4, c + 4, 'white', 1, 1); v.box(bx + 11.6, bx + 12.2, H - 7, H - 2, c - 3, c + 3, 'glow_r');
  v.seg([60, H, c], [60, 30, c], 0.3, 'gun_d'); cbox(v, 52, 68, 18, 30, c - 6, c + 6, 'red', 1, 1); v.box(52, 68, 23, 24, c - 6.2, c + 6.2, 'white');
  v.set(bx, H + 6, c, 'glow_r'); v.seg([bx, H + 3, c], [bx, H + 6, c], 0.4, 'gun');
  return one(v, 70, [30, 30]);
}

// ============================================================================ VII. Город
/** Бронетрамвай: вагон в бронелистах, пантограф, две башенки, красная полоса. */
export function tram(): ModelDef {
  const X = 70, v = new Vox(X, 34, 26), zc = 13;
  for (const x of [10, 18, 52, 60]) for (const [a, b] of [[3, 6], [20, 23]]) v.cylZ(x, 3.5, 3.5, a, b, 'gun');
  cbox(v, 2, X - 2, 4, 22, 3, 23, 'steel', 2, 2);
  v.paint((x, y) => (y > 10 && y < 13 ? 'red' : undefined), 2, X - 2, 4, 22, 2, 24);
  for (let x = 8; x < X - 8; x += 8) { v.box(x, x + 5, 14, 19, 2.6, 3.2, 'glass_d'); v.box(x, x + 5, 14, 19, 22.8, 23.4, 'glass_d'); }
  for (const x of [2, X - 3]) v.box(x, x + 1, 14, 19, 6, 20, 'glow_r');
  v.box(4, X - 4, 22, 24, 6, 20, 'steel_d');
  v.seg([X / 2, 24, zc], [X / 2 + 8, 31, zc], 0.5, 'gun_d'); v.seg([X / 2 + 8, 31, zc], [X / 2 + 2, 33, zc], 0.5, 'gun_d'); v.box(X / 2, X / 2 + 6, 33, 34, zc - 4, zc + 4, 'gun');
  for (const x of [14, X - 14]) { v.cylY(x, zc, 4, 24, 28, 'steel_d'); v.cylX(26, zc, 0.9, x, x + (x < 30 ? -10 : 10), 'gun'); }
  return one(v, X);
}

// ============================================================================ VIII. Страна
/** Танковая колонна: три маленьких танка друг за другом (одна модель), красные звёзды на башнях. */
export function tankColumn(): ModelDef {
  const v = new Vox(40, 12, 16), zc = 8;
  for (const [x, z] of [[4, 5], [16, 11], [28, 5]]) {
    v.box(x, x + 10, 0, 3, z - 4, z + 4, 'gun_d');
    cbox(v, x, x + 10, 2, 5, z - 3.5, z + 3.5, 'army', 0, 1);
    v.cylY(x + 5, z, 2.4, 5, 7, 'army_l'); v.cylX(6, z, 0.6, x + 6, x + 12, 'gun'); v.set(x + 4, 7, z, 'glow_r');
  }
  void zc;
  return one(v, 30);
}

/** Ракетный тягач: многоосный, контейнер с ракетой, поднятый под углом, красные огни. */
export function missileTruck(): ModelDef {
  const v = new Vox(56, 18, 26), zc = 13;
  wheels(v, [8, 16, 30, 38, 46], 4, 22, 3.6, 'army_d');
  cbox(v, 2, 54, 4, 9, 4, 22, 'army', 1, 1);
  cbox(v, 44, 55, 9, 17, 5, 21, 'army', 1, 1); v.box(54.6, 55.2, 11, 16, 6, 20, 'glass');
  v.box(2, 54, 7, 8, 3.6, 22.4, 'red'); v.box(53, 55, 17, 18.5, zc - 1, zc + 1, 'glow_r');
  const t = new Vox(50, 20, 14), tc = 7;
  t.box(0, 8, 0, 4, 2, 12, 'army_d');
  t.seg([2, 3, tc], [44, 16, tc], 3.4, 'army_l'); t.seg([42, 15.4, tc], [47, 17, tc], 2.4, 'red'); t.set(48, 17.4, tc, 'glow_r');
  return { size: 46, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [4, 0, tc], at: [-14, 9, 0] }] };
}

/** Крылатая ракета: сигара с крылышками и хвостовым оперением, красная головка, горящее сопло. */
export function cruiseMissile(): ModelDef {
  const v = new Vox(34, 10, 20), zc = 10;
  v.cylX(5, zc, 2.6, 3, 28, 'white'); v.cylX(5, zc, 2.6, 28, 33, 'red', 0.6);
  v.box(12, 18, 4.6, 5.4, 0, 20, 'white_d'); v.box(3, 7, 4.6, 5.4, 4, 16, 'white_d'); v.box(3, 7, 5, 10, zc - 0.5, zc + 0.5, 'white_d');
  v.cylX(5, zc, 1.8, 0, 3, 'gun'); v.cylX(5, zc, 1.2, -0.5, 0.6, 'glow_r');
  v.box(14, 24, 7, 7.6, zc - 1, zc + 1, 'red');
  return one(v, 30);
}

/** Боевой дирижабль: огромная оболочка в полосах, гондола с пушками, винты, красные огни по борту. */
export function airship(): ModelDef {
  const X = 90, v = new Vox(X, 40, 40), zc = 20;
  v.ell(46, 26, zc, 40, 12, 13, 'steel_l');
  v.paint((x, y, z) => (Math.floor(x / 8) % 2 ? 'steel' : undefined));
  v.paint((x, y, z) => (Math.abs(z - zc) > 11 && y > 24 && y < 27 ? 'red' : undefined));
  for (const s of [-1, 1]) v.box(4, 14, 26, 27, zc + s * 8, zc + s * 18, 'steel_d');
  v.box(4, 14, 26, 38, zc - 0.5, zc + 0.5, 'steel_d');
  cbox(v, 32, 62, 8, 15, zc - 6, zc + 6, 'gun', 1, 1); v.box(61.6, 62.2, 10, 13, zc - 5, zc + 5, 'glow_r');
  for (const x of [38, 48, 58]) for (const s of [-1, 1]) v.cylZ(x, 11, 1, zc + s * 6, zc + s * 10, 'gun_d');
  for (let x = 20; x < 80; x += 10) { v.set(x, 26, zc - 13, 'glow_r'); v.set(x, 26, zc + 13, 'glow_r'); }
  const parts: PartDef[] = [{ name: 'body', vox: v }];
  for (const s of [-1, 1]) parts.push({ name: 'prop', vox: rotor(5, 'gun_d', 3), at: [-10, 14, s * 12] });
  return { size: 80, parts };
}

// ============================================================================ X. Планеты
/** Летающая тарелка: диск с кольцом красных огней, стеклянный купол с пилотом, нижний луч-излучатель. */
export function ufo(): ModelDef {
  const n = 40, c = n / 2, v = new Vox(n, 20, n);
  v.fill((x, y, z) => { const r = Math.hypot(x - c, z - c); const t = r < 18 ? 4 - (r / 18) * 3 : -1; return y >= 5 - t && y <= 6 + t * 0.6 && r < 19 ? 'steel_l' : undefined; });
  v.cylY(c, c, 19, 5.5, 6.5, 'steel');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; v.box(c + Math.cos(a) * 16 - 0.5, c + Math.cos(a) * 16 + 0.5, 6, 7, c + Math.sin(a) * 16 - 0.5, c + Math.sin(a) * 16 + 0.5, 'glow_r'); }
  v.ell(c, 9, c, 7, 6, 7, 'glass'); v.ell(c, 10, c, 3, 3, 3, 'alien'); v.set(c + 2.6, 11, c - 1, 'glow_r'); v.set(c + 2.6, 11, c + 1, 'glow_r');
  v.cylY(c, c, 4, 2, 4, 'gun'); v.cylY(c, c, 2.4, 1, 2, 'glow_r');
  return { size: 32, parts: [{ name: 'spin', vox: v, pivot: [c, 0, c] }] };
}

/** Комета: ледяное ядро с каменными вкраплениями и длинный хвост из светящейся пыли. */
export function comet(): ModelDef {
  const v = new Vox(44, 16, 16), c = 8;
  v.sphere(34, c, c, 7, 'ice_l');
  v.paint((x, y, z) => ((x * 3 + y * 5 + z * 7) % 6 === 0 ? 'rock' : (x + y) % 5 === 0 ? 'ice' : undefined));
  for (let i = 0; i < 70; i++) { const t = i / 70, r = 2 + t * 5; const x = 28 - t * 28, a = i * 2.3; v.set(x, c + Math.sin(a) * r * 0.8, c + Math.cos(a) * r * 0.8, t < 0.3 ? 'glow_c' : i % 3 ? 'ice' : 'glow_r'); }
  v.set(40, c, c, 'glow_r');
  return one(v, 26);
}

/** Звёздная пушка: астероид-основание, поворотная батарея с огромным излучателем и кольцами. */
export function starCannon(): ModelDef {
  const n = 50, c = n / 2, v = new Vox(n, 20, n);
  v.fill((x, y, z) => { const r = Math.hypot(x - c, z - c) + Math.sin(x * 0.7) * 1.5 + Math.cos(z * 0.6) * 1.5; return r < 22 - y * 0.8 ? ((x + y * 2 + z) % 5 === 0 ? 'rock_d' : 'rock') : undefined; }, 0, n, 0, 14, 0, n);
  for (const [x, z] of [[10, 14], [38, 30], [16, 38]]) v.box(x, x + 3, 6, 10, z, z + 3, 'crystal');
  const t = new Vox(64, 24, 30), tc = 15, tcx = 14;
  t.cylY(tcx, tc, 12, 0, 6, 'gun', 10); t.cylY(tcx, tc, 12.2, 2, 3, 'glow_r');
  t.box(tcx - 6, tcx + 8, 6, 14, tc - 6, tc + 6, 'gun_d');
  t.cylX(10, tc, 4, tcx + 6, tcx + 46, 'steel'); for (const x of [24, 32, 40, 48]) t.cylX(10, tc, 5.4, tcx + x - 14, tcx + x - 12, 'gun_d');
  t.cylX(10, tc, 6, tcx + 44, tcx + 48, 'gun'); t.cylX(10, tc, 3, tcx + 47, tcx + 48.6, 'glow_r');
  return { size: 46, parts: [{ name: 'body', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [0, 14, 0] }] };
}

// ============================================================================ препятствия страны, континентов, космоса
/** Деревня с высоты: несколько домиков с красными и серыми крышами, церковь с куполом, огороды. */
export function village(v: number): ModelDef {
  const n = 64, b = new Vox(n, 30, n), c = n / 2;
  b.fill((x, y, z) => (y < 1 && Math.hypot(x - c, z - c) < 30 ? ((Math.floor(x / 5) + Math.floor(z / 7)) % 3 === 0 ? 'dirt' : 'grass_d') : undefined), 0, n, 0, 1, 0, n);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996 + v, r = 8 + Math.sqrt(i / 9) * 18, x = c + Math.cos(a) * r, z = c + Math.sin(a) * r;
    b.box(x - 3, x + 3, 1, 5, z - 2.5, z + 2.5, (i + v) % 2 ? 'white' : 'cream');
    b.fill((xx, y, zz) => (y < 9 - Math.abs(zz - z) * 1.2 ? ((i + v) % 3 ? 'roof' : 'gun') : undefined), x - 3.4, x + 3.4, 5, 9, z - 3, z + 3);
    b.set(x + 3, 3, z, 'lamp');
  }
  b.box(c - 4, c + 4, 1, 12, c - 3, c + 3, 'white'); b.cylY(c, c, 2.6, 12, 18, 'white'); b.sphere(c, 19, c, 2.8, 'gold'); b.seg([c, 21, c], [c, 25, c], 0.4, 'gold');
  return one(b, n, [n, n]);
}

/** Ветряная мельница: белая башня, лопасти (вращаются), домик рядом. */
export function windmill(): ModelDef {
  const n = 40, c = n / 2, b = new Vox(n, 70, n);
  b.cylY(c, c, 5, 0, 52, 'white', 3);
  b.paint((x, y) => (Math.floor(y) % 10 === 0 ? 'white_d' : undefined));
  b.ell(c, 54, c, 4, 4, 4, 'steel'); b.cylX(54, c, 1, c, c + 6, 'gun');
  b.box(c - 14, c - 6, 0, 6, c + 4, c + 12, 'cream'); b.fill((x, y, z) => (y < 10 - Math.abs(z - (c + 8)) ? 'roof' : undefined), c - 14.5, c - 5.5, 6, 10, c + 3.5, c + 12.5);
  const r = new Vox(3, 50, 50), rc = 25;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; r.seg([1, rc, rc], [1, rc + Math.sin(a) * 24, rc + Math.cos(a) * 24], 1.1, 'white'); }
  r.cylX(rc, rc, 2, 0, 3, 'gun_d');
  return { size: n, parts: [{ name: 'body', vox: b }, { name: 'spin', vox: r, pivot: [1, rc, rc], at: [6, 54, 0], axis: 'x' }], foot: [n, n] };
}

/** Стог сена: рыжий купол с соломинками. */
export function haystack(v: number): ModelDef {
  const n = 24, c = n / 2, b = new Vox(n, 20, n);
  b.fill((x, y, z) => { const r = Math.hypot(x - c, z - c); return r < 11 - y * 0.35 - (y > 12 ? (y - 12) * 0.8 : 0) ? ((x * 3 + y * 5 + z) % 7 === 0 ? 'sand_d' : 'sand') : undefined; }, 0, n, 0, 20, 0, n);
  if (v % 2) b.seg([c, 14, c], [c + 3, 20, c], 0.4, 'wood_d');
  return one(b, n, [n, n]);
}

/** Город с высоты: плотные кварталы, вышка, светящиеся окна. */
export function cityDot(v: number): ModelDef {
  const n = 60, c = n / 2, b = new Vox(n, 40, n);
  b.cylY(c, c, 28, 0, 1, 'asphalt_d');
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996 + v, r = Math.sqrt(i / 26) * 24, x = c + Math.cos(a) * r, z = c + Math.sin(a) * r;
    const hh = 3 + ((i * 7 + v * 3) % 9) * (1 - r / 26) * 2.6, s = 2.4;
    b.box(x - s, x + s, 1, 1 + hh, z - s, z + s, ['glass_d', 'concrete_l', 'cream', 'teal_d'][(i + v) % 4]);
    b.paint((xx, y) => (Math.floor(y) % 3 === 0 && (Math.floor(xx * 2) % 3 === 0) ? 'lamp' : undefined), x - s, x + s, 2, 1 + hh, z - s, z + s);
    b.box(x - s, x + s, 1 + hh, 1.6 + hh, z - s, z + s, 'gun');
  }
  b.seg([c, 1, c], [c, 36, c], 0.6, 'steel_l'); b.set(c, 37, c, 'lamp_r');
  return one(b, n, [n, n]);
}

/** Гора: скальные уступы, снежная шапка, ели у подножия. */
export function mountain(v: number): ModelDef {
  const X = 120, Z = 100, b = new Vox(X, 80, Z);
  const px = X * (0.4 + (v % 3) * 0.1), pz = Z * 0.5;
  b.fill((x, y, z) => {
    const d = Math.hypot((x - px) / (X * 0.5), (z - pz) / (Z * 0.5));
    const hgt = 76 * Math.max(0, 1 - d) ** 1.3 + Math.sin(x * 0.3 + z * 0.2) * 3 + Math.cos(x * 0.13 - z * 0.27) * 4;
    if (y >= hgt) return undefined;
    if (y > 54 + Math.sin(x * 0.4) * 4) return 'white';
    if (y > 46) return (x + z) % 4 ? 'white_d' : 'rock_l';
    return Math.floor(y / 6) % 2 ? 'rock' : (x + y + z) % 5 ? 'rock_d' : 'rock_l';
  });
  for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 0.85 + (i % 3) * 0.05; const x = px + Math.cos(a) * X * 0.45 * r, z = pz + Math.sin(a) * Z * 0.45 * r; for (let t = 0; t < 3; t++) b.fill((xx, y, zz) => (Math.hypot(xx - x, zz - z) < (3 - t) * (1 - (y - t * 3) / 6) && y >= t * 3 && y < t * 3 + 6 ? 'leaf_d' : undefined), x - 4, x + 4, 0, 12, z - 4, z + 4); }
  return one(b, X, [X, Z]);
}

const PLANETS: [string, string, string][] = [['orange', 'orange_d', 'sand'], ['blue', 'blue_d', 'white'], ['purple', 'purple_d', 'pink'], ['khaki', 'khaki_d', 'sand'], ['teal', 'teal_d', 'ice_l'], ['red_d', 'brick_d', 'lava']];
/** Планета: шар с полосами облаков/материков, у некоторых — кольцо, у вулканической — светящиеся трещины. */
export function planet(v: number): ModelDef {
  const n = 120, c = n / 2, R = 44, b = new Vox(n, 100, n), [a, d, l] = PLANETS[v % PLANETS.length];
  b.fill((x, y, z) => {
    const dx = x - c, dy = y - (R + 2), dz = z - c;
    if (dx * dx + dy * dy + dz * dz > R * R) return undefined;
    const band = Math.sin(dy * 0.25 + Math.sin(dx * 0.08 + dz * 0.05) * 2);
    if (l === 'lava' && Math.abs(Math.sin(dx * 0.2 + dz * 0.15) * Math.cos(dy * 0.18)) < 0.06) return 'lava';
    return band > 0.55 ? l : band < -0.4 ? d : a;
  });
  if (v % 2 === 0) b.fill((x, y, z) => { const r = Math.hypot(x - c, z - c); const yy = R + 2 + (x - c) * 0.25; return r > R + 6 && r < R + 14 && Math.abs(y - yy) < 1 ? ((Math.floor(r) % 3) ? 'sand' : 'sand_d') : undefined; });
  return one(b, n, [n, n]);
}

/** Астероид: бугристый камень с кратерами и кристаллами. */
export function asteroid(v: number): ModelDef {
  const n = 48, c = n / 2, b = new Vox(n, 40, n);
  b.fill((x, y, z) => { const dx = x - c, dy = y - 16, dz = z - c; const r = Math.sqrt(dx * dx + dy * dy * 1.6 + dz * dz) + Math.sin(x * 0.6 + v) * 2 + Math.cos(z * 0.5 + y * 0.4) * 2; return r < 18 ? ((x * 3 + y * 7 + z * 5) % 9 === 0 ? 'rock_l' : r > 16 ? 'rock_d' : 'rock') : undefined; });
  for (const [x, z] of [[c - 6, c + 4], [c + 7, c - 3]]) b.sphere(x, 30, z, 3.5, 0);
  if (v % 2) for (const [x, z] of [[c + 4, c + 6], [c - 5, c - 6]]) b.seg([x, 24, z], [x + 1, 32, z], 1.4, 'crystal');
  return one(b, n, [n, n]);
}

// ============================================================================ V. Улицы: армия (переделка — плотность ~1 воксель/пиксель)
/** Красная звезда на плоскости (по x-z), центр (cx, cz), высота y. */
function star(v: Vox, cx: number, y: number, cz: number, r: number, col = 'red'): void {
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k / 5) * Math.PI * 2; v.seg([cx, y, cz], [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r], 0.55, col); }
}

/** Пехотное отделение: трое солдат в касках с красными повязками, у одного — гранатомёт. */
export function infantryM(): ModelDef {
  const v = new Vox(20, 14, 20);
  for (const [x, z, rpg] of [[5, 5, false], [12, 13, true], [15, 4, false]] as [number, number, boolean][]) {
    v.box(x - 1, x + 1, 0, 4, z - 1.6, z - 0.2, 'army_d'); v.box(x - 1, x + 1, 0, 4, z + 0.2, z + 1.6, 'army_d');
    v.box(x - 1.4, x + 1.4, 4, 8, z - 1.8, z + 1.8, 'army'); v.box(x - 1.5, x + 1.5, 6, 7, z + 1.6, z + 2, 'red');
    v.box(x - 1, x + 1, 8, 10, z - 1, z + 1, 'flesh'); v.ell(x, 10.4, z, 1.6, 0.9, 1.6, 'army_d');
    v.box(x + 1, x + 5, 6, 7, z + 0.6, z + 1.4, 'gun_d');
    if (rpg) { v.cylX(8.5, z - 1, 0.7, x - 3, x + 4, 'army_d'); v.cylX(8.5, z - 1, 1.1, x + 4, x + 6, 'red_d'); }
  }
  return one(v, 14);
}

/** БТР: восемь колёс, клиновидный нос, люки, башенка с КПВТ, красная полоса и огни. */
export function apcM(): ModelDef {
  const v = new Vox(46, 22, 28), zc = 14;
  for (const x of [8, 16, 28, 36]) for (const [a, b] of [[1, 5], [23, 27]]) { v.cylZ(x, 4, 4, a, b, 'rubber'); v.cylZ(x, 4, 1.8, a - 0.1, b + 0.1, 'army_d'); }
  cbox(v, 3, 43, 4, 13, 4, 24, 'army', 1, 2);
  v.cut(1, 1.2, 0, 43 + 1.2 * 7, 36, 44, 4, 14); v.cut(-1, 1.5, 0, -3 + 1.5 * 9, 2, 8, 4, 14);
  v.box(3, 43, 9, 10, 3.6, 24.4, 'red');
  for (const x of [12, 20, 28]) for (const z of [6, 18]) v.box(x, x + 4, 13, 13.6, z, z + 4, 'army_d');
  for (const z of [6, 21]) v.box(42, 43.5, 8, 10, z - 1, z + 1, 'glow_r');
  for (const z of [3.9, 24.1]) v.paint((x, y) => (Math.hypot(x - 32, y - 8.5) < 2 ? 'red' : undefined), 30, 34.5, 6, 11, z - 0.2, z + 0.2);
  const t = new Vox(28, 10, 12), tc = 6;
  t.cylY(6, tc, 4.4, 0, 4, 'army_l', 3.4); t.box(5, 9, 4, 4.6, tc - 1, tc + 1, 'glow_r');
  barrel(t, 9, 26, 2.2, tc, 0.9, 'gun', 'gun_d');
  void zc;
  return { size: 42, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [6, 0, tc], at: [1, 13, 0] }] };
}

/** Основной боевой танк: блоки ДЗ на лбу, экраны, башня с длинной пушкой и пулемётом, красная звезда. */
export function mbtM(): ModelDef {
  const L = 44, TW = 9, TH = 8, W = 30, NX = L + 6, NZ = W + 2, zc = NZ / 2, x0 = 3, x1 = x0 + L;
  const v = new Vox(NX, 24, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 5, 'gun', 'army_d');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 5, 'gun', 'army_d');
  const yb = TH - 1, yt = TH + 5;
  cbox(v, x0 + 1, x1 - 1, yb, yt, 1, NZ - 1, 'army', 1, 2);
  v.cut(0.6, 1, 0, 0.6 * (x1 - 11) + yt, x1 - 12, x1, yb, yt);
  for (let z = 4; z < NZ - 4; z += 4) v.box(x1 - 9, x1 - 6, yt - 3, yt - 1, z, z + 3, 'army_d');
  for (const [zo, zi] of [[0, 1], [NZ - 1, NZ]]) { v.box(x0 + 3, x1 - 5, TH * 0.4, yb + 1, zo, zi, 'army_d'); v.box(x0 + 3, x1 - 5, TH * 0.4 + 1, TH * 0.4 + 2, zo, zi, 'red'); }
  for (const z of [4, NZ - 6]) v.box(x1 - 2, x1, yb + 1, yb + 3, z, z + 2, 'glow_r');
  for (let i = 0; i < 4; i++) v.box(x0 + 3 + i * 2, x0 + 4 + i * 2, yt - 0.6, yt, zc - 5, zc + 5, 'gun_d');
  const t = new Vox(56, 14, 26), tc = 13, tcx = 12;
  t.fill((x, y, z) => { const dx = x - tcx, dz = Math.abs(z - tc); if (dx > 9 || dx < -10 || dz > 9) return undefined; if (Math.abs(dx) * 0.6 + dz > 11) return undefined; if (dx > 4 && y > 6 - (dx - 4) * 0.6) return undefined; return 'army'; }, 0, 56, 0, 6, 0, 26);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) t.box(tcx + 2 + i * 2, tcx + 4 + i * 2, 1, 5, tc + s * (6 - i * 1.5) - 1, tc + s * (6 - i * 1.5) + 1, 'army_d');
  star(t, tcx - 3, 6.1, tc, 2.6);
  barrel(t, tcx + 8, tcx + 40, 3, tc, 1.3, 'gun', 'gun_d');
  t.cylY(tcx - 3, tc + 5, 1.8, 6, 8, 'army_d'); t.cylX(7.5, tc + 5, 0.4, tcx - 3, tcx + 4, 'gun');
  t.box(tcx - 12, tcx - 9, 1, 5, tc - 6, tc + 6, 'army_d');
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [x0 + L * 0.48 - NX / 2, yt, 0] }] };
}

/** Ударный вертолёт: кабина-тандем, крылья с блоками НУРС, хвостовая балка, красные звёзды и огни. */
export function attackHeliM(): ModelDef {
  const v = new Vox(64, 22, 34), zc = 17;
  v.ell(36, 10, zc, 15, 6.5, 6, 'army');
  v.ell(46, 11, zc, 7, 4.6, 4.4, 'glass'); v.ell(39, 13, zc, 4, 3.6, 3.6, 'glass_d');
  v.seg([22, 11, zc], [2, 14, zc], 2, 'army'); v.box(0, 5, 12, 21, zc - 0.7, zc + 0.7, 'army_d'); v.cylZ(3, 18, 4, zc + 1, zc + 2, 'gun_d');
  for (const s of [-1, 1]) { v.box(30, 38, 8, 9.5, zc + s * 6, zc + s * 15, 'army_d'); for (const dz of [10, 14]) { v.cylX(6.5, zc + s * dz, 1.6, 29, 39, 'gun'); v.set(39, 6.5, zc + s * dz, 'glow_r'); } }
  v.cylX(5, zc, 1, 48, 56, 'gun_d');
  v.paint((x, y, z) => (Math.abs(z - zc) > 4.5 && Math.hypot(x - 30, y - 10) < 2.2 ? 'red' : undefined));
  v.box(50, 52, 6, 8, zc - 1, zc + 1, 'glow_r');
  for (const s of [-1, 1]) v.seg([30, 3, zc + s * 3], [42, 3, zc + s * 3], 0.6, 'gun_d');
  v.cylY(36, zc, 1.6, 16, 19, 'gun_d');
  return { size: 58, parts: [{ name: 'body', vox: v }, { name: 'rotor', vox: rotor(26, 'gun_d', 2), at: [4, 19, 0] }] };
}

/** САУ: гусеничное шасси, большая рубка-башня, длинный ствол с дульным тормозом, ящики, красная полоса. */
export function spgM(): ModelDef {
  const L = 46, TW = 9, TH = 8, W = 32, NX = L + 6, NZ = W + 2, x0 = 3, x1 = x0 + L;
  const v = new Vox(NX, 22, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 6, 'gun', 'sand_d');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 6, 'gun', 'sand_d');
  cbox(v, x0 + 1, x1 - 1, TH - 1, TH + 4, 1, NZ - 1, 'khaki', 1, 1);
  v.box(x0 + 1, x1 - 1, TH + 2, TH + 3, 0.6, NZ - 0.6, 'red');
  for (const z of [3, NZ - 5]) v.box(x1 - 2, x1, TH, TH + 2, z, z + 2, 'glow_r');
  const t = new Vox(76, 18, 30), tc = 15, tcx = 16;
  cbox(t, tcx - 14, tcx + 10, 0, 11, tc - 12, tc + 12, 'khaki', 1, 2);
  t.cut(1, 1, 0, tcx + 10 + 6, tcx + 4, tcx + 11, 0, 11);
  t.box(tcx - 16, tcx - 14, 2, 9, tc - 9, tc + 9, 'khaki_d');
  for (let i = 0; i < 3; i++) t.box(tcx - 12 + i * 6, tcx - 8 + i * 6, 11, 13, tc + 4, tc + 9, 'army_d');
  barrel(t, tcx + 8, tcx + 58, 6, tc, 1.8, 'gun', 'gun_d');
  star(t, tcx - 4, 11.1, tc - 5, 2.6);
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [x0 + L * 0.45 - NX / 2, TH + 4, 0] }] };
}

/** Бронеавтомобиль: угловатый корпус, решётка радиатора, модуль пулемёта, красные огни. */
export function armoredCarM(): ModelDef {
  const v = new Vox(36, 20, 24), zc = 12;
  for (const x of [8, 27]) for (const [a, b] of [[1, 5], [19, 23]]) { v.cylZ(x, 4, 4, a, b, 'rubber'); v.cylZ(x, 4, 1.8, a - 0.1, b + 0.1, 'army_d'); }
  cbox(v, 2, 34, 4, 12, 4, 20, 'army', 1, 2);
  cbox(v, 6, 24, 12, 17, 5, 19, 'army', 1, 1); v.box(23.6, 24.2, 13, 16, 6, 18, 'glass');
  v.box(33.6, 34.4, 6, 10, 6, 18, 'gun_d'); for (let z = 7; z < 18; z += 2) v.box(34.2, 34.6, 6, 10, z, z + 0.6, 'army_l');
  for (const z of [6, 17]) v.box(34, 35, 10, 11.5, z, z + 1.5, 'glow_r');
  v.box(2, 34, 9, 10, 3.6, 20.4, 'red');
  v.cylY(14, zc, 2.4, 17, 19, 'gun'); v.cylX(18.6, zc, 0.5, 14, 22, 'gun_d');
  return one(v, 30);
}

/** Тяжёлый многобашенный танк: длинный корпус, главная башня и две малые, красные звёзды, огни. */
export function heavyTankM(): ModelDef {
  const L = 64, TW = 12, TH = 11, W = 44, NX = L + 8, NZ = W + 2, zc = NZ / 2, x0 = 4, x1 = x0 + L;
  const v = new Vox(NX, 34, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 7, 'gun', 'army_d');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 7, 'gun', 'army_d');
  const yb = TH - 1, yt = TH + 8;
  cbox(v, x0 + 1, x1 - 1, yb, yt, 1, NZ - 1, 'army_d', 1, 2);
  v.cut(0.9, 1, 0, 0.9 * (x1 - 12) + yt, x1 - 13, x1, yb, yt);
  for (const [zo, zi] of [[0, 1], [NZ - 1, NZ]]) { v.box(x0 + 3, x1 - 6, TH * 0.4, yb + 2, zo, zi, 'army'); v.box(x0 + 3, x1 - 6, yb, yb + 1, zo, zi, 'red'); for (let x = x0 + 6; x < x1 - 8; x += 5) v.set(x, TH * 0.4 + 2, zo, 'steel_l'); }
  for (const z of [5, NZ - 8]) v.box(x1 - 3, x1, yb + 2, yb + 5, z, z + 3, 'glow_r');
  for (const [mx, mz, dir] of [[x1 - 18, zc - 11, 1], [x0 + 12, zc + 11, -1]] as [number, number, number][]) {
    v.cylY(mx, mz, 5, yt, yt + 4, 'army'); v.cylY(mx, mz, 5.2, yt + 1.5, yt + 2.5, 'red');
    v.cylX(yt + 2, mz, 0.9, dir > 0 ? mx : mx - 12, dir > 0 ? mx + 12 : mx, 'gun');
  }
  const t = new Vox(76, 18, 34), tc = 17, tcx = 16;
  t.cylY(tcx, tc, 12, 0, 9, 'army_d', 10);
  t.cylY(tcx, tc, 12.2, 3, 4.6, 'red');
  star(t, tcx - 4, 9.1, tc, 3.6);
  for (const bz of [tc - 3.2, tc + 3.2]) barrel(t, tcx + 9, tcx + 50, 4.8, bz, 1.9, 'gun', 'gun_d');
  t.cylY(tcx - 4, tc + 6, 2.6, 9, 11, 'army'); t.set(tcx - 4, 11, tc + 6, 'glow_r');
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [x0 + L * 0.5 - NX / 2, yt, 0] }] };
}

/** Реактивная установка: трёхосный грузовик, пакет из 32 труб на поворотной установке, красные огни. */
export function mlrsM(): ModelDef {
  const v = new Vox(64, 22, 30);
  for (const x of [10, 36, 46]) for (const [a, b] of [[1, 6], [24, 29]]) { v.cylZ(x, 4.6, 4.6, a, b, 'rubber'); v.cylZ(x, 4.6, 2, a - 0.1, b + 0.1, 'army_d'); }
  v.box(4, 60, 5, 9, 5, 25, 'gun_d');
  cbox(v, 48, 62, 9, 20, 5, 25, 'army', 1, 2); v.box(61.6, 62.2, 12, 18, 6, 24, 'glass'); v.box(48, 62, 13, 14, 4.6, 25.4, 'red');
  for (const z of [6, 23]) v.box(62, 63, 10, 12, z, z + 1.5, 'glow_r');
  const t = new Vox(46, 22, 24), tc = 12;
  t.box(4, 14, 0, 4, 4, 20, 'army_d');
  t.fill((x, y, z) => { const ya = 4 + (x - 2) * 0.3; return y >= ya && y < ya + 10 && z > 2 && z < 22 && x > 2 && x < 40 ? 'army' : undefined; }, 0, 46, 0, 22, 0, 24);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const y = 5 + 11.4 + r * 2.4, z = 3.5 + c * 2.4; t.box(39.5, 40.2, y - 0.8, y + 0.4, z - 0.6, z + 0.6, 'black'); t.set(40, y, z, (r + c) % 3 ? 'gun' : 'glow_r'); }
  return { size: 60, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [10, 0, tc], at: [-14, 9, 0] }] };
}
