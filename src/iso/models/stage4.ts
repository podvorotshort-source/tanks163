// Ступень V «Улицы»: настоящая армия — пехота, БТР, танки, САУ, вертолёты. Дома, деревья, машины.
import { Vox, type ModelDef, type PartDef } from '../vox';
import { tankSpec, wheel, gun, rotor, one, cbox, seams, tracks, pipe, figure } from './kit';

export function infantry(): ModelDef {
  const v = new Vox(16, 12, 16);
  figure(v, 5, 5, 'army', 'army_d', 'flesh', 'gun_d', 1);
  figure(v, 10, 11, 'army', 'army_d', 'flesh', 'gun_d', 1);
  return one(v, 14);
}

const wheelsRow = (v: Vox, xs: number[], zc: number, hw: number, r: number) => { for (const x of xs) for (const s of [-1, 1]) wheel(v, x, r, r, zc + s * hw - (s > 0 ? 0 : 3), zc + s * hw + (s > 0 ? 3 : 0), 'rubber', 'army_d'); };

export function apc(): ModelDef {
  const h = new Vox(44, 20, 28), zc = 14;
  wheelsRow(h, [9, 18, 27, 36], zc, 11, 4);
  cbox(h, 4, 42, 4, 14, zc - 11, zc + 11, 'army', 1, 2);
  h.cut(1, 1.4, 0, 42 + 1.4 * 9, 32, 43, 4, 15);
  h.cut(-1, 1.6, 0, -4 + 1.6 * 10, 3, 10, 4, 15);
  seams(h, 4, 42, 4, 14, zc - 11, zc + 11, 10, 0, 0, 'army_d');
  for (const z of [zc - 8, zc + 8]) h.box(30, 33, 12, 14, z - 1.5, z + 1.5, 'glass_d');
  h.box(8, 20, 14, 15, zc - 6, zc - 2, 'army_d');
  const t = new Vox(24, 8, 12), tc = 6;
  t.cylY(6, tc, 4, 0, 4, 'army_l', 3);
  gun(t, 9, 22, 2, tc, 0.9, 'gun', 'gun_d');
  return { size: 42, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: t, pivot: [6, 0, tc], at: [2, 14, 0] }] };
}

export function mbt(): ModelDef {
  return tankSpec({
    L: 36, W: 28, tH: 8, hH: 6, body: 'army', dark: 'army_d', light: 'army_l', tr: 8, tH2: 5, turret: 'army', barrel: 22, bR: 1.5, round: false, wheels: 5,
    extra: (h, t, c) => {
      t.box(c.tcx - 9, c.tcx - 4, 0, 4, c.tcz - 7, c.tcz + 7, 'army_d');
      t.cylY(c.tcx - 2, c.tcz + 3, 2, c.TH, c.TH + 1.5, 'army_d');
      t.box(c.tcx + 2, c.tcx + 5, c.TH, c.TH + 2, c.tcz - 5, c.tcz - 2, 'gun');
      h.box(c.x0 + 1, c.x0 + 4, c.yT - 1, c.yT + 2, c.zc - 9, c.zc + 9, 'army_d');
    },
  });
}

export function attackHeli(): ModelDef {
  const v = new Vox(52, 18, 24), zc = 12;
  v.ell(30, 8, zc, 12, 6, 5, 'army');
  v.ell(36, 10, zc, 5, 4, 3.6, 'glass_d');
  v.seg([20, 9, zc], [2, 11, zc], 2, 'army'); v.box(1, 5, 9, 17, zc - 0.6, zc + 0.6, 'army_d');
  for (const s of [-1, 1]) { v.box(26, 34, 6, 7, zc + s * 5, zc + s * 11, 'army_d'); for (let i = 0; i < 2; i++) v.cylX(5, zc + s * (8 + i * 2.5), 1.2, 25, 35, i ? 'gun' : 'red'); }
  v.box(38, 44, 3, 5, zc - 1, zc + 1, 'gun_d'); gun(v, 42, 50, 3.5, zc, 0.7);
  for (const s of [-1, 1]) v.seg([24, 1, zc + s * 5], [36, 1, zc + s * 5], 0.6, 'gun_d');
  v.cylY(30, zc, 1.4, 14, 16, 'gun_d');
  const parts: PartDef[] = [{ name: 'body', vox: v }, { name: 'rotor', vox: rotor(20, 'gun_d', 2), at: [4, 16, 0] }];
  return { size: 46, parts };
}

