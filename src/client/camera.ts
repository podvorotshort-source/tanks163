// Камера: центр в мировых координатах ступени, масштаб (пикселей на единицу), тряска.
// Проекция — изометрия 2:1 (азимут 45°, высота 30°): ось мира X уходит вправо-вниз, Y — влево-вниз,
// высота h — вверх. Та же проекция у 3D-вывода (src/iso/renderer.ts), поэтому 2D-слои (частицы,
// снаряды, подписи) ложатся точно поверх 3D-мира.

/** Экранный x на единицу (x − y). */
export const ISO_X = Math.SQRT1_2;
/** Экранный y на единицу (x + y). */
export const ISO_Y = Math.SQRT1_2 * 0.5;
/** Экранный y на единицу высоты. */
export const ISO_H = Math.cos(Math.PI / 6);

export class Camera {
  x = 0;
  y = 0;
  /** Пикселей на единицу мира. */
  zoom = 1;
  shake = 0;
  sx = 0;
  sy = 0;
  w = 640;
  h = 360;
  private t = 0;
  /** Центр, привязанный к сетке пикселей (им пользуются проекция и 3D-вывод). */
  cx = 0;
  cy = 0;

  setScreen(w: number, h: number): void {
    this.w = w; this.h = h;
  }

  update(dt: number, shakeScale = 1): void {
    this.t += dt;
    if (this.shake > 0) {
      const s = Math.min(this.shake, 14) * shakeScale * (this.h / 360);
      this.sx = Math.round((Math.sin(this.t * 71) + Math.sin(this.t * 37)) * 0.5 * s);
      this.sy = Math.round((Math.cos(this.t * 63) + Math.sin(this.t * 29)) * 0.5 * s);
      this.shake = Math.max(0, this.shake - dt * (8 + this.shake * 6));
    } else { this.sx = 0; this.sy = 0; }
    this.snap();
  }

  /** Привязать центр к целым пикселям экрана — мир не «плывёт» на полпикселя. */
  snap(): void {
    const z = this.zoom;
    const u = Math.round((this.x - this.y) * ISO_X * z), v = Math.round((this.x + this.y) * ISO_Y * z);
    const d = u / (ISO_X * z), s = v / (ISO_Y * z);
    this.cx = (s + d) / 2; this.cy = (s - d) / 2;
  }

  addShake(v: number): void {
    this.shake = Math.min(16, Math.max(this.shake, v));
  }

  /** Мир → экран (пиксели), h — высота над землёй. */
  sxOf(wx: number, wy: number): number {
    return ((wx - this.cx) - (wy - this.cy)) * ISO_X * this.zoom + this.w / 2 + this.sx;
  }

  syOf(wx: number, wy: number, h = 0): number {
    return (((wx - this.cx) + (wy - this.cy)) * ISO_Y - h * ISO_H) * this.zoom + this.h / 2 + this.sy;
  }

  /** Экран → мир (на уровне земли). */
  toWorld(px: number, py: number): [number, number] {
    const u = (px - this.w / 2 - this.sx) / (ISO_X * this.zoom), v = (py - this.h / 2 - this.sy) / (ISO_Y * this.zoom);
    return [this.cx + (u + v) / 2, this.cy + (v - u) / 2];
  }

  /** Видимая область мира [x0, y0, x1, y1] (описанный прямоугольник ромба) с запасом m. */
  view(m = 0): [number, number, number, number] {
    const hu = this.w / 2 / (ISO_X * this.zoom), hv = (this.h / 2 + 40) / (ISO_Y * this.zoom);
    const e = (hu + hv) / 2 + m;
    return [this.cx - e, this.cy - e, this.cx + e, this.cy + e];
  }

  visible(x: number, y: number, r: number): boolean {
    const sx = this.sxOf(x, y), sy = this.syOf(x, y), m = r * this.zoom + 8;
    return sx > -m && sx < this.w + m && sy > -m * 1.6 && sy < this.h + m;
  }
}
