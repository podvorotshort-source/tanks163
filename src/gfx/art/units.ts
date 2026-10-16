// Спрайты врагов. Каждый рисуется в единицах своего базового размера
// (как в EnemyDef.size), смотрит вправо (+X). Цветовая рампа задаётся
// параметром — так делаются мигающие «бонусные» и элитные варианты.

import type { RampId } from '../palette';
import { BOSS_ART } from './bosses';
import {
  type Layer, type SpriteDef, rect, circ, ell, poly, cap, ring, sym, transformLayers,
  texTreads, texStripesY, texStripesX, texSpeckle,
} from '../raster';

export interface UnitArt {
  /** Корпус. */
  hull: (c: RampId) => SpriteDef;
  /** Башня (необязательно) и её ось. */
  turret?: (c: RampId) => SpriteDef;
  pivot?: [number, number];
  /** Базовый размер модели (единицы, в которых нарисован). */
  size: number;
  /** Основная рампа. */
  ramp: RampId;
  /** Летает (тень смещена, рисуется выше). */
  air?: boolean;
  /** Вращающиеся винты/детали — отдельный слой, крутится сам. */
  rotor?: (c: RampId) => SpriteDef;
  /** Не поворачивается по направлению (круглые/статичные). */
  fixed?: boolean;
}

const cache = new Map<string, SpriteDef>();
function def(id: string, layers: () => Layer[], o: Partial<SpriteDef> = {}): SpriteDef {
  let d = cache.get(id);
  if (!d) { d = { id, layers: layers(), ...o }; cache.set(id, d); }
  return d;
}

// Универсальные конструкторы ------------------------------------------------

/** Танк общего вида: L — длина, W — ширина, стиль — игрушка/металл. */
function tankHull(id: string, c: RampId, L: number, W: number, o: { toy?: boolean; skirts?: boolean; rivets?: boolean; accent?: RampId; tracks?: RampId } = {}): SpriteDef {
  return def(`${id}:${c}`, () => {
    const tw = W * 0.26, ty = W / 2 - tw / 2;
    const tr = o.tracks ?? 'iron';
    const l: Layer[] = [
      ...sym(rect(0, ty, L, tw, tr, 2, { r: tw / 2, tex: texTreads(L / 9, 4) })),
      rect(0, 0, L * 0.92, W * 0.56, c, 2, { r: o.toy ? W * 0.12 : 1 }),
      poly([-L * 0.44, -W * 0.27, L * 0.3, -W * 0.27, L * 0.46, -W * 0.12, L * 0.46, W * 0.12, L * 0.3, W * 0.27, -L * 0.44, W * 0.27], c, 3, o.toy ? { hi: 2 } : { tex: o.rivets ? texSpeckle(0.06, 1, 1, 3) : undefined }),
      rect(-L * 0.32, 0, L * 0.18, W * 0.4, c, 2, { tex: texStripesY(Math.max(1.2, W * 0.08), -1), bevel: 0 }),
    ];
    if (o.skirts) l.push(...sym(rect(0, ty - tw * 0.35, L * 0.86, tw * 0.55, c, 2, { tex: texStripesX(L / 6, 1) })));
    if (o.accent) l.push(...sym(rect(L * 0.38, W * 0.2, L * 0.08, W * 0.08, o.accent, 4, { glow: true, min: 0.8 })));
    if (o.toy) l.push(rect(0, 0, L * 0.8, 0.5, c, 1, { bevel: 0, min: 1.4 })); // шов литья
    return l;
  }, { frames: 4 });
}

function tankTurret(id: string, c: RampId, L: number, o: { barrels?: number; long?: number; wide?: number; toy?: boolean } = {}): SpriteDef {
  return def(`${id}:t:${c}`, () => {
    const tw = L * (o.wide ?? 0.42);
    const bl = L * (o.long ?? 0.55);
    const l: Layer[] = [
      rect(0, 0, tw * 1.1, tw, c, 4, { r: o.toy ? tw * 0.35 : tw * 0.2, hi: o.toy ? 2 : 1 }),
    ];
    const n = o.barrels ?? 1;
    for (let i = 0; i < n; i++) {
      const y = n > 1 ? (i - (n - 1) / 2) * L * 0.1 : 0;
      l.push(rect(tw * 0.45 + bl / 2, y, bl, Math.max(1.2, L * 0.1), 'iron', 3));
      l.push(rect(tw * 0.45 + bl, y, Math.max(1, L * 0.06), Math.max(1.6, L * 0.14), 'iron', 4, { min: 0.5 }));
    }
    l.push(circ(-tw * 0.15, -tw * 0.18, tw * 0.2, c, 5, { min: 0.6 }));
    return l;
  });
}

