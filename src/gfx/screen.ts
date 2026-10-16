// Экран: виртуальное низкое разрешение с целочисленным увеличением.
// Высота виртуального экрана 330–495 px; вся игра рисуется в него,
// браузер увеличивает «пиксельно» через CSS.

export const BASE_H = 360; // высота мира в «базовых» пикселях при масштабе камеры 1

export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  w = 640;
  h = 360;
  /** Во сколько раз браузер увеличивает виртуальный пиксель. */
  pixel = 3;
  /** Сколько виртуальных пикселей приходится на «базовый» пиксель (h / BASE_H). */
  unit = 1;
  private listeners: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D недоступен');
    this.ctx = ctx;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  onResize(fn: () => void): void {
    this.listeners.push(fn);
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const sw = Math.max(320, window.innerWidth * dpr), sh = Math.max(200, window.innerHeight * dpr);
    // Целый коэффициент так, чтобы виртуальная высота была 330..~495.
    let k = Math.max(1, Math.floor(sh / 330));
    if (sh / k > 500 && k > 1) k += 0;
    this.pixel = k;
    this.h = Math.floor(sh / k);
    this.w = Math.floor(sw / k);
    // Слишком узкие экраны — ограничиваем соотношение.
    this.w = Math.max(this.w, Math.floor(this.h * 1.2));
    this.unit = this.h / BASE_H;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = `${(this.w * k) / dpr}px`;
    this.canvas.style.height = `${(this.h * k) / dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
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
