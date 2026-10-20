// Подготовка к забегу: 1 или 2 игрока (2P присоединяется своей кнопкой),
// выбор варианта танка каждым игроком, устройство, уровень угрозы.

import type { Scene } from '../app';
import { app } from '../app';
import { drawText, wrapText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { panel, menuBackground, showcaseTank, buttonRow } from './widgets';
import { input, padName } from '../input/input';
import { audio } from '../audio/audio';
import { save } from '../meta/save';
import { VARIANTS, THREATS, type VariantDef } from '../meta/meta';
import { CLASSES } from '../sim/content/classes';
import { WEAPONS } from '../sim/content/weapons';
import { TitleScene } from './title';
import { startRun } from './flow';

export class SetupScene implements Scene {
  t = 0;
  players = 1;
  sel = [0, 0];
  ready = [false, false];
  threat = 0;
  private startT = -1;
  private available: VariantDef[] = [];

  constructor() {
    this.available = VARIANTS.filter(v => v.cost === 0 || save.has('v:' + v.id));
    const last = save.data.last;
    this.players = last.players;
    this.sel = last.variants.map(id => Math.max(0, this.available.findIndex(v => v.id === id)));
    if (this.players === 2 && this.sel[1] === this.sel[0]) this.sel[1] = (this.sel[0] + 2) % this.available.length;
    this.threat = Math.min(last.threat, save.data.threatUnlocked);
  }

  enter(): void {
    // телефон: играем одни (второй игрок — только с клавиатуры/геймпада)
    if (app.screen.compact) { this.players = 1; this.ready[1] = false; }
    input.solo = false;
    input.autoAssignPads();
    input.onPadJoin = (idx: number) => {
      if (input.padOf[0] === null) { input.assignPad(0, idx); audio.play('select'); }
      else if (input.padOf[1] === null) { input.assignPad(1, idx); if (this.players === 1) this.join(); }
    };
  }

  exit(): void {
    input.onPadJoin = null;
  }

  private join(): void {
    this.players = 2;
    this.ready[1] = false;
    if (this.sel[1] === this.sel[0]) this.sel[1] = (this.sel[0] + 2) % this.available.length;
    audio.play('confirm');
  }

  readonly id = 'setup';

  update(dt: number): void {
    this.t += dt;
    if (this.startT >= 0) {
      this.startT += dt;
      if (this.startT > 0.6) this.launch();
      return;
    }
    const n = this.available.length;
    // 2P присоединяется кнопкой способности 1 (Num0/Enter) или новым геймпадом.
    if (this.players === 1 && input.players[1].pressed.a1) { this.join(); return; }
    for (let i = 0; i < this.players; i++) {
      const f = input.players[i];
      if (!this.ready[i]) {
        if (f.nav.left) { this.sel[i] = (this.sel[i] + n - 1) % n; audio.play('select'); }
        if (f.nav.right) { this.sel[i] = (this.sel[i] + 1) % n; audio.play('select'); }
        if (i === 0 && save.data.threatUnlocked > 0) {
          if (f.nav.up) { this.threat = Math.min(save.data.threatUnlocked, this.threat + 1); audio.play('select'); }
          if (f.nav.down) { this.threat = Math.max(0, this.threat - 1); audio.play('select'); }
        }
      }
      if (f.pressed.a1) { this.ready[i] = !this.ready[i]; audio.play(this.ready[i] ? 'confirm' : 'select'); }
      if (f.pressed.back && i === 1 && !this.ready[1]) { this.players = 1; this.ready[1] = false; input.assignPad(1, null); audio.play('select'); }
    }
    if (input.players[0].pressed.back && !this.ready[0]) { app.set(new TitleScene()); return; }
    // Мышь: клик по стрелкам и кнопке «Готов» 1P.
    const m = input.mouse;
    if (m.clicked) {
      for (const r of this.rects) if (m.x >= r.x && m.y >= r.y && m.x < r.x + r.w && m.y < r.y + r.h) {
        if (r.act === 'prev') this.sel[r.p] = (this.sel[r.p] + n - 1) % n;
        if (r.act === 'next') this.sel[r.p] = (this.sel[r.p] + 1) % n;
        if (r.act === 'ready') this.ready[r.p] = !this.ready[r.p];
        if (r.act === 'join') this.join();
        if (r.act === 'threatPrev') this.threat = Math.max(0, this.threat - 1);
        if (r.act === 'threatNext') this.threat = Math.min(save.data.threatUnlocked, this.threat + 1);
        if (r.act === 'back') { audio.play('select'); app.set(new TitleScene()); return; }
        audio.play('select');
      }
    }
    if (this.ready.slice(0, this.players).every(Boolean)) { this.startT = 0; audio.play('confirm'); }
  }

  private launch(): void {
    const vs = this.sel.slice(0, this.players).map(i => this.available[i]);
    save.data.last = { players: this.players, variants: [vs[0].id, (vs[1] ?? this.available[this.sel[1]]).id], threat: this.threat };
    save.save();
    startRun(vs, this.threat);
  }

  private rects: { x: number; y: number; w: number; h: number; p: number; act: string }[] = [];

  render(ctx: CanvasRenderingContext2D): void {
    const { w: W, h: H } = app.screen;
    menuBackground(ctx, W, H, this.t);
    this.rects = [];
    if (app.screen.compact) { this.renderCompact(ctx, W, H); return; }
    drawText(ctx, 'ПОДГОТОВКА К БОЮ', W / 2, 10, { align: 'center', color: UI.gold, scale: 2 });
    const cols = 2;
    const cw = Math.min(280, Math.floor((W - 30) / cols));
    for (let i = 0; i < 2; i++) {
      const x = Math.round(W / 2 + (i === 0 ? -cw - 5 : 5)), y = 34, h = H - 74;
      const col = i ? UI.p2 : UI.p1;
      if (i >= this.players) {
        panel(ctx, x, y, cw, h, UI.line, 'rgba(21,19,32,0.6)');
        drawText(ctx, '2P', x + cw / 2, y + 30, { align: 'center', color: UI.p2, scale: 3 });
        const lines = ['Второй игрок: нажмите', 'NUM0 или ENTER', 'или любую кнопку на геймпаде,', 'чтобы присоединиться'];
        lines.forEach((l, k) => drawText(ctx, l, x + cw / 2, y + 70 + k * 12, { align: 'center', color: k === 1 ? UI.text : UI.dim }));
        this.rects.push({ x, y, w: cw, h, p: 1, act: 'join' });
        continue;
      }
      panel(ctx, x, y, cw, h, this.ready[i] ? col : UI.line);
      const v = this.available[this.sel[i]];
      const c = CLASSES[v.cls];
      drawText(ctx, i ? '2P' : '1P', x + 8, y + 6, { color: col, scale: 2 });
      drawText(ctx, '◀', x + 40, y + 10, { color: UI.dim });
      drawText(ctx, v.name.toUpperCase(), x + cw / 2 + 12, y + 10, { align: 'center', color: col });
      drawText(ctx, '▶', x + cw - 12, y + 10, { color: UI.dim, align: 'right' });
      this.rects.push({ x: x + 34, y: y + 4, w: 20, h: 18, p: i, act: 'prev' }, { x: x + cw - 26, y: y + 4, w: 20, h: 18, p: i, act: 'next' });
      // Витрина танка.
      showcaseTank(ctx, v.cls, i ? 'lime' : 'gold', v.main, v.aux, x + cw / 2, y + 62, 2.2, this.t * 0.8);
      let ty = y + 104;
      for (const l of wrapText(c.desc, cw - 16)) { drawText(ctx, l, x + 8, ty, { color: UI.text }); ty += 9; }
      ty += 4;
      drawText(ctx, `Орудие: ${WEAPONS[v.main].name}`, x + 8, ty, { color: UI.gold }); ty += 10;
      if (v.aux.length) { drawText(ctx, `Системы: ${v.aux.map(a => WEAPONS[a].name).join(', ')}`, x + 8, ty, { color: UI.gold }); ty += 10; }
      for (const p of c.perks) { drawText(ctx, '• ' + p, x + 8, ty, { color: UI.dim }); ty += 9; }
      // Устройство.
      const pad = input.padOf[i] !== null ? input.pads[input.padOf[i]!] : null;
      const dev = (i === 0 ? 'Клавиатура WASD + ПРОБЕЛ/E/Q' : 'Клавиатура: стрелки + NUM0/1/2') + (pad ? ' · ' + padName(pad.id) : '');
      drawText(ctx, dev, x + cw / 2, y + h - 34, { align: 'center', color: UI.faint });
      // Готов.
      const rb = { x: x + 20, y: y + h - 22, w: cw - 40, h: 16 };
      ctx.fillStyle = this.ready[i] ? col : '#1f1c2e';
      ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
      drawText(ctx, this.ready[i] ? 'ГОТОВ!' : `ГОТОВ? (${i ? 'NUM0' : 'ПРОБЕЛ'})`, x + cw / 2, rb.y + 5, { align: 'center', color: this.ready[i] ? '#07060b' : UI.text, shadow: null });
      this.rects.push({ ...rb, p: i, act: 'ready' });
    }
    // Угроза.
    const th = THREATS[this.threat];
    if (save.data.threatUnlocked > 0) drawText(ctx, `УГРОЗА: ${th.name.toUpperCase()} (W/S) — ${th.desc}`, W / 2, H - 34, { align: 'center', color: this.threat ? UI.red : UI.text });
    drawText(ctx, '◀ ▶ — ВАРИАНТ ТАНКА · СПОСОБНОСТЬ 1 — ГОТОВ · ESC — НАЗАД', W / 2, H - 20, { align: 'center', color: UI.dim });
    drawText(ctx, 'Новые варианты танков открываются в гараже базы', W / 2, H - 10, { align: 'center', color: UI.faint });
    if (this.startT >= 0) {
      ctx.fillStyle = `rgba(7,6,11,${Math.min(1, this.startT / 0.6)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** Телефон: один игрок, всё крупно — танк слева, описание справа, кнопки «Назад» / «Угроза» / «В бой» внизу. */
  private renderCompact(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawText(ctx, 'ПОДГОТОВКА К БОЮ', W / 2, 6, { align: 'center', color: UI.gold, scale: 2 });
    const x = 8, y = 26, w = W - 16, h = H - y - 30;
    const ready = this.ready[0];
    panel(ctx, x, y, w, h, ready ? UI.p1 : UI.line);
    const v = this.available[this.sel[0]];
    const c = CLASSES[v.cls];
    // выбор варианта: крупные стрелки по краям левой части
    const lw = Math.min(170, Math.floor(w * 0.38));
    drawText(ctx, v.name.toUpperCase(), x + lw / 2, y + 8, { align: 'center', color: UI.p1 });
    drawText(ctx, '◀', x + 10, y + h / 2, { color: UI.gold, scale: 2 });
    drawText(ctx, '▶', x + lw - 10, y + h / 2, { color: UI.gold, scale: 2, align: 'right' });
    this.rects.push({ x, y, w: 40, h, p: 0, act: 'prev' }, { x: x + lw - 40, y, w: 40, h, p: 0, act: 'next' });
    showcaseTank(ctx, v.cls, 'gold', v.main, v.aux, x + lw / 2, y + h / 2 + 6, Math.min(3.4, h / 46), this.t * 0.8);
    // описание
    const tx = x + lw + 6, tw = w - lw - 14;
    let ty = y + 8;
    for (const l of wrapText(c.desc, tw)) { drawText(ctx, l, tx, ty, { color: UI.text }); ty += 9; }
    ty += 3;
    drawText(ctx, `Орудие: ${WEAPONS[v.main].name}`, tx, ty, { color: UI.gold }); ty += 10;
    if (v.aux.length) { for (const l of wrapText(`Системы: ${v.aux.map(a => WEAPONS[a].name).join(', ')}`, tw)) { drawText(ctx, l, tx, ty, { color: UI.gold }); ty += 10; } }
    for (const p of c.perks) { if (ty > y + h - 12) break; drawText(ctx, '• ' + p, tx, ty, { color: UI.dim }); ty += 9; }
    // кнопки внизу
    const by = H - 25, bh = 21;
    const back = buttonRow(ctx, ['◀ НАЗАД'], x + 38, by, 76, bh)[0];
    this.rects.push({ x: back[0], y: back[1], w: back[2], h: back[3], p: 0, act: 'back' });
    const go = buttonRow(ctx, [ready ? 'ГОТОВ!' : 'В БОЙ ▶'], W - x - 50, by, 100, bh, [UI.gold])[0];
    this.rects.push({ x: go[0], y: go[1], w: go[2], h: go[3], p: 0, act: 'ready' });
    if (save.data.threatUnlocked > 0) {
      const th = THREATS[this.threat], tw2 = W - 2 * x - 76 - 100 - 24, cx = x + 76 + 12 + tw2 / 2;
      panel(ctx, cx - tw2 / 2, by, tw2, bh, this.threat ? UI.red : UI.line, 'rgba(31,28,46,0.95)');
      drawText(ctx, '◀', cx - tw2 / 2 + 6, by + 7, { color: UI.dim });
      drawText(ctx, '▶', cx + tw2 / 2 - 6, by + 7, { color: UI.dim, align: 'right' });
      drawText(ctx, 'УГРОЗА: ' + th.name.toUpperCase(), cx, by + 7, { align: 'center', color: this.threat ? UI.red : UI.text });
      this.rects.push({ x: cx - tw2 / 2, y: by, w: tw2 / 2, h: bh, p: 0, act: 'threatPrev' }, { x: cx, y: by, w: tw2 / 2, h: bh, p: 0, act: 'threatNext' });
    }
    if (this.startT >= 0) {
      ctx.fillStyle = `rgba(7,6,11,${Math.min(1, this.startT / 0.6)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

}
