// Танки игроков: корпуса классов, башни по основному оружию, навесные модули
// дополнительных систем. Модель смотрит вправо (+X), единицы — «модельные»
// (корпус штурмовика ≈ 28 ед.).

import type { RampId } from '../palette';
import {
  type Layer, type SpriteDef, rect, circ, ell, poly, cap, ring, sym, transformLayers,
  texTreads, texStripesY, texStripesX, texSpeckle, sumTex, texCamo,
} from '../raster';

export type HullClass = 'scout' | 'assault' | 'heavy';
export type GunKind = 'ap' | 'he' | 'mg' | 'flame' | 'rockets' | 'tesla' | 'mines' | 'ram';

export interface HullInfo {
  /** Длина корпуса в модельных единицах. */
  len: number;
  /** Ширина корпуса. */
  wid: number;
  /** Ось вращения башни. */
  pivot: [number, number];
  /** Точки крепления модулей: [x, y, угол]. */
  mounts: [number, number, number][];
  /** Масштаб башни. */
  turretK: number;
}

export const HULLS: Record<HullClass, HullInfo> = {
  scout: { len: 26, wid: 18, pivot: [0, 0], mounts: [[-10.5, -3.4, 0], [-10.5, 3.4, 0], [2.5, -8.6, 0], [2.5, 8.6, 0]], turretK: 0.82 },
  assault: { len: 29, wid: 23, pivot: [-1, 0], mounts: [[-11.2, -4.8, 0], [-11.2, 4.8, 0], [3, -10.4, 0], [3, 10.4, 0]], turretK: 1 },
  heavy: { len: 32, wid: 27, pivot: [-2, 0], mounts: [[-12.6, -6, 0], [-12.6, 6, 0], [2, -12.6, 0], [2, 12.6, 0]], turretK: 1.18 },
};

const TREAD_FRAMES = 4;

function tracks(len: number, y: number, h: number, period = 2.4): Layer[] {
  return sym(rect(0, y, len, h, 'iron', 2, { r: Math.min(2.8, h / 2), tex: texTreads(period, TREAD_FRAMES), cast: true }));
}

// ---------------------------------------------------------------------------
// Корпуса
// ---------------------------------------------------------------------------

function scoutHull(P: RampId): Layer[] {
  return [
    ...tracks(26, 7, 4.6, 2.2),
    // Нижний корпус.
    rect(0, 0, 24, 11, P, 1, { r: 1.5 }),
    // Клиновидная верхняя плита.
    poly([-12, -5.3, 6, -5.3, 13, -1.8, 13, 1.8, 6, 5.3, -12, 5.3], P, 3),
    poly([6, -5, 12.6, -1.7, 12.6, 1.7, 6, 5], P, 4),
    // Моторный отсек с решёткой.
    rect(-8.5, 0, 5, 7, P, 2, { tex: texStripesY(1.4, -1), bevel: 0 }),
    // Люк механика и фары.
    circ(7.5, -2.2, 1.4, P, 4),
    ...sym(circ(11.6, 3.6, 0.7, 'cream', 5, { glow: true, min: 0.9 })),
    ...sym(rect(-12.6, 3.5, 1.4, 1.6, 'iron', 2)),
    // Антенна.
    cap(-9.5, -4.2, -15.5, -5.2, 0.4, 'iron', 3, { min: 1.1, bevel: 0 }),
  ];
}

function assaultHull(P: RampId): Layer[] {
  return [
    ...tracks(29, 8.6, 6.2),
    rect(0, 0, 27, 13.5, P, 1, { r: 2 }),
    poly([-12.5, -6.6, 9, -6.6, 13, -4, 13, 4, 9, 6.6, -12.5, 6.6], P, 3),
    poly([9, -6.2, 12.6, -3.8, 12.6, 3.8, 9, 6.2], P, 4),
    // Надгусеничные полки с ящиками ЗИП.
    ...sym(rect(-5.5, 8.3, 6.5, 2.4, 'khaki', 3, { r: 0.6 })),
    ...sym(rect(6.5, 8.6, 4, 2, P, 2, { r: 0.5 })),
    rect(-9.5, 0, 6, 10, P, 2, { tex: texStripesY(1.6, -1), bevel: 0 }),
    ...sym(rect(-13.4, 4.2, 1.6, 2.4, 'iron', 2)),
    circ(9.5, -3.4, 1.6, P, 4),
    rect(11.8, 0, 0.8, 5, P, 2, { bevel: 0, min: 1 }),
    ...sym(circ(12.2, 5.2, 0.8, 'cream', 5, { glow: true, min: 0.9 })),
    ...sym(rect(-13.6, 5.6, 0.8, 1.2, 'red', 4, { glow: true, min: 1 })),
  ];
}

