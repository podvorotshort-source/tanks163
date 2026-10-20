// Общие элементы интерфейса меню.

import { drawText, textWidth } from '../gfx/font';
import { UI } from '../gfx/palette';
import { input } from '../input/input';
import { audio } from '../audio/audio';
import { makeCanvas } from '../gfx/screen';
import { app } from '../app';
import { Camera } from '../client/camera';
import { sharedIso } from '../iso/shared';
import { MenuShowcase } from '../iso/showcase';
import { portrait } from '../iso/portrait';

export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border: string = UI.line, fill = 'rgba(21,19,32,0.92)'): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
}

/** Большой логотип пиксельными буквами с градиентом и обводкой. */
export function logo(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, scale: number, t: number): void {
  const w = textWidth(text, { scale });
  const x0 = Math.round(cx - w / 2);
  // Тень и обводка
  drawText(ctx, text, x0 + scale, y + scale * 2, { scale, color: '#07060b', shadow: null });
  drawText(ctx, text, x0, y, { scale, color: '#5b3409', outline: '#07060b' });
  // Градиент по строкам через клип.
  const cols = ['#fff1b4', '#fbcd4a', '#fbcd4a', '#df981c', '#df981c', '#9c5d0c', '#5b3409'];
  for (let i = 0; i < 7; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 2, y + i * scale, w + 4, scale);
    ctx.clip();
    drawText(ctx, text, x0, y, { scale, color: cols[i], shadow: null });
    ctx.restore();
  }
  // Блик
  const bx = ((t * 120) % (w + 200)) - 100;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 + bx, y, 6 * scale / 4, 7 * scale);
  ctx.clip();
  drawText(ctx, text, x0, y, { scale, color: '#ffffff', shadow: null });
  ctx.restore();
}

export interface MenuItem {
  label: string | (() => string);
  sub?: string | (() => string);
  disabled?: () => boolean;
  act?: () => void;
  adj?: (d: number) => void;
}

/** Вертикальное меню: клавиатура, геймпад, мышь. */
export class VMenu {
  sel = 0;
  rects: [number, number, number, number][] = [];
  constructor(public items: MenuItem[]) {}

  update(): void {
    const f = input.menu;
    const n = this.items.length;
    if (f.nav.up) { this.sel = (this.sel + n - 1) % n; audio.play('select'); }
    if (f.nav.down) { this.sel = (this.sel + 1) % n; audio.play('select'); }
    const it = this.items[this.sel];
    if (it?.adj && (f.nav.left || f.nav.right)) it.adj(f.nav.left ? -1 : 1);
    if (f.pressed.a1 || input.keysDown.has('Enter') && f.pressed.a1) this.activate(this.sel);
    const m = input.mouse;
    if (m.moved || m.clicked) {
      this.rects.forEach((r, i) => {
        if (m.x >= r[0] && m.x < r[0] + r[2] && m.y >= r[1] && m.y < r[1] + r[3]) {
          if (this.sel !== i) { this.sel = i; audio.play('select'); }
          if (m.clicked) this.activate(i);
        }
      });
    }
  }

  private activate(i: number): void {
    const it = this.items[i];
    if (!it) return;
    if (it.disabled?.()) { audio.play('deny'); return; }
    if (it.act) { audio.play('confirm'); it.act(); } else if (it.adj) it.adj(1);
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, y0: number, w: number, step = 18, t = 0): void {
    this.rects = [];
    this.items.forEach((it, i) => {
      const y = y0 + i * step;
      const sel = i === this.sel;
      const dis = it.disabled?.() ?? false;
      const label = typeof it.label === 'function' ? it.label() : it.label;
      if (sel) {
        ctx.fillStyle = '#1f1c2e';
        ctx.fillRect(Math.round(cx - w / 2), y - 4, w, step - 3);
        ctx.fillStyle = UI.gold;
        ctx.fillRect(Math.round(cx - w / 2), y - 4, 2, step - 3);
      }
      const bob = sel ? Math.round(Math.sin(t * 8) * 0.6) : 0;
      drawText(ctx, (sel ? '▶ ' : '') + label, cx + bob, y, { align: 'center', color: dis ? UI.faint : sel ? UI.gold : UI.text });
      this.rects.push([Math.round(cx - w / 2), y - 4, w, step - 3]);
    });
    // Подсказка выбранного пункта — под всем меню.
    const cur = this.items[this.sel];
    const sub = cur?.sub ? (typeof cur.sub === 'function' ? cur.sub() : cur.sub) : '';
    if (sub) drawText(ctx, sub, cx, y0 + this.items.length * step + 2, { align: 'center', color: UI.dim });
  }
}

// ---------------------------------------------------------------------------
// Фон меню: медленно плывущий мир и игрушечные танки
// ---------------------------------------------------------------------------

let showcase: MenuShowcase | null = null;
const bgCam = new Camera();

export function menuBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, stage = 0): void {
  const iso = sharedIso(), sc = app.screen;
  if (!showcase || showcase.stage !== stage) showcase = new MenuShowcase(stage, iso.r.litMat, iso.r.glowMat);
  showcase.update(t);
  showcase.frame(bgCam, sc.ww, sc.wh, t);
  iso.renderScene(showcase.group, bgCam, stage, 1);
  ctx.fillStyle = 'rgba(7,6,11,0.5)';
  ctx.fillRect(0, 0, W, H);
}

/** Танк игрока для витрин меню. */
export function showcaseTank(ctx: CanvasRenderingContext2D, cls: 'scout' | 'assault' | 'heavy', ramp: 'gold' | 'lime', main: string, aux: string[], x: number, y: number, scale: number, a: number, tier = 0): void {
  // В слое высокой чёткости (в меню витрину ничего не перекрывает).
  void ctx; void main; void aux;
  const s = app.screen, k = s.ww / s.w;
  s.hiUsed = true;
  const px = Math.round(34 * scale * k);
  const c = portrait(`tank:${cls}:${tier}:${ramp === 'lime' ? 1 : 0}`, px, a + Math.PI / 2, n => (n === 'turret' ? Math.sin(a * 1.3) * 0.5 : 0));
  s.hctx.drawImage(c, Math.round(x * k - px / 2), Math.round(y * k - px / 2));
}

/** Любая модель (босс, враг) — витрина в слое высокой чёткости; size — в пикселях интерфейса. */
export function showcaseModel(key: string, x: number, y: number, size: number, a: number): void {
  const s = app.screen, k = s.ww / s.w;
  s.hiUsed = true;
  const px = Math.round(size * k);
  s.hctx.drawImage(portrait(key, px, a), Math.round(x * k - px / 2), Math.round(y * k - px / 2));
}
