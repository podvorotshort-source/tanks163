// Камера: центр в мировых координатах ступени, масштаб (пикселей на единицу), тряска.

export class Camera {
  x = 0;
  y = 0;
  /** Виртуальных пикселей на локальную единицу. */
  zoom = 1;
  shake = 0;
  sx = 0;
  sy = 0;
  w = 640;
  h = 360;
  private t = 0;

  setScreen(w: number, h: number): void {
    this.w = w; this.h = h;
  }

  update(dt: number, shakeScale = 1): void {
    this.t += dt;
    if (this.shake > 0) {
      const s = Math.min(this.shake, 14) * shakeScale;
      this.sx = Math.round((Math.sin(this.t * 71) + Math.sin(this.t * 37)) * 0.5 * s);
      this.sy = Math.round((Math.cos(this.t * 63) + Math.sin(this.t * 29)) * 0.5 * s);
      this.shake = Math.max(0, this.shake - dt * (8 + this.shake * 6));
    } else { this.sx = 0; this.sy = 0; }
  }

  addShake(v: number): void {
    this.shake = Math.min(16, Math.max(this.shake, v));
  }

  /** Мир → экран (виртуальные пиксели). */
  sxOf(wx: number): number {
    return (wx - this.x) * this.zoom + this.w / 2 + this.sx;
  }

  syOf(wy: number): number {
    return (wy - this.y) * this.zoom + this.h / 2 + this.sy;
  }

  /** Видимая область мира [x0, y0, x1, y1] с запасом m (в мировых единицах). */
  view(m = 0): [number, number, number, number] {
    const hw = this.w / 2 / this.zoom + m, hh = this.h / 2 / this.zoom + m;
    return [this.x - hw, this.y - hh, this.x + hw, this.y + hh];
  }

  visible(x: number, y: number, r: number): boolean {
    const hw = this.w / 2 / this.zoom + r, hh = this.h / 2 / this.zoom + r;
    return Math.abs(x - this.x) <= hw && Math.abs(y - this.y) <= hh;
  }
}