function heavyHull(P: RampId): Layer[] {
  return [
    ...tracks(32, 10.2, 7.4, 2.8),
    rect(0, 0, 30, 16, P, 1, { r: 1.5 }),
    rect(0, 0, 28, 15, P, 3, { r: 1.2, tex: texSpeckle(0.05, 1, 1, 11) }),
    // Лобовой бронеблок.
    rect(13.2, 0, 3.6, 14.5, P, 4, { r: 0.8 }),
    rect(13.2, 0, 1, 12, P, 2, { bevel: 0, min: 1 }),
    // Бортовые экраны поверх гусениц — сегменты.
    ...sym(rect(0.5, 8.9, 29, 3.2, P, 2, { tex: texStripesX(5.5, 1), r: 0.6 })),
    // Двигатель: две решётки.
    ...sym(rect(-10, 3.2, 6.5, 4.4, P, 2, { tex: texStripesY(1.4, -1), bevel: 0 })),
    ...sym(rect(-15, 5, 1.8, 3, 'iron', 2)),
    // Запасные траки на лбу.
    ...sym(rect(10.5, 4.8, 2.2, 3.4, 'iron', 3, { tex: texStripesX(1.2, -1) })),
    circ(9, -0.5, 1.8, P, 4),
    ...sym(circ(14.6, 6.6, 0.8, 'cream', 5, { glow: true, min: 0.9 })),
  ];
}

// ---------------------------------------------------------------------------
// Модули дополнительных систем (в локальных координатах точки крепления)
// ---------------------------------------------------------------------------

function moduleLayers(kind: GunKind, P: RampId): Layer[] {
  switch (kind) {
    case 'rockets':
      return [
        rect(0, 0, 7.5, 5.2, 'olive', 3, { r: 0.8 }),
        rect(-0.5, 0, 6.5, 4.2, 'olive', 2, { bevel: 0 }),
        ...[-1.25, 1.25].flatMap(y => [circ(2.4, y, 0.85, 'ink', 1, { bevel: 0 }), circ(-0.3, y, 0.85, 'ink', 1, { bevel: 0 })]),
        ...[-1.25, 1.25].flatMap(y => [circ(2.4, y, 0.45, 'red', 4, { glow: true, min: 1.4 }), circ(-0.3, y, 0.45, 'red', 4, { glow: true, min: 1.4 })]),
      ];
    case 'mines':
      return [
        rect(0, 0, 5, 6.4, 'khaki', 3, { r: 0.8 }),
        rect(-2.6, 0, 1.8, 4.2, 'iron', 1),
        ...[-1.6, 1.6].map(y => circ(0.6, y, 1.2, 'iron', 3)),
        ...[-1.6, 1.6].map(y => circ(0.6, y, 0.45, 'red', 4, { glow: true, min: 1.2 })),
      ];
    case 'tesla':
      return [
        circ(0, 0, 3, 'steel', 2),
        ring(0, 0, 1.4, 2.5, 'rust', 4, { tex: (x, y) => (Math.floor(Math.atan2(y, x) * 3) & 1 ? -1 : 0) }),
        circ(0, 0, 1.3, 'teal', 5, { glow: true }),
      ];
    case 'flame':
      return [
        ...sym(ell(-0.6, 1.3, 3.2, 1.4, 'red', 3)),
        rect(3, 0, 3, 1.4, 'iron', 3),
        circ(4.7, 0, 0.6, 'fire', 4, { glow: true, min: 1 }),
      ];
    case 'mg':
      return [
        circ(0, 0, 2.4, 'iron', 3),
        rect(3.6, 0, 5, 1, 'iron', 2, { bevel: 0 }),
        rect(-0.4, 2, 2.4, 1.6, 'olive', 3),
      ];
    case 'ap':
      return [
        rect(0, 0, 4.6, 4, P, 3, { r: 0.8 }),
        rect(5.6, 0, 8, 1.5, 'steel', 3),
        rect(9.4, 0, 1.2, 2.2, 'steel', 4),
      ];
    case 'he':
      return [
        circ(0, 0, 2.8, 'olive', 3),
        circ(0, 0, 1.6, 'iron', 2),
        circ(0, 0, 1, 'ink', 0, { bevel: 0 }),
      ];
    case 'ram':
      return [];
  }
}

