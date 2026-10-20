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
// 1. Игрушечный полигон — лабиринт в духе «Танчиков» Dendy: стены из кирпичных и стальных блоков стоят
//    сплошной кладкой по линиям крупной сетки (комнаты 270×270), в каждой стене — проход на два блока;
//    раскладка зеркальна относительно центра арены. Кусты и пруды — акценты, у старта — свободная площадка.
// ---------------------------------------------------------------------------

/** Блок стены (как модель WALL_BLK): 6 блоков на сторону комнаты, просвет прохода — 2 блока (90 > танк 64). */
const BLK = 45;
const ROOM = 6;          // блоков на сторону комнаты
const TOY_COLS = 10, TOY_ROWS = 6;
/** Размеры кустов (как модели src/iso/models/stage0.ts BUSH_SIZES). */
const BUSH_SIZES = [30, 46, 64];

function toyProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const cx = s.w / 2, cy = s.h / 2;
  const keep = [{ x: cx, y: cy, r: 170 }];
  // Пруды — ориентиры полигона (симметрично, вдали от старта).
  for (const [dx, dy, w, h] of [[-760, -330, 230, 160], [760, 330, 230, 160], [560, -440, 170, 120], [-560, 440, 170, 120]]) {
    if (free(out, cx + dx, cy + dy, w, h, keep, 10)) out.push(P(s.idx, 'water', 'water', cx + dx, cy + dy, w, h));
  }
  const ox = (s.w - TOY_COLS * ROOM * BLK) / 2, oy = (s.h - TOY_ROWS * ROOM * BLK) / 2;
  const NI = TOY_COLS * ROOM, NJ = TOY_ROWS * ROOM;      // узлы решётки блоков: x = ox + i·BLK, y = oy + j·BLK
  const sites = new Map<number, { mat: 'brick' | 'steel'; along: number }>();
  const put = (i: number, j: number, mat: 'brick' | 'steel', along: number) => {
    // зеркально по обеим осям
    for (const [a, b] of [[i, j], [NI - i, j], [i, NJ - j], [NI - i, NJ - j]]) {
      const k = a * 1000 + b, cur = sites.get(k);
      if (!cur || (mat === 'steel' && cur.mat === 'brick')) sites.set(k, { mat, along });
    }
  };
  // Стена по стороне комнаты: from (i0, j0) вдоль оси (di, dj). Короткие куски (2–4 блока) и «пеньки» у углов —
  // в углах сходятся в Г-образные укрытия; длинных сплошных стен нет (картинка богаче, бой подвижнее).
  const wall = (i0: number, j0: number, di: number, dj: number) => {
    const r = rng.next();
    if (r < 0.22) return;                                                     // нет стены — открытая сторона
    const type = rng.next();                                                  // кирпич / сталь / кирпич со стальным торцом
    const runs: [number, number][] = [];
    if (r < 0.6) {
      runs.push([0, 1 + rng.int(0, 1)]);                                      // пенёк от одного угла
      if (rng.next() < 0.6) runs.push([ROOM - 1 - rng.int(0, 1), ROOM]);      // и от другого
    } else {
      const L = 2 + rng.int(0, 2), a = 1 + rng.int(0, ROOM - 1 - L);
      runs.push([a, a + L - 1]);                                              // кусок в середине
    }
    for (const [a, b] of runs) for (let k = a; k <= b; k++) {
      const mat = type < 0.1 ? 'steel' : type < 0.24 && k === b ? 'steel' : 'brick';
      put(i0 + di * k, j0 + dj * k, mat, dj ? 1 : 0);
    }
  };
  // Только четверть (левый верхний угол), остальное — зеркалом. Внешние границы арены — без стен.
  for (let gy = 0; gy < TOY_ROWS / 2; gy++) for (let gx = 1; gx <= TOY_COLS / 2; gx++) wall(gx * ROOM, gy * ROOM, 0, 1);    // вертикальные
  for (let gy = 1; gy <= TOY_ROWS / 2; gy++) for (let gx = 0; gx < TOY_COLS / 2; gx++) wall(gx * ROOM, gy * ROOM, 1, 0);    // горизонтальные
  // Островки: стальной «сейф» 2×2 в центре некоторых комнат.
  for (let gy = 0; gy < TOY_ROWS / 2; gy++) for (let gx = 0; gx < TOY_COLS / 2; gx++) {
    const r = rng.next(), i = gx * ROOM + ROOM / 2, j = gy * ROOM + ROOM / 2;
    if (r < 0.06) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(i - 1 + a, j - 1 + b, 'steel', 0);
  }
  for (const [k, st] of sites) {
    const i = Math.floor(k / 1000), j = k % 1000;
    const X = ox + i * BLK, Y = oy + j * BLK;
    if (X - BLK / 2 < 0 || Y - BLK / 2 < 0 || X + BLK / 2 > s.w || Y + BLK / 2 > s.h) continue;
    if (!free(out, X, Y, BLK, BLK, keep, -2)) continue;
    out.push(P(s.idx, st.mat, st.mat, X, Y, BLK, BLK, { v: st.mat === 'brick' ? st.along + 2 * (hash2(i, j, 31) * 4 | 0) : 0 }));
  }
  // Наполнение комнат (зеркально): кусты трёх размеров, бочки со взрывчаткой, ящики, игральные кубики.
  const mirror = (kind: string, mat: Material, X0: number, Y0: number, w: number, h: number, o: Partial<Prop> = {}) => {
    for (const [fx, fy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const X = cx + fx * (X0 - cx), Y = cy + fy * (Y0 - cy);
      if (free(out, X, Y, w, h, keep, 6)) out.push(P(s.idx, kind, mat, X, Y, w, h, o));
    }
  };
  for (let gy = 0; gy < TOY_ROWS / 2; gy++) for (let gx = 0; gx < TOY_COLS / 2; gx++) {
    const rx = ox + (gx + 0.5) * ROOM * BLK, ry = oy + (gy + 0.5) * ROOM * BLK, span = ROOM * BLK / 2 - BLK * 1.2;
    const spot = () => [rx + rng.range(-span, span), ry + rng.range(-span, span)];
    if (rng.next() < 0.55) {
      // куст-группа: крупный и пара мелких рядом
      const [X, Y] = spot(), big = rng.int(1, 2), sz = BUSH_SIZES[big];
      mirror('bush', 'bush', X, Y, sz, sz, { v: big + 4 * rng.int(0, 3) });
      for (let k = rng.int(0, 2); k > 0; k--) {
        const c = rng.int(0, 1), s2 = BUSH_SIZES[c], a = rng.range(0, Math.PI * 2), d = (sz + s2) * 0.5;
        mirror('bush', 'bush', X + Math.cos(a) * d, Y + Math.sin(a) * d, s2, s2, { v: c + 4 * rng.int(0, 3) });
      }
    }
    if (rng.next() < 0.4) {
      // бочки: одна–три вплотную
      const [X, Y] = spot(), n = rng.int(1, 3);
      for (let k = 0; k < n; k++) mirror('barrel', 'metal', X + (k % 2) * 23, Y + (k >> 1) * 23 + (k === 1 ? 6 : 0), 22, 22, { v: rng.int(0, 8), round: true, hp: 6, maxHp: 6 });
    }
    if (rng.next() < 0.3) {
      const [X, Y] = spot();
      mirror('woodCrate', 'wood', X, Y, 32, 32, { v: rng.int(0, 5) });
      if (rng.next() < 0.5) mirror('woodCrate', 'wood', X + 33, Y + rng.range(-6, 6), 32, 32, { v: rng.int(0, 5) });
    }
    if (rng.next() < 0.14) { const [X, Y] = spot(); mirror('dice', 'plastic', X, Y, 26, 26, { v: rng.int(0, 4) }); }
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
  for (const [x, y] of [[300, 260], [300, 1360], [2560, 240], [2580, 1380]]) out.push(P(s.idx, 'furnitureLeg', 'wall', x, y, 90, 90, { round: true }));
  // Кубики (пластик) россыпью и башенками.
  for (let i = 0; i < 70; i++) {
    const sz = rng.pick([28, 34, 40, 52]);
    const x = rng.range(80, s.w - 80), y = rng.range(80, s.h - 80);
    if (free(out, x, y, sz, sz, keep, 10)) out.push(P(s.idx, 'block', 'plastic', x, y, sz, sz, { v: rng.int(0, 5), a: 0 }));
  }
  // Карандаши (длинные), книжки.
  for (let i = 0; i < 26; i++) {
    const horiz = rng.chance(0.5);
    const L = rng.range(90, 150), T = 14;
    const x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    const w = horiz ? L : T, h = horiz ? T : L;
    if (free(out, x, y, w, h, keep, 8)) out.push(P(s.idx, 'crayon', 'wood', x, y, w, h, { v: rng.int(0, 5), a: horiz ? 0 : 1 }));
  }
  for (let i = 0; i < 10; i++) {
    const w = rng.range(110, 150), h = rng.range(80, 110);
    const x = rng.range(160, s.w - 160), y = rng.range(160, s.h - 160);
    if (free(out, x, y, w, h, keep, 14)) out.push(P(s.idx, 'book', 'paper', x, y, w, h, { v: rng.int(0, 4) }));
  }
  // Стеклянные шарики.
  for (let i = 0; i < 30; i++) {
    const d = rng.range(14, 20), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, d, d, keep, 4)) out.push(P(s.idx, 'marble', 'glass', x, y, d, d, { round: true, v: rng.int(0, 4) }));
  }
  // Тапок и подушка — мягкие преграды.
  for (let i = 0; i < 4; i++) {
    const w = rng.range(140, 180), h = rng.range(70, 90), x = rng.range(200, s.w - 200), y = rng.range(200, s.h - 200);
    if (free(out, x, y, w, h, keep, 16)) out.push(P(s.idx, i < 2 ? 'slipper' : 'pillow', 'fabric', x, y, w, h, { v: i }));
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
  out.push(P(s.idx, 'bed', 'wall', 620, 330, 520, 360));
  out.push(P(s.idx, 'wardrobe', 'wall', 2500, 260, 420, 180));
  out.push(P(s.idx, 'desk', 'wood', 2380, 1300, 460, 220));
  out.push(P(s.idx, 'shelf', 'wood', 360, 1380, 360, 120));
  for (let i = 0; i < 18; i++) {
    const w = rng.range(46, 80), h = rng.range(46, 80), x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    if (free(out, x, y, w, h, keep, 12)) out.push(P(s.idx, 'box', 'paper', x, y, w, h, { v: rng.int(0, 3) }));
  }
  for (let i = 0; i < 26; i++) {
    const w = rng.range(36, 52), h = rng.range(24, 34), x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    if (free(out, x, y, w, h, keep, 10)) out.push(P(s.idx, 'bookStack', 'paper', x, y, w, h, { v: rng.int(0, 4) }));
  }
  for (let i = 0; i < 40; i++) {
    const sz = rng.range(12, 22), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 6)) out.push(P(s.idx, 'toyDebris', 'plastic', x, y, sz, sz, { v: rng.int(0, 5) }));
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
  for (const [x, y, w, h] of walls) if (free(out, x, y, w, h, keep, 0)) out.push(P(s.idx, 'houseWall', 'concrete', x, y, w, h));
  // Мебель.
  const furn: [string, Material, number, number][] = [['sofa', 'fabric', 260, 110], ['table', 'wood', 180, 120], ['fridge', 'metal', 110, 90], ['tvStand', 'wood', 200, 70], ['plant', 'bush', 70, 70], ['armchair', 'fabric', 100, 100], ['stove', 'metal', 100, 90]];
  for (let i = 0; i < 26; i++) {
    const [k, m, w, h] = rng.pick(furn);
    const x = rng.range(140, s.w - 140), y = rng.range(140, s.h - 140);
    if (free(out, x, y, w, h, keep, 20)) out.push(P(s.idx, k, m, x, y, w, h, { v: rng.int(0, 3) }));
  }
  for (let i = 0; i < 30; i++) {
    const sz = rng.range(18, 30), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 6)) out.push(P(s.idx, 'clutter', 'plastic', x, y, sz, sz, { v: rng.int(0, 5) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 5. Улицы и район
// ---------------------------------------------------------------------------
function streetProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 360 }];
  // Сетка улиц как у земли (grounds.ts STREET): дороги по x = 480k, y = 405k, полуширина 32, тротуар 18.
  const CX = 480, CY = 405, RD = 32, WK = 18;
  for (let bx = 0; bx < 6; bx++) for (let by = 0; by < 4; by++) {
    const x0 = bx * CX + RD + WK + 6, y0 = by * CY + RD + WK + 6, w = CX - 2 * (RD + WK + 6), h = CY - 2 * (RD + WK + 6);
    // дома вдоль улиц (фасадом к дороге), во дворе — деревья, лавочки, баки
    const n = 1 + rng.int(1, 2);
    for (let i = 0; i < n; i++) {
      const hw = rng.range(110, 150), hh = rng.range(90, 115);
      const x = x0 + rng.range(hw / 2, w - hw / 2), y = y0 + (i % 2 ? h - hh / 2 - rng.range(0, 30) : hh / 2 + rng.range(0, 30));
      if (free(out, x, y, hw, hh, keep, 18)) out.push(P(s.idx, 'house', 'brick', x, y, hw, hh, { v: rng.int(0, 11) }));
    }
    for (let i = 0; i < 9; i++) {
      const x = x0 + rng.range(10, w - 10), y = y0 + rng.range(10, h - 10), d = rng.pick([24, 28, 34]);
      if (free(out, x, y, d, d, keep, 4)) out.push(P(s.idx, 'tree', 'bush', x, y, d, d, { round: true, v: rng.int(0, 5) }));
    }
    for (let i = 0; i < 2; i++) {
      const x = x0 + rng.range(30, w - 30), y = y0 + rng.range(20, h - 20);
      if (free(out, x, y, 50, 18, keep, 6)) out.push(P(s.idx, i ? 'bins' : 'bench', i ? 'metal' : 'wood', x, y, i ? 40 : 50, 18, { v: rng.int(0, 3) }));
    }
  }
  // фонари по тротуарам, остановки у перекрёстков
  for (let k = 0; k <= 6; k++) for (let y = 60 + (k % 2) * 90; y < s.h - 40; y += 200) for (const sd of [-1, 1]) {
    const x = k * CX + sd * (RD + 10);
    if (x > 8 && x < s.w - 8 && free(out, x, y, 10, 10, keep, 2)) out.push(P(s.idx, 'streetLamp', 'metal', x, y, 10, 10, { round: true }));
  }
  for (let k = 0; k <= 4; k++) for (let x = 120 + (k % 2) * 100; x < s.w - 40; x += 240) for (const sd of [-1, 1]) {
    const y = k * CY + sd * (RD + 10);
    if (y > 8 && y < s.h - 8 && free(out, x, y, 10, 10, keep, 2)) out.push(P(s.idx, 'streetLamp', 'metal', x, y, 10, 10, { round: true }));
  }
  for (let i = 0; i < 8; i++) {
    const bx = rng.int(1, 5), by = rng.int(0, 3), x = bx * CX + RD + WK + 46, y = by * CY + 180;
    if (free(out, x, y, 26, 80, keep, 6)) out.push(P(s.idx, 'busStop', 'glass', x, y, 26, 80, {}));
  }
  // машины на полосах (правостороннее движение) — давимые
  for (let i = 0; i < 46; i++) {
    const horiz = rng.chance(0.5), lane = rng.chance(0.5) ? -15 : 15;
    const x = horiz ? rng.range(40, s.w - 40) : rng.int(0, 6) * CX + lane, y = horiz ? rng.int(0, 4) * CY + lane : rng.range(40, s.h - 40);
    const w = horiz ? 26 : 13, h = horiz ? 13 : 26;
    if (free(out, x, y, w, h, keep, 6)) out.push(P(s.idx, 'car', 'metal', x, y, w, h, { v: rng.int(0, 6), a: horiz ? 0 : 1 }));
  }
  return out;
}

