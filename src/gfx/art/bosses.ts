// Спрайты боссов. Модель смотрит вправо; размер модели = 100 ед. (масштаб
// подгоняется под размер босса в игре).

import type { RampId } from '../palette';
import { type Layer, type SpriteDef, rect, circ, ell, poly, cap, ring, sym, texTreads, texStripesX, texStripesY, texSpeckle } from '../raster';
import { star5 } from './props';
import type { UnitArt } from './units';

const cache = new Map<string, SpriteDef>();
function def(id: string, layers: () => Layer[], o: Partial<SpriteDef> = {}): SpriteDef {
  let d = cache.get(id);
  if (!d) { d = { id, layers: layers(), castDist: 2.5, ...o }; cache.set(id, d); }
  return d;
}

// 1. Заводной генерал — огромный игрушечный танк с ключом на корме.
const general: UnitArt = {
  size: 100, ramp: 'steel',
  hull: c => def('bGeneral:' + c, () => [
    ...sym(rect(0, 33, 96, 22, 'ink', 3, { r: 9, tex: texTreads(8, 4) })),
    ...sym(rect(0, 33, 84, 6, 'ink', 4, { bevel: 0 })),
    rect(0, 0, 90, 56, c, 2, { r: 10 }),
    rect(-3, 0, 78, 48, c, 3, { r: 9, hi: 2 }),
    rect(32, 0, 10, 44, c, 4, { r: 3, hi: 2 }),
    ...[-28, -14, 0, 14].flatMap(x => sym(circ(x, 20, 2.2, c, 5))), // заклёпки-кнопки
    // Ключ завода на корме.
    rect(-46, 0, 10, 6, 'iron', 3),
    ...sym(ell(-55, 9, 6, 9, 'gold', 4, { hi: 2 })),
    circ(-53, 0, 4, 'gold', 3),
    ...sym(ring(-55, 9, 1.5, 3.5, 'gold', 2)),
    ...sym(circ(43, 22, 2.4, 'toyYellow', 5, { glow: true })),
  ], { frames: 4 }),
  turret: c => def('bGeneralT:' + c, () => [
    circ(0, 0, 22, c, 4, { hi: 2 }),
    rect(30, -6, 40, 7, 'iron', 3), rect(30, 6, 40, 7, 'iron', 3),
    rect(51, -6, 4, 10, 'iron', 4), rect(51, 6, 4, 10, 'iron', 4),
    poly(star5(-4, 0, 11, 4.5), 'red', 4, { hi: 1 }),
    circ(10, -12, 5, c, 5),
    ...[0, 1, 2].map(i => cap(-14, 10 + i * 4, -26, 14 + i * 4, 1, 'gold', 4)), // эполеты
  ]),
  pivot: [4, 0],
};

// 2. Пульт-тиран — боевой робот на радиоуправлении.
const tyrant: UnitArt = {
  size: 100, ramp: 'concrete',
  hull: c => def('bTyrant:' + c, () => [
    ...sym(rect(-4, 30, 50, 14, 'iron', 2, { r: 5, tex: texTreads(6, 4) })),
    rect(0, 0, 54, 50, c, 3, { r: 6, hi: 2, tex: texSpeckle(0.03, -1, 2, 4) }),
    rect(-6, 0, 30, 34, 'toyBlue', 3, { r: 4 }),
    ...sym(rect(16, 36, 34, 14, c, 4, { r: 4 })), // руки
    ...sym(rect(36, 36, 16, 10, 'toyRed', 3, { r: 2 })), // пусковые дротиков
    ...sym(circ(43, 36, 2.6, 'ink', 0, { bevel: 0 })),
    // Антенна (слабое место) на спине.
    cap(-22, 0, -48, -14, 1.6, 'iron', 3),
    circ(-48, -14, 4.5, 'toyRed', 4, { glow: true }),
    ring(-48, -14, 4.5, 6.5, 'iron', 3),
  ], { frames: 4 }),
  turret: c => def('bTyrantT:' + c, () => [
    rect(0, 0, 26, 30, c, 4, { r: 5, hi: 2 }),
    rect(9, 0, 6, 22, 'ink', 1, { r: 2 }),
    rect(10, 0, 3, 18, 'toyRed', 5, { glow: true }),
    ...sym(cap(-6, 15, -12, 22, 1.2, 'iron', 3)),
  ]),
  pivot: [4, 0],
};

