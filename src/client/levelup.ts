// Выбор улучшений: оба игрока выбирают одновременно, каждый своим вводом.

import { drawIcon } from '../gfx/hi';
import type { Sim } from '../sim/sim';
import type { Card } from '../sim/upgrades';
import { drawText, wrapText, textWidth } from '../gfx/font';
import { UI } from '../gfx/palette';
import { input } from '../input/input';
import { audio } from '../audio/audio';
import { keyHint } from './hud';
import { app } from '../app';
import { buttonRow, clickedRect } from '../ui/widgets';

const RARITY_COL = [UI.common, UI.rare, UI.epic, UI.legendary];
const RARITY_NAME = ['обычное', 'редкое', 'эпическое', 'легендарное'];

export class LevelUpUI {
  cursor = [0, 0];
  private t = 0;
  private lastLevelKey = '';
  /** Защита от случайного выбора сразу после открытия. */
  private guard = 0;

  update(sim: Sim, dt: number): void {
    const lu = sim.levelUp;
    if (!lu) return;
    const key = sim.level + ':' + lu.queue + ':' + lu.offers.map(o => o.map(c => c.id).join()).join('|');
    if (key !== this.lastLevelKey) {
      this.lastLevelKey = key;
      this.t = 0;
      this.guard = 0.35;
      this.cursor = this.cursor.map((c, i) => Math.min(c, (lu.offers[i]?.length ?? 1) - 1));
    }
    this.t += dt;
    if (this.guard > 0) { this.guard -= dt; return; }
    const solo = sim.players.length === 1;
    for (let i = 0; i < sim.players.length; i++) {
      if (lu.done[i]) continue;
      const f = input.players[i];
      const n = lu.offers[i].length;
      const prev = this.cursor[i];
      if (solo ? f.nav.left : f.nav.up) this.cursor[i] = (this.cursor[i] + n - 1) % n;
      if (solo ? f.nav.right : f.nav.down) this.cursor[i] = (this.cursor[i] + 1) % n;
      if (this.cursor[i] !== prev) audio.play('select');
      if (f.pressed.a1) { if (sim.choose(i, this.cursor[i])) audio.play('confirm'); }
      else if (f.pressed.a2) { if (sim.reroll(i)) audio.play('confirm'); else audio.play('deny'); }
      else if (f.pressed.a3) { if (sim.banish(i, this.cursor[i])) audio.play('confirm'); else audio.play('deny'); }
    }
    // Мышь — за первого игрока (или за того, чья колонка под курсором).
    const m = input.mouse;
    if (m.moved || m.clicked) {
      const hit = this.hitTest(sim, m.x, m.y);
      if (hit && !lu.done[hit[0]]) {
        // касанием: первый тап — выбрать карту, повторный — взять; мышью — сразу
        const was = this.cursor[hit[0]] === hit[1];
        if (!was) { this.cursor[hit[0]] = hit[1]; audio.play('select'); }
        if (m.clicked && (was || !m.touch) && sim.choose(hit[0], hit[1])) audio.play('confirm');
      }
    }
    // Кнопки на телефоне: переброс / взять / исключить (за 1P).
    const b = lu.done[0] ? -1 : clickedRect(this.btns);
    if (b === 0) { if (sim.reroll(0)) audio.play('confirm'); else audio.play('deny'); }
    if (b === 1 && sim.choose(0, this.cursor[0])) audio.play('confirm');
    if (b === 2) { if (sim.banish(0, this.cursor[0])) audio.play('confirm'); else audio.play('deny'); }
  }

  private rects: { p: number; c: number; x: number; y: number; w: number; h: number }[] = [];
  private btns: [number, number, number, number][] = [];

  private hitTest(_sim: Sim, x: number, y: number): [number, number] | null {
    for (const r of this.rects) if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return [r.p, r.c];
    return null;
  }

  draw(ctx: CanvasRenderingContext2D, sim: Sim, W: number, H: number): void {
    const lu = sim.levelUp;
    if (!lu) return;
    this.rects = [];
    this.btns = [];
    const a = Math.min(1, this.t * 6);
    ctx.globalAlpha = 0.78 * a;
    ctx.fillStyle = '#07060b';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    const pulse = Math.sin(this.t * 6) * 0.5 + 0.5;
    drawText(ctx, 'НОВЫЙ УРОВЕНЬ', W / 2, 10, { align: 'center', color: UI.gold, scale: 2 });
    drawText(ctx, `УРОВЕНЬ КОМАНДЫ ${sim.level}${lu.queue ? `  (+${lu.queue} ещё)` : ''}`, W / 2, 30, { align: 'center', color: UI.dim });
    if (sim.players.length === 1) this.drawSolo(ctx, sim, W, H, pulse);
    else this.drawDuo(ctx, sim, W, H, pulse);
    ctx.globalAlpha = 1;
  }

  private drawSolo(ctx: CanvasRenderingContext2D, sim: Sim, W: number, H: number, pulse: number): void {
    const lu = sim.levelUp!;
    const cards = lu.offers[0];
    const n = cards.length;
    const gap = 8;
    const cw = Math.min(150, Math.floor((W - 24 - gap * (n - 1)) / n));
    const ch = Math.min(200, H - 110);
    const x0 = Math.round(W / 2 - (n * cw + (n - 1) * gap) / 2), y0 = 48;
    cards.forEach((c, i) => {
      const x = x0 + i * (cw + gap);
      const sel = this.cursor[0] === i;
      this.card(ctx, c, x, y0 - (sel ? 3 : 0), cw, ch, sel, UI.p1, pulse, 'v');
      this.rects.push({ p: 0, c: i, x, y: y0, w: cw, h: ch });
    });
    if (app.screen.compact) {
      const p = sim.players[0];
      this.btns = buttonRow(ctx, [`ПЕРЕБРОС (${p.rerolls})`, 'ВЗЯТЬ ▶', `ИСКЛЮЧИТЬ (${p.banishes})`], W / 2, y0 + ch + 6, 104, 22,
        [p.rerolls > 0 ? UI.text : UI.faint, UI.gold, p.banishes > 0 ? UI.text : UI.faint]);
    } else this.hints(ctx, sim, 0, W / 2, y0 + ch + 10, 'center');
  }