/** Тип квартала 0..1 по номеру клетки сетки (общий для земли — iso/grounds.ts — и препятствий). */
export function blockK(i: number, j: number, seed: number): number {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// 6. Район: проспекты 720×540, кварталы — дворы с панельками, парки с фонтаном, стройки с краном
// ---------------------------------------------------------------------------
function districtProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 420 }];
  const add = (kind: string, mat: Material, x: number, y: number, w: number, h: number, o: Partial<Prop> = {}, pad = 10) => { if (x > w / 2 && y > h / 2 && x < s.w - w / 2 && y < s.h - h / 2 && free(out, x, y, w, h, keep, pad)) out.push(P(s.idx, kind, mat, x, y, w, h, o)); };
  for (let bi = 0; bi < 4; bi++) for (let bj = 0; bj < 3; bj++) {
    const k = blockK(bi, bj, 61), x0 = bi * 720 + 44, y0 = bj * 540 + 44, W = 632, H = 452;
    if (k < 0.18) {
      add('crane', 'metal', x0 + 300, y0 + 200, 200, 30, { hp: 1e12, maxHp: 1e12 });
      add('panelHouse', 'concrete', x0 + 160, y0 + 380, 200, 56, { v: rng.int(0, 2) });
      for (let i = 0; i < 10; i++) add('woodCrate', 'wood', x0 + rng.range(40, W - 40), y0 + rng.range(40, H - 40), 32, 32, { v: rng.int(0, 5) }, 4);
    } else if (k > 0.78) {
      add('fountain', 'concrete', x0 + W / 2, y0 + H / 2, 80, 80, {});
      for (let i = 0; i < 26; i++) { const d = rng.pick([28, 34, 40]); add('tree', 'bush', x0 + rng.range(20, W - 20), y0 + rng.range(20, H - 20), d, d, { round: true, v: rng.int(0, 5) }, 6); }
      for (let i = 0; i < 4; i++) add('bench', 'wood', x0 + W / 2 + (i % 2 ? 90 : -90), y0 + H / 2 + (i < 2 ? 70 : -70), 56, 18, { v: i });
    } else {
      // двор: панельки по периметру, гаражи, деревья, машины на стоянке
      add('panelHouse', 'concrete', x0 + 150, y0 + 60, 200, 56, { v: rng.int(0, 2) });
      add('panelHouse', 'concrete', x0 + 470, y0 + 60, 200, 56, { v: rng.int(0, 2) });
      add('panelHouse', 'concrete', x0 + 60, y0 + 280, 56, 200, { v: rng.int(0, 2) });
      if (k < 0.4) add('garages', 'concrete', x0 + 520, y0 + 380, 140, 40, { v: rng.int(0, 5) });
      else add('panelHouse', 'concrete', x0 + 470, y0 + 400, 200, 56, { v: rng.int(0, 2) });
      for (let i = 0; i < 12; i++) { const d = rng.pick([24, 30, 36]); add('tree', 'bush', x0 + rng.range(110, W - 40), y0 + rng.range(110, H - 60), d, d, { round: true, v: rng.int(0, 5) }, 4); }
      for (let i = 0; i < 6; i++) add('car', 'metal', x0 + 300 + i * 30, y0 + 130, 13, 26, { v: rng.int(0, 6), a: 1 }, 2);
      add('bench', 'wood', x0 + 200, y0 + 150, 50, 18, { v: rng.int(0, 2) });
      add('bins', 'metal', x0 + 260, y0 + 300, 40, 18, { v: rng.int(0, 2) });
    }
  }
  // машины на проспектах
  for (let i = 0; i < 30; i++) {
    const horiz = rng.chance(0.5), lane = rng.chance(0.5) ? -12 : 12;
    const x = horiz ? rng.range(40, s.w - 40) : rng.int(0, 4) * 720 + lane, y = horiz ? rng.int(0, 3) * 540 + lane : rng.range(40, s.h - 40);
    add('car', 'metal', x, y, horiz ? 26 : 13, horiz ? 13 : 26, { v: rng.int(0, 6), a: horiz ? 0 : 1 }, 6);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 7. Город: сетка 360×270, кварталы — плотная застройка (небоскрёбы, среднеэтажки), площади с фонтанами, скверы
// ---------------------------------------------------------------------------
function cityProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 420 }];
  const add = (kind: string, mat: Material, x: number, y: number, w: number, h: number, o: Partial<Prop> = {}, pad = 8) => { if (x > w / 2 && y > h / 2 && x < s.w - w / 2 && y < s.h - h / 2 && free(out, x, y, w, h, keep, pad)) out.push(P(s.idx, kind, mat, x, y, w, h, o)); };
  for (let bi = 0; bi < 8; bi++) for (let bj = 0; bj < 6; bj++) {
    const k = blockK(bi, bj, 72), cx = bi * 360 + 180, cy = bj * 270 + 135;
    // бульвар по диагонали арены — без домов
    const t = Math.max(0, Math.min(1, (cx * 2880 + cy * 1620) / (2880 * 2880 + 1620 * 1620)));
    if (Math.hypot(cx - 2880 * t, cy - 1620 * t) < 120) { for (let i = 0; i < 4; i++) add('tree', 'bush', cx + rng.range(-120, 120), cy + rng.range(-80, 80), 30, 30, { round: true, v: rng.int(0, 2) }, 4); continue; }
    if (k < 0.14) { add('fountain', 'concrete', cx, cy, 80, 80, {}); for (const [dx, dy] of [[-110, -70], [110, -70], [-110, 70], [110, 70]]) add('streetLamp', 'metal', cx + dx, cy + dy, 10, 10, { round: true }); }
    else if (k > 0.86) { for (let i = 0; i < 9; i++) add('tree', 'bush', cx + rng.range(-140, 140), cy + rng.range(-100, 100), 34, 34, { round: true, v: rng.int(0, 5) }, 4); add('bench', 'wood', cx, cy + 40, 50, 18, { v: rng.int(0, 2) }); }
    else if (k > 0.6) add('tower', 'concrete', cx + rng.range(-40, 40), cy + rng.range(-20, 20), 120, 120, { v: rng.int(0, 5) }, 20);
    else {
      const n = 2 + rng.int(0, 2);
      for (let i = 0; i < n; i++) add('midrise', 'brick', cx + (i % 2 ? 70 : -70) + rng.range(-10, 10), cy + (i < 2 ? -50 : 50) + rng.range(-8, 8), 80, 80, { v: rng.int(0, 5) }, 10);
    }
  }
  for (let i = 0; i < 40; i++) {
    const horiz = rng.chance(0.5), lane = rng.chance(0.5) ? -8 : 8;
    const x = horiz ? rng.range(40, s.w - 40) : rng.int(0, 8) * 360 + lane, y = horiz ? rng.int(0, 6) * 270 + lane : rng.range(40, s.h - 40);
    add('car', 'metal', x, y, horiz ? 20 : 10, horiz ? 10 : 20, { v: rng.int(0, 6), a: horiz ? 0 : 1 }, 4);
  }
  return out;
}

