// Ступень III «Комната»: пыль, пылесосы, жестяные танки, лампы, паровозики, мебель.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { tankSpec, wheel, gun, rotor, one, cbox, seams, tracks, pipe, leg } from './kit';

export function dustBunny(): ModelDef {
  const v = new Vox(16, 14, 16), c = 8;
  v.fill((x, y, z) => {
    const r = Math.hypot(x - c, (y - 6) * 1.15, z - c), n = Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - y) * 1.3;
    return r < 6 + n ? ((x * 7 + y * 3 + z * 5) % 4 === 0 ? 'white_d' : 'stone_l') : undefined;
  });
  for (const z of [c - 2.5, c + 2]) { v.box(13, 14, 7, 9, z, z + 1, 'white'); v.set(13.5, 7.5, z, 'glow_r'); }
  return one(v, 14);
}

export function quad(): ModelDef {
  const v = new Vox(24, 8, 24), c = 12;
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { v.seg([c, 3, c], [c + a * 8, 3, c + b * 8], 0.8, 'gun'); v.cylY(c + a * 8, c + b * 8, 1.6, 2, 5, 'gun_d'); }
  cbox(v, c - 5, c + 5, 1, 6, c - 4, c + 4, 'white', 1, 1);
  v.box(c + 4, c + 6, 2, 4, c - 1, c + 1, 'gun_d'); v.set(c + 5, 3, c, 'glow_r'); v.box(c - 5, c + 5, 5.6, 6.2, c - 1, c + 1, 'red');
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
  v.cylY(c, c, 7.2, 7, 7.6, 'red'); v.cylY(c, c, 2, 8, 8.5, 'glow_r');
  v.box(c + 10, c + 15, 1, 5, c - 8, c + 8, 'gun_d');                         // бампер
  for (const s of [-1, 1]) { v.seg([c + 12, 0.5, c + s * 10], [c + 17, 0.5, c + s * 14], 0.6, 'yel'); v.seg([c + 12, 0.5, c + s * 10], [c + 16, 0.5, c + s * 6], 0.6, 'yel'); }
  v.box(c + 13, c + 14, 3, 4, c - 3, c + 3, 'glow_r');
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
  t.cylX(24, tc, 5, 31, 32.5, 'glow_r');
  return { size: 34, parts: [{ name: 'body', vox: b }, { name: 'turret', vox: t, pivot: [6, 0, tc], at: [0, 6, 0] }] };
}

