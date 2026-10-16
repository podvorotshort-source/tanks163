// Ступени масштаба: размер арены, препятствия, босс, события.
// Координаты — локальные единицы ступени; арена [0, W] × [0, H].

import type { Rng } from '../../core/rng';
import { makeProp, type Prop, type Material, MATS } from '../props';
import { powerOf, stageUnit } from '../types';
import { fbm, hash2 } from '../../core/math';

export interface StageDef {
  idx: number;
  name: string;
  title: string;
  subtitle: string;
  w: number;
  h: number;
  /** Где в этом мире лежит прежняя арена (центр), локальные ед. */
  relicX: number;
  relicY: number;
  boss: string;
  /** События ступени. */
  events: string[];
  /** Горючесть поверхности 0..1 в точке. */
  fuel: (x: number, y: number) => number;
  /** Препятствия. */
  props: (rng: Rng, s: StageDef) => Prop[];
  /** Время появления босса, с. */
  bossAt: number;
  /** Множитель сложности ступени. */
  diff: number;
}

export const ARENA_W = 2880;
export const ARENA_H = 1620;

/** Прочность препятствия: материал × сила его абсолютного размера. */
function hpFor(mat: Material, size: number, stage: number): number {
  return 26 * MATS[mat].hp * powerOf(size * stageUnit(stage));
}

function P(stage: number, kind: string, mat: Material, x: number, y: number, w: number, h: number, o: Partial<Prop> = {}): Prop {
  return makeProp(kind, mat, x, y, w, h, hpFor(mat, Math.max(w, h), stage), o);
}

