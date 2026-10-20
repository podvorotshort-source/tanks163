// Ступень I «Игрушечный полигон»: заводные игрушки, солдатики, блоки «Танчиков».
import { Vox, mi, type ModelDef } from '../vox';
import { tankSpec, wheel, gun, rotor, figure, one, tracks } from './kit';

// ---------------------------------------------------------------- враги

export function soldier(): ModelDef {
  const v = new Vox(12, 14, 9);
  figure(v, 5, 4.5, 'army', 'army_d', 'army_l', 'army_d', 1, 'army_d');
  return one(v, 9);
}

export function toyTank(): ModelDef {
  return tankSpec({
    L: 26, W: 20, tH: 6, hH: 4, body: 'red', dark: 'red_d', light: 'red_l', wheel: 'white',
    tr: 5, tH2: 4, turret: 'red', barrel: 10, bR: 1.1,
    extra: (h, t, c) => {
      for (const zz of [c.zc - 4, c.zc + 3]) h.box(c.x0 + 2, c.x1 - 3, c.yT - 1, c.yT, zz, zz + 1, 'white');     // гоночные полосы
      t.cylY(c.tcx - 1, c.tcz, 2, 4, 5, 'white');
      h.cylX(c.yT - 2, c.zc, 1, c.x0 - 3, c.x0, 'gold'); h.cylZ(c.x0 - 3, c.yT - 2, 2.2, c.zc - 2.5, c.zc - 1.5, 'gold'); h.cylZ(c.x0 - 3, c.yT - 2, 2.2, c.zc + 1.5, c.zc + 2.5, 'gold'); // заводной ключ
    },
  });
}

export function jeep(): ModelDef {
  const v = new Vox(26, 12, 16), zc = 8;
  for (const x of [6, 19]) { wheel(v, x, 3, 3, 0, 3); wheel(v, x, 3, 3, 13, 16); }
  v.box(2, 24, 3, 6, 3, 13, 'army');
  v.box(16, 24, 6, 8, 3.5, 12.5, 'army_l');            // капот
  v.box(23, 24, 3, 7, 4, 12, 'army_d');                // решётка
  v.box(4, 15, 6, 7, 3, 13, 'army_d');                 // пол кабины
  v.box(8, 11, 6, 9, 4, 7, 'rubber'); v.box(8, 11, 6, 9, 9, 12, 'rubber'); // сиденья
  v.box(15, 16, 7, 11, 3, 13, 'army_d'); v.box(15, 16, 8, 10, 4.5, 11.5, 'glass');
  v.box(23.5, 24.5, 4, 6, 4, 5, 'lamp'); v.box(23.5, 24.5, 4, 6, 11, 12, 'lamp');
  for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(20 + a, 8, zc + b, 'white');
  const t = new Vox(12, 8, 6);
  t.box(2, 5, 0, 4, 1.5, 4.5, 'gun'); gun(t, 4, 11, 3, 3, 0.7);
  return { size: 20, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [3.5, 0, 3], at: [-4, 7, 0] }] };
}

export function heli(): ModelDef {
  const v = new Vox(30, 12, 12), zc = 6;
  v.ell(20, 5.5, zc, 6, 4.5, 4, 'army');
  v.fill((x, y, z, c) => (c && x > 22 && y > 5 ? 'glass' : undefined));
  v.box(4, 16, 4, 7, zc - 1.5, zc + 1.5, 'army');
  v.box(1, 5, 7, 11, zc - 1, zc + 1, 'army_d');
  v.box(10, 26, 0, 1, 1, 2, 'gun'); v.box(10, 26, 0, 1, 10, 11, 'gun');
  for (const x of [13, 23]) { v.box(x, x + 1, 1, 3, 1, 2, 'gun'); v.box(x, x + 1, 1, 3, 10, 11, 'gun'); }
  v.box(17, 21, 9, 11, zc - 1, zc + 1, 'gun_d');
  for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { v.set(15 + a, 6 + b, 1, 'white'); v.set(15 + a, 6 + b, 10, 'white'); }
  v.set(26, 2, zc, 'lamp_r');
  return { size: 26, parts: [{ name: 'body', vox: v, pivot: [15, 0, 6] }, { name: 'rotor', vox: rotor(13, 'gun_d', 2), pivot: [14, 0, 14], at: [4, 11, 0] }] };
}

