// Ступень III «Комната»: пыль, пылесосы, жестяные танки, лампы, паровозики, мебель.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { tankSpec, wheel, gun, rotor, one, cbox, seams, tracks, pipe, leg } from './kit';

export function dustBunny(): ModelDef {
  const v = new Vox(16, 14, 16), c = 8;
  v.fill((x, y, z) => {
    const r = Math.hypot(x - c, (y - 6) * 1.15, z - c), n = Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - y) * 1.3;
    return r < 6 + n ? ((x * 7 + y * 3 + z * 5) % 4 === 0 ? 'white_d' : 'stone_l') : undefined;
  });
  for (const z of [c - 2.5, c + 2]) { v.box(13, 14, 7, 9, z, z + 1, 'white'); v.set(13, 7, z, 'black'); }
  return one(v, 14);
}

export function quad(): ModelDef {
  const v = new Vox(24, 8, 24), c = 12;
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { v.seg([c, 3, c], [c + a * 8, 3, c + b * 8], 0.8, 'gun'); v.cylY(c + a * 8, c + b * 8, 1.6, 2, 5, 'gun_d'); }
  cbox(v, c - 5, c + 5, 1, 6, c - 4, c + 4, 'white', 1, 1);
  v.box(c + 4, c + 6, 2, 4, c - 1, c + 1, 'gun_d'); v.set(c + 5, 3, c, 'lamp_r');
  v.box(c - 2, c + 2, 0, 1, c - 2, c + 2, 'gun');
  const parts: PartDef[] = [{ name: 'body', vox: v }];
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) parts.push({ name: 'rotor', vox: rotor(4.5, 'steel_l', 2), at: [a * 8, 5, b * 8] });
  return { size: 24, parts };
}

export function vacBot(): ModelDef {
  const v = new Vox(32, 9, 32), c = 16;
  v.cylY(c, c, 15, 0, 6, 'gun', 15);
  v.cylY(c, c, 14, 5, 7, 'white_d', 13);
  v.cylY(c, c, 7, 7, 8, 'gun_d');
  v.cylY(c, c, 2, 8, 8.5, 'lamp_g');
  v.box(c + 10, c + 15, 1, 5, c - 8, c + 8, 'gun_d');                         // бампер
  for (const s of [-1, 1]) { v.seg([c + 12, 0.5, c + s * 10], [c + 17, 0.5, c + s * 14], 0.6, 'yel'); v.seg([c + 12, 0.5, c + s * 10], [c + 16, 0.5, c + s * 6], 0.6, 'yel'); }
  v.box(c + 13, c + 14, 3, 4, c - 3, c + 3, 'lamp_o');
  return one(v, 30);
}

export function tinTank(): ModelDef {
  return tankSpec({
    L: 34, W: 26, tH: 7, hH: 6, body: 'steel_l', dark: 'steel', light: 'chrome', wheel: 'red', tr: 7, tH2: 5, turret: 'steel_l', barrel: 14, bR: 1.6,
    extra: (h, t, c) => {
      for (const zz of [c.zc - 14, c.zc + 13]) { for (let x = c.x0 + 2; x < c.x1 - 4; x += 3) h.set(x, c.yT - 3, zz, 'gun_d'); h.box(c.x0 + 2, c.x1 - 6, c.yT - 5, c.yT - 4, zz, zz + 1, 'red'); }
      t.cylY(c.tcx, c.tcz, 2.5, c.TH, c.TH + 2, 'red');
      t.cylX(c.TH + 2, c.tcz, 1, c.tcx - 10, c.tcx - 6, 'gold');                        // заводной ключ
      t.cylZ(c.tcx - 10, c.TH + 2, 2.4, c.tcz - 0.5, c.tcz + 0.5, 'gold');
    },
  });
}

