// Ступень II «Ковёр и детская»: заводные и радиоуправляемые игрушки, кубики, карандаши, шарики.
import { Vox, type ModelDef } from '../vox';
import { tankSpec, wheel, gun, rotor, one, cbox, seams, tracks } from './kit';

export function windMouse(): ModelDef {
  const v = new Vox(20, 9, 12), zc = 6;
  v.ell(10, 3.6, zc, 7, 3.4, 4.2, 'steel_l');
  v.ell(15, 3.6, zc, 3.4, 2.6, 3, 'steel_l');
  v.ell(17.5, 3.4, zc, 1.2, 1, 1, 'pink');                 // нос
  for (const z of [zc - 2.5, zc + 2.5]) { v.cylX(6, z, 1.8, 13, 14, 'pink'); v.set(16, 5, z > zc ? zc + 1 : zc - 1, 'black'); }
  v.seg([3, 3, zc], [0, 5, zc], 0.6, 'pink');               // хвост
  v.cylX(5, zc, 0.8, 4, 8, 'gold'); v.cylZ(4, 5, 2, zc - 3, zc - 2, 'gold'); v.cylZ(4, 5, 2, zc + 2, zc + 3, 'gold'); // ключ
  for (const x of [6, 13]) { v.set(x, 0, zc - 3, 'black'); v.set(x, 0, zc + 3, 'black'); }
  return one(v, 16);
}

export function top(): ModelDef {
  const v = new Vox(20, 16, 20), c = 10;
  v.fill((x, y, z) => {
    const r = Math.hypot(x - c, z - c), prof = y < 2 ? y * 1.5 : y < 9 ? 3 + (y - 2) * 1.0 : 10 - (y - 9) * 1.4;
    if (r > prof) return undefined;
    const a = Math.atan2(z - c, x - c);
    return y > 11 ? 'gold' : Math.floor((a + Math.PI) / (Math.PI / 4)) % 2 ? 'red' : 'fabric_y';
  }, 0, 20, 0, 13, 0, 20);
  v.cylY(c, c, 1, 12, 16, 'wood'); v.cylY(c, c, 1.6, 15, 16, 'red');
  return { size: 18, parts: [{ name: 'spin', vox: v, pivot: [c, 0, c] }] };
}

export function rcCar(): ModelDef {
  const v = new Vox(28, 12, 18), zc = 9;
  for (const x of [6, 21]) { wheel(v, x, 3.5, 3.5, 0, 3.5, 'rubber', 'yel'); wheel(v, x, 3.5, 3.5, 14.5, 18, 'rubber', 'yel'); }
  v.box(2, 26, 3, 7, 3.5, 14.5, 'blue');
  v.box(8, 18, 7, 10, 4.5, 13.5, 'blue_l');
  v.box(9, 17, 7.5, 9.5, 4.2, 13.8, 'glass');
  v.box(0, 4, 8, 9, 2, 16, 'black');                         // спойлер
  v.box(1, 2, 6, 8, 3, 4, 'black'); v.box(1, 2, 6, 8, 14, 15, 'black');
  for (let x = 4; x < 24; x += 4) v.box(x, x + 2, 7, 7.5, zc - 1, zc + 1, 'white');
  v.seg([5, 9, 14], [3, 17, 14], 0.4, 'black'); v.set(3, 17, 14, 'lamp_r'); // антенна
  v.box(25, 26, 4, 6, 4, 6, 'lamp'); v.box(25, 26, 4, 6, 12, 14, 'lamp');
  return one(v, 24);
}