export function armorToy(): ModelDef {
  return tankSpec({
    L: 32, W: 24, tH: 7, hH: 5, body: 'red_d', dark: 'rubber', light: 'red', wheel: 'gun', round: false,
    tr: 6, tH2: 5, turret: 'red_d', barrel: 12, bR: 1.5,
    extra: (h, t, c) => {
      for (const zz of [c.zc - 13, c.zc + 12]) h.box(c.x0 + 3, c.x1 - 5, 4, c.yT - 1, zz, zz + 1, 'gun');     // броневые листы
      for (let i = 0; i < 4; i++) for (const zz of [c.zc - 13, c.zc + 12]) h.set(c.x0 + 5 + i * 6, c.yT - 2, zz, 'steel_l');
      t.box(c.tcx - 2, c.tcx + 1, c.TH, c.TH + 2, c.tcz - 2, c.tcz + 1, 'gun');
    },
  });
}

export function mortar(): ModelDef {
  const v = new Vox(24, 6, 20);
  v.box(2, 22, 0, 2, 2, 18, 'army_d'); v.box(4, 20, 2, 4, 4, 16, 'army');
  for (const [x, z] of [[2, 2], [21, 2], [2, 17], [21, 17]]) v.box(x, x + 1, 0, 1, z, z + 1, 'gun');
  const t = new Vox(18, 18, 12);
  t.box(2, 10, 0, 3, 2, 10, 'army_l');
  t.seg([5, 2, 6], [14, 14, 6], 2.6, 'gun'); t.seg([13, 13, 6], [15, 15.5, 6], 2.9, 'gun_d');
  t.seg([4, 1, 3], [9, 7, 3], 0.7, 'gun_d'); t.seg([4, 1, 9], [9, 7, 9], 0.7, 'gun_d');
  return { size: 22, parts: [{ name: 'hull', vox: v }, { name: 'turret', vox: t, pivot: [6, 0, 6], at: [0, 4, 0] }] };
}

export function bigToy(): ModelDef {
  return tankSpec({
    L: 44, W: 34, tH: 10, hH: 6, body: 'white', dark: 'white_d', light: 'white', wheel: 'red', round: true,
    tr: 9, tH2: 6, turret: 'red', barrel: 16, bR: 2.1, twin: true, wheels: 5,
    extra: (h, t, c) => {
      // батарейка на корме: медный плюс, чёрный корпус
      h.cylZ(c.x0 + 8, c.yT + 4, 4, c.zc - 10, c.zc + 10, 'black');
      h.cylZ(c.x0 + 8, c.yT + 4, 4.05, c.zc - 10, c.zc - 6, 'copper');
      h.cylZ(c.x0 + 8, c.yT + 4, 1.6, c.zc + 10, c.zc + 12, 'chrome');
      for (const zz of [c.zc - 16, c.zc + 15]) h.box(c.x0 + 3, c.x1 - 4, c.yT - 2, c.yT, zz, zz + 1, 'red');
      t.box(c.tcx - 3, c.tcx + 3, c.TH, c.TH + 2, c.tcz - 3, c.tcz + 3, 'red_d');
      t.set(c.tcx, c.TH + 2, c.tcz, 'lamp_r');
    },
  });
}

export function toyBunker(): ModelDef {
  const v = new Vox(34, 28, 34);
  v.box(1, 33, 0, 20, 1, 33, 'cardboard');
  v.box(1, 33, 19, 20, 1, 33, 'cardboard_d');
  v.box(-1, 35, 19, 21, 0, 4, 'cardboard'); // клапаны
  v.box(-1, 35, 19, 21, 30, 34, 'cardboard');
  v.box(1, 33, 0, 20, 16, 18, 'cardboard_d');                       // скотч
  v.box(32.5, 33.5, 2, 12, 12, 22, 'black');                           // дверь
  v.box(32.5, 33.5, 12, 16, 6, 10, 'glass'); v.box(32.5, 33.5, 12, 16, 24, 28, 'glass');
  for (let z = 3; z < 31; z += 5) v.box(33, 34, 16, 18, z, z + 2, 'red');                 // бойницы
  v.seg([6, 20, 6], [6, 28, 6], 0.6, 'gun'); v.box(6.5, 13, 23, 27, 5.5, 6.5, 'red');        // флаг
  v.box(26, 28, 20, 24, 25, 27, 'gun'); v.set(27, 24, 26, 'lamp_r');                         // антенна-маяк
  return one(v, 34);
}

