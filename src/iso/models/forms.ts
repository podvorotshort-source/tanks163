// Облики III–X и боссы ступеней II–IX: одна форма на двоих. Босс — серые бронеплиты с красным свечением,
// построенный с удвоенной подробностью (q = 2: те же пропорции, вдвое больше вокселей — мелкая деталь, а не крупные кубы);
// игрок после поглощения — та же форма в своём масштабе (q = 1), свечение его цвета (1P жёлтый, 2P зелёный),
// орудия по классу (разведчик — длинные тонкие стволы, штурмовик — гаубицы, тяжёлый — огнемёты).
// Ось x — нос, y — вверх, z — борт.

import { Vox, animTracks, type ModelDef, type PartDef } from '../vox';
import type { TankClass } from './tanks';
import { track, barrel, howitzer, flamer } from './hero';

/** Масштаб класса: разведчик меньше, тяжёлый крупнее (все облики рисуются в одном масштабе). */
const kc = (cls: TankClass) => (cls === 'scout' ? 0.9 : cls === 'heavy' ? 1.1 : 1);

/** Общие параметры постройки: q — подробность (босс 2), c — размер класса, g — свечение. */
interface Ctx { q: number; c: number; g: string; boss: boolean; cls: TankClass }
const mk = (cls: TankClass, glow: string, boss: boolean): Ctx => ({ q: boss ? 2 : 1, c: boss ? 1 : kc(cls), g: glow, boss, cls });
/** Длина в вокселях с учётом подробности. */
const S = (x: Ctx, n: number) => Math.round(n * x.q);
/** Длина с учётом и подробности, и класса. */
const SC = (x: Ctx, n: number) => Math.round(n * x.q * x.c);

/** Пара орудий по классу (для босса — его собственные стволы, `bossGun`). */
function classGun(x: Ctx, t: Vox, x0: number, y: number, z: number, bossGun: (t: Vox, x0: number, y: number, z: number) => void): void {
  const q = x.q;
  if (x.boss) bossGun(t, x0, y, z);
  else if (x.cls === 'scout') barrel(t, x0, x0 + Math.round(30 * q), y, z, 1.3 * q, 'gun', 'gun_d', x.g);
  else if (x.cls === 'assault') howitzer(t, x0, x0 + Math.round(17 * q), y, z, 2.6 * q, 'gun', 'gun_d', x.g);
  else flamer(t, x0, x0 + Math.round(14 * q), y, z, 1.9 * q, 'gun', 'gun_d', x.g);
}

/** Заклёпки строкой по x на высоте y (у босса — гуще). */
function rivets(v: Vox, x0: number, x1: number, y: number, z: number, step: number, col = 'steel_l'): void {
  for (let x = x0; x < x1; x += step) v.set(x, y, z, col);
}

/** Удвоение (каждый воксель → 2×2×2) для частей, которые не нужно рисовать подробнее. */
export function up2(v: Vox): Vox {
  const o = new Vox(v.nx * 2, v.ny * 2, v.nz * 2);
  for (let z = 0; z < v.nz; z++) for (let y = 0; y < v.ny; y++) for (let x = 0; x < v.nx; x++) {
    const m = v.d[v.idx(x, y, z)];
    if (!m) continue;
    for (let a = 0; a < 8; a++) o.d[o.idx(x * 2 + (a & 1), y * 2 + ((a >> 1) & 1), z * 2 + (a >> 2))] = m;
  }
  return o;
}

/** Нижний корпус на гусеницах (общий для многих обликов): ленты, катки, бортовые экраны со светящимися швами. */
function chassis(x: Ctx, v: Vox, x0: number, x1: number, NZ: number, TH: number, TW: number, wheels: number, inset: number): void {
  const q = x.q;
  track(v, x0, x1, TH, inset, inset + TW, inset, wheels, 'gun', 'steel_d');
  track(v, x0, x1, TH, NZ - inset - TW, NZ - inset, NZ - inset - 1, wheels, 'gun', 'steel_d');
  v.box(x0 + 3 * q, x1 - 3 * q, 2 * q, TH - q, inset + TW, NZ - inset - TW, 'gun_d');
  // экраны над гусеницами: плиты, стыки — светящиеся щели
  for (const [zo, zi] of [[inset - 1, inset], [NZ - inset, NZ - inset + 1]]) {
    if (zo < 0 || zi > NZ) continue;
    v.box(x0 + 3 * q, x1 - 4 * q, TH * 0.48, TH + q, zo, zi, 'steel_d');
    for (let xx = x0 + 11 * q; xx < x1 - 6 * q; xx += 10 * q) v.box(xx, xx + Math.max(1, q * 0.5), TH * 0.48 + q, TH, zo, zi, x.g);
    v.box(x0 + 3 * q, x1 - 4 * q, TH * 0.48, TH * 0.48 + Math.max(1, q * 0.5), zo, zi, 'gun_d');
  }
}

/** Сборка модели: игроку — общий масштаб облика, боссу — его настоящая длина (части уже подробные). */
function finish(x: Ctx, parts: PartDef[], len: number): ModelDef {
  if (!x.boss) return { size: 56, parts };
  return { size: len, parts };
}

// ============================================================================ III. Робот-тиран
/** Облик III / босс II «Пульт-тиран»: гусеничное шасси, на поворотном круге — торс боевого робота
 *  на радиоуправлении: наплечники, руки-орудия (у босса — лазерные пушки), голова со светящимся визором,
 *  на спине — большая антенна-приёмник с тарелкой (слабое место) и аккумуляторный ранец. */
