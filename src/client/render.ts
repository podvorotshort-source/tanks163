// 2D-слой поверх изометрического 3D-мира (то же низкое разрешение): снаряды, мины, бонусы,
// зоны, предупреждения, кольца щитов, вспышки появления, полосы здоровья. Юниты, препятствия
// и земля рисуются в 3D (src/iso). Круги на земле — эллипсы 2:1 (изометрия).

import { hasExt, extFrame } from '../gfx/ext';
import type { Sim } from '../sim/sim';
import type { Shot, Enemy } from '../sim/entities';
import { ISO_X, ISO_Y, type Camera } from './camera';
import type { Fx } from './fx';
import { disc } from './fx';
import { iconCanvas } from '../gfx/art/icons';
import { drawText } from '../gfx/font';
import { tierOf } from './tiers';
import { RAMPS } from '../gfx/palette';

export interface RenderCtx {
  sim: Sim;
  cam: Camera;
  fx: Fx;
  /** Интерполяция между шагами симуляции 0..1. */
  alpha: number;
  time: number;
  hideUnits?: boolean;
  hideProps?: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Диск на земле (эллипс 2:1). */
function ground(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, col: string): void {
  if (r < 0.6) return;
  const c = disc(r, col);
  ctx.drawImage(c, Math.round(sx - r), Math.round(sy - r / 2), Math.round(r * 2), Math.max(1, Math.round(r)));
}
/** Кольцо на земле (эллипс 2:1), r — пиксели по горизонтали. */
export function ringIso(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, w = 1): void {
  ctx.fillStyle = col;
  const n = Math.max(16, Math.ceil(r * 4));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.5), w, w);
  }
}

export function drawWorld(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { cam } = rc;
  drawZonesGround(ctx, rc);
  drawMines(ctx, rc);
  drawTelegraphs(ctx, rc);
  rc.fx.draw(ctx, cam, 0);
  if (!rc.hideUnits) drawUnitMarks(ctx, rc);
  drawShots(ctx, rc, false);
  drawPickups(ctx, rc);
  drawShots(ctx, rc, true);
  rc.fx.draw(ctx, cam, 1);
}

// ---------------------------------------------------------------------------
// Метки юнитов: вспышка появления, щиты, кольцо спасения, полосы здоровья
// ---------------------------------------------------------------------------

function drawUnitMarks(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const p of sim.players) {
    if (p.state === 'dead' || p.state === 'out') continue;
    const x = lerp(p.px, p.x, rc.alpha), y = lerp(p.py, p.y, rc.alpha);
    const sx = cam.sxOf(x, y), sy = cam.syOf(x, y);
    if (p.state === 'down') {
      const R = sim.size * 1.8 * cam.zoom;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(rc.time * 6);
      ringIso(ctx, sx, sy, R, '#fbcd4a', 1);
      ctx.globalAlpha = 1;
      if (p.reviveProg > 0) arcPixels(ctx, sx, sy - sim.size * cam.zoom * 0.6, 6, p.reviveProg, '#6ccc4a', 2);
      continue;
    }
    if (sim.helmetT > 0 || p.fortressT > 0) {
      const R = sim.size * 0.8 * cam.zoom;
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(rc.time * 20);
      ringIso(ctx, sx, sy, R, p.fortressT > 0 ? '#fbcd4a' : '#e8e6ee', 1);
      ringIso(ctx, sx, sy - 2, R - 1.5, p.fortressT > 0 ? '#df981c' : '#b8b4c6', 1);
      ctx.globalAlpha = 1;
    }
  }
  for (const e of sim.enemies) {
    const x = lerp(e.px, e.x, rc.alpha), y = lerp(e.py, e.y, rc.alpha);
    if (!cam.visible(x, y, e.size)) continue;
    const h = e.air ? e.size * 0.9 : 0;
    const sx = cam.sxOf(x, y), sy = cam.syOf(x, y, h);
    if (e.spawnT > 0) {
      const u = 1 - e.spawnT / 0.45;
      starBurst(ctx, sx, sy - e.size * cam.zoom * 0.3, Math.max(1.5, e.size * cam.zoom * 0.5 * (0.4 + 0.6 * Math.abs(Math.sin(u * Math.PI * 3)))), '#fff4b0');
      continue;
    }
    if (e === sim.boss) { drawBossMarks(ctx, rc, e, x, y); continue; }
    if (e.elite) {
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(rc.time * 5 + e.id);
      ringIso(ctx, sx, cam.syOf(x, y), e.size * cam.zoom * 0.62, e.aura === 'shield' ? '#68a6f0' : e.aura === 'haste' ? '#fbcd4a' : '#6ccc4a', 1);
      ctx.globalAlpha = 1;
    }
    if (e.markT > 0) { ctx.globalAlpha = 0.8; ringIso(ctx, sx, cam.syOf(x, y), e.size * cam.zoom * 0.6, '#ea6a3f', 1); ctx.globalAlpha = 1; }
    if (e.stunT > 0 && Math.floor(rc.time * 10) % 2) ctx.drawImage(disc(1, '#bdf3dc'), Math.round(sx + (Math.random() - 0.5) * e.size * cam.zoom), Math.round(sy - e.size * cam.zoom * 0.6));
    if ((e.elite || e.size > sim.size * 0.9) && e.hp < e.maxHp) {
      const w = Math.max(12, e.size * cam.zoom * 0.8);
      bar(ctx, sx - w / 2, sy - e.size * cam.zoom * 0.75 - 4, w, 2, e.hp / e.maxHp, e.elite ? '#bb70cc' : '#ea6a3f');
    }
  }
}