/** Бульдозерный отвал — крепится к лбу корпуса. */
function ramBlade(info: HullInfo): Layer[] {
  const x = info.len / 2 + 1.2, w = info.wid / 2 + 1.5;
  return [
    ...sym(cap(x - 3.5, w * 0.55, x - 1, w * 0.62, 0.8, 'iron', 2)),
    poly([x - 1.4, -w, x + 1, -w - 0.6, x + 2.4, -w * 0.4, x + 2.6, 0, x + 2.4, w * 0.4, x + 1, w + 0.6, x - 1.4, w, x, 0], 'steel', 3, {
      tex: (_x, y) => (Math.abs(y) % 4 < 0.6 ? -1 : 0),
    }),
    ...Array.from({ length: 5 }, (_, i) => poly(
      [x + 2.2, -w * 0.8 + i * w * 0.4 - 1, x + 3.8, -w * 0.8 + i * w * 0.4, x + 2.2, -w * 0.8 + i * w * 0.4 + 1], 'steel', 4, { min: 0.9 },
    )),
  ];
}

const hullCache = new Map<string, SpriteDef>();

/**
 * Материал по поколению: 0 — глянцевый пластик с чёрными резиновыми
 * гусеницами, 2 — камуфляж, 3+ — металл с потёртостями.
 */
function material(layers: Layer[], P: RampId, tier: number, turret = false): Layer[] {
  // С поколением корпус «взрослеет»: пластик → металл → тёмная броня.
  // Цвет игрока остаётся на башне, верхней плите (до VI) и полосах — своих легко узнать.
  const metal: RampId = tier >= 6 ? 'ink' : 'steel';
  return layers.map(l => {
    if (tier === 0) {
      if (l.c === 'iron') return { ...l, c: 'ink' as RampId, t: Math.min(5, l.t + 1) };
      if (l.c === P) return { ...l, hi: 2, tex: undefined };
      return l;
    }
    if (l.c !== P) return l;
    if (turret) {
      // Люк/командирская башенка (тон 5) остаются цвета игрока.
      if (tier >= 5 && l.t <= 4) return { ...l, c: tier >= 6 ? 'iron' as RampId : 'steel' as RampId, t: tier >= 6 ? 4 : 4, tex: sumTex(l.tex ?? (() => 0), texSpeckle(0.04, -1, 1, 5 + tier)) };
      if (tier >= 3) return { ...l, tex: sumTex(l.tex ?? (() => 0), texSpeckle(0.04, -1, 1, 5 + tier)) };
      return l;
    }
    if (tier >= 3 && l.t <= 2) return { ...l, c: metal, t: tier >= 6 ? l.t + 1 : l.t };
    if (tier >= 6 && l.t === 3) return { ...l, c: metal, t: 4, tex: sumTex(l.tex ?? (() => 0), texSpeckle(0.05, -1, 1, 7 + tier)) };
    if (l.t === 3 && tier === 2) return { ...l, tex: sumTex(l.tex ?? (() => 0), texCamo(4.5, 2)) };
    if (l.t === 3 && tier >= 3) return { ...l, tex: sumTex(l.tex ?? (() => 0), texSpeckle(0.05, -1, 1, 7 + tier)) };
    return l;
  });
}