export function formTyrant(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const L = SC(x, 52), W = SC(x, 46), TH = S(x, 13), TW = SC(x, 12);
  const NX = L + S(x, 8), NZ = W + S(x, 4), zc = NZ / 2, x0 = S(x, 4), x1 = x0 + L;
  const v = new Vox(NX, S(x, 26), NZ);
  chassis(x, v, x0, x1, NZ, TH, TW, boss ? 7 : 5, S(x, 2));
  const hz0 = S(x, 3), hz1 = NZ - S(x, 3), yb = TH - q, yt = TH + S(x, 6);
  v.box(x0 + q, x1 - q, yb, yt, hz0, hz1, 'steel');
  v.cut(1, 1, 0, (x1 - S(x, 10)) + yt, x1 - S(x, 11), x1, yb, yt);                       // скошенный лоб
  v.cut(-1.4, 1, 0, -1.4 * (x0 + S(x, 5)) + yt, x0, x0 + S(x, 6), yb, yt);
  v.paint(() => 'steel_d', x0, x1, yb, yb + 2 * q, 0, NZ);
  for (let xx = x0 + S(x, 8); xx < x1 - S(x, 11); xx += S(x, 8)) v.paint(() => 'gun_d', xx, xx + 1, yt - 1, yt, hz0 + S(x, 3), hz1 - S(x, 3));
  // поворотный круг под торсом: тёмное кольцо со светящимися огнями
  const rx = x0 + L * 0.5;
  v.cylY(rx, zc, S(x, 13) * x.c, yt, yt + q, 'gun_d');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; v.set(rx + Math.cos(a) * S(x, 12.4) * x.c, yt, zc + Math.sin(a) * S(x, 12.4) * x.c, x.g); }
  // фары и кормовые батареи
  for (const zz of [hz0 + S(x, 3), hz1 - S(x, 5)]) v.box(x1 - 2 * q, x1, yb + 2 * q, yb + 4 * q, zz, zz + 2 * q, x.g);
  for (const zz of [hz0 + S(x, 2), hz1 - S(x, 8)]) { v.box(x0 + q, x0 + S(x, 9), yt, yt + S(x, 4), zz, zz + S(x, 6), 'gun'); v.box(x0 + 2 * q, x0 + S(x, 8), yt + S(x, 4), yt + S(x, 4) + 1, zz + q, zz + S(x, 5), x.g); }
  if (boss) { rivets(v, x0 + 6 * q, x1 - 14 * q, yt - 3 * q, hz0, 4 * q); rivets(v, x0 + 6 * q, x1 - 14 * q, yt - 3 * q, hz1 - 1, 4 * q); }

  // ---------------- торс робота (поворачивается как башня)
  const TNX = S(x, 76), TNZ = SC(x, 60), tcx = S(x, 26), tcz = TNZ / 2;
  const t = new Vox(TNX, S(x, 52), TNZ);
  const cw = SC(x, 13), cd = S(x, 10);               // полуширина груди, полуглубина
  // таз и талия
  t.cylY(tcx, tcz, S(x, 8) * x.c, 0, S(x, 3), 'gun_d');
  t.box(tcx - S(x, 6), tcx + S(x, 6), S(x, 3), S(x, 7), tcz - S(x, 7), tcz + S(x, 7), 'steel_d');
  for (let y = S(x, 3.5); y < S(x, 7); y += S(x, 1.5)) t.box(tcx - S(x, 6.2), tcx + S(x, 6.2), y, y + 1, tcz - S(x, 7.2), tcz + S(x, 7.2), 'gun_d');   // гофра
  // грудь: широкая, расширяется кверху, грудная плита скошена
  t.fill((xx, y, z) => {
    if (y < S(x, 7) || y > S(x, 25)) return undefined;
    const k = (y - S(x, 7)) / S(x, 18), hw = cw * (0.78 + 0.22 * k), dx = xx - tcx;
    if (Math.abs(z - tcz) > hw || dx > cd || dx < -cd) return undefined;
    if (dx > cd - S(x, 3) && y > S(x, 25) - (dx - (cd - S(x, 3))) * 1.6) return undefined;
    if (Math.abs(z - tcz) > hw - S(x, 2) && dx > cd - S(x, 2)) return undefined;
    return 'steel';
  }, 0, TNX, 0, S(x, 26), 0, TNZ);
  t.paint((xx, y) => (y < S(x, 9) ? 'steel_d' : undefined));
  // реактор в груди: светящийся круг в оправе
  t.cylX(S(x, 17), tcz, S(x, 4.2), tcx + cd - 2 * q, tcx + cd + 0.01, 'gun_d');
  t.cylX(S(x, 17), tcz, S(x, 3), tcx + cd - q, tcx + cd + 0.6, x.g);
  t.cylX(S(x, 17), tcz, S(x, 1.2), tcx + cd, tcx + cd + 0.9, 'lamp');
  // пластины пресса — светящиеся щели между ними
  for (let i = 0; i < 3; i++) t.box(tcx + cd - q, tcx + cd, S(x, 8.5) + i * S(x, 1.8), S(x, 8.5) + i * S(x, 1.8) + 1, tcz - S(x, 4), tcz + S(x, 4), x.g);
  // голова: шлем с гребнем, визор, «уши»-антенны
  const hy = S(x, 25);
  t.box(tcx - S(x, 4), tcx + S(x, 5), hy, hy + S(x, 7), tcz - S(x, 4.5), tcz + S(x, 4.5), 'steel');
  t.cut(1, 1, 0, tcx + S(x, 5) + hy + S(x, 4), tcx + S(x, 2), tcx + S(x, 5), hy, hy + S(x, 7));
  t.box(tcx + S(x, 3), tcx + S(x, 5), hy + S(x, 2.5), hy + S(x, 4), tcz - S(x, 3.5), tcz + S(x, 3.5), x.g);        // визор
  t.box(tcx + S(x, 4.5), tcx + S(x, 5.2), hy + S(x, 2.8), hy + S(x, 3.7), tcz - S(x, 2.5), tcz - S(x, 1.2), 'lamp');
  t.box(tcx + S(x, 4.5), tcx + S(x, 5.2), hy + S(x, 2.8), hy + S(x, 3.7), tcz + S(x, 1.2), tcz + S(x, 2.5), 'lamp');
  t.box(tcx - S(x, 3), tcx + S(x, 3), hy + S(x, 7), hy + S(x, 8), tcz - q, tcz + q, 'steel_d');                    // гребень
  for (const s of [-1, 1]) { t.box(tcx - S(x, 2), tcx + S(x, 1), hy + S(x, 2), hy + S(x, 5), tcz + s * S(x, 4.5), tcz + s * S(x, 5.5), 'gun'); t.seg([tcx - S(x, 1), hy + S(x, 5), tcz + s * S(x, 5)], [tcx - S(x, 3), hy + S(x, 10), tcz + s * S(x, 5.5)], 0.45 * q, 'gun_d'); t.set(tcx - S(x, 3), hy + S(x, 10), tcz + s * S(x, 5.5), x.g); }
  // наплечники и руки-орудия
  for (const s of [-1, 1]) {
    const sz = tcz + s * (cw + S(x, 5)), sy = S(x, 21);
    t.ell(tcx, sy, sz, S(x, 7), S(x, 5.5), S(x, 5.5), 'steel');
    t.paint((xx, y) => (y < sy - S(x, 2) ? 'steel_d' : undefined), tcx - S(x, 8), tcx + S(x, 8), sy - S(x, 6), sy, sz - S(x, 6), sz + S(x, 6));
    t.box(tcx - S(x, 6), tcx + S(x, 6), sy + S(x, 1), sy + S(x, 1) + 1, sz - S(x, 5.6), sz + S(x, 5.6), x.g);        // светящаяся кромка
    if (boss) for (let i = -4; i <= 4; i += 2) t.set(tcx + i * q, sy + S(x, 4.6), sz, 'steel_l');
    // плечо → локоть → предплечье вперёд
    const ex = tcx + S(x, 2), ey = S(x, 11), ez = sz;
    t.seg([tcx, sy - S(x, 3), sz], [ex, ey, ez], S(x, 2.6), 'gun');
    t.sphere(ex, ey, ez, S(x, 3), 'steel_d');
    t.cylX(ey, ez, S(x, 3.6), ex, ex + S(x, 13), 'steel');                                                           // предплечье-кожух
    t.cylX(ey, ez, S(x, 3.8), ex + S(x, 4), ex + S(x, 5), 'gun_d');
    t.cylX(ey, ez, S(x, 3.8), ex + S(x, 9), ex + S(x, 10), 'gun_d');
    t.box(ex + S(x, 6), ex + S(x, 8), ey + S(x, 3.4), ey + S(x, 4), ez - q, ez + q, x.g);
    classGun(x, t, ex + S(x, 13), ey, ez, (tt, gx, gy, gz) => {
      // лазерная пушка: ствол-излучатель с охлаждающими кольцами и линзой
      tt.cylX(gy, gz, S(x, 2.4), gx, gx + S(x, 22), 'gun');
      for (let i = 0; i < 5; i++) tt.cylX(gy, gz, S(x, 3.1), gx + S(x, 2) + i * S(x, 3.5), gx + S(x, 3) + i * S(x, 3.5), 'steel_d');
      tt.cylX(gy, gz, S(x, 3.4), gx + S(x, 20), gx + S(x, 23), 'gun_d');
      tt.cylX(gy, gz, S(x, 1.8), gx + S(x, 22), gx + S(x, 23.4), x.g);
      tt.cylX(gy, gz, S(x, 0.8), gx + S(x, 23), gx + S(x, 23.6), 'lamp');
    });
  }
  // ранец-аккумулятор и антенна-приёмник на спине (слабое место босса)
  const bx = tcx - cd - S(x, 6);
  t.box(bx, tcx - cd + q, S(x, 9), S(x, 23), tcz - S(x, 7), tcz + S(x, 7), 'gun');
  for (let i = 0; i < 3; i++) t.box(bx - 1, bx, S(x, 11) + i * S(x, 4), S(x, 12) + i * S(x, 4), tcz - S(x, 5), tcz + S(x, 5), x.g);
  t.cylY(bx + S(x, 2), tcz + S(x, 4), S(x, 1.4), S(x, 23), S(x, 25), 'steel_d');
  t.seg([bx + S(x, 2), S(x, 24), tcz + S(x, 4)], [bx - S(x, 3), S(x, 46), tcz + S(x, 4)], 0.55 * q, 'gun_d');
  for (const yy of [S(x, 30), S(x, 36), S(x, 41)]) { const tt = (yy - S(x, 24)) / S(x, 22); t.set(bx + S(x, 2) - S(x, 5) * tt - 1, yy, tcz + S(x, 4), 'steel_l'); t.set(bx + S(x, 2) - S(x, 5) * tt + 1, yy, tcz + S(x, 4), 'steel_l'); }
  t.sphere(bx - S(x, 3), S(x, 47), tcz + S(x, 4), S(x, 1.6), x.g);
  // тарелка приёмника
  t.fill((xx, y, z) => { const dx = xx - (bx - S(x, 2)), dy = y - S(x, 30), dz = z - (tcz - S(x, 4)); const r2 = dy * dy + dz * dz; return r2 < S(x, 4.6) ** 2 && Math.abs(dx - r2 / (S(x, 14))) < 0.7 * q ? 'steel_l' : undefined; }, bx - S(x, 6), bx + S(x, 4), S(x, 24), S(x, 36), tcz - S(x, 10), tcz + S(x, 2));
  t.seg([bx, S(x, 22), tcz - S(x, 4)], [bx - S(x, 2), S(x, 30), tcz - S(x, 4)], 0.5 * q, 'gun_d');
  t.set(bx + S(x, 1), S(x, 30), tcz - S(x, 4), x.g);

  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [rx - NX / 2, yt + q, 0] },
  ], L);
}

// ============================================================================ IV. Пылесос-левиафан
/** Облик IV / босс III «Пылесос-левиафан»: длинный гусеничный корпус-турбина, спереди огромный воздухозаборник
 *  с вращающейся крыльчаткой, на спине прозрачный бак-циклон с крутящимся мусором, гофрированные шланги;
 *  сзади — решётки выхлопа (слабое место). Башня — циклонная пушка на баке. */