// ---------------------------------------------------------------------------
// Ступень 1: игрушки
// ---------------------------------------------------------------------------

const soldier: UnitArt = {
  size: 9, ramp: 'khaki',
  hull: c => def(`soldier:${c}`, () => [
    circ(0, 0, 3.6, c, 1, { bevel: 0 }), // подставка
    ell(0.3, 0, 1.8, 2.8, c, 3, { hi: 2 }), // плечи
    circ(0.4, 0, 1.4, c, 4, { hi: 2 }), // каска
    cap(1, 1.6, 4.4, 1.2, 0.5, c, 2), // винтовка
  ]),
};

const toyTank: UnitArt = {
  size: 24, ramp: 'steel',
  hull: c => tankHull('toyTank', c, 24, 22, { toy: true }),
  turret: c => tankTurret('toyTank', c, 24, { toy: true }),
  pivot: [-1, 0],
};

const armorToy: UnitArt = {
  size: 34, ramp: 'iron',
  hull: c => tankHull('armorToy', c, 34, 30, { toy: true, skirts: true, accent: 'red' }),
  turret: c => tankTurret('armorToy', c, 34, { toy: true, barrels: 2, wide: 0.46 }),
  pivot: [-2, 0],
};

const bigToy: UnitArt = {
  size: 62, ramp: 'toyRed',
  hull: c => def(`bigToy:${c}`, () => [
    ...transformLayers(tankHull('bigToyBase', c, 62, 52, { toy: true, skirts: true }).layers, 0, 0, 1),
    rect(-20, 0, 10, 22, 'toyYellow', 4, { r: 2, hi: 2 }), // батарейный отсек
    rect(-20, 0, 2, 22, 'ink', 1, { bevel: 0 }),
  ], { frames: 4 }),
  turret: c => tankTurret('bigToy', c, 62, { toy: true, barrels: 2, wide: 0.4, long: 0.5 }),
  pivot: [-3, 0],
};

const jeep: UnitArt = {
  size: 20, ramp: 'sand',
  hull: c => def(`jeep:${c}`, () => [
    ...sym(rect(-6, 6.5, 4.4, 2.6, 'ink', 2, { r: 1 })), ...sym(rect(6, 6.5, 4.4, 2.6, 'ink', 2, { r: 1 })),
    rect(0, 0, 19, 11.5, c, 3, { r: 2.5, hi: 2 }),
    rect(4.2, 0, 4, 10, 'glass', 4, { r: 1 }),
    rect(-4, 0, 7, 9, c, 2, { r: 1 }),
    cap(-3, 0, 4, 0, 0.8, 'iron', 3), // пулемёт
  ]),
};

const heli: UnitArt = {
  size: 26, ramp: 'toyBlue', air: true,
  hull: c => def(`heli:${c}`, () => [
    cap(-12, 0, -3, 0, 1.6, c, 3, { hi: 2 }), // хвост
    rect(-12.4, 0, 2, 7, c, 3, { r: 0.6 }),
    ell(1, 0, 7.5, 5, c, 3, { hi: 2 }),
    ell(4.5, 0, 3.6, 3.4, 'glass', 4),
    ...sym(rect(0, 5.4, 9, 1.2, 'iron', 2)),
  ]),
  rotor: c => def(`heliRotor:${c}`, () => [
    rect(0, 0, 26, 1.6, 'iron', 3, { r: 0.8, bevel: 0 }), rect(0, 0, 1.6, 26, 'iron', 3, { r: 0.8, bevel: 0 }), circ(0, 0, 1.6, 'iron', 4),
  ], { outline: null }),
};

const mortar: UnitArt = {
  size: 26, ramp: 'olive',
  hull: c => def(`mortar:${c}`, () => [
    ...sym(rect(0, 9, 24, 5, 'iron', 2, { r: 2.2, tex: texTreads(3, 4) })),
    rect(0, 0, 22, 14, c, 3, { r: 2, hi: 2 }),
    ...sym(rect(-7, 3.4, 5, 4, 'sand', 3, { r: 0.8 })),
  ], { frames: 4 }),
  turret: c => def(`mortar:t:${c}`, () => [
    circ(0, 0, 5.4, c, 4, { hi: 2 }),
    rect(4, 0, 8, 4.2, 'iron', 3, { r: 1.5 }),
    circ(8, 0, 1.6, 'ink', 0, { bevel: 0 }),
  ]),
  pivot: [1, 0],
};