/** Навесное оборудование по поколению (накопительно). */
function tierHull(info: HullInfo, P: RampId, tier: number): Layer[] {
  const L = info.len, W = info.wid, l: Layer[] = [];
  if (tier === 0) {
    l.push(rect(0, 0, L * 0.7, 0.45, P, 2, { bevel: 0, min: 1.3 })); // шов литья
    l.push(...sym(circ(-L * 0.38, W * 0.2, 0.6, P, 5, { min: 1.2 }))); // винтики
  }
  if (tier >= 1) {
    l.push(rect(-L * 0.42, 0, L * 0.08, W * 0.26, tier >= 3 ? 'iron' : 'toyYellow', 4, { r: 0.4 }));
    l.push(cap(-L * 0.36, -W * 0.28, -L * 0.6, -W * 0.36, 0.35, 'iron', 3, { min: 1 }));
    l.push(...sym(circ(L * 0.44, W * 0.2, 0.75, tier >= 6 ? 'sky' : 'red', 5, { glow: true, min: 0.9 })));
  }
  if (tier >= 2) {
    l.push(...sym(rect(-L * 0.18, W * 0.36, L * 0.2, W * 0.09, 'khaki', 3, { r: 0.4 })));
    l.push(cap(L * 0.06, W * 0.36, L * 0.3, W * 0.36, 0.35, 'wood', 3, { min: 0.9 }));
  }
  if (tier >= 3) {
    l.push(...sym(ell(-L * 0.49, W * 0.17, 1.3, 0.9, 'ink', 1, { bevel: 0 })));
    l.push(cap(-L * 0.3, -W * 0.25, L * 0.18, -W * 0.25, 0.3, 'iron', 2, { min: 1 }));
  }
  if (tier >= 4) {
    // Динамическая защита: блоки на лбу и бортах.
    for (let i = 0; i < 4; i++) l.push(rect(L * 0.43, (i - 1.5) * W * 0.11, L * 0.06, W * 0.09, P, 2, { r: 0.2 }));
    for (let i = 0; i < 5; i++) l.push(...sym(rect(-L * 0.3 + i * L * 0.13, W * 0.43, L * 0.11, W * 0.07, P, 4, { r: 0.2 })));
  }
  if (tier >= 5) {
    // Бортовые спонсоны.
    for (const s of [-1, 1]) {
      l.push(circ(L * 0.1, s * W * 0.5, W * 0.1, P, 4));
      l.push(rect(L * 0.24, s * W * 0.5, L * 0.22, W * 0.05, 'iron', 3));
    }
  }
  if (tier >= 3) {
    // Полосы цвета игрока по бортам — опознавание «свой».
    l.push(...sym(rect(-L * 0.05, W * 0.24, L * 0.62, Math.max(1, W * 0.05), P, 4, { bevel: 0 })));
  }
  if (tier >= 6) {
    l.push(...sym(circ(-L * 0.43, W * 0.3, W * 0.06, 'iron', 2)), ...sym(circ(-L * 0.43, W * 0.3, W * 0.03, 'fire', 4, { glow: true })));
    l.push(circ(-L * 0.3, 0, W * 0.14, P, 4), rect(-L * 0.45, 0, L * 0.2, W * 0.05, 'iron', 3));
    l.push(...sym(rect(0, W * 0.3, L * 0.5, 0.5, P, 5, { glow: true, min: 1 })));
    l.push(rect(L * 0.1, 0, L * 0.5, 0.7, P, 5, { glow: true, min: 1 }));
  }
  if (tier >= 7) {
    l.push(...sym(rect(-L * 0.05, W * 0.2, L * 0.7, 0.7, 'teal', 5, { glow: true })));
    l.push(ring(-L * 0.3, 0, W * 0.13, W * 0.19, 'steel', 3), circ(-L * 0.3, 0, W * 0.13, 'teal', 5, { glow: true }));
    l.push(...sym(cap(-L * 0.45, W * 0.12, -L * 0.62, W * 0.28, 0.35, 'teal', 4, { glow: true, min: 1 })));
  }
  return l;
}

