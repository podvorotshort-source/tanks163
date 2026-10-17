// Отрисовка мира симуляции.

import { hasExt, extFrame } from '../gfx/ext';
import type { SpriteDef } from '../gfx/raster';
import type { Sim } from '../sim/sim';
import type { Enemy, Player, Shot } from '../sim/entities';
import type { Camera } from './camera';
import type { Fx } from './fx';
import { disc, ringPixels } from './fx';
import { spriteSet, drawSprite } from '../gfx/sprites';
import { hullDef, turretDef, wreckDef, HULLS, type GunKind } from '../gfx/art/tanks';
import { unitArt } from '../gfx/art/units';
import { propDef, propHeight } from '../gfx/art/props';
import { MATS } from '../sim/props';
import { PLAYER_RAMPS, RAMPS, type RampId } from '../gfx/palette';
import { TANK_BASE } from '../sim/types';
import { iconCanvas } from '../gfx/art/icons';
import { drawText } from '../gfx/font';
import { tierOf } from './tiers';

export interface RenderCtx {
  sim: Sim;
  cam: Camera;
  fx: Fx;
  /** Интерполяция между шагами симуляции 0..1. */
  alpha: number;
  time: number;
  /** Скрыть юнитов (кинематографичные моменты). */
  hideUnits?: boolean;
  /** Пропустить препятствия. */
  hideProps?: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function drawWorld(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  if (!rc.hideProps) drawProps(ctx, rc, false);
  drawZonesGround(ctx, rc);
  drawMines(ctx, rc);
  drawPickups(ctx, rc);
  const tf0 = performance.now();
  rc.fx.draw(ctx, cam, 0);
  rc.fx.drawMs += performance.now() - tf0;
  if (!rc.hideUnits) {
    // Тени и наземные.
    for (const e of sim.enemies) if (!e.air) drawEnemy(ctx, rc, e);
    for (const p of sim.players) drawPlayer(ctx, rc, p);
  }
  drawShots(ctx, rc, false);
  if (!rc.hideUnits) {
    for (const e of sim.enemies) if (e.air) drawEnemy(ctx, rc, e);
    for (const d of sim.drones) drawDrone(ctx, rc, d.x, d.y, d.a);
  }
  drawShots(ctx, rc, true);
  if (!rc.hideProps) drawProps(ctx, rc, true);
  drawZonesTop(ctx, rc);
  const tf = performance.now();
  rc.fx.draw(ctx, cam, 1);
  rc.fx.drawMs += performance.now() - tf;
  drawTelegraphs(ctx, rc);
}

// ---------------------------------------------------------------------------
// Препятствия
// ---------------------------------------------------------------------------

function drawProps(ctx: CanvasRenderingContext2D, rc: RenderCtx, canopy: boolean): void {
  const { sim, cam } = rc;
  const [x0, y0, x1, y1] = cam.view(sim.size * 2);
  const list = sim.props.queryRect(x0, y0, x1, y1, tmpProps);
  const z = cam.zoom;
  const frame = Math.floor(rc.time * 3) % 4;
  // Сзади наперёд (у картинок 3/4 верх заходит на соседей).
  list.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  // Под кустами — танк игрока: делаем кусты полупрозрачными.
  for (const p of list) {
    const mat = MATS[p.mat];
    if (!!mat.canopy !== canopy) continue;
    const dmg = p.maxHp < 1e11 && p.hp < p.maxHp * 0.5 && !mat.solid;
    const def = propDef(p.kind, p.w, p.h, p.v, dmg);
    const set = spriteSet(def, z);
    const sx = cam.sxOf(p.x), sy = cam.syOf(p.y);
    const h = propHeight(p.kind);
    if (h > 0 && !canopy) {
      ctx.globalAlpha = 0.28;
      const o = Math.max(1, Math.round(Math.min(6, h * 1.5 + p.size * z * 0.04)));
      drawSprite(ctx, set, sx + o, sy + o, 0, 0, 2);
      ctx.globalAlpha = 1;
    }
    if (canopy) {
      const under = sim.players.some(pl => Math.abs(pl.x - p.x) < p.w / 2 + pl.r && Math.abs(pl.y - p.y) < p.h / 2 + pl.r);
      ctx.globalAlpha = under ? 0.55 : 1;
    }
    if (p.ttl !== undefined && p.ttl < 2 && Math.floor(rc.time * 8) % 2) ctx.globalAlpha = 0.5;
    drawSprite(ctx, set, sx, sy, 0, frame);
    ctx.globalAlpha = 1;
    if (p.kind === 'hq') {
      // Полоса прочности штаба.
      const w = Math.max(20, p.w * z);
      bar(ctx, sx - w / 2, sy - (p.h * z) / 2 - 6, w, 3, p.hp / p.maxHp, '#6ccc4a');
    }
  }
}
const tmpProps: import('../sim/props').Prop[] = [];

// ---------------------------------------------------------------------------
// Танки игроков
// ---------------------------------------------------------------------------

function playerModules(p: Player): GunKind[] {
  return p.weapons.slice(1).map(w => w.id as GunKind);
}

export function drawPlayer(ctx: CanvasRenderingContext2D, rc: RenderCtx, p: Player): void {
  const { sim, cam } = rc;
  if (p.state === 'dead' || p.state === 'out') return;
  const x = lerp(p.px, p.x, rc.alpha), y = lerp(p.py, p.y, rc.alpha);
  const sx = cam.sxOf(x), sy = cam.syOf(y);
  const k = (cam.zoom * sim.size) / TANK_BASE;
  const ramp = PLAYER_RAMPS[p.idx];
  const tier = tierOf(sim.stageIdx);
  if (p.state === 'down') {
    const set = spriteSet(wreckDef(p.classId, tier), k);
    drawSprite(ctx, set, sx, sy, p.angle, 0);
    // Кольцо спасения.
    const R = sim.size * 1.8 * cam.zoom;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(rc.time * 6);
    ringPixels(ctx, sx, sy, R, '#fbcd4a', 1);
    ctx.globalAlpha = 1;
    if (p.reviveProg > 0) arcPixels(ctx, sx, sy, R + 2, p.reviveProg, '#6ccc4a', 2);
    return;
  }
  const hull = spriteSet(hullDef(p.classId, ramp, playerModules(p), tier), k);
  const tur = spriteSet(turretDef(p.classId, p.main.id as GunKind, ramp, tier), k);
  const frame = Math.floor(p.treadDist / (sim.size * 0.08)) % 4;
  const blink = (p.invulnT > 0 && p.invulnT < 3 && Math.floor(rc.time * 14) % 2 === 0);
  // Тень.
  ctx.globalAlpha = 0.33;
  const so = Math.max(1, Math.round(2 * k));
  drawSprite(ctx, hull, sx + so, sy + so + 1, p.angle, 0, 2);
  ctx.globalAlpha = blink ? 0.5 : 1;
  drawSprite(ctx, hull, sx, sy, p.angle, frame, p.hurtT > 0.12 ? 1 : 0);
  const [px, py] = HULLS[p.classId].pivot;
  const ca = Math.cos(p.angle), sa = Math.sin(p.angle);
  const tx = sx + (px * ca - py * sa) * k, ty = sy + (px * sa + py * ca) * k;
  ctx.globalAlpha = blink ? 0.2 : 0.3;
  drawSprite(ctx, tur, tx + so * 0.6, ty + so * 0.6, p.turret, 0, 2);
  ctx.globalAlpha = blink ? 0.5 : 1;
  drawSprite(ctx, tur, tx, ty, p.turret, 0, p.hurtT > 0.12 ? 1 : 0);
  ctx.globalAlpha = 1;
  // Щиты.
  if (sim.helmetT > 0 || p.fortressT > 0) {
    const R = sim.size * 0.75 * cam.zoom;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(rc.time * 20);
    ringPixels(ctx, sx, sy, R, p.fortressT > 0 ? '#fbcd4a' : '#bde2ff', 1);
    ringPixels(ctx, sx, sy, R - 1.5, p.fortressT > 0 ? '#df981c' : '#68a6f0', 1);
    ctx.globalAlpha = 1;
  }
}

/** Подписи над танками (в слое интерфейса, cam — камера интерфейса). */
export function drawWorldLabels(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const p of sim.players) {
    if (p.state === 'dead' || p.state === 'out') continue;
    const sx = cam.sxOf(lerp(p.px, p.x, rc.alpha)), sy = cam.syOf(lerp(p.py, p.y, rc.alpha));
    if (p.state === 'down') {
      drawText(ctx, String(Math.ceil(p.downT)), sx, sy - 6 - (sim.size * cam.zoom) / 2, { align: 'center', color: '#ea6a3f', outline: '#07060b' });
      continue;
    }
    if (sim.players.length > 1) drawText(ctx, p.idx === 0 ? '1P' : '2P', sx, sy - (sim.size * cam.zoom) * 0.75 - 6, { align: 'center', color: p.idx ? '#6ccc4a' : '#fbcd4a', font: 'small', outline: '#07060b' });
  }
}

