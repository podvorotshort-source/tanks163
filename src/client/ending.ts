// Финальная сцена: планета оказывается глобусом на детском столе.

import { makeCanvas } from '../gfx/screen';
import { groundAt } from '../gfx/art/ground';
import { STAGE_DEFS } from '../sim/content/stages';
import { hash2, clamp, easeInOutCubic } from '../core/math';
import { rampRgba } from '../gfx/palette';
import { rasterize } from '../gfx/raster';
import { propDef } from '../gfx/art/props';
import { hullDef, turretDef, type HullClass, type GunKind } from '../gfx/art/tanks';
import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import type { Sim } from '../sim/sim';

const TEX_W = 512, TEX_H = 256;

function toCanvas(img: { w: number; h: number; data: Uint32Array }): HTMLCanvasElement {
  const c = makeCanvas(img.w, img.h);
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data.buffer as ArrayBuffer), img.w, img.h), 0, 0);
  return c;
}

export class Ending {
  t = 0;
  private tex = new Uint32Array(TEX_W * TEX_H);
  private globe = makeCanvas(160, 160);
  private desk: HTMLCanvasElement;
  private ready = false;
  private row = 0;

  constructor(private sim: Sim) {
    this.desk = makeCanvas(640, 360);
  }

  /** Постепенная подготовка текстуры планеты и сцены стола. */
  prepare(budgetMs: number): void {
    if (this.ready) return;
    const end = performance.now() + budgetMs;
    const s = STAGE_DEFS[7];
    while (this.row < TEX_H && performance.now() < end) {
      const v = this.row / TEX_H;
      for (let x = 0; x < TEX_W; x++) this.tex[this.row * TEX_W + x] = groundAt(7, (x / TEX_W) * s.w, v * s.h, 0.25);
      this.row++;
    }
    if (this.row >= TEX_H) { this.buildDesk(); this.ready = true; }
  }