export function deskLamp(): ModelDef {
  const b = new Vox(30, 8, 30), c = 15;
  b.cylY(c, c, 12, 0, 3, 'gun', 11); b.cylY(c, c, 3, 3, 6, 'gun_d');
  b.box(c - 9, c - 5, 3, 4, c + 4, c + 8, 'red');                                   // кнопка
  const t = new Vox(40, 34, 16), tc = 8;
  t.seg([6, 0, tc], [12, 18, tc], 1.4, 'steel_l');
  t.cylZ(12, 18, 2.4, tc - 2, tc + 2, 'gun_d');
  t.seg([12, 18, tc], [26, 26, tc], 1.4, 'steel_l');
  t.cylZ(26, 26, 2.4, tc - 2, tc + 2, 'gun_d');
  t.seg([7, 2, tc - 2], [11, 16, tc - 2], 0.4, 'gold'); t.seg([13, 19, tc + 2], [24, 25, tc + 2], 0.4, 'gold');   // пружины
  t.cylX(24, tc, 4, 24, 30, 'toy_g', 7);                                            // абажур-конус
  t.cylX(24, tc, 6.5, 30, 32, 'green_d');
  t.cylX(24, tc, 5, 31, 32.5, 'lamp');
  return { size: 34, parts: [{ name: 'body', vox: b }, { name: 'turret', vox: t, pivot: [6, 0, tc], at: [0, 6, 0] }] };
}

export function toyTrain(): ModelDef {
  const v = new Vox(56, 30, 24), zc = 12;
  for (let i = 0; i < 4; i++) for (const z of [2, 19]) wheel(v, 10 + i * 11, 5, 5, z, z + 3, 'red', 'gold');
  v.box(4, 52, 4, 8, zc - 8, zc + 8, 'gun_d');
  v.cylX(15, zc, 8, 20, 48, 'green');                                               // котёл
  for (const x of [24, 32, 40]) v.cylX(15, zc, 8.5, x, x + 1, 'gold');
  v.cylX(15, zc, 7, 48, 50, 'gun_d'); v.cylX(15, zc, 3, 50, 51, 'lamp');
  pipe(v, 42, zc, 3, 22, 28, 'gun_d', 'gold');
  v.sphere(32, 23, zc, 3, 'gold');
  cbox(v, 6, 21, 8, 27, zc - 9, zc + 9, 'red', 1, 1);                               // будка
  v.box(5, 22, 26, 28, zc - 10, zc + 10, 'gun_d');
  for (const z of [zc - 9.2, zc + 8.2]) v.box(9, 18, 16, 22, z, z + 1, 'glass');
  v.fill((x, y, z) => (x - 50 > -y * 0.8 + 1 ? undefined : 'yel'), 50, 56, 0, 8, zc - 8, zc + 8);   // путеочиститель
  return one(v, 54);
}

export function bookMortar(): ModelDef {
  const b = new Vox(36, 16, 30), c = 15;
  const cols = ['fabric_r', 'fabric_b', 'green', 'yel', 'purple'];
  for (let i = 0; i < 4; i++) { const w = 15 - i * 1.5, l = 17 - i; b.box(18 - l, 18 + l, i * 4, i * 4 + 3.5, c - w, c + w, cols[i]); b.box(18 - l + 1, 18 + l, i * 4 + 0.5, i * 4 + 3, c - w + 0.5, c + w - 0.5, 'paper'); }
  const t = new Vox(44, 20, 14), tc = 7;
  t.cylZ(14, 3, 3, tc - 6, tc + 6, 'wood_d');
  t.seg([14, 3, tc], [0, 14, tc], 1.3, 'wood');                                     // рычаг-линейка
  for (let x = 2; x < 13; x += 3) t.set(x, 13 - x * 0.75, tc + 1, 'black');
  t.ell(0, 15, tc, 3.5, 2, 3.5, 'steel');                                           // ложка
  t.box(-2 + 2, 2, 15, 17, tc - 2, tc + 2, 'red');                                  // «снаряд» — ластик
  return { size: 36, parts: [{ name: 'body', vox: b }, { name: 'turret', vox: t, pivot: [14, 0, tc], at: [0, 16, 0] }] };
}

