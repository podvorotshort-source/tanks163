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

  private pulse = 0;

  update(dt: number): void {
    this.pulse += dt;
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter(b => b.t < b.dur);
    this.hurtFlash = this.hurtFlash.map(v => Math.max(0, v - dt * 3));
    if (this.bossShown > 0) this.bossShown -= dt;
  }

  draw(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, W: number, H: number, fps: number, minimal = false): void {
    if (minimal) { this.drawBanners(ctx, W, H); return; }
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
    const bw = Math.min(220, Math.round(W * 0.32));
    const x = Math.round(W / 2 - bw / 2), y = 5;
    // Полоса ступени: путь до прихода босса (череп в конце); в бою с боссом — красная.
    const st0 = STAGE_DEFS[sim.stageIdx];
    const k = sim.boss ? 1 : Math.min(1, sim.stageTime / st0.bossAt);
    ctx.fillStyle = '#07060b'; ctx.fillRect(x - 2, y - 2, bw + 4, 9);
    ctx.fillStyle = '#272336'; ctx.fillRect(x - 1, y - 1, bw + 2, 7);
    ctx.fillStyle = '#151320'; ctx.fillRect(x, y, bw, 5);
    ctx.fillStyle = sim.boss ? '#c23434' : '#3a3550';
    ctx.fillRect(x, y, Math.round(bw * k), 5);
    ctx.fillStyle = sim.boss ? '#ea6a3f' : '#55507a'; ctx.fillRect(x, y, Math.round(bw * k), 1);
    ctx.drawImage(iconCanvas('skull'), x + bw - 2, y - 6, 14, 14);
    drawText(ctx, sim.boss ? 'БОСС!' : 'ДО БОССА', x - 6, y - 1, { align: 'right', color: sim.boss ? UI.red : UI.dim });
    drawText(ctx, fmtTime(sim.time), x + bw + 16, y - 1, { color: UI.text });
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

  /** Панель игрока: рамка его цвета, портрет класса, сегментная прочность с цифрами, золотая «энергия» (опыт до уровня),
   *  кнопки способностей с клавишами и кольцом перезарядки, жизни, оружие с точками уровня. */
  private drawPlayer(ctx: CanvasRenderingContext2D, sim: Sim, p: Player, x: number, right: boolean, W: number): void {
    const col = p.idx === 0 ? UI.p1 : UI.p2, dark = p.idx === 0 ? '#5b3409' : '#17401c';
    const w = Math.min(150, Math.round(W * 0.25)), h = 62;
    const x0 = right ? x - w : x, y0 = 3;
    const px = (o: number, ew: number) => (right ? x0 + w - o - ew : x0 + o);
    // рамка: тёмная подложка, кромка цвета игрока со светлым верхом, уголки
    ctx.fillStyle = 'rgba(7,6,11,0.72)'; ctx.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
    ctx.fillStyle = dark; ctx.fillRect(x0 - 3, y0 - 3, w + 6, 1); ctx.fillRect(x0 - 3, y0 + h + 2, w + 6, 1); ctx.fillRect(x0 - 3, y0 - 3, 1, h + 6); ctx.fillRect(x0 + w + 2, y0 - 3, 1, h + 6);
    ctx.fillStyle = col; for (const [cx, cy] of [[x0 - 3, y0 - 3], [x0 + w, y0 - 3], [x0 - 3, y0 + h], [x0 + w, y0 + h]]) { ctx.fillRect(cx, cy, 3, 1); ctx.fillRect(cx + (cx > x0 ? 2 : 0), cy, 1, 3); }
    // портрет
    const pX = px(0, 24);
    ctx.fillStyle = '#151320'; ctx.fillRect(pX, y0, 24, 24);
    ctx.fillStyle = dark; ctx.fillRect(pX, y0 + 23, 24, 1);
    ctx.drawImage(iconCanvas('c_' + p.classId), pX + 1, y0 + 2, 22, 22);
    drawText(ctx, TIER_ROMAN[sim.stageIdx], pX + (right ? 2 : 22), y0 + 16, { align: right ? 'left' : 'right', font: 'small', color: UI.gold });
    const label = (p.idx === 0 ? '1P ' : '2P ') + p.cls.name.toUpperCase();
    drawText(ctx, label, right ? x0 + w - 28 : x0 + 28, y0, { color: col, align: right ? 'right' : 'left' });
    // прочность: сегменты по 6 px
    const hw = w - 28, hx = px(28, hw), hy = y0 + 9;
    const hpk = p.state === 'alive' ? Math.max(0, p.hp / p.maxHp) : 0;
    const hcol = hpk > 0.5 ? ['#6ccc4a', '#c0f07e', '#349b36'] : hpk > 0.25 ? ['#fbcd4a', '#fff1b4', '#df981c'] : ['#ea6a3f', '#fbab6c', '#c23434'];
    ctx.fillStyle = '#07060b'; ctx.fillRect(hx - 1, hy - 1, hw + 2, 8);
    const seg = 6, ns = Math.floor(hw / seg), full = hpk * ns;
    for (let i = 0; i < ns; i++) {
      const sx = right ? hx + hw - (i + 1) * seg : hx + i * seg, f = Math.max(0, Math.min(1, full - i));
      ctx.fillStyle = '#272336'; ctx.fillRect(sx, hy, seg - 1, 6);
      if (f > 0) { const fw = Math.max(1, Math.round((seg - 1) * f)); const fx = right ? sx + seg - 1 - fw : sx; ctx.fillStyle = hcol[0]; ctx.fillRect(fx, hy, fw, 6); ctx.fillStyle = hcol[1]; ctx.fillRect(fx, hy, fw, 1); ctx.fillStyle = hcol[2]; ctx.fillRect(fx, hy + 5, fw, 1); }
    }
    if (this.hurtFlash[p.idx] > 0) { ctx.globalAlpha = this.hurtFlash[p.idx]; ctx.fillStyle = '#fff'; ctx.fillRect(hx, hy, Math.round(hw * hpk), 6); ctx.globalAlpha = 1; }
    // энергия: опыт до следующего уровня (общий), номер уровня
    const ey = hy + 9, ek = sim.xp / sim.xpNeed();
    ctx.fillStyle = '#07060b'; ctx.fillRect(hx - 1, ey - 1, hw + 2, 5);
    ctx.fillStyle = '#272336'; ctx.fillRect(hx, ey, hw, 3);
    const ew = Math.round(hw * ek);
    ctx.fillStyle = '#df981c'; ctx.fillRect(right ? hx + hw - ew : hx, ey, ew, 3);
    ctx.fillStyle = '#fff1b4'; ctx.fillRect(right ? hx + hw - ew : hx, ey, ew, 1);
    drawText(ctx, `УР ${sim.level}`, right ? hx + hw : hx, ey + 4, { align: right ? 'right' : 'left', font: 'small', color: UI.gold });
    // кнопки способностей: рамка-кнопка, иконка, кольцо перезарядки по периметру, клавиша на «колпачке»
    for (let i = 0; i < 3; i++) {
      const bs = 19, sx = px(i * (bs + 3), bs), sy = y0 + 28;
      const a = p.abilities[i];
      ctx.fillStyle = '#07060b'; ctx.fillRect(sx - 1, sy - 1, bs + 2, bs + 2);
      ctx.fillStyle = a ? '#272336' : '#151320'; ctx.fillRect(sx, sy, bs, bs);
      ctx.fillStyle = a ? '#3a3550' : '#1f1c2e'; ctx.fillRect(sx, sy, bs, 1); ctx.fillRect(sx, sy, 1, bs);
      if (!a) continue;
      ctx.drawImage(iconCanvas('a_' + a.id), sx + 1, sy + 1, bs - 2, bs - 2);
      const cd = abilityCooldown(p, i);
      if (a.charges <= 0 && cd > 0) {
        const k = Math.max(0, Math.min(1, a.t / cd));
        ctx.fillStyle = 'rgba(7,6,11,0.7)'; ctx.fillRect(sx, sy, bs, bs);
        // кольцо готовности: сколько осталось — по периметру по часовой
        const per = bs * 4 - 4, done = Math.round(per * (1 - k));
        ctx.fillStyle = col;
        for (let s = 0; s < done; s++) { const q = s; let qx: number, qy: number; if (q < bs) { qx = q; qy = 0; } else if (q < bs * 2 - 1) { qx = bs - 1; qy = q - bs + 1; } else if (q < bs * 3 - 2) { qx = bs - 1 - (q - bs * 2 + 2); qy = bs - 1; } else { qx = 0; qy = bs - 1 - (q - bs * 3 + 3); } ctx.fillRect(sx + qx, sy + qy, 1, 1); }
        drawText(ctx, String(Math.ceil(a.t)), sx + bs / 2, sy + 6, { align: 'center', color: UI.text });
      } else if (a.active > 0) {
        ctx.fillStyle = col; ctx.fillRect(sx, sy, bs, 1); ctx.fillRect(sx, sy + bs - 1, bs, 1); ctx.fillRect(sx, sy, 1, bs); ctx.fillRect(sx + bs - 1, sy, 1, bs);
      } else if (Math.floor(this.pulse * 3) % 2 === 0 && i > 0) { ctx.fillStyle = col; ctx.fillRect(sx + bs - 3, sy + 1, 2, 2); }
      if (a.charges > 1) drawText(ctx, String(a.charges), sx + bs - 4, sy + 1, { font: 'small', color: UI.gold });
      const act: Action = (['a1', 'a2', 'a3'] as Action[])[i];
      const key = keyHint(p.idx as 0 | 1, act, sim.players.length === 1);
      const kw = textWidth(key, { font: 'small' }) + 4;
      ctx.fillStyle = '#ebe5e6'; ctx.fillRect(Math.round(sx + bs / 2 - kw / 2), sy + bs + 1, kw, 7);
      ctx.fillStyle = '#9a92a0'; ctx.fillRect(Math.round(sx + bs / 2 - kw / 2), sy + bs + 7, kw, 1);
      drawText(ctx, key, sx + bs / 2, sy + bs + 1, { align: 'center', font: 'small', color: '#07060b' });
    }
    // жизни — справа от кнопок
    const lx = 3 * 22 + 4, nl = Math.min(4, p.lives);
    for (let i = 0; i < nl; i++) ctx.drawImage(iconCanvas('p_tank'), px(lx + i * 11, 10), y0 + 30, 10, 10);
    if (p.lives > 4) drawText(ctx, `+${p.lives - 4}`, px(lx + 44, 10), y0 + 32, { font: 'small', color: UI.text });
    // оружие с точками уровня
    p.weapons.forEach((wi, i) => {
      const ix = px(lx + i * 15, 13), iy = y0 + 43;
      ctx.drawImage(iconCanvas('w_' + wi.id), ix, iy, 13, 13);
      for (let l = 0; l < 6; l++) { ctx.fillStyle = l < wi.level ? (i === 0 ? UI.gold : '#ebe5e6') : '#3a3550'; ctx.fillRect(ix + (l % 3) * 4 + 1, iy + 14 + Math.floor(l / 3) * 2, 3, 1); }
    });
    const st = p.state === 'out' ? 'ВЫБЫЛ' : p.state === 'down' ? `ПОДБИТ ${Math.ceil(p.downT)}` : p.state === 'dead' ? 'ВОЗРОЖДЕНИЕ' : '';
    if (st) drawText(ctx, st, right ? x0 + w : x0, y0 + h + 5, { color: p.state === 'down' ? UI.red : UI.dim, align: right ? 'right' : 'left' });
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
      const sx = cam.sxOf(wx, wy), sy = cam.syOf(wx, wy);
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
