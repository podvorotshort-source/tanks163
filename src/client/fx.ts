// Частицы и световые вспышки. Всё в мировых координатах ступени,
// рисуется пиксельными дисками (без сглаживания) и пиксельным светом.

import { extFrame } from '../gfx/ext';
import { makeCanvas } from '../gfx/screen';
import { RAMPS, type RampId } from '../gfx/palette';
import type { Camera } from './camera';
import { drawText } from '../gfx/font';
import { charPatch, firePuff, flameJet, flameTongues, smokePuff, type Pix } from '../gfx/flame';
import { chip, type ChipShape } from '../gfx/chips';
import { DYN_H, DYN_W, type FxLayer } from '../iso/fxgl';

export type PKind = 'fire' | 'smoke' | 'spark' | 'debris' | 'ring' | 'text' | 'dust' | 'shell' | 'ember' | 'bubble' | 'pixel' | 'anim' | 'flame' | 'char';

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
  /** Рост раскадровки за жизнь (anim): размер ×(1 + grow·u). */
  grow = 0;
  /** Вариант формы (клубы огня и дыма, языки пламени, обломки). */
  v = 0;
  /** Обломок-шестерёнка (иначе осколок-пластинка). */
  gear = false;
}

/** Струя огнемёта на кадр: сопло (x, h, y) → конец полной длины (ex, eh, ey), видимая часть head/tail, полуширины w0/w1 (ед.). */
export interface Jet { x: number; h: number; y: number; ex: number; eh: number; ey: number; head: number; tail: number; w0: number; w1: number; seed: number }

/** Кеш пиксельных дисков: радиус в пикселях × цвет. */
const discs = new Map<string, HTMLCanvasElement>();
let discPixels = 0;
const DISC_MAX = 96;
const rgbCache = new Map<string, number>();
function abgr(col: string): number {
  let v = rgbCache.get(col);
  if (v === undefined) {
    const n = parseInt(col.slice(1), 16);
    v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
    rgbCache.set(col, v);
  }
  return v;
}
/** Квантованный радиус: мелкие — шаг 0.5 px, крупные — шаг ~7% (иначе на каждый кадр новый диск). */
function quantR(r: number): number {
  if (r <= 12) return Math.max(0.5, Math.round(r * 2) / 2);
  return Math.round(Math.exp(Math.round(Math.log(r) / 0.07) * 0.07));
}
export function disc(r: number, col: string): HTMLCanvasElement {
  r = quantR(Math.min(r, DISC_MAX));
  const key = r + col;
  let c = discs.get(key);
  if (!c) {
    const s = Math.ceil(r * 2) + 1;
    c = makeCanvas(s, s);
    const x = c.getContext('2d')!;
    const img = x.createImageData(s, s);
    const d = new Uint32Array(img.data.buffer);
    const v = abgr(col), cx = s / 2, cy = s / 2, rr = r * r;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= rr) d[j * s + i] = v;
    x.putImageData(img, 0, 0);
    discPixels += s * s;
    if (discs.size > 3000 || discPixels > 8e6) { discs.clear(); discPixels = 0; }
    discs.set(key, c);
  }
  return c;
}

/** Диск любого радиуса: больше DISC_MAX — растянутый (крупные дым/огонь). */
function drawDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  if (r <= DISC_MAX) {
    const c = disc(r, col);
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  } else {
    ctx.drawImage(disc(DISC_MAX, col), Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
  }
}

