// Приложение: экран, цикл, стек сцен.

import { Screen } from './gfx/screen';
import { input } from './input/input';
import { beginSpriteFrame } from './gfx/sprites';

export interface Scene {
  /** dt — реальное время кадра, с. */
  update(dt: number): void;
  /** Интерфейс (низкое разрешение, прозрачный слой поверх мира). */
  render(ctx: CanvasRenderingContext2D): void;
  /** Мир (высокое разрешение). Если нет — слой мира очищается. */
  renderWorld?(wctx: CanvasRenderingContext2D): void;
  enter?(): void;
  exit?(): void;
  /** Сцена прозрачна — под ней рисуется предыдущая (для оверлеев). */
  overlay?: boolean;
  /** Имя сцены (для тестов). */
  readonly id?: string;
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
  errors = 0;
  private worldDirty = true;
  readonly perf = { update: 0, world: 0, ui: 0 };

  constructor(canvas: HTMLCanvasElement, world: HTMLCanvasElement) {
    this.screen = new Screen(canvas, world);
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
      try {
        this.frame(real);
      } catch (e) {
        // Сбой одного кадра не должен останавливать игру.
        this.errors++;
        if (this.errors < 20) console.error(e);
      }
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
    const t0 = performance.now();
    if (top) top.update(dt);
    const t1 = performance.now();
    const ctx = this.screen.ctx, wctx = this.screen.wctx;
    // Рисуем снизу вверх начиная с последней непрозрачной сцены.
    let from = this.stack.length - 1;
    while (from > 0 && this.stack[from].overlay) from--;
    let world = false;
    for (let i = from; i < this.stack.length; i++) if (this.stack[i].renderWorld) { this.stack[i].renderWorld!(wctx); world = true; }
    if (!world && this.worldDirty) { wctx.fillStyle = '#07060b'; wctx.fillRect(0, 0, this.screen.ww, this.screen.wh); }
    this.worldDirty = world;
    const t2 = performance.now();
    ctx.clearRect(0, 0, this.screen.w, this.screen.h);
    for (let i = from; i < this.stack.length; i++) this.stack[i].render(ctx);
    const t3 = performance.now();
    // Скользящее среднее времени фаз кадра (мс) — для отладки производительности.
    const p = this.perf;
    p.update += (t1 - t0 - p.update) * 0.05; p.world += (t2 - t1 - p.world) * 0.05; p.ui += (t3 - t2 - p.ui) * 0.05;
    input.endFrame();
  }
}

export let app: App;
export function setApp(a: App): void {
  app = a;
}
