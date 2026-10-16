// Слой поверхности: куски 128×128 пикселей, запечённые при квантованном
// масштабе (пиксели всегда чёткие), декали (воронки, гарь, обломки),
// снимок прежней арены («реликвия») внутри нового мира.

import { groundAt } from '../gfx/art/ground';
import { makeCanvas } from '../gfx/screen';
import { hash2 } from '../core/math';
import { hexToRgb } from '../gfx/palette';
import type { Camera } from './camera';

const CHUNK = 128;
const ZSTEP = Math.log(1.12);

interface Chunk {
  c: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zq: number;
  cx: number;
  cy: number;
  used: number;
}

export type DecalKind = 'crater' | 'scorch' | 'rubble' | 'burn' | 'oil' | 'track' | 'splat';

export interface Decal {
  x: number;
  y: number;
  r: number;
  kind: DecalKind;
  col: string;
  seed: number;
  a: number;
}

export interface Relic {
  canvas: HTMLCanvasElement;
  x0: number;
  y0: number;
  w: number;
  h: number;
}

export class GroundLayer {
  stage = 0;
  private chunks = new Map<string, Chunk>();
  private decals: Decal[] = [];
  private frame = 0;
  relic: Relic | null = null;
  lastZq = 1;
  /** Сколько кусков ещё не запечено (для отладки и прелоада). */
  pending = 0;

  reset(stage: number, relic: Relic | null): void {
    this.stage = stage;
    this.chunks.clear();
    this.decals = [];
    this.relic = relic;
  }

  quant(zoom: number): number {
    return Math.exp(Math.round(Math.log(zoom) / ZSTEP) * ZSTEP);
  }

  private key(zq: number, cx: number, cy: number): string {
    return `${zq.toFixed(5)}:${cx}:${cy}`;
  }

  private bake(zq: number, cx: number, cy: number): Chunk {
    const c = makeCanvas(CHUNK, CHUNK);
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const img = ctx.createImageData(CHUNK, CHUNK);
    const d = new Uint32Array(img.data.buffer);
    const cw = CHUNK / zq;
    const x0 = cx * cw, y0 = cy * cw, step = 1 / zq;
    let i = 0;
    for (let j = 0; j < CHUNK; j++) {
      const wy = y0 + (j + 0.5) * step;
      for (let k = 0; k < CHUNK; k++) d[i++] = groundAt(this.stage, x0 + (k + 0.5) * step, wy, zq);
    }
    ctx.putImageData(img, 0, 0);
    const ch: Chunk = { c, ctx, zq, cx, cy, used: this.frame };
    // Реликвия — прежняя арена.
    const r = this.relic;
    if (r && x0 < r.x0 + r.w && x0 + cw > r.x0 && y0 < r.y0 + r.h && y0 + cw > r.y0) {
      ctx.drawImage(r.canvas, (r.x0 - x0) * zq, (r.y0 - y0) * zq, r.w * zq, r.h * zq);
    }
    for (const dc of this.decals) if (overlaps(dc, x0, y0, cw)) drawDecal(ch, dc);
    this.chunks.set(this.key(zq, cx, cy), ch);
    return ch;
  }

  addDecal(d: Decal): void {
    this.decals.push(d);
    if (this.decals.length > 2400) this.decals.splice(0, 400);
    for (const ch of this.chunks.values()) {
      const cw = CHUNK / ch.zq;
      if (overlaps(d, ch.cx * cw, ch.cy * cw, cw)) drawDecal(ch, d);
    }
  }

  /** Запечь видимые куски синхронно (при старте ступени, под затемнением). */
  prewarm(cam: Camera, zoom: number): void {
    const zq = this.quant(zoom);
    const cw = CHUNK / zq;
    const hw = cam.w / 2 / zoom + cw, hh = cam.h / 2 / zoom + cw;
    for (let cy = Math.floor((cam.y - hh) / cw); cy <= Math.floor((cam.y + hh) / cw); cy++)
      for (let cx = Math.floor((cam.x - hw) / cw); cx <= Math.floor((cam.x + hw) / cw); cx++)
        if (!this.chunks.has(this.key(zq, cx, cy))) this.bake(zq, cx, cy);
    this.lastZq = zq;
  }