/** Высота «падения» босса при появлении (визуально: сверху, с ударом о землю). */
export function bossDropH(e: Enemy): number {
  const b = e.brain as { entering?: number } | undefined;
  const t = b?.entering ?? 0;
  return t > BOSS_LAND ? ((t - BOSS_LAND) / (2.5 - BOSS_LAND)) ** 2 * e.size * 2.2 : 0;
}
export const BOSS_LAND = 1.4;

/** Метки босса: растущая тень при падении, мигающая мишень на слабом месте. */
function drawBossMarks(ctx: CanvasRenderingContext2D, rc: RenderCtx, e: Enemy, x: number, y: number): void {
  const { cam } = rc;
  const drop = bossDropH(e);
  if (drop > 0) {
    const k = 1 - drop / (e.size * 2.2);
    ctx.globalAlpha = 0.25 + 0.35 * k;
    ground(ctx, cam.sxOf(x, y), cam.syOf(x, y), e.size * cam.zoom * (0.25 + 0.3 * k), '#07060b');
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(rc.time * 16);
    ringIso(ctx, cam.sxOf(x, y), cam.syOf(x, y), e.size * cam.zoom * 0.62, '#ea6a3f', 1);
    ctx.globalAlpha = 1;
    return;
  }
  const b = e.brain as { def?: { weak: { dir: number } } } | undefined;
  if (!b?.def) return;
  const a = e.angle + b.def.weak.dir, R = e.size * 0.47;
  const wx = x + Math.cos(a) * R, wy = y + Math.sin(a) * R, h = (e.air ? e.size * 0.9 : 0) + e.size * 0.22;
  const sx = Math.round(cam.sxOf(wx, wy)), sy = Math.round(cam.syOf(wx, wy, h));
  const pulse = 0.5 + 0.5 * Math.sin(rc.time * 7);
  const r = Math.round(4 + pulse * 3 + e.size * cam.zoom * 0.03);
  // четыре уголка-скобки и точка
  ctx.fillStyle = '#07060b';
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.fillRect(sx + dx * r - 1 - (dx < 0 ? 0 : 2), sy + dy * r - 1 - (dy < 0 ? 0 : 0), 5, 3); ctx.fillRect(sx + dx * r - 1 - (dx < 0 ? 0 : 0), sy + dy * r - 1 - (dy < 0 ? 0 : 2), 3, 5); }
  ctx.fillStyle = pulse > 0.5 ? '#fff4b0' : '#ea6a3f';
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.fillRect(sx + dx * r - (dx < 0 ? 0 : 2), sy + dy * r, 3, 1); ctx.fillRect(sx + dx * r, sy + dy * r - (dy < 0 ? 0 : 2), 1, 3); }
  ctx.fillRect(sx - 1, sy - 1, 2, 2);
}

