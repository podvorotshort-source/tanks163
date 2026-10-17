// Экран: два холста с целочисленным «пиксельным» увеличением.
// - мир (world): высокое разрешение (высота ~380–720 px) — детальные спрайты;
// - интерфейс (ui): низкое (высота 330–495 px) — крупный читаемый пиксельный текст.
// Интерфейс прозрачный и лежит поверх мира.

export const BASE_H = 360; // высота мира в «базовых» пикселях при масштабе камеры 1

export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly world: HTMLCanvasElement;
  readonly wctx: CanvasRenderingContext2D;
  /** Размер интерфейса (виртуальные пиксели). */
  w = 640;
  h = 360;
  /** Во сколько раз браузер увеличивает пиксель интерфейса. */
  pixel = 3;
  /** Пикселей интерфейса на «базовый» пиксель (h / BASE_H). */
  unit = 1;
  /** Размер мира (виртуальные пиксели). */
  ww = 960;
  wh = 540;
  wpixel = 2;
  /** Пикселей мира на «базовый» пиксель (wh / BASE_H). */
  wunit = 1.5;
  private listeners: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement, world: HTMLCanvasElement) {
    this.canvas = canvas;
    this.world = world;
    const ctx = canvas.getContext('2d', { alpha: true });
    const wctx = world.getContext('2d', { alpha: false });
    if (!ctx || !wctx) throw new Error('Canvas 2D недоступен');
    this.ctx = ctx;
    this.wctx = wctx;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  onResize(fn: () => void): void {
    this.listeners.push(fn);
  }

  /** Перевод пикселей мира в пиксели интерфейса. */
  get w2u(): number {
    return this.w / this.ww;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const sw = Math.max(320, Math.round(window.innerWidth * dpr)), sh = Math.max(200, Math.round(window.innerHeight * dpr));
    // Интерфейс: целый коэффициент, высота 330..~495.
    const k = Math.max(1, Math.floor(sh / 330));
    this.pixel = k;
    this.h = Math.floor(sh / k);
    this.w = Math.max(Math.floor(sw / k), Math.floor(this.h * 1.2));
    this.unit = this.h / BASE_H;
    // Мир: высота не больше ~720 (1080p → 540, 1440p → 720, 4K → 720), но не ниже интерфейса.
    const kw = Math.min(k, Math.max(1, Math.ceil(sh / 720)));
    this.wpixel = kw;
    this.wh = Math.floor(sh / kw);
    this.ww = Math.max(Math.floor(sw / kw), Math.floor(this.wh * 1.2));
    this.wunit = this.wh / BASE_H;
    const cssW = (this.w * k) / dpr, cssH = (this.h * k) / dpr;
    for (const [c, w, h] of [[this.canvas, this.w, this.h], [this.world, this.ww, this.wh]] as const) {
      c.width = w;
      c.height = h;
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
    }
    const wrap = this.canvas.parentElement;
    if (wrap) { wrap.style.width = `${cssW}px`; wrap.style.height = `${cssH}px`; }
    this.ctx.imageSmoothingEnabled = false;
    this.wctx.imageSmoothingEnabled = false;
    for (const fn of this.listeners) fn();
  }
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  return x;
}
