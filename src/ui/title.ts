// Титульный экран.

import type { Scene } from '../app';
import { app } from '../app';
import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { VMenu, logo, menuBackground, showcaseTank } from './widgets';
import { music } from '../audio/music';
import { save } from '../meta/save';
import { SetupScene } from './setup';
import { BaseScene } from './base';
import { SettingsScene } from './settingsScene';
import { ControlsScene } from './controlsScene';
import { input } from '../input/input';

export class TitleScene implements Scene {
  readonly id = 'title';
  t = 0;
  menu: VMenu;
  notice = '';
  noticeT = 0;

  constructor() {
    this.menu = new VMenu([
      { label: 'ИГРАТЬ', sub: () => (app.screen.compact ? 'Новый забег' : 'Один или вдвоём на одном компьютере'), act: () => app.set(new SetupScene()) },
      { label: 'БАЗА', sub: () => `Мастерская, арсенал, исследования · деталей: ${save.data.scrap}`, act: () => app.set(new BaseScene()) },
      { label: 'НАСТРОЙКИ', sub: 'Звук, тряска, числа урона', act: () => app.set(new SettingsScene(() => new TitleScene())) },
      { label: 'УПРАВЛЕНИЕ', sub: 'Клавиатура для двоих и геймпады', act: () => app.set(new ControlsScene(() => new TitleScene())) },
    ]);
    if (save.status === 'restored') this.notice = 'Сохранение было повреждено — восстановлено из резервной копии';
    else if (save.status === 'reset') this.notice = 'Сохранение повреждено и не читается — начат новый прогресс';
    if (this.notice) this.noticeT = 7;
    save.status = 'ok';
  }

  enter(): void {
    music.play('menu');
    input.solo = true;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.noticeT > 0) this.noticeT -= dt;
    this.menu.update();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w: W, h: H } = app.screen;
    menuBackground(ctx, W, H, this.t, Math.min(7, save.data.stats.bestStage));
    const sc = W >= 600 ? 6 : 4;
    logo(ctx, 'ТАНКОРОСТ', W / 2, Math.round(H * 0.12), sc, this.t);
    drawText(ctx, 'ТАНКОВЫЙ РОГАЛИК · ОТ ИГРУШЕК ДО ПЛАНЕТ', W / 2, Math.round(H * 0.12) + sc * 7 + 10, { align: 'center', color: UI.text });
    // Два танка-витрины по бокам.
    const ty = Math.round(H * 0.58);
    showcaseTank(ctx, 'assault', 'gold', 'he', [], Math.round(W * 0.16), ty, 2, -Math.PI / 2 + Math.sin(this.t) * 0.2);
    showcaseTank(ctx, 'heavy', 'lime', 'flame', [], Math.round(W * 0.84), ty, 2, -Math.PI / 2 - Math.sin(this.t) * 0.2);
    const compact = app.screen.compact;
    this.menu.draw(ctx, W / 2, Math.round(H * (compact ? 0.4 : 0.45)), 200, compact ? 21 : 22, this.t);
    const s = save.data.stats;
    const info = s.runs ? `Забегов: ${s.runs} · Лучший результат: ступень ${s.bestStage + 1}/8 · Побед: ${s.wins}` : 'Добро пожаловать, командир!';
    drawText(ctx, info, W / 2, H - (compact ? 12 : 22), { align: 'center', color: UI.dim });
    if (!compact) drawText(ctx, 'ПРОБЕЛ / ENTER / ✕ — ВЫБОР', W / 2, H - 11, { align: 'center', color: UI.faint });
    if (this.noticeT > 0 && this.notice) {
      ctx.globalAlpha = Math.min(1, this.noticeT);
      drawText(ctx, this.notice, W / 2, Math.round(H * 0.38), { align: 'center', color: UI.red, outline: '#07060b' });
      ctx.globalAlpha = 1;
    }
  }
}