// ---------------------------------------------------------------- босс: Заводной генерал
// Огромный жестяной заводной танк. Слабое место — золотой ключ на корме (крутится).
export function windupGeneral(): ModelDef {
  const L = 96, W = 72, NX = L + 24, NZ = W + 8, zc = NZ / 2, x0 = 14, x1 = x0 + L;
  const h = new Vox(NX, 46, NZ);
  // гусеницы с жестяными колёсами
  tracks(h, x0, x1, 20, zc - W / 2, zc - W / 2 + 14, 6, 'gold', 'red_d');
  tracks(h, x0, x1, 20, zc + W / 2 - 14, zc + W / 2, 6, 'gold', 'red_d');
  // корпус: жесть, литография (полосы, звёзды)
  const yT = 34;
  h.box(x0 + 2, x1 - 2, 4, 20, zc - W / 2 + 14, zc + W / 2 - 14, 'gun_d');
  h.box(x0, x1, 18, yT, zc - W / 2 - 2, zc + W / 2 + 2, 'red');
  h.cut(1, 1.2, 0, x1 - 4 + 1.2 * yT, x1 - 22, x1 + 2, 18, yT + 1);
  h.cut(-1, 1.6, 0, -x0 - 2 + 1.6 * yT, x0 - 2, x0 + 12, 18, yT + 1);
  h.paint((x, y) => (y > yT - 2 ? 'red_l' : y < 21 ? 'red_d' : undefined), x0, x1, 18, yT, 0, NZ);
  // золотые канты и заклёпки
  for (const zz of [zc - W / 2 - 2, zc + W / 2 + 1]) {
    h.box(x0 + 2, x1 - 10, 22, 24, zz, zz + 1, 'gold');
    h.box(x0 + 2, x1 - 10, 30, 31, zz, zz + 1, 'gold');
    for (let x = x0 + 6; x < x1 - 12; x += 6) h.set(x, 27, zz, 'gold_d');
    // звезда на борту
    const sx = x0 + 40, sy = 27;
    for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [1, -1], [-1, -1]]) h.set(sx + a, sy + b, zz, 'white');
  }
  // жёлто-красная полоса по крыше
  for (let x = x0 + 6; x < x1 - 20; x++) h.box(x, x + 1, yT - 1, yT, zc - 3, zc + 3, (x >> 2) % 2 ? 'gold' : 'red_d');
  // спонсоны с пушками по бортам
  for (const zs of [-1, 1]) {
    const zz = zc + zs * (W / 2 + 4);
    h.cylY(x0 + 66, zz, 6, 20, 30, 'red_d');
    h.cylY(x0 + 66, zz, 6.6, 29, 31, 'gold');
    gun(h, x0 + 70, x0 + 86, 25, zz, 1.8, 'gun', 'gun_d');
  }
  // фары-глаза и решётка радиатора спереди
  for (const zz of [zc - 22, zc + 22]) { h.cylX(26, zz, 4, x1 - 6, x1 - 2, 'chrome'); h.cylX(26, zz, 3, x1 - 2, x1 - 1, 'lamp'); }
  for (let z = zc - 12; z < zc + 12; z += 3) h.box(x1 - 4, x1 - 2, 20, 28, z, z + 1, 'gun_d');
  // пружинный механизм на корме (вал ключа)
  h.cylX(27, zc, 4, x0 - 6, x0 + 2, 'gold_d');
  h.cylX(27, zc, 5.5, x0 - 2, x0, 'gold');

  // башня: генерал в люке, двойная пушка, медали
  const T = new Vox(70, 44, 56), tcx = 24, tcz = 28;
  T.cylY(tcx, tcz, 22, 0, 12, 'red', 19);
  T.cylY(tcx, tcz, 23, 0, 2, 'gold');
  T.cylY(tcx, tcz, 19.5, 11, 13, 'gold');
  T.paint((x, y) => (y > 9 ? 'red_l' : undefined), 0, 70, 9, 11, 0, 56);
  for (const bz of [tcz - 6, tcz + 6]) gun(T, tcx + 16, tcx + 46, 6, bz, 3.2, 'gun', 'gun_d');
  T.box(tcx + 14, tcx + 22, 1, 12, tcz - 11, tcz + 11, 'red_d');                     // маска
  for (const bz of [tcz - 6, tcz + 6]) T.cylX(6, bz, 3.8, tcx + 33, tcx + 36, 'gold');
  // генерал: мундир, эполеты, фуражка, усы
  const gx = tcx - 6, gz = tcz;
  T.cylY(gx, gz, 8, 13, 15, 'gun_d');                                                 // люк
  T.ell(gx, 21, gz, 6, 7, 7, 'green_d');                                              // мундир
  for (const zz of [gz - 6, gz + 6]) T.ell(gx, 25, zz, 2.6, 1.6, 2.6, 'gold');        // эполеты
  for (let i = 0; i < 3; i++) T.set(gx + 5, 22 - i * 2, gz - 2 + i, i % 2 ? 'red' : 'gold'); // медали
  T.ell(gx, 31, gz, 5, 5, 5, 'flesh');                                                // голова
  T.box(gx + 4, gx + 6, 29, 30, gz - 4, gz + 4, 'black');                            // усы
  T.set(gx + 5, 32, gz - 2, 'black'); T.set(gx + 5, 32, gz + 2, 'black');             // глаза
  T.cylY(gx, gz, 6.5, 35, 37, 'green_d'); T.cylY(gx, gz, 4.5, 37, 40, 'green_d');      // фуражка
  T.box(gx + 3, gx + 8, 35, 36, gz - 4, gz + 4, 'black');                            // козырёк
  T.box(gx + 5, gx + 6, 37, 39, gz - 1, gz + 1, 'gold');                             // кокарда
  T.seg([tcx - 16, 12, tcz - 14], [tcx - 16, 30, tcz - 14], 0.8, 'gun');               // антенна
  T.set(tcx - 16, 30, tcz - 14, 'lamp_r');
  // огромный заводной ключ (вращается вокруг оси x) — слабое место
  const K = new Vox(8, 40, 40), kc = 20;
  K.box(1, 7, kc - 3, kc + 3, kc - 3, kc + 3, 'gold_d');
  for (const s of [-1, 1]) {
    K.fill((x, y, z) => { const dy = y - kc, dz = z - (kc + s * 10); return Math.abs(Math.sqrt(dy * dy + dz * dz) - 7) < 2.4 ? 'gold' : undefined; }, 2, 6, 0, 40, 0, 40);
  }
  K.box(2, 6, kc - 2, kc + 2, kc - 12, kc + 12, 'gold');
  return {
    size: 104,
    parts: [
      { name: 'hull', vox: h, pivot: [NX / 2, 0, NZ / 2] },
      { name: 'turret', vox: T, pivot: [tcx, 0, tcz], at: [x0 + L * 0.5 - NX / 2, yT, 0] },
      { name: 'key', vox: K, pivot: [4, kc, kc], at: [x0 - 10 - NX / 2, 27, 0], axis: 'x' },
    ],
  };
}