// 3. Пылесос-левиафан — гигантский робот-пылесос.
const vacuum: UnitArt = {
  size: 100, ramp: 'ink',
  hull: c => def('bVacuum:' + c, () => [
    circ(0, 0, 49, c, 2, { hi: 2 }),
    ring(0, 0, 41, 49, c, 3, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 8) & 1 ? -1 : 0) }), // бампер
    circ(0, 0, 38, 'purple', 3, { hi: 1, tex: texSpeckle(0.03, 1, 2, 8) }),
    circ(-4, 0, 16, 'iron', 4, { hi: 2 }), // купол сенсоров
    circ(-4, 0, 7, 'teal', 5, { glow: true }),
    rect(40, 0, 10, 50, 'ink', 0, { r: 3 }), // пасть-всасыватель
    rect(42, 0, 4, 44, 'red', 3, { glow: true }),
    ...sym(circ(30, 36, 10, 'iron', 3)), // щётки
    rect(-44, 0, 8, 26, 'iron', 2, { tex: texStripesY(3, -1) }), // выхлоп (слабое место)
    rect(-48, 0, 3, 22, 'fire', 4, { glow: true }),
  ], { rotates: true }),
  rotor: c => def('bVacuumBrush:' + c, () => [...[0, 1, 2, 3, 4, 5].map(i => cap(0, 0, Math.cos(i * 1.05) * 14, Math.sin(i * 1.05) * 14, 1, 'cream', 4))], { outline: null }),
};

// 4. Холодильник-крепость — ходячий холодильник.
const fridge: UnitArt = {
  size: 100, ramp: 'cream',
  hull: c => def('bFridge:' + c, () => [
    ...[[-30, 36], [-30, -36], [26, 36], [26, -36]].map(([x, y]) => cap(x, y * 0.6, x + (x > 0 ? 8 : -8), y, 5, 'iron', 2)), // ноги
    rect(0, 0, 84, 62, c, 3, { r: 6, hi: 1 }),
    rect(10, 0, 62, 56, c, 4, { r: 4 }), // дверца
    rect(36, -14, 4, 22, 'iron', 4), // ручка
    rect(-30, 0, 16, 56, 'ice', 3, { r: 3, tex: texStripesX(4, 1) }), // морозилка
    ...[0, 1, 2].map(i => rect(-6 + i * 14, 20, 10, 8, ['toyRed', 'toyBlue', 'toyYellow'][i] as RampId, 4, { r: 2 })), // магнитики
    ...sym(circ(-40, 24, 2.4, 'sky', 5, { glow: true })),
  ], { frames: 2 }),
  turret: c => def('bFridgeT:' + c, () => [
    rect(0, 0, 18, 30, 'ice', 3, { r: 4 }),
    rect(14, 0, 18, 8, 'iron', 3),
    circ(23, 0, 4, 'sky', 5, { glow: true }),
  ]),
  pivot: [-6, 0],
};

// 5. Асфальтовый каток.
const roller: UnitArt = {
  size: 100, ramp: 'gold',
  hull: c => def('bRoller:' + c, () => [
    rect(36, 0, 26, 92, 'iron', 3, { r: 12, tex: texStripesX(4, -1) }), // передний вал
    rect(36, 0, 20, 86, 'iron', 4, { r: 9, bevel: 0, tex: (x) => (Math.floor(x * 0.4) & 1 ? -1 : 0) }),
    ...sym(rect(-34, 36, 26, 16, 'ink', 2, { r: 6, tex: texTreads(5, 4) })), // задние колёса
    rect(-10, 0, 62, 58, c, 3, { r: 5, hi: 2 }),
    rect(-14, 0, 34, 40, 'glass', 3, { r: 3 }), // кабина
    rect(-14, 0, 30, 3, 'glass', 5, { bevel: 0 }),
    ...[-24, -10, 4].map(x => rect(x, 26, 4, 6, 'ink', 2)),
    rect(-44, 0, 10, 28, 'iron', 2, { tex: texStripesY(3, -1) }), // мотор (слабое место)
    rect(-48, 0, 3, 22, 'fire', 4, { glow: true }),
    ...sym(rect(14, 30, 26, 6, 'ink', 2, { tex: texStripesX(6, 2) })), // чёрно-жёлтые полосы
  ], { frames: 4 }),
  turret: c => def('bRollerT:' + c, () => [
    ...sym(circ(0, 14, 9, c, 4, { hi: 2 })),
    ...sym(rect(16, 14, 26, 4.5, 'iron', 3)),
  ]),
  pivot: [-10, 0],
};

