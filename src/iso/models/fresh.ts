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