// ---------------------------------------------------------------- препятствия ступени I

/** Сторона блока стены (ед. и воксели): кратна кирпичу (9) и плите стали — соседние блоки сливаются в сплошную стену. */
export const WALL_BLK = 45;
/** Высота блока: почти куб (6 рядов кирпича по 7) — как в референсе, а не плоская плитка. */
const WALL_H = 42;

export function brick(v: number): ModelDef {
  // Блок кирпичной стены: крупная кладка с перевязкой (кирпич 14×6 + шов 1, три кирпича на блок, четыре ряда),
  // тёмный раствор, у каждого кирпича светлая верхняя и левая кромки, тёмный правый торец и низ, редкие
  // щербинки; тона кирпичей чуть разные. Узор с периодом 45 — стыкуется с соседями.
  // v & 1 — направление кладки на крыше (вдоль x или z), v >> 1 — вариант разброса тонов.
  const n = WALL_BLK, H = WALL_H, b = new Vox(n, H, n), along = v & 1, sd = v >> 1;
  const tint = (k: number, row: number) => { const h = (k * 5 + row * 3 + sd * 7 + 2) % 7; return h === 0 ? 'brk_l' : h === 4 ? 'brk_d' : 'brk'; };
  const lit = (c: string) => (c === 'brk_d' ? 'brk' : c === 'brk_l' ? 'brk_ll' : 'brk_l');
  const dim = (c: string) => (c === 'brk_l' ? 'brk' : 'brk_d');
  // кирпич в развёртке: u — вдоль ряда, y — поперёк (высота ряда), rp — шаг рядов; вернёт цвет пикселя
  const course = (u: number, y: number, row0: number, rp: number) => {
    const row = Math.floor(y / rp), fy = y - row * rp;
    if (fy >= rp - 1) return 'brk_m';                                           // шов между рядами (сверху ряда)
    const off = ((row + row0) % 2) * 7.5, k = Math.floor((u + off) / 15), fx = u + off - k * 15;
    if (fx >= 14) return 'brk_m';                                               // вертикальный шов
    const base = tint(k, row + row0);
    if (fy >= rp - 2) return lit(base);                                         // светлая верхняя кромка
    if (fx < 1) return lit(base);                                               // светлая левая кромка
    if (fx >= 13 || fy < 1) return dim(base);                                   // тёмный торец и низ
    const hh = (Math.floor(u) * 31 + Math.floor(y) * 17 + k * 7 + sd) % 23;
    if (hh === 0) return dim(base);                                             // щербинка
    return base;
  };
  b.fill((x, y, z) => {
    const ux = x < 1 || x > n - 1, uz = z < 1 || z > n - 1;
    if (y > H - 1) {
      // крыша: кирпичи плашмя, пять рядов на блок вдоль направления кладки
      const [u, w] = along ? [z, x] : [x, z];
      return course(u, w, 1, 9);
    }
    if (!ux && !uz) return 'brk_m';
    return course(ux ? z : x, y, 0, 7);
  });
  return one(b, n, [n, n]);
}

