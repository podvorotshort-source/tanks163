// Узнаваемые спрайты врагов ступеней 3–8 (заменяют обобщённые силуэты).

import type { RampId } from '../palette';
import { type Layer, type SpriteDef, rect, circ, ell, poly, cap, ring, sym, texTreads, texStripesX, texStripesY, texSpeckle } from '../raster';
import type { UnitArt } from './units';

const cache = new Map<string, SpriteDef>();
function def(id: string, layers: () => Layer[], o: Partial<SpriteDef> = {}): SpriteDef {
  let d = cache.get(id);
  if (!d) { d = { id, layers: layers(), ...o }; cache.set(id, d); }
  return d;
}

let SEQ = 0;
const A = (size: number, ramp: RampId, hull: (c: RampId) => Layer[], o: Partial<UnitArt> & { frames?: number; rotates?: boolean } = {}, turret?: (c: RampId) => Layer[], pivot?: [number, number]): UnitArt => {
  const id = 'u2:' + (++SEQ);
  return {
    size, ramp,
    hull: c => def(id + ':' + c, () => hull(c), { frames: o.frames ?? 1, rotates: o.rotates }),
    turret: turret ? c => def(id + ':t:' + c, () => turret(c)) : undefined,
    pivot, air: o.air, fixed: o.fixed, rotor: o.rotor,
  };
};

const wheels = (L: number, W: number, n: number, r: number): Layer[] =>
  Array.from({ length: n }, (_, i) => sym(rect(-L / 2 + (L / (n - 1 || 1)) * i, W / 2, r * 2, r * 1.2, 'ink', 2, { r: r * 0.5 }))).flat();