/** Подписи над танками (в слое интерфейса, cam — камера интерфейса). */
export function drawWorldLabels(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const p of sim.players) {
    if (p.state === 'dead' || p.state === 'out') continue;
    const x = lerp(p.px, p.x, rc.alpha), y = lerp(p.py, p.y, rc.alpha);
    const sx = cam.sxOf(x, y), sy = cam.syOf(x, y, sim.size * 0.9);
    if (p.state === 'down') {
      drawText(ctx, String(Math.ceil(p.downT)), sx, sy - 6, { align: 'center', color: '#ea6a3f', outline: '#07060b' });
      continue;
    }
    if (sim.players.length > 1) drawText(ctx, p.idx === 0 ? '1P' : '2P', sx, sy - 8, { align: 'center', color: p.idx ? '#6ccc4a' : '#fbcd4a', font: 'small', outline: '#07060b' });
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
// Снаряды (обычные — светящиеся болванки/трассеры; без «бластеров»)
// ---------------------------------------------------------------------------

const SHOT_COL: Record<string, [string, string]> = {
  ap: ['#fff4b0', '#f2a33a'], he: ['#fbab6c', '#c23434'], mg: ['#fff4b0', '#f08a1c'], rockets: ['#ebe5e6', '#636b8a'],
  volley: ['#fbab6c', '#c23434'], airstrike: ['#fbab6c', '#c23434'], drone: ['#e8f0c0', '#8a9a4a'], mines: ['#fff', '#fff'],
  bullet: ['#ffd8a0', '#ea6a3f'], shell: ['#fbab6c', '#4f1225'], laser: ['#ffb0a0', '#e04030'], plasma: ['#e0fc8c', '#62a41a'],
  dart: ['#ffd070', '#a85818'], debris: ['#b4afb8', '#57535f'], ice: ['#eafcff', '#74aed0'], steam: ['#ffffff', '#c8c0c8'],
  rocket: ['#ebe5e6', '#c23434'], marble: ['#d2fbff', '#3aa8c2'], bomb: ['#3a3742', '#141318'],
};

function drawShots(ctx: CanvasRenderingContext2D, rc: RenderCtx, top: boolean): void {
  const { sim, cam } = rc;
  const z = cam.zoom;
  const tier = tierOf(sim.stageIdx);
  for (const s of sim.shots) {
    if (s.dead) continue;
    if (!!s.lob !== top) continue;
    const x = lerp(s.px, s.x, rc.alpha), y = lerp(s.py, s.y, rc.alpha);
    if (!cam.visible(x, y, s.size * 2 + 10)) continue;
    if (s.lob) { drawLob(ctx, rc, s, x, y); continue; }
    if (s.kind === 'flame') continue; // огонь — частицами
    const hgt = sim.size * 0.38;
    const sx = cam.sxOf(x, y), sy = cam.syOf(x, y, hgt);
    const key = s.team === 0 ? String(s.w) : s.kind || String(s.w);
    const [c1, c2] = SHOT_COL[key] ?? ['#ffffff', '#ea6a3f'];
    // направление на экране
    const dx = (s.vx - s.vy) * ISO_X, dy = (s.vx + s.vy) * ISO_Y;
    const a = Math.atan2(dy, dx), sp = Math.hypot(dx, dy);
    const r = Math.max(1, s.size * z * 0.5);
    // тень на земле
    ctx.globalAlpha = 0.25; ground(ctx, cam.sxOf(x, y), cam.syOf(x, y), Math.max(1, r * 0.8), '#07060b'); ctx.globalAlpha = 1;
    const pk = projKey(s);
    if (pk) { const img = extFrame(pk, Math.max(4, Math.round(r * 4))); if (img) { ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.rotate(a); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); continue; } }
    if (s.kind === 'ball' || s.kind === 'marble') { orb(ctx, sx, sy, r, s.kind === 'ball' ? '#9ad8b8' : '#2f6fa0', s.kind === 'ball' ? '#e0f8e8' : '#8fd0ec'); continue; }
    if (s.team === 0 && (s.w === 'ap' || s.w === 'mg' || s.w === 'drone')) {
      const len = Math.max(2, Math.min(tier >= 6 ? 22 : 12, sp * z * 0.025));
      const w = Math.max(1, Math.round(r * (s.w === 'ap' ? 0.9 : 0.6)));
      line(ctx, sx, sy, sx - Math.cos(a) * len, sy - Math.sin(a) * len, c2, w);
      line(ctx, sx, sy, sx - Math.cos(a) * len * 0.45, sy - Math.sin(a) * len * 0.45, c1, w);
      continue;
    }
    if (s.kind === 'laser' || s.kind === 'dart' || (s.team === 0 && (s.w === 'rockets' || s.dmgType === 'rocket'))) {
      const len = Math.max(3, r * 3);
      line(ctx, sx, sy, sx - Math.cos(a) * len, sy - Math.sin(a) * len, c2, Math.max(1, Math.round(r * 0.7)));
      line(ctx, sx, sy, sx - Math.cos(a) * len * 0.4, sy - Math.sin(a) * len * 0.4, c1, Math.max(1, Math.round(r * 0.45)));
      continue;
    }
    orb(ctx, sx, sy, r, c2, c1);
  }
}

