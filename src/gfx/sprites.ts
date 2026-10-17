// Кеш растеризованных спрайтов в браузере: ленивое создание углов/кадров
// с бюджетом времени на кадр, квантование масштаба, очистка неиспользуемого.

import { TAU, wrapAngle } from '../core/math';
import { rasterize, rasterSize, type SpriteDef, type RasterMode, type PixelImage } from './raster';
import { makeCanvas } from './screen';

export const ANGLES = 32;
const SCALE_STEP = Math.log(1.045);

function toCanvas(img: PixelImage): HTMLCanvasElement {
  const c = makeCanvas(img.w, img.h);
  const x = c.getContext('2d')!;
  const id = new ImageData(new Uint8ClampedArray(img.data.buffer as ArrayBuffer, img.data.byteOffset, img.data.byteLength), img.w, img.h);
  x.putImageData(id, 0, 0);
  return c;
}

let deadline = 0;
/** Сколько растеризовано (для отладки производительности). */
export const rasterStats = { ms: 0, n: 0 };
let frameNo = 0;

export class SpriteSet {
  readonly size: number;
  readonly angles: number;
  readonly frames: number;
  private store: (HTMLCanvasElement | undefined)[][];
  lastUsed = 0;

  constructor(readonly def: SpriteDef, readonly scale: number) {
    this.size = rasterSize(def, scale);
    this.angles = def.rotates === false ? 1 : ANGLES;
    this.frames = def.frames ?? 1;
    this.store = [[], [], []];
  }

  private idx(a: number, f: number): number {
    return f * this.angles + a;
  }

  /** Холст для угла/кадра/режима; при исчерпании бюджета может вернуть ближайший готовый угол. */
  get(ai: number, frame: number, mode: RasterMode = 0): HTMLCanvasElement {
    this.lastUsed = frameNo;
    const f = frame % this.frames;
    const st = this.store[mode];
    let c = st[this.idx(ai, f)];
    if (c) return c;
    if (performance.now() > deadline) {
      // Бюджет исчерпан — ближайший уже готовый угол.
      for (let d = 1; d <= this.angles / 2; d++) {
        c = st[this.idx((ai + d) % this.angles, f)] ?? st[this.idx((ai - d + this.angles) % this.angles, f)];
        if (c) return c;
      }
    }
    const t0 = performance.now();
    c = toCanvas(rasterize(this.def, this.scale, (ai / this.angles) * TAU, f, mode, this.size));
    rasterStats.ms += performance.now() - t0;
    rasterStats.n++;
    st[this.idx(ai, f)] = c;
    return c;
  }

  angleIndex(angle: number): number {
    if (this.angles === 1) return 0;
    const a = wrapAngle(angle);
    return ((Math.round(a / (TAU / this.angles)) % this.angles) + this.angles) % this.angles;
  }

  /** Сразу растеризовать всё (для прогрева). */
  warm(modes: RasterMode[] = [0]): void {
    for (const m of modes) for (let f = 0; f < this.frames; f++) for (let a = 0; a < this.angles; a++) {
      if (!this.store[m][this.idx(a, f)]) this.store[m][this.idx(a, f)] = toCanvas(rasterize(this.def, this.scale, (a / this.angles) * TAU, f, m, this.size));
    }
  }
}

const sets = new Map<string, SpriteSet>();

export function quantScale(scale: number): number {
  const q = Math.round(Math.log(Math.max(1e-4, scale)) / SCALE_STEP);
  return Math.exp(q * SCALE_STEP);
}

/** Набор спрайтов для определения и масштаба (пикселей на модельную единицу). */
export function spriteSet(def: SpriteDef, scale: number): SpriteSet {
  const qs = quantScale(scale);
  const key = def.id + '@' + qs.toFixed(5);
  let s = sets.get(key);
  if (!s) {
    s = new SpriteSet(def, qs);
    sets.set(key, s);
  }
  return s;
}

/** Начало кадра: бюджет растеризации (мс). */
export function beginSpriteFrame(budgetMs = 5): void {
  frameNo++;
  deadline = performance.now() + budgetMs;
  if (frameNo % 600 === 0) purge(900);
}

/** Удаляет наборы, не использовавшиеся N кадров. */
export function purge(maxAge: number): void {
  for (const [k, s] of sets) if (frameNo - s.lastUsed > maxAge) sets.delete(k);
}

export function spriteStats(): { sets: number } {
  return { sets: sets.size };
}

/**
 * Рисует спрайт с центром в (x, y). `stretch` — дополнительный множитель
 * (во время анимации зума, пока не перестроен кеш нового масштаба).
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D, set: SpriteSet, x: number, y: number, angle: number,
  frame = 0, mode: RasterMode = 0, stretch = 1,
): void {
  const c = set.get(set.angleIndex(angle), frame, mode);
  if (stretch === 1) {
    ctx.drawImage(c, Math.round(x - set.size / 2), Math.round(y - set.size / 2));
  } else {
    const s = Math.max(1, Math.round(set.size * stretch));
    ctx.drawImage(c, Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  }
}