const toyBunker: UnitArt = {
  size: 70, ramp: 'sand', fixed: true,
  hull: c => def(`toyBunker:${c}`, () => [
    rect(0, 0, 66, 56, 'wood', 3, { r: 2, tex: texSpeckle(0.04, -1, 2, 5) }),
    rect(0, 0, 60, 4, 'wood', 2, { bevel: 0 }),
    rect(0, 0, 4, 50, 'wood', 2, { bevel: 0 }),
    rect(0, -14, 40, 10, c, 4, { r: 1 }),
    rect(0, 14, 14, 14, 'ink', 1, { r: 2 }), // ворота
    ...sym(rect(22, 18, 8, 8, 'toyRed', 4, { r: 4, glow: true, min: 0.4 })),
  ], { rotates: false }),
  turret: c => tankTurret('toyBunkerT', c, 40, { toy: true }),
  pivot: [0, -14],
};

// ---------------------------------------------------------------------------
// Ступень 2: детская
// ---------------------------------------------------------------------------

const windMouse: UnitArt = {
  size: 14, ramp: 'concrete',
  hull: c => def(`windMouse:${c}`, () => [
    cap(-6, 0, -12, 1, 0.5, 'pink', 3),
    ell(0, 0, 6.5, 4, c, 3, { hi: 2 }),
    ...sym(circ(4, 2.6, 1.6, 'pink', 4)),
    circ(6.4, 0, 0.8, 'ink', 1, { bevel: 0 }),
    ring(-3, 0, 0.8, 1.8, 'gold', 4, { min: 0.6 }), // заводной ключ
  ]),
};

const top: UnitArt = {
  size: 22, ramp: 'purple', fixed: true,
  hull: c => def(`top:${c}`, () => [
    circ(0, 0, 10.5, c, 3, { hi: 2 }),
    ring(0, 0, 5, 8.5, c, 4, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 2.5) & 1 ? -2 : 0) }),
    circ(0, 0, 3, 'gold', 4, { hi: 2 }),
  ]),
};

const rcCar: UnitArt = {
  size: 24, ramp: 'toyRed',
  hull: c => def(`rcCar:${c}`, () => [
    ...sym(rect(-7, 7, 6, 3.5, 'ink', 2, { r: 1.5 })), ...sym(rect(7, 7, 6, 3.5, 'ink', 2, { r: 1.5 })),
    poly([-11, -5.5, 6, -6, 12, -2.5, 12, 2.5, 6, 6, -11, 5.5], c, 3, { hi: 2 }),
    rect(1, 0, 6, 8, 'ink', 2, { r: 1.5 }),
    rect(-10, 0, 3, 11, c, 2),
    cap(-8, -3, -13, -5, 0.4, 'iron', 4, { min: 0.8 }),
    ...sym(circ(11, 3.6, 1, 'toyYellow', 5, { glow: true, min: 0.6 })),
  ]),
};

const toyRobot: UnitArt = {
  size: 30, ramp: 'concrete',
  hull: c => def(`toyRobot:${c}`, () => [
    ...sym(rect(-2, 8, 10, 5, 'iron', 2, { r: 1.5, tex: texTreads(2.5, 4) })),
    rect(0, 0, 14, 16, c, 3, { r: 2, hi: 2 }),
    ...sym(rect(2, 10.5, 6, 3.4, c, 4, { r: 1.5 })), // руки
    rect(-2, 0, 6, 10, 'toyBlue', 4, { r: 1 }),
  ], { frames: 4 }),
  turret: c => def(`toyRobot:t:${c}`, () => [
    rect(0, 0, 9, 10, c, 4, { r: 2, hi: 2 }),
    ...sym(circ(3, 2.4, 1.5, 'toyRed', 5, { glow: true })),
    cap(-2, 0, -6, 0, 0.5, 'iron', 4, { min: 0.8 }),
  ]),
  pivot: [0, 0],
};

const plane: UnitArt = {
  size: 30, ramp: 'cream', air: true,
  hull: c => def(`plane:${c}`, () => [
    poly([15, 0, -13, -13, -8, 0, -13, 13], c, 4, { hi: 1 }),
    poly([15, 0, -8, 0, -11, -1.4, -11, 1.4], c, 2, { bevel: 0 }),
    cap(-6, 0, 12, 0, 0.3, c, 2, { bevel: 0, min: 1 }),
  ]),
};

