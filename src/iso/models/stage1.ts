// Ступень II «Ковёр и детская»: игрушки, ожившие по радиосигналу Пульт-тирана. Свои краски у каждой игрушки,
// а метка вражеской армии — красные огоньки (glow_r) и красные полосы. Плотность ~1 воксель на пиксель кадра.
// Препятствия: кубики с буквами, книжки, мелки, ножки мебели, стеклянные шарики, тапки, подушки.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { track, barrel } from './hero';
import { cbox, wheel, rotor, one } from './kit';

/** Заводная мышь: серебристая жесть, розовые уши и хвост, золотой ключ, красные глаза-огоньки, красная полоса. */
export function windMouse(): ModelDef {
  const v = new Vox(24, 12, 16), zc = 8;
  v.ell(11, 4.5, zc, 8, 4.4, 5.2, 'steel_l');
  v.ell(17.5, 4, zc, 4, 3.2, 3.4, 'steel_l');
  v.ell(21.3, 3.8, zc, 1.4, 1.2, 1.2, 'pink');                                  // нос
  v.paint((x, y) => (y > 7.2 ? 'chrome' : y < 2.2 ? 'steel' : undefined));
  v.paint((x, y, z) => (Math.abs(z - zc) < 1 && y > 6 ? 'red' : undefined), 4, 18, 0, 12, 0, 16);   // красная полоса
  for (const s of [-1, 1]) { v.cylX(7.5, zc + s * 2.6, 2.2, 15, 16, 'pink'); v.cylX(7.5, zc + s * 2.6, 1.3, 15.9, 16.1, 'pink'); v.set(19.6, 5, zc + s * 1.6, 'glow_r'); }
  for (let i = 0; i < 6; i++) v.set(3 - i * 0.5, 3 + Math.sin(i) * 1.2, zc + i * 0.8, 'pink');   // хвост
  v.cylY(9, zc, 0.7, 8.5, 11, 'gold_d'); v.box(7, 11, 10, 11.5, zc - 0.5, zc + 0.5, 'gold');   // ключ
  for (const x of [6, 14]) for (const z of [zc - 4.5, zc + 4.5]) v.set(x, 0, z, 'black');
  return one(v, 20);
}

/** Юла: полосатый конус (вращается), красный пояс, ручка с красным огоньком. */
export function top(): ModelDef {
  const n = 26, c = n / 2, t = new Vox(n, 26, n);
  const cols = ['blue', 'white', 'toy_y', 'blue_l', 'white', 'red'];
  t.fill((x, y, z) => {
    const r = Math.hypot(x - c, z - c);
    const R = y < 9 ? y * 1.25 + 0.6 : y < 16 ? 11.8 - (y - 9) * 0.25 : 10 - (y - 16) * 1.6;
    if (r > R || y > 21) return undefined;
    if (y > 9 && y < 11) return 'red';
    const a = Math.atan2(z - c, x - c), band = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 6);
    return y < 9 ? cols[band] : cols[(band + 2) % 6];
  }, 0, n, 0, 22, 0, n);
  t.cylY(c, c, 1.6, 21, 25, 'gun');
  t.sphere(c, 25, c, 1.4, 'glow_r');
  return { size: 22, parts: [{ name: 'spin', vox: t, pivot: [c, 0, c] }] };
}

