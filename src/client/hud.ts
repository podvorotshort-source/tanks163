// Интерфейс во время боя.

import type { Sim } from '../sim/sim';
import type { Player } from '../sim/entities';
import type { Camera } from './camera';
import { drawText, textWidth } from '../gfx/font';
import { iconCanvas } from '../gfx/art/icons';
import { UI } from '../gfx/palette';
import { bar } from './render';
import { fmtTime } from '../core/math';
import { abilityCooldown } from '../sim/abilities';
import { ABILITIES } from '../sim/content/classes';
import { BOSSES } from '../sim/bosses';
import { STAGE_DEFS } from '../sim/content/stages';
import { input, type Action } from '../input/input';
import { TIER_ROMAN } from './tiers';

export interface Banner {
  text: string;
  sub?: string;
  t: number;
  dur: number;
  col: string;
  big?: boolean;
}

export class Hud {
  banners: Banner[] = [];
  hurtFlash = [0, 0];
  showFps = false;
  bossName = '';
  private bossShown = 0;

  banner(text: string, col: string = UI.gold, dur = 2.6, sub?: string, big = false): void {
    // Не дублировать одинаковые подряд.
    if (this.banners.some(b => b.text === text && b.t < 0.5)) return;
    this.banners.push({ text, sub, t: 0, dur, col, big });
    if (this.banners.length > 3) this.banners.shift();
  }

  update(dt: number): void {
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter(b => b.t < b.dur);
    this.hurtFlash = this.hurtFlash.map(v => Math.max(0, v - dt * 3));
    if (this.bossShown > 0) this.bossShown -= dt;
  }