export function formVacuum(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const L = SC(x, 58), W = SC(x, 44), TH = S(x, 12), TW = SC(x, 11);
  const NX = L + S(x, 10), NZ = W + S(x, 4), zc = NZ / 2, x0 = S(x, 6), x1 = x0 + L;
  const v = new Vox(NX, S(x, 36), NZ);
  chassis(x, v, x0, x1 - S(x, 6), NZ, TH, TW, boss ? 7 : 5, S(x, 2));
  const yb = TH - q, hz0 = S(x, 3), hz1 = NZ - S(x, 3);
  // корпус: обтекаемый, сверху округлый (как у пылесоса), спереди — короб под заборник
  const R = (hz1 - hz0) / 2, cyH = yb + S(x, 2);
  v.fill((xx, y, z) => {
    if (xx < x0 + q || xx > x1 - S(x, 8)) return undefined;
    const dz = (z - zc) / R, dy = (y - cyH) / S(x, 13);
    return dz * dz + Math.max(0, dy) * Math.max(0, dy) <= 1 && y >= yb ? 'steel' : undefined;
  }, 0, NX, yb, S(x, 30), hz0, hz1);
  v.paint((xx, y) => (y < yb + 2 * q ? 'steel_d' : undefined));
  // продольные рёбра жёсткости и светящийся шов вдоль бортов
  for (const dz of [-0.55, 0, 0.55]) v.paint((xx, y, z) => (Math.abs(z - (zc + dz * R)) < 0.6 * Math.max(1, q * 0.6) ? 'gun_d' : undefined), x0 + S(x, 4), x1 - S(x, 10), yb + S(x, 5), S(x, 30), 0, NZ);
  v.paint((xx, y, z) => (y >= yb + S(x, 3) && y < yb + S(x, 3) + 1 && Math.abs(z - zc) > R - 2 * q ? x.g : undefined), x0 + S(x, 4), x1 - S(x, 9), 0, NZ, 0, NZ);
  // воздухозаборник: кольцо-раструб (крыльчатка — отдельная часть, вращается)
  const ix = x1 - S(x, 9), iy = yb + S(x, 7), ir = Math.min(R - q, S(x, 13));
  v.cylX(iy, zc, ir + S(x, 2), ix, ix + S(x, 6), 'steel_d');
  v.cylX(iy, zc, ir, ix + S(x, 2), ix + S(x, 6.01), 0);
  v.cylX(iy, zc, ir + S(x, 2.2), ix + S(x, 5), ix + S(x, 6), 'gun');
  v.cylX(iy, zc, ir, ix, ix + S(x, 2), 'gun_d');
  v.cylX(iy, zc, ir - S(x, 2), ix, ix + q, x.g);                       // раскалённое нутро
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; v.set(ix + S(x, 5.5), iy + Math.sin(a) * (ir + S(x, 1.2)), zc + Math.cos(a) * (ir + S(x, 1.2)), 'steel_l'); }
  // клыки-зубья по кромке заборника (у босса)
  if (boss) for (let i = 0; i < 10; i++) { const a = Math.PI * (0.15 + 0.7 * i / 9); for (const s of [1, -1]) v.seg([ix + S(x, 6), iy + s * Math.sin(a) * ir, zc + Math.cos(a) * ir], [ix + S(x, 9), iy + s * Math.sin(a) * (ir - S(x, 2)), zc + Math.cos(a) * (ir - S(x, 2))], 0.6 * q, 'steel_l'); }
  // гофрошланги от заборника к баку
  for (const s of [-1, 1]) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 12; i++) { const tt = i / 12; pts.push([ix - S(x, 1) - tt * S(x, 20), yb + S(x, 12) + Math.sin(tt * Math.PI * 0.5) * S(x, 4), zc + s * (R - S(x, 6)) * (1 - tt * 0.45)]); }
    for (let i = 0; i < 12; i++) v.seg(pts[i], pts[i + 1], S(x, 2), i % 2 ? 'rubber' : 'rubber_l');
  }
  // выхлоп: кормовые решётки с раскалённым нутром (слабое место)
  v.box(x0, x0 + S(x, 3), yb + S(x, 2), yb + S(x, 10), zc - S(x, 10), zc + S(x, 10), x.g);
  for (let z = zc - S(x, 10); z < zc + S(x, 10); z += 2 * q) v.box(x0 - q, x0 + S(x, 1), yb + S(x, 2), yb + S(x, 10), z, z + q, 'gun_d');
  for (const zz of [zc - S(x, 13), zc + S(x, 13)]) { v.cylX(yb + S(x, 6), zz, S(x, 2.4), x0 - S(x, 4), x0 + S(x, 3), 'gun'); v.cylX(yb + S(x, 6), zz, S(x, 1.3), x0 - S(x, 4.2), x0 - S(x, 3), x.g); }
  if (boss) for (let xx = x0 + 6 * q; xx < x1 - 14 * q; xx += 4 * q) { v.set(xx, yb + S(x, 3) + 2, hz0 + q, 'steel_l'); v.set(xx, yb + S(x, 3) + 2, hz1 - q - 1, 'steel_l'); }

  // ---------------- крыльчатка в заборнике (вращается вокруг x)
  const fN = Math.ceil(ir * 2 + 3), fc = fN / 2;
  const fan = new Vox(S(x, 3), fN, fN);
  fan.cylX(fc, fc, S(x, 2.6), 0, S(x, 3), 'gun');
  fan.cylX(fc, fc, S(x, 1.2), S(x, 2), S(x, 3), x.g);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    fan.fill((xx, y, z) => { const dy = y - fc, dz = z - fc, r = Math.hypot(dy, dz); if (r > ir - q || r < S(x, 2)) return undefined; let d = Math.atan2(dy, dz) - a - r * 0.05 / q; d = ((d % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return Math.abs(d) < 0.22 ? 'steel_l' : undefined; }, 0, S(x, 1.5), 0, fN, 0, fN);
  }

  // ---------------- бак-циклон с пушкой (башня): прозрачная колба, внутри крутится мусор
  const TNX = S(x, 66), TNZ = SC(x, 34), tcx = S(x, 18), tcz = TNZ / 2, cr = SC(x, 10);
  const t = new Vox(TNX, S(x, 34), TNZ);
  t.cylY(tcx, tcz, cr + q, 0, S(x, 3), 'steel_d');
  t.cylY(tcx, tcz, cr, S(x, 3), S(x, 17), 'glass');
  t.cylY(tcx, tcz, cr - S(x, 2.2), S(x, 3), S(x, 17), 0);
  // мусор и пыль внутри колбы — спираль (светится изнутри у босса — пыль раскалена)
  for (let i = 0; i < 40; i++) { const a = i * 0.7, r = cr - S(x, 3) - (i % 3) * q, y = S(x, 4) + (i / 40) * S(x, 12); t.box(tcx + Math.cos(a) * r, tcx + Math.cos(a) * r + q, y, y + q, tcz + Math.sin(a) * r, tcz + Math.sin(a) * r + q, i % 5 === 0 ? x.g : i % 2 ? 'dirt' : 'ash'); }
  t.cylY(tcx, tcz, S(x, 2), S(x, 3), S(x, 17), 'gun');
  for (const y of [S(x, 7), S(x, 12)]) t.cylY(tcx, tcz, cr + 0.6, y, y + q, 'steel_d');
  t.cylY(tcx, tcz, cr + q, S(x, 17), S(x, 20), 'steel');
  t.cylY(tcx, tcz, cr - S(x, 1), S(x, 20), S(x, 21), 'steel_d');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; t.set(tcx + Math.cos(a) * (cr - S(x, 0.5)), S(x, 20), tcz + Math.sin(a) * (cr - S(x, 0.5)), x.g); }
  // орудийная маска на крышке и стволы
  t.box(tcx + S(x, 4), tcx + cr + S(x, 4), S(x, 17), S(x, 23), tcz - S(x, 6), tcz + S(x, 6), 'steel_d');
  t.box(tcx + cr + S(x, 2), tcx + cr + S(x, 4), S(x, 18), S(x, 22), tcz - S(x, 4), tcz + S(x, 4), 'gun_d');
  for (const s of [-1, 1]) classGun(x, t, tcx + cr + S(x, 4), S(x, 20), tcz + s * S(x, 3.2), (tt, gx, gy, gz) => {
    // циклонная пушка: широкий раструб с винтовыми кольцами
    tt.cylX(gy, gz, S(x, 2.2), gx, gx + S(x, 16), 'gun');
    for (let i = 0; i < 4; i++) tt.cylX(gy, gz, S(x, 2.8), gx + S(x, 2) + i * S(x, 3.4), gx + S(x, 3) + i * S(x, 3.4), 'steel_d');
    tt.cylX(gy, gz, S(x, 2.4), gx + S(x, 14), gx + S(x, 18), 'gun_d', S(x, 3.4));
    tt.cylX(gy, gz, S(x, 1.6), gx + S(x, 17), gx + S(x, 18.4), x.g);
  });
  // ручка-антенна и сенсор
  t.seg([tcx - cr, S(x, 20), tcz - S(x, 3)], [tcx - cr - S(x, 3), S(x, 31), tcz - S(x, 3)], 0.5 * q, 'gun_d');
  t.set(tcx - cr - S(x, 3), S(x, 31), tcz - S(x, 3), x.g);

  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'rotor', vox: fan, pivot: [0, fc, fc], at: [ix + S(x, 2.5) - NX / 2, iy, 0], axis: 'x' },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.36 - NX / 2, yb + S(x, 13), 0] },
  ], L + S(x, 4));
}

// ============================================================================ V. Холодильник-крепость
/** Облик V / босс IV «Холодильник-крепость»: на гусеничном шасси — эмалированный шкаф в стальных бандажах,
 *  две дверцы со светящимся уплотнителем (у босса — слабое место), иней и сосульки по кромкам, решётка
 *  конденсатора на корме; башня — морозилка с криопушками и ледяными кристаллами на крыше. */