/** Радиомашинка-монстр: огромные колёса, синий кузов с красной гоночной полосой, дуга, антенна с огоньком. */
export function rcCar(): ModelDef {
  const v = new Vox(34, 18, 26), zc = 13;
  for (const x of [8, 26]) for (const [z0, z1] of [[0, 5], [21, 26]]) { wheel(v, x, 5.5, 5.5, z0, z1, 'rubber', 'steel'); for (let a = 0; a < 10; a++) { const an = (a / 10) * Math.PI * 2; v.set(x + Math.cos(an) * 5.5, 5.5 + Math.sin(an) * 5.5, z0 < 10 ? z0 : z1 - 1, 'rubber_l'); } }
  cbox(v, 4, 31, 6, 12, 5, 21, 'blue', 1, 1);
  v.cut(1, 1.3, 0, 31 + 1.3 * 9, 25, 32, 6, 13);
  v.box(4, 31, 11, 12.2, zc - 2, zc + 2, 'red');                                 // гоночная полоса
  v.box(12, 21, 12, 15, 7, 19, 'blue_d'); v.box(19, 21.1, 12.5, 14.5, 8, 18, 'glass');
  v.box(1, 4, 13, 14, 4, 22, 'black'); v.box(2, 3, 11, 13, 6, 8, 'black'); v.box(2, 3, 11, 13, 18, 20, 'black');   // спойлер
  v.box(31, 32.2, 8, 10, 6, 9, 'lamp'); v.box(31, 32.2, 8, 10, 17, 20, 'lamp');
  v.seg([8, 12, 7], [5, 17.5, 6], 0.4, 'gun_d'); v.set(5, 17.5, 6, 'glow_r');
  v.box(3, 4.2, 8, 10, 7, 9, 'glow_r'); v.box(3, 4.2, 8, 10, 17, 19, 'glow_r');
  return one(v, 30);
}

/** Жестяной робот: корпус с панелью приборов, красные глаза, антенна-шарик, лучевой пистолет. */
export function toyRobot(): ModelDef {
  const v = new Vox(24, 36, 22), zc = 11;
  for (const s of [-1, 1]) { v.box(9, 13, 0, 9, zc + s * 3.5 - 2, zc + s * 3.5 + 2, 'steel_d'); v.box(8, 15, 0, 2, zc + s * 3.5 - 2.5, zc + s * 3.5 + 2.5, 'red_d'); }   // ноги и ступни
  cbox(v, 6, 16, 9, 24, zc - 7, zc + 7, 'steel_l', 1, 1);
  v.box(15.9, 16.4, 12, 20, zc - 4, zc + 4, 'gun');                                // панель
  for (const [y, z] of [[17, zc - 2], [17, zc + 2], [14, zc]]) v.box(16, 16.7, y, y + 1.5, z - 0.8, z + 0.8, y > 15 ? 'glow_r' : 'gold');
  v.box(6, 16, 9, 10, zc - 7.2, zc + 7.2, 'red');                                   // красный пояс
  cbox(v, 7, 15, 24, 31, zc - 4.5, zc + 4.5, 'steel', 1, 1);                       // голова
  v.box(14.9, 15.4, 27, 28.5, zc - 3, zc - 1, 'glow_r'); v.box(14.9, 15.4, 27, 28.5, zc + 1, zc + 3, 'glow_r');
  v.box(14.9, 15.3, 25, 26, zc - 2.5, zc + 2.5, 'gun_d');                           // рот-решётка
  v.seg([11, 31, zc], [11, 34, zc], 0.4, 'gun_d'); v.sphere(11, 34.5, zc, 1.2, 'glow_r');
  for (const s of [-1, 1]) { v.ell(11, 22, zc + s * 8.4, 2.4, 2.4, 2, 'steel_d'); v.seg([11, 21, zc + s * 8.6], [17, 15, zc + s * 8.6], 1.3, 'steel'); }
  v.box(16, 22, 14, 16.5, zc + 7.6, zc + 9.6, 'red'); v.cylX(15.2, zc + 8.6, 0.8, 21, 23.5, 'gun'); v.set(23.5, 15.2, zc + 8.6, 'glow_r');   // лучевой пистолет
  return one(v, 30);
}

