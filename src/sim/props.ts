// Препятствия (статичные объекты мира): материалы, прочность, коллизии,
// лучи для снарядов. Хранятся в статической сетке.

import type { DmgType } from './types';

export type Material =
  | 'brick' | 'steel' | 'concrete' | 'wood' | 'plastic' | 'glass' | 'fabric'
  | 'bush' | 'water' | 'rock' | 'metal' | 'paper' | 'ice' | 'wall';

export interface MatInfo {
  /** Множитель прочности. */
  hp: number;
  /** Блокирует движение наземных. */
  move: boolean;
  /** Блокирует снаряды. */
  shots: boolean;
  /** Горючесть 0..1. */
  burn: number;
  /** Множители урона по типам (по умолчанию 1). */
  res?: Partial<Record<DmgType, number>>;
  /** Неразрушимый. */
  solid?: boolean;
  /** Скрывает юнитов под собой (кусты, кроны). */
  canopy?: boolean;
}

export const MATS: Record<Material, MatInfo> = {
  brick: { hp: 2.4, move: true, shots: true, burn: 0, res: { he: 2, rocket: 1.8, mg: 0.6, fire: 0.1 } },
  steel: { hp: 7, move: true, shots: true, burn: 0, res: { mg: 0.05, fire: 0, tesla: 0.1, he: 0.7, ap: 1.4 } },
  concrete: { hp: 9, move: true, shots: true, burn: 0, res: { mg: 0.15, fire: 0, he: 1.6, rocket: 1.5 } },
  wood: { hp: 2, move: true, shots: true, burn: 0.8, res: { fire: 2.5, he: 1.6 } },
  plastic: { hp: 1.6, move: true, shots: true, burn: 0.5, res: { fire: 2, he: 1.5 } },
  glass: { hp: 0.5, move: true, shots: true, burn: 0, res: { fire: 0.2 } },
  fabric: { hp: 2.4, move: true, shots: true, burn: 1, res: { fire: 3, mg: 0.5, ap: 0.4 } },
  paper: { hp: 0.8, move: true, shots: true, burn: 1, res: { fire: 4 } },
  bush: { hp: 0.6, move: false, shots: false, burn: 0.9, canopy: true, res: { fire: 3 } },
  water: { hp: 1, move: true, shots: false, burn: 0, solid: true },
  ice: { hp: 3, move: true, shots: true, burn: 0, res: { fire: 4, mg: 0.4 } },
  rock: { hp: 14, move: true, shots: true, burn: 0, res: { mg: 0.05, fire: 0, he: 1.3, ap: 0.8 } },
  metal: { hp: 5, move: true, shots: true, burn: 0, res: { mg: 0.15, fire: 0.2, ap: 1.3 } },
  wall: { hp: 1, move: true, shots: true, burn: 0, solid: true },
};

export interface Prop {
  id: number;
  /** Визуальный тип (ключ спрайта). */
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Круглое препятствие (радиус = w/2). */
  round: boolean;
  mat: Material;
  hp: number;
  maxHp: number;
  /** Характерный размер (для давки). */
  size: number;
  dead: boolean;
  /** Вариант оформления. */
  v: number;
  /** Угол оформления (только визуально). */
  a: number;
  /** Временное (стены лопаты) — время жизни, с. */
  ttl?: number;
  /** Пропускает снаряды игроков (союзные стены). */
  friendly?: boolean;
  _q: number;
}

let NEXT_ID = 1;

export function makeProp(kind: string, mat: Material, x: number, y: number, w: number, h: number, hp: number, o: Partial<Prop> = {}): Prop {
  return {
    id: NEXT_ID++, kind, x, y, w, h, round: false, mat, hp, maxHp: hp, size: Math.max(w, h), dead: false,
    v: 0, a: 0, _q: 0, ...o,
  };
}

let STAMP = 1;

export class PropWorld {
  props: Prop[] = [];
  readonly cell: number;
  private grid = new Map<number, Prop[]>();
  /** Счётчик изменений — для перерисовки слоёв клиентом. */
  version = 0;

  constructor(cell: number) {
    this.cell = cell;
  }

  private key(ix: number, iy: number): number {
    return ((ix + 32768) & 0xffff) | (((iy + 32768) & 0xffff) << 16);
  }

