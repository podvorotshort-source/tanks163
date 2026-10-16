// Поле потоков для наземных врагов: BFS от игроков по сетке проходимости.

import type { PropWorld } from './props';
import { MATS } from './props';

export class NavGrid {
  cols: number;
  rows: number;
  blocked: Uint8Array;
  dist: Uint16Array;
  dirX: Float32Array;
  dirY: Float32Array;
  private queue: Int32Array;
  private builtVersion = -1;

  constructor(public x0: number, public y0: number, public w: number, public h: number, public cell: number) {
    this.cols = Math.max(1, Math.ceil(w / cell));
    this.rows = Math.max(1, Math.ceil(h / cell));
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n);
    this.dist = new Uint16Array(n).fill(65535);
    this.dirX = new Float32Array(n);
    this.dirY = new Float32Array(n);
    this.queue = new Int32Array(n);
  }

  idx(x: number, y: number): number {
    const cx = Math.floor((x - this.x0) / this.cell), cy = Math.floor((y - this.y0) / this.cell);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return cy * this.cols + cx;
  }

  /** Пересчитать проходимость по препятствиям (если они изменились). */
  rebuildBlocked(props: PropWorld): void {
    if (props.version === this.builtVersion) return;
    this.builtVersion = props.version;
    this.blocked.fill(0);
    const c = this.cell;
    for (const p of props.props) {
      if (p.dead || !MATS[p.mat].move) continue;
      const cx0 = Math.max(0, Math.floor((p.x - p.w / 2 - this.x0) / c));
      const cx1 = Math.min(this.cols - 1, Math.floor((p.x + p.w / 2 - this.x0) / c));
      const cy0 = Math.max(0, Math.floor((p.y - p.h / 2 - this.y0) / c));
      const cy1 = Math.min(this.rows - 1, Math.floor((p.y + p.h / 2 - this.y0) / c));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const mx = this.x0 + (cx + 0.5) * c, my = this.y0 + (cy + 0.5) * c;
        // Клетка закрыта, если центр внутри (с небольшим запасом).
        if (p.round) {
          const r = p.w / 2 + c * 0.2;
          if ((mx - p.x) ** 2 + (my - p.y) ** 2 > r * r) continue;
        } else if (Math.abs(mx - p.x) > p.w / 2 + c * 0.2 || Math.abs(my - p.y) > p.h / 2 + c * 0.2) continue;
        this.blocked[cy * this.cols + cx] = 1;
      }
    }
  }

  /** BFS от источников (игроков). */
  compute(sources: { x: number; y: number }[]): void {
    const { cols, rows, blocked, dist, queue } = this;
    dist.fill(65535);
    let qh = 0, qt = 0;
    for (const s of sources) {
      const i = this.idx(s.x, s.y);
      if (i < 0) continue;
      dist[i] = 0;
      queue[qt++] = i;
    }
    while (qh < qt) {
      const i = queue[qh++];
      const d = dist[i] + 1;
      const cx = i % cols, cy = (i / cols) | 0;
      if (cx > 0) { const j = i - 1; if (!blocked[j] && dist[j] > d) { dist[j] = d; queue[qt++] = j; } }
      if (cx < cols - 1) { const j = i + 1; if (!blocked[j] && dist[j] > d) { dist[j] = d; queue[qt++] = j; } }
      if (cy > 0) { const j = i - cols; if (!blocked[j] && dist[j] > d) { dist[j] = d; queue[qt++] = j; } }
      if (cy < rows - 1) { const j = i + cols; if (!blocked[j] && dist[j] > d) { dist[j] = d; queue[qt++] = j; } }
    }
    // Направления — к соседу (из 8) с наименьшей дистанцией, без срезания углов.
    const { dirX, dirY } = this;
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      dirX[i] = 0; dirY[i] = 0;
      if (dist[i] === 65535 || dist[i] === 0) continue;
      let best = dist[i], bx = 0, by = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = cx + ox, ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx;
        if (blocked[j]) continue;
        if (ox && oy && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
        const dj = dist[j] + (ox && oy ? 0.41 : 0);
        if (dj < best) { best = dj; bx = ox; by = oy; }
      }
      const l = Math.hypot(bx, by) || 1;
      dirX[i] = bx / l; dirY[i] = by / l;
    }
  }

  /** Направление потока в точке (0,0 — нет пути или рядом с целью). */
  dirAt(x: number, y: number): [number, number, number] {
    const i = this.idx(x, y);
    if (i < 0) return [0, 0, 65535];
    return [this.dirX[i], this.dirY[i], this.dist[i]];
  }

  isBlocked(x: number, y: number): boolean {
    const i = this.idx(x, y);
    return i < 0 || this.blocked[i] === 1;
  }
}