/** Бумажный самолётик: сложенный лист с красной полосой по крылу, красный огонёк на носу. */
export function plane(): ModelDef {
  const v = new Vox(36, 10, 32), zc = 16;
  v.fill((x, y, z) => { const dz = Math.abs(z - zc), w = x * 0.42; if (dz > w) return undefined; const yy = 4 + dz * 0.35; return Math.abs(y - yy) < 0.7 ? (dz < 1 ? 'paper_d' : 'paper') : undefined; }, 0, 36, 0, 10, 0, 32);
  v.fill((x, y, z) => (Math.abs(z - zc) < 1 && y < 4 && y > 4 - x * 0.12 ? 'paper_d' : undefined), 0, 36, 0, 6, 0, 32);   // киль
  v.paint((x, y, z) => (Math.abs(Math.abs(z - zc) - x * 0.3) < 0.8 && x > 6 ? 'red' : undefined));
  v.set(35, 4, zc, 'glow_r');
  return one(v, 30);
}

/** Кубик-голем: тело из кубиков с буквами, глаза-огоньки, кулаки-кубики. */
export function blockGolem(): ModelDef {
  const v = new Vox(40, 54, 40), zc = 20;
  const cube = (x: number, y: number, z: number, s: number, col: string, letter: string) => {
    cbox(v, x - s / 2, x + s / 2, y, y + s, z - s / 2, z + s / 2, 'wood_l', 1, 1);
    v.paint((xx, yy, zz) => {
      const ex = Math.abs(xx - x) < s / 2 - 1.2, ez = Math.abs(zz - z) < s / 2 - 1.2, ey = yy > y + 1.2 && yy < y + s - 1.2;
      return (ex && ey) || (ez && ey) || (ex && ez) ? col : undefined;
    }, x - s / 2, x + s / 2, y, y + s, z - s / 2, z + s / 2);
    v.paint((xx, yy) => (Math.abs(yy - (y + s / 2)) < 1.5 && Math.abs(xx - x) < s / 4 ? letter : undefined), x + s / 2 - 0.6, x + s / 2 + 0.1, y, y + s, z - s / 2, z + s / 2);
  };
  cube(20, 0, zc - 7, 11, 'blue', 'white'); cube(20, 0, zc + 7, 11, 'toy_g', 'white');          // ноги
  cube(20, 11, zc, 20, 'red', 'toy_y');                                                         // туловище
  cube(21, 31, zc, 13, 'toy_y', 'red');                                                         // голова
  v.box(27.4, 28, 37, 39, zc - 4, zc - 1.5, 'glow_r'); v.box(27.4, 28, 37, 39, zc + 1.5, zc + 4, 'glow_r');
  cube(23, 14, zc - 15, 9, 'blue', 'toy_y'); cube(23, 14, zc + 15, 9, 'toy_g', 'red');             // кулаки
  v.box(10, 30, 23, 24.4, zc - 10.2, zc + 10.2, 'red_d');                                        // красный пояс
  return one(v, 44);
}

/** Чёртик в коробке: расписной ящик, ручка завода, клоун на пружине с красным носом и огоньками. */
export function jackBox(): ModelDef {
  const n = 40, v = new Vox(n, 58, n), c = n / 2;
  cbox(v, 4, n - 4, 0, 24, 4, n - 4, 'blue', 1, 1);
  v.paint((x, y, z) => ((Math.floor((x + z) / 6) + Math.floor(y / 6)) % 2 === 0 ? 'toy_y' : undefined), 4, n - 4, 2, 22, 4, n - 4);
  v.box(4, n - 4, 22, 24, 4, n - 4, 'red'); v.box(4, n - 4, 0, 2, 4, n - 4, 'red');
  v.box(5, n - 5, 24, 25, 5, n - 5, 'black');                                                   // открытая крышка
  v.box(4, 6, 24, 40, 4, n - 4, 'blue'); v.box(3.6, 4, 26, 38, 6, n - 6, 'toy_y');
  v.cylZ(c, 12, 2, n - 4, n - 1, 'gold_d'); v.box(c - 1, c + 1, 12, 20, n - 2, n - 1, 'gold'); v.box(c - 1, c + 4, 19, 21, n - 2, n, 'red');   // ручка
  for (let y = 24; y < 40; y++) { const a = y * 1.2; v.set(c + Math.cos(a) * 3.5, y, c + Math.sin(a) * 3.5, 'chrome'); v.set(c + Math.cos(a + Math.PI) * 3.5, y, c + Math.sin(a + Math.PI) * 3.5, 'steel'); }   // пружина
  v.sphere(c, 45, c, 6, 'white');
  v.ell(c, 50, c, 6.6, 3, 6.6, 'red');                                                          // колпак
  v.cylY(c, c, 1.6, 52, 56, 'red'); v.sphere(c, 56.5, c, 1.6, 'glow_r');
  v.sphere(c + 5.6, 44.5, c, 1.5, 'red');                                                       // нос
  v.box(c + 4.6, c + 5.6, 46.5, 48, c - 3, c - 1.4, 'glow_r'); v.box(c + 4.6, c + 5.6, 46.5, 48, c + 1.4, c + 3, 'glow_r');
  v.box(c + 4.8, c + 5.8, 41.5, 42.5, c - 2.5, c + 2.5, 'red_d');                               // улыбка
  for (const s of [-1, 1]) v.ell(c, 44, c + s * 6, 1.6, 2.6, 1.4, 'toy_g');                       // волосы
  return one(v, 40, [n, n]);
}

