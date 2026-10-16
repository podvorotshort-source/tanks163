// Частицы и световые вспышки. Всё в мировых координатах ступени,
// рисуется пиксельными дисками (без сглаживания) и пиксельным светом.

import { makeCanvas } from '../gfx/screen';
import { RAMPS, type RampId } from '../gfx/palette';
import type { Camera } from './camera';
import { drawText } from '../gfx/font';

export type PKind = 'fire' | 'smoke' | 'spark' | 'debris' | 'ring' | 'text' | 'dust' | 'shell' | 'ember' | 'bubble' | 'pixel';

export class Particle {
  kind: PKind = 'fire';
  x = 0; y = 0; vx = 0; vy = 0;
  /** Высота над землёй (для «подскока» обломков), в единицах. */
  z = 0; vz = 0;
  r = 1;
  r1 = 1;
  life = 1;
  t = 0;
  col = '#fff';
  ramp: RampId | null = null;
  drag = 2;
  a = 0;
  va = 0;
  text = '';
  add = false;
  alpha = 1;
  scaleText = 1;
}

/** Кеш пиксельных дисков: радиус в пикселях × цвет. */
const discs = new Map<string, HTMLCanvasElement>();
export function disc(r: number, col: string): HTMLCanvasElement {
  r = Math.max(0.5, Math.round(r * 2) / 2);
  const key = r + col;
  let c = discs.get(key);
  if (!c) {
    const s = Math.ceil(r * 2) + 1;
    c = makeCanvas(s, s);
    const x = c.getContext('2d')!;
    x.fillStyle = col;
    const cx = s / 2, cy = s / 2;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) x.fillRect(i, j, 1, 1);
    }
    if (discs.size > 3000) discs.clear();
    discs.set(key, c);
  }
  return c;
}

/** Мягкое пятно света (радиальный градиент) — рисуется в полуразрешении. */
let glowSprite: HTMLCanvasElement | null = null;
function glow(): HTMLCanvasElement {
  if (!glowSprite) {
    glowSprite = makeCanvas(64, 64);
    const x = glowSprite.getContext('2d')!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  }
  return glowSprite;
}