export function toyRobot(): ModelDef {
  const v = new Vox(16, 30, 18), zc = 9;
  for (const z of [zc - 4, zc + 4]) { v.box(5, 11, 0, 3, z - 2.5, z + 2.5, 'red'); v.box(6, 10, 3, 11, z - 1.8, z + 1.8, 'steel'); }
  v.box(3, 13, 11, 22, zc - 6, zc + 6, 'steel_l');            // корпус
  v.box(12.5, 13.5, 13, 20, zc - 4, zc + 4, 'steel_d');       // панель
  for (let i = 0; i < 3; i++) v.set(13, 18 - i * 2, zc - 2 + i * 2, ['lamp_r', 'lamp_g', 'lamp_o'][i]);
  v.box(5, 11, 22, 29, zc - 3.5, zc + 3.5, 'steel');           // голова
  v.box(10.5, 11.5, 25, 27, zc - 2.5, zc - 1, 'lamp_o'); v.box(10.5, 11.5, 25, 27, zc + 1, zc + 2.5, 'lamp_o');
  v.box(10.5, 11.5, 23, 24, zc - 2, zc + 2, 'gun_d');
  v.seg([8, 29, zc], [8, 32, zc], 0.5, 'gun');
  for (const s of [-1, 1]) { v.box(6, 10, 13, 21, zc + s * 7.5 - 1.5, zc + s * 7.5 + 1.5, 'red'); gun(v, 9, 16, 14, zc + s * 7.5, 1.1, 'gun', 'gun_d'); }
  return one(v, 24);
}

export function plane(): ModelDef {
  const v = new Vox(30, 8, 26), zc = 13;
  // бумажный самолётик: две плоскости-крыла и киль
  v.fill((x, y, z) => { const half = (x / 30) * 12; return Math.abs(z - zc) <= half && y < 1.6 + (12 - Math.abs(z - zc)) * 0.0 ? (Math.abs(z - zc) < 1 ? 'paper_d' : 'paper') : undefined; }, 0, 30, 0, 2, 0, 26);
  v.fill((x, y, z) => (Math.abs(z - zc) < 1 && y < 1 + (x / 30) * 6 ? 'paper_d' : undefined), 0, 30, 0, 8, 0, 26);
  v.fill((x, y, z) => (Math.abs(z - zc) > 4 && Math.abs(z - zc) < 5 && x > 6 ? 'fabric_b' : undefined), 0, 30, 1, 2, 0, 26);
  return one(v, 30);
}

export function blockGolem(): ModelDef {
  const v = new Vox(30, 34, 30), c = 15;
  const cube = (x: number, y: number, z: number, s: number, col: string, letter?: string) => {
    v.box(x, x + s, y, y + s, z, z + s, col);
    v.box(x + 1, x + s - 1, y + 1, y + s - 1, z - 0.01, z + s + 0.01, 'cream');
    if (letter) v.box(x + s / 2 - 1, x + s / 2 + 1, y + 2, y + s - 2, z - 0.02, z + s + 0.02, col);
  };
  cube(4, 0, 4, 9, 'toy_b', 'A'); cube(17, 0, 4, 9, 'red', 'B'); cube(4, 0, 17, 9, 'toy_g'); cube(17, 0, 17, 9, 'toy_y');
  cube(7, 9, 7, 16, 'red', 'Г');
  cube(10, 25, 10, 9, 'toy_y');
  v.box(19, 21, 28, 31, 12, 14, 'black'); v.box(19, 21, 28, 31, 16, 18, 'black');           // глаза
  for (const z of [1, 26]) v.box(11, 19, 13, 16, z, z + 3, 'toy_g');                        // руки-кубики
  void c;
  return one(v, 30);
}