/** Радиотанк: большой пластиковый танк на пульте — камуфляж игрушечных цветов, приёмник с антенной и огоньками,
 *  башня с пусковой установкой мягких ракет, красные полосы. */
export function rcTank(): ModelDef {
  const L = 62, TW = 14, TH = 12, W = 50, NX = L + 8, NZ = W + 2, zc = NZ / 2, x0 = 4, x1 = 4 + L;
  const v = new Vox(NX, 36, NZ);
  track(v, x0, x1, TH, 1, 1 + TW, 1, 6, 'rubber', 'toy_y');
  track(v, x0, x1, TH, NZ - 1 - TW, NZ - 1, NZ - 2, 6, 'rubber', 'toy_y');
  v.box(x0 + 3, x1 - 3, 2, TH - 1, 1 + TW, NZ - 1 - TW, 'gun_d');
  const yb = TH - 2, yt = TH + 9;
  cbox(v, x0 + 1, x1 - 1, yb, yt, TW - 3, NZ - TW + 3, 'toy_g', 2, 2);
  v.cut(0.9, 1, 0, 0.9 * (x1 - 12) + yt, x1 - 13, x1, yb, yt);
  v.paint((x, y, z) => (Math.sin(x * 0.3) + Math.cos(z * 0.35) > 1.1 ? 'green_d' : Math.sin(x * 0.2 + 2) + Math.cos(z * 0.25 + 1) > 1.3 ? 'toy_y' : undefined));
  v.paint((x, y) => (y >= yt - 3 && y < yt - 1.8 ? 'red' : undefined), x0, x1, yb, yt, 0, NZ);       // красная полоса
  for (const zz of [TW, NZ - TW - 3]) v.box(x1 - 3, x1 - 1, yb + 3, yb + 5, zz, zz + 3, 'glow_r');
  // приёмник радиосигнала: коробка с огоньками и длинная антенна
  v.box(x0 + 3, x0 + 13, yt, yt + 6, zc + 6, zc + 14, 'gun'); v.box(x0 + 4, x0 + 12, yt + 6, yt + 6.6, zc + 7, zc + 13, 'gun_d');
  for (let i = 0; i < 3; i++) v.set(x0 + 5 + i * 3, yt + 6.5, zc + 10, 'glow_r');
  v.seg([x0 + 8, yt + 6, zc + 10], [x0 + 5, yt + 26, zc + 10], 0.5, 'chrome'); v.sphere(x0 + 5, yt + 26.5, zc + 10, 1.2, 'glow_r');
  const t = new Vox(72, 18, 36), tc = 18, tcx = 18;
  t.cylY(tcx, tc, 13, 0, 9, 'toy_g', 11);
  t.paint((x, y, z) => (Math.sin(x * 0.4) + Math.cos(z * 0.4) > 1.1 ? 'green_d' : undefined));
  t.cylY(tcx, tc, 13.2, 3, 4.5, 'red');
  barrel(t, tcx + 10, tcx + 42, 4.5, tc, 2.6, 'toy_y', 'toy_g', 'glow_r');
  for (const s of [-1, 1]) { t.box(tcx - 6, tcx + 6, 5, 11, tc + s * 12 - 3, tc + s * 12 + 3, 'blue'); for (const yy of [6.5, 9]) for (const dz of [-1.5, 1.5]) { t.cylX(yy, tc + s * 12 + dz, 0.9, tcx + 6, tcx + 9, 'toy_y'); t.set(tcx + 9, yy, tc + s * 12 + dz, 'red'); } }
  t.cylY(tcx - 5, tc - 4, 3, 9, 11, 'toy_y'); t.set(tcx - 5, 11, tc - 4, 'glow_r');
  return { size: L, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [tcx, 0, tc], at: [x0 + L * 0.5 - NX / 2, yt, 0] }] };
}