// 6. Летающая крепость.
const sky: UnitArt = {
  size: 100, ramp: 'iron', air: true,
  hull: c => def('bSky:' + c, () => [
    poly([50, 0, 20, -14, -10, -48, -30, -48, -24, -14, -48, -10, -50, 0, -48, 10, -24, 14, -30, 48, -10, 48, 20, 14], c, 3, { hi: 1, tex: texSpeckle(0.03, 1, 3, 2) }),
    ell(6, 0, 40, 13, c, 4, { hi: 2 }),
    ell(30, 0, 10, 8, 'glass', 4),
    ...sym(rect(-12, 30, 18, 10, 'steel', 3, { r: 3 })), // моторы
    ...sym(rect(-12, 14, 18, 8, 'steel', 3, { r: 3 })),
    ...sym(rect(-22, 30, 4, 8, 'fire', 4, { glow: true })),
    ...sym(rect(-22, 14, 4, 6, 'fire', 4, { glow: true })),
    ...[-30, -10, 10].map(x => circ(x, 0, 4, 'red', 4, { glow: true, min: 0.3 })),
  ]),
  rotor: c => def('bSkyRotor:' + c, () => [rect(0, 0, 110, 2, 'steel', 4, { bevel: 0 }), rect(0, 0, 2, 110, 'steel', 4, { bevel: 0 })], { outline: null }),
};

// 7. Титан-мегаполис — город на гусеницах.
const titan: UnitArt = {
  size: 100, ramp: 'concrete',
  hull: c => def('bTitan:' + c, () => [
    ...sym(rect(0, 40, 98, 18, 'iron', 2, { r: 5, tex: texTreads(7, 4) })),
    rect(0, 0, 94, 72, c, 2, { r: 3 }),
    rect(0, 0, 88, 66, 'asphalt', 3, { tex: (x, y) => ((Math.floor(x / 11) + Math.floor(y / 11)) & 1 ? 0 : -1) }),
    ...[[-30, -20, 14, 18], [-10, -24, 10, 12], [8, -20, 16, 20], [28, -22, 12, 14], [-28, 18, 16, 14], [-6, 20, 12, 18], [16, 22, 14, 12], [32, 18, 10, 16]].map(([x, y, w, h], i) =>
      rect(x, y, w, h, (['glass', 'concrete', 'steel', 'rust'] as RampId[])[i % 4], 4, { hi: 2 })),
    ...[[-30, -20], [8, -20], [-6, 20], [32, 18]].map(([x, y]) => circ(x, y, 1.6, 'toyRed', 5, { glow: true, min: 0.2 })),
    // Реактор на корме — слабое место.
    ring(-44, 0, 7, 11, 'steel', 3),
    circ(-44, 0, 7, 'teal', 5, { glow: true }),
  ], { frames: 4 }),
  turret: c => def('bTitanT:' + c, () => [
    rect(0, 0, 26, 26, c, 4, { r: 3 }),
    ...[-6, 0, 6].map(y => rect(20, y, 26, 3.6, 'iron', 3)),
    circ(-4, 0, 5, 'red', 5, { glow: true }),
  ]),
  pivot: [10, 0],
};

// 8. Пожиратель планет.
const eater: UnitArt = {
  size: 100, ramp: 'purple',
  hull: c => def('bEater:' + c, () => [
    ...Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + 0.31;
      return poly([Math.cos(a - 0.2) * 42, Math.sin(a - 0.2) * 42, Math.cos(a) * 54, Math.sin(a) * 54, Math.cos(a + 0.2) * 42, Math.sin(a + 0.2) * 42], c, 2, { hi: 2 });
    }),
    circ(0, 0, 44, c, 2, { tex: texSpeckle(0.05, 1, 3, 5) }),
    ring(0, 0, 30, 40, c, 3, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 4) & 1 ? -1 : 1) }),
    circ(0, 0, 30, 'ink', 1),
    ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return poly([Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a + 0.15) * 20, Math.sin(a + 0.15) * 20, Math.cos(a - 0.15) * 20, Math.sin(a - 0.15) * 20], 'cream', 4); }),
    // Пасть с ядром — спереди.
    ell(30, 0, 12, 20, 'ink', 0),
    circ(30, 0, 9, 'teal', 5, { glow: true }),
    circ(30, 0, 4, 'white', 5, { glow: true }),
  ]),
  rotor: c => def('bEaterRing:' + c, () => [ring(0, 0, 56, 60, 'teal', 3, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 6) & 1 ? 2 : -1), glow: true })], { outline: null }),
};

export const BOSS_ART: Record<string, UnitArt> = {
  bossGeneral: general, bossTyrant: tyrant, bossVacuum: vacuum, bossFridge: fridge,
  bossRoller: roller, bossSky: sky, bossTitan: titan, bossEater: eater,
};