export function steel(v: number): ModelDef {
  // Стальной блок: светлые листы с фаской (светлая кромка сверху-слева, тёмная снизу-справа), косые блики,
  // заклёпки по углам листов; крыша — 2×2 листа, борта — по два листа. Стыкуется с соседними блоками.
  const n = WALL_BLK, H = WALL_H, b = new Vox(n, H, n), P = n / 2;
  b.box(0, n, 0, H, 0, n, 'stl');
  // крыша
  b.fill((x, y, z) => {
    const lx = x % P, lz = z % P;
    if (lx < 1 || lz < 1) return 'stl_s';                                        // шов между листами
    if (lx < 2 || lz < 2) return 'stl_l';                                        // светлая фаска
    if (lx > P - 1.5 || lz > P - 1.5) return 'stl_d';                            // тёмная фаска
    const g = lx + lz;
    if ((g > 8 && g < 10) || (g > 11.5 && g < 12.5)) return 'stl_l';             // косые блики
    return undefined;
  }, 0, n, H - 1, H, 0, n);
  // заклёпки по углам листов: светлая шляпка и тень под ней
  for (const cx of [3, P - 4, P + 3, n - 4]) for (const cz of [3, P - 4, P + 3, n - 4]) { b.set(cx, H - 1, cz, 'stl_r'); b.set(cx + 1, H - 1, cz + 1, 'stl_d'); }
  // борта
  b.fill((x, y, z) => {
    const ux = x < 1 || x > n - 1, uz = z < 1 || z > n - 1;
    if (y > H - 1 || (!ux && !uz)) return undefined;
    const u = ux ? z : x, lu = u % P;
    if (lu < 1) return 'stl_s';
    if (y > H - 2) return 'stl_l';
    if (y < 1.5) return 'stl_d';
    if (lu < 2) return 'stl_l';
    if (lu > P - 1.5) return 'stl_d';
    if (y > H - 4 && y < H - 3 || y > 3 && y < 4) { const r = (lu - 3) % 5; if (r >= 0 && r < 1) return 'stl_r'; }
    if (y > H - 5 && y < H - 4 || y > 2 && y < 3) { const r = (lu - 4) % 5; if (r >= 0 && r < 1) return 'stl_d'; }
    const g = lu - (H - y) * 0.5;
    if (y > H - 12 && g > 2.5 && g < 4) return 'stl_l';                        // короткий косой блик
    return undefined;
  });
  // v = 1 — усиленная стена (способность на 5-м уровне): золотые кромки и заклёпки
  if (v === 1) b.paint((x, y, z, c) => (c === mi('stl_l') ? 'gold' : c === mi('stl_r') ? 'yel_l' : undefined));
  return one(b, n, [n, n]);
}