export function spg(): ModelDef {
  return tankSpec({
    L: 40, W: 28, tH: 8, hH: 5, body: 'khaki', dark: 'khaki_d', light: 'sand', tr: 9, tH2: 9, turret: 'khaki', barrel: 28, bR: 2, round: false,
    extra: (h, t, c) => {
      t.box(c.tcx - 10, c.tcx + 9, 0, c.TH, c.tcz - 8, c.tcz + 8, 'khaki');
      t.box(c.tcx - 10, c.tcx + 9, c.TH - 1, c.TH, c.tcz - 8, c.tcz + 8, 'sand');
      t.cylX(c.TH * 0.5, c.tcz, 2.8, c.tcx + 34, c.tcx + 37, 'gun_d');
      h.box(c.x0, c.x0 + 3, 3, 8, c.zc - 10, c.zc + 10, 'gun_d');
    },
  });
}

export function armoredCar(): ModelDef {
  const v = new Vox(36, 16, 22), zc = 11;
  wheelsRow(v, [9, 27], zc, 8, 4.4);
  cbox(v, 3, 34, 4, 12, zc - 8, zc + 8, 'army_l', 1, 1);
  v.cut(1, 1.2, 0, 34 + 1.2 * 7, 26, 35, 4, 13);
  v.box(20, 26, 10, 12.5, zc - 6, zc + 6, 'glass_d');
  v.box(33, 36, 3, 6, zc - 7, zc + 7, 'gun_d');
  v.cylY(14, zc, 3, 12, 14, 'army_d'); gun(v, 14, 26, 13, zc, 0.6);
  return one(v, 34);
}

export function heavyTank(): ModelDef {
  return tankSpec({
    L: 50, W: 38, tH: 11, hH: 8, body: 'army_d', dark: 'camo', light: 'army', tr: 11, tH2: 8, turret: 'army_d', barrel: 26, bR: 2.4, twin: true, wheels: 6,
    extra: (h, t, c) => {
      for (const zz of [c.zc - 21, c.zc + 20]) for (let x = c.x0 + 3; x < c.x1 - 8; x += 6) h.box(x, x + 5, c.yT - 6, c.yT - 1, zz, zz + 1, 'camo');
      t.box(c.tcx - 14, c.tcx - 8, 1, 7, c.tcz - 9, c.tcz + 9, 'camo');
      pipe(t, c.tcx - 3, c.tcz - 6, 1.6, c.TH, c.TH + 3, 'gun', 'gun_d');
      gun(t, c.tcx, c.tcx + 10, c.TH + 2, c.tcz + 5, 0.6);
    },
  });
}

export function mlrs(): ModelDef {
  const h = new Vox(60, 22, 30), zc = 15;
  wheelsRow(h, [10, 22, 40, 50], zc, 11, 4.6);
  cbox(h, 4, 58, 5, 10, zc - 11, zc + 11, 'army_d', 1, 1);
  cbox(h, 42, 58, 9, 20, zc - 10, zc + 10, 'army', 2, 2);
  h.box(54, 57, 13, 18, zc - 9, zc + 9, 'glass_d');
  const t = new Vox(36, 16, 22), tc = 11;
  cbox(t, 0, 32, 0, 12, tc - 9, tc + 9, 'army', 1, 1);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { t.cylX(3 + j * 3.4, tc - 6 + i * 4, 1.3, 31, 32.5, 'gun_d'); t.cylX(3 + j * 3.4, tc - 6 + i * 4, 0.7, 32, 33, 'red'); }
  return { size: 58, parts: [{ name: 'hull', vox: h }, { name: 'turret', vox: t, pivot: [10, 0, tc], at: [-14, 10, 0] }] };
}