export const UNIT_ART2: Record<string, UnitArt> = {
  // ---- Комната ----
  dustBunny: A(14, 'concrete', c => [
    ...Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; return circ(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 2.6, c, 3 + (i % 2)); }),
    circ(0, 0, 5.2, c, 4, { tex: texSpeckle(0.3, -1, 1, 2) }),
    ...sym(circ(2.6, 1.6, 1.1, 'white', 5)), ...sym(circ(3, 1.6, 0.5, 'ink', 0, { bevel: 0 })),
  ]),
  vacBot: A(40, 'ink', c => [
    circ(0, 0, 19.5, c, 2, { hi: 2 }),
    ring(0, 0, 16, 19.5, 'iron', 3, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 6) & 1 ? -1 : 0) }),
    circ(0, 0, 15, c, 3),
    circ(-3, 0, 6, 'steel', 4, { hi: 2 }), circ(-3, 0, 2.5, 'teal', 5, { glow: true }),
    ...sym(circ(13, 12, 4.5, 'cream', 4, { tex: (x, y) => (Math.floor(Math.atan2(y - 12, x - 13) * 3) & 1 ? -1 : 0) })),
    rect(16, 0, 3, 16, 'red', 4, { glow: true, min: 0.5 }),
  ], { fixed: false }),
  tinTank: A(32, 'steel', c => [
    ...sym(rect(0, 11, 31, 8, 'iron', 2, { r: 3, tex: texTreads(3, 4) })),
    rect(0, 0, 29, 18, 'red', 3, { r: 2, hi: 2 }),
    rect(1, 0, 22, 12, c, 4, { r: 1, tex: texSpeckle(0.06, 1, 1, 9) }),
    ...[-9, -3, 3, 9].flatMap(x => sym(circ(x, 7.5, 0.7, 'gold', 5, { min: 1 }))),
    rect(-16, 0, 3, 3, 'gold', 4), ...sym(ell(-19, 2.6, 1.8, 2.6, 'gold', 4)), // ключ
  ], { frames: 4 }, c => [circ(0, 0, 7, c, 4, { hi: 2 }), rect(9, 0, 11, 2.6, 'iron', 3), rect(14.6, 0, 1.6, 3.6, 'gold', 4), poly([-2, -3, 0, -5, 2, -3], 'red', 4)], [-1, 0]),
  deskLamp: A(34, 'toyYellow', c => [
    circ(-8, 0, 9, c, 3, { hi: 2 }), circ(-8, 0, 4, c, 2),
    cap(-8, 0, 4, -4, 1.6, 'steel', 4), cap(4, -4, 12, 2, 1.6, 'steel', 4),
    circ(4, -4, 1.8, 'iron', 3),
  ], { fixed: false }, c => [poly([0, -6, 12, -9, 12, 9, 0, 6], c, 4, { hi: 2 }), circ(12, 0, 5, 'fire', 5, { glow: true })], [12, 2]),
  toyTrain: A(52, 'toyRed', c => [
    ...wheels(40, 22, 4, 4),
    rect(-6, 0, 36, 18, c, 3, { r: 2, hi: 2 }),
    rect(14, 0, 14, 20, 'iron', 2, { r: 1 }), // кабина
    rect(14, 0, 8, 14, 'glass', 4),
    circ(-14, 0, 4.5, 'iron', 3), circ(-14, 0, 2.6, 'ink', 0, { bevel: 0 }), // труба
    poly([-24, -9, -30, 0, -24, 9], 'gold', 4), // скотосбрасыватель
    ...[-8, 0, 8].map(x => rect(x - 6, 0, 1.4, 18, 'gold', 4, { bevel: 0 })),
  ]),
  bookMortar: A(40, 'wood', () => [
    rect(0, 0, 34, 26, 'blue', 3, { r: 1 }), rect(1, 1, 32, 22, 'red', 3, { r: 1 }), rect(2, 2, 30, 18, 'toyGreen', 3, { r: 1 }),
    rect(-14, 0, 3, 24, 'cream', 4, { bevel: 0 }),
  ], { fixed: false }, () => [rect(5, 0, 26, 3, 'wood', 4), circ(18, 0, 5, 'pink', 4, { hi: 2 }), circ(-6, 0, 2.4, 'iron', 3)], [0, 0]),
  robotDog: A(64, 'concrete', c => [
    ...[[-18, 1], [18, 1], [-18, -1], [18, -1]].map(([x, s]) => cap(x, s * 10, x + (x > 0 ? 6 : -6), s * 22, 3, 'iron', 2)),
    ell(0, 0, 26, 13, c, 3, { hi: 2, tex: texStripesX(9, -1) }),
    rect(28, 0, 16, 14, c, 4, { r: 4 }), ...sym(circ(33, 4, 1.8, 'teal', 5, { glow: true })),
    cap(-26, 0, -34, -6, 1.2, 'iron', 3), circ(-34, -6, 1.8, 'red', 5, { glow: true }),
  ], { frames: 4 }),
  // ---- Квартира ----
  cockroachBot: A(14, 'wood', c => [
    ...[-3, 0, 3].flatMap(x => sym(cap(x, 2.5, x - 1, 7, 0.6, 'ink', 2))),
    ell(0, 0, 6.5, 4, c, 3, { hi: 2 }), rect(-1, 0, 0.6, 7, c, 1, { bevel: 0, min: 1 }),
    circ(5.5, 0, 2.2, c, 2), ...sym(cap(6.5, 1, 10, 4.5, 0.4, 'ink', 2)),
    ...sym(circ(6.4, 1.2, 0.6, 'red', 5, { glow: true, min: 0.6 })),
  ]),
  toaster: A(30, 'steel', c => [
    rect(0, 0, 28, 20, c, 4, { r: 4, hi: 2 }),
    ...sym(rect(0, 4.5, 20, 4, 'ink', 1, { r: 1.5 })),
    ...sym(rect(0, 4.5, 16, 2, 'fire', 4, { glow: true })),
    rect(-14, 6, 3, 5, 'iron', 3), ...[-8, 0, 8].map(x => circ(x, -8, 1, 'red', 4, { min: 1 })),
  ]),
  mixerBot: A(34, 'cream', c => [
    circ(0, 0, 16, 'steel', 3, { hi: 2 }), circ(0, 0, 13, 'steel', 2),
    circ(0, 0, 9, c, 4), ...[0, 1, 2].map(i => ring(Math.cos(i * 2.1) * 4, Math.sin(i * 2.1) * 4, 2.5, 3.5, 'iron', 4)),
  ], { fixed: true }),
  kettle: A(38, 'red', c => [
    circ(-2, 0, 15, c, 3, { hi: 2 }), circ(-2, 0, 6, c, 4),
    poly([10, -3, 20, -6, 20, 6, 10, 3], c, 3), // носик
    cap(-12, -12, -12, 12, 2.2, 'iron', 3), // ручка
    circ(-2, 0, 2.5, 'iron', 4),
  ]),
  washer: A(54, 'cream', c => [
    rect(0, 0, 50, 46, c, 4, { r: 4, hi: 1 }),
    ring(4, 0, 12, 16, 'steel', 4), circ(4, 0, 12, 'glass', 3, { tex: (x, y) => (Math.sin(x * 0.5 + y * 0.3) > 0.7 ? 1 : 0) }),
    rect(-20, 0, 6, 36, c, 3), ...[-10, 0, 10].map(y => circ(-20, y, 1.6, 'toyBlue', 5, { glow: true, min: 0.5 })),
  ]),
  tv: A(48, 'ink', c => [
    rect(-8, 0, 16, 30, 'iron', 2, { r: 2 }),
    rect(4, 0, 22, 44, c, 2, { r: 2 }), rect(5, 0, 18, 40, 'glass', 4, { glow: true, tex: (x, y) => ((Math.floor(y / 2) & 1) ? -1 : 0) }),
    ...sym(cap(-14, 6, -24, 16, 0.7, 'iron', 4)),
  ]),
  vacGiant: A(70, 'purple', c => [
    rect(10, 0, 16, 60, 'iron', 2, { r: 4, tex: texStripesY(4, -1) }), // щётка
    cap(4, 0, -18, 0, 4, 'iron', 3), // шланг
    rect(-22, 0, 28, 40, c, 3, { r: 8, hi: 2 }), circ(-24, 0, 9, 'teal', 4, { glow: true }),
    ...sym(circ(-28, 18, 5, 'ink', 2)),
  ]),
  // ---- Улицы ----
  apc: A(30, 'olive', c => [
    ...wheels(22, 24, 4, 3),
    poly([-14, -9, 10, -9, 15, -4, 15, 4, 10, 9, -14, 9], c, 3, { hi: 1 }),
    rect(-10, 0, 6, 12, c, 2, { tex: texStripesY(2, -1), bevel: 0 }),
    ...sym(rect(12, 6, 3, 2, 'cream', 5, { glow: true, min: 1 })),
  ], {}, c => [circ(0, 0, 4.5, c, 4), rect(6, 0, 9, 1.4, 'iron', 3)], [2, 0]),
  spg: A(38, 'olive', c => [
    ...sym(rect(0, 12, 37, 8, 'iron', 2, { r: 3, tex: texTreads(3.5, 4) })),
    rect(0, 0, 34, 18, c, 3, { r: 1 }), rect(-6, 0, 18, 16, c, 4, { r: 1 }),
  ], { frames: 4 }, c => [rect(-4, 0, 16, 14, c, 4, { r: 2 }), rect(14, 0, 26, 3.4, 'iron', 3), rect(27, 0, 4, 5, 'iron', 4)], [-4, 0]),
  mlrs: A(60, 'olive', c => [
    ...wheels(46, 30, 4, 4.5),
    rect(20, 0, 16, 26, c, 3, { r: 2 }), rect(24, 0, 6, 20, 'glass', 3),
    rect(-6, 0, 36, 28, c, 2, { r: 1 }),
  ], {}, c => [rect(0, 0, 32, 24, c, 3, { r: 1 }), ...Array.from({ length: 12 }, (_, i) => circ(14, -9 + (i % 4) * 6, 2, 'ink', 1, { bevel: 0 })), ...Array.from({ length: 12 }, (_, i) => circ(6, -9 + (i % 4) * 6, 1, 'red', 4, { glow: true, min: 0.5 }))], [-8, 0]),
  // ---- Мегаполис ----
  carsSwarm: A(14, 'steel', c => [
    ...wheels(9, 8, 2, 1.6), rect(0, 0, 13, 7, c, 3, { r: 2, hi: 2 }), rect(1, 0, 4, 6, 'glass', 3),
    ...sym(circ(6.2, 2.4, 0.6, 'red', 5, { glow: true, min: 0.8 })),
  ]),
  armoredTrain: A(64, 'iron', c => [
    ...wheels(54, 22, 6, 3),
    rect(0, 0, 62, 20, c, 3, { r: 1, tex: texStripesX(8, 1) }),
    ...[-18, 0, 18].map(x => rect(x, 0, 10, 14, c, 4, { r: 2 })),
    poly([31, -10, 36, 0, 31, 10], 'red', 4),
  ], {}, c => [circ(0, 0, 5, c, 4), rect(8, 0, 12, 2.4, 'steel', 3)], [0, 0]),
  // ---- Танки-города ----
  cityBlock: A(16, 'concrete', c => [
    ...sym(rect(0, 6, 16, 3.5, 'iron', 2, { r: 1.5, tex: texTreads(2, 4) })),
    rect(0, 0, 14, 10, 'asphalt', 3),
    rect(-3, -1.5, 5, 5, c, 4, { hi: 2 }), rect(3, 1.5, 4, 4, 'glass', 4), rect(3.5, -2.5, 3, 3, 'rust', 4),
  ], { frames: 4 }),
  crawler: A(36, 'concrete', () => [
    ...sym(rect(0, 13, 36, 8, 'iron', 2, { r: 3, tex: texTreads(4, 4) })),
    rect(0, 0, 34, 22, 'asphalt', 3, { r: 1 }),
    ...[[-10, -5, 8, 8, 'glass'], [-2, 5, 7, 7, 'concrete'], [8, -4, 9, 9, 'steel'], [12, 6, 6, 5, 'rust']].map(([x, y, w, h, r]) => rect(x as number, y as number, w as number, h as number, r as RampId, 4, { hi: 2 })),
  ], { frames: 4 }, c => [rect(0, 0, 10, 10, c, 4, { r: 1 }), ...sym(rect(9, 2, 12, 2, 'iron', 3))], [-6, 0]),
  dropPod: A(28, 'steel', c => [
    ...[0, 1, 2].map(i => { const a = (i / 3) * Math.PI * 2; return poly([Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a + 0.3) * 14, Math.sin(a + 0.3) * 14, Math.cos(a - 0.3) * 14, Math.sin(a - 0.3) * 14], 'iron', 3); }),
    circ(0, 0, 10, c, 4, { hi: 2 }), circ(0, 0, 4, 'fire', 5, { glow: true }),
  ], { fixed: true }),
  stratoBomber: A(50, 'iron', c => [
    poly([24, 0, -6, -25, -14, -25, -8, -4, -24, -3, -24, 3, -8, 4, -14, 25, -6, 25], c, 3, { hi: 1 }),
    ell(6, 0, 16, 5, c, 4), ...sym(circ(-10, 12, 2.6, 'fire', 4, { glow: true })),
  ], { air: true }),
  mobileFort: A(64, 'concrete', c => [
    ...sym(rect(0, 26, 64, 12, 'iron', 2, { r: 4, tex: texTreads(6, 4) })),
    rect(0, 0, 58, 44, c, 2, { r: 2 }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => circ(x * 22, y * 15, 7, c, 4, { hi: 2 })),
    rect(0, 0, 22, 22, 'iron', 3), circ(0, 0, 4, 'red', 5, { glow: true }),
  ], { frames: 4 }),
  silo: A(40, 'concrete', c => [
    circ(0, 0, 19, c, 3, { hi: 1 }), ring(0, 0, 14, 17, 'gold', 3, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 4) & 1 ? -2 : 0) }),
    ...sym(rect(0, 6, 22, 11, 'iron', 4)), circ(0, 0, 3, 'red', 5, { glow: true }),
  ], { fixed: true }),
  // ---- Планета ----
  meteorite: A(16, 'rust', c => [
    ...[0, 1, 2].map(i => circ(-6 - i * 3, 0, 3 - i * 0.6, 'fire', 4 - i, { glow: true })),
    circ(1, 0, 7, c, 2, { hi: 2, tex: texSpeckle(0.25, -1, 1.5, 3) }), circ(3, -2, 2, c, 1),
  ], { air: true }),
  orbitalSat: A(32, 'steel', c => [
    ...sym(rect(0, 11, 8, 14, 'blue', 3, { tex: (x, y) => ((Math.floor(x / 2) + Math.floor(y / 2)) & 1 ? 1 : 0) })),
    rect(0, 0, 10, 10, c, 4, { r: 2, hi: 2 }), cap(5, 0, 14, 0, 0.8, 'iron', 4), circ(14, 0, 2.2, 'red', 5, { glow: true }),
  ], { air: true }),
  voidSpider: A(34, 'purple', c => [
    ...[-6, -1, 4, 9].flatMap((x, i) => sym(cap(x - 2, 4, x - 8 + i * 3, 16, 1, 'ink', 2))),
    ell(-2, 0, 10, 8, c, 3, { hi: 2 }), circ(9, 0, 5, c, 4),
    ...[-1, 1].flatMap(s => [circ(12, s * 2, 1.2, 'teal', 5, { glow: true }), circ(10.5, s * 3.5, 0.8, 'teal', 5, { glow: true })]),
  ], { frames: 4 }),
  lance: A(44, 'steel', c => [
    ring(0, 0, 14, 21, c, 3, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 4) & 1 ? 1 : -1) }),
    circ(0, 0, 8, 'blue', 4, { glow: true }), circ(0, 0, 3, 'white', 5, { glow: true }),
    ...[0, 1, 2, 3].map(i => { const a = i * Math.PI / 2; return rect(Math.cos(a) * 24, Math.sin(a) * 24, 4, 4, c, 4); }),
  ], { fixed: true }),
  moonlet: A(70, 'concrete', c => [
    circ(0, 0, 34, c, 3, { hi: 2 }),
    ...[[-12, -10, 8], [10, 12, 6], [14, -14, 5], [-16, 14, 4], [2, -2, 3]].map(([x, y, r]) => ring(x, y, r * 0.6, r, c, 2)),
    rect(30, 0, 8, 10, 'iron', 3), circ(36, 0, 3, 'purple', 5, { glow: true }),
  ]),
};