  draw(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, W: number, H: number, fps: number): void {
    // Красная вспышка по краям при уроне.
    const hf = Math.max(...this.hurtFlash);
    if (hf > 0) {
      ctx.globalAlpha = hf * 0.35;
      ctx.fillStyle = '#c23434';
      const b = 10;
      ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b); ctx.fillRect(0, 0, b, H); ctx.fillRect(W - b, 0, b, H);
      ctx.globalAlpha = 1;
    }
    this.drawTop(ctx, sim, W);
    sim.players.forEach((p, i) => this.drawPlayer(ctx, sim, p, i === 0 ? 4 : W - 4, i === 1, W));
    this.drawBoss(ctx, sim, W, H);
    this.drawIndicators(ctx, sim, cam, W, H);
    this.drawBanners(ctx, W, H);
    if (this.showFps) drawText(ctx, `FPS ${fps.toFixed(0)}  ВРАГИ ${sim.enemies.length}  СНАРЯДЫ ${sim.shots.length}`, W / 2, H - 10, { align: 'center', font: 'small', color: UI.dim });
  }

  private drawTop(ctx: CanvasRenderingContext2D, sim: Sim, W: number): void {
    const bw = Math.min(250, Math.round(W * 0.36));
    const x = Math.round(W / 2 - bw / 2), y = 5;
    const k = sim.xp / sim.xpNeed();
    bar(ctx, x, y, bw, 5, k, '#fbcd4a');
    // Риски уровня
    ctx.fillStyle = 'rgba(7,6,11,0.5)';
    for (let i = 1; i < 10; i++) ctx.fillRect(x + Math.round((bw * i) / 10), y, 1, 5);
    drawText(ctx, `УР ${sim.level}`, x - 6, y - 1, { align: 'right', color: UI.gold });
    drawText(ctx, fmtTime(sim.time), x + bw + 6, y - 1, { color: UI.text });
    const st = STAGE_DEFS[sim.stageIdx];
    const stars = '★'.repeat(sim.starTier) + (sim.starTier < 3 ? '☆'.repeat(0) : '');
    drawText(ctx, `${TIER_ROMAN[sim.stageIdx]} · ${st.name.toUpperCase()}`, W / 2, y + 9, { align: 'center', color: UI.dim, font: 'main' });
    if (sim.starTier) drawText(ctx, stars, W / 2, y + 19, { align: 'center', color: UI.gold });
    // Таймеры бонусов.
    let tx = W / 2 - 30;
    const ty = y + (sim.starTier ? 29 : 20);
    const timers: [string, number][] = [];
    if (sim.freezeT > 0) timers.push(['p_clock', sim.freezeT]);
    if (sim.helmetT > 0) timers.push(['p_helmet', sim.helmetT]);
    if (timers.length) {
      tx = W / 2 - (timers.length * 34) / 2;
      for (const [ic, t] of timers) {
        ctx.drawImage(iconCanvas(ic), tx, ty);
        drawText(ctx, String(Math.ceil(t)), tx + 18, ty + 5, { color: UI.text });
        tx += 34;
      }
    }
    // Событие.
    const ev = sim.director.event;
    if (ev && ev.dur > 10) {
      const left = Math.ceil(ev.dur - ev.t);
      drawText(ctx, `${ev.text} ${left}`, W / 2, ty + (timers.length ? 18 : 0), { align: 'center', color: UI.orange });
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, sim: Sim, p: Player, x: number, right: boolean, W: number): void {
    const col = p.idx === 0 ? UI.p1 : UI.p2;
    const w = Math.min(132, Math.round(W * 0.22));
    const x0 = right ? x - w : x;
    const y0 = 3;
    // Зеркальная раскладка: px(o, width) — координата элемента со смещением o от «внешнего» края.
    const px = (o: number, ew: number) => (right ? x0 + w - o - ew : x0 + o);
    ctx.fillStyle = 'rgba(7,6,11,0.6)';
    ctx.fillRect(x0 - 2, y0 - 2, w + 4, 52);
    ctx.fillStyle = col;
    ctx.fillRect(right ? x0 + w + 1 : x0 - 2, y0 - 2, 1, 52);
    ctx.drawImage(iconCanvas('c_' + p.classId), px(0, 18), y0);
    const label = (p.idx === 0 ? '1P ' : '2P ') + p.cls.name.toUpperCase();
    drawText(ctx, label, right ? x0 + w - 21 : x0 + 21, y0 + 1, { color: col, align: right ? 'right' : 'left' });
    // Прочность.
    const hw = w - 21;
    const hpk = p.state === 'alive' ? p.hp / p.maxHp : 0;
    const hcol = hpk > 0.5 ? '#6ccc4a' : hpk > 0.25 ? '#fbcd4a' : '#ea6a3f';
    const hx = px(21, hw);
    bar(ctx, hx, y0 + 11, hw, 4, hpk, p.state === 'alive' ? hcol : '#3a3550');
    if (this.hurtFlash[p.idx] > 0) { ctx.globalAlpha = this.hurtFlash[p.idx]; ctx.fillStyle = '#fff'; ctx.fillRect(hx, y0 + 11, Math.round(hw * hpk), 4); ctx.globalAlpha = 1; }
    // Способности (3 слота) с подписью клавиши внутри.
    for (let i = 0; i < 3; i++) {
      const sx = px(21 + i * 17, 15), sy = y0 + 19;
      ctx.fillStyle = '#151320';
      ctx.fillRect(sx, sy, 15, 15);
      const a = p.abilities[i];
      if (!a) { ctx.fillStyle = '#211e2e'; ctx.fillRect(sx + 1, sy + 1, 13, 13); continue; }
      ctx.drawImage(iconCanvas('a_' + a.id), sx - 1, sy - 1, 17, 17);
      const cd = abilityCooldown(p, i);
      if (a.charges <= 0 && cd > 0) {
        const k = Math.max(0, Math.min(1, a.t / cd));
        ctx.fillStyle = 'rgba(7,6,11,0.72)';
        ctx.fillRect(sx, sy, 15, Math.round(15 * k));
        drawText(ctx, String(Math.ceil(a.t)), sx + 8, sy + 4, { align: 'center', font: 'small', color: UI.text });
      } else if (a.active > 0) {
        ctx.fillStyle = col;
        ctx.fillRect(sx, sy, 15, 1); ctx.fillRect(sx, sy + 14, 15, 1); ctx.fillRect(sx, sy, 1, 15); ctx.fillRect(sx + 14, sy, 1, 15);
      }
      if (a.charges > 1) drawText(ctx, String(a.charges), sx + 12, sy + 1, { font: 'small', color: UI.gold });
      const act: Action = (['a1', 'a2', 'a3'] as Action[])[i];
      const key = keyHint(p.idx as 0 | 1, act, sim.players.length === 1);
      drawText(ctx, key, sx + 8, sy + 16, { align: 'center', font: 'small', color: UI.dim });
    }
    // Жизни — справа от способностей.
    const lx = 21 + 3 * 17 + 4;
    const nl = Math.min(4, p.lives);
    for (let i = 0; i < nl; i++) ctx.drawImage(iconCanvas('p_tank'), px(lx + i * 10, 10), y0 + 21, 10, 10);
    if (p.lives > 4) drawText(ctx, `+${p.lives - 4}`, px(lx + 40, 10), y0 + 23, { font: 'small', color: UI.text });
    // Оружие.
    p.weapons.forEach((wi, i) => {
      const ix = px(i * 16, 12);
      ctx.drawImage(iconCanvas('w_' + wi.id), ix - 1, y0 + 37, 12, 12);
      drawText(ctx, String(wi.level), ix + 12, y0 + 43, { font: 'small', color: i === 0 ? UI.gold : UI.text });
    });
    // Состояние.
    const st = p.state === 'out' ? 'ВЫБЫЛ' : p.state === 'down' ? `ПОДБИТ ${Math.ceil(p.downT)}` : p.state === 'dead' ? 'ВОЗРОЖДЕНИЕ' : '';
    if (st) drawText(ctx, st, right ? x0 + w : x0, y0 + 53, { color: p.state === 'down' ? UI.red : UI.dim, align: right ? 'right' : 'left' });
    void ABILITIES;
  }

  private drawBoss(ctx: CanvasRenderingContext2D, sim: Sim, W: number, H: number): void {
    const b = sim.boss;
    if (!b || b.dead) return;
    const def = BOSSES[sim.stage.boss];
    const bw = Math.min(360, Math.round(W * 0.55));
    const x = Math.round(W / 2 - bw / 2), y = H - 16;
    drawText(ctx, (def?.name ?? 'БОСС').toUpperCase(), W / 2, y - 10, { align: 'center', color: UI.red });
    bar(ctx, x, y, bw, 6, b.hp / b.maxHp, '#c23434');
    ctx.fillStyle = '#07060b';
    ctx.fillRect(x + Math.round(bw * 0.33), y, 1, 6);
    ctx.fillRect(x + Math.round(bw * 0.66), y, 1, 6);
    if (def) drawText(ctx, 'СЛАБОЕ МЕСТО: ' + def.weak.name.toUpperCase(), x + bw, y - 10, { align: 'right', font: 'small', color: UI.faint });
  }

  private drawIndicators(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, W: number, H: number): void {
    // Подбитый напарник и босс за краем экрана.
    const targets: [number, number, string][] = [];
    for (const p of sim.players) if (p.state === 'down') targets.push([p.x, p.y, p.idx ? UI.p2 : UI.p1]);
    if (sim.boss && !sim.boss.dead) targets.push([sim.boss.x, sim.boss.y, UI.red]);
    for (const p of sim.pickups) targets.push([p.x, p.y, '#bdf3dc']);
    for (const [wx, wy, col] of targets) {
      const sx = cam.sxOf(wx), sy = cam.syOf(wy);
      if (sx > 8 && sy > 8 && sx < W - 8 && sy < H - 8) continue;
      const cx = W / 2, cy = H / 2;
      const a = Math.atan2(sy - cy, sx - cx);
      const m = 12;
      const k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      const ex = cx + Math.cos(a) * k, ey = cy + Math.sin(a) * k;
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) for (let j = -i; j <= i; j++) {
        const px = ex - Math.cos(a) * i + Math.cos(a + Math.PI / 2) * j * 0.6;
        const py = ey - Math.sin(a) * i + Math.sin(a + Math.PI / 2) * j * 0.6;
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
    }
  }

  private drawBanners(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    let y = Math.round(H * 0.24);
    for (const b of this.banners) {
      const u = b.t / b.dur;
      const a = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1;
      ctx.globalAlpha = a;
      const sc = b.big ? 2 : 1;
      const tw = textWidth(b.text, { scale: sc });
      ctx.fillStyle = 'rgba(7,6,11,0.6)';
      ctx.fillRect(Math.round(W / 2 - tw / 2 - 8), y - 4, tw + 16, 9 * sc + 8 + (b.sub ? 10 : 0));
      drawText(ctx, b.text, W / 2, y, { align: 'center', color: b.col, scale: sc });
      if (b.sub) drawText(ctx, b.sub, W / 2, y + 9 * sc + 1, { align: 'center', color: UI.dim });
      ctx.globalAlpha = 1;
      y += 9 * sc + 14 + (b.sub ? 10 : 0);
    }
  }
}

export function keyHint(slot: 0 | 1, a: Action, solo: boolean): string {
  const pad = input.lastDevice === 'pad' && (solo || input.padOf[slot] !== null);
  if (pad) return a === 'a1' ? '✕' : a === 'a2' ? '□' : '○';
  if (slot === 0) return a === 'a1' ? 'SPC' : a === 'a2' ? 'E' : 'Q';
  return a === 'a1' ? 'N0' : a === 'a2' ? 'N1' : 'N2';
}
