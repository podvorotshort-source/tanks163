// Танки игроков: 3 класса × 8 поколений облика (игрушка → … → планетарный титан).
// Ось x — нос, y — вверх, z — борт. Части: hull (корпус) и turret (башня, вращается).

import { Vox, type ModelDef } from '../vox';

export type TankClass = 'scout' | 'assault' | 'heavy';

interface Scheme { main: string; dark: string; light: string; trim: string; metal: string; metalD: string }
/** P1 — жёлтый, P2 — зелёный (как в интерфейсе). */
const SCHEMES: Scheme[][] = [
  [ // P1
    { main: 'yel', dark: 'yel_d', light: 'yel_l', trim: 'navy', metal: 'gun', metalD: 'gun_d' },
  ],
  [ // P2
    { main: 'green_l', dark: 'green', light: 'grass_ll', trim: 'navy', metal: 'gun', metalD: 'gun_d' },
  ],
];

/** Гусеница-лента вдоль x: траки (тёмные), катки на внешнем борту. */
export function tracks(v: Vox, x0: number, x1: number, h: number, z0: number, z1: number, wheels: number, wheel: string, hub = 'gun_d'): void {
  const r = h / 2;
  for (let z = z0; z < z1; z++) for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) {
    // скруглённые торцы ленты
    const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x + 0.5;
    if ((x + 0.5 - cx) ** 2 + (y + 0.5 - r) ** 2 > r * r + 0.5) continue;
    v.set(x, y, z, ((x + y) % 3 === 0) ? 'rubber_l' : 'rubber');
  }
  // катки на обоих бортах ленты
  const n = wheels, span = x1 - x0 - h;
  for (let i = 0; i < n; i++) {
    const cx = x0 + r + (span * (i + 0.5)) / n;
    for (const zz of [z0 - 1, z1]) {
      v.cylZ(cx, r * 0.9, r * 0.62, zz, zz + 1, wheel);
      v.cylZ(cx, r * 0.9, r * 0.25, zz, zz + 1, hub);
    }
  }
}