export function formFridge(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const L = SC(x, 54), W = SC(x, 44), TH = S(x, 12), TW = SC(x, 11);
  const NX = L + S(x, 8), NZ = W + S(x, 4), zc = NZ / 2, x0 = S(x, 4), x1 = x0 + L;
  const v = new Vox(NX, S(x, 40), NZ);
  chassis(x, v, x0, x1, NZ, TH, TW, boss ? 7 : 5, S(x, 2));
  const yb = TH - q, hz0 = S(x, 4), hz1 = NZ - S(x, 4), yt = yb + S(x, 19), fx0 = x0 + S(x, 3), fx1 = x1 - S(x, 4);
  // шкаф: белая эмаль, скруглённые вертикальные рёбра
  v.fill((xx, y, z) => {
    const ex = Math.min(xx - fx0, fx1 - xx), ez = Math.min(z - hz0, hz1 - z);
    if (ex < 0 || ez < 0) return undefined;
    if (ex < 1.6 * q && ez < 1.6 * q && (1.6 * q - ex) ** 2 + (1.6 * q - ez) ** 2 > (1.6 * q) ** 2) return undefined;
    return 'white';
  }, 0, NX, yb, yt, 0, NZ);
  v.paint((xx, y, z) => (Math.min(z - hz0, hz1 - z) < 1 || y < yb + q ? 'white_d' : undefined));
  // стальные бандажи поперёк шкафа и заклёпки на них
  for (const bx of [fx0 + S(x, 6), fx1 - S(x, 14)]) {
    v.box(bx, bx + S(x, 3), yb, yt + 1, hz0 - 1, hz1 + 1, 'steel');
    v.box(bx, bx + S(x, 3), yt, yt + 1, hz0 - 1, hz1 + 1, 'steel_l');
    for (let y = yb + S(x, 3); y < yt; y += S(x, 4)) { v.set(bx + q, y, hz0 - 1, 'steel_l'); v.set(bx + q, y, hz1, 'steel_l'); }
  }
  // дверцы спереди: шов по центру светится, ручки-хромы, уплотнитель
  v.box(fx1, fx1 + S(x, 1.5), yb + q, yt - q, hz0 + q, hz1 - q, 'white');
  v.box(fx1, fx1 + S(x, 1.6), yb + q, yt - q, zc - Math.max(1, q * 0.5), zc + Math.max(1, q * 0.5), x.g);
  v.box(fx1, fx1 + S(x, 1.6), yb + S(x, 11), yb + S(x, 11) + Math.max(1, q * 0.5), hz0 + q, hz1 - q, x.g);      // граница морозилки
  for (const s of [-1, 1]) { v.box(fx1 + S(x, 1.5), fx1 + S(x, 2.5), yb + S(x, 4), yb + S(x, 9), zc + s * S(x, 2.5) - q / 2, zc + s * S(x, 2.5) + q / 2, 'chrome'); v.box(fx1 + S(x, 1.5), fx1 + S(x, 2.5), yb + S(x, 13), yb + S(x, 17), zc + s * S(x, 2.5) - q / 2, zc + s * S(x, 2.5) + q / 2, 'chrome'); }
  // магнитики-«значки» на дверце (у босса — череп-предупреждение в виде красной метки)
  v.box(fx1 + S(x, 1.5), fx1 + S(x, 2), yb + S(x, 6), yb + S(x, 8), hz0 + S(x, 4), hz0 + S(x, 6), boss ? 'red' : 'blue');
  // иней по верхней кромке и сосульки
  v.box(fx0, fx1 + S(x, 1.5), yt, yt + q, hz0, hz1, 'ice_l');
  for (let i = 0; i < (boss ? 26 : 13); i++) {
    const side = i % 3, len = (1 + ((i * 7) % 4)) * q, p = ((i * 37) % 97) / 97;
    if (side === 0) v.box(fx1 + S(x, 1), fx1 + S(x, 2), yt - len, yt, hz0 + p * (hz1 - hz0), hz0 + p * (hz1 - hz0) + q, i % 2 ? 'ice' : 'ice_l');
    else { const zz = side === 1 ? hz0 - 1 : hz1; v.box(fx0 + p * (fx1 - fx0), fx0 + p * (fx1 - fx0) + q, yt - len, yt, zz, zz + 1, i % 2 ? 'ice' : 'ice_l'); }
  }
  // корма: решётка конденсатора, светящаяся изнутри; компрессор
  v.box(fx0 - q, fx0, yb + S(x, 2), yt - S(x, 3), hz0 + S(x, 3), hz1 - S(x, 3), x.g);
  for (let y = yb + S(x, 2); y < yt - S(x, 3); y += 2 * q) v.box(fx0 - S(x, 1.5), fx0, y, y + q, hz0 + S(x, 3), hz1 - S(x, 3), 'gun_d');
  v.cylZ(x0 + S(x, 1), yb + S(x, 3), S(x, 2.6), hz0 + S(x, 4), hz1 - S(x, 4), 'gun');
  // ---------------- башня-морозилка с криопушками
  const TNX = S(x, 62), TNZ = SC(x, 34), tcx = S(x, 18), tcz = TNZ / 2;
  const t = new Vox(TNX, S(x, 30), TNZ);
  const bl = SC(x, 11), br = SC(x, 12), bh = S(x, 9);
  t.fill((xx, y, z) => { const dx = xx - tcx, dz = Math.abs(z - tcz); if (dx > bl || dx < -bl || dz > br) return undefined; if (dx > bl - S(x, 4) && y > bh - (dx - (bl - S(x, 4))) * 1.2) return undefined; return 'white'; }, 0, TNX, 0, bh, 0, TNZ);
  t.paint((xx, y) => (y < q ? 'steel_d' : y > bh - q - 1 ? 'white_d' : undefined));
  t.box(tcx - bl, tcx + bl - S(x, 3), bh - q, bh, tcz - br, tcz + br, 'ice_l');
  t.box(tcx - S(x, 2), tcx, 1, bh, tcz - br - 1, tcz + br + 1, 'steel');                                       // бандаж башни
  t.box(tcx + bl - S(x, 2), tcx + bl + S(x, 2), q, bh - S(x, 3), tcz - S(x, 6), tcz + S(x, 6), 'steel_d');     // маска
  // ледяные кристаллы на крыше
  const cryst: [number, number, number][] = [[-5, -5, 7], [-2, -7, 5], [-6, 3, 9], [-3, 6, 6], [0, 0, 4]];
  for (const [dx, dz, h] of cryst) { const cx = tcx + S(x, dx), cz = tcz + S(x, dz) * x.c, hh = S(x, h); t.fill((xx, y, z) => (Math.abs(xx - cx) + Math.abs(z - cz) < (1.6 * q) * (1 - (y - bh) / hh) + 0.5 ? (y > bh + hh * 0.6 ? 'ice_l' : 'ice') : undefined), cx - S(x, 3), cx + S(x, 3), bh, bh + hh, cz - S(x, 3), cz + S(x, 3)); }
  for (const s of [-1, 1]) classGun(x, t, tcx + bl + S(x, 2), S(x, 4.5), tcz + s * S(x, 4), (tt, gx, gy, gz) => {
    // криопушка: толстый ствол в ледяных кольцах, раструб-снежинка
    tt.cylX(gy, gz, S(x, 2.2), gx, gx + S(x, 20), 'steel');
    for (let i = 0; i < 5; i++) tt.cylX(gy, gz, S(x, 2.9), gx + S(x, 2) + i * S(x, 3.6), gx + S(x, 3.2) + i * S(x, 3.6), i % 2 ? 'ice' : 'ice_d');
    tt.cylX(gy, gz, S(x, 3.4), gx + S(x, 19), gx + S(x, 22), 'steel_d');
    tt.cylX(gy, gz, S(x, 1.7), gx + S(x, 21), gx + S(x, 22.4), x.g);
    tt.cylX(gy, gz, S(x, 0.7), gx + S(x, 22), gx + S(x, 22.6), 'ice_l');
  });
  // вентилятор морозилки на корме башни и датчик
  t.cylX(S(x, 5), tcz, S(x, 3.6), tcx - bl - S(x, 2), tcx - bl, 'gun_d');
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; t.seg([tcx - bl - S(x, 2), S(x, 5), tcz], [tcx - bl - S(x, 2), S(x, 5) + Math.sin(a) * S(x, 3), tcz + Math.cos(a) * S(x, 3)], 0.5 * q, x.g); }
  t.seg([tcx - S(x, 6), bh, tcz + br - S(x, 2)], [tcx - S(x, 8), bh + S(x, 12), tcz + br - S(x, 2)], 0.45 * q, 'gun_d');
  t.set(tcx - S(x, 8), bh + S(x, 12), tcz + br - S(x, 2), x.g);
  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.42 - NX / 2, yt + q, 0] },
  ], L);
}

// ============================================================================ VI. Командарм
/** Облик VI / босс V танк «Командарм»: флагман вооружённых сил. Низкий длинный корпус, лоб и экраны
 *  в блоках динамической защиты, городской камуфляж; клиновидная башня с длинной 125-мм пушкой
 *  (термокожух, эжектор), модуль пулемёта, по бокам башни — пакеты «Града» со светящимися соплами. */
export function formCommandarm(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const L = SC(x, 62), W = SC(x, 44), TH = S(x, 12), TW = SC(x, 12);
  const NX = L + S(x, 8), NZ = W + S(x, 6), zc = NZ / 2, x0 = S(x, 4), x1 = x0 + L;
  const v = new Vox(NX, S(x, 28), NZ);
  chassis(x, v, x0, x1, NZ, TH, TW, boss ? 8 : 6, S(x, 3));
  const yb = TH - q, hz0 = S(x, 3), hz1 = NZ - S(x, 3), yt = TH + S(x, 6);
  v.box(x0 + q, x1 - q, yb, yt, hz0, hz1, 'steel');
  v.cut(0.55, 1, 0, 0.55 * (x1 - S(x, 18)) + yt, x1 - S(x, 19), x1, yb, yt);                   // длинный пологий лоб
  v.cut(-1.5, 1, 0, -1.5 * (x0 + S(x, 4)) + yt, x0, x0 + S(x, 5), yb, yt);
  // городской камуфляж: тёмные пятна по корпусу
  v.paint((xx, y, z) => (Math.sin(xx * 0.21 / q + z * 0.13 / q) + Math.cos(z * 0.27 / q - xx * 0.09 / q) > 1.05 ? 'gun' : undefined), 0, NX, yb + q, yt, 0, NZ);
  v.paint(() => 'steel_d', x0, x1, yb, yb + q, 0, NZ);
  // динамическая защита на лбу: ряды блоков
  const gl = 0.55 * (x1 - S(x, 18)) + yt;
  for (let r = 0; r < 2; r++) for (let z = hz0 + S(x, 3); z < hz1 - S(x, 4); z += S(x, 3.4)) {
    const xx = x1 - S(x, 15) + r * S(x, 6);
    const y = Math.floor(gl - 0.55 * xx);
    v.box(xx, xx + S(x, 3.4), y - q, y + Math.max(1, q * 0.5), z, z + S(x, 2.8), ((r * 3 + Math.round(z / q)) % 3) ? 'steel_d' : 'gun');
  }
  // экраны с блоками ДЗ поверх гусениц
  for (const [z0, z1] of [[0, S(x, 2)], [NZ - S(x, 2), NZ]]) {
    v.box(x0 + S(x, 4), x1 - S(x, 6), TH * 0.4, TH + q, z0, z1, 'steel_d');
    for (let xx = x1 - S(x, 8); xx > x0 + S(x, 26); xx -= S(x, 5)) v.box(xx - S(x, 4), xx, TH * 0.45, TH, z0, z1 + (z0 ? 0 : 0), (xx / q) % 2 ? 'steel' : 'steel_l');
    for (let xx = x0 + S(x, 6); xx < x0 + S(x, 24); xx += S(x, 6)) v.box(xx, xx + Math.max(1, q * 0.5), TH * 0.45, TH, z0, z1, x.g);
  }
  // моторное отделение: решётки, раскалённые снизу; выхлоп по борту
  for (let i = 0; i < 6; i++) v.box(x0 + S(x, 3) + i * S(x, 2.4), x0 + S(x, 4) + i * S(x, 2.4), yt - 1, yt + q * 0.6, zc - S(x, 9), zc + S(x, 9), 'gun_d');
  v.box(x0 + S(x, 3), x0 + S(x, 17), yt - q - 1, yt - 1, zc - S(x, 9), zc + S(x, 9), x.g);
  v.box(x0 + S(x, 6), x0 + S(x, 12), yb + S(x, 2), yb + S(x, 4), hz1, hz1 + q, 'gun_d');
  // фары и прицелы механика
  for (const zz of [hz0 + S(x, 2), hz1 - S(x, 4)]) v.box(x1 - S(x, 3), x1 - q, yb + q, yb + S(x, 3), zz, zz + S(x, 2), x.g);
  // ---------------- клиновидная башня
  const TNX = S(x, 100), TNZ = SC(x, 40), tcx = S(x, 24), tcz = TNZ / 2;
  const t = new Vox(TNX, S(x, 30), TNZ);
  const bl = SC(x, 15), blb = SC(x, 16), br = SC(x, 13), bh = S(x, 8);
  t.fill((xx, y, z) => {
    const dx = xx - tcx, dz = Math.abs(z - tcz);
    if (dx > bl || dx < -blb || dz > br) return undefined;
    if (dx > bl - S(x, 9) && dz > br - (bl - dx) * 0.9) return undefined;          // клин в плане
    if (dz > br - S(x, 2) && y > bh - (dz - (br - S(x, 2))) * 1.2) return undefined;
    if (dx < -blb + S(x, 3) && y > bh - S(x, 2)) return undefined;
    return 'steel';
  }, 0, TNX, 0, bh, 0, TNZ);
  t.paint((xx, y, z) => (Math.sin(xx * 0.19 / q + z * 0.15 / q) + Math.cos(z * 0.24 / q - xx * 0.11 / q) > 1.05 ? 'gun' : undefined));
  t.paint((xx, y) => (y < q ? 'steel_d' : undefined));
  // блоки ДЗ по клину
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const dx = bl - S(x, 2) - i * S(x, 2.6), dz = br - (bl - dx) * 0.9 - q; t.box(tcx + dx - S(x, 2.4), tcx + dx, q, bh - S(x, 1.5), tcz + s * dz - (s > 0 ? q : 0), tcz + s * dz + (s > 0 ? 0 : q), i % 2 ? 'steel_l' : 'steel'); }
  // главное орудие (у игроков — по классу, одно по оси)
  const gx0 = tcx + bl - S(x, 1);
  if (boss) {
    t.cylX(S(x, 4.5), tcz, S(x, 2.4), gx0, gx0 + S(x, 46), 'gun');
    for (const r of [0.15, 0.35, 0.55]) t.cylX(S(x, 4.5), tcz, S(x, 2.7), gx0 + S(x, 46) * r, gx0 + S(x, 46) * r + S(x, 6), 'gun_l');   // термокожух
    t.cylX(S(x, 4.5), tcz, S(x, 3.4), gx0 + S(x, 30), gx0 + S(x, 35), 'gun_d');                                                      // эжектор
    t.cylX(S(x, 4.5), tcz, S(x, 1.3), gx0 + S(x, 45.5), gx0 + S(x, 46.2), x.g);
  } else classGun(x, t, gx0, S(x, 4.5), tcz, () => undefined);
  t.box(tcx + bl - S(x, 4), tcx + bl + S(x, 1), q, bh - q, tcz - S(x, 4), tcz + S(x, 4), 'steel_d');
  // модуль пулемёта на крыше и прицел командира
  t.box(tcx - S(x, 2), tcx + S(x, 4), bh, bh + S(x, 3), tcz + S(x, 3), tcz + S(x, 8), 'steel_d');
  t.cylX(bh + S(x, 2), tcz + S(x, 5.5), S(x, 0.7), tcx + S(x, 4), tcx + S(x, 13), 'gun');
  t.box(tcx + S(x, 4), tcx + S(x, 5), bh + S(x, 1), bh + S(x, 2.2), tcz + S(x, 4), tcz + S(x, 7), x.g);
  t.box(tcx + S(x, 1), tcx + S(x, 5), bh, bh + S(x, 4), tcz - S(x, 7), tcz - S(x, 3), 'gun');
  t.box(tcx + S(x, 5), tcx + S(x, 5.6), bh + S(x, 1), bh + S(x, 3), tcz - S(x, 6.5), tcz - S(x, 3.5), x.g);
  // пакеты «Града» по бокам кормы башни: 3×2 трубы, сопла светятся
  for (const s of [-1, 1]) {
    const pz = tcz + s * (br + S(x, 3)), px0 = tcx - blb + S(x, 2), px1 = tcx + S(x, 4);
    t.box(px0, px1, S(x, 2), S(x, 8), pz - S(x, 3), pz + S(x, 3), 'army_d');
    t.box(px0, px1, S(x, 2), S(x, 2.6), pz - S(x, 3), pz + S(x, 3), 'gun_d');
    for (const yy of [S(x, 3.6), S(x, 6.4)]) for (const zz of [-1.8, 0, 1.8]) { t.cylX(yy, pz + S(x, zz), S(x, 0.8), px1 - 0.5, px1 + 0.6, 'black'); t.set(px1, yy, pz + S(x, zz), x.g); }
    t.box(tcx - S(x, 2), tcx, bh - S(x, 3), bh - S(x, 2), tcz + s * br, tcz + s * (br + S(x, 3)), 'gun');            // кронштейн
  }
  // дымовые гранатомёты и антенны
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) t.cylX(bh - S(x, 2), tcz + s * (br - S(x, 3) - i * S(x, 1.6)), S(x, 0.7), tcx + S(x, 2), tcx + S(x, 5), 'gun_d');
  for (const s of [-1, 1]) { t.seg([tcx - blb + S(x, 3), bh - q, tcz + s * S(x, 7)], [tcx - blb + S(x, 1), bh + S(x, 16), tcz + s * S(x, 7)], 0.4 * q, 'gun_d'); t.set(tcx - blb + S(x, 1), bh + S(x, 16), tcz + s * S(x, 7), x.g); }
  // кормовая ниша башни со светящимися щелями
  for (let z = tcz - S(x, 9); z < tcz + S(x, 9); z += S(x, 3)) t.box(tcx - blb - 1, tcx - blb + 1, S(x, 2), S(x, 5), z, z + q, x.g);
  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.5 - NX / 2, yt, 0] },
  ], L);
}