export function robotDog(): ModelDef {
  const v = new Vox(70, 44, 40), zc = 20;
  for (const [x, s] of [[52, -1], [52, 1], [16, -1], [16, 1]] as const) leg(v, [x, 22, zc + s * 10], [x + 4, 12, zc + s * 12], [x, 1, zc + s * 12], 3, 'steel_l', 'gun_d');
  cbox(v, 8, 60, 18, 32, zc - 11, zc + 11, 'white', 3, 3);
  seams(v, 8, 60, 18, 32, zc - 11, zc + 11, 13, 0, 0, 'white_d');
  v.box(10, 56, 30, 33, zc - 4, zc + 4, 'red');
  cbox(v, 54, 70, 26, 40, zc - 8, zc + 8, 'white', 2, 2);                           // голова
  v.box(66, 70, 26, 32, zc - 5, zc + 5, 'gun_d');                                  // морда
  v.box(69, 70.2, 35, 37, zc - 6, zc - 2, 'lamp_g'); v.box(69, 70.2, 35, 37, zc + 2, zc + 6, 'lamp_g');
  for (const s of [-1, 1]) v.box(56, 62, 38, 44, zc + s * 7 - 1.5, zc + s * 7 + 1.5, 'gun');   // уши
  v.seg([8, 30, zc], [0, 40, zc], 1.4, 'steel'); v.set(0, 40, zc, 'lamp_r');         // хвост-антенна
  gun(v, 40, 64, 35, zc, 2, 'gun', 'gun_d');                                        // пушка на спине
  v.cylY(40, zc, 4, 32, 37, 'gun_d');
  return one(v, 66);
}

// ---------------------------------------------------------------- босс: Пылесос-левиафан
// Гигантский пылесос-танк: корпус-баллон с прозрачным пылесборником, гофрированный шланг
// и щётка-пасть спереди (поворачивается), сзади — раскалённый выхлоп (слабое место).
export function bossVacuum(): ModelDef {
  const NX = 112, NZ = 92, c = NZ / 2;
  const h = new Vox(NX, 64, NZ);
  for (const s of [-1, 1]) tracks(h, 10, 98, 18, c + s * 34 - 9, c + s * 34 + 9, 6, 'gun_l', 'gun_d');
  h.fill((x, y, z) => {
    const r = ((x - 54) / 46) ** 2 + ((y - 30) / 28) ** 2 + ((z - c) / 32) ** 2;
    if (r > 1) return undefined;
    return y < 18 ? 'gun' : y < 20 ? 'chrome' : 'purple';
  }, 0, NX, 8, 60, 0, NZ);
  h.paint((x, y) => (y > 46 ? 'alien_l' : undefined));
  seams(h, 0, NX, 20, 60, 0, NZ, 0, 9, 0, 'purple_d');
  // прозрачный пылесборник с пылью
  h.ell(58, 50, c, 22, 12, 18, 'glass');
  h.fill((x, y, z) => ((((x - 58) / 20) ** 2 + ((z - c) / 16) ** 2 < 1 && y < 48 + Math.sin(x * 0.7) * 1.5) ? ((x + z) % 3 ? 'stone' : 'stone_l') : undefined), 36, 80, 40, 52, c - 18, c + 18);
  h.box(54, 62, 60, 62, c - 2, c + 2, 'gun_d');
  for (const x of [44, 72]) h.seg([x, 54, c], [x, 64, c], 2, 'gun_d');
  h.box(44, 73, 62, 64, c - 3, c + 3, 'gun_d');                                     // ручка
  // кабельный барабан на борту
  for (const s of [-1, 1]) { h.cylZ(40, 32, 9, c + s * 30 - 3, c + s * 30 + 3, 'gun_d'); h.cylZ(40, 32, 6, c + s * 33 - 1, c + s * 33 + 1, 'yel'); h.cylZ(40, 32, 2, c + s * 34, c + s * 34 + 1, 'chrome'); }
  // выхлоп: решётка с жаром и три трубы
  cbox(h, 2, 14, 18, 44, c - 18, c + 18, 'gun_d', 2, 2);
  for (let y = 21; y < 42; y += 3) h.box(1, 3, y, y + 1.5, c - 15, c + 15, 'lamp_o');
  for (const zz of [c - 12, c, c + 12]) { h.cylX(48, zz, 3.5, 2, 12, 'gun'); h.cylX(48, zz, 2.2, 1.5, 3, 'fire'); }
  // шланг и пасть-щётка (часть «turret»)
  const T = new Vox(84, 50, 72), tc = 36;
  let prev: [number, number, number] = [6, 30, tc];
  for (let i = 1; i <= 24; i++) {
    const t = i / 24, x = 6 + t * 58, y = 30 + Math.sin(t * Math.PI) * 14 - t * 22;
    T.sphere(x, y, tc, i % 2 ? 5.2 : 4.6, i % 2 ? 'gun' : 'gun_l');
    prev = [x, y, tc];
  }
  void prev;
  cbox(T, 60, 82, 0, 12, tc - 32, tc + 32, 'purple', 3, 2);
  T.box(78, 83, 0, 6, tc - 30, tc + 30, 'black');                                    // пасть
  for (let z = tc - 29; z < tc + 29; z += 2) T.box(80, 84, 0, 2, z, z + 1, 'yel');  // щётка
  T.box(62, 80, 12, 14, tc - 20, tc + 20, 'chrome');
  for (const s of [-1, 1]) { T.cylZ(64, 4, 4, tc + s * 32 - 2, tc + s * 32 + 2, 'rubber'); T.box(76, 82, 7, 10, tc + s * 26 - 3, tc + s * 26 + 3, 'lamp'); }
  for (const zz of [tc - 10, tc + 10]) { T.box(74, 79, 8, 12, zz - 3, zz + 3, 'gun_d'); T.box(78, 79.5, 9, 11, zz - 2, zz + 2, 'eye_r'); }
  return {
    size: 104,
    parts: [
      { name: 'hull', vox: h, pivot: [56, 0, c] },
      { name: 'turret', vox: T, pivot: [6, 0, tc], at: [40, 0, 0] },
    ],
  };
}

