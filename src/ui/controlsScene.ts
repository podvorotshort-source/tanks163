// Экран «Управление».

import type { Scene } from '../app';
import { app } from '../app';
import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { input } from '../input/input';
import { audio } from '../audio/audio';
import { drawControls } from './controlsView';
import { menuBackground } from './widgets';

export class ControlsScene implements Scene {
  t = 0;
  constructor(private back: () => Scene) {}

  update(dt: number): void {
    this.t += dt;
    const f = input.menu;
    if (f.pressed.a1 || f.pressed.back || f.pressed.pause || input.mouse.clicked) { audio.play('select'); app.set(this.back()); }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w: W, h: H } = app.screen;
    menuBackground(ctx, W, H, this.t);
    drawText(ctx, 'УПРАВЛЕНИЕ', W / 2, 14, { align: 'center', color: UI.gold, scale: 2 });
    drawControls(ctx, W, H, 40);
    drawText(ctx, 'ЛЮБАЯ КНОПКА — НАЗАД', W / 2, H - 14, { align: 'center', color: UI.dim });
  }
}