/** Свободно ли место (не пересекается с уже поставленными и с зоной старта). */
function free(list: Prop[], x: number, y: number, w: number, h: number, keep: { x: number; y: number; r: number }[], pad = 2): boolean {
  for (const k of keep) {
    const qx = Math.max(x - w / 2, Math.min(k.x, x + w / 2)), qy = Math.max(y - h / 2, Math.min(k.y, y + h / 2));
    if ((qx - k.x) ** 2 + (qy - k.y) ** 2 < k.r * k.r) return false;
  }
  for (const p of list) {
    if (Math.abs(p.x - x) * 2 < p.w + w + pad * 2 && Math.abs(p.y - y) * 2 < p.h + h + pad * 2) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 1. Игрушечный полигон — кирпич, сталь, кусты, вода (в духе Dendy)
// ---------------------------------------------------------------------------
function toyProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const B = 8; // кирпичик
  const cx = s.w / 2, cy = s.h / 2;
  const keep = [{ x: cx, y: cy, r: 90 }];
  const cell = 64;
  const cols = Math.floor(s.w / cell), rows = Math.floor(s.h / cell);
  // Сетка кварталов: стены из кирпича с узором, стальные блоки, кусты, вода.
  for (let gy = 1; gy < rows - 1; gy++) for (let gx = 1; gx < cols - 1; gx++) {
    const x0 = gx * cell, y0 = gy * cell;
    const r = hash2(gx, gy, 77);
    const n = fbm(gx * 0.18, gy * 0.18, 2, 5);
    if (r < 0.34) {
      // Кирпичная стена: горизонтальная или вертикальная, 2 кирпича толщиной.
      const horiz = hash2(gx, gy, 3) < 0.5;
      const len = 3 + Math.floor(hash2(gx, gy, 9) * 5);
      for (let i = 0; i < len; i++) for (let j = 0; j < 2; j++) {
        const bx = x0 + 8 + (horiz ? i : j) * B + B / 2, by = y0 + 8 + (horiz ? j : i) * B + B / 2;
        if (free(out, bx, by, B, B, keep, -0.5)) out.push(P(0, 'brick', 'brick', bx, by, B, B, { v: (i + j) & 1 }));
      }
    } else if (r < 0.42) {
      const sz = 16;
      const k = 1 + Math.floor(hash2(gx, gy, 11) * 2);
      for (let i = 0; i < k; i++) {
        const bx = x0 + 16 + i * sz + sz / 2, by = y0 + 24;
        if (free(out, bx, by, sz, sz, keep)) out.push(P(0, 'steel', 'steel', bx, by, sz, sz));
      }
    } else if (r < 0.55 && n > 0.45) {
      // Кусты — пятна.
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        if (hash2(gx * 3 + i, gy * 3 + j, 21) < 0.35) continue;
        const bx = x0 + 10 + i * 16 + 8, by = y0 + 10 + j * 16 + 8;
        if (free(out, bx, by, 16, 16, keep, -1)) out.push(P(0, 'bush', 'bush', bx, by, 16, 16, { v: (i * 7 + j) % 3 }));
      }
    } else if (r < 0.6 && n < 0.4) {
      const w = 32 + Math.floor(hash2(gx, gy, 31) * 2) * 16, h = 32;
      if (free(out, x0 + 32, y0 + 32, w, h, keep)) out.push(P(0, 'water', 'water', x0 + 32, y0 + 32, w, h));
    }
  }
  // Крупные «кубики»-ориентиры (игрушки с ковра, заехавшие на поле).
  for (let i = 0; i < 6; i++) {
    const x = rng.range(200, s.w - 200), y = rng.range(150, s.h - 150), sz = rng.range(40, 56);
    if (free(out, x, y, sz, sz, keep, 6)) out.push(P(0, 'toyCube', 'plastic', x, y, sz, sz, { v: rng.int(0, 3) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Ковёр и детская
// ---------------------------------------------------------------------------
function carpetProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 420 }];
  // Ножки кровати и стола — неразрушимые колонны.
  for (const [x, y] of [[300, 260], [300, 1360], [2560, 240], [2580, 1380]]) out.push(P(1, 'furnitureLeg', 'wall', x, y, 90, 90, { round: true }));
  // Кубики (пластик) россыпью и башенками.
  for (let i = 0; i < 70; i++) {
    const sz = rng.pick([28, 34, 40, 52]);
    const x = rng.range(80, s.w - 80), y = rng.range(80, s.h - 80);
    if (free(out, x, y, sz, sz, keep, 10)) out.push(P(1, 'block', 'plastic', x, y, sz, sz, { v: rng.int(0, 5), a: 0 }));
  }
  // Карандаши (длинные), книжки.
  for (let i = 0; i < 26; i++) {
    const horiz = rng.chance(0.5);
    const L = rng.range(90, 150), T = 14;
    const x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    const w = horiz ? L : T, h = horiz ? T : L;
    if (free(out, x, y, w, h, keep, 8)) out.push(P(1, 'crayon', 'wood', x, y, w, h, { v: rng.int(0, 5), a: horiz ? 0 : 1 }));
  }
  for (let i = 0; i < 10; i++) {
    const w = rng.range(110, 150), h = rng.range(80, 110);
    const x = rng.range(160, s.w - 160), y = rng.range(160, s.h - 160);
    if (free(out, x, y, w, h, keep, 14)) out.push(P(1, 'book', 'paper', x, y, w, h, { v: rng.int(0, 4) }));
  }
  // Стеклянные шарики.
  for (let i = 0; i < 30; i++) {
    const d = rng.range(14, 20), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, d, d, keep, 4)) out.push(P(1, 'marble', 'glass', x, y, d, d, { round: true, v: rng.int(0, 4) }));
  }
  // Тапок и подушка — мягкие преграды.
  for (let i = 0; i < 4; i++) {
    const w = rng.range(140, 180), h = rng.range(70, 90), x = rng.range(200, s.w - 200), y = rng.range(200, s.h - 200);
    if (free(out, x, y, w, h, keep, 16)) out.push(P(1, i < 2 ? 'slipper' : 'pillow', 'fabric', x, y, w, h, { v: i }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Комната
// ---------------------------------------------------------------------------
function roomProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 380 }];
  // Мебель — крупные неразрушимые/прочные объекты.
  out.push(P(2, 'bed', 'wall', 620, 330, 520, 360));
  out.push(P(2, 'wardrobe', 'wall', 2500, 260, 420, 180));
  out.push(P(2, 'desk', 'wood', 2380, 1300, 460, 220));
  out.push(P(2, 'shelf', 'wood', 360, 1380, 360, 120));
  for (let i = 0; i < 18; i++) {
    const w = rng.range(46, 80), h = rng.range(46, 80), x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    if (free(out, x, y, w, h, keep, 12)) out.push(P(2, 'box', 'paper', x, y, w, h, { v: rng.int(0, 3) }));
  }
  for (let i = 0; i < 26; i++) {
    const w = rng.range(36, 52), h = rng.range(24, 34), x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    if (free(out, x, y, w, h, keep, 10)) out.push(P(2, 'bookStack', 'paper', x, y, w, h, { v: rng.int(0, 4) }));
  }
  for (let i = 0; i < 40; i++) {
    const sz = rng.range(12, 22), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 6)) out.push(P(2, 'toyDebris', 'plastic', x, y, sz, sz, { v: rng.int(0, 5) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4. Квартира / дом
// ---------------------------------------------------------------------------
function houseProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 380 }];
  // Стены комнат (бетон) с дверными проёмами.
  const T = 30;
  const walls: [number, number, number, number][] = [];
  const vx = [960, 1920], hy = [810];
  for (const x of vx) {
    for (let y = 0; y < s.h; y += 270) if (Math.abs(y + 135 - 810) > 150 && hash2(x, y, 5) > 0.3) walls.push([x, y + 135, T, 270]);
  }
  for (const y of hy) {
    for (let x = 0; x < s.w; x += 240) if (hash2(x, y, 6) > 0.35) walls.push([x + 120, y, 240, T]);
  }
  for (const [x, y, w, h] of walls) if (free(out, x, y, w, h, keep, 0)) out.push(P(3, 'houseWall', 'concrete', x, y, w, h));
  // Мебель.
  const furn: [string, Material, number, number][] = [['sofa', 'fabric', 260, 110], ['table', 'wood', 180, 120], ['fridge', 'metal', 110, 90], ['tvStand', 'wood', 200, 70], ['plant', 'bush', 70, 70], ['armchair', 'fabric', 100, 100], ['stove', 'metal', 100, 90]];
  for (let i = 0; i < 26; i++) {
    const [k, m, w, h] = rng.pick(furn);
    const x = rng.range(140, s.w - 140), y = rng.range(140, s.h - 140);
    if (free(out, x, y, w, h, keep, 20)) out.push(P(3, k, m, x, y, w, h, { v: rng.int(0, 3) }));
  }
  for (let i = 0; i < 30; i++) {
    const sz = rng.range(18, 30), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 6)) out.push(P(3, 'clutter', 'plastic', x, y, sz, sz, { v: rng.int(0, 5) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 5. Улицы и район
// ---------------------------------------------------------------------------
function streetProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 360 }];
  // Кварталы домов между дорогами (дороги — каждые 540 по X, 405 по Y).
  for (let bx = 0; bx < 6; bx++) for (let by = 0; by < 4; by++) {
    const x0 = bx * 480 + 70, y0 = by * 405 + 70, w = 340, h = 265;
    const n = 1 + rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const hw = rng.range(90, 150), hh = rng.range(80, 120);
      const x = x0 + rng.range(hw / 2, w - hw / 2), y = y0 + rng.range(hh / 2, h - hh / 2);
      if (free(out, x, y, hw, hh, keep, 14)) out.push(P(4, 'house', 'brick', x, y, hw, hh, { v: rng.int(0, 5) }));
    }
    for (let i = 0; i < 4; i++) {
      const x = x0 + rng.range(10, w - 10), y = y0 + rng.range(10, h - 10);
      if (free(out, x, y, 26, 26, keep, 6)) out.push(P(4, 'tree', 'bush', x, y, 26, 26, { round: true, v: rng.int(0, 3) }));
    }
  }
  // Машины на дорогах — давимые.
  for (let i = 0; i < 40; i++) {
    const horiz = rng.chance(0.5);
    const x = horiz ? rng.range(40, s.w - 40) : Math.round(rng.range(0, 6)) * 480 + 25, y = horiz ? Math.round(rng.range(0, 4)) * 405 + 30 : rng.range(40, s.h - 40);
    const w = horiz ? 24 : 12, h = horiz ? 12 : 24;
    if (free(out, x, y, w, h, keep, 4)) out.push(P(4, 'car', 'metal', x, y, w, h, { v: rng.int(0, 5), a: horiz ? 0 : 1 }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 6. Мегаполис
// ---------------------------------------------------------------------------
function megaProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 380 }];
  for (let i = 0; i < 46; i++) {
    const w = rng.range(70, 150), h = rng.range(70, 150), x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    if (free(out, x, y, w, h, keep, 40)) out.push(P(5, 'tower', i % 5 === 0 ? 'wall' : 'concrete', x, y, w, h, { v: rng.int(0, 6) }));
  }
  for (let i = 0; i < 70; i++) {
    const sz = rng.range(22, 40), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 8)) out.push(P(5, 'midrise', 'brick', x, y, sz, sz * rng.range(0.8, 1.3), { v: rng.int(0, 5) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 7. Танки-города: регион
// ---------------------------------------------------------------------------
function regionProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 360 }];
  for (let i = 0; i < 16; i++) {
    const w = rng.range(140, 260), h = rng.range(110, 200), x = rng.range(150, s.w - 150), y = rng.range(150, s.h - 150);
    if (free(out, x, y, w, h, keep, 50)) out.push(P(6, 'mountain', 'rock', x, y, w, h, { round: true, v: rng.int(0, 4) }));
  }
  for (let i = 0; i < 50; i++) {
    const sz = rng.range(26, 46), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 10)) out.push(P(6, 'cityDot', 'concrete', x, y, sz, sz, { round: true, v: rng.int(0, 4) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 8. Планета
// ---------------------------------------------------------------------------
function planetProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 360 }];
  for (let i = 0; i < 14; i++) {
    const r = rng.range(70, 140), x = rng.range(150, s.w - 150), y = rng.range(150, s.h - 150);
    if (free(out, x, y, r * 2, r * 2, keep, 40)) out.push(P(7, 'volcano', 'rock', x, y, r * 2, r * 2, { round: true, v: rng.int(0, 3) }));
  }
  for (let i = 0; i < 40; i++) {
    const r = rng.range(16, 34), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, r * 2, r * 2, keep, 10)) out.push(P(7, 'crystal', 'ice', x, y, r * 2, r * 2, { round: true, v: rng.int(0, 4) }));
  }
  return out;
}