// ---------------------------------------------------------------- препятствия
export function bed(): ModelDef {
  const v = new Vox(52, 18, 36);
  for (const [x, z] of [[1, 1], [49, 1], [1, 33], [49, 33]]) v.box(x, x + 2, 0, 6, z, z + 2, 'wood_d');
  v.box(0, 52, 4, 8, 0, 36, 'wood');
  v.box(1, 51, 8, 12, 1, 35, 'white');
  v.box(14, 51.5, 11, 13, 0.5, 35.5, 'fabric_b');                                   // одеяло
  v.paint((x, y, z) => ((Math.floor(x / 4) + Math.floor(z / 4)) % 2 ? 'blue_l' : undefined), 14, 52, 12, 13, 0, 36);
  v.box(14, 52, 7, 12, 0, 1, 'fabric_b'); v.box(14, 52, 7, 12, 35, 36, 'fabric_b');
  v.ell(7, 13, 10, 5, 2.5, 7, 'white'); v.ell(7, 13, 26, 5, 2.5, 7, 'white');
  v.box(0, 2, 4, 18, 0, 36, 'wood_d');                                             // спинка
  v.box(0, 2.2, 15, 17, 2, 34, 'wood_l');
  return one(v, 52, [52, 36]);
}

export function wardrobe(): ModelDef {
  const v = new Vox(42, 44, 18);
  cbox(v, 0, 42, 0, 42, 0, 18, 'wood', 0, 1);
  v.box(0.5, 41.5, 42, 44, 0, 18, 'wood_d');
  for (const x of [1, 21.5]) v.box(x, x + 19.5, 3, 40, 17.5, 18.2, 'wood_l');
  v.box(20.5, 21.5, 3, 40, 17.5, 18.4, 'wood_d');
  v.box(18, 19, 20, 24, 18.2, 19, 'gold'); v.box(23, 24, 20, 24, 18.2, 19, 'gold');
  return one(v, 42, [42, 18]);
}

export function desk(): ModelDef {
  const v = new Vox(46, 26, 22);
  for (const [x, z] of [[1, 1], [43, 1], [1, 19], [43, 19]]) v.box(x, x + 2, 0, 22, z, z + 2, 'wood_d');
  v.box(0, 46, 22, 24, 0, 22, 'wood');
  v.box(30, 45, 12, 22, 1, 21, 'wood_l');                                           // тумба
  for (const y of [14, 18]) { v.box(30, 45, y, y + 0.6, 21, 21.3, 'wood_d'); v.box(36, 39, y + 1.5, y + 2.5, 21, 21.6, 'gold'); }
  v.box(4, 12, 24, 25, 4, 10, 'paper'); v.box(16, 24, 24, 26, 12, 18, 'fabric_r');  // тетрадь, книга
  v.cylY(38, 6, 2, 24, 28, 'toy_b');                                                // стакан с карандашами
  return one(v, 46, [46, 22]);
}