/** Снаряд-шар: тёмная обводка, тело, блик (без свечения). */
function orb(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, body: string, hi: string): void {
  if (r >= 1.5) ctx.drawImage(disc(r + 1, '#1a1322'), Math.round(sx - r - 1), Math.round(sy - r - 1));
  ctx.drawImage(disc(r, body), Math.round(sx - r), Math.round(sy - r));
  if (r >= 1.5) ctx.drawImage(disc(r * 0.45, hi), Math.round(sx - r * 0.75), Math.round(sy - r * 0.75));
}

const PROJ_LEN: Record<string, number> = { proj_shell: 1.5, proj_rocket: 2.2, proj_plasma: 1.6, proj_laser: 3, proj_bullet: 2 };
function projKey(s: Shot): string | null {
  let k: string | null = null;
  if (s.team === 0) {
    if (s.w === 'he' || s.w === 'volley' || s.w === 'airstrike') k = 'proj_shell';
    else if (s.w === 'rockets' || s.dmgType === 'rocket') k = 'proj_rocket';
  } else {
    k = s.kind === 'shell' ? 'proj_shell' : s.kind === 'rocket' ? 'proj_rocket' : null;
  }
  void PROJ_LEN;
  return k && hasExt(k) ? k : null;
}

function drawLob(ctx: CanvasRenderingContext2D, rc: RenderCtx, s: Shot, x: number, y: number): void {
  const { cam } = rc;
  const t = Math.min(1, s.lobT / s.lobTotal);
  const h = Math.sin(t * Math.PI) * Math.hypot(s.tx - s.sx, s.ty - s.sy) * 0.35;
  const r = Math.max(1, s.size * cam.zoom * 0.5);
  ctx.globalAlpha = 0.3;
  ground(ctx, cam.sxOf(x, y), cam.syOf(x, y), r, '#07060b');
  ctx.globalAlpha = 1;
  const sx = cam.sxOf(x, y), sy = cam.syOf(x, y, h);
  const col = s.team === 0 ? '#c25a2a' : s.kind === 'ice' ? '#74aed0' : s.kind === 'toast' ? '#c9a265' : '#a8402a';
  orb(ctx, sx, sy, r, col, s.team === 0 ? '#fbab6c' : s.kind === 'ice' ? '#eafcff' : '#f2a070');
}