// ============================================================================ препятствия
const BLOCK_COLS: [string, string][] = [['red', 'toy_y'], ['blue', 'white'], ['toy_g', 'toy_y'], ['toy_y', 'red'], ['purple', 'white'], ['orange', 'blue']];

/** Кубик с буквами: деревянное ребро, цветные грани, рельефная буква. */
export function block(v: number): ModelDef {
  const n = 40, b = new Vox(n, n, n), [face, letter] = BLOCK_COLS[v % BLOCK_COLS.length];
  cbox(b, 0, n, 0, n - 1, 0, n, 'wood_l', 2, 2);
  b.paint((x, y, z) => { const ex = x > 4 && x < n - 4, ez = z > 4 && z < n - 4, ey = y > 4 && y < n - 5; return (ex && ey) || (ez && ey) || (ex && ez) ? face : undefined; });
  b.paint((x, y, z) => ((x < 1 || x > n - 1 || z < 1 || z > n - 1 || y > n - 2) && ((x + y + z) % 9 === 0) ? 'wood' : undefined));
  // буквы: «А» на одной грани, «Б» на другой, «В» сверху (простые штрихи)
  const glyph = (u: number, w: number, k: number) => {
    const p = (u - n / 2) / 12, q = (w - n / 2) / 12;
    if (k === 0) return Math.abs(Math.abs(p) * 2 - (q + 1) * 0.9) < 0.18 && q > -1 && q < 1 || (Math.abs(q - 0.1) < 0.14 && Math.abs(p) < 0.5);
    if (k === 1) return (Math.abs(p + 0.5) < 0.16 && Math.abs(q) < 1) || (Math.abs(q - 0.95) < 0.15 && Math.abs(p) < 0.6) || (Math.abs(q + 0.1) < 0.15 && p > -0.5 && p < 0.4) || (Math.abs(q + 0.95) < 0.15 && p > -0.5 && p < 0.4) || (Math.abs(p - 0.45) < 0.16 && q > -1 && q < 0);
    return (Math.abs(p + 0.5) < 0.16 && Math.abs(q) < 1) || (Math.abs(Math.hypot(p - 0, q - 0.45) - 0.48) < 0.15 && p > -0.5) || (Math.abs(Math.hypot(p, q + 0.45) - 0.48) < 0.15 && p > -0.5);
  };
  b.paint((x, y, z) => (x > n - 1.5 && glyph(z, n - y, (v + 0) % 3) ? letter : undefined));
  b.paint((x, y, z) => (z > n - 1.5 && glyph(x, n - y, (v + 1) % 3) ? letter : undefined));
  b.paint((x, y, z) => (y > n - 2.5 && glyph(x, z, (v + 2) % 3) ? letter : undefined));
  return one(b, n, [n, n]);
}