export function tankModel(cls: TankClass, tier: number, pl: 0 | 1): ModelDef {
  const S = SCHEMES[pl][0];
  const k = cls === 'scout' ? 0.88 : cls === 'heavy' ? 1.14 : 1;
  const L = Math.round((30 + tier * 1.5) * k), W = Math.round((24 + tier) * k);
  const trackH = Math.round(7 + tier * 0.4), trackW = Math.round(5 + tier * 0.3);
  const hullH = Math.round(5 + tier * 0.5 + (cls === 'heavy' ? 1 : 0));
  const NX = L + 12, NY = 30 + tier * 3, NZ = W + 4;
  const hull = new Vox(NX, NY, NZ);
  const zc = NZ / 2;
  const x0 = 4, x1 = 4 + L;
  // гусеницы
  const wheelCol = tier <= 1 ? S.main : tier <= 3 ? S.dark : S.metal;
  tracks(hull, x0, x1, trackH, zc - W / 2, zc - W / 2 + trackW, 4 + Math.floor(tier / 3), wheelCol);
  tracks(hull, x0, x1, trackH, zc + W / 2 - trackW, zc + W / 2, 4 + Math.floor(tier / 3), wheelCol);
  // корпус: нижний ящик между гусеницами
  hull.box(x0 + 1, x1 - 1, 2, trackH, zc - W / 2 + trackW, zc + W / 2 - trackW, S.metalD);
  // верхний корпус с наклонным лбом и надгусеничными полками
  const yT = trackH + hullH;
  hull.box(x0, x1, trackH - 1, yT, zc - W / 2 - 1, zc + W / 2 + 1, S.main);
  hull.cut(1, 1.25, 0, x1 - 3 + 1.25 * yT, x1 - 10, x1 + 1, trackH - 1, yT + 1);      // лобовой скос
  hull.cut(-1, 1.6, 0, -x0 - 1 + 1.6 * yT, x0 - 1, x0 + 6, trackH - 1, yT + 1);      // кормовой скос
  // кромки: светлая верхняя, тёмная нижняя
  hull.paint((x, y) => (y > yT - 1 ? S.light : undefined), x0, x1, yT - 1, yT, 0, NZ);
  hull.paint(() => S.dark, x0, x1, trackH - 1, trackH, 0, NZ);
  // детали по поколениям
  if (tier === 0) {                                   // игрушка: крупные заклёпки-кнопки
    for (const xx of [x0 + 4, x1 - 6]) for (const zz of [zc - W / 2 + 1, zc + W / 2 - 2]) hull.box(xx, xx + 2, yT, yT + 1, zz, zz + 1, S.light);
  }
  if (tier >= 1) {                                    // фары, ящики на крыльях
    for (const zz of [zc - W / 2 + 1, zc + W / 2 - 3]) { hull.box(x1 - 4, x1 - 2, yT - 2, yT, zz, zz + 2, 'lamp'); hull.box(x0 + 3, x0 + 8, yT, yT + 2, zz, zz + 2, S.metal); }
  }
  if (tier >= 2) {                                    // решётка двигателя на корме
    for (let i = 0; i < 4; i++) hull.box(x0 + 2 + i * 2, x0 + 3 + i * 2, yT, yT + 1, zc - 4, zc + 4, S.metalD);
  }
  if (tier >= 3) {                                    // боковые экраны
    for (const zz of [zc - W / 2 - 2, zc + W / 2 + 1]) hull.box(x0 + 3, x1 - 4, trackH - 2, trackH + 2, zz, zz + 1, S.dark);
  }
  if (tier >= 4) {                                    // блоки динамической защиты
    for (let i = 0; i < 5; i++) for (const zz of [zc - W / 2 - 3, zc + W / 2 + 2]) hull.box(x0 + 4 + i * ((L - 10) / 5), x0 + 6 + i * ((L - 10) / 5), trackH - 1, trackH + 2, zz, zz + 1, S.metal);
  }
  if (tier >= 5) {                                    // жёлто-чёрные полосы и выхлопы
    for (let i = 0; i < 6; i++) hull.box(x1 - 8 + i, x1 - 7 + i, yT - 1, yT, 0, NZ, i % 2 ? S.metalD : S.light);
    for (const zz of [zc - 6, zc + 4]) hull.box(x0 - 2, x0, yT - 3, yT - 1, zz, zz + 2, 'lamp_o');
  }
  if (tier >= 6) {                                    // кормовые надстройки-цистерны
    hull.cylX(yT + 2, zc - W / 2 + 3, 2.5, x0 + 2, x0 + 12, S.metal);
    hull.cylX(yT + 2, zc + W / 2 - 3, 2.5, x0 + 2, x0 + 12, S.metal);
  }
  if (tier >= 7) {                                    // светящиеся швы реактора (оранжевые)
    for (const zz of [zc - W / 2 - 1, zc + W / 2]) hull.box(x0 + 6, x1 - 8, yT - 3, yT - 2, zz, zz + 1, 'lamp_o');
  }

  // ---------------- башня
  const TR = Math.round((W * 0.34) * (cls === 'heavy' ? 1.1 : cls === 'scout' ? 0.92 : 1));
  const TH = Math.round(4 + tier * 0.5);
  const BL = Math.round((cls === 'scout' ? 12 : cls === 'heavy' ? 14 : 13) + tier * 1.4);
  const TNX = TR * 2 + BL + 6, TNY = TH + 10 + (tier >= 1 ? 8 : 0), TNZ = TR * 2 + 6;
  const tur = new Vox(TNX, TNY, TNZ);
  const tcx = TR + 2, tcz = TNZ / 2;
  if (tier <= 2 || cls === 'scout') {
    tur.cylY(tcx, tcz, TR, 0, TH, S.main, TR - 1.5);                 // круглая башня
  } else {                                                          // гранёная (современная)
    tur.box(tcx - TR, tcx + TR + 2, 0, TH, tcz - TR + 1, tcz + TR - 1, S.main);
    tur.cut(1, 1.6, 0, tcx + TR + 2 + 1.6 * 1, tcx + TR - 3, tcx + TR + 3, 0, TH);
    tur.cut(0, 1.4, 1, tcz + TR - 1 + 1.4 * 2, 0, TNX, 0, TH, tcz, TNZ);
    tur.cut(0, 1.4, -1, -(tcz - TR + 1) + 1.4 * 2, 0, TNX, 0, TH, 0, tcz);
  }
  tur.paint((x, y) => (y > TH - 1 ? S.light : undefined), 0, TNX, TH - 1, TH, 0, TNZ);
  tur.paint(() => S.dark, 0, TNX, 0, 1, 0, TNZ);
  // люк
  tur.cylY(tcx - 2, tcz - 2, 2.2, TH, TH + 1, S.metal);
  tur.box(tcx - 3, tcx - 1, TH + 1, TH + 2, tcz - 2.5, tcz - 1.5, S.metalD);
  // ствол(ы)
  const bR = cls === 'heavy' ? 1.6 + tier * 0.12 : cls === 'scout' ? 1.0 + tier * 0.08 : 1.3 + tier * 0.1;
  const by = TH * 0.55, bx0 = tcx + TR - 1, bx1 = bx0 + BL;
  const barrels = tier >= 5 && cls === 'heavy' ? [tcz - 2.2, tcz + 2.2] : tier >= 6 ? [tcz - 1.8, tcz + 1.8] : [tcz];
  for (const bz of barrels) {
    tur.cylX(by, bz, bR, bx0, bx1, S.metal);
    tur.cylX(by, bz, bR * 0.5, bx1 - 1, bx1, 'black');
    if (tier >= 2) tur.cylX(by, bz, bR + 0.8, bx1 - 3, bx1, S.metalD);              // дульный тормоз
    if (tier === 0 || tier === 3) tur.cylX(by, bz, bR + 0.5, bx0 + BL * 0.55, bx0 + BL * 0.55 + 2, S.main); // кольцо
  }
  tur.box(tcx + TR - 3, tcx + TR + 1, 0, TH, tcz - 3, tcz + 3, S.dark);              // маска
  // антенна (с II поколения), пулемёт (с IV), прицел (с V)
  if (tier >= 1) { tur.seg([tcx - TR + 2, TH, tcz + TR - 2], [tcx - TR + 2, TH + 7 + tier * 0.4, tcz + TR - 2], 0.5, S.metalD); tur.set(tcx - TR + 2, TH + 7 + tier * 0.4, tcz + TR - 2, 'lamp_r'); }
  if (tier >= 3) { tur.box(tcx, tcx + 2, TH, TH + 2, tcz + 2, tcz + 4, S.metal); tur.cylX(TH + 1, tcz + 3, 0.6, tcx + 2, tcx + 7, S.metalD); }
  if (tier >= 4) tur.box(tcx - 2, tcx + 1, TH, TH + 3, tcz - TR + 2, tcz - TR + 4, S.metalD);
  if (cls === 'assault' && tier >= 2) for (const zz of [tcz - TR - 1, tcz + TR]) tur.box(tcx - 2, tcx + 3, 1, TH - 1, zz, zz + 1, S.metal); // дымовые мортирки
  if (tier === 0) tur.set(tcx + 1, TH, tcz + 2, 'lamp_r');
  // звезда/полоса
  tur.box(tcx - TR + 1, tcx - TR + 3, 1, TH - 1, 0, TNZ, undefined as unknown as string);

  const yTop = yT;
  return {
    size: Math.round(L * 0.92),
    parts: [
      { name: 'hull', vox: hull, pivot: [NX / 2, 0, NZ / 2] },
      { name: 'turret', vox: tur, pivot: [tcx, 0, tcz], at: [x0 + L * 0.43 - NX / 2, yTop, 0] },
    ],
  };
}

/** Подбитый танк игрока — обгоревший корпус. */
export function wreckModel(cls: TankClass, tier: number): ModelDef {
  const m = tankModel(cls, tier, 0);
  for (const p of m.parts) p.vox.paint((x, y, z, c) => (c ? ((x * 7 + y * 3 + z) % 5 === 0 ? 'fire' : (x + z) % 3 ? 'ash' : 'rubber') : undefined));
  return m;
}