// ---------------------------------------------------------------- босс: Асфальтовый каток
// Дорожный каток-исполин: громадный передний валец, кабина, бак со смолой, дымящие трубы.
// Сзади — открытый мотор с вентилятором (слабое место).
export function bossRoller(): ModelDef {
  const NX = 120, NZ = 90, c = NZ / 2;
  const h = new Vox(NX, 80, NZ);
  // передний валец
  h.cylZ(96, 22, 22, c - 38, c + 38, 'steel');
  h.cylZ(96, 22, 22.6, c - 38, c - 34, 'yel'); h.cylZ(96, 22, 22.6, c + 34, c + 38, 'yel');
  h.paint((x, y) => ((Math.floor(Math.atan2(y - 22, x - 96) * 6) % 2 === 0) ? 'steel_l' : undefined), 70, 120, 0, 46, c - 34, c + 34);
  h.cylZ(96, 22, 6, c - 39, c + 39, 'gun_d');
  // рама-вилка
  for (const s of [-1, 1]) cbox(h, 70, 102, 28, 40, c + s * 40 - 3, c + s * 40 + 3, 'yel', 1, 1);
  cbox(h, 66, 80, 26, 46, c - 40, c + 40, 'yel_d', 2, 2);
  // задние колёса
  for (const s of [-1, 1]) { h.cylZ(26, 16, 16, c + s * 32 - 8, c + s * 32 + 8, 'rubber'); h.cylZ(26, 16, 8, c + s * 32 - 8.5, c + s * 32 + 8.5, 'yel'); h.cylZ(26, 16, 3, c + s * 32 - 9, c + s * 32 + 9, 'gun_d'); }
  // корпус
  cbox(h, 6, 72, 18, 40, c - 24, c + 24, 'yel', 4, 3);
  seams(h, 6, 72, 18, 40, c - 24, c + 24, 13, 0, 0, 'yel_d');
  for (let x = 10; x < 70; x += 8) h.box(x, x + 4, 38, 40.5, c - 25, c + 25, 'black');   // «зебра»
  h.paint((x) => (Math.floor(x / 4) % 2 ? 'yel' : undefined), 10, 70, 38, 41, c - 25, c + 25);
  // кабина
  cbox(h, 38, 64, 40, 66, c - 18, c + 18, 'yel', 2, 2);
  h.box(50, 64.5, 46, 62, c - 16, c + 16, 'glass');
  h.box(37, 65, 66, 69, c - 20, c + 20, 'gun_d');
  h.box(52, 54, 69, 72, c - 12, c + 12, 'lamp_o');                                      // мигалка
  for (const zz of [c - 6, c + 6]) h.box(52, 54.5, 69, 73, zz - 2, zz + 2, 'lamp_o');
  // бак со смолой
  h.cylX(50, c, 9, 12, 36, 'gun_d'); h.cylX(50, c, 9.4, 14, 16, 'yel'); h.cylX(50, c, 9.4, 32, 34, 'yel');
  h.cylY(24, c, 4, 58, 60, 'black');
  // трубы
  for (const zz of [c - 14, c + 14]) pipe(h, 30, zz, 3, 40, 72, 'gun', 'gun_d');
  // мотор сзади: решётка, вентилятор, жар
  cbox(h, 0, 10, 18, 40, c - 20, c + 20, 'gun_d', 2, 2);
  h.cylX(29, c, 9, -0.5, 1, 'gun');
  h.paint((x, y, z) => ((Math.floor(Math.atan2(y - 29, z - c) * 2.5) % 2 === 0) ? 'lamp_o' : 'fire'), -1, 1.2, 20, 39, c - 9, c + 9);
  h.cylX(29, c, 2.5, -1, 1.5, 'gun_d');
  for (let y = 21; y < 38; y += 3) { h.box(0, 1, y, y + 1, c - 19, c - 11, 'fire'); h.box(0, 1, y, y + 1, c + 11, c + 19, 'fire'); }
  return { size: 104, parts: [{ name: 'body', vox: h, pivot: [60, 0, c] }] };
}

