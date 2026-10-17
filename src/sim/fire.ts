// Горение поверхности: сетка клеток с топливом, распространение огня.
// Огонь игроков вредит только врагам (дружественного огня нет).

import type { Rng } from '../core/rng';

export class FireGrid {
  cols: number;
  rows: number;
  /** Топливо клетки 0..1 (из материала поверхности). */
  fuel: Float32Array;
  /** Оставшееся время горения, с. */
  burn: Float32Array;
  /** Урон в секунду по врагу в клетке (уже с учётом силы танка-поджигателя). */
  dps: Float32Array;
  /** Владелец (индекс игрока). */
  owner: Int8Array;
  /** Выгоревшие клетки (для следов на земле). */
  scorched: Uint8Array;
  active: number[] = [];
  private isActive: Uint8Array;
  static MAX_ACTIVE = 900;

  constructor(public x0: number, public y0: number, w: number, h: number, public cell: number) {
    this.cols = Math.max(1, Math.ceil(w / cell));
    this.rows = Math.max(1, Math.ceil(h / cell));
    const n = this.cols * this.rows;
    this.fuel = new Float32Array(n);
    this.burn = new Float32Array(n);
    this.dps = new Float32Array(n);
    this.owner = new Int8Array(n);
    this.scorched = new Uint8Array(n);
    this.isActive = new Uint8Array(n);
  }

  fillFuel(fn: (x: number, y: number) => number): void {
    for (let cy = 0; cy < this.rows; cy++) for (let cx = 0; cx < this.cols; cx++) {
      this.fuel[cy * this.cols + cx] = fn(this.x0 + (cx + 0.5) * this.cell, this.y0 + (cy + 0.5) * this.cell);
    }
  }

  idx(x: number, y: number): number {
    const cx = Math.floor((x - this.x0) / this.cell), cy = Math.floor((y - this.y0) / this.cell);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return cy * this.cols + cx;
  }

  centerOf(i: number): [number, number] {
    return [this.x0 + ((i % this.cols) + 0.5) * this.cell, this.y0 + (Math.floor(i / this.cols) + 0.5) * this.cell];
  }

  private light(i: number, dur: number, dps: number, owner: number): void {
    if (this.burn[i] < dur) this.burn[i] = dur;
    if (this.dps[i] < dps) { this.dps[i] = dps; this.owner[i] = owner; }
    if (!this.isActive[i]) {
      if (this.active.length >= FireGrid.MAX_ACTIVE) return;
      this.isActive[i] = 1;
      this.active.push(i);
    }
  }

  /**
   * Поджечь круг. force — горит даже без топлива (напалм).
   */
  ignite(x: number, y: number, r: number, dur: number, dps: number, owner: number, force: boolean): void {
    const c = this.cell;
    const cx0 = Math.floor((x - r - this.x0) / c), cx1 = Math.floor((x + r - this.x0) / c);
    const cy0 = Math.floor((y - r - this.y0) / c), cy1 = Math.floor((y + r - this.y0) / c);
    for (let cy = Math.max(0, cy0); cy <= Math.min(this.rows - 1, cy1); cy++) {
      for (let cx = Math.max(0, cx0); cx <= Math.min(this.cols - 1, cx1); cx++) {
        const mx = this.x0 + (cx + 0.5) * c, my = this.y0 + (cy + 0.5) * c;
        if ((mx - x) ** 2 + (my - y) ** 2 > (r + c * 0.5) ** 2) continue;
        const i = cy * this.cols + cx;
        const f = this.fuel[i];
        if (!force && f < 0.05) continue;
        this.light(i, force ? dur : dur * (0.5 + f), dps, owner);
      }
    }
  }

  /**
   * Шаг горения. spread — множитель радиуса/скорости распространения.
   */
  update(dt: number, rng: Rng, spread: (owner: number) => number): void {
    const { cols, rows } = this;
    const list = this.active;
    let n = 0;
    for (let k = 0; k < list.length; k++) {
      const i = list[k];
      this.burn[i] -= dt;
      if (this.fuel[i] > 0) this.fuel[i] = Math.max(0, this.fuel[i] - dt * 0.12);
      if (this.burn[i] <= 0) {
        this.burn[i] = 0; this.dps[i] = 0; this.isActive[i] = 0;
        this.scorched[i] = 1;
        continue;
      }
      list[n++] = i;
      // Распространение на соседей с топливом.
      const s = spread(this.owner[i]);
      const cx = i % cols, cy = (i / cols) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx;
        if (this.isActive[j] || this.fuel[j] < 0.1) continue;
        if (rng.next() < this.fuel[j] * 0.4 * s * dt) this.light(j, 1.2 + this.fuel[j] * 2, this.dps[i] * 0.85, this.owner[i]);
      }
    }
    list.length = n;
  }

  /** Урон огня в точке (для врагов) и владелец. */
  at(x: number, y: number): [number, number] {
    const i = this.idx(x, y);
    if (i < 0 || this.burn[i] <= 0) return [0, -1];
    return [this.dps[i], this.owner[i]];
  }

  clear(): void {
    for (const i of this.active) { this.burn[i] = 0; this.dps[i] = 0; this.isActive[i] = 0; }
    this.active.length = 0;
  }
}