const blockGolem: UnitArt = {
  size: 44, ramp: 'toyYellow',
  hull: c => def(`blockGolem:${c}`, () => {
    const cols: RampId[] = ['toyRed', 'toyBlue', c, 'toyGreen'];
    const l: Layer[] = [];
    let k = 0;
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
      const cc = cols[k++ % 4];
      l.push(rect(x * 13, y * 13, 12.5, 12.5, cc, 3, { r: 1, hi: 2 }));
      if (x !== 0 || y !== 0) l.push(circ(x * 13, y * 13, 3.4, cc, 4, { min: 0.5 }));
    }
    l.push(...sym(circ(4, 3.6, 2, 'ink', 0, { bevel: 0 })), ...sym(circ(4.5, 3.6, 0.8, 'toyRed', 5, { glow: true })));
    return l;
  }),
};

const jackBox: UnitArt = {
  size: 40, ramp: 'toyBlue', fixed: true,
  hull: c => def(`jackBox:${c}`, () => [
    rect(0, 0, 38, 38, c, 3, { r: 1.5, hi: 2 }),
    ...[-1, 1].flatMap(sx => [-1, 1].map(sy => circ(sx * 11, sy * 11, 4.5, 'toyYellow', 4))),
    rect(0, 0, 18, 18, 'toyRed', 4, { r: 2 }),
    circ(0, 0, 6, 'skin', 4, { hi: 2 }),
    ...sym(circ(2, 2, 1.2, 'ink', 0, { bevel: 0 })),
    cap(-21, 0, -27, -3, 1.4, 'gold', 4), // ручка
  ], { rotates: false }),
};

const rcTank: UnitArt = {
  size: 70, ramp: 'olive',
  hull: c => tankHull('rcTank', c, 70, 58, { skirts: true, rivets: true, accent: 'toyRed' }),
  turret: c => def(`rcTank:t:${c}`, () => [
    ...tankTurret('rcTankBase', c, 70, { barrels: 1, long: 0.55, wide: 0.42 }).layers,
    cap(-8, -10, -24, -16, 0.6, 'iron', 4), // антенна
    circ(-24, -16, 1.4, 'toyRed', 5, { glow: true }),
  ]),
  pivot: [-4, 0],
};

// ---------------------------------------------------------------------------
// Общие силуэты для остальных ступеней (оформление по стилю ступени)
// ---------------------------------------------------------------------------

function genericTank(id: string, ramp: RampId, size: number, o: { skirts?: boolean; barrels?: number; accent?: RampId; wide?: number } = {}): UnitArt {
  return {
    size, ramp,
    hull: c => tankHull(id, c, size, size * (o.wide ?? 0.86), { skirts: o.skirts, rivets: true, accent: o.accent }),
    turret: c => tankTurret(id, c, size, { barrels: o.barrels ?? 1, long: 0.55, wide: 0.42 }),
    pivot: [-size * 0.05, 0],
  };
}

function genericBlob(id: string, ramp: RampId, size: number, shape: 'round' | 'box' | 'bug' | 'disc', accent: RampId = 'toyRed'): UnitArt {
  return {
    size, ramp, fixed: shape === 'disc',
    hull: c => def(`${id}:${c}`, () => {
      const s = size / 2;
      switch (shape) {
        case 'round': return [ell(0, 0, s * 0.95, s * 0.8, c, 3, { hi: 2 }), circ(s * 0.45, 0, s * 0.22, accent, 5, { glow: true })];
        case 'box': return [rect(0, 0, size * 0.92, size * 0.8, c, 3, { r: s * 0.12 }), rect(-s * 0.2, 0, s * 0.8, s * 0.9, c, 2, { tex: texStripesY(Math.max(1.4, s * 0.15), -1), bevel: 0 }), ...sym(circ(s * 0.7, s * 0.4, s * 0.1, accent, 5, { glow: true }))];
        case 'bug': return [...[-0.5, 0, 0.5].flatMap(x => sym(cap(x * s, s * 0.3, x * s + s * 0.15, s * 0.95, s * 0.08, 'ink', 2))), ell(0, 0, s * 0.9, s * 0.55, c, 3, { hi: 2 }), circ(s * 0.75, 0, s * 0.3, c, 4), ...sym(circ(s * 0.9, s * 0.15, s * 0.1, accent, 5, { glow: true }))];
        case 'disc': return [circ(0, 0, s * 0.95, c, 3, { hi: 2 }), ring(0, 0, s * 0.5, s * 0.75, c, 2), circ(0, 0, s * 0.3, accent, 5, { glow: true })];
      }
    }),
  };
}

