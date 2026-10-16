// Общие элементы интерфейса меню.

import { drawText, textWidth } from '../gfx/font';
import { UI } from '../gfx/palette';
import { input } from '../input/input';
import { audio } from '../audio/audio';
import { makeCanvas } from '../gfx/screen';
import { groundAt } from '../gfx/art/ground';
import { spriteSet, drawSprite } from '../gfx/sprites';
import { hullDef, turretDef } from '../gfx/art/tanks';
import { unitArt } from '../gfx/art/units';

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

let bgCanvas: HTMLCanvasElement | null = null;
let bgStage = -1;

export function menuBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, stage = 0): void {
  if (!bgCanvas || bgStage !== stage) {
    bgStage = stage;
    const bw = 360, bh = 220;
    bgCanvas = makeCanvas(bw, bh);
    const c = bgCanvas.getContext('2d')!;
    const img = c.createImageData(bw, bh);
    const d = new Uint32Array(img.data.buffer);
    const k = 4;
    const ox = 400, oy = 300;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) d[y * bw + x] = groundAt(stage, ox + x * k, oy + y * k, 1 / k);
    c.putImageData(img, 0, 0);
  }
  const bw = bgCanvas.width, bh = bgCanvas.height;
  const scale = Math.max(W / bw, H / bh) * 1.25;
  const dx = Math.sin(t * 0.05) * (bw * scale - W) * 0.4 - (bw * scale - W) / 2;
  const dy = Math.cos(t * 0.04) * (bh * scale - H) * 0.4 - (bh * scale - H) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bgCanvas, Math.round(dx), Math.round(dy), Math.round(bw * scale), Math.round(bh * scale));
  // Игрушечные танки, проезжающие по фону.
  for (let i = 0; i < 6; i++) {
    const sp = 18 + i * 5;
    const dir = i % 2 ? 1 : -1;
    const x = ((t * sp * dir + i * 173) % (W + 120) + W + 120) % (W + 120) - 60;
    const y = 40 + ((i * 97) % Math.max(1, H - 80));
    const art = unitArt(i % 3 === 0 ? 'toyTank' : i % 3 === 1 ? 'jeep' : 'armorToy');
    const set = spriteSet(art.hull(art.ramp), 0.9);
    const a = dir > 0 ? 0 : Math.PI;
    ctx.globalAlpha = 0.25;
    drawSprite(ctx, set, x + 2, y + 3, a, 0, 2);
    ctx.globalAlpha = 1;
    drawSprite(ctx, set, x, y, a, Math.floor(t * 10) % 4);
    if (art.turret) drawSprite(ctx, spriteSet(art.turret(art.ramp), 0.9), x - (art.pivot?.[0] ?? 0) * dir * -0.9, y, a + Math.sin(t + i) * 0.4);
  }
  ctx.fillStyle = 'rgba(7,6,11,0.55)';
  ctx.fillRect(0, 0, W, H);
}

/** Танк игрока для витрин меню. */
export function showcaseTank(ctx: CanvasRenderingContext2D, cls: 'scout' | 'assault' | 'heavy', ramp: 'gold' | 'lime', main: string, aux: string[], x: number, y: number, scale: number, a: number, tier = 0): void {
  const hull = spriteSet(hullDef(cls, ramp, aux as never[], tier), scale);
  const tur = spriteSet(turretDef(cls, main as never, ramp, tier), scale);
  ctx.globalAlpha = 0.35;
  drawSprite(ctx, hull, x + 3, y + 4, a, 0, 2);
  ctx.globalAlpha = 1;
  drawSprite(ctx, hull, x, y, a, 0);
  drawSprite(ctx, tur, x, y, a);
}