export function jackBox(): ModelDef {
  const v = new Vox(22, 30, 22), c = 11;
  v.box(1, 21, 0, 14, 1, 21, 'fabric_b');
  v.fill((x, y, z) => ((Math.floor(x / 3) + Math.floor(y / 3) + Math.floor(z / 3)) % 2 ? 'fabric_y' : undefined), 1, 21, 0, 14, 1, 21);
  v.box(1, 21, 13, 14, 1, 21, 'red');
  v.box(20, 21, 14, 26, 1, 21, 'fabric_b');                                 // откинутая крышка
  v.cylZ(4, 8, 2.4, 21, 22, 'gold'); v.cylX(8, 21.5, 0.8, 1, 4, 'gold');     // ручка
  for (let i = 0; i < 4; i++) v.cylY(c, c, 3.6 - (i % 2) * 0.8, 14 + i * 2, 16 + i * 2, 'steel_l');   // пружина
  v.sphere(c, 25, c, 4.6, 'white');
  v.ell(c + 3, 25.5, c, 1.6, 1, 3, 'red');                                   // нос
  v.set(c + 4, 27, c - 2, 'black'); v.set(c + 4, 27, c + 2, 'black');
  v.box(c - 1, c + 4, 29, 30, c - 4, c + 4, 'red'); v.box(c - 2, c + 2, 30, 32, c - 2, c + 2, 'fabric_y');   // колпак
  return one(v, 22);
}

export function rcTank(): ModelDef {
  return tankSpec({
    L: 46, W: 34, tH: 10, hH: 7, body: 'navy_l', dark: 'navy', light: 'blue_l', wheel: 'yel', round: false, wheels: 5,
    tr: 9, tH2: 7, turret: 'navy_l', barrel: 18, bR: 2, twin: true,
    extra: (h, t, c) => {
      for (const zz of [c.zc - 18, c.zc + 17]) h.box(c.x0 + 2, c.x1 - 6, c.yT - 2, c.yT, zz, zz + 1, 'yel');
      t.seg([c.tcx - 6, c.TH, c.tcz + 5], [c.tcx - 8, c.TH + 16, c.tcz + 5], 0.6, 'black'); t.set(c.tcx - 8, c.TH + 16, c.tcz + 5, 'lamp_r');
      t.box(c.tcx - 4, c.tcx + 2, c.TH, c.TH + 3, c.tcz - 4, c.tcz + 1, 'gun');
      h.box(c.x1 - 3, c.x1 - 1, c.yT - 4, c.yT - 2, c.zc - 14, c.zc - 11, 'lamp'); h.box(c.x1 - 3, c.x1 - 1, c.yT - 4, c.yT - 2, c.zc + 11, c.zc + 14, 'lamp');
    },
  });
}

