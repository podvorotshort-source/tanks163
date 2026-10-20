// База между забегами: мастерская, арсенал, исследования, гараж, трофеи.

import { drawIcon } from '../gfx/hi';
import type { Scene } from '../app';
import { app } from '../app';
import { drawText, wrapText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { panel, menuBackground, showcaseTank, showcaseModel } from './widgets';
import { input } from '../input/input';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { save } from '../meta/save';
import { WORKSHOP, ARSENAL, RESEARCH, GARAGE, VARIANTS, THREATS, type UnlockDef } from '../meta/meta';
import { BOSSES } from '../sim/bosses';
import { STAGE_DEFS } from '../sim/content/stages';
import { fmtTime } from '../core/math';
import { TitleScene } from './title';
import { SetupScene } from './setup';

type Tab = 'workshop' | 'arsenal' | 'research' | 'garage' | 'trophies';
const TABS: { id: Tab; name: string }[] = [
  { id: 'workshop', name: 'МАСТЕРСКАЯ' }, { id: 'arsenal', name: 'АРСЕНАЛ' }, { id: 'research', name: 'ИССЛЕДОВАНИЯ' },
  { id: 'garage', name: 'ГАРАЖ' }, { id: 'trophies', name: 'ТРОФЕИ' },
];

interface Row {
  icon: string;
  name: string;
  desc: string;
  status: string;
  cost: number;
  can: boolean;
  owned: boolean;
  buy?: () => void;
  ranks?: [number, number];
}

export class BaseScene implements Scene {
  readonly id = 'base';
  t = 0;
  tab = 0;
  sel = 0;
  scroll = 0;
  flash = 0;
  msg = '';
  msgT = 0;

  enter(): void {
    music.play('menu');
    input.solo = true;
  }

  private rows(): Row[] {
    const d = save.data;
    switch (TABS[this.tab].id) {
      case 'workshop':
        return WORKSHOP.map(w => {
          const r = save.rank(w.id), max = w.costs.length, cost = r < max ? w.costs[r] : 0;
          return {
            icon: w.icon, name: w.name, desc: (r ? 'Сейчас: ' + w.desc(r) + '. ' : '') + (r < max ? 'Следующий ранг: ' + w.desc(r + 1) : 'Максимальный ранг'),
            status: r < max ? `${cost} ⚙` : 'МАКС', cost, can: r < max && d.scrap >= cost, owned: r >= max, ranks: [r, max],
            buy: () => { if (save.spend(cost)) { d.workshop[w.id] = r + 1; save.save(); } },
          };
        });
      case 'arsenal': return ARSENAL.map(u => this.unlockRow(u));
      case 'research': return RESEARCH.map(u => this.unlockRow(u));
      case 'garage': return [
        ...VARIANTS.filter(v => v.cost === 0).map(v => ({ icon: 'c_' + v.cls, name: v.name, desc: v.desc, status: 'ЕСТЬ', cost: 0, can: false, owned: true })),
        ...GARAGE.map(u => this.unlockRow(u)),
      ];
      case 'trophies': return [];
    }
  }

  private unlockRow(u: UnlockDef): Row {
    const d = save.data;
    const owned = save.has(u.id);
    const locked = !!u.needTrophy && save.trophyCount() < u.needTrophy;
    return {
      icon: u.icon, name: u.name, desc: u.desc + (locked ? ' — Нужен трофей любого босса.' : ''),
      status: owned ? 'ОТКРЫТО' : locked ? 'ЗАКРЫТО' : `${u.cost} ⚙`, cost: u.cost, can: !owned && !locked && d.scrap >= u.cost, owned,
      buy: () => { if (save.spend(u.cost)) { d.unlocked.push(u.id); save.save(); } },
    };
  }

  update(dt: number): void {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.msgT > 0) this.msgT -= dt;
    const f = input.menu;
    if (f.pressed.back || f.pressed.pause) { audio.play('select'); app.set(new TitleScene()); return; }
    const tabPrev = f.nav.left || input.players[0].pressed.a3, tabNext = f.nav.right || input.players[0].pressed.a2;
    if (tabPrev) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; this.scroll = 0; audio.play('select'); }
    if (tabNext) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; this.scroll = 0; audio.play('select'); }
    const rows = this.rows();
    if (rows.length) {
      if (f.nav.up) { this.sel = (this.sel + rows.length - 1) % rows.length; audio.play('select'); }
      if (f.nav.down) { this.sel = (this.sel + 1) % rows.length; audio.play('select'); }
      if (f.pressed.a1) this.tryBuy(rows[this.sel]);
    }
    if (input.players[1].pressed.info || input.keysDown.has('Tab') && f.pressed.info) { app.set(new SetupScene()); return; }
    // Мышь.
    const m = input.mouse;
    if (m.moved || m.clicked || m.wheel) {
      if (m.wheel) this.scroll = Math.max(0, this.scroll + m.wheel);
      for (const r of this.hit) if (m.x >= r.x && m.y >= r.y && m.x < r.x + r.w && m.y < r.y + r.h) {
        if (r.kind === 'tab' && m.clicked) { this.tab = r.i; this.sel = 0; this.scroll = 0; audio.play('select'); }
        if (r.kind === 'row') { if (this.sel !== r.i) { this.sel = r.i; audio.play('select'); } if (m.clicked) this.tryBuy(this.rows()[r.i]); }
        if (r.kind === 'play' && m.clicked) { app.set(new SetupScene()); return; }
      }
    }
  }

  private tryBuy(r: Row | undefined): void {
    if (!r || !r.buy) return;
    if (r.owned) { this.say('Уже есть'); audio.play('deny'); return; }
    if (!r.can) { this.say(r.status === 'ЗАКРЫТО' ? 'Сначала победите любого босса' : 'Не хватает деталей'); audio.play('deny'); return; }
    r.buy();
    this.flash = 0.4;
    audio.play('buy');
    this.say('Готово!');
  }

  private say(s: string): void {
    this.msg = s; this.msgT = 1.6;
  }

  private hit: { x: number; y: number; w: number; h: number; kind: string; i: number }[] = [];

  render(ctx: CanvasRenderingContext2D): void {
    const { w: W, h: H } = app.screen;
    menuBackground(ctx, W, H, this.t, Math.min(7, save.data.stats.bestStage));
    this.hit = [];
    drawText(ctx, 'БАЗА', 10, 8, { color: UI.gold, scale: 2 });
    drawText(ctx, `${save.data.scrap} ⚙ ДЕТАЛЕЙ`, W - 10, 10, { color: UI.gold, align: 'right', scale: 1 });
    if (!save.data.stats.runs) drawText(ctx, 'Детали дают за каждый забег — даже проигранный.', W - 10, 22, { color: UI.dim, align: 'right' });
    // Вкладки.
    let tx = 10;
    TABS.forEach((t, i) => {
      const w = t.name.length * 6 + 14;
      const sel = i === this.tab;
      ctx.fillStyle = sel ? '#1f1c2e' : 'rgba(21,19,32,0.7)';
      ctx.fillRect(tx, 34, w, 15);
      if (sel) { ctx.fillStyle = UI.gold; ctx.fillRect(tx, 48, w, 1); }
      drawText(ctx, t.name, tx + w / 2, 38, { align: 'center', color: sel ? UI.gold : UI.dim });
      this.hit.push({ x: tx, y: 34, w, h: 15, kind: 'tab', i });
      tx += w + 4;
    });
    const tab = TABS[this.tab].id;
    if (tab === 'trophies') { this.drawTrophies(ctx, W, H); this.footer(ctx, W, H); return; }
    const rows = this.rows();
    const listW = Math.min(360, Math.floor(W * 0.58));
    const x0 = 10, y0 = 54, rh = 18;
    const visible = Math.floor((H - y0 - 30) / rh);
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + visible) this.scroll = this.sel - visible + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, rows.length - visible)));
    rows.slice(this.scroll, this.scroll + visible).forEach((r, k) => {
      const i = k + this.scroll;
      const y = y0 + k * rh;
      const sel = i === this.sel;
      ctx.fillStyle = sel ? (this.flash > 0 ? '#3a3550' : '#1f1c2e') : 'rgba(21,19,32,0.82)';
      ctx.fillRect(x0, y, listW, rh - 2);
      if (sel) { ctx.fillStyle = UI.gold; ctx.fillRect(x0, y, 2, rh - 2); }
      drawIcon(ctx, r.icon, x0 + 4, y - 1, 18);
      drawText(ctx, r.name.toUpperCase(), x0 + 24, y + 5, { color: r.owned ? UI.dim : sel ? UI.gold : UI.text });
      if (r.ranks) for (let q = 0; q < r.ranks[1]; q++) { ctx.fillStyle = q < r.ranks[0] ? UI.gold : '#3a3550'; ctx.fillRect(x0 + listW - 70 + q * 6, y + 6, 4, 4); }
      drawText(ctx, r.status, x0 + listW - 6, y + 5, { align: 'right', color: r.owned ? UI.green : r.can ? UI.gold : UI.faint });
      this.hit.push({ x: x0, y, w: listW, h: rh - 2, kind: 'row', i });
    });
    if (rows.length > visible) drawText(ctx, `${this.scroll + 1}–${Math.min(rows.length, this.scroll + visible)} из ${rows.length}`, x0 + listW, H - 26, { align: 'right', color: UI.faint });
    // Описание выбранного.
    const r = rows[this.sel];
    const dx = x0 + listW + 10, dw = W - dx - 10;
    if (r && dw > 80) {
      panel(ctx, dx, y0, dw, 130);
      drawIcon(ctx, r.icon, dx + dw / 2 - 27, y0 + 6, 54);
      let yy = y0 + 64;
      for (const l of wrapText(r.name.toUpperCase(), dw - 12)) { drawText(ctx, l, dx + dw / 2, yy, { align: 'center', color: UI.gold }); yy += 10; }
      yy += 2;
      for (const l of wrapText(r.desc, dw - 12).slice(0, 6)) { drawText(ctx, l, dx + 6, yy, { color: UI.text }); yy += 9; }
      if (tab === 'garage') {
        const v = VARIANTS.find(q => q.name === r.name);
        if (v) showcaseTank(ctx, v.cls, 'gold', v.main, v.aux, dx + dw / 2, y0 + 170, 2, this.t);
      }
    }
    this.footer(ctx, W, H);
  }

  private footer(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawText(ctx, '◀ ▶ ВКЛАДКИ · ▲▼ ВЫБОР · ПРОБЕЛ/ENTER/✕ КУПИТЬ · ESC НАЗАД', W / 2, H - 12, { align: 'center', color: UI.dim });
    if (this.msgT > 0) drawText(ctx, this.msg, W / 2, H - 26, { align: 'center', color: this.msg === 'Готово!' ? UI.green : UI.red });
  }

  private drawTrophies(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const d = save.data;
    const ids = STAGE_DEFS.map(s => s.boss);
    const cols = 4, cw = Math.min(140, Math.floor((W - 30) / cols)), ch = 70;
    ids.forEach((id, i) => {
      const x = 10 + (i % cols) * (cw + 4), y = 56 + Math.floor(i / cols) * (ch + 4);
      const n = d.trophies[id] ?? 0;
      panel(ctx, x, y, cw, ch, n ? UI.gold : UI.line);
      const def = BOSSES[id];
      if (n) {
        showcaseModel(`boss:${def.art}`, x + cw / 2, y + 24, 48, this.t * 0.5 + i);
        drawText(ctx, def.name.toUpperCase(), x + cw / 2, y + ch - 20, { align: 'center', color: UI.gold });
        drawText(ctx, `Побед: ${n}`, x + cw / 2, y + ch - 10, { align: 'center', color: UI.dim });
      } else {
        drawText(ctx, '?', x + cw / 2, y + 20, { align: 'center', color: UI.faint, scale: 3 });
        drawText(ctx, `СТУПЕНЬ ${i + 1}`, x + cw / 2, y + ch - 14, { align: 'center', color: UI.faint });
      }
    });
    const s = d.stats;
    const lines = [
      `Забегов: ${s.runs} · Побед: ${s.wins} · Лучшая ступень: ${s.bestStage + 1}/8`,
      `Уничтожено врагов: ${Math.round(s.kills)} · Боссов: ${s.bossKills} · В бою: ${fmtTime(s.playTime)}`,
      `Лучшее время победы: ${s.bestTime ? fmtTime(s.bestTime) : '—'} · Открыто уровней угрозы: ${d.threatUnlocked} (${THREATS[d.threatUnlocked].name})`,
      `Всего заработано деталей: ${d.totalScrap}`,
    ];
    lines.forEach((l, i) => drawText(ctx, l, W / 2, 56 + 2 * (ch + 4) + 10 + i * 11, { align: 'center', color: UI.text }));
    void H;
  }
}