export function shelf(): ModelDef {
  const v = new Vox(36, 30, 12);
  v.box(0, 36, 0, 30, 0, 12, 'wood_d');
  v.box(1, 35, 1, 29, 1.5, 12.5, 0);
  for (const y of [0, 10, 20, 29]) v.box(0, 36, y, y + 1, 0, 12, 'wood');
  const cols = ['fabric_r', 'fabric_b', 'green', 'yel', 'purple', 'orange'];
  for (const y of [1, 11, 21]) for (let x = 1, i = y; x < 34; i++) { const w = 2 + (i % 3), hh = 6 + (i * 7) % 3; v.box(x, x + w, y, y + hh, 2, 11, cols[i % 6]); x += w + (i % 5 === 0 ? 2 : 0); }
  return one(v, 36, [36, 12]);
}

export function box(v: number): ModelDef {
  const b = new Vox(12, 10, 12);
  b.box(0, 12, 0, 9, 0, 12, 'cardboard');
  b.box(0, 12, 8.5, 9, 0, 12, 'cardboard_d');
  b.box(0, 12, 8.6, 9.1, 5, 7, v % 2 ? 'paper' : 'yel_l');                         // скотч
  b.box(-0.01, 0.6, 3, 6, 4, 8, 'cardboard_d');
  if (v % 3 === 2) b.box(4, 8, 9, 10, 4, 8, 'cardboard');
  return one(b, 12, [12, 12]);
}

const BOOK_COL = ['fabric_r', 'fabric_b', 'green', 'purple', 'yel', 'orange'];
export function bookStack(v: number): ModelDef {
  const b = new Vox(28, 24, 20);
  for (let i = 0; i < 3 + (v % 2); i++) {
    const o = ((i * 5 + v) % 3 - 1) * 2, col = BOOK_COL[(i + v) % 6], y = i * 5;
    b.box(2 + o, 26 + o, y, y + 5, 2, 18, col);
    b.box(3 + o, 25.5 + o, y + 1, y + 4, 2, 17, 'paper');
    b.paint((x, yy) => (Math.floor(yy) === y + 2 ? 'paper_d' : undefined), 3 + o, 26 + o, y + 1, y + 4, 2, 17);
  }
  return one(b, 28, [28, 20]);
}

export function toyDebris(v: number): ModelDef {
  const b = new Vox(10, 8, 10), cols = ['red', 'toy_b', 'toy_g', 'toy_y', 'purple'];
  const col = cols[v % 5];
  if (v % 3 === 0) { b.box(1, 9, 0, 4, 2, 8, col); for (const x of [3, 6]) for (const z of [3.5, 6.5]) b.cylY(x, z, 1, 4, 5, col); }
  else if (v % 3 === 1) b.sphere(5, 4, 5, 4, col);
  else { b.box(2, 8, 0, 3, 2, 8, col); b.box(4, 6, 3, 6, 4, 6, 'white'); }
  return one(b, 10, [10, 10]);
}

export function slipper(v: number): ModelDef {
  const b = new Vox(28, 8, 12), col = v % 2 ? 'pink' : 'fabric_b';
  b.ell(14, 1.5, 6, 13.5, 1.6, 5.5, 'cream');
  b.fill((x, y, z) => (((x - 18) / 10) ** 2 + ((y - 2) / 6) ** 2 + ((z - 6) / 5.6) ** 2 < 1 && y > 1 ? col : undefined));
  b.ell(26, 6, 6, 2, 2, 2, 'white');
  return one(b, 28, [28, 12]);
}

export function pillow(v: number): ModelDef {
  const b = new Vox(28, 8, 14), col = v % 2 ? 'white' : 'fabric_y';
  b.fill((x, y, z) => { const dx = Math.abs(x - 14) / 14, dz = Math.abs(z - 7) / 7, hh = 7 * (1 - dx ** 4) * (1 - dz ** 4); return y < hh ? col : undefined; });
  b.paint((x, y, z) => ((Math.floor(x / 3) + Math.floor(z / 3)) % 2 && y > 5 ? 'white_d' : undefined));
  return one(b, 28, [28, 14]);
}

void wheel;