/** Кеш пиксельных спрайтов огня и дыма (src/gfx/flame.ts). */
const sprites = new Map<string, HTMLCanvasElement>();
let spritePixels = 0;
/** Сколько спрайтов построено (отладка: кеш должен насыщаться). */
export let spriteMade = 0;
function sprite(key: string, make: () => Pix): HTMLCanvasElement {
  let c = sprites.get(key);
  if (!c) {
    const p = make();
    c = makeCanvas(p.w, p.h);
    const x = c.getContext('2d')!;
    const img = x.createImageData(p.w, p.h);
    new Uint32Array(img.data.buffer).set(p.d);
    x.putImageData(img, 0, 0);
    spritePixels += p.w * p.h;
    spriteMade++;
    if (sprites.size > 6000 || spritePixels > 16e6) { sprites.clear(); spritePixels = 0; }
    sprites.set(key, c);
  }
  return c;
}
/** Спрайт с центром в (x, y); крупнее DISC_MAX — растянутый. */
function drawSprite(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, x: number, y: number, k = 1): void {
  if (k === 1) ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  else ctx.drawImage(c, Math.round(x - c.width * k / 2), Math.round(y - c.height * k / 2), Math.round(c.width * k), Math.round(c.height * k));
}
/** Огонь врагов — красноватый, но с горячим ядром (старая рампа red давала «розовые кружки»). */
function fireRamp(id: RampId | null): RampId { return id === 'red' ? 'blaze' : id ?? 'fire'; }

interface Frame { key: string; make: () => Pix; k: number; alpha: number }
/** Что рисуется в 3D-слое (с проверкой глубины), когда он есть. */
const GL_KINDS = new Set<PKind>(['flame', 'char', 'fire', 'smoke']);
/** Клуб пламени: ядро → оранжевое тело → красная кромка, к концу — тёмный дым с угольком. */
function puffFrame(p: Particle, u: number, z: number): Frame {
  const rid = fireRamp(p.ramp);
  const r = quantR(Math.max(0.5, (p.r + (p.r1 - p.r) * u) * z));
  const rr = Math.min(r, DISC_MAX), age = Math.min(7, Math.floor(u * 8)), v = p.v & 3;
  return { key: `f${rid}${rr}:${age}:${v}`, make: () => firePuff(rr, RAMPS[rid], age / 7, v), k: r / rr, alpha: 1 };
}
/** Объёмный клуб дыма: плотный, без просвечивания; к концу — рассыпается по пикселям. */
function smokeFrame(p: Particle, u: number, z: number): Frame {
  const r = quantR(Math.max(0.5, (p.r + (p.r1 - p.r) * u) * z)), rr = Math.min(r, DISC_MAX);
  const cut = u > 0.5 ? Math.min(4, Math.floor((u - 0.5) / 0.5 * 5)) : 0, v = p.v & 3;
  return { key: `s${p.col}${rr}:${v}:${cut}`, make: () => smokePuff(rr, p.col, v, cut / 5), k: r / rr, alpha: 1 };
}
/** Языки пламени, стоят низом на точке: r — ширина (ед.), кадры ~12/с, рост и спад по жизни.
 *  Кадров немного (8 по кругу × 6 стадий × 4 варианта на ширину) — иначе кеш не держит набор. */
function flameFrame(p: Particle, u: number, z: number): Frame {
  const w = quantR(Math.max(3, p.r * z)), ww = Math.min(w, DISC_MAX);
  const f = (Math.floor(p.t * 12) + p.v * 3) & 7, lq = Math.min(5, Math.floor(u * 6)), v = p.v & 3, rid = fireRamp(p.ramp);
  return { key: `t${rid}${ww}:${v}:${f}:${lq}`, make: () => flameTongues(ww, RAMPS[rid], f / 12, lq / 5, v), k: w / ww, alpha: 1 };
}
/** Гарь под огнём: угольки тлеют и гаснут к концу жизни, затем пятно растворяется. */
function charFrame(p: Particle, u: number, z: number): Frame {
  const w = quantR(Math.max(4, p.r * z * 2)), ww = Math.min(w, DISC_MAX * 2);
  const glow = Math.max(0, Math.min(1, (1 - u) * 1.6)), gq = Math.round(glow * 4), f = gq ? Math.floor(p.t * 5) % 3 : 0, v = p.v & 3;
  return { key: `c${ww}:${v}:${gq}:${f}`, make: () => charPatch(ww, RAMPS.fire, gq / 4, f, v), k: w / ww, alpha: u > 0.85 ? (1 - u) / 0.15 : 1 };
}