// ---------------------------------------------------------------- препятствия (улицы)
const CAR = ['red', 'blue', 'white', 'yel', 'green', 'orange'];
/** Легковушка: кузов со скруглёнными кромками, стёкла, фары, стоп-сигналы, колёса с дисками; иногда такси или полиция. */
export function car(v: number): ModelDef {
  const X = 48, Z = 24, b = new Vox(X, 20, Z), zc = Z / 2, col = v % 7 === 6 ? 'white' : CAR[v % 6];
  for (const x of [10, 37]) for (const z of [1, Z - 4]) { b.cylZ(x, 4, 4, z, z + 3, 'rubber'); b.cylZ(x, 4, 2, z - 0.1, z + 3.1, 'steel_l'); }
  cbox(b, 1, X - 1, 3, 10, 2, Z - 2, col, 2, 2);
  cbox(b, 12, 34, 10, 17, 3, Z - 3, col, 2, 2);
  b.box(28, 32, 10.5, 16, 3.4, Z - 3.4, 'glass'); b.box(13, 16, 10.5, 16, 3.4, Z - 3.4, 'glass_d');
  b.paint((x, y, z) => (y > 11 && y < 15.5 && (z < 3.6 || z > Z - 3.6) && x > 16 && x < 31 ? (Math.abs(x - 23) < 0.6 ? col : 'glass') : undefined));
  b.box(X - 1.4, X - 0.6, 6, 8, 3, 6, 'lamp'); b.box(X - 1.4, X - 0.6, 6, 8, Z - 6, Z - 3, 'lamp');
  b.box(0.6, 1.4, 6, 8, 3, 6, 'lamp_r'); b.box(0.6, 1.4, 6, 8, Z - 6, Z - 3, 'lamp_r');
  b.box(X - 1.2, X - 0.4, 4, 5, 6, Z - 6, 'chrome');
  if (v % 7 === 6) { b.box(18, 28, 17, 18.4, zc - 3, zc + 3, 'white'); b.box(18, 22, 18, 19, zc - 2.5, zc + 2.5, 'blue'); b.box(24, 28, 18, 19, zc - 2.5, zc + 2.5, 'red'); b.paint((x, y) => (y > 7 && y < 9 ? 'blue' : undefined), 1, X - 1, 3, 10, 0, Z); }
  else if (col === 'yel') { b.box(20, 26, 17, 19, zc - 2, zc + 2, 'yel_l'); b.paint((x, y, z) => (y > 7 && y < 9 && (Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? 'black' : undefined), 1, X - 1, 3, 10, 0, Z); }
  return one(b, X, [X, Z]);
}

const WALLS: [string, string][] = [['brick', 'brick_d'], ['cream', 'sand_d'], ['white', 'white_d'], ['concrete_l', 'concrete'], ['sand', 'sand_d'], ['pink', 'red_d']];
/** Дом: стены (кирпич, штукатурка, панель), ряды окон с рамами и подоконниками (у части горит свет), подъезд
 *  с козырьком, балконы; крыша — двускатная черепичная или плоская с антеннами и кондиционерами. */
export function house(v: number): ModelDef {
  const X = 140, Z = 110, floors = 2 + (v % 3), FH = 22, H = floors * FH + 6;
  const b = new Vox(X + 6, H + 40, Z + 6);
  const [wall, wd] = WALLS[v % WALLS.length], o = 3;
  b.box(o, X + o, 0, H, o, Z + o, wall);
  b.box(o - 1, X + o + 1, 0, 4, o - 1, Z + o + 1, 'concrete');                                         // цоколь
  if (wall === 'brick') b.paint((x, y, z) => (y > 4 && ((Math.floor(y) % 4 === 3) || ((Math.floor((x + z) + (Math.floor(y / 4) % 2) * 3)) % 7 === 0)) ? 'brick_d' : undefined));
  else if (wall === 'concrete_l') b.paint((x, y, z) => (y > 4 && (Math.floor(y) % FH === 0 || Math.floor(x + z) % 34 === 0) ? 'concrete' : undefined));
  for (let f = 0; f < floors; f++) b.box(o - 0.4, X + o + 0.4, 4 + f * FH + FH - 1, 4 + f * FH + FH, o - 0.4, Z + o + 0.4, wd);   // межэтажные пояса
  // окна: на всех четырёх фасадах
  const win = (x: number, y: number, z: number, along: 'x' | 'z', lit: boolean) => {
    const g = lit ? 'lamp' : 'glass';
    if (along === 'x') { b.box(x - 5, x + 5, y, y + 12, z - 0.4, z + 0.4, 'white'); b.box(x - 4, x + 4, y + 1, y + 11, z - 0.6, z + 0.6, g); b.box(x - 0.4, x + 0.4, y + 1, y + 11, z - 0.7, z + 0.7, 'white'); b.box(x - 5.5, x + 5.5, y - 1, y, z - 1.5, z + 1.5, 'white_d'); }
    else { b.box(z - 0.4, z + 0.4, y, y + 12, x - 5, x + 5, 'white'); b.box(z - 0.6, z + 0.6, y + 1, y + 11, x - 4, x + 4, g); b.box(z - 0.7, z + 0.7, y + 1, y + 11, x - 0.4, x + 0.4, 'white'); b.box(z - 1.5, z + 1.5, y - 1, y, x - 5.5, x + 5.5, 'white_d'); }
  };
  for (let f = 0; f < floors; f++) {
    const y = 9 + f * FH;
    for (let x = o + 14; x < X + o - 8; x += 22) { const lit = ((x * 7 + f * 13 + v) % 9) < 2; if (f === 0 && Math.abs(x - (X / 2 + o)) < 12) continue; win(x, y, Z + o, 'x', lit); win(x, y, o, 'x', !lit && (x + f) % 5 === 0); }
    for (let z = o + 14; z < Z + o - 8; z += 22) { win(z, y, X + o, 'z', ((z + f + v) % 7) < 1); win(z, y, o, 'z', false); }
  }
  // подъезд: дверь, козырёк, ступени, фонарь
  const dx = X / 2 + o;
  b.box(dx - 7, dx + 7, 4, 22, Z + o - 0.5, Z + o + 0.6, 'wood_d'); b.box(dx - 6, dx + 6, 5, 21, Z + o + 0.4, Z + o + 0.8, 'wood');
  b.box(dx - 10, dx + 10, 23, 25, Z + o, Z + o + 6, wd); b.box(dx - 9, dx + 9, 0, 3, Z + o, Z + o + 6, 'concrete_l');
  b.box(dx + 9, dx + 11, 16, 19, Z + o + 0.5, Z + o + 2, 'lamp');
  // балконы на верхних этажах
  for (let f = 1; f < floors; f++) for (const bx of [o + 26, X + o - 26]) {
    const y = 4 + f * FH;
    b.box(bx - 10, bx + 10, y, y + 2, Z + o, Z + o + 8, 'concrete'); b.box(bx - 10, bx + 10, y + 2, y + 9, Z + o + 7.4, Z + o + 8, wd);
    if ((f + bx + v) % 3 === 0) b.box(bx - 8, bx - 2, y + 2, y + 8, Z + o + 2, Z + o + 6, 'fabric_r');      // бельё/ящик
  }
  if (v % 2 === 0) {
    // двускатная черепичная крыша вдоль x, слуховое окно
    const roof = v % 4 === 0 ? 'roof' : 'gun';
    b.fill((x, y, z) => { const hz = Math.abs(z - (Z / 2 + o)); const top = H + 30 - hz * 0.55; return y < top ? ((Math.floor(z) % 3 === 0) ? (roof === 'roof' ? 'roof_d' : 'gun_d') : roof) : undefined; }, o - 3, X + o + 3, H, H + 32, o - 3, Z + o + 3);
    b.fill((x, y, z) => { const hz = Math.abs(z - (Z / 2 + o)); return y < H + 30 - hz * 0.55 - 1 ? wall : undefined; }, o, o + 1, H, H + 32, o, Z + o);
    b.fill((x, y, z) => { const hz = Math.abs(z - (Z / 2 + o)); return y < H + 30 - hz * 0.55 - 1 ? wall : undefined; }, X + o - 1, X + o, H, H + 32, o, Z + o);
    b.box(o + 30, o + 42, H + 6, H + 22, Z / 2 + o + 14, Z / 2 + o + 26, wall); b.box(o + 32, o + 40, H + 10, H + 18, Z / 2 + o + 25.5, Z / 2 + o + 26.5, 'glass');
    b.cylY(X + o - 24, Z / 2 + o - 8, 4, H + 14, H + 36, 'brick_d'); b.cylY(X + o - 24, Z / 2 + o - 8, 4.6, H + 34, H + 36, 'gun_d');
  } else {
    // плоская крыша: парапет, рубероид, вентшахта, антенны, тарелка, кондиционеры
    b.box(o, X + o, H, H + 1, o, Z + o, 'roof_d'); b.box(o, X + o, H, H + 4, o, o + 2, wd); b.box(o, X + o, H, H + 4, Z + o - 2, Z + o, wd); b.box(o, o + 2, H, H + 4, o, Z + o, wd); b.box(X + o - 2, X + o, H, H + 4, o, Z + o, wd);
    cbox(b, o + 20, o + 44, H, H + 14, o + 20, o + 40, 'concrete', 1, 1);
    for (const [x, z] of [[o + 80, o + 30], [o + 96, o + 30], [o + 80, o + 70]]) { cbox(b, x - 5, x + 5, H, H + 7, z - 4, z + 4, 'white_d', 1, 1); b.cylX(H + 3.5, z, 2.4, x + 4.8, x + 5.4, 'gun_d'); }
    b.seg([o + 110, H, o + 60], [o + 110, H + 22, o + 60], 0.5, 'gun_d'); for (const y of [H + 14, H + 19]) b.box(o + 104, o + 116, y, y + 0.8, o + 59.6, o + 60.4, 'gun_d');
    b.ell(o + 60, H + 8, o + 86, 6, 6, 2, 'white'); b.seg([o + 60, H, o + 84], [o + 60, H + 6, o + 85], 0.6, 'gun');
  }
  return one(b, X + 6, [X + 6, Z + 6]);
}

/** Дерево: ствол с корнями, крона из нескольких шаров (летняя, осенняя, ель). */
export function tree(v: number): ModelDef {
  const n = 40, b = new Vox(n, 56, n), c = n / 2;
  b.cylY(c, c, 2.4, 0, 22, 'wood_d', 1.8);
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; b.seg([c, 1, c], [c + Math.cos(a) * 5, 0.5, c + Math.sin(a) * 5], 1.2, 'wood_d'); }
  const k = v % 3;
  if (k === 2) {
    for (let t = 0; t < 4; t++) b.fill((x, y, z) => { const r = Math.hypot(x - c, z - c), y0 = 14 + t * 9, R = (16 - t * 3.2) * (1 - (y - y0) / 14); return y >= y0 && y < y0 + 14 && r < R ? (y - y0 > 9 || x < c - R * 0.3 ? 'leaf_l' : 'leaf_d') : undefined; });
    b.paint((x, y, z) => ((x * 3 + y + z * 5) % 13 === 0 ? 'white' : undefined), 0, n, 14, 56, 0, n);   // снежинки-блики
  } else {
    const [a, d, l] = k === 1 ? ['orange', 'orange_d', 'yel'] : ['leaf', 'leaf_d', 'leaf_l'];
    for (const [dx, dy, dz, r, col] of [[0, 26, 0, 13, d], [-4, 31, -4, 10, a], [5, 30, 3, 10, a], [0, 38, 1, 9, a], [-3, 40, -3, 6, l], [4, 35, 6, 6, l]] as [number, number, number, number, string][]) b.sphere(c + dx, dy, c + dz, r, col);
    b.paint((x, y, z) => ((x * 5 + y * 3 + z * 7) % 17 === 0 ? d : undefined), 0, n, 16, 56, 0, n);
    if (k === 0 && v % 2) for (let i = 0; i < 6; i++) b.set(c + Math.cos(i) * 11, 28 + i * 2, c + Math.sin(i) * 11, 'red');   // яблоки
  }
  return one(b, n, [n, n]);
}

