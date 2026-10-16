// Приложение: экран, цикл, стек сцен.

import { Screen } from './gfx/screen';
import { input } from './input/input';
import { beginSpriteFrame } from './gfx/sprites';

export interface Scene {
  /** dt — реальное время кадра, с. */
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  enter?(): void;
  exit?(): void;
  /** Сцена прозрачна — под ней рисуется предыдущая (для оверлеев). */
  overlay?: boolean;
}

export class App {
  readonly screen: Screen;
  private stack: Scene[] = [];
  private last = 0;
  time = 0;
  fps = 60;
  private fpsAcc = 0;
  private fpsN = 0;
  /** Ускорение времени (только для отладки/тестов). */
  timeScale = 1;
  paused = false;

  constructor(canvas: HTMLCanvasElement) {
    this.screen = new Screen(canvas);
    input.attach(canvas, (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      return [((cx - r.left) / r.width) * this.screen.w, ((cy - r.top) / r.height) * this.screen.h];
    });
  }

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  push(s: Scene): void {
    this.stack.push(s);
    s.enter?.();
  }

  pop(): Scene | undefined {
    const s = this.stack.pop();
    s?.exit?.();
    return s;
  }

  /** Заменяет весь стек одной сценой. */
  set(s: Scene): void {
    while (this.stack.length) this.pop();
    this.push(s);
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      const real = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.frame(real);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Один кадр (вызывается циклом или тестами вручную). */
  frame(real: number): void {
    this.fpsAcc += real; this.fpsN++;
    if (this.fpsAcc >= 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }
    const dt = real * this.timeScale;
    this.time += dt;
    beginSpriteFrame(5);
    input.update(real);
    const top = this.top;
    if (top) top.update(dt);
    const ctx = this.screen.ctx;
    // Рисуем снизу вверх начиная с последней непрозрачной сцены.
    let from = this.stack.length - 1;
    while (from > 0 && this.stack[from].overlay) from--;
    for (let i = from; i < this.stack.length; i++) this.stack[i].render(ctx);
    input.endFrame();
  }
}

export let app: App;
export function setApp(a: App): void {
  app = a;
}