function genericAir(id: string, ramp: RampId, size: number, kind: 'heli' | 'quad' | 'jet' | 'ship'): UnitArt {
  const s = size / 2;
  const base: UnitArt = {
    size, ramp, air: true,
    hull: c => def(`${id}:${c}`, () => {
      switch (kind) {
        case 'heli': return [cap(-s * 0.95, 0, -s * 0.2, 0, s * 0.12, c, 3), ell(s * 0.1, 0, s * 0.6, s * 0.38, c, 3, { hi: 2 }), ell(s * 0.4, 0, s * 0.25, s * 0.25, 'glass', 4), ...sym(rect(0, s * 0.45, s * 0.8, s * 0.12, 'iron', 2)), ...sym(rect(-s * 0.05, s * 0.62, s * 0.3, s * 0.2, 'olive', 3))];
        case 'quad': return [...[[1, 1], [1, -1], [-1, 1], [-1, -1]].flatMap(([x, y]) => [cap(0, 0, x * s * 0.6, y * s * 0.6, s * 0.08, 'iron', 2), ring(x * s * 0.62, y * s * 0.62, s * 0.18, s * 0.3, c, 3)]), rect(0, 0, s * 0.7, s * 0.55, c, 4, { r: s * 0.1 }), circ(s * 0.25, 0, s * 0.14, 'toyRed', 5, { glow: true })];
        case 'jet': return [poly([s, 0, -s * 0.2, -s * 0.95, -s * 0.5, -s * 0.9, -s * 0.2, -s * 0.15, -s * 0.9, -s * 0.15, -s, 0, -s * 0.9, s * 0.15, -s * 0.2, s * 0.15, -s * 0.5, s * 0.9, -s * 0.2, s * 0.95], c, 3, { hi: 1 }), ell(s * 0.3, 0, s * 0.3, s * 0.12, 'glass', 4), ...sym(circ(-s * 0.95, s * 0.08, s * 0.08, 'fire', 4, { glow: true }))];
        case 'ship': return [ell(0, 0, s, s * 0.45, c, 3, { hi: 1 }), ...sym(rect(-s * 0.2, s * 0.55, s * 0.9, s * 0.18, c, 2)), rect(s * 0.1, 0, s * 0.5, s * 0.3, 'iron', 3), ...sym(circ(-s * 0.85, s * 0.3, s * 0.1, 'fire', 4, { glow: true })), circ(s * 0.6, 0, s * 0.12, 'toyRed', 5, { glow: true })];
      }
    }),
  };
  if (kind === 'heli') base.rotor = c => def(`${id}Rotor:${c}`, () => [rect(0, 0, size, size * 0.06, 'iron', 3, { bevel: 0 }), rect(0, 0, size * 0.06, size, 'iron', 3, { bevel: 0 })], { outline: null });
  return base;
}

function genericWalker(id: string, ramp: RampId, size: number, accent: RampId = 'toyRed'): UnitArt {
  const s = size / 2;
  return {
    size, ramp,
    hull: c => def(`${id}:${c}`, () => [
      ...sym(rect(0, s * 0.6, s * 0.5, s * 0.25, 'iron', 2, { r: s * 0.1 })),
      ...sym(rect(-s * 0.15, s * 0.7, s * 0.7, s * 0.14, 'iron', 3)),
      ell(0, 0, s * 0.62, s * 0.56, c, 3, { hi: 1 }),
    ], { frames: 4 }),
    turret: c => def(`${id}:t:${c}`, () => [
      rect(0, 0, s * 0.8, s * 0.7, c, 4, { r: s * 0.15 }),
      ...sym(rect(s * 0.55, s * 0.28, s * 0.6, s * 0.12, 'iron', 3)),
      circ(s * 0.2, 0, s * 0.12, accent, 5, { glow: true }),
    ]),
    pivot: [0, 0],
  };
}