// ============================================================================ VII. Роторный крот
/** Облик VII / босс VI роторный экскаватор «Крот»: широкое гусеничное шасси, спереди на стреле —
 *  огромное роторное колесо с ковшами (вращается), машинный дом с кабиной и дизелем (у босса — слабое место,
 *  светящиеся решётки), противовес. Орудия стоят на машинном доме. */
export function formMole(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const L = SC(x, 50), W = SC(x, 50), TH = S(x, 14), TW = SC(x, 15);
  const NX = L + S(x, 18), NZ = W + S(x, 4), zc = NZ / 2, x0 = S(x, 4), x1 = x0 + L;
  const v = new Vox(NX, S(x, 34), NZ);
  chassis(x, v, x0, x1, NZ, TH, TW, boss ? 6 : 4, S(x, 2));
  const yb = TH - q, yt = TH + S(x, 4), hz0 = S(x, 6), hz1 = NZ - S(x, 6);
  v.box(x0 + S(x, 2), x1 - S(x, 2), yb, yt, hz0, hz1, 'steel_d');
  v.cylY(x0 + L * 0.45, zc, S(x, 14) * x.c, yt, yt + q, 'gun_d');                                // поворотный круг
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; v.set(x0 + L * 0.45 + Math.cos(a) * S(x, 13.4) * x.c, yt, zc + Math.sin(a) * S(x, 13.4) * x.c, i % 2 ? x.g : 'steel_l'); }
  // проходческий щит: цилиндр от корпуса к фрезе, рёбра и гидроцилиндры
  const wr = Math.min(S(x, 16) * x.c, (NZ - S(x, 2)) / 2), wy = wr + q, wx = x1 + S(x, 10);
  v.cylX(wy, zc, wr - S(x, 2), x1 - S(x, 8), wx - S(x, 1), 'steel');
  for (let xx = x1 - S(x, 6); xx < wx - S(x, 2); xx += S(x, 4)) v.cylX(wy, zc, wr - S(x, 1.2), xx, xx + q, 'steel_d');
  for (const s of [-1, 1]) v.seg([x1 - S(x, 6), yt + S(x, 2), zc + s * (wr - S(x, 4))], [wx - S(x, 3), wy + s * 0 + S(x, 3), zc + s * (wr - S(x, 3))], 0.9 * q, 'gun_d');
  v.cylX(wy, zc, wr, wx - S(x, 2), wx, 'gun');                                                       // обод перед фрезой
  // ---------------- режущая фреза (вращается вокруг x): лучи, зубья, ковши-окна, светящееся ядро
  const N = Math.ceil(wr * 2 + 2), c0 = N / 2, WX = S(x, 5);
  const wheel = new Vox(WX, N, N);
  wheel.fill((xx, y, z) => { const r = Math.hypot(y - c0, z - c0); return r < wr - 0.5 ? (r < S(x, 4) ? 'gun' : xx < WX - q ? 'gun_d' : undefined) : undefined; });
  const nb = boss ? 8 : 6;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    // луч фрезы: стальная балка с зубьями-резцами
    wheel.fill((xx, y, z) => { const dy = y - c0, dz = z - c0, rr = dy * ca + dz * sa, tt = -dy * sa + dz * ca; return rr > S(x, 3) && rr < wr && Math.abs(tt) < S(x, 1.6) ? (xx > WX - q - 1 ? 'steel_l' : 'steel') : undefined; });
    for (let r = S(x, 6); r < wr - q; r += S(x, 3)) wheel.box(WX - q, WX, c0 + ca * r - 0.5, c0 + ca * r + 0.5 + (q > 1 ? 1 : 0), c0 + sa * r - 0.5, c0 + sa * r + 0.5 + (q > 1 ? 1 : 0), 'chrome');
    // окно-ковш между лучами: светится породой изнутри
    const b = a + Math.PI / nb, cb = Math.cos(b), sb = Math.sin(b);
    wheel.box(0, WX - q, c0 + cb * wr * 0.62 - q, c0 + cb * wr * 0.62 + q, c0 + sb * wr * 0.62 - q, c0 + sb * wr * 0.62 + q, x.g);
  }
  wheel.cylX(c0, c0, S(x, 2.2), WX - q, WX + 0.01, x.g);
  wheel.cylX(c0, c0, S(x, 0.9), WX - 0.5, WX + 0.01, 'lamp');
  // кромка фрезы: резцы по ободу
  for (let i = 0; i < (boss ? 32 : 18); i++) { const a = (i / (boss ? 32 : 18)) * Math.PI * 2; wheel.set(WX - q, c0 + Math.cos(a) * (wr - 0.5), c0 + Math.sin(a) * (wr - 0.5), 'steel_l'); }
  // ---------------- машинный дом: кабина, дизель, противовес, орудия
  const TNX = S(x, 64), TNZ = SC(x, 40), tcx = S(x, 26), tcz = TNZ / 2;
  const t = new Vox(TNX, S(x, 36), TNZ);
  const hl = SC(x, 13), hw = SC(x, 12), hh = S(x, 12);
  t.box(tcx - hl, tcx + hl, 0, hh, tcz - hw, tcz + hw, 'steel');
  t.paint((xx, y) => (y < q ? 'steel_d' : y > hh - q - 1 ? 'steel_l' : undefined));
  for (let xx = tcx - hl + S(x, 3); xx < tcx + hl - S(x, 2); xx += S(x, 4)) t.box(xx, xx + 1, q, hh - q, tcz - hw - 1, tcz + hw + 1, 'steel_d');     // гофра обшивки
  // кабина спереди слева: стекло светится изнутри
  t.box(tcx + hl - S(x, 9), tcx + hl + S(x, 2), hh - S(x, 2), hh + S(x, 7), tcz - hw, tcz - hw + S(x, 9), 'steel');
  t.box(tcx + hl + S(x, 1), tcx + hl + S(x, 2.01), hh + q, hh + S(x, 6), tcz - hw + q, tcz - hw + S(x, 8), 'glass');
  t.box(tcx + hl - S(x, 7), tcx + hl, hh + S(x, 2), hh + S(x, 5), tcz - hw - 0.5, tcz - hw + 0.5, 'glass');
  t.box(tcx + hl + S(x, 1.5), tcx + hl + S(x, 2.2), hh + S(x, 2), hh + S(x, 3), tcz - hw + S(x, 2), tcz - hw + S(x, 7), x.g);
  // дизель за кабиной: кожух с решётками и трубами (слабое место — светится)
  t.box(tcx - hl + S(x, 2), tcx + S(x, 2), hh, hh + S(x, 5), tcz - S(x, 2), tcz + hw - S(x, 2), 'gun');
  for (let xx = tcx - hl + S(x, 3); xx < tcx + S(x, 1); xx += S(x, 2)) t.box(xx, xx + q, hh + S(x, 5), hh + S(x, 5) + 1, tcz - S(x, 1), tcz + hw - S(x, 3), 'gun_d');
  t.box(tcx - hl + S(x, 3), tcx + S(x, 1), hh + S(x, 4), hh + S(x, 5), tcz - S(x, 1), tcz + hw - S(x, 3), x.g);
  for (const zz of [tcz + S(x, 3), tcz + S(x, 7)]) { t.cylY(tcx - S(x, 6), zz, S(x, 1.3), hh + S(x, 5), hh + S(x, 12), 'gun_d'); t.cylY(tcx - S(x, 6), zz, S(x, 0.8), hh + S(x, 11), hh + S(x, 12.2), x.g); }
  // противовес сзади: тяжёлый короб с полосами
  t.box(tcx - hl - S(x, 9), tcx - hl, S(x, 2), hh - S(x, 1), tcz - hw + S(x, 2), tcz + hw - S(x, 2), 'gun');
  for (let z = tcz - hw + S(x, 3); z < tcz + hw - S(x, 2); z += S(x, 4)) t.box(tcx - hl - S(x, 9.5), tcx - hl - S(x, 8.5), S(x, 3), hh - S(x, 2), z, z + S(x, 2), 'steel_d');
  // орудия — на «плечах» машинного дома
  for (const s of [-1, 1]) {
    const gz = tcz + s * (hw - S(x, 2));
    t.box(tcx + hl - S(x, 4), tcx + hl + S(x, 1), S(x, 4), S(x, 9), gz - S(x, 2.4), gz + S(x, 2.4), 'steel_d');
    classGun(x, t, tcx + hl + S(x, 1), S(x, 6.5), gz, (tt, gx, gy, gz2) => {
      // дробилка-картечница: короткая толстая пушка с зубчатым дулом
      tt.cylX(gy, gz2, S(x, 2.2), gx, gx + S(x, 16), 'gun');
      tt.cylX(gy, gz2, S(x, 2.8), gx + S(x, 5), gx + S(x, 7), 'steel_d');
      tt.cylX(gy, gz2, S(x, 3), gx + S(x, 14), gx + S(x, 17), 'steel_d');
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tt.set(gx + S(x, 17), gy + Math.sin(a) * S(x, 2.6), gz2 + Math.cos(a) * S(x, 2.6), 'steel_l'); }
      tt.cylX(gy, gz2, S(x, 1.2), gx + S(x, 16.5), gx + S(x, 17.4), x.g);
    });
  }
  // мачта с прожектором
  t.seg([tcx + S(x, 2), hh, tcz + hw - S(x, 2)], [tcx + S(x, 2), hh + S(x, 18), tcz + hw - S(x, 2)], 0.5 * q, 'gun_d');
  t.box(tcx + S(x, 2), tcx + S(x, 4), hh + S(x, 17), hh + S(x, 19), tcz + hw - S(x, 3), tcz + hw - S(x, 1), x.g);
  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'spin', vox: wheel, pivot: [0, c0, c0], at: [wx - NX / 2, wy, 0], axis: 'x' },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.45 - NX / 2, yt + q, 0] },
  ], L + S(x, 12));
}