/** Уличный фонарь: столб, изогнутый кронштейн, плафон (светится). */
export function streetLamp(): ModelDef {
  const b = new Vox(24, 70, 12), c = 6;
  b.cylY(6, c, 2.2, 0, 4, 'gun_d'); b.cylY(6, c, 1.2, 4, 62, 'gun');
  b.seg([6, 62, c], [16, 66, c], 1, 'gun'); b.box(13, 21, 62, 65, c - 2.5, c + 2.5, 'gun_d'); b.box(14, 20, 61, 62, c - 2, c + 2, 'lamp');
  return one(b, 12, [12, 12]);
}

/** Скамейка: деревянные рейки на чугунных ножках, урна рядом. */
export function bench(v: number): ModelDef {
  const X = 44, Z = 18, b = new Vox(X + 12, 22, Z);
  for (const x of [4, X - 6]) { b.box(x, x + 2, 0, 9, 2, Z - 2, 'gun_d'); b.box(x, x + 2, 9, 20, 2, 4, 'gun_d'); }
  for (let i = 0; i < 3; i++) b.box(1, X - 1, 9, 10.5, 4 + i * 4, 7 + i * 4, i % 2 ? 'wood' : 'wood_l');
  for (let i = 0; i < 2; i++) b.box(1, X - 1, 13 + i * 4, 15.5 + i * 4, 2, 3.5, 'wood_l');
  if (v % 2) { b.cylY(X + 6, Z / 2, 4, 0, 12, 'gun'); b.cylY(X + 6, Z / 2, 3, 2, 12.1, 0); b.cylY(X + 6, Z / 2, 2.8, 2, 10, 'paper'); }
  return one(b, X + 12, [X + 12, Z]);
}

