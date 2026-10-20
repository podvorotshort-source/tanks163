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
  /** Слой высокой чёткости поверх интерфейса (размер как у мира): иконки и витрины из внешней графики. */
  readonly hi: HTMLCanvasElement;
  readonly hctx: CanvasRenderingContext2D;
  /** Холст 3D-мира (изометрия), того же низкого разрешения, что и мир. */
  readonly gl: HTMLCanvasElement;
  /** В этом кадре что-то рисовали в слой hi (иначе его не надо чистить). */
  hiUsed = false;
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

  constructor(canvas: HTMLCanvasElement, world: HTMLCanvasElement, hi: HTMLCanvasElement, gl: HTMLCanvasElement) {
    this.canvas = canvas;
    this.world = world;
    this.hi = hi;
    this.gl = gl;
    const ctx = canvas.getContext('2d', { alpha: true });
    const wctx = world.getContext('2d', { alpha: true });
    const hctx = hi.getContext('2d', { alpha: true });
    if (!ctx || !wctx || !hctx) throw new Error('Canvas 2D недоступен');
    this.ctx = ctx;
    this.wctx = wctx;
    this.hctx = hctx;
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
    // Панель инструмента настройки (?dev=tune) занимает место слева.
    const panel = document.getElementById('tune')?.offsetWidth ?? 0;
    const sw = Math.max(320, Math.round((window.innerWidth - panel) * dpr)), sh = Math.max(200, Math.round(window.innerHeight * dpr));
    // Мир (изометрический пиксель-арт): пиксель мира = целое число пикселей экрана, ~540 строк
    // (1080p → 540, 1440p → 480, 4K → 540): камера отдалена, чтобы двое игроков помещались в один кадр.
    // Чётные размеры — центр кадра на границе пикселей.
    const kw = Math.max(1, Math.round(sh / 540));
    this.wpixel = kw;
    this.wh = Math.floor(sh / kw) & ~1;
    this.ww = Math.max(Math.floor(sw / kw), Math.floor(this.wh * 1.2)) & ~1;
    this.wunit = this.wh / BASE_H;
    // Интерфейс: целый коэффициент, высота 330..~495, растянут на ту же область, что и мир.
    const k = Math.max(1, Math.floor(sh / 330));
    this.pixel = k;
    this.h = Math.round((this.wh * kw) / k);
    this.w = Math.round((this.ww * kw) / k);
    this.unit = this.h / BASE_H;
    const cssW = (this.ww * kw) / dpr, cssH = (this.wh * kw) / dpr;
    for (const [c, w, h] of [[this.canvas, this.w, this.h], [this.world, this.ww, this.wh], [this.hi, this.ww, this.wh], [this.gl, 0, 0]] as const) {
      if (!w) { c.style.width = `${cssW}px`; c.style.height = `${cssH}px`; continue; }
      c.width = w;
      c.height = h;
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
    }
    const wrap = this.canvas.parentElement;
    if (wrap) { wrap.style.width = `${cssW}px`; wrap.style.height = `${cssH}px`; }
    this.ctx.imageSmoothingEnabled = false;
    this.wctx.imageSmoothingEnabled = false;
    this.hctx.imageSmoothingEnabled = false;
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