  private buildDesk(): void {
    const c = this.desk, ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const img = ctx.createImageData(640, 360);
    const d = new Uint32Array(img.data.buffer);
    const W = rampRgba('wood');
    for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) {
      // Столешница: волокна дерева.
      const plank = Math.floor(y / 60);
      const g = Math.sin(x * 0.03 + Math.sin(y * 0.05 + plank * 2) * 2.5 + hash2(plank, 0, 3) * 6);
      let k = g > 0.93 ? 2 : g < -0.96 ? 4 : 3;
      if (y % 60 < 1) k = 1;
      if (hash2(x, y, 9) < 0.02) k = 2;
      d[y * 640 + x] = W[k];
    }
    ctx.putImageData(img, 0, 0);
    // Предметы на столе.
    const blit = (im: { w: number; h: number; data: Uint32Array }, x: number, y: number) => ctx.drawImage(toCanvas(im), Math.round(x - im.w / 2), Math.round(y - im.h / 2));
    const shadow = (x: number, y: number, rx: number, ry: number) => { ctx.fillStyle = 'rgba(7,6,11,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    shadow(330, 250, 70, 18);
    blit(rasterize(propDef('crayon', 150, 14, 0), 1, 0, 0), 110, 300);
    blit(rasterize(propDef('crayon', 130, 14, 2), 1, 0, 0), 520, 70);
    blit(rasterize(propDef('block', 40, 40, 1), 1, 0, 0), 520, 300);
    blit(rasterize(propDef('block', 34, 34, 3), 1, 0, 0), 560, 270);
    blit(rasterize(propDef('book', 140, 100, 3), 1, 0, 0), 110, 90);
    // Подставка глобуса.
    ctx.fillStyle = '#5c3722'; ctx.beginPath(); ctx.ellipse(320, 255, 46, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#875231'; ctx.beginPath(); ctx.ellipse(320, 252, 40, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b4afb8'; ctx.fillRect(318, 210, 4, 44);
    // Игрушечные танки, с которых всё началось.
    const ps = this.sim.players;
    ps.forEach((p, i) => {
      const cls = p.classId as HullClass;
      const ramp = i ? 'lime' : 'gold';
      const a = -Math.PI / 2 + (i ? 0.5 : -0.5);
      const x = i ? 430 : 210, y = 285;
      shadow(x + 4, y + 8, 22, 9);
      blit(rasterize(hullDef(cls, ramp, [], 0), 1.6, a, 0), x, y);
      blit(rasterize(turretDef(cls, p.main.id as GunKind, ramp, 0), 1.6, a, 0), x, y);
    });
  }

  private renderGlobe(rot: number): void {
    const R = 80, S = 160;
    const ctx = this.globe.getContext('2d')!;
    const img = ctx.createImageData(S, S);
    const d = new Uint32Array(img.data.buffer);
    const lx = -0.5, ly = -0.45, lz = 0.74;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - R) / R, ny = (y + 0.5 - R) / R, r2 = nx * nx + ny * ny;
      if (r2 > 1) { if (r2 < 1.08) d[y * S + x] = 0xff8c6c2f; continue; } // атмосфера
      const nz = Math.sqrt(1 - r2);
      const lon = Math.atan2(nx, nz) + rot, lat = Math.asin(ny);
      const u = (((lon / (Math.PI * 2)) % 1) + 1) % 1, v = lat / Math.PI + 0.5;
      const c = this.tex[Math.min(TEX_H - 1, Math.floor(v * TEX_H)) * TEX_W + Math.floor(u * TEX_W)];
      const light = clamp(nx * lx + ny * ly + nz * lz, 0, 1);
      const k = 0.25 + light * 0.85;
      const rr = Math.min(255, (c & 255) * k), gg = Math.min(255, ((c >>> 8) & 255) * k), bb = Math.min(255, ((c >>> 16) & 255) * k);
      d[y * S + x] = (0xff000000 | (bb << 16) | (gg << 8) | rr) >>> 0;
    }
    ctx.putImageData(img, 0, 0);
  }

  /** Возвращает true, когда сцена закончилась. */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, dt: number): boolean {
    this.t += dt;
    this.prepare(6);
    const t = this.t;
    if (!this.ready) { ctx.fillStyle = '#07060b'; ctx.fillRect(0, 0, W, H); return false; }
    this.renderGlobe(t * 0.25);
    // Фаза 1: звёзды и огромная планета уменьшается.
    const u = easeInOutCubic(clamp(t / 4, 0, 1));
    const v = easeInOutCubic(clamp((t - 4) / 2.5, 0, 1));
    ctx.fillStyle = '#06050c';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 220; i++) {
      const sx = hash2(i, 1, 5) * W, sy = hash2(i, 2, 5) * H;
      ctx.fillStyle = i % 7 ? '#55507a' : '#ffffff';
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
    // Стол проступает.
    if (v > 0) {
      ctx.globalAlpha = v;
      const k = Math.max(W / 640, H / 360);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.desk, Math.round(W / 2 - 320 * k), Math.round(H / 2 - 180 * k), Math.round(640 * k), Math.round(360 * k));
      ctx.globalAlpha = 1;
    }
    const k = Math.max(W / 640, H / 360);
    const startR = Math.max(W, H) * 0.9, midR = 70 * k, endR = 40 * k;
    const R = v > 0 ? midR + (endR - midR) * v : startR + (midR - startR) * u;
    // Глобус садится на ось подставки (верх оси — y=210 в координатах стола).
    const cx = W / 2, cy = H / 2 + (30 * k - endR + 6 * k) * v;
    ctx.drawImage(this.globe, Math.round(cx - R), Math.round(cy - R), Math.round(R * 2), Math.round(R * 2));
    if (v > 0.6) {
      // Ось глобуса.
      ctx.fillStyle = '#b4afb8';
      ctx.fillRect(Math.round(cx - 1), Math.round(cy - R - 4 * k), Math.max(1, Math.round(2 * k)), Math.round(4 * k));
    }
    // Текст.
    const a = clamp((t - 6.3) / 0.8, 0, 1);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(7,6,11,0.55)';
      ctx.fillRect(0, 8, W, 66);
      drawText(ctx, 'ПОБЕДА!', W / 2, 14, { align: 'center', color: UI.gold, scale: 3 });
      drawText(ctx, 'Целый мир оказался игрушечным глобусом на детском столе…', W / 2, 42, { align: 'center', color: UI.text });
      drawText(ctx, '…а ваш танк прошёл путь от игрушки до планетарного титана.', W / 2, 54, { align: 'center', color: UI.dim });
      ctx.globalAlpha = 1;
    }
    if (t > 9) drawText(ctx, 'ПРОБЕЛ / ENTER / ✕ — ДАЛЕЕ', W / 2, H - 14, { align: 'center', color: UI.faint });
    return t > 14;
  }
}