// ---------------------------------------------------------------- босс: Пульт-тиран
// Огромный боевой робот на радиоуправлении: ноги-гусеницы, торс с ракетницами и руками-пушками,
// на спине — гигантский пульт с телескопической антенной (слабое место, мигает красным).
export function bossTyrant(): ModelDef {
  const NX = 92, NZ = 100, c = NZ / 2;
  const legs = new Vox(NX, 44, NZ);
  for (const s of [-1, 1]) {
    const zz = c + s * 25;
    tracks(legs, 8, 84, 16, zz - 10, zz + 10, 5, 'yel', 'gun_d');
    cbox(legs, 14, 78, 12, 20, zz - 11, zz + 11, 'navy', 3, 2);                    // надгусеничная броня
    seams(legs, 14, 78, 12, 20, zz - 11, zz + 11, 12, 0, 0, 'navy_d');
    legs.box(76, 80, 14, 17, zz - 8, zz - 5, 'lamp'); legs.box(76, 80, 14, 17, zz + 5, zz + 8, 'lamp');
    cbox(legs, 34, 58, 20, 38, zz - 7, zz + 7, 'navy_l', 2, 0);                     // голень
    legs.box(32, 60, 26, 30, zz - 8, zz + 8, 'yel');
    legs.cylZ(46, 36, 5, zz - 9, zz + 9, 'gun');                                   // колено-шарнир
    legs.cylZ(46, 36, 2, zz - 9.5, zz + 9.5, 'yel');
  }
  cbox(legs, 30, 62, 34, 44, c - 30, c + 30, 'navy_d', 3, 2);                         // таз
  legs.cylY(46, c, 12, 40, 44, 'gun');

  const T = new Vox(84, 74, NZ), tc = c;
  // торс со скосами, швы панелей, грудная плита со звездой
  cbox(T, 18, 62, 0, 36, tc - 24, tc + 24, 'navy_l', 4, 3);
  T.cut(1, 0.9, 0, 62 + 0.9 * 22, 48, 63, 18, 37);
  seams(T, 18, 62, 0, 36, tc - 24, tc + 24, 11, 9, 12, 'navy');
  cbox(T, 56, 64, 6, 26, tc - 14, tc + 14, 'yel', 2, 1);
  for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [0, -2], [2, 0], [-2, 0]]) T.set(64, 16 + a, tc + b, 'lamp_o');
  for (let z = tc - 20; z < tc + 20; z += 4) T.box(18, 20, 10, 30, z, z + 2, 'gun_d');   // решётка на спине
  // голова: шлем, визор, «уши»-антенны
  cbox(T, 34, 58, 36, 52, tc - 12, tc + 12, 'navy', 3, 3);
  T.box(54, 59, 42, 47, tc - 10, tc + 10, 'gun_d');
  T.box(58, 59.5, 43, 46, tc - 8, tc - 2, 'eye_r'); T.box(58, 59.5, 43, 46, tc + 2, tc + 8, 'eye_r');
  T.box(56, 59, 37, 40, tc - 6, tc + 6, 'steel_l');
  for (let z = tc - 5; z < tc + 6; z += 2) T.box(58, 59.2, 37, 40, z, z + 1, 'gun_d');      // «зубы»-решётка
  for (const s of [-1, 1]) { T.cylZ(46, 46, 3.5, tc + s * 12 - (s > 0 ? 0 : 2), tc + s * 12 + (s > 0 ? 2 : 0), 'yel'); T.seg([46, 49, tc + s * 13], [42, 58, tc + s * 15], 0.6, 'steel_l'); T.set(42, 58, tc + s * 15, 'lamp_g'); }
  T.box(38, 54, 52, 54, tc - 3, tc + 3, 'red');                                         // гребень
  // плечи: ракетные блоки, руки с пушками
  for (const s of [-1, 1]) {
    const zz = tc + s * 34;
    cbox(T, 22, 56, 14, 38, zz - 10, zz + 10, 'navy', 3, 3);
    cbox(T, 24, 54, 36, 44, zz - 9, zz + 9, 'red', 2, 2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { T.cylX(39 - j * 4.5, zz - 5 + i * 5, 1.7, 50, 55, 'gun_d'); T.cylX(39 - j * 4.5, zz - 5 + i * 5, 1, 54, 55.2, 'lamp_o'); }
    seams(T, 22, 56, 14, 38, zz - 10, zz + 10, 0, 8, 0, 'navy_d');
    // рука: плечо → локоть → предплечье-пушка вперёд
    T.seg([38, 16, zz], [42, 4, zz], 3.2, 'gun');
    T.sphere(42, 6, zz, 4.4, 'yel');
    cbox(T, 38, 64, 1, 12, zz - 5, zz + 5, 'navy_l', 2, 2);
    gun(T, 62, 80, 6.5, zz - s * 1.5, 2.6, 'gun', 'gun_d');
    gun(T, 62, 76, 6.5, zz + s * 3, 1.4, 'gun_l', 'gun_d');
  }
  // гигантский пульт на спине: корпус, джойстики, кнопки, антенна
  cbox(T, 2, 18, 2, 42, tc - 18, tc + 18, 'black', 3, 3);
  T.box(1, 2, 8, 36, tc - 14, tc + 14, 'gun');
  for (const zz of [tc - 8, tc + 8]) { T.cylX(26, zz, 5, 0.5, 2, 'gun_d'); T.seg([1, 26, zz], [-3 + 4, 33, zz], 1, 'steel'); T.sphere(1, 34, zz, 2.2, 'red'); }
  for (let i = 0; i < 4; i++) T.cylX(12, tc - 9 + i * 6, 1.6, 0.5, 2, ['red', 'lamp_g', 'yel', 'blue'][i]);
  T.box(3, 15, 42, 44, tc - 4, tc + 12, 'gun');
  for (let y = 44; y < 72; y += 1) T.cylY(9, tc + 8, y < 52 ? 1.6 : y < 62 ? 1.2 : 0.9, y, y + 1, (y % 8) < 1 ? 'steel' : 'steel_l');
  T.sphere(9, 72, tc + 8, 2.8, 'lamp_r');
  return {
    size: 100,
    parts: [
      { name: 'hull', vox: legs, pivot: [46, 0, c] },
      { name: 'turret', vox: T, pivot: [40, 0, tc], at: [0, 42, 0] },
    ],
  };
}