/** Автобусная остановка: стеклянный павильон, скамья, табличка с номером. */
export function busStop(): ModelDef {
  const X = 80, Z = 26, b = new Vox(X, 44, Z);
  for (const x of [2, X - 4]) b.box(x, x + 2, 0, 36, 2, 4, 'gun');
  b.box(0, X, 36, 39, 0, Z, 'blue'); b.box(0, X, 39, 40, 2, Z - 2, 'blue_l');
  b.box(2, X - 2, 4, 34, 2, 3, 'glass'); b.box(2, 3, 4, 34, 3, Z - 4, 'glass'); b.box(X - 3, X - 2, 4, 34, 3, Z - 4, 'glass');
  b.box(10, X - 10, 10, 12, 4, 10, 'wood'); for (const x of [12, X - 14]) b.box(x, x + 2, 0, 10, 5, 9, 'gun_d');
  b.box(X - 10, X - 8, 0, 42, Z - 4, Z - 2, 'gun'); b.box(X - 14, X - 4, 34, 42, Z - 3.4, Z - 2.6, 'white'); b.box(X - 12, X - 6, 36, 40, Z - 2.6, Z - 2.2, 'blue');
  b.box(20, 50, 18, 30, 2.6, 3.4, 'fabric_y');                                                              // реклама
  return one(b, X, [X, Z]);
}

/** Мусорные контейнеры: два бака с крышками, один приоткрыт. */
export function bins(v: number): ModelDef {
  const X = 44, Z = 22, b = new Vox(X, 26, Z), col = v % 2 ? 'green_d' : 'blue_d';
  for (const x0 of [1, 23]) { cbox(b, x0, x0 + 20, 3, 20, 1, Z - 1, col, 1, 1); b.box(x0 - 0.5, x0 + 20.5, 20, 22, 0.5, Z - 0.5, 'gun_d'); for (const x of [x0 + 4, x0 + 16]) b.cylZ(x, 2, 2, 0, Z, 'rubber'); }
  b.fill((x, y) => (y < 22 + (x - 23) * 0.4 && y > 21 ? 'gun_d' : undefined), 23, 43, 21, 32, 0.5, Z - 0.5);
  b.box(28, 34, 20, 23, 6, 12, 'cardboard');
  return one(b, X, [X, Z]);
}

void tracks;