  private drawDuo(ctx: CanvasRenderingContext2D, sim: Sim, W: number, H: number, pulse: number): void {
    const lu = sim.levelUp!;
    const pw = Math.floor((W - 24) / 2);
    for (let pi = 0; pi < 2; pi++) {
      const x0 = 8 + pi * (pw + 8), y0 = 44;
      const col = pi ? UI.p2 : UI.p1;
      const p = sim.players[pi];
      drawText(ctx, `${pi ? '2P' : '1P'} · ${p.cls.name.toUpperCase()}`, x0 + pw / 2, y0, { align: 'center', color: col });
      const cards = lu.offers[pi];
      const ch = Math.min(64, Math.floor((H - y0 - 60) / cards.length) - 4);
      if (lu.done[pi]) {
        drawText(ctx, 'ГОТОВО ✓', x0 + pw / 2, y0 + 40, { align: 'center', color: col, scale: 2 });
        drawText(ctx, lu.done.every(Boolean) ? '' : 'ждём напарника…', x0 + pw / 2, y0 + 64, { align: 'center', color: UI.dim });
        continue;
      }
      cards.forEach((c, i) => {
        const y = y0 + 12 + i * (ch + 4);
        const sel = this.cursor[pi] === i;
        this.card(ctx, c, x0 + (sel ? 4 : 0), y, pw - 4, ch, sel, col, pulse, 'h');
        this.rects.push({ p: pi, c: i, x: x0, y, w: pw, h: ch });
      });
      this.hints(ctx, sim, pi, x0 + pw / 2, y0 + 12 + cards.length * (ch + 4) + 4, 'center');
    }
  }

  private hints(ctx: CanvasRenderingContext2D, sim: Sim, pi: number, x: number, y: number, align: 'center'): void {
    const p = sim.players[pi];
    const solo = sim.players.length === 1;
    const nav = solo ? '◀ ▶' : pi === 0 && !(input.lastDevice === 'pad') ? 'W/S' : pi === 1 && !(input.lastDevice === 'pad') ? '↑/↓' : 'СТИК';
    const k1 = keyHint(pi as 0 | 1, 'a1', solo), k2 = keyHint(pi as 0 | 1, 'a2', solo), k3 = keyHint(pi as 0 | 1, 'a3', solo);
    let s = `${nav} ВЫБОР   ${k1} ВЗЯТЬ   ${k2} ПЕРЕБРОС (${p.rerolls})`;
    if (p.banishes > 0) s += `   ${k3} ИСКЛЮЧИТЬ (${p.banishes})`;
    drawText(ctx, s, x, y, { align, color: UI.dim });
  }

  private card(ctx: CanvasRenderingContext2D, c: Card, x: number, y: number, w: number, h: number, sel: boolean, col: string, pulse: number, layout: 'v' | 'h'): void {
    const rc = RARITY_COL[c.rarity];
    ctx.fillStyle = sel ? '#1f1c2e' : '#151320';
    ctx.fillRect(x, y, w, h);
    // Рамка редкости
    ctx.fillStyle = rc;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    if (sel) {
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.fillStyle = col;
      ctx.fillRect(x - 2, y - 2, w + 4, 1); ctx.fillRect(x - 2, y + h + 1, w + 4, 1); ctx.fillRect(x - 2, y - 2, 1, h + 4); ctx.fillRect(x + w + 1, y - 2, 1, h + 4);
      ctx.globalAlpha = 1;
    }
    if (layout === 'v') {
      drawIcon(ctx, c.icon, Math.round(x + w / 2 - 18), y + 8, 36);
      let ty = y + 8 + 36 + 4;
      for (const line of wrapText(c.title.toUpperCase(), w - 10)) { drawText(ctx, line, x + w / 2, ty, { align: 'center', color: rc }); ty += 9; }
      drawText(ctx, c.tag, x + w / 2, ty, { align: 'center', color: UI.dim, font: 'main' }); ty += 12;
      for (const line of wrapText(c.text, w - 10)) { if (ty > y + h - 18) break; drawText(ctx, line, x + w / 2, ty, { align: 'center', color: UI.text }); ty += 9; }
      drawText(ctx, RARITY_NAME[c.rarity].toUpperCase(), x + w / 2, y + h - 10, { align: 'center', color: rc, font: 'main' });
    } else {
      drawIcon(ctx, c.icon, x + 4, Math.round(y + h / 2 - 18), 36);
      const tx = x + 4 + 36 + 6, tw = w - (tx - x) - 6;
      drawText(ctx, c.title.toUpperCase(), tx, y + 4, { color: rc });
      const tag = c.tag;
      drawText(ctx, tag, x + w - 5, y + 4, { color: UI.faint, align: 'right' });
      void textWidth;
      let ty = y + 15;
      for (const line of wrapText(c.text, tw)) { if (ty > y + h - 9) break; drawText(ctx, line, tx, ty, { color: UI.text }); ty += 9; }
    }
  }
}
