// Отладочная сцена: галерея спрайтов и проверка ввода (?dev=gallery).
import type { Scene } from '../app';
import { app } from '../app';
import { input } from '../input/input';
import { drawText } from '../gfx/font';
import { spriteSet, drawSprite } from '../gfx/sprites';
import { hullDef, turretDef, HULLS, type HullClass, type GunKind } from '../gfx/art/tanks';
import { UI } from '../gfx/palette';

export class GalleryScene implements Scene {
  t = 0;
  pos = [{ x: 200, y: 200, a: 0, f: 0 }, { x: 400, y: 200, a: Math.PI, f: 0 }];

  update(dt: number): void {
    this.t += dt;
    for (let i = 0; i < 2; i++) {
      const f = input.players[i], p = this.pos[i];
      if (f.moveX || f.moveY) {
        p.a = Math.atan2(f.moveY, f.moveX);
        p.x += f.moveX * 70 * dt; p.y += f.moveY * 70 * dt;
        p.f += dt * 10;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    ctx.fillStyle = '#1d1a22';
    ctx.fillRect(0, 0, s.w, s.h);
    const u = s.unit;
    const classes: [HullClass, GunKind][] = [['scout', 'ap'], ['assault', 'he'], ['heavy', 'flame']];
    classes.forEach(([cls, gun], i) => {
      for (let k = 0; k < 6; k++) {
        const a = this.t * 0.6 + k * 1.05;
        const x = 40 + k * 46 * u, y = 40 + i * 50 * u;
        this.tank(ctx, cls, gun, k % 2 ? 'lime' : 'gold', x, y, a, a + Math.sin(this.t + k) * 0.8, Math.floor(this.t * 12), u);
      }
    });
    this.pos.forEach((p, i) => this.tank(ctx, 'assault', 'he', i ? 'lime' : 'gold', p.x, p.y, p.a, p.a, Math.floor(p.f), u));
    drawText(ctx, 'ТАНКОРОСТ — ГАЛЕРЕЯ СПРАЙТОВ', s.w / 2, s.h - 40, { align: 'center', color: UI.gold, scale: 2 });
    drawText(ctx, `FPS ${app.fps.toFixed(0)}  ${s.w}x${s.h} x${s.pixel}  1P: WASD  2P: СТРЕЛКИ`, s.w / 2, s.h - 16, { align: 'center', color: UI.dim });
    drawText(ctx, 'Съешь же ещё этих мягких французских булок, да выпей чаю! 0123456789 %+-/', 8, s.h - 60, { color: UI.text });
  }

  tank(ctx: CanvasRenderingContext2D, cls: HullClass, gun: GunKind, P: 'gold' | 'lime', x: number, y: number, a: number, ta: number, frame: number, scale: number): void {
    const hull = spriteSet(hullDef(cls, P), scale);
    const tur = spriteSet(turretDef(cls, gun, P), scale);
    // Тень
    ctx.globalAlpha = 0.35;
    drawSprite(ctx, hull, x + 2, y + 3, a, 0, 2);
    ctx.globalAlpha = 1;
    drawSprite(ctx, hull, x, y, a, frame);
    const [px, py] = HULLS[cls].pivot;
    const ox = (px * Math.cos(a) - py * Math.sin(a)) * scale, oy = (px * Math.sin(a) + py * Math.cos(a)) * scale;
    ctx.globalAlpha = 0.3;
    drawSprite(ctx, tur, x + ox + 1, y + oy + 1, ta, 0, 2);
    ctx.globalAlpha = 1;
    drawSprite(ctx, tur, x + ox, y + oy, ta);
  }
}