function drawTelegraphs(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  const pulse = 0.5 + 0.5 * Math.sin(rc.time * 14);
  for (const s of sim.shots) {
    if (!s.lob || s.team !== 1 || s.dead) continue;
    const t = s.lobT / s.lobTotal;
    const sx = cam.sxOf(s.tx, s.ty), sy = cam.syOf(s.tx, s.ty), r = s.blast * cam.zoom;
    ctx.globalAlpha = 0.15 + t * 0.2;
    ground(ctx, sx, sy, r, '#c23434');
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ringIso(ctx, sx, sy, r, '#ea6a3f', 1);
    ringIso(ctx, sx, sy, r * (1 - t), '#fbab6c', 1);
    ctx.globalAlpha = 1;
  }
  for (const z of sim.zones) {
    if (z.kind !== 'hazard' || z.dead) continue;
    const t = z.t / z.dur;
    if (z.n === 0) {
      const ex = z.x + Math.cos(z.power) * z.r, ey = z.y + Math.sin(z.power) * z.r;
      const w = Math.max(1, Math.round((z.data[0] ?? 2) * cam.zoom * (z.dps <= 0 ? 0.4 : 0.3 + t * 0.7)));
      ctx.globalAlpha = z.dps <= 0 ? 0.35 + pulse * 0.3 : 0.25 + t * 0.5;
      line(ctx, cam.sxOf(z.x, z.y), cam.syOf(z.x, z.y), cam.sxOf(ex, ey), cam.syOf(ex, ey), z.dps <= 0 ? '#fbab6c' : t > 0.8 && pulse > 0.5 ? '#ffffff' : '#ea6a3f', w);
      ctx.globalAlpha = 1;
    } else {
      const sx = cam.sxOf(z.x, z.y), sy = cam.syOf(z.x, z.y), r = z.r * cam.zoom;
      ctx.globalAlpha = 0.12 + t * 0.25;
      ground(ctx, sx, sy, r, '#c23434');
      ctx.globalAlpha = 0.7;
      ringIso(ctx, sx, sy, r, '#ea6a3f', 1);
      ringIso(ctx, sx, sy, r * (1 - t), '#fbab6c', 1);
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
    const sx = cam.sxOf(z.x, z.y), sy = cam.syOf(z.x, z.y), r = z.r * cam.zoom;
    const u = z.t / z.dur, fade = u > 0.85 ? (1 - u) / 0.15 : Math.min(1, z.t * 4);
    if (z.kind === 'tar') { ctx.globalAlpha = 0.85 * fade; ground(ctx, sx, sy, r, '#141318'); ground(ctx, sx - r * 0.3, sy - r * 0.1, r * 0.3, '#3a3742'); ctx.globalAlpha = 1; }
    else if (z.kind === 'freeze') { ctx.globalAlpha = 0.45 * fade; ground(ctx, sx, sy, r, '#74aed0'); ctx.globalAlpha = 0.8 * fade; ringIso(ctx, sx, sy, r, '#eafcff', 1); ctx.globalAlpha = 1; }
    else if (z.kind === 'gravity') {
      ctx.globalAlpha = 0.5;
      ground(ctx, sx, sy, r * 0.25, '#1a0e28');
      for (let i = 0; i < 3; i++) ringIso(ctx, sx, sy, r * (1 - ((rc.time * 1.5 + i / 3) % 1)), '#bb70cc', 1);
      ctx.globalAlpha = 1;
    }
  }
}


function drawMines(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const m of sim.mines) {
    if (m.dead || !cam.visible(m.x, m.y, m.r * 2)) continue;
    const sx = cam.sxOf(m.x, m.y), sy = cam.syOf(m.x, m.y), r = Math.max(1.5, m.r * cam.zoom);
    ground(ctx, sx, sy + 1, r + 0.5, '#24222a');
    ground(ctx, sx, sy, r, '#57535f');
    const lit = m.armT > 0 ? Math.floor(rc.time * 16) % 2 === 0 : Math.floor(rc.time * 3 + m.x) % 3 === 0;
    if (lit) ctx.drawImage(disc(Math.max(0.5, r * 0.3), '#ea6a3f'), Math.round(sx - r * 0.3), Math.round(sy - r * 0.3 - 1));
  }
}

function drawPickups(ctx: CanvasRenderingContext2D, rc: RenderCtx): void {
  const { sim, cam } = rc;
  for (const pu of sim.pickups) {
    if (pu.dead) continue;
    if (pu.life - pu.t < 5 && Math.floor(rc.time * 8) % 2) continue;
    const gx = cam.sxOf(pu.x, pu.y), gy = cam.syOf(pu.x, pu.y);
    const u = cam.pu;
    const s = Math.max(Math.round(12 * u), Math.round(Math.min(28 * u, pu.r * 2.2 * cam.zoom)));
    const sy = gy - s * 0.7 + Math.sin(rc.time * 4) * 2;
    const icon = (hasExt('icon_p_' + pu.id) ? extFrame('icon_p_' + pu.id, s) : null) ?? iconCanvas('p_' + pu.id);
    ctx.globalAlpha = 0.35;
    ground(ctx, gx, gy, s * 0.42, '#07060b');
    ctx.globalAlpha = 1;
    ctx.drawImage(icon, Math.round(gx - s / 2), Math.round(sy - s / 2), s, s);
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
