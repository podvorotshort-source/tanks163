// Пауза во время забега.

import type { Sim } from '../sim/sim';
import { input } from '../input/input';
import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { audio } from '../audio/audio';
import { settings } from '../meta/settings';
import { drawControls } from '../ui/controlsView';
import { WEAPONS } from '../sim/content/weapons';
import { ABILITIES } from '../sim/content/classes';
import { buttonRow, clickedRect } from '../ui/widgets';

type Item = { label: () => string; act?: () => void; adj?: (d: number) => void };

export class PauseMenu {
  open = false;
  sel = 0;
  private view: 'main' | 'controls' | 'confirm' | 'build' = 'main';
  private result: '' | 'quit' = '';
  private items: Item[] = [
    { label: () => 'ПРОДОЛЖИТЬ', act: () => { this.open = false; } },
    { label: () => 'БИЛД ТАНКОВ', act: () => { this.view = 'build'; } },
    { label: () => 'УПРАВЛЕНИЕ', act: () => { this.view = 'controls'; } },
    { label: () => `ЗВУК: ${settings.data.muted ? 'ВЫКЛ' : 'ВКЛ'}`, act: () => { settings.data.muted = !settings.data.muted; settings.save(); } },
    { label: () => `МУЗЫКА: ${Math.round(settings.data.music * 10)}`, adj: d => { settings.data.music = clamp01(settings.data.music + d * 0.1); settings.save(); } },
    { label: () => `ЭФФЕКТЫ: ${Math.round(settings.data.sfx * 10)}`, adj: d => { settings.data.sfx = clamp01(settings.data.sfx + d * 0.1); settings.save(); audio.play('select'); } },
    { label: () => `ТРЯСКА ЭКРАНА: ${Math.round(settings.data.shake * 10)}`, adj: d => { settings.data.shake = clamp01(settings.data.shake + d * 0.1); settings.save(); } },
    { label: () => `ЧИСЛА УРОНА: ${settings.data.damageNumbers ? 'ДА' : 'НЕТ'}`, act: () => { settings.data.damageNumbers = !settings.data.damageNumbers; settings.save(); } },
    { label: () => `СЛАБЫЙ ТЕЛЕФОН: ${settings.data.lowSpec ? 'ВКЛ' : 'ВЫКЛ'}`, act: () => { settings.data.lowSpec = !settings.data.lowSpec; settings.save(); } },
    { label: () => 'ЗАВЕРШИТЬ ЗАБЕГ', act: () => { this.view = 'confirm'; } },
  ];

  show(): void {
    this.open = true;
    this.sel = 0;
    this.view = 'main';
    this.result = '';
  }

  update(_dt: number): '' | 'quit' {
    const f = input.menu;
    if (this.view !== 'main') {
      if (this.view === 'confirm') {
        const b = clickedRect(this.yesNo);
        if (f.pressed.a1 || b === 0) { this.result = 'quit'; this.open = false; audio.play('confirm'); }
        else if (f.pressed.back || f.pressed.pause || f.pressed.a2 || b === 1) { this.view = 'main'; audio.play('select'); }
      } else if (f.pressed.a1 || f.pressed.back || f.pressed.pause || input.mouse.clicked) { this.view = 'main'; audio.play('select'); }
      return this.result;
    }
    if (f.pressed.pause || f.pressed.back) { this.open = false; audio.play('select'); return ''; }
    if (f.nav.up) { this.sel = (this.sel + this.items.length - 1) % this.items.length; audio.play('select'); }
    if (f.nav.down) { this.sel = (this.sel + 1) % this.items.length; audio.play('select'); }
    const it = this.items[this.sel];
    if (it.adj && (f.nav.left || f.nav.right)) it.adj(f.nav.left ? -1 : 1);
    if (f.pressed.a1 && it.act) { it.act(); audio.play('confirm'); }
    // Мышь
    const m = input.mouse;
    if (m.moved || m.clicked) {
      for (let i = 0; i < this.items.length; i++) {
        const r = this.rects[i];
        if (r && m.x >= r[0] && m.x < r[0] + r[2] && m.y >= r[1] && m.y < r[1] + r[3]) {
          if (this.sel !== i) { this.sel = i; audio.play('select'); }
          // ползунок: щелчок/тап по левой половине — меньше, по правой — больше
          if (m.clicked) { const x = this.items[i]; if (x.act) x.act(); else x.adj?.(m.x < r[0] + r[2] / 2 ? -1 : 1); audio.play('confirm'); }
        }
      }
    }
    return this.result;
  }