/** Спрайт корпуса с навесными модулями (порядок модулей = порядок точек крепления). */
export function hullDef(cls: HullClass, P: RampId, modules: GunKind[] = [], tier = 0): SpriteDef {
  const key = `hull:${cls}:${P}:${modules.join(',')}:${tier}`;
  let d = hullCache.get(key);
  if (d) return d;
  const info = HULLS[cls];
  const raw = cls === 'scout' ? scoutHull(P) : cls === 'assault' ? assaultHull(P) : heavyHull(P);
  const base = [...material(raw, P, tier), ...tierHull(info, P, tier)];
  const extra: Layer[] = [];
  let mi = 0;
  for (const m of modules) {
    if (m === 'ram') { extra.push(...ramBlade(info)); continue; }
    const mount = info.mounts[mi++ % info.mounts.length];
    const k = cls === 'heavy' ? 1.1 : cls === 'scout' ? 0.85 : 1;
    extra.push(...transformLayers(moduleLayers(m, P), mount[0], mount[1], k, mount[2]));
  }
  d = { id: key, layers: [...base, ...extra], frames: TREAD_FRAMES };
  hullCache.set(key, d);
  return d;
}

// ---------------------------------------------------------------------------
// Башни (по основному оружию)
// ---------------------------------------------------------------------------

function turretLayers(gun: GunKind, P: RampId): Layer[] {
  switch (gun) {
    case 'ap':
      return [
        poly([-6.5, -5, 3, -5.4, 6.5, -2.6, 6.5, 2.6, 3, 5.4, -6.5, 5], P, 4),
        rect(11.5, 0, 16, 2.4, 'steel', 3),
        rect(8.5, 0, 3.2, 3.4, 'steel', 3, { r: 1.2 }),
        rect(19.6, 0, 1.6, 3, 'steel', 4),
        circ(-2.4, -2.3, 2.1, P, 5),
        rect(-2.4, -2.3, 2.2, 0.8, 'ink', 1, { bevel: 0, min: 1.2 }),
        circ(-2.6, 2.6, 1.5, P, 3),
      ];
    case 'he':
      return [
        rect(0, 0, 13.5, 12, P, 4, { r: 3.2 }),
        ...sym(poly([2.5, -6, 6.6, -4, 6.6, -2, 2.5, -2.5], P, 3)),
        rect(10.2, 0, 11, 3.6, 'iron', 3, { r: 0.6 }),
        rect(16, 0, 3, 5.2, 'iron', 3, { r: 0.8 }),
        rect(17, 0, 1.2, 2, 'ink', 0, { bevel: 0, min: 1.2 }),
        circ(-2.6, -2.8, 2.4, P, 5),
        circ(-2.6, -2.8, 1.1, P, 3, { min: 1.2 }),
        circ(-2.6, 3, 1.7, P, 3),
      ];
    case 'mg':
      return [
        rect(-0.5, 0, 11, 10, P, 4, { r: 2.4 }),
        rect(5, 0, 5, 5.5, 'iron', 3, { r: 0.8 }),
        ...sym(rect(10.5, 1.4, 9, 1.2, 'iron', 2, { bevel: 0 })),
        ...sym(rect(14.6, 1.4, 1.2, 1.7, 'iron', 4, { bevel: 0, min: 1 })),
        rect(-2, 4.6, 4.5, 3, 'olive', 3, { r: 0.4 }),
        circ(-2.8, -2.2, 1.7, P, 5),
      ];
    case 'flame':
      return [
        rect(0, 0, 12.5, 11.5, P, 4, { r: 3 }),
        ...sym(ell(-4.6, 3.6, 3.6, 1.9, 'red', 3)),
        rect(8.2, 0, 8, 4.2, 'iron', 3, { r: 1.3 }),
        ring(12.2, 0, 1, 2.2, 'iron', 4),
        circ(12.2, 0, 1, 'fire', 4, { glow: true }),
        circ(-1, -2.5, 1.9, P, 5),
      ];
    case 'rockets':
      return [
        rect(0, 0, 12, 11, P, 4, { r: 2.4 }),
        rect(6, 0, 7, 8, 'olive', 3, { r: 0.8 }),
        ...[-2, 0, 2].map(y => circ(8.6, y, 0.9, 'ink', 1, { bevel: 0 })),
        circ(-2.6, -2.6, 1.8, P, 5),
      ];
    case 'tesla':
      return [
        circ(0, 0, 6, P, 4),
        ring(2, 0, 1.6, 3.2, 'rust', 4, { tex: (x, y) => (Math.floor(Math.atan2(y, x - 2) * 3) & 1 ? -1 : 0) }),
        rect(6.5, 0, 5, 1.6, 'rust', 4),
        circ(9.4, 0, 1.4, 'teal', 5, { glow: true }),
        circ(2, 0, 1.4, 'teal', 5, { glow: true }),
      ];
    case 'mines':
    case 'ram':
      return turretLayers('he', P);
  }
}