/** Струя в экранной сетке: картинка, левый верх (px экрана), шаг пикселя k (крупная — грубее) и fresh —
 *  перерисована ли в этом кадре. Узор обновляется 20 раз в секунду (как пиксельная анимация) или при
 *  повороте/росте струи; иначе прежняя картинка просто едет за соплом. */
const jetCache: { key: string; p: Pix; dx: number; dy: number; k: number }[] = [];
const jetBufs: Uint32Array[] = [];
function jetPix(j: Jet, i: number, cam: Camera, time: number): { p: Pix; x0: number; y0: number; k: number; fresh: boolean } | null {
  const z = cam.zoom;
  const ox = cam.sxOf(j.x, j.y), oy = cam.syOf(j.x, j.y, j.h), ex = cam.sxOf(j.ex, j.ey), ey = cam.syOf(j.ex, j.ey, j.eh);
  const m = j.w1 * z * 1.9 + 3;
  const x0 = Math.floor(Math.min(ox, ex) - m), y0 = Math.floor(Math.min(oy, ey) - m);
  const W = Math.ceil(Math.max(ox, ex) + m) - x0, H = Math.ceil(Math.max(oy, ey) + m) - y0;
  if (x0 > cam.w || y0 > cam.h || x0 + W < 0 || y0 + H < 0 || W < 2 || H < 2) return null;
  const rox = Math.round(ox), roy = Math.round(oy);
  const key = `${Math.round(ex - ox)},${Math.round(ey - oy)},${Math.round(j.w1 * z)},${j.head.toFixed(2)},${j.tail.toFixed(2)},${Math.floor(time * 20)}`;
  const c = jetCache[i];
  if (c && c.key === key) return { p: c.p, x0: rox + c.dx, y0: roy + c.dy, k: c.k, fresh: false };
  const k = Math.max(1, Math.ceil(W / DYN_W), Math.ceil(H / DYN_H)), w = Math.ceil(W / k), h = Math.ceil(H / k);
  if (!jetBufs[i] || jetBufs[i].length < w * h * 2) jetBufs[i] = new Uint32Array(w * h * 2);
  const p = flameJet(w, h, {
    ox: (ox - x0) / k, oy: (oy - y0) / k, ex: (ex - x0) / k, ey: (ey - y0) / k, w0: Math.max(1.2, j.w0 * z / k), w1: j.w1 * z / k,
    head: j.head, tail: j.tail, t: Math.floor(time * 20) / 20, flow: 260 * z / k, seed: j.seed,
  }, RAMPS.fire, jetBufs[i]);
  jetCache[i] = { key, p, dx: x0 - rox, dy: y0 - roy, k };
  return { p, x0, y0, k, fresh: true };
}
let jetCanvas: HTMLCanvasElement | null = null;

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
  max = 2200;
  /** Сколько сейчас цифр урона (ограничиваем, чтобы не засорять экран и не тормозить). */
  texts = 0;
  /** Время отрисовки частиц, мс (накапливается, сбрасывает отладка). */
  drawMs = 0;
  /** Масштаб «силы» эффектов (растёт с поколением танка). */
  power = 1;
  /** 3D-слой для огня на земле (гарь, языки пламени) — с проверкой глубины; без него рисуем в 2D. */
  gl: FxLayer | null = null;
  /** Струи огнемётов этого кадра (заполняет сцена игры). */
  jets: Jet[] = [];
  /** Время эффектов, с (течение струй). */
  time = 0;

  /** Плотность новых эффектов: при сотнях частиц (массовая гибель врагов) — меньше частиц на событие. */
  density(): number {
    return Math.max(0.25, Math.min(1, 1 - (this.parts.length - 500) / 1200));
  }

  spawn(kind: PKind, x: number, y: number): Particle {
    if (this.parts.length >= this.max) {
      const old = this.parts.shift()!;
      this.pool.push(old);
    }
    const p = this.pool.pop() ?? new Particle();
    p.kind = kind; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.r = 1; p.r1 = 1; p.life = 1; p.t = 0;
    p.col = '#fff'; p.ramp = null; p.drag = 2; p.a = 0; p.va = 0; p.text = ''; p.add = false; p.alpha = 1; p.scaleText = 1; p.grow = 0; p.v = (Math.random() * 8) | 0; p.gear = false;
    this.parts.push(p);
    return p;
  }

  /** Гарь и языки пламени — в 3D-слой (до вывода сцены). Кирпичи, ящики и танки их закрывают. */
  syncGl(cam: Camera): void {
    const g = this.gl;
    if (!g) return;
    g.begin();
    const z = cam.zoom;
    for (const p of this.parts) {
      if (!GL_KINDS.has(p.kind)) continue;
      const sx = cam.sxOf(p.x, p.y), sy = cam.syOf(p.x, p.y, p.z);
      if (sx < -80 || sy < -40 || sx > cam.w + 80 || sy > cam.h + 120) continue;
      const u = p.t / p.life;
      if (p.kind === 'flame') {
        const f = flameFrame(p, u, z), s = g.slot(f.key, f.make);
        if (!s) continue;
        const W = Math.round(s.w * f.k), H = Math.round(s.h * f.k);
        g.push(s, p.x, p.z, p.y, -Math.round(W / 2), 1 - H, W, H, true);
      } else if (p.kind === 'fire' || p.kind === 'smoke') {
        // Клубы в воздухе: стоячая плоскость с центром в точке.
        const f = p.kind === 'fire' ? puffFrame(p, u, z) : smokeFrame(p, u, z), s = g.slot(f.key, f.make);
        if (!s) continue;
        const W = Math.round(s.w * f.k), H = Math.round(s.h * f.k);
        g.push(s, p.x, p.z, p.y, -Math.round(W / 2), -Math.round(H / 2), W, H, true);
      } else {
        const f = charFrame(p, u, z), s = g.slot(f.key, f.make);
        if (!s) continue;
        const W = Math.round(s.w * f.k), H = Math.round(s.h * f.k);
        g.push(s, p.x, 0.1, p.y, -Math.round(W / 2), -Math.round(H / 2), W, H, false, f.alpha);
      }
    }
    // Струи: стоячая плоскость через середину струи (танк закрывает её начало, если бьёт от камеры).
    this.jets.forEach((j, i) => {
      const r = jetPix(j, i, cam, this.time);
      if (!r) return;
      const s = g.dyn(i, r.p, r.fresh);
      if (!s) return;
      const mx = (j.x + j.ex) / 2, my = (j.y + j.ey) / 2, mh = (j.h + j.eh) / 2;
      const ax = Math.floor(cam.sxOf(mx, my) + 0.5), ay = Math.floor(cam.syOf(mx, my, mh) + 0.5);
      g.push(s, mx, mh, my, r.x0 - ax, r.y0 - ay, r.p.w * r.k, r.p.h * r.k, true);
    });
  }

  light(x: number, y: number, r: number, col: string, a = 1, life = 0.15): void {
    if (this.lights.length > 220) this.lights.shift();
    this.lights.push({ x, y, r, col, a, t: 0, life });
  }

  arc(pts: number[], col = '#bdf3dc', w = 1, life = 0.14): void {
    this.arcs.push({ pts, t: 0, life, col, w });
  }

  update(dt: number): void {
    this.time += dt;
    let n = 0, texts = 0;
    for (const p of this.parts) {
      p.t += dt;
      if (p.t >= p.life) { this.pool.push(p); continue; }
      if (p.kind === 'text') texts++;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'debris' || p.kind === 'shell') {
        p.vz -= 60 * dt * (p.r1 || 1);
        p.z += p.vz * dt;
        if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.35; p.vx *= 0.6; p.vy *= 0.6; p.va *= 0.5; }
      }
      else if (p.vz) p.z += p.vz * dt;               // дым и искры поднимаются
      if (p.kind !== 'anim') p.a += p.va * dt;
      this.parts[n++] = p;
    }
    this.parts.length = n;
    this.texts = texts;
    let m = 0;
    for (const l of this.lights) { l.t += dt; if (l.t < l.life) this.lights[m++] = l; }
    this.lights.length = m;
    let q = 0;
    for (const a of this.arcs) { a.t += dt; if (a.t < a.life) this.arcs[q++] = a; }
    this.arcs.length = q;
  }

  /** Частицы под юнитами (0: дым на земле, обломки), над ними (1: огонь, искры)
   *  и текст (2: цифры урона — рисуются в слое интерфейса). */
  draw(ctx: CanvasRenderingContext2D, cam: Camera, layer: 0 | 1 | 2): void {
    const z = cam.zoom;
    for (const p of this.parts) {
      if ((p.kind === 'text') !== (layer === 2)) continue;
      const top = p.kind === 'fire' || p.kind === 'flame' || p.kind === 'anim' || p.kind === 'spark' || p.kind === 'ember' || p.kind === 'ring' || p.kind === 'smoke' || p.kind === 'pixel';
      if (layer !== 2 && (layer === 1) !== top) continue;
      const u = p.t / p.life;
      const sx = cam.sxOf(p.x, p.y), sy = cam.syOf(p.x, p.y, p.z);
      if (sx < -60 || sy < -60 || sx > cam.w + 60 || sy > cam.h + 60) continue;
      switch (p.kind) {
        case 'ember': {
          const ramp = RAMPS[fireRamp(p.ramp)];
          const ci = Math.max(0, Math.min(5, Math.round(5 - u * 5.5)));
          drawDisc(ctx, sx, sy, Math.max(0.5, (p.r + (p.r1 - p.r) * u) * z), ramp[ci]);
          break;
        }
        case 'fire': {
          if (this.gl) break;                             // в 3D-слое (syncGl)
          const f = puffFrame(p, u, z);
          drawSprite(ctx, sprite(f.key, f.make), sx, sy, f.k);
          break;
        }
        case 'flame': {
          if (this.gl) break;                             // в 3D-слое (syncGl)
          const f = flameFrame(p, u, z), c = sprite(f.key, () => f.make()), k = f.k;
          ctx.drawImage(c, Math.round(sx - c.width * k / 2), Math.round(sy - c.height * k + 1), Math.round(c.width * k), Math.round(c.height * k));
          break;
        }
        case 'char': {
          if (this.gl) break;
          const f = charFrame(p, u, z);
          ctx.globalAlpha = f.alpha;
          drawSprite(ctx, sprite(f.key, () => f.make()), sx, sy, f.k);
          ctx.globalAlpha = 1;
          break;
        }
        case 'smoke': {
          if (this.gl) break;
          const f = smokeFrame(p, u, z);
          ctx.globalAlpha = Math.min(1, p.alpha * 1.6) * (u < 0.08 ? u / 0.08 : 1);
          drawSprite(ctx, sprite(f.key, f.make), sx, sy, f.k);
          ctx.globalAlpha = 1;
          break;
        }
        case 'dust': case 'bubble': {
          ctx.globalAlpha = p.alpha * (1 - u) * (u < 0.15 ? u / 0.15 : 1);
          drawDisc(ctx, sx, sy, Math.max(0.5, (p.r + (p.r1 - p.r) * u) * z), p.col);
          ctx.globalAlpha = 1;
          break;
        }
        case 'spark': {
          const len = Math.max(1, Math.min(24 * cam.pu, Math.hypot(p.vx, p.vy) * z * 0.025));
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
        case 'shell': {
          const s = Math.max(1, Math.round(p.r * z));
          ctx.fillStyle = 'rgba(26,17,36,0.35)';
          ctx.fillRect(Math.round(sx + 1), Math.round(cam.syOf(p.x, p.y) + 1), s, 1);
          ctx.fillStyle = p.col;
          ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
          break;
        }
        case 'debris': {
          // Пиксельный обломок: кувыркается в полёте, на земле замирает и к концу мельчает.
          const s0 = Math.min(10, Math.max(1, Math.round(p.r * z)));
          const s = u > 0.75 ? Math.max(1, Math.round(s0 * (1 - (u - 0.75) / 0.25 * 0.7))) : s0;
          const f = (Math.floor(p.a / (Math.PI / 4)) % 4 + 4) % 4, shape: ChipShape = p.gear ? 'gear' : 'plate';
          const c = sprite(`d${shape}${p.col}${s}:${p.v & 3}:${f}`, () => chip(s, p.col, shape, p.v & 3, f));
          if (p.z > 0.5) {
            ctx.fillStyle = 'rgba(26,17,36,0.35)';
            ctx.fillRect(Math.round(sx - s / 2), Math.round(cam.syOf(p.x, p.y)), Math.max(1, s - 1), 1);
          }
          ctx.drawImage(c, Math.round(sx - c.width / 2), Math.round(sy - c.height / 2));
          break;
        }
        case 'ring': {
          const r = (p.r + (p.r1 - p.r) * Math.sqrt(u)) * z;
          ctx.globalAlpha = (1 - u) * p.alpha;
          ringPixels(ctx, sx, sy, r, p.col, u < 0.5 ? 2 : 1);
          ctx.globalAlpha = 1;
          break;
        }
        case 'anim': {
          // Раскадровка из внешней графики: p.text — префикс, p.va — число кадров.
          const n = Math.max(1, p.va | 0);
          const c = extFrame(`${p.text}_${Math.min(n, Math.floor(u * n) + 1)}`, p.r * 2 * z * (1 + p.grow * u));
          if (c) {
            ctx.globalAlpha = p.alpha;
            ctx.drawImage(c, Math.round(sx - c.width / 2), Math.round(sy - c.height / 2));
            ctx.globalAlpha = 1;
          }
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
    if (layer === 1 && !this.gl) {
      this.jets.forEach((j, i) => {
        const r = jetPix(j, i, cam, this.time);
        if (!r) return;
        if (!jetCanvas) jetCanvas = makeCanvas(DYN_W, DYN_H);
        const x = jetCanvas.getContext('2d')!, img = x.createImageData(r.p.w, r.p.h);
        new Uint32Array(img.data.buffer).set(r.p.d);
        x.clearRect(0, 0, DYN_W, DYN_H); x.putImageData(img, 0, 0);
        ctx.drawImage(jetCanvas, 0, 0, r.p.w, r.p.h, r.x0, r.y0, r.p.w * r.k, r.p.h * r.k);
      });
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
      const sx = cam.sxOf(x, y) / 2, sy = cam.syOf(x, y) / 2, rr = Math.min((r * cam.zoom) / 2, Math.max(lw, lh) * 1.5);
      if (sx + rr < 0 || sy + rr < 0 || sx - rr > lw || sy - rr > lh || rr < 0.5) return;
      lc.globalAlpha = Math.min(1, a);
      lc.drawImage(glowTinted(col), sx - rr, sy - rr, rr * 2, rr * 2);
    };
    for (const l of this.lights) add(l.x, l.y, l.r, l.col, l.a * (1 - l.t / l.life));
    for (const p of this.parts) {
      if (p.kind === 'fire' && p.t < p.life * 0.6) add(p.x, p.y, p.r * 3, '#f08a1c', 0.12);
      else if (p.kind === 'flame') add(p.x, p.y, p.r * 2.2, '#f08a1c', 0.1);
    }
    for (const j of this.jets) for (let q = 1; q <= 3; q++) {
      const t = j.tail + (j.head - j.tail) * q / 4;
      add(j.x + (j.ex - j.x) * t, j.y + (j.ey - j.y) * t, j.w1 * (1 + t * 2), '#f08a1c', 0.16);
    }
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
    const x0 = cam.sxOf(pts[i], pts[i + 1]), y0 = cam.syOf(pts[i], pts[i + 1], 6), x1 = cam.sxOf(pts[i + 2], pts[i + 3]), y1 = cam.syOf(pts[i + 2], pts[i + 3], 6);
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