export const UNIT_ART: Record<string, UnitArt> = {
  soldier, toyTank, armorToy, bigToy, jeep, heli, mortar, toyBunker,
  windMouse, top, rcCar, toyRobot, plane, blockGolem, jackBox, rcTank,
  // Ступень 3
  dustBunny: genericBlob('dustBunny', 'concrete', 14, 'round', 'ink'),
  quad: genericAir('quad', 'iron', 26, 'quad'),
  vacBot: genericBlob('vacBot', 'ink', 40, 'disc', 'teal'),
  tinTank: genericTank('tinTank', 'steel', 32, { skirts: true, accent: 'red' }),
  deskLamp: genericBlob('deskLamp', 'toyYellow', 34, 'disc', 'fire'),
  toyTrain: genericBlob('toyTrain', 'toyRed', 52, 'box', 'gold'),
  bookMortar: genericBlob('bookMortar', 'wood', 40, 'box', 'fire'),
  robotDog: genericWalker('robotDog', 'concrete', 64, 'teal'),
  // Ступень 4
  cockroachBot: genericBlob('cockroachBot', 'wood', 14, 'bug', 'red'),
  toaster: genericBlob('toaster', 'steel', 30, 'box', 'fire'),
  secDrone: genericAir('secDrone', 'concrete', 26, 'quad'),
  mixerBot: genericBlob('mixerBot', 'cream', 34, 'disc', 'red'),
  kettle: genericBlob('kettle', 'red', 38, 'round', 'fire'),
  washer: genericBlob('washer', 'cream', 54, 'box', 'blue'),
  tv: genericBlob('tv', 'ink', 48, 'box', 'teal'),
  vacGiant: genericBlob('vacGiant', 'purple', 70, 'disc', 'teal'),
  // Ступень 5
  infantry: { ...soldier, ramp: 'olive' },
  apc: genericTank('apc', 'olive', 30, { barrels: 1, wide: 0.7 }),
  mbt: genericTank('mbt', 'khaki', 34, { skirts: true }),
  attackHeli: genericAir('attackHeli', 'olive', 36, 'heli'),
  spg: genericTank('spg', 'olive', 38, { barrels: 1, skirts: true }),
  armoredCar: { ...jeep, ramp: 'olive' },
  heavyTank: genericTank('heavyTank', 'iron', 54, { skirts: true, barrels: 2, accent: 'red' }),
  mlrs: genericBlob('mlrs', 'olive', 60, 'box', 'fire'),
  // Ступень 6
  carsSwarm: genericBlob('carsSwarm', 'steel', 14, 'box', 'gold'),
  walker: genericWalker('walker', 'steel', 34),
  superTank: genericTank('superTank', 'iron', 46, { skirts: true, barrels: 2, accent: 'teal' }),
  gunship: genericAir('gunship', 'iron', 40, 'jet'),
  armoredTrain: genericBlob('armoredTrain', 'iron', 64, 'box', 'red'),
  droneCarrier: genericAir('droneCarrier', 'steel', 60, 'ship'),
  kamikazeDrone: genericAir('kamikazeDrone', 'red', 16, 'jet'),
  mechTitan: genericWalker('mechTitan', 'iron', 74, 'teal'),
  // Ступень 7
  cityBlock: genericBlob('cityBlock', 'concrete', 16, 'box', 'gold'),
  crawler: genericTank('crawler', 'concrete', 36, { skirts: true, barrels: 2 }),
  dropPod: genericBlob('dropPod', 'steel', 28, 'round', 'fire'),
  stratoBomber: genericAir('stratoBomber', 'iron', 50, 'jet'),
  mobileFort: genericBlob('mobileFort', 'concrete', 64, 'box', 'red'),
  silo: genericBlob('silo', 'concrete', 40, 'disc', 'red'),
  megaWalker: genericWalker('megaWalker', 'iron', 76, 'red'),
  // Ступень 8
  meteorite: genericBlob('meteorite', 'rust', 16, 'round', 'fire'),
  contCrawler: genericTank('contCrawler', 'purple', 40, { skirts: true, barrels: 2, accent: 'teal' }),
  orbitalSat: genericAir('orbitalSat', 'steel', 32, 'ship'),
  voidSpider: genericBlob('voidSpider', 'purple', 34, 'bug', 'teal'),
  lance: genericBlob('lance', 'steel', 44, 'disc', 'blue'),
  moonlet: genericBlob('moonlet', 'concrete', 70, 'disc', 'purple'),
  starTitan: genericWalker('starTitan', 'purple', 80, 'teal'),
};

export function unitArt(id: string): UnitArt {
  return UNIT_ART[id] ?? BOSS_ART[id] ?? UNIT_ART.toyTank;
}