// ============================================================================ VIII. Летающая крепость
/** Облик VIII / босс VII «Летающая крепость»: бронированный летающий корпус-крыло без гусениц — висит над землёй
 *  на четырёх кольцевых винтах (вращаются), под каждым светится струя; кабина-фонарь, бомболюк, хвостовые
 *  моторы (у босса — слабое место). Башня — спаренная пушечная турель на спине. */
export function formSky(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const L = SC(x, 56), W = SC(x, 56);
  const NX = L + S(x, 8), NZ = W + S(x, 4), zc = NZ / 2, x0 = S(x, 4), x1 = x0 + L;
  const hy = S(x, 9);                               // висит на этой высоте
  const v = new Vox(NX, S(x, 30), NZ);
  // фюзеляж: веретено вдоль x
  v.fill((xx, y, z) => {
    const u = (xx - x0) / L;                         // 0 — хвост, 1 — нос
    const rr = S(x, 8) * (u < 0.15 ? 0.55 + u * 3 : u > 0.8 ? 1 - (u - 0.8) * 2.6 : 1);
    const dy = (y - hy - S(x, 5)) / (rr * 0.85), dz = (z - zc) / rr;
    return dy * dy + dz * dz <= 1 ? 'steel' : undefined;
  }, x0, x1, hy - S(x, 4), hy + S(x, 14), 0, NZ);
  v.paint((xx, y) => (y < hy + S(x, 2) ? 'steel_d' : undefined));
  // крыло: широкая плоская плита со скосом передней кромки
  v.fill((xx, y, z) => { const dz = Math.abs(z - zc), dx = xx - (x0 + L * 0.45); return dz < W / 2 - q && dx < S(x, 9) - dz * 0.35 && dx > -S(x, 8) ? 'steel' : undefined; }, 0, NX, hy + S(x, 3), hy + S(x, 6), 0, NZ);
  v.paint((xx, y, z) => (Math.abs(z - zc) > S(x, 9) && y >= hy + S(x, 5) ? 'steel_l' : undefined), 0, NX, hy + S(x, 5), hy + S(x, 6), 0, NZ);
  v.paint((xx, y, z) => (Math.abs(z - zc) > S(x, 9) && ((Math.round(z / q)) % 7 === 0) ? 'gun_d' : undefined), 0, NX, hy + S(x, 5), hy + S(x, 6), 0, NZ);
  // светящаяся кромка крыла
  v.fill((xx, y, z, c) => { if (!c) return undefined; const dz = Math.abs(z - zc), dx = xx - (x0 + L * 0.45); return dz > S(x, 10) && dx > S(x, 9) - dz * 0.35 - 1.2 ? x.g : undefined; }, 0, NX, hy + S(x, 3), hy + S(x, 4), 0, NZ);
  // кабина-фонарь на носу
  v.ell(x1 - S(x, 9), hy + S(x, 10), zc, S(x, 6), S(x, 3), S(x, 4), 'glass');
  v.ell(x1 - S(x, 9), hy + S(x, 10.6), zc, S(x, 4), S(x, 1.6), S(x, 2.4), 'glass_d');
  v.box(x1 - S(x, 6), x1 - S(x, 4), hy + S(x, 9), hy + S(x, 10), zc - S(x, 2.5), zc + S(x, 2.5), x.g);
  // хвост: кили и два мотора (слабое место — светящиеся сопла)
  for (const s of [-1, 1]) {
    v.box(x0, x0 + S(x, 8), hy + S(x, 7), hy + S(x, 16), zc + s * S(x, 5) - q, zc + s * S(x, 5) + q, 'steel');
    v.cut(-1, 1, 0, -(x0 + S(x, 8)) + hy + S(x, 16) + S(x, 3), x0, x0 + S(x, 9), hy + S(x, 7), hy + S(x, 17), zc + s * S(x, 5) - q, zc + s * S(x, 5) + q);
    v.cylX(hy + S(x, 4), zc + s * S(x, 4), S(x, 2.6), x0 - S(x, 2), x0 + S(x, 6), 'gun');
    v.cylX(hy + S(x, 4), zc + s * S(x, 4), S(x, 1.6), x0 - S(x, 2.2), x0 - S(x, 1), x.g);
  }
  // бомболюк снизу и подвесные бомбы
  v.box(x0 + L * 0.4, x0 + L * 0.62, hy - S(x, 1), hy, zc - S(x, 3), zc + S(x, 3), 'gun_d');
  for (const s of [-1, 1]) v.ell(x0 + L * 0.5, hy - S(x, 1.5), zc + s * S(x, 6), S(x, 4), S(x, 1.4), S(x, 1.4), 'gun');
  // гондолы винтов: четыре кольца на концах крыла (вращаются винты — отдельные части)
  const pods: [number, number][] = [[x0 + L * 0.68, zc - W / 2 + S(x, 8)], [x0 + L * 0.68, zc + W / 2 - S(x, 8)], [x0 + L * 0.22, zc - W / 2 + S(x, 9)], [x0 + L * 0.22, zc + W / 2 - S(x, 9)]];
  const pr = S(x, 7.5) * x.c;
  for (const [px, pz] of pods) {
    v.fill((xx, y, z) => { const r = Math.hypot(xx - px, z - pz); return r < pr + q && r > pr - q * 0.6 ? 'steel_d' : undefined; }, px - pr - 2 * q, px + pr + 2 * q, hy + S(x, 2), hy + S(x, 6), pz - pr - 2 * q, pz + pr + 2 * q);
    v.fill((xx, y, z) => { const r = Math.hypot(xx - px, z - pz); return r < pr + q && r > pr + 0.2 ? x.g : undefined; }, px - pr - 2 * q, px + pr + 2 * q, hy + S(x, 2), hy + S(x, 2) + 1, pz - pr - 2 * q, pz + pr + 2 * q);
    // струя: светящийся столб под гондолой (к земле тоньше)
    for (let y = 0; y < hy + S(x, 2); y++) { const k = y / (hy + S(x, 2)); v.cylY(px, pz, pr * (0.25 + 0.35 * k), y, y + 1, (y + Math.round(px)) % 3 === 0 ? 'lamp' : x.g); }
  }
  // ---------------- винты
  const rotorParts: PartDef[] = pods.map(([px, pz], i) => {
    const n = Math.ceil(pr * 2 + 2), c = n / 2;
    const r = new Vox(n, Math.max(2, q), n);
    r.cylY(c, c, S(x, 1.6), 0, Math.max(2, q), 'gun');
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + i; r.seg([c, 0.5, c], [c + Math.cos(a) * (pr - q), 0.5, c + Math.sin(a) * (pr - q)], 0.9 * q, 'steel_l'); }
    return { name: 'prop', vox: r, pivot: [c, 0, c], at: [px - NX / 2, hy + S(x, 4), pz - NZ / 2] };
  });
  // ---------------- турель на спине: спаренные пушки, прицельная станция
  const TNX = S(x, 52), TNZ = SC(x, 26), tcx = S(x, 14), tcz = TNZ / 2;
  const t = new Vox(TNX, S(x, 22), TNZ);
  t.fill((xx, y, z) => { const dx = xx - tcx, dz = z - tcz; const r = Math.hypot(dx * 0.85, dz); return r < SC(x, 9) && y < S(x, 6) - Math.max(0, r - SC(x, 6)) * 0.8 ? 'steel' : undefined; }, 0, TNX, 0, S(x, 6), 0, TNZ);
  t.cylY(tcx, tcz, SC(x, 9.4), 0, q, 'steel_d');
  t.ell(tcx - S(x, 2), S(x, 6), tcz, S(x, 4), S(x, 2.4), S(x, 3.2), 'glass');
  t.box(tcx - S(x, 2), tcx + S(x, 1), S(x, 7), S(x, 8), tcz - S(x, 1), tcz + S(x, 1), x.g);
  for (const s of [-1, 1]) classGun(x, t, tcx + S(x, 6), S(x, 3.5), tcz + s * S(x, 3.6), (tt, gx, gy, gz) => {
    // авиапушка: тонкий длинный ствол с перфорированным кожухом
    tt.cylX(gy, gz, S(x, 1.6), gx, gx + S(x, 24), 'gun');
    for (let i = 0; i < 6; i++) tt.cylX(gy, gz, S(x, 2.1), gx + S(x, 2) + i * S(x, 2.4), gx + S(x, 3) + i * S(x, 2.4), 'gun_d');
    tt.cylX(gy, gz, S(x, 2), gx + S(x, 22), gx + S(x, 25), 'steel_d');
    tt.cylX(gy, gz, S(x, 0.9), gx + S(x, 24.5), gx + S(x, 25.3), x.g);
  });
  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    ...rotorParts,
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.55 - NX / 2, hy + S(x, 11), 0] },
  ], L);
}