  add(p: Prop): void {
    this.props.push(p);
    const c = this.cell;
    const x0 = Math.floor((p.x - p.w / 2) / c), x1 = Math.floor((p.x + p.w / 2) / c);
    const y0 = Math.floor((p.y - p.h / 2) / c), y1 = Math.floor((p.y + p.h / 2) / c);
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const k = this.key(ix, iy);
      let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); }
      a.push(p);
    }
    this.version++;
  }

  remove(p: Prop): void {
    p.dead = true;
    const c = this.cell;
    const x0 = Math.floor((p.x - p.w / 2) / c), x1 = Math.floor((p.x + p.w / 2) / c);
    const y0 = Math.floor((p.y - p.h / 2) / c), y1 = Math.floor((p.y + p.h / 2) / c);
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const a = this.grid.get(this.key(ix, iy));
      if (!a) continue;
      const i = a.indexOf(p);
      if (i >= 0) { a[i] = a[a.length - 1]; a.pop(); }
    }
    this.version++;
  }

  /** Удаляет мёртвые из общего массива (редко). */
  compact(): void {
    this.props = this.props.filter(p => !p.dead);
  }

  /** Все живые препятствия, пересекающие прямоугольник. */
  queryRect(x0: number, y0: number, x1: number, y1: number, out: Prop[]): Prop[] {
    out.length = 0;
    const stamp = ++STAMP, c = this.cell;
    const ix0 = Math.floor(x0 / c), ix1 = Math.floor(x1 / c), iy0 = Math.floor(y0 / c), iy1 = Math.floor(y1 / c);
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
      const a = this.grid.get(this.key(ix, iy));
      if (!a) continue;
      for (const p of a) {
        if (p._q === stamp || p.dead) continue;
        p._q = stamp;
        if (p.x + p.w / 2 < x0 || p.x - p.w / 2 > x1 || p.y + p.h / 2 < y0 || p.y - p.h / 2 > y1) continue;
        out.push(p);
      }
    }
    return out;
  }

  /** Препятствия, пересекающие круг. */
  queryCircle(x: number, y: number, r: number, out: Prop[]): Prop[] {
    this.queryRect(x - r, y - r, x + r, y + r, out);
    let n = 0;
    for (const p of out) if (circleHitsProp(x, y, r, p)) out[n++] = p;
    out.length = n;
    return out;
  }

  /**
   * Первое препятствие на отрезке, блокирующее снаряды (или движение, если move).
   * Возвращает параметр t∈[0,1] и препятствие.
   */
  raycast(x1: number, y1: number, x2: number, y2: number, rad: number, filter: (p: Prop) => boolean): { t: number; p: Prop } | null {
    const c = this.cell;
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / c));
    const stamp = ++STAMP;
    let best: Prop | null = null, bt = 2;
    for (let s = 0; s <= steps; s++) {
      const px = x1 + (dx * s) / steps, py = y1 + (dy * s) / steps;
      const ix0 = Math.floor((px - rad) / c), ix1 = Math.floor((px + rad) / c);
      const iy0 = Math.floor((py - rad) / c), iy1 = Math.floor((py + rad) / c);
      for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
        const a = this.grid.get(this.key(ix, iy));
        if (!a) continue;
        for (const p of a) {
          if (p._q === stamp || p.dead) continue;
          p._q = stamp;
          if (!filter(p)) continue;
          const t = segVsProp(x1, y1, x2, y2, rad, p);
          if (t >= 0 && t < bt) { bt = t; best = p; }
        }
      }
      if (best && bt <= (s + 1) / steps) break;
    }
    return best ? { t: bt, p: best } : null;
  }
}

export function circleHitsProp(x: number, y: number, r: number, p: Prop): boolean {
  if (p.round) {
    const rr = r + p.w / 2;
    return (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) < rr * rr;
  }
  const qx = Math.max(p.x - p.w / 2, Math.min(x, p.x + p.w / 2));
  const qy = Math.max(p.y - p.h / 2, Math.min(y, p.y + p.h / 2));
  return (x - qx) * (x - qx) + (y - qy) * (y - qy) < r * r;
}

/** Выталкивание круга из препятствия: вектор сдвига или null. */
export function pushOut(x: number, y: number, r: number, p: Prop): [number, number] | null {
  if (p.round) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy), rr = r + p.w / 2;
    if (d >= rr) return null;
    if (d < 1e-6) return [rr, 0];
    return [(dx / d) * (rr - d), (dy / d) * (rr - d)];
  }
  const hw = p.w / 2, hh = p.h / 2;
  const qx = Math.max(p.x - hw, Math.min(x, p.x + hw));
  const qy = Math.max(p.y - hh, Math.min(y, p.y + hh));
  const dx = x - qx, dy = y - qy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return [(dx / d) * (r - d), (dy / d) * (r - d)];
  }
  // Центр внутри — выталкиваем по кратчайшей оси.
  const ox = x - p.x, oy = y - p.y;
  const px = hw + r - Math.abs(ox), py = hh + r - Math.abs(oy);
  return px < py ? [Math.sign(ox || 1) * px, 0] : [0, Math.sign(oy || 1) * py];
}

/** Пересечение отрезка (с толщиной rad) с препятствием — параметр t или -1. */
function segVsProp(x1: number, y1: number, x2: number, y2: number, rad: number, p: Prop): number {
  if (p.round) {
    const r = p.w / 2 + rad;
    const dx = x2 - x1, dy = y2 - y1, fx = x1 - p.x, fy = y1 - p.y;
    const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    if (a < 1e-12) return -1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
  }
  // Slab-метод для расширенного прямоугольника.
  const minX = p.x - p.w / 2 - rad, maxX = p.x + p.w / 2 + rad;
  const minY = p.y - p.h / 2 - rad, maxY = p.y + p.h / 2 + rad;
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  if (Math.abs(dx) < 1e-12) { if (x1 < minX || x1 > maxX) return -1; } else {
    let ta = (minX - x1) / dx, tb = (maxX - x1) / dx;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return -1;
  }
  if (Math.abs(dy) < 1e-12) { if (y1 < minY || y1 > maxY) return -1; } else {
    let ta = (minY - y1) / dy, tb = (maxY - y1) / dy;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return -1;
  }
  return t0;
}