const BOOK_COLS = ['fabric_r', 'fabric_b', 'green_d', 'purple_d', 'orange_d', 'navy'];
/** Книжка плашмя: твёрдая обложка, корешок с золотым тиснением, срез страниц, закладка. */
export function book(v: number): ModelDef {
  const X = 130, Z = 96, b = new Vox(X, 18, Z), col = BOOK_COLS[v % BOOK_COLS.length];
  b.box(0, X, 0, 2, 0, Z, col); b.box(0, X, 15, 17, 0, Z, col);
  b.box(2, X - 3, 2, 15, 3, Z - 3, 'paper');
  b.paint((x, y) => (y % 2 < 1 ? 'paper_d' : undefined), 2, X - 3, 2, 15, 3, Z - 3);
  b.box(0, 5, 0, 17, 0, Z, col);                                             // корешок
  for (const z of [14, Z - 16]) b.box(0, 5.4, 2, 15, z, z + 2, 'gold');
  b.box(20, X - 20, 16.6, 17, 20, Z - 20, col === 'navy' ? 'navy_l' : 'paper_d');                       // наклейка на обложке
  b.box(30, X - 30, 16.8, 17.2, 30, 34, 'gold'); b.box(40, X - 40, 16.8, 17.2, 40, 42, 'gold');
  b.box(X - 3, X + 0, 6, 9, Z - 30, Z - 26, 'red');                          // закладка
  return one(b, X, [X, Z]);
}

const CRAYON_COLS: [string, string][] = [['red', 'red_d'], ['blue', 'blue_d'], ['toy_g', 'green_d'], ['toy_y', 'gold_d'], ['purple', 'purple_d'], ['orange', 'orange_d']];
/** Восковой мелок: заострённый кончик, обёртка с полосками и надписью. */
export function crayon(v: number): ModelDef {
  const X = 120, Z = 14, c = new Vox(X, 14, Z), [w, d] = CRAYON_COLS[v % CRAYON_COLS.length];
  c.cylX(7, 7, 6.4, 0, X - 18, w);
  c.cylX(7, 7, 6.4, 6, X - 26, 'paper');
  for (const x of [8, 11, X - 30, X - 33]) c.cylX(7, 7, 6.5, x, x + 1.5, d);
  c.cylX(7, 7, 6.5, 30, X - 50, w);
  c.paint((x, y) => (y > 11.5 && x > 34 && x < X - 54 && Math.floor(x / 3) % 2 ? 'black' : undefined), 30, X - 50, 0, 14, 0, Z);
  c.cylX(7, 7, 6.4, X - 18, X, w, 1.2);                                      // кончик
  c.cylX(7, 7, 6.6, X - 18, X - 16, d);
  return one(c, X, [X, Z]);
}

/** Ножка мебели: точёный деревянный столб с кольцами и латунной накладкой у пола. */
export function furnitureLeg(): ModelDef {
  const n = 48, H = 130, b = new Vox(n, H, n), c = n / 2;
  b.fill((x, y, z) => { const r = Math.hypot(x - c, z - c); const R = 15 + Math.sin(y / 9) * 2 + (y < 10 ? 4 : 0) + (y > H - 18 ? 6 : 0) - (y > 30 && y < 40 ? 3 : 0); return r < R ? 'wood' : undefined; });
  b.paint((x, y) => (Math.floor(y) % 18 < 2 ? 'wood_d' : y % 18 > 14 ? 'wood_l' : undefined));
  b.paint((x, y, z) => ((Math.atan2(z - c, x - c) * 8 + y * 0.15) % 2 < 0.3 ? 'wood_d' : undefined), 0, n, 40, H - 20, 0, n);
  b.cylY(c, c, 20, 0, 6, 'brass'); b.cylY(c, c, 20.4, 5, 6, 'gold');
  return one(b, n, [n, n]);
}