const turretCache = new Map<string, SpriteDef>();

function tierTurret(gun: GunKind, P: RampId, tier: number): Layer[] {
  const l: Layer[] = [];
  const barrel = gun === 'ap' || gun === 'he' || gun === 'mg';
  if (tier >= 1) l.push(cap(-4, 3.5, -9, 5.5, 0.3, 'iron', 3, { min: 1 }));
  if (tier >= 3 && barrel) l.push(rect(6.6, 0, 2.6, 5.4, 'iron', 3, { r: 0.6 }));
  if (tier >= 4) l.push(...sym(rect(0.5, 6.2, 3.4, 1.4, 'iron', 3)), ...sym(rect(-1.5, 6.2, 1.2, 1.4, 'iron', 2)));
  if (tier >= 5 && barrel) l.push(...sym(rect(11.5, 2.1, 13, 1.6, 'iron', 3)));
  if (tier >= 5 && gun === 'flame') l.push(...sym(rect(9, 2.6, 6, 1.8, 'iron', 3)), ...sym(circ(12, 2.6, 0.7, 'fire', 4, { glow: true })));
  if (tier >= 5) {
    // Опознавательная полоса и кольцо цвета игрока на башне.
    l.push(rect(-1, 0, 2.2, 10.5, P, 5, { bevel: 0, glow: tier >= 6 }));
    l.push(ring(-1, 0, 3.6, 4.4, P, 4, { glow: tier >= 6 }));
  }
  if (tier >= 6) l.push(rect(-3.5, -5.2, 4, 2.6, 'steel', 4, { r: 0.4 }), circ(-2.2, -5.2, 0.7, 'sky', 5, { glow: true }));
  if (tier >= 7) {
    if (barrel) l.push(rect(12, 0, 14, 0.6, 'teal', 5, { glow: true }), circ(19.5, 0, 1.3, 'teal', 5, { glow: true }));
    l.push(ring(-1, 0, 2.6, 3.4, 'teal', 4, { glow: true }));
  }
  return l;
}

export function turretDef(cls: HullClass, gun: GunKind, P: RampId, tier = 0): SpriteDef {
  const key = `turret:${cls}:${gun}:${P}:${tier}`;
  let d = turretCache.get(key);
  if (d) return d;
  const k = HULLS[cls].turretK * (1 + Math.max(0, tier - 3) * 0.04);
  const layers = [...material(turretLayers(gun, P), P, tier, true), ...tierTurret(gun, P, tier)];
  d = { id: key, layers: transformLayers(layers, 0, 0, k), castDist: 1.5 };
  turretCache.set(key, d);
  return d;
}

/** Обломки подбитого танка — тот же корпус, но выжженный. */
export function wreckDef(cls: HullClass): SpriteDef {
  const key = `wreck:${cls}`;
  let d = hullCache.get(key);
  if (d) return d;
  const base = cls === 'scout' ? scoutHull('iron') : cls === 'assault' ? assaultHull('iron') : heavyHull('iron');
  const scorched = base.map(l => (l.glow ? { ...l, c: 'ink' as RampId, t: 1, glow: false } : {
    ...l,
    tex: sumTex(l.tex ?? (() => 0), texSpeckle(0.25, -1, 1.5, 5)),
  }));
  d = { id: key, layers: scorched, frames: 1 };
  hullCache.set(key, d);
  return d;
}

export const TREADS = TREAD_FRAMES;