/** Размеры кустов (ед. = воксели): маленький, средний, большой — каждый в своей плотности 1 воксель ≈ 1 пиксель. */
export const BUSH_SIZES = [30, 46, 64];

export function bush(v: number): ModelDef {
  // пышный куст из нескольких шапок листвы: светлый верх, тёмный низ, красные ягоды; v % 3 — размер, v >> 2 — вариант
  const n = BUSH_SIZES[v % 3], k = n / 48, sd = v >> 2, b = new Vox(n, Math.ceil(32 * k) + 2, n);
  const blobs: [number, number, number, number][] = [[24, 13, 24, 13], [13, 9, 15, 9], [35, 10, 16, 9.5], [14, 10, 33, 9.5], [33, 9, 34, 10], [23, 19, 20, 8], [28, 17, 29, 7.5]];
  for (const [x, y, z, r] of blobs) b.ell(x * k, y * k, z * k, r * k, r * k * 0.82, r * k, 'leaf');
  // листва пятнами (крупные пятна тона), светлые макушки, тёмный низ
  b.paint((x, y, z) => { const h = Math.sin(x / k * 0.9 + z / k * 0.6 + sd) * Math.cos(z / k * 0.8 - y / k * 0.7); return h > 0.62 ? 'leaf_l' : h < -0.66 ? 'leaf_d' : undefined; });
  b.paint((x, y) => (y > 21 * k ? 'grass_ll' : y < 4 * k ? 'leaf_d' : undefined));
  const nb = Math.round(4 + 5 * k);
  for (let i = 0; i < nb; i++) { const x = 8 * k + ((i * 17 + sd * 5) % 32) * k, z = 8 * k + ((i * 23 + sd * 3) % 32) * k, y = (8 + (i % 4) * 3) * k; b.paint(() => 'berry', x, x + 2, y, y + 2, z, z + 2); }
  return one(b, n, [n, n]);
}

/** Бочка со взрывчаткой: красная, обручи, белая полоса, крышка с жёлтым знаком. Взрывается от попаданий. */
export function barrel(v: number): ModelDef {
  const n = 22, c = 11, H = 28, b = new Vox(n, H + 1, n);
  b.cylY(c, c, 9.6, 0, H, 'red');
  for (const y of [3, H - 4]) b.cylY(c, c, 10.2, y, y + 2, 'red_d');                  // обручи
  b.cylY(c, c, 9.8, 12, 16, 'white');                                                 // полоса
  b.paint((x, y, z) => (Math.abs(Math.atan2(z - c, x - c) - 0.8) < 0.25 && y > 12.5 && y < 15.5 ? 'black' : undefined), 0, n, 12, 16, 0, n);  // знак
  b.cylY(c, c, 8.4, H, H + 1, 'red_l');                                               // крышка
  b.cylY(c - 3, c + 3, 1.6, H, H + 1, 'gun_d');                                       // пробка
  b.paint((x, y, z) => (Math.abs(x - c - 2) + Math.abs(z - c + 2) < 3 ? 'yel' : undefined), 0, n, H, H + 1, 0, n);
  b.paint((x, y, z) => ((x + z + v) % 9 < 1 && y < H ? 'red_l' : undefined), 0, n, 4, H - 4, 0, n);   // блики-подтёки
  return one(b, n, [n, n]);
}