export function drawDrone(ctx: CanvasRenderingContext2D, rc: RenderCtx, x: number, y: number, a: number): void {
  const art = unitArt('quad');
  const set = spriteSet(art.hull('teal'), (rc.cam.zoom * rc.sim.size * 0.45) / art.size);
  const sx = rc.cam.sxOf(x), sy = rc.cam.syOf(y);
  ctx.globalAlpha = 0.25;
  drawSprite(ctx, set, sx + 6, sy + 8, a, 0, 2);
  ctx.globalAlpha = 1;
  drawSprite(ctx, set, sx, sy, a + rc.time * 3, 0);
}

// ---------------------------------------------------------------------------
// Враги
// ---------------------------------------------------------------------------

function enemyRamp(e: Enemy, rc: RenderCtx, base: RampId): RampId {
  if (e.bonus && Math.floor(rc.time * 5) % 2 === 0) return 'toyRed';
  if (e.elite) return base === 'purple' ? 'gold' : 'purple';
  return base;
}

export function drawEnemy(ctx: CanvasRenderingContext2D, rc: RenderCtx, e: Enemy): void {
  const { cam, sim } = rc;
  const x = lerp(e.px, e.x, rc.alpha), y = lerp(e.py, e.y, rc.alpha);
  if (!cam.visible(x, y, e.size * (e.air ? 3 : 1.5))) return;
  const sx = cam.sxOf(x), sy = cam.syOf(y);
  if (e.spawnT > 0) {
    // Классическая «звёздочка» появления.
    const u = 1 - e.spawnT / 0.45;
    const r = Math.max(1.5, e.size * cam.zoom * 0.5 * (0.4 + 0.6 * Math.abs(Math.sin(u * Math.PI * 3))));
    starBurst(ctx, sx, sy, r, '#fff4b0');
    return;
  }
  const art = unitArt(e.def.art);
  const k = (cam.zoom * e.size) / art.size;
  const ramp = enemyRamp(e, rc, art.ramp);
  const hull = spriteSet(art.hull(ramp), k);
  const frame = Math.floor(e.frame * 10) % 4;
  const angle = art.fixed ? 0 : e.angle;
  const mode = e.flash > 0 ? 1 : 0;
  // Тень (авиация — далеко внизу).
  const so = e.air ? Math.max(4, Math.round(e.size * cam.zoom * 0.35)) : Math.max(1, Math.round(1.6 * k));
  ctx.globalAlpha = e.air ? 0.22 : 0.3;
  drawSprite(ctx, hull, sx + so, sy + so + (e.air ? so : 1), angle, 0, 2);
  ctx.globalAlpha = 1;
  if (e.elite) {
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(rc.time * 5 + e.id);
    const col = e.aura === 'shield' ? '#68a6f0' : e.aura === 'haste' ? '#fbcd4a' : '#6ccc4a';
    ringPixels(ctx, sx, sy, e.size * cam.zoom * 0.62, col, 1);
    ctx.globalAlpha = 1;
  }
  const bob = e.air ? Math.round(Math.sin(rc.time * 3 + e.id) * 1.5) : 0;
  drawSprite(ctx, hull, sx, sy + bob, angle, frame, mode);
  if (art.turret) {
    const tur = spriteSet(art.turret(ramp), k);
    const [px, py] = art.pivot ?? [0, 0];
    const ca = Math.cos(angle), sa = Math.sin(angle);
    drawSprite(ctx, tur, sx + (px * ca - py * sa) * k, sy + bob + (px * sa + py * ca) * k, art.fixed ? e.turret : e.turret, 0, mode);
  }
  if (art.rotor) {
    const rot = spriteSet(art.rotor(ramp), k);
    drawSprite(ctx, rot, sx, sy + bob, rc.time * 25 + e.id, 0, 0);
  }
  if (e === sim.boss) return;
  // Метки состояния.
  if (e.markT > 0) { ctx.globalAlpha = 0.8; ringPixels(ctx, sx, sy, e.size * cam.zoom * 0.6, '#ea6a3f', 1); ctx.globalAlpha = 1; }
  if (e.stunT > 0 && Math.floor(rc.time * 10) % 2) ctx.drawImage(disc(1, '#bdf3dc'), Math.round(sx + (Math.random() - 0.5) * e.size * cam.zoom), Math.round(sy - e.size * cam.zoom * 0.5));
  // Полоса здоровья у крупных/элит, если ранены.
  if ((e.elite || e.size > sim.size * 0.9) && e.hp < e.maxHp) {
    const w = Math.max(12, e.size * cam.zoom * 0.8);
    bar(ctx, sx - w / 2, sy - e.size * cam.zoom * 0.62 - 4, w, 2, e.hp / e.maxHp, e.elite ? '#bb70cc' : '#ea6a3f');
  }
}