const tinted = new Map<string, HTMLCanvasElement>();
function glowTinted(col: string): HTMLCanvasElement {
  let c = tinted.get(col);
  if (!c) {
    c = makeCanvas(64, 64);
    const x = c.getContext('2d')!;
    x.drawImage(glow(), 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = col;
    x.fillRect(0, 0, 64, 64);
    tinted.set(col, c);
  }
  return c;
}

interface Light { x: number; y: number; r: number; col: string; a: number; t: number; life: number }

export class Fx {
  parts: Particle[] = [];
  private pool: Particle[] = [];
  lights: Light[] = [];
  arcs: { pts: number[]; t: number; life: number; col: string; w: number }[] = [];
  lightCanvas: HTMLCanvasElement = makeCanvas(320, 180);
  max = 3500;
  /** Масштаб «силы» эффектов (растёт с поколением танка). */
  power = 1;

  spawn(kind: PKind, x: number, y: number): Particle {
    if (this.parts.length >= this.max) {
      const old = this.parts.shift()!;
      this.pool.push(old);
    }
    const p = this.pool.pop() ?? new Particle();
    p.kind = kind; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.r = 1; p.r1 = 1; p.life = 1; p.t = 0;
    p.col = '#fff'; p.ramp = null; p.drag = 2; p.a = 0; p.va = 0; p.text = ''; p.add = false; p.alpha = 1; p.scaleText = 1;
    this.parts.push(p);
    return p;
  }

  light(x: number, y: number, r: number, col: string, a = 1, life = 0.15): void {
    if (this.lights.length > 220) this.lights.shift();
    this.lights.push({ x, y, r, col, a, t: 0, life });
  }

  arc(pts: number[], col = '#bdf3dc', w = 1, life = 0.14): void {
    this.arcs.push({ pts, t: 0, life, col, w });
  }

  update(dt: number): void {
    let n = 0;
    for (const p of this.parts) {
      p.t += dt;
      if (p.t >= p.life) { this.pool.push(p); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'debris' || p.kind === 'shell') {
        p.vz -= 60 * dt * (p.r1 || 1);
        p.z += p.vz * dt;
        if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.35; p.vx *= 0.6; p.vy *= 0.6; p.va *= 0.5; }
      }
      p.a += p.va * dt;
      this.parts[n++] = p;
    }
    this.parts.length = n;
    let m = 0;
    for (const l of this.lights) { l.t += dt; if (l.t < l.life) this.lights[m++] = l; }
    this.lights.length = m;
    let q = 0;
    for (const a of this.arcs) { a.t += dt; if (a.t < a.life) this.arcs[q++] = a; }
    this.arcs.length = q;
  }

  /** Частицы под юнитами (дым на земле, искры) и над ними (огонь, текст). */
  draw(ctx: CanvasRenderingContext2D, cam: Camera, layer: 0 | 1): void {
    const z = cam.zoom;
    for (const p of this.parts) {
      const top = p.kind === 'text' || p.kind === 'fire' || p.kind === 'spark' || p.kind === 'ember' || p.kind === 'ring' || p.kind === 'smoke' || p.kind === 'pixel';
      if ((layer === 1) !== top) continue;
      const u = p.t / p.life;
      const sx = cam.sxOf(p.x), sy = cam.syOf(p.y) - p.z * z;
      if (sx < -60 || sy < -60 || sx > cam.w + 60 || sy > cam.h + 60) continue;
      switch (p.kind) {
        case 'fire': case 'ember': {
          const ramp = RAMPS[p.ramp ?? 'fire'];
          const ci = Math.max(0, Math.min(5, Math.round(5 - u * 5.5)));
          const r = Math.max(0.5, (p.r + (p.r1 - p.r) * u) * z);
          ctx.drawImage(disc(r, ramp[ci]), Math.round(sx - r), Math.round(sy - r));
          break;
        }
        case 'smoke': case 'dust': case 'bubble': {
          const r = Math.max(0.5, (p.r + (p.r1 - p.r) * u) * z);
          ctx.globalAlpha = p.alpha * (1 - u) * (u < 0.15 ? u / 0.15 : 1);
          ctx.drawImage(disc(r, p.col), Math.round(sx - r), Math.round(sy - r));
          ctx.globalAlpha = 1;
          break;
        }
        case 'spark': {
          const len = Math.max(1, Math.hypot(p.vx, p.vy) * z * 0.025);
          const a = Math.atan2(p.vy, p.vx);
          ctx.fillStyle = u < 0.4 ? '#fff4b0' : u < 0.7 ? '#fbc63e' : '#f08a1c';
          const n = Math.ceil(len);
          for (let i = 0; i < n; i++) ctx.fillRect(Math.round(sx - Math.cos(a) * i), Math.round(sy - Math.sin(a) * i), 1, 1);
          break;
        }
        case 'pixel': {
          ctx.globalAlpha = 1 - u;
          ctx.fillStyle = p.col;
          const s = Math.max(1, Math.round(p.r * z));
          ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
          ctx.globalAlpha = 1;
          break;
        }
        case 'debris': case 'shell': {
          const s = Math.max(1, Math.round(p.r * z));
          // тень
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(Math.round(sx + 1), Math.round(cam.syOf(p.y) + 1), s, Math.max(1, s >> 1));
          ctx.fillStyle = p.col;
          if (s <= 2) ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
          else {
            const w = Math.max(1, Math.round(s * Math.abs(Math.cos(p.a)) + 1));
            ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - s / 2), w, s);
          }
          break;
        }
        case 'ring': {
          const r = (p.r + (p.r1 - p.r) * Math.sqrt(u)) * z;
          ctx.globalAlpha = (1 - u) * p.alpha;
          ringPixels(ctx, sx, sy, r, p.col, u < 0.5 ? 2 : 1);
          ctx.globalAlpha = 1;
          break;
        }
        case 'text': {
          ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
          drawText(ctx, p.text, sx, sy - u * 10, { align: 'center', color: p.col, font: p.scaleText > 1 ? 'main' : 'small', outline: '#07060b', scale: 1 });
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
    if (layer === 1) {
      for (const a of this.arcs) drawArc(ctx, cam, a.pts, a.col, a.t / a.life, a.w);
    }
  }

  /** Свет: аддитивные пятна в полуразрешении, затем поверх кадра. */
  drawLights(ctx: CanvasRenderingContext2D, cam: Camera, extra: (add: (x: number, y: number, r: number, col: string, a: number) => void) => void): void {
    const lw = Math.ceil(cam.w / 2), lh = Math.ceil(cam.h / 2);
    if (this.lightCanvas.width !== lw || this.lightCanvas.height !== lh) { this.lightCanvas.width = lw; this.lightCanvas.height = lh; }
    const lc = this.lightCanvas.getContext('2d')!;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, lw, lh);
    lc.globalCompositeOperation = 'lighter';
    const add = (x: number, y: number, r: number, col: string, a: number) => {
      const sx = cam.sxOf(x) / 2, sy = cam.syOf(y) / 2, rr = (r * cam.zoom) / 2;
      if (sx + rr < 0 || sy + rr < 0 || sx - rr > lw || sy - rr > lh || rr < 0.5) return;
      lc.globalAlpha = Math.min(1, a);
      lc.drawImage(glowTinted(col), sx - rr, sy - rr, rr * 2, rr * 2);
    };
    for (const l of this.lights) add(l.x, l.y, l.r, l.col, l.a * (1 - l.t / l.life));
    for (const p of this.parts) if (p.kind === 'fire' && p.t < p.life * 0.6) add(p.x, p.y, p.r * 3, '#f08a1c', 0.12);
    extra(add);
    lc.globalAlpha = 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.lightCanvas, 0, 0, lw * 2, lh * 2);
    ctx.restore();
  }

  clear(): void {
    for (const p of this.parts) this.pool.push(p);
    this.parts.length = 0;
    this.lights.length = 0;
    this.arcs.length = 0;
  }
}

export function ringPixels(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, w = 1): void {
  if (r < 1) return;
  ctx.fillStyle = col;
  const n = Math.max(12, Math.ceil(r * 6.3));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), w, w);
  }
}

function drawArc(ctx: CanvasRenderingContext2D, cam: Camera, pts: number[], col: string, u: number, w: number): void {
  ctx.fillStyle = u < 0.5 ? '#ffffff' : col;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const x0 = cam.sxOf(pts[i]), y0 = cam.syOf(pts[i + 1]), x1 = cam.sxOf(pts[i + 2]), y1 = cam.syOf(pts[i + 3]);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.ceil(len / 6));
    let px = x0, py = y0;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const jx = k < n ? (Math.random() - 0.5) * 7 : 0, jy = k < n ? (Math.random() - 0.5) * 7 : 0;
      const nx = x0 + (x1 - x0) * t + jx, ny = y0 + (y1 - y0) * t + jy;
      const m = Math.ceil(Math.hypot(nx - px, ny - py));
      for (let s = 0; s <= m; s++) ctx.fillRect(Math.round(px + (nx - px) * (s / m)), Math.round(py + (ny - py) * (s / m)), w, w);
      px = nx; py = ny;
    }
  }
}