  /** Частичный прогрев (в пределах бюджета времени) — для кинематографичных пауз. */
  prewarmStep(cam: Camera, zoom: number, budgetMs: number): void {
    const zq = this.quant(zoom);
    const cw = CHUNK / zq;
    const hw = cam.w / 2 / zoom + cw, hh = cam.h / 2 / zoom + cw;
    const end = performance.now() + budgetMs;
    for (let cy = Math.floor((cam.y - hh) / cw); cy <= Math.floor((cam.y + hh) / cw); cy++)
      for (let cx = Math.floor((cam.x - hw) / cw); cx <= Math.floor((cam.x + hw) / cw); cx++) {
        if (performance.now() > end) return;
        if (!this.chunks.has(this.key(zq, cx, cy))) this.bake(zq, cx, cy);
      }
  }

  draw(ctx: CanvasRenderingContext2D, cam: Camera, budgetMs = 4, freeze = false): void {
    this.frame++;
    const zq = freeze ? this.lastZq : this.quant(cam.zoom);
    const cw = CHUNK / zq;
    const scale = cam.zoom / zq;
    const [vx0, vy0, vx1, vy1] = cam.view();
    const cx0 = Math.floor(vx0 / cw), cx1 = Math.floor(vx1 / cw), cy0 = Math.floor(vy0 / cw), cy1 = Math.floor(vy1 / cw);
    const deadline = performance.now() + budgetMs;
    this.pending = 0;
    const size = Math.ceil(CHUNK * scale) + 1;
    // Сначала отрисуем по спирали от центра, чтобы печь ближайшие.
    const order: [number, number][] = [];
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) order.push([cx, cy]);
    const mcx = (cx0 + cx1) / 2, mcy = (cy0 + cy1) / 2;
    order.sort((a, b) => Math.abs(a[0] - mcx) + Math.abs(a[1] - mcy) - Math.abs(b[0] - mcx) - Math.abs(b[1] - mcy));
    for (const [cx, cy] of order) {
      let ch = this.chunks.get(this.key(zq, cx, cy));
      if (!ch && (performance.now() < deadline || this.chunks.size === 0)) ch = this.bake(zq, cx, cy);
      const sx = Math.floor(cam.sxOf(cx * cw)), sy = Math.floor(cam.syOf(cy * cw));
      if (ch) {
        ch.used = this.frame;
        ctx.drawImage(ch.c, sx, sy, size, size);
      } else {
        this.pending++;
        // Запасной вариант: кусок прошлого масштаба, растянутый.
        if (!this.drawFallback(ctx, cam, cx * cw, cy * cw, cw)) {
          ctx.fillStyle = '#15131c';
          ctx.fillRect(sx, sy, size, size);
        }
      }
    }
    if (!this.pending) this.lastZq = zq;
    if (this.frame % 240 === 0) this.purge();
  }

  private drawFallback(ctx: CanvasRenderingContext2D, cam: Camera, wx: number, wy: number, w: number): boolean {
    const zq = this.lastZq;
    const cw = CHUNK / zq;
    const cx0 = Math.floor(wx / cw), cx1 = Math.floor((wx + w - 1e-6) / cw), cy0 = Math.floor(wy / cw), cy1 = Math.floor((wy + w - 1e-6) / cw);
    let any = false;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const ch = this.chunks.get(this.key(zq, cx, cy));
      if (!ch) continue;
      any = true;
      ch.used = this.frame;
      // Обрезаем по области текущего куска.
      const ix0 = Math.max(wx, cx * cw), iy0 = Math.max(wy, cy * cw), ix1 = Math.min(wx + w, (cx + 1) * cw), iy1 = Math.min(wy + w, (cy + 1) * cw);
      const s = zq;
      ctx.drawImage(ch.c, (ix0 - cx * cw) * s, (iy0 - cy * cw) * s, (ix1 - ix0) * s, (iy1 - iy0) * s,
        Math.floor(cam.sxOf(ix0)), Math.floor(cam.syOf(iy0)), Math.ceil((ix1 - ix0) * cam.zoom) + 1, Math.ceil((iy1 - iy0) * cam.zoom) + 1);
    }
    return any;
  }

  private purge(): void {
    for (const [k, ch] of this.chunks) if (this.frame - ch.used > 300) this.chunks.delete(k);
  }

  /** Картинка всей арены с декалями (для снимка-реликвии). */
  snapshot(w: number, h: number, pxW: number, pxH: number): HTMLCanvasElement {
    const c = makeCanvas(pxW, pxH);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(pxW, pxH);
    const d = new Uint32Array(img.data.buffer);
    const sx = w / pxW, sy = h / pxH;
    let i = 0;
    for (let j = 0; j < pxH; j++) for (let k = 0; k < pxW; k++) d[i++] = groundAt(this.stage, (k + 0.5) * sx, (j + 0.5) * sy, 1 / sx);
    ctx.putImageData(img, 0, 0);
    if (this.relic) {
      const r = this.relic;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(r.canvas, r.x0 / sx, r.y0 / sy, r.w / sx, r.h / sy);
    }
    const fake: Chunk = { c, ctx, zq: 1 / sx, cx: 0, cy: 0, used: 0 };
    for (const dc of this.decals) drawDecal(fake, dc);
    return c;
  }
}