function starBurst(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  ctx.fillStyle = col;
  const n = Math.ceil(r);
  for (let i = -n; i <= n; i++) {
    ctx.fillRect(Math.round(x + i), Math.round(y), 1, 1);
    ctx.fillRect(Math.round(x), Math.round(y + i), 1, 1);
    if (Math.abs(i) < n * 0.6) { ctx.fillRect(Math.round(x + i * 0.7), Math.round(y + i * 0.7), 1, 1); ctx.fillRect(Math.round(x + i * 0.7), Math.round(y - i * 0.7), 1, 1); }
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
}

// ---------------------------------------------------------------------------
// Снаряды
// ---------------------------------------------------------------------------

const SHOT_COL: Record<string, [string, string]> = {
  ap: ['#fff4b0', '#fbc63e'], he: ['#fbab6c', '#c23434'], mg: ['#fff4b0', '#f08a1c'], rockets: ['#ebe5e6', '#636b8a'],
  volley: ['#fbab6c', '#c23434'], airstrike: ['#fbab6c', '#c23434'], drone: ['#bdf3dc', '#2b9a8e'], mines: ['#fff', '#fff'],
  bullet: ['#ffc8d8', '#ea6a3f'], shell: ['#fbab6c', '#4f1225'], laser: ['#ecb4ef', '#bb70cc'], plasma: ['#e0fc8c', '#62a41a'],
  dart: ['#fbcd4a', '#3770d2'], debris: ['#b4afb8', '#57535f'], ice: ['#eafcff', '#74aed0'], steam: ['#ffffff', '#c8c0c8'],
  rocket: ['#ebe5e6', '#c23434'], marble: ['#d2fbff', '#3aa8c2'], bomb: ['#3a3742', '#141318'],
};

function drawShots(ctx: CanvasRenderingContext2D, rc: RenderCtx, top: boolean): void {
  const { sim, cam } = rc;
  const z = cam.zoom;
  const tier = tierOf(sim.stageIdx);
  for (const s of sim.shots) {
    if (s.dead) continue;
    const isLob = s.lob;
    if (isLob !== top) continue;
    const x = lerp(s.px, s.x, rc.alpha), y = lerp(s.py, s.y, rc.alpha);
    if (!cam.visible(x, y, s.size * 2 + 10)) continue;
    const sx = cam.sxOf(x), sy = cam.syOf(y);
    if (isLob) { drawLob(ctx, rc, s, sx, sy); continue; }
    if (s.kind === 'flame') continue; // огонь — частицами
    const key = s.team === 0 ? String(s.w) : s.kind || String(s.w);
    const [c1, c2] = SHOT_COL[key] ?? ['#ffffff', '#ea6a3f'];
    const a = Math.atan2(s.vy, s.vx);
    const r = Math.max(1, s.size * z * 0.5);
    const pk = projKey(s);
    if (pk) { drawSprite(ctx, spriteSet(projDef(pk, s.size), z), sx, sy, a); continue; }
    if (s.kind === 'ball') { ctx.drawImage(disc(r, '#bdf3dc'), Math.round(sx - r), Math.round(sy - r)); ctx.drawImage(disc(Math.max(0.5, r * 0.5), '#ffffff'), Math.round(sx - r * 0.5), Math.round(sy - r * 0.5)); continue; }
    if (s.kind === 'marble') { ctx.drawImage(disc(r, '#3aa8c2'), Math.round(sx - r), Math.round(sy - r)); ctx.drawImage(disc(Math.max(0.5, r * 0.35), '#d2fbff'), Math.round(sx - r * 0.5), Math.round(sy - r * 0.5)); continue; }
    if (s.team === 0 && (s.w === 'ap' || s.w === 'mg' || s.w === 'drone')) {
      // Трассер: длина по скорости, на поздних поколениях — рельсовые болванки.
      const rail = tier >= 6 && s.w === 'ap';
      const len = Math.max(2, Math.min(rail ? 26 : 14, Math.hypot(s.vx, s.vy) * z * (rail ? 0.05 : 0.025)));
      const w = Math.max(1, Math.round(r * (s.w === 'ap' ? 0.9 : 0.6)));
      line(ctx, sx, sy, sx - Math.cos(a) * len, sy - Math.sin(a) * len, rail ? '#7ad8e6' : c2, w);
      line(ctx, sx, sy, sx - Math.cos(a) * len * 0.45, sy - Math.sin(a) * len * 0.45, rail ? '#eafcff' : c1, w);
      continue;
    }
    if (s.team === 0 && (s.w === 'rockets' || s.dmgType === 'rocket')) {
      const len = Math.max(3, r * 2.4);
      line(ctx, sx, sy, sx - Math.cos(a) * len, sy - Math.sin(a) * len, tier >= 6 ? '#bde2ff' : '#ebe5e6', Math.max(1, Math.round(r * 0.7)));
      ctx.drawImage(disc(Math.max(0.5, r * 0.45), tier >= 6 ? '#68a6f0' : '#fbc63e'), Math.round(sx - Math.cos(a) * len - r * 0.45), Math.round(sy - Math.sin(a) * len - r * 0.45));
      continue;
    }
    if (s.team === 0 && tier >= 6 && (s.w === 'he' || s.w === 'volley')) {
      ctx.drawImage(disc(r * 1.2, '#bb70cc'), Math.round(sx - r * 1.2), Math.round(sy - r * 1.2));
      ctx.drawImage(disc(Math.max(0.5, r * 0.6), '#ffffff'), Math.round(sx - r * 0.6), Math.round(sy - r * 0.6));
      continue;
    }
    if (s.kind === 'laser' || s.kind === 'dart') {
      const len = Math.max(3, r * 4);
      line(ctx, sx, sy, sx - Math.cos(a) * len, sy - Math.sin(a) * len, c2, Math.max(1, Math.round(r * 0.6)));
      line(ctx, sx, sy, sx - Math.cos(a) * len * 0.5, sy - Math.sin(a) * len * 0.5, c1, Math.max(1, Math.round(r * 0.4)));
      continue;
    }
    // Шар/снаряд.
    ctx.drawImage(disc(r, c2), Math.round(sx - r), Math.round(sy - r));
    if (r >= 1.5) ctx.drawImage(disc(r * 0.5, c1), Math.round(sx - r * 0.5 - r * 0.2), Math.round(sy - r * 0.5 - r * 0.2));
  }
}

// Снаряды из внешней графики: proj_<вид>.png (нос вправо). Трассеры пуль остаются линиями.
const PROJ_LEN: Record<string, number> = { proj_shell: 2.2, proj_rocket: 3.2, proj_plasma: 1.8, proj_laser: 4, proj_bullet: 2.6 };
function projKey(s: Shot): string | null {
  let k: string | null = null;
  if (s.team === 0) {
    if (s.w === 'he' || s.w === 'volley' || s.w === 'airstrike') k = 'proj_shell';
    else if (s.w === 'rockets' || s.dmgType === 'rocket') k = 'proj_rocket';
  } else {
    k = s.kind === 'shell' ? 'proj_shell' : s.kind === 'rocket' ? 'proj_rocket' : s.kind === 'plasma' || s.kind === 'ball' ? 'proj_plasma' : s.kind === 'laser' ? 'proj_laser' : s.kind === 'bullet' ? 'proj_bullet' : null;
  }
  return k && hasExt(k) ? k : null;
}
const projDefs = new Map<string, SpriteDef>();
function projDef(key: string, size: number): SpriteDef {
  const q = Math.max(0.25, Math.round(size * 4) / 4);
  const id = key + ':' + q;
  let d = projDefs.get(id);
  if (!d) { d = { id, layers: [], ext: { key, w: q * (PROJ_LEN[key] ?? 2) } }; projDefs.set(id, d); }
  return d;
}

function drawLob(ctx: CanvasRenderingContext2D, rc: RenderCtx, s: Shot, sx: number, sy: number): void {
  const { cam } = rc;
  const t = Math.min(1, s.lobT / s.lobTotal);
  const h = Math.sin(t * Math.PI) * Math.hypot(s.tx - s.sx, s.ty - s.sy) * 0.35 * cam.zoom;
  const r = Math.max(1, s.size * cam.zoom * 0.5);
  // тень на земле
  ctx.globalAlpha = 0.3;
  ctx.drawImage(disc(r, '#07060b'), Math.round(sx - r), Math.round(sy - r));
  ctx.globalAlpha = 1;
  const col = s.team === 0 ? '#fbab6c' : s.kind === 'ice' ? '#a8dcf0' : s.kind === 'toast' ? '#c9a265' : '#ea6a3f';
  ctx.drawImage(disc(r, col), Math.round(sx - r), Math.round(sy - h - r));
  ctx.drawImage(disc(Math.max(0.5, r * 0.4), '#ffffff'), Math.round(sx - r * 0.5), Math.round(sy - h - r * 0.6));
}

function drawTelegraphs(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  const pulse = 0.5 + 0.5 * Math.sin(rc.time * 14);
  // Цели навесных вражеских снарядов.
  for (const s of sim.shots) {
    if (!s.lob || s.team !== 1 || s.dead) continue;
    const t = s.lobT / s.lobTotal;
    const sx = cam.sxOf(s.tx), sy = cam.syOf(s.ty), r = s.blast * cam.zoom;
    ctx.globalAlpha = 0.15 + t * 0.2;
    ctx.drawImage(disc(r, '#c23434'), Math.round(sx - r), Math.round(sy - r));
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ringPixels(ctx, sx, sy, r, '#ea6a3f', 1);
    ringPixels(ctx, sx, sy, r * (1 - t), '#fbab6c', 1);
    ctx.globalAlpha = 1;
  }
  for (const z of sim.zones) {
    if (z.kind !== 'hazard' || z.dead) continue;
    const t = z.t / z.dur;
    if (z.n === 0) {
      if (z.dps <= 0) {
        // Предупреждение о рывке.
        ctx.globalAlpha = 0.35 + pulse * 0.3;
        const ex = z.x + Math.cos(z.power) * z.r, ey = z.y + Math.sin(z.power) * z.r;
        line(ctx, cam.sxOf(z.x), cam.syOf(z.y), cam.sxOf(ex), cam.syOf(ey), '#fbab6c', Math.max(1, Math.round((z.data[0] ?? 2) * cam.zoom * 0.4)));
        ctx.globalAlpha = 1;
        continue;
      }
      const ex = z.x + Math.cos(z.power) * z.r, ey = z.y + Math.sin(z.power) * z.r;
      ctx.globalAlpha = 0.25 + t * 0.5;
      line(ctx, cam.sxOf(z.x), cam.syOf(z.y), cam.sxOf(ex), cam.syOf(ey), t > 0.8 && pulse > 0.5 ? '#ffffff' : '#ea6a3f', Math.max(1, Math.round((z.data[0] ?? 2) * cam.zoom * (0.3 + t * 0.7))));
      ctx.globalAlpha = 1;
    } else {
      const sx = cam.sxOf(z.x), sy = cam.syOf(z.y), r = z.r * cam.zoom;
      ctx.globalAlpha = 0.12 + t * 0.25;
      ctx.drawImage(disc(r, '#c23434'), Math.round(sx - r), Math.round(sy - r));
      ctx.globalAlpha = 0.7;
      ringPixels(ctx, sx, sy, r, '#ea6a3f', 1);
      ringPixels(ctx, sx, sy, r * (1 - t), '#fbab6c', 1);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Зоны, мины, бонусы
// ---------------------------------------------------------------------------

function drawZonesGround(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const z of sim.zones) {
    if (z.dead) continue;
    const sx = cam.sxOf(z.x), sy = cam.syOf(z.y), r = z.r * cam.zoom;
    const u = z.t / z.dur, fade = u > 0.85 ? (1 - u) / 0.15 : Math.min(1, z.t * 4);
    if (z.kind === 'tar') { ctx.globalAlpha = 0.85 * fade; ctx.drawImage(disc(r, '#141318'), Math.round(sx - r), Math.round(sy - r)); ctx.drawImage(disc(r * 0.3, '#3a3742'), Math.round(sx - r * 0.5), Math.round(sy - r * 0.6)); ctx.globalAlpha = 1; }
    else if (z.kind === 'freeze') { ctx.globalAlpha = 0.45 * fade; ctx.drawImage(disc(r, '#74aed0'), Math.round(sx - r), Math.round(sy - r)); ctx.globalAlpha = 0.8 * fade; ringPixels(ctx, sx, sy, r, '#eafcff', 1); ctx.globalAlpha = 1; }
    else if (z.kind === 'gravity') {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(disc(r * 0.25, '#1a0e28'), Math.round(sx - r * 0.25), Math.round(sy - r * 0.25));
      for (let i = 0; i < 3; i++) ringPixels(ctx, sx, sy, r * (1 - ((rc.time * 1.5 + i / 3) % 1)), '#bb70cc', 1);
      ctx.globalAlpha = 1;
    }
  }
}

function drawZonesTop(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const z of sim.zones) {
    if (z.dead || z.kind !== 'smoke') continue;
    const u = z.t / z.dur, fade = u > 0.8 ? (1 - u) / 0.2 : Math.min(1, z.t * 3);
    const sx = cam.sxOf(z.x), sy = cam.syOf(z.y), r = z.r * cam.zoom;
    ctx.globalAlpha = 0.5 * fade;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + rc.time * 0.2, d = (i % 3) * 0.3 * r;
      const rr = r * (0.42 + 0.06 * Math.sin(rc.time + i));
      ctx.drawImage(disc(rr, i % 2 ? '#9a92a0' : '#c8c0c8'), Math.round(sx + Math.cos(a) * d - rr), Math.round(sy + Math.sin(a) * d - rr));
    }
    ctx.globalAlpha = 1;
  }
}

function drawMines(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const m of sim.mines) {
    if (m.dead || !cam.visible(m.x, m.y, m.r * 2)) continue;
    const sx = cam.sxOf(m.x), sy = cam.syOf(m.y), r = Math.max(1, m.r * cam.zoom);
    ctx.drawImage(disc(r + 0.5, '#24222a'), Math.round(sx - r - 0.5), Math.round(sy - r - 0.5));
    ctx.drawImage(disc(r, '#57535f'), Math.round(sx - r), Math.round(sy - r));
    const lit = m.armT > 0 ? Math.floor(rc.time * 16) % 2 === 0 : Math.floor(rc.time * 3 + m.x) % 3 === 0;
    if (lit) ctx.drawImage(disc(Math.max(0.5, r * 0.35), '#ea6a3f'), Math.round(sx - r * 0.35), Math.round(sy - r * 0.35));
  }
}