// ---------------------------------------------------------------------------
// (прежний) Мегаполис
// ---------------------------------------------------------------------------
function megaProps(rng: Rng, s: StageDef): Prop[] {
  const out: Prop[] = [];
  const keep = [{ x: s.relicX, y: s.relicY, r: 380 }];
  for (let i = 0; i < 46; i++) {
    const w = rng.range(70, 150), h = rng.range(70, 150), x = rng.range(100, s.w - 100), y = rng.range(100, s.h - 100);
    if (free(out, x, y, w, h, keep, 40)) out.push(P(s.idx, 'tower', i % 5 === 0 ? 'wall' : 'concrete', x, y, w, h, { v: rng.int(0, 6) }));
  }
  for (let i = 0; i < 70; i++) {
    const sz = rng.range(22, 40), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 8)) out.push(P(s.idx, 'midrise', 'brick', x, y, sz, sz * rng.range(0.8, 1.3), { v: rng.int(0, 5) }));
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
    if (free(out, x, y, w, h, keep, 50)) out.push(P(s.idx, 'mountain', 'rock', x, y, w, h, { round: true, v: rng.int(0, 4) }));
  }
  for (let i = 0; i < 50; i++) {
    const sz = rng.range(26, 46), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, sz, sz, keep, 10)) out.push(P(s.idx, 'cityDot', 'concrete', x, y, sz, sz, { round: true, v: rng.int(0, 4) }));
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
    if (free(out, x, y, r * 2, r * 2, keep, 40)) out.push(P(s.idx, 'volcano', 'rock', x, y, r * 2, r * 2, { round: true, v: rng.int(0, 3) }));
  }
  for (let i = 0; i < 40; i++) {
    const r = rng.range(16, 34), x = rng.range(60, s.w - 60), y = rng.range(60, s.h - 60);
    if (free(out, x, y, r * 2, r * 2, keep, 10)) out.push(P(s.idx, 'crystal', 'ice', x, y, r * 2, r * 2, { round: true, v: rng.int(0, 4) }));
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
    fuel: (x, y) => 0.45 + fuelNoise(0.003, 7)(x, y) * 0.3, props: carpetProps,
  },
  {
    idx: 2, name: 'Комната', title: 'СТУПЕНЬ III', subtitle: 'Вся комната целиком', w: ARENA_W, h: ARENA_H,
    relicX: 1500, relicY: 860, boss: 'vacuumLeviathan', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy'],
    fuel: (x, y) => 0.45 + fuelNoise(0.003, 9)(x, y) * 0.3, props: roomProps,
  },
  {
    idx: 3, name: 'Квартира', title: 'СТУПЕНЬ IV', subtitle: 'Вся квартира', w: ARENA_W, h: ARENA_H,
    relicX: 1400, relicY: 520, boss: 'fridgeFortress', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'hq', 'swarm', 'convoy'],
    fuel: (x, y) => 0.35 + fuelNoise(0.003, 11)(x, y) * 0.3, props: houseProps,
  },
  {
    idx: 4, name: 'Улицы', title: 'СТУПЕНЬ V', subtitle: 'Улицы и дворы', w: ARENA_W, h: ARENA_H,
    relicX: 1200, relicY: 600, boss: 'commandarm', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'convoy', 'swarm', 'hq'],
    fuel: (x, y) => 0.2 + fuelNoise(0.004, 13)(x, y) * 0.35, props: streetProps,
  },
  {
    idx: 5, name: 'Район', title: 'СТУПЕНЬ VI', subtitle: 'Район', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'mole', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy'],
    fuel: (x, y) => 0.18 + fuelNoise(0.003, 14)(x, y) * 0.3, props: districtProps,
  },
  {
    idx: 6, name: 'Город', title: 'СТУПЕНЬ VII', subtitle: 'Город', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'skyFortress', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy'],
    fuel: (x, y) => 0.12 + fuelNoise(0.003, 15)(x, y) * 0.2, props: cityProps,
  },
  {
    idx: 7, name: 'Страна', title: 'СТУПЕНЬ VIII', subtitle: 'Страна', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'groza', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy', 'hq'],
    fuel: (x, y) => 0.4 + fuelNoise(0.002, 16)(x, y) * 0.4, props: regionProps,
  },
  {
    idx: 8, name: 'Континенты', title: 'СТУПЕНЬ IX', subtitle: 'Континенты', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'cityTitan', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'hq', 'swarm'],
    fuel: (x, y) => 0.3 + fuelNoise(0.002, 17)(x, y) * 0.4, props: regionProps,
  },
  {
    idx: 9, name: 'Планеты', title: 'СТУПЕНЬ X', subtitle: 'Планеты', w: ARENA_W, h: ARENA_H,
    relicX: 1440, relicY: 810, boss: 'planetEater', bossAt: 345, diff: 1,
    events: ['eliteSquad', 'supply', 'barrage', 'swarm', 'convoy'],
    fuel: (x, y) => 0.15 + fuelNoise(0.002, 19)(x, y) * 0.3, props: planetProps,
  },
];