const MARBLE_COLS: [string, string][] = [['glass', 'blue'], ['water_l', 'toy_g'], ['crystal', 'red'], ['ice_l', 'purple'], ['glass_d', 'toy_y']];
/** Стеклянный шарик: прозрачное тело, цветная спираль внутри, блик. */
export function marble(v: number): ModelDef {
  const n = 20, c = n / 2, b = new Vox(n, n, n), [g, s] = MARBLE_COLS[v % MARBLE_COLS.length];
  b.sphere(c, c, c, 9.4, g);
  b.paint((x, y, z) => { const a = Math.atan2(z - c, x - c) + y * 0.4; return Math.abs(Math.sin(a * 1.5)) > 0.9 ? s : undefined; });
  b.paint((x, y, z) => ((x - c + 4) ** 2 + (y - c - 5) ** 2 + (z - c + 4) ** 2 < 6 ? 'white' : undefined));
  return one(b, n, [n, n]);
}

const SLIPPER_COLS: [string, string][] = [['pink', 'white'], ['fabric_b', 'white'], ['fabric_y', 'orange'], ['green_l', 'white']];
/** Пушистый тапок: резиновая подошва, мягкий верх-петля, помпон. */
export function slipper(v: number): ModelDef {
  const X = 150, Z = 70, b = new Vox(X, 30, Z), zc = Z / 2, [col, pom] = SLIPPER_COLS[v % SLIPPER_COLS.length];
  b.fill((x, y, z) => { const dz = Math.abs(z - zc) / (zc - 2), dx = (x - X / 2) / (X / 2 - 2); return dx * dx + dz * dz <= 1 ? 'rubber' : undefined; }, 0, X, 0, 4, 0, Z);
  b.fill((x, y, z) => { const dz = Math.abs(z - zc) / (zc - 4), dx = (x - X / 2) / (X / 2 - 4); return dx * dx + dz * dz <= 1 ? 'cream' : undefined; }, 0, X, 4, 6, 0, Z);
  // верх: мягкий купол над передней половиной
  b.fill((x, y, z) => { if (x < X * 0.45) return undefined; const dz = (z - zc) / (zc - 3), dx = (x - X * 0.72) / (X * 0.3), dy = (y - 5) / 20; return dx * dx + dz * dz + dy * dy <= 1 && y >= 5 ? col : undefined; }, 0, X, 5, 30, 0, Z);
  b.paint((x, y, z) => ((x * 7 + y * 3 + z * 5) % 11 === 0 ? 'white' : undefined), X * 0.45, X, 6, 30, 0, Z);
  b.sphere(X * 0.84, 22, zc, 8, pom);
  b.paint((x, y, z) => ((x + y + z) % 5 === 0 ? 'cream' : undefined), X * 0.84 - 9, X * 0.84 + 9, 13, 31, zc - 9, zc + 9);
  return one(b, X, [X, Z]);
}

const PILLOW_COLS: [string, string][] = [['white', 'fabric_b'], ['fabric_y', 'orange'], ['fabric_r', 'gold'], ['pink', 'white']];
/** Подушка: мягкая, со швом по краю, вышитым ромбом и кисточками по углам. */
export function pillow(v: number): ModelDef {
  const X = 150, Z = 80, b = new Vox(X, 30, Z), [col, acc] = PILLOW_COLS[v % PILLOW_COLS.length];
  b.fill((x, y, z) => {
    const ex = Math.min(x, X - x) / 18, ez = Math.min(z, Z - z) / 14;
    const h = 26 * Math.min(1, ex) * Math.min(1, ez) * (0.85 + 0.15 * Math.sin(x / X * Math.PI));
    return y < Math.max(4, h) ? col : undefined;
  });
  b.paint((x, y, z) => (Math.abs(Math.abs(x - X / 2) / 40 + Math.abs(z - Z / 2) / 24 - 1) < 0.06 ? acc : undefined));
  b.paint((x, y, z) => (Math.min(x, X - x) < 3 || Math.min(z, Z - z) < 3 ? acc : undefined), 0, X, 0, 6, 0, Z);
  for (const [x, z] of [[2, 2], [X - 3, 2], [2, Z - 3], [X - 3, Z - 3]]) b.ell(x, 3, z, 2.4, 2.8, 2.4, acc);
  return one(b, X, [X, Z]);
}

export type { PartDef };
export { rotor };