export function toyTrain(): ModelDef {
  const v = new Vox(56, 30, 24), zc = 12;
  for (let i = 0; i < 4; i++) for (const z of [2, 19]) wheel(v, 10 + i * 11, 5, 5, z, z + 3, 'red', 'gold');
  v.box(4, 52, 4, 8, zc - 8, zc + 8, 'gun_d');
  v.cylX(15, zc, 8, 20, 48, 'green');                                               // котёл
  for (const x of [24, 32, 40]) v.cylX(15, zc, 8.5, x, x + 1, 'gold');
  v.cylX(15, zc, 7, 48, 50, 'gun_d'); v.cylX(15, zc, 3, 50, 51, 'glow_r'); v.cylY(42, zc, 2, 27.5, 28.2, 'glow_r');
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
  v.box(69, 70.2, 35, 37, zc - 6, zc - 2, 'glow_r'); v.box(69, 70.2, 35, 37, zc + 2, zc + 6, 'glow_r');
  for (const s of [-1, 1]) v.box(56, 62, 38, 44, zc + s * 7 - 1.5, zc + s * 7 + 1.5, 'gun');   // уши
  v.seg([8, 30, zc], [0, 40, zc], 1.4, 'steel'); v.set(0, 40, zc, 'glow_r');         // хвост-антенна
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

// ---------------------------------------------------------------- препятствия (мебель комнаты — крупная, подробная)
/** Кровать: точёные ножки, рама, матрас, стёганое одеяло в клетку с отогнутым краем, две подушки, спинка с филёнками. */
export function bed(): ModelDef {
  const X = 200, Z = 140, v = new Vox(X, 64, Z);
  for (const [x, z] of [[2, 2], [X - 8, 2], [2, Z - 8], [X - 8, Z - 8]]) v.box(x, x + 6, 0, 12, z, z + 6, 'wood_d');
  cbox(v, 0, X, 10, 20, 0, Z, 'wood', 2, 1);
  v.paint((x, y) => (y < 11.5 ? 'wood_d' : undefined));
  cbox(v, 4, X - 2, 20, 32, 3, Z - 3, 'white', 3, 3);                                     // матрас
  v.paint((x, y) => (y > 29 && y < 30 ? 'white_d' : undefined), 4, X - 2, 20, 32, 3, Z - 3);
  // одеяло: стёганые клетки, свисает с боков
  v.fill((x, y, z) => { if (x < 64) return undefined; const side = z < 6 || z > Z - 6; if (side && y > 18 && y < 33) return 'fabric_b'; if (!side && y >= 31 && y < 34) return 'fabric_b'; return undefined; }, 60, X, 16, 34, 0, Z);
  v.paint((x, y, z) => ((Math.floor((x - 60) / 14) + Math.floor(z / 14)) % 2 ? 'blue_l' : undefined), 60, X, 16, 34, 0, Z);
  v.paint((x, y, z) => ((x - 60) % 14 < 1 || z % 14 < 1 ? 'navy_l' : undefined), 60, X, 33, 34, 0, Z);
  v.box(58, 66, 31, 35, 4, Z - 4, 'white');                                               // отогнутый край
  for (const z of [Z * 0.27, Z * 0.73]) { v.ell(32, 37, z, 20, 6, 26, 'white'); v.paint((x, y, zz) => (Math.abs(zz - z) < 1 ? 'white_d' : undefined), 12, 52, 30, 44, z - 2, z + 2); }
  // спинка: доска с двумя филёнками и шарами на столбиках
  v.box(0, 6, 10, 62, 0, Z, 'wood_d');
  v.box(6, 7, 26, 54, 10, Z / 2 - 4, 'wood_l'); v.box(6, 7, 26, 54, Z / 2 + 4, Z - 10, 'wood_l');
  for (const z of [3, Z - 3]) { v.cylY(3, z, 4, 10, 62, 'wood'); v.sphere(3, 64, z, 4.2, 'wood_l'); }
  return one(v, X, [X, Z]);
}

/** Шкаф: две створки с филёнками, латунные ручки, карниз, ножки; сверху — коробки и чемодан. */
export function wardrobe(): ModelDef {
  const X = 200, Z = 86, H = 170, v = new Vox(X, H + 30, Z);
  v.box(4, X - 4, 0, 8, 4, Z - 4, 'wood_d');
  cbox(v, 0, X, 8, H, 0, Z, 'wood', 1, 1);
  v.box(-2, X + 2, H - 8, H, -2, Z + 2, 'wood_d'); v.box(-1, X + 1, H - 9, H - 8, -1, Z + 1, 'wood_l');   // карниз
  for (const [a, b] of [[4, X / 2 - 2], [X / 2 + 2, X - 4]]) {
    v.box(a, b, 14, H - 12, Z - 0.5, Z + 0.5, 'wood_l');
    v.box(a + 8, b - 8, 22, H * 0.5, Z, Z + 1, 'wood'); v.box(a + 8, b - 8, H * 0.55, H - 20, Z, Z + 1, 'wood');
    v.paint((x, y) => ((y > 22 && y < H * 0.5) || (y > H * 0.55 && y < H - 20) ? (Math.sin(x * 0.4 + y * 0.05) > 0.85 ? 'wood_d' : undefined) : undefined), a + 9, b - 9, 22, H - 20, Z, Z + 1);
  }
  v.box(X / 2 - 1, X / 2 + 1, 14, H - 12, Z - 0.5, Z + 0.8, 'wood_d');
  for (const x of [X / 2 - 6, X / 2 + 4]) v.box(x, x + 2, H * 0.45, H * 0.6, Z + 0.5, Z + 2.5, 'brass');
  // на шкафу: коробка и старый чемодан
  cbox(v, 20, 70, H, H + 22, 14, 60, 'cardboard', 1, 1); v.box(20, 70, H + 21, H + 22, 34, 40, 'paper');
  cbox(v, 100, 170, H, H + 16, 10, 70, 'fabric_r', 2, 2); v.box(126, 144, H + 16, H + 18, 36, 44, 'brass');
  for (const x of [108, 162]) v.box(x, x + 4, H, H + 16.4, 10, 70, 'wood_d');
  return one(v, X, [X, Z]);
}

/** Письменный стол: столешница, тумба с ящиками, на столе — раскрытая тетрадь, книги, лампа, стакан с карандашами. */
export function desk(): ModelDef {
  const X = 200, Z = 96, H = 70, v = new Vox(X, H + 40, Z);
  for (const [x, z] of [[2, 2], [2, Z - 8]]) v.box(x, x + 6, 0, H, z, z + 6, 'wood_d');
  cbox(v, 120, X - 2, 0, H, 4, Z - 4, 'wood', 1, 1);                                    // тумба
  for (let i = 0; i < 3; i++) { const y = 6 + i * 21; v.box(124, X - 6, y, y + 18, Z - 4, Z - 3, 'wood_l'); v.box(150, 168, y + 8, y + 10, Z - 3, Z - 1.5, 'brass'); }
  cbox(v, 0, X, H, H + 6, 0, Z, 'wood_l', 1, 1);
  v.paint((x, y, z) => (Math.sin(x * 0.12 + z * 0.02) > 0.9 ? 'wood' : undefined), 0, X, H + 5, H + 6, 0, Z);
  // тетрадь в клетку
  v.box(30, 90, H + 6, H + 7, 30, 72, 'paper');
  v.paint((x, y, z) => ((x % 4 < 0.6 || z % 4 < 0.6) ? 'blue_l' : undefined), 30, 90, H + 6, H + 7, 30, 72);
  v.box(59, 61, H + 6, H + 7.4, 30, 72, 'paper_d');
  // стопка книг
  const cols = ['fabric_r', 'navy', 'green_d'];
  for (let i = 0; i < 3; i++) { v.box(110 + i * 2, 160 - i, H + 6 + i * 6, H + 12 + i * 6, 14 + i, 44 - i, cols[i]); v.box(112 + i * 2, 160 - i, H + 7 + i * 6, H + 11 + i * 6, 15 + i, 43 - i, 'paper'); }
  // настольная лампа (выключена) и стакан с карандашами
  v.cylY(176, 70, 10, H + 6, H + 9, 'gun'); v.seg([176, H + 9, 70], [170, H + 30, 66], 1.2, 'steel'); v.ell(164, H + 31, 64, 9, 5, 8, 'toy_g');
  v.cylY(20, 80, 7, H + 6, H + 22, 'blue');
  for (const [dx, dz, col] of [[-2, -2, 'red'], [2, -1, 'toy_y'], [0, 2, 'toy_g'], [-3, 2, 'orange']] as [number, number, string][]) v.seg([20 + dx, H + 18, 80 + dz], [20 + dx * 2, H + 34, 80 + dz * 2], 1, col);
  return one(v, X, [X, Z]);
}

/** Стеллаж с книгами: три полки, корешки разной высоты и цвета, на верху — глобус и копилка. */
export function shelf(): ModelDef {
  const X = 180, Z = 60, H = 110, v = new Vox(X, H + 30, Z);
  v.box(0, X, 0, H, 0, Z, 'wood_d');
  v.box(4, X - 4, 4, H - 4, 4, Z + 1, 0);
  for (const y of [0, 36, 72, H - 4]) v.box(0, X, y, y + 4, 0, Z, 'wood');
  const cols = ['fabric_r', 'fabric_b', 'green', 'yel', 'purple', 'orange', 'navy', 'red_d', 'teal'];
  for (const y0 of [4, 40, 76]) {
    let x = 5, i = y0;
    while (x < X - 10) {
      const w = 5 + (i * 7) % 6, hh = 22 + (i * 13) % 10, col = cols[i % cols.length];
      if ((i * 3) % 11 === 0) { v.seg([x, y0, 8], [x + 10, y0 + hh - 2, 8], 2.5, col); x += 14; i++; continue; }   // наклонённая книга
      v.box(x, x + w, y0, y0 + hh, 8, Z - 4, col);
      v.box(x + 1, x + w - 1, y0 + hh * 0.7, y0 + hh * 0.7 + 2, Z - 4, Z - 3.6, 'gold');
      x += w + ((i % 6) === 0 ? 3 : 0); i++;
    }
  }
  // глобус на стеллаже
  v.cylY(40, 30, 6, H, H + 3, 'wood_d'); v.seg([40, H + 3, 30], [40, H + 8, 30], 1, 'brass'); v.sphere(40, H + 18, 30, 11, 'water');
  v.paint((x, y, z) => (Math.sin(x * 0.5) * Math.cos(z * 0.4 + y * 0.3) > 0.35 ? 'grass' : undefined), 28, 52, H + 7, H + 30, 18, 42);
  // копилка-свинья
  v.ell(130, H + 9, 30, 12, 9, 9, 'pink'); v.sphere(141, H + 10, 30, 3, 'pink'); for (const [x, z] of [[124, 25], [124, 35], [136, 25], [136, 35]]) v.cylY(x, z, 2, H, H + 3, 'pink');
  return one(v, X, [X, Z]);
}

/** Картонная коробка: заклеенная скотчем, с надписью, у некоторых — приоткрыт клапан. */
export function box(v: number): ModelDef {
  const n = 60, b = new Vox(n, 52, n);
  cbox(b, 0, n, 0, 48, 0, n, 'cardboard', 1, 1);
  b.paint((x, y, z) => ((x + y * 2 + z) % 13 === 0 ? 'cardboard_d' : undefined));
  b.box(0, n, 47, 48, n / 2 - 0.5, n / 2 + 0.5, 'cardboard_d');
  b.box(0, n, 47.4, 48.4, n / 2 - 5, n / 2 + 5, v % 2 ? 'paper' : 'yel_l');                   // скотч
  b.box(n - 0.6, n + 0.1, 28, 34, 12, 40, 'black');                                          // надпись маркером
  b.box(n - 0.6, n + 0.1, 20, 22, 18, 34, 'black');
  if (v % 3 === 2) { b.box(2, n - 2, 48, 49, 2, n / 2 - 1, 'cardboard_d'); b.fill((x, y) => (y < 48 + (x - 2) * 0.3 ? 'cardboard' : undefined), 2, n - 2, 48, 52, n / 2, n / 2 + 1); }
  return one(b, n, [n, n]);
}

const BOOK_COL = ['fabric_r', 'fabric_b', 'green', 'purple', 'yel', 'orange'];
/** Стопка книг (3–4 штуки, сдвинуты), страницы видны с торца. */
export function bookStack(v: number): ModelDef {
  const b = new Vox(52, 40, 36);
  for (let i = 0; i < 3 + (v % 2); i++) {
    const o = ((i * 5 + v) % 3 - 1) * 3, col = BOOK_COL[(i + v) % 6], y = i * 9;
    cbox(b, 3 + o, 49 + o, y, y + 9, 3, 33, col, 0, 1);
    b.box(5 + o, 48 + o, y + 1.5, y + 7.5, 3, 31.5, 'paper');
    b.paint((x, yy) => (Math.floor(yy) % 2 ? 'paper_d' : undefined), 5 + o, 49 + o, y + 1.5, y + 7.5, 3, 31.5);
    b.box(3 + o, 6 + o, y, y + 9, 3, 33, col);
    b.box(3 + o, 6.4 + o, y + 3, y + 5, 10, 26, 'gold');
  }
  return one(b, 52, [52, 36]);
}

/** Игрушечный мусор: детальки конструктора, мячик, машинка. */
export function toyDebris(v: number): ModelDef {
  const b = new Vox(22, 16, 22), cols = ['red', 'toy_b', 'toy_g', 'toy_y', 'purple'];
  const col = cols[v % 5];
  if (v % 3 === 0) { cbox(b, 2, 20, 0, 7, 5, 17, col, 0, 1); for (const x of [6, 11, 16]) for (const z of [8.5, 13.5]) b.cylY(x, z, 1.8, 7, 9, col); }
  else if (v % 3 === 1) { b.sphere(11, 9, 11, 8.4, col); b.paint((x, y, z) => (Math.abs(y - 9 + (x - 11) * 0.4) < 1.4 ? 'white' : undefined)); }
  else { cbox(b, 2, 20, 2, 8, 5, 17, col, 1, 1); b.box(7, 15, 8, 11, 7, 15, 'glass'); for (const x of [5, 17]) for (const z of [4.5, 17.5]) b.cylZ(x, 2.5, 2.5, z - 1, z + 1, 'rubber'); }
  return one(b, 22, [22, 22]);
}

void wheel;