const fuelNoise = (k: number, seed: number) => (x: number, y: number) => fbm(x * k, y * k, 2, seed);

export const STAGE_DEFS: StageDef[] = [
  {
    idx: 0, name: 'Игрушечный полигон', title: 'СТУПЕНЬ I', subtitle: 'Игрушечный полигон', w: ARENA_W, h: ARENA_H,
    relicX: ARENA_W / 2, relicY: ARENA_H / 2, boss: 'windupGeneral', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'convoy', 'swarm'],
    fuel: (x, y) => 0.25 + fuelNoise(0.004, 3)(x, y) * 0.4, props: toyProps,
  },
  {
    idx: 1, name: 'Ковёр и детская', title: 'СТУПЕНЬ II', subtitle: 'Ковёр и детская', w: ARENA_W, h: ARENA_H,
    relicX: 1340, relicY: 820, boss: 'rcTyrant', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'hq', 'marbles', 'swarm', 'convoy'],
    fuel: (x, y) => 0.75 + fuelNoise(0.003, 7)(x, y) * 0.25, props: carpetProps,
  },
  {
    idx: 2, name: 'Детская комната', title: 'СТУПЕНЬ III', subtitle: 'Вся комната целиком', w: ARENA_W, h: ARENA_H,
    relicX: 1500, relicY: 860, boss: 'vacuumLeviathan', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy'],
    fuel: (x, y) => 0.45 + fuelNoise(0.003, 9)(x, y) * 0.3, props: roomProps,
  },
  {
    idx: 3, name: 'Квартира', title: 'СТУПЕНЬ IV', subtitle: 'Квартира и дом', w: ARENA_W, h: ARENA_H,
    relicX: 1400, relicY: 520, boss: 'fridgeFortress', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'hq', 'swarm', 'convoy'],
    fuel: (x, y) => 0.35 + fuelNoise(0.003, 11)(x, y) * 0.3, props: houseProps,
  },
  {
    idx: 4, name: 'Улицы', title: 'СТУПЕНЬ V', subtitle: 'Улицы и район', w: ARENA_W, h: ARENA_H,
    relicX: 1200, relicY: 600, boss: 'roadRoller', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'convoy', 'swarm', 'hq'],
    fuel: (x, y) => 0.2 + fuelNoise(0.004, 13)(x, y) * 0.35, props: streetProps,
  },
  {
    idx: 5, name: 'Мегаполис', title: 'СТУПЕНЬ VI', subtitle: 'Мегаполис', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'skyFortress', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy'],
    fuel: (x, y) => 0.12 + fuelNoise(0.003, 15)(x, y) * 0.2, props: megaProps,
  },
  {
    idx: 6, name: 'Земли титанов', title: 'СТУПЕНЬ VII', subtitle: 'Танки размером с города', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'cityTitan', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'hq', 'swarm'],
    fuel: (x, y) => 0.3 + fuelNoise(0.002, 17)(x, y) * 0.4, props: regionProps,
  },
  {
    idx: 7, name: 'Планета', title: 'СТУПЕНЬ VIII', subtitle: 'Планетарная война', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'planetEater', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy'],
    fuel: (x, y) => 0.15 + fuelNoise(0.002, 19)(x, y) * 0.3, props: planetProps,
  },
];