function drawPickups(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const pu of sim.pickups) {
    if (pu.dead) continue;
    if (pu.life - pu.t < 5 && Math.floor(rc.time * 8) % 2) continue;
    const sx = cam.sxOf(pu.x), sy = cam.syOf(pu.y) + Math.sin(rc.time * 4) * 2 - 2;
    const u = cam.h / 360;
    const s = Math.max(Math.round(10 * u), Math.round(Math.min(26 * u, pu.r * 2.2 * cam.zoom)));
    const icon = (hasExt('icon_p_' + pu.id) ? extFrame('icon_p_' + pu.id, s) : null) ?? iconCanvas('p_' + pu.id);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(disc(s * 0.45, '#07060b'), Math.round(sx - s * 0.45 + 2), Math.round(cam.syOf(pu.y) + s * 0.25));
    ctx.globalAlpha = 1;
    ctx.drawImage(icon, Math.round(sx - s / 2), Math.round(sy - s / 2), s, s);
  }
}

// ---------------------------------------------------------------------------
// Примитивы
// ---------------------------------------------------------------------------

export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, w = 1): void {
  ctx.fillStyle = col;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const o = Math.floor(w / 2);
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, w, w);
}

export function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, col: string, back = '#07060b'): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w);
  ctx.fillStyle = back;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#272336';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, k))), h);
}

export function arcPixels(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, k: number, col: string, w = 1): void {
  ctx.fillStyle = col;
  const n = Math.max(12, Math.ceil(r * 6.3 * k));
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2 * k;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), w, w);
  }
}

export { RAMPS };