// ---------------------------------------------------------------- препятствия
const BLOCK_COL = ['red', 'toy_b', 'toy_g', 'toy_y', 'purple'];
export function block(v: number): ModelDef {
  const n = 14, b = new Vox(n, 14, n), col = BLOCK_COL[v % 5];
  b.box(0, n, 0, 14, 0, n, col);
  b.box(1, n - 1, 1, 13, -0.01, n + 0.01, 'cream'); b.box(-0.01, n + 0.01, 1, 13, 1, n - 1, 'cream');
  b.box(1, n - 1, 13, 14, 1, n - 1, 'cream');
  // буквы-полоски
  b.box(5, 9, 3, 11, -0.02, n + 0.02, col); b.box(-0.02, n + 0.02, 3, 11, 5, 9, col); b.box(4, 10, 13.5, 14, 6, 8, col);
  return one(b, n, [n, n]);
}

const BOOK_COL = ['fabric_r', 'fabric_b', 'green', 'purple'];
export function book(v: number): ModelDef {
  const b = new Vox(28, 7, 20), col = BOOK_COL[v % 4];
  b.box(0, 28, 0, 1, 0, 20, col); b.box(0, 28, 6, 7, 0, 20, col); b.box(0, 2, 0, 7, 0, 20, col);
  b.box(2, 27.5, 1, 6, 0.5, 19.5, 'paper');
  b.fill((x, y) => (Math.floor(y) % 2 ? 'paper_d' : undefined), 27, 28, 1, 6, 1, 19);
  b.box(8, 20, 6.5, 7, 6, 14, 'gold');
  return one(b, 28, [28, 20]);
}

const CRAYON_COL = ['red', 'toy_b', 'toy_g', 'toy_y', 'purple'];
export function crayon(v: number): ModelDef {
  const b = new Vox(40, 6, 6), col = CRAYON_COL[v % 5];
  b.cylX(3, 3, 2.8, 0, 32, col);
  b.cylX(3, 3, 2.9, 6, 26, 'paper');
  b.fill((x) => (Math.floor(x) % 5 === 0 ? col : undefined), 6, 26, 0, 6, 0, 6);
  b.cylX(3, 3, 2.8, 32, 40, col, 0.6);
  return one(b, 40, [40, 6]);
}

export function furnitureLeg(): ModelDef {
  const b = new Vox(16, 40, 16);
  b.cylY(8, 8, 7, 0, 3, 'wood_d'); b.cylY(8, 8, 6, 3, 40, 'wood'); b.cylY(8, 8, 6.5, 18, 21, 'wood_l');
  return one(b, 16, [16, 16]);
}

const MARBLE_COL = ['water_l', 'red_l', 'toy_g', 'gold'];
export function marble(v: number): ModelDef {
  const b = new Vox(12, 12, 12);
  b.sphere(6, 6, 6, 5.6, 'glass');
  b.paint((x, y, z) => (Math.abs(Math.sin(x * 0.9 + z * 0.6 + y * 0.3)) < 0.25 ? MARBLE_COL[v % 4] : undefined));
  b.set(4, 9, 4, 'white');
  return one(b, 12, [12, 12]);
}

void rotor;