function overlaps(d: Decal, x0: number, y0: number, w: number): boolean {
  return d.x + d.r > x0 && d.x - d.r < x0 + w && d.y + d.r > y0 && d.y - d.r < y0 + w;
}

const rgbCache = new Map<string, [number, number, number]>();
function rgb(c: string): [number, number, number] {
  let v = rgbCache.get(c);
  if (!v) { v = hexToRgb(c); rgbCache.set(c, v); }
  return v;
}

/** Рисует декаль пикселями (дизеринг), без сглаживания. */
function drawDecal(ch: Chunk, d: Decal): void {
  const cw = CHUNK / ch.zq;
  const ox = (d.x - ch.cx * cw) * ch.zq, oy = (d.y - ch.cy * cw) * ch.zq;
  const r = d.r * ch.zq;
  if (r < 0.4) return;
  const ctx = ch.ctx;
  const [cr, cg, cb] = rgb(d.col);
  const ri = Math.ceil(r);
  for (let j = -ri; j <= ri; j++) {
    for (let i = -ri; i <= ri; i++) {
      const px = Math.floor(ox + i), py = Math.floor(oy + j);
      if (px < 0 || py < 0 || px >= ch.c.width || py >= ch.c.height) continue;
      const dd = Math.sqrt(i * i + j * j) / r;
      if (dd > 1) continue;
      const h = hash2(Math.floor(d.x * ch.zq) + i, Math.floor(d.y * ch.zq) + j, d.seed);
      let a = 0;
      switch (d.kind) {
        case 'crater': a = dd > 0.78 ? (h < 0.6 ? 0.25 : 0) : dd > 0.5 ? (h < 0.7 ? 0.5 : 0.3) : 0.62; break;
        case 'scorch': a = h < (1 - dd) * 1.1 ? 0.4 * (1 - dd * 0.5) : 0; break;
        case 'burn': a = h < (1 - dd * dd) * 0.9 ? 0.35 : 0; break;
        case 'rubble': a = h < 0.45 * (1 - dd) ? 0.9 : 0; break;
        case 'oil': a = dd < 0.9 && h < 0.92 ? 0.55 : 0; break;
        case 'splat': a = h < (1 - dd) * 0.8 ? 0.7 : 0; break;
        case 'track': a = h < 0.5 ? 0.22 : 0; break;
      }
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}
