// Пространственная хеш-сетка для быстрых запросов «кто рядом».

export interface Spatial {
  x: number;
  y: number;
  r: number;
  _q: number;
}

let QUERY_STAMP = 1;

export class SpatialHash<T extends Spatial> {
  cell = 32;
  private inv = 1 / 32;
  private map = new Map<number, T[]>();
  private used: T[][] = [];

  private key(ix: number, iy: number): number {
    return ((ix + 32768) & 0xffff) | (((iy + 32768) & 0xffff) << 16);
  }

  reset(cell: number): void {
    this.cell = Math.max(1e-6, cell);
    this.inv = 1 / this.cell;
    for (const a of this.used) a.length = 0;
    this.used.length = 0;
    if (this.map.size > 4096) this.map.clear();
  }

  insert(e: T): void {
    const inv = this.inv;
    const x0 = Math.floor((e.x - e.r) * inv), x1 = Math.floor((e.x + e.r) * inv);
    const y0 = Math.floor((e.y - e.r) * inv), y1 = Math.floor((e.y + e.r) * inv);
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const k = this.key(ix, iy);
      let a = this.map.get(k);
      if (!a) { a = []; this.map.set(k, a); }
      if (a.length === 0) this.used.push(a);
      a.push(e);
    }
  }

  /** Все сущности, чьи окружности могут пересекать круг (x, y, r). Без дублей. */
  query(x: number, y: number, r: number, out: T[]): T[] {
    out.length = 0;
    const stamp = ++QUERY_STAMP;
    const inv = this.inv;
    const x0 = Math.floor((x - r) * inv), x1 = Math.floor((x + r) * inv);
    const y0 = Math.floor((y - r) * inv), y1 = Math.floor((y + r) * inv);
    // Защита от слишком больших запросов.
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096) return this.queryAll(x, y, r, out, stamp);
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const a = this.map.get(this.key(ix, iy));
      if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const e = a[i];
        if (e._q === stamp) continue;
        e._q = stamp;
        const dx = e.x - x, dy = e.y - y, rr = r + e.r;
        if (dx * dx + dy * dy <= rr * rr) out.push(e);
      }
    }
    return out;
  }

  private queryAll(x: number, y: number, r: number, out: T[], stamp: number): T[] {
    for (const a of this.used) for (const e of a) {
      if (e._q === stamp) continue;
      e._q = stamp;
      const dx = e.x - x, dy = e.y - y, rr = r + e.r;
      if (dx * dx + dy * dy <= rr * rr) out.push(e);
    }
    return out;
  }
}