/** Деревянный ящик: доски, тёмная рамка, косая распорка, трафарет. */
export function woodCrate(v: number): ModelDef {
  const n = 32, H = 30, b = new Vox(n, H, n);
  b.box(0, n, 0, H, 0, n, 'wood');
  b.paint((x, y, z) => {
    const ex = x < 3 || x > n - 3, ez = z < 3 || z > n - 3, ey = y < 3 || y > H - 3;
    if ((ex && ez) || (ex && ey) || (ez && ey)) return 'wood_d';                     // рамка
    const side = x > n - 1 || z > n - 1 || x < 1 || z < 1, top = y > H - 1;
    const u = top ? x : x > n - 1 || x < 1 ? z : x, w = top ? z : y;
    if (!top && side && Math.abs(u - w * (n / H)) < 1.6) return 'wood_d';           // распорка
    if (Math.floor(w) % 6 === 0) return 'wood_d';                                    // щели между досками
    if ((Math.floor(u * 3 + w * 7 + v)) % 29 === 0) return 'wood_l';
    return undefined;
  });
  b.paint((x, y, z) => (y > H - 1 && Math.abs(x - n / 2) < 4 && Math.abs(z - n / 2) < 4 && (Math.abs(x - n / 2) < 1.2 || Math.abs(z - n / 2) < 1.2) ? 'red' : undefined));   // трафарет-крест
  return one(b, n, [n, n]);
}

/** Игральный кубик: белый со скруглёнными рёбрами и красными точками (игрушка с полигона). */
export function dice(v: number): ModelDef {
  const n = 26, b = new Vox(n, n, n), c = n / 2;
  b.fill((x, y, z) => {
    const dx = Math.max(0, Math.abs(x - c) - (c - 3)), dy = Math.max(0, Math.abs(y - c) - (c - 3)), dz = Math.max(0, Math.abs(z - c) - (c - 3));
    return dx * dx + dy * dy + dz * dz <= 9 ? 'white' : undefined;
  });
  const pip = (cx: number, cy: number, cz: number) => b.paint(() => 'red', cx - 1.5, cx + 1.5, cy - 1.5, cy + 1.5, cz - 1.5, cz + 1.5);
  const f = [6.5, 13, 19.5];
  const faces = [[[1, 1]], [[0, 0], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 0], [0, 2], [2, 0], [2, 2]], [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]]];
  for (const [i, j] of faces[(v + 4) % 5]) pip(f[i], n - 0.5, f[j]);                // верх
  for (const [i, j] of faces[(v + 1) % 5]) pip(f[i], f[j], n - 0.5);                // бок z+
  for (const [i, j] of faces[(v + 2) % 5]) pip(n - 0.5, f[i], f[j]);                // бок x+
  return one(b, n, [n, n]);
}

export function water(): ModelDef {
  const nx = 26, nz = 20, b = new Vox(nx, 2, nz);
  b.fill((x, y, z) => {
    const ex = Math.min(x, nx - x), ez = Math.min(z, nz - z);
    if (ex < 1.5 || ez < 1.5) return y < 2 ? ((Math.floor(x + z) % 3) ? 'stone' : 'stone_l') : undefined;
    if (y > 1) return undefined;
    if (ex < 2.6 || ez < 2.6) return 'foam';
    return Math.sin(x * 0.9 + z * 0.4) > 0.85 ? 'water_l' : (x + z) % 9 < 1 ? 'water_d' : 'water';
  });
  return one(b, nx, [nx, nz]);
}

export function crate(): ModelDef {
  const n = 12, b = new Vox(n, 11, n);
  b.box(0, n, 0, 11, 0, n, 'wood');
  b.paint((x, y, z) => ((x < 1 || x > n - 1 || z < 1 || z > n - 1 || y > 10) && (Math.floor(y) % 3 === 0 || Math.floor(x) % 11 === 0 || Math.floor(z) % 11 === 0) ? 'wood_d' : undefined));
  for (const [a, b2] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(6 + a, 10, 6 + b2, 'red');
  return one(b, n, [n, n]);
}

export function hq(): ModelDef {
  const n = 20, b = new Vox(n, 22, n);
  b.box(0, n, 0, 10, 0, n, 'concrete');
  b.box(2, n - 2, 10, 13, 2, n - 2, 'concrete_l');
  b.box(n - 1, n, 2, 7, 7, 13, 'black');
  for (let z = 2; z < n - 2; z += 4) b.box(n - 1, n, 7, 8, z, z + 2, 'gun_d');
  b.seg([5, 13, 5], [5, 21, 5], 0.5, 'gun'); b.box(5.5, 11, 17, 21, 4.5, 5.5, 'red');
  b.box(13, 16, 13, 15, 13, 16, 'army'); b.set(14, 15, 14, 'lamp_g');
  return one(b, n, [n, n]);
}


export { gun };