// ============================================================================ IX. Линкор «Гроза»
/** Облик IX / босс VIII сухопутный линкор «Гроза»: длинный корпус с корабельным носом на трёх парах гусениц,
 *  палуба с надстройкой-мостиком (светящиеся окна), дымовая труба, радарная мачта; главная башня с тремя
 *  стволами (поворачивается), кормовая башня и малые бортовые турели. */
export function formGroza(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const L = SC(x, 70), W = SC(x, 40), TH = S(x, 11), TW = SC(x, 10);
  const NX = L + S(x, 12), NZ = W + S(x, 6), zc = NZ / 2, x0 = S(x, 4), x1 = x0 + L;
  const v = new Vox(NX, S(x, 40), NZ);
  // три пары гусениц (носовая, средняя, кормовая)
  const seg = (L - S(x, 14)) / 3;
  for (let i = 0; i < 3; i++) {
    const a = x0 + S(x, 2) + i * seg, b = a + seg - S(x, 2);
    track(v, a, b, TH, S(x, 3), S(x, 3) + TW, S(x, 3), boss ? 3 : 2, 'gun', 'steel_d');
    track(v, a, b, TH, NZ - S(x, 3) - TW, NZ - S(x, 3), NZ - S(x, 4), boss ? 3 : 2, 'gun', 'steel_d');
  }
  const yb = TH - q, yd = TH + S(x, 7);
  // корпус: прямой борт, корабельный нос клином в плане, развал бортов
  v.fill((xx, y, z) => {
    const dz = Math.abs(z - zc), u = xx - (x1 - S(x, 20));
    const hw = W / 2 + S(x, 1) - (u > 0 ? u * u / S(x, 20) / 1.1 : 0) + (y - yb) * 0.12;
    if (xx < x0 || xx > x1 + S(x, 6) || dz > hw) return undefined;
    if (xx > x1 && y < yb + (xx - x1) * 1.4) return undefined;                     // форштевень
    return 'steel';
  }, 0, NX, yb, yd, 0, NZ);
  v.paint((xx, y) => (y < yb + S(x, 2) ? 'steel_d' : y >= yd - q ? 'steel_l' : undefined));
  // «ватерлиния» — светящаяся полоса вдоль бортов, иллюминаторы
  v.paint((xx, y, z) => (y >= yb + S(x, 2) && y < yb + S(x, 2) + Math.max(1, q * 0.5) ? x.g : undefined));
  for (let xx = x0 + S(x, 6); xx < x1 - S(x, 6); xx += S(x, 4)) for (const s of [-1, 1]) v.set(xx, yb + S(x, 4.5), s < 0 ? 0 : NZ - 1, 'glass_d');
  // палубный настил: доски поперёк
  v.paint((xx, y) => (y >= yd - q && (Math.round(xx / q)) % 4 === 0 ? 'steel_d' : undefined), 0, NX, yd - q, yd, 0, NZ);
  // надстройка-мостик за главной башней, со светящимися окнами
  const sx0 = x0 + L * 0.36, sx1 = x0 + L * 0.56;
  v.box(sx0, sx1, yd, yd + S(x, 8), zc - S(x, 8), zc + S(x, 8), 'steel');
  v.box(sx0 + S(x, 3), sx1 - S(x, 2), yd + S(x, 8), yd + S(x, 13), zc - S(x, 6), zc + S(x, 6), 'steel');
  v.box(sx0 + S(x, 5), sx1 - S(x, 4), yd + S(x, 13), yd + S(x, 16), zc - S(x, 4), zc + S(x, 4), 'steel_d');
  for (const y of [yd + S(x, 2.5), yd + S(x, 10)]) v.box(sx1 - 0.6, sx1 + 0.6, y, y + S(x, 1.5), zc - S(x, 5), zc + S(x, 5), x.g);
  v.box(sx1 - S(x, 2) - 0.6, sx1 - S(x, 2) + 0.6, yd + S(x, 14), yd + S(x, 15), zc - S(x, 3), zc + S(x, 3), x.g);
  // мачта с радаром и прожектором
  v.seg([sx0 + S(x, 8), yd + S(x, 16), zc], [sx0 + S(x, 8), yd + S(x, 30), zc], 0.7 * q, 'gun_d');
  v.box(sx0 + S(x, 6), sx0 + S(x, 10), yd + S(x, 24), yd + S(x, 25), zc - S(x, 5), zc + S(x, 5), 'steel_l');
  v.set(sx0 + S(x, 8), yd + S(x, 30), zc, x.g);
  // дымовая труба за мостиком: раскалённое жерло (у босса — машинное отделение, слабое место, на корме)
  v.ell(sx0 - S(x, 4), yd + S(x, 7), zc, S(x, 4), S(x, 8), S(x, 3), 'steel_d');
  v.cylY(sx0 - S(x, 4), zc, S(x, 2), yd + S(x, 12), yd + S(x, 15.1), x.g);
  v.box(sx0 - S(x, 8), sx0, yd + S(x, 13), yd + S(x, 14), zc - S(x, 3.5), zc + S(x, 3.5), 'gun');
  // кормовая башня (неподвижная) и решётки машинного отделения
  const ax = x0 + S(x, 12);
  v.cylY(ax, zc, SC(x, 6), yd, yd + S(x, 4), 'steel');
  v.cylY(ax, zc, SC(x, 6.3), yd, yd + q, 'steel_d');
  for (const dz of [-2.2, 0, 2.2]) v.cylX(yd + S(x, 2), zc + S(x, dz), S(x, 0.9), ax - SC(x, 18), ax, 'gun');
  for (let i = 0; i < 4; i++) v.box(x0 + S(x, 2) + i * S(x, 2), x0 + S(x, 3) + i * S(x, 2), yd, yd + 0.6 * q, zc - S(x, 10), zc + S(x, 10), 'gun_d');
  v.box(x0 + S(x, 1), x0 + S(x, 9), yd - q - 1, yd - 1, zc - S(x, 10), zc + S(x, 10), x.g);
  // малые бортовые турели
  for (const s of [-1, 1]) for (const fx of [0.3, 0.62]) {
    const px = x0 + L * fx, pz = zc + s * (W / 2 - S(x, 3));
    v.cylY(px, pz, S(x, 2.6), yd, yd + S(x, 2.5), 'steel_d');
    v.cylX(yd + S(x, 1.5), pz, S(x, 0.6), px, px + S(x, 7), 'gun');
  }
  // ---------------- главная башня: три ствола (у игроков — по классу, два)
  const TNX = S(x, 80), TNZ = SC(x, 30), tcx = S(x, 18), tcz = TNZ / 2;
  const t = new Vox(TNX, S(x, 20), TNZ);
  const br = SC(x, 10);
  t.fill((xx, y, z) => { const dx = xx - tcx, dz = Math.abs(z - tcz); if (dx < -S(x, 10) || dx > S(x, 12) || dz > br) return undefined; if (dx > S(x, 6) && dz > br - (S(x, 12) - dx) * 1.2) return undefined; if (y > S(x, 7) - Math.max(0, dx - S(x, 6)) * 0.5) return undefined; return 'steel'; }, 0, TNX, 0, S(x, 8), 0, TNZ);
  t.paint((xx, y) => (y < q ? 'steel_d' : y > S(x, 6) ? 'steel_l' : undefined));
  t.box(tcx - S(x, 6), tcx + S(x, 2), S(x, 7), S(x, 9), tcz - S(x, 3), tcz + S(x, 3), 'steel_d');                // дальномер
  t.box(tcx - S(x, 6), tcx - S(x, 5), S(x, 7.5), S(x, 8.5), tcz - S(x, 7), tcz + S(x, 7), 'gun');
  for (const s of [-1, 1]) t.set(tcx - S(x, 6), S(x, 8), tcz + s * S(x, 7), x.g);
  if (boss) for (const dz of [-6, 0, 6]) {
    const gz = tcz + S(x, dz);
    t.cylX(S(x, 3.6), gz, S(x, 1.9), tcx + S(x, 10), tcx + S(x, 48), 'gun');
    t.cylX(S(x, 3.6), gz, S(x, 2.4), tcx + S(x, 10), tcx + S(x, 16), 'gun_d');
    t.cylX(S(x, 3.6), gz, S(x, 2.3), tcx + S(x, 45), tcx + S(x, 48.5), 'gun_d');
    t.cylX(S(x, 3.6), gz, S(x, 1), tcx + S(x, 48), tcx + S(x, 48.8), x.g);
  }
  else for (const s of [-1, 1]) classGun(x, t, tcx + S(x, 11), S(x, 3.6), tcz + s * S(x, 4), () => undefined);
  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.72 - NX / 2, yd, 0] },
  ], L + S(x, 6));
}