  private rects: [number, number, number, number][] = [];
  private yesNo: [number, number, number, number][] = [];

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, sim: Sim): void {
    ctx.fillStyle = 'rgba(7,6,11,0.8)';
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, 'ПАУЗА', W / 2, 14, { align: 'center', color: UI.gold, scale: 2 });
    if (this.view === 'controls') { drawControls(ctx, W, H, 40); drawText(ctx, 'ЛЮБАЯ КНОПКА — НАЗАД', W / 2, H - 16, { align: 'center', color: UI.dim }); return; }
    if (this.view === 'confirm') {
      drawText(ctx, 'ЗАВЕРШИТЬ ЗАБЕГ?', W / 2, H / 2 - 20, { align: 'center', color: UI.red, scale: 2 });
      drawText(ctx, 'Детали за достигнутое будут начислены.', W / 2, H / 2 + 4, { align: 'center', color: UI.text });
      this.yesNo = buttonRow(ctx, ['ДА, ЗАВЕРШИТЬ', 'НЕТ'], W / 2, H / 2 + 20, 100, 22, [UI.red, UI.text]);
      return;
    }
    if (this.view === 'build') { this.drawBuild(ctx, W, H, sim); return; }
    this.rects = [];
    // Невысокий экран (телефон) — две колонки крупных строк под палец.
    const two = H < 300, n = this.items.length, rows = two ? Math.ceil(n / 2) : n;
    const y0 = two ? 34 : 50, step = two ? Math.min(26, Math.floor((H - 34 - 22) / rows)) : 16;
    const bw = two ? Math.min(220, Math.floor((W - 28) / 2)) : 220, rh = step - 1;
    this.items.forEach((it, i) => {
      const col = two ? Math.floor(i / rows) : 0;
      const cx = two ? Math.round(W / 2 + (col - 0.5) * (bw + 8)) : W / 2;
      const y = y0 + (i % rows) * step;
      const sel = i === this.sel;
      const label = it.label();
      const rx = Math.round(cx - bw / 2), ty = y + Math.round((rh - 15) / 2);
      ctx.fillStyle = sel ? '#1f1c2e' : two ? 'rgba(21,19,32,0.7)' : 'rgba(0,0,0,0)';
      ctx.fillRect(rx, y - 4, bw, rh);
      if (sel) { ctx.fillStyle = UI.gold; ctx.fillRect(rx, y - 4, 2, rh); }
      drawText(ctx, (sel && !it.adj ? '▶ ' : '') + label, cx, ty, { align: 'center', color: sel ? UI.gold : UI.text });
      if (it.adj) { const c = sel ? UI.gold : UI.dim; drawText(ctx, '◀', rx + 6, ty, { color: c }); drawText(ctx, '▶', rx + bw - 6, ty, { color: c, align: 'right' }); }
      this.rects.push([rx, y - 4, bw, rh]);
    });
    drawText(ctx, `Ступень ${sim.stageIdx + 1}/8 · Время ${Math.floor(sim.time / 60)}:${String(Math.floor(sim.time % 60)).padStart(2, '0')} · Убито ${sim.kills}`, W / 2, H - 16, { align: 'center', color: UI.dim });
  }

  private drawBuild(ctx: CanvasRenderingContext2D, W: number, H: number, sim: Sim): void {
    const cw = Math.floor((W - 30) / sim.players.length);
    sim.players.forEach((p, i) => {
      const x = 10 + i * (cw + 10);
      let y = 40;
      drawText(ctx, `${i ? '2P' : '1P'} ${p.cls.name.toUpperCase()}`, x, y, { color: i ? UI.p2 : UI.p1 }); y += 14;
      for (const w of p.weapons) { drawText(ctx, `${WEAPONS[w.id].name} — ур. ${w.level}`, x, y, { color: UI.text }); y += 10; }
      y += 4;
      for (const a of p.abilities) { drawText(ctx, `${ABILITIES[a.id].name} — ур. ${a.level}`, x, y, { color: UI.blue }); y += 10; }
      y += 4;
      const ranks = [...p.ranks.entries()].map(([k, v]) => `${k}×${v}`).join(' ');
      if (ranks) { drawText(ctx, 'Улучшения: ' + ranks, x, y, { color: UI.dim }); y += 10; }
      if (p.mods.size) drawText(ctx, 'Модификаторы и синергии: ' + p.mods.size, x, y, { color: UI.purple });
    });
    drawText(ctx, 'ЛЮБАЯ КНОПКА — НАЗАД', W / 2, H - 16, { align: 'center', color: UI.dim });
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, Math.round(v * 10) / 10));
