// Экран настроек.

import type { Scene } from '../app';
import { app } from '../app';
import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { VMenu, menuBackground } from './widgets';
import { settings } from '../meta/settings';
import { save } from '../meta/save';
import { input } from '../input/input';
import { audio } from '../audio/audio';

const c01 = (v: number) => Math.max(0, Math.min(1, Math.round(v * 10) / 10));

export class SettingsScene implements Scene {
  readonly id = 'settings';
  t = 0;
  menu: VMenu;
  confirmReset = false;

  constructor(private back: () => Scene) {
    const s = settings.data;
    const set = (fn: () => void) => () => { fn(); settings.save(); };
    this.menu = new VMenu([
      { label: () => `ЗВУК: ${s.muted ? 'ВЫКЛЮЧЕН' : 'ВКЛЮЧЁН'}`, act: set(() => { s.muted = !s.muted; }) },
      { label: () => `ОБЩАЯ ГРОМКОСТЬ: ${Math.round(s.master * 10)}`, sub: '◀ ▶ — изменить', adj: d => { s.master = c01(s.master + d * 0.1); settings.save(); audio.play('select'); } },
      { label: () => `МУЗЫКА: ${Math.round(s.music * 10)}`, sub: '◀ ▶ — изменить', adj: d => { s.music = c01(s.music + d * 0.1); settings.save(); } },
      { label: () => `ЭФФЕКТЫ: ${Math.round(s.sfx * 10)}`, sub: '◀ ▶ — изменить', adj: d => { s.sfx = c01(s.sfx + d * 0.1); settings.save(); audio.play('select'); } },
      { label: () => `ТРЯСКА ЭКРАНА: ${Math.round(s.shake * 10)}`, sub: '◀ ▶ — изменить', adj: d => { s.shake = c01(s.shake + d * 0.1); settings.save(); } },
      { label: () => `ЧИСЛА УРОНА: ${s.damageNumbers ? 'ДА' : 'НЕТ'}`, act: set(() => { s.damageNumbers = !s.damageNumbers; }) },
      { label: () => `СЧЁТЧИК FPS: ${s.showFps ? 'ДА' : 'НЕТ'}`, act: set(() => { s.showFps = !s.showFps; }) },
      { label: 'ВО ВЕСЬ ЭКРАН', sub: 'F11 тоже работает', act: () => { try { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); } catch { /* нет поддержки */ } } },
      { label: 'СБРОСИТЬ ПРОГРЕСС', sub: 'Мастерская, открытия и трофеи будут удалены', act: () => { this.confirmReset = true; } },
      { label: 'НАЗАД', act: () => app.set(this.back()) },
    ]);
  }

  update(dt: number): void {
    this.t += dt;
    const f = input.menu;
    if (this.confirmReset) {
      if (f.pressed.a1) { save.reset(); this.confirmReset = false; audio.play('confirm'); }
      else if (f.pressed.back || f.pressed.a2 || f.pressed.pause) { this.confirmReset = false; audio.play('select'); }
      return;
    }
    if (f.pressed.back || f.pressed.pause) { app.set(this.back()); return; }
    this.menu.update();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w: W, h: H } = app.screen;
    menuBackground(ctx, W, H, this.t);
    drawText(ctx, 'НАСТРОЙКИ', W / 2, 14, { align: 'center', color: UI.gold, scale: 2 });
    this.menu.draw(ctx, W / 2, 46, 260, 20, this.t);
    if (this.confirmReset) {
      ctx.fillStyle = 'rgba(7,6,11,0.85)';
      ctx.fillRect(0, 0, W, H);
      drawText(ctx, 'СБРОСИТЬ ВЕСЬ ПРОГРЕСС?', W / 2, H / 2 - 16, { align: 'center', color: UI.red, scale: 2 });
      drawText(ctx, 'СПОСОБНОСТЬ 1 — ДА · ESC — НЕТ', W / 2, H / 2 + 10, { align: 'center', color: UI.text });
    }
  }
}