// ============================================================================ X. Титан-мегаполис
/** Облик X / босс IX «Титан-мегаполис»: город на гусеницах. Огромная платформа на четырёх лентах,
 *  кварталы небоскрёбов со светящимися окнами, реактор на корме (у босса — слабое место); в центре —
 *  башня главного калибра: многоярусная, с куполом-радаром, мачтой, звездой в круге и гигантским стволом
 *  со светящимся дулом; по палубе — малые турели. У игрока броня — его цвета, плиты графитовые (референс «LVL 8»). */
export function formTitan(cls: TankClass, glow: string, boss = false): ModelDef {
  const x = mk(cls, glow, boss), q = x.q;
  const main = boss ? 'steel' : glow === 'glow_g' ? 'green_l' : 'yel', mainD = boss ? 'steel_d' : glow === 'glow_g' ? 'green' : 'yel_d';
  const L = SC(x, 64), W = SC(x, 54), TH = S(x, 12), TW = SC(x, 9);
  const NX = L + S(x, 8), NZ = W + S(x, 4), zc = NZ / 2, x0 = S(x, 4), x1 = x0 + L;
  const v = new Vox(NX, S(x, 44), NZ);
  // четыре ленты: по две с каждого борта
  for (const z0 of [S(x, 2), S(x, 2) + TW + q, NZ - S(x, 2) - 2 * TW - q, NZ - S(x, 2) - TW]) track(v, x0, x1, TH, z0, z0 + TW, z0 < zc ? z0 : z0 + TW - 1, boss ? 7 : 5, 'gun', 'steel_d');
  const yb = TH - q, yd = TH + S(x, 6);
  // платформа: графитовые плиты, борта цвета основы, светящиеся кольца-швы
  v.box(x0 + q, x1 - q, yb, yd, S(x, 1), NZ - S(x, 1), 'gun');
  v.cut(1.2, 1, 0, 1.2 * (x1 - S(x, 6)) + yd, x1 - S(x, 7), x1, yb, yd);
  v.paint((xx, y, z) => (y >= yb + S(x, 2) && y < yd - q && (z < S(x, 2) || z >= NZ - S(x, 2)) ? main : undefined));
  v.paint((xx, y, z) => (y >= yb + S(x, 2) && y < yb + S(x, 2) + Math.max(1, q * 0.5) ? x.g : undefined));
  for (let xx = x0 + S(x, 8); xx < x1 - S(x, 8); xx += S(x, 9)) v.paint(() => x.g, xx, xx + Math.max(1, q * 0.5), yb + S(x, 2), yd - q, 0, NZ);
  // кварталы: небоскрёбы по краям палубы, окна светятся
  const towers: [number, number, number, number, number][] = [
    [0.08, -0.36, 7, 6, 18], [0.2, -0.38, 6, 7, 26], [0.08, 0.34, 6, 7, 22], [0.22, 0.37, 7, 6, 14],
    [0.62, -0.36, 6, 6, 16], [0.75, -0.33, 5, 6, 11], [0.64, 0.36, 6, 6, 20], [0.78, 0.32, 5, 5, 12],
  ];
  for (const [fx, fz, w, d, h] of towers) {
    const bx = x0 + L * fx, bz = zc + W * fz, bw = SC(x, w) / 2, bd = SC(x, d) / 2, bh = S(x, h);
    v.box(bx - bw, bx + bw, yd, yd + bh, bz - bd, bz + bd, (Math.round(fx * 10 + h)) % 2 ? 'concrete' : 'concrete_d');
    v.paint((xx, y, z) => (y > yd + q && y < yd + bh - q && Math.round(y / q) % 3 === 0 && Math.round((xx + z) / q) % 2 === 0 ? (Math.round(xx * 3 + y + z) % 5 ? x.g : 'lamp') : undefined), bx - bw, bx + bw, yd, yd + bh, bz - bd, bz + bd);
    v.box(bx - bw + q, bx + bw - q, yd + bh, yd + bh + q, bz - bd + q, bz + bd - q, 'steel_d');
    if (h > 20) { v.seg([bx, yd + bh, bz], [bx, yd + bh + S(x, 7), bz], 0.4 * q, 'gun_d'); v.set(bx, yd + bh + S(x, 7), bz, x.g); }
  }
  // реактор на корме: светящееся ядро в решётчатой клетке (слабое место босса)
  const rx = x0 + S(x, 6);
  v.cylY(rx, zc, S(x, 6), yd, yd + S(x, 9), 'gun_d');
  v.cylY(rx, zc, S(x, 4), yd, yd + S(x, 10), x.g);
  v.cylY(rx, zc, S(x, 2), yd + S(x, 9), yd + S(x, 11), 'lamp');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; v.seg([rx + Math.cos(a) * S(x, 5), yd, zc + Math.sin(a) * S(x, 5)], [rx + Math.cos(a) * S(x, 5), yd + S(x, 10), zc + Math.sin(a) * S(x, 5)], 0.5 * q, 'steel_d'); }
  // малые турели по палубе
  for (const [fx, fz] of [[0.46, -0.4], [0.46, 0.4], [0.9, -0.25], [0.9, 0.25]] as [number, number][]) {
    const px = x0 + L * fx, pz = zc + W * fz;
    v.cylY(px, pz, S(x, 2.4), yd, yd + S(x, 2.5), mainD);
    v.cylX(yd + S(x, 1.5), pz, S(x, 0.6), px, px + S(x, 6), 'gun');
    v.set(px - S(x, 1), yd + S(x, 2.5), pz, x.g);
  }
  // ---------------- главная башня: многоярусная, купол-радар, звезда в круге, гигантский ствол
  const TNX = S(x, 104), TNZ = SC(x, 42), tcx = S(x, 26), tcz = TNZ / 2;
  const t = new Vox(TNX, S(x, 44), TNZ);
  const r1 = SC(x, 15), r2 = SC(x, 10.5);
  t.cylY(tcx, tcz, r1, 0, S(x, 7), main);
  t.cylY(tcx, tcz, r1 + 0.4, 0, q, 'gun');
  t.cylY(tcx, tcz, r1 + 0.5, S(x, 3), S(x, 3) + Math.max(1, q * 0.5), x.g);
  t.cylY(tcx - S(x, 2), tcz, r2, S(x, 7), S(x, 13), 'gun');
  t.cylY(tcx - S(x, 2), tcz, r2 + 0.5, S(x, 7), S(x, 7) + q, mainD);
  // графитовые бронеплиты по ярусам
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; t.box(tcx + Math.cos(a) * (r1 - q) - q, tcx + Math.cos(a) * (r1 - q) + q, q, S(x, 6), tcz + Math.sin(a) * (r1 - q) - q, tcz + Math.sin(a) * (r1 - q) + q, 'gun_d'); }
  // купол-радар
  t.ell(tcx - S(x, 5), S(x, 15), tcz + S(x, 3), S(x, 5), S(x, 4), S(x, 5), 'white');
  t.ell(tcx - S(x, 5), S(x, 15), tcz + S(x, 3), S(x, 5.2), S(x, 1), S(x, 5.2), x.g);
  // мачта-антенна
  t.seg([tcx - S(x, 7), S(x, 13), tcz - S(x, 5)], [tcx - S(x, 7), S(x, 38), tcz - S(x, 5)], 0.6 * q, 'gun_d');
  for (const y of [S(x, 22), S(x, 29)]) t.box(tcx - S(x, 9), tcx - S(x, 5), y, y + q, tcz - S(x, 5) - q / 2, tcz - S(x, 5) + q / 2, 'steel_l');
  t.set(tcx - S(x, 7), S(x, 38), tcz - S(x, 5), x.g);
  // звезда в круге на боку башни (белая)
  for (const s of [-1, 1]) {
    const sz = tcz + s * (r1 - 0.2), cyS = S(x, 3.6), cxS = tcx - S(x, 3), R = S(x, 2.8);
    for (let a = 0; a < 40; a++) { const ang = (a / 40) * Math.PI * 2; t.set(cxS + Math.cos(ang) * R, cyS + Math.sin(ang) * R, sz, 'white'); }
    for (let k = 0; k < 5; k++) { const ang = -Math.PI / 2 + (k / 5) * Math.PI * 2; t.seg([cxS, cyS, sz], [cxS + Math.cos(ang) * R * 0.85, cyS - Math.sin(ang) * R * 0.85, sz], 0.45 * q, 'white'); }
  }
  // главный калибр: гигантский цилиндр, дуло светится (у игроков — по классу, но толще)
  const gx0 = tcx + r1 - S(x, 2);
  if (boss) {
    t.cylX(S(x, 5), tcz, S(x, 4.2), gx0, gx0 + S(x, 54), 'gun');
    for (const r of [0.2, 0.42, 0.64]) t.cylX(S(x, 5), tcz, S(x, 4.8), gx0 + S(x, 54) * r, gx0 + S(x, 54) * r + S(x, 3), mainD);
    t.cylX(S(x, 5), tcz, S(x, 5.6), gx0 + S(x, 49), gx0 + S(x, 55), 'gun_d');
    t.cylX(S(x, 5), tcz, S(x, 3), gx0 + S(x, 54), gx0 + S(x, 55.4), x.g);
    t.cylX(S(x, 5), tcz, S(x, 1.4), gx0 + S(x, 55), gx0 + S(x, 55.8), 'lamp');
  } else {
    t.cylX(S(x, 5), tcz, S(x, 3.2), gx0 - S(x, 2), gx0 + S(x, 6), mainD);
    classGun(x, t, gx0 + S(x, 6), S(x, 5), tcz, () => undefined);
    // светящиеся кольца на стволе
    t.cylX(S(x, 5), tcz, S(x, 3.4), gx0 + S(x, 2), gx0 + S(x, 3), x.g);
  }
  // малые орудия по бокам башни
  for (const s of [-1, 1]) { t.box(tcx + S(x, 2), tcx + S(x, 8), S(x, 7), S(x, 10), tcz + s * S(x, 8) - S(x, 2), tcz + s * S(x, 8) + S(x, 2), mainD); t.cylX(S(x, 8.5), tcz + s * S(x, 8), S(x, 0.9), tcx + S(x, 8), tcx + S(x, 20), 'gun'); t.set(tcx + S(x, 20), S(x, 8.5), tcz + s * S(x, 8), x.g); }
  return finish(x, [
    { name: 'hull', vox: v, pivot: [NX / 2, 0, NZ / 2] },
    { name: 'turret', vox: t, pivot: [tcx, 0, tcz], at: [x0 + L * 0.42 - NX / 2, yd, 0] },
  ], L);
}

/** Анимация гусениц для форм с лентами (у босса кадры строятся по подробной модели). */
export function withTracks(def: ModelDef): ModelDef {
  return animTracks(def);
}
