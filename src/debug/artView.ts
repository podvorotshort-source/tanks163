// Отладочная витрина графики (?dev=art): все объекты в разрешении мира.
// Зелёная подпись со * — объект из внешней картинки (assets/sprites), серая — процедурный.
// Листать: ←/→ или 1–6. Удобно при приёмке сгенерированных листов.

import type { Scene } from '../app';
import { app } from '../app';
import { drawText } from '../gfx/font';
import { spriteSet, drawSprite } from '../gfx/sprites';
import { hullDef, turretDef, HULLS, type HullClass, type GunKind } from '../gfx/art/tanks';
import { unitArt } from '../gfx/art/units';
import { propDef } from '../gfx/art/props';
import { iconCanvas, ICON_IDS } from '../gfx/art/icons';
import { groundAt } from '../gfx/art/ground';
import { hasExt, extKeys, extFrames, extFrame } from '../gfx/ext';
import { ENEMIES } from '../sim/content/enemies';
import { BOSSES } from '../sim/bosses';
import { UI } from '../gfx/palette';
import { makeCanvas } from '../gfx/screen';

const PAGES = ['Танки игроков', 'Враги 1–4', 'Враги 5–8', 'Боссы', 'Препятствия', 'Иконки, поверхности, эффекты'];
const PROPS: string[][] = [
  ['brick', 'steel', 'bush', 'water', 'toyCube', 'crate', 'hq', 'steelWall'],
  ['block', 'crayon', 'book', 'marble', 'slipper', 'pillow', 'furnitureLeg'],
  ['bed', 'wardrobe', 'desk', 'shelf', 'box', 'bookStack', 'toyDebris'],
  ['houseWall', 'sofa', 'table', 'fridge', 'tvStand', 'plant', 'armchair', 'stove'],
  ['house', 'tree', 'car'], ['tower', 'midrise'], ['mountain', 'cityDot'], ['volcano', 'crystal'],
];

interface Label { x: number; y: number; text: string; ext: boolean }

export class ArtViewScene implements Scene {
  readonly id = 'art';
  page = Number(new URLSearchParams(location.search).get('page') ?? 0) || 0;
  t = 0;
  private labels: Label[] = [];
  private grounds: HTMLCanvasElement[] = [];
  private onKey = (e: KeyboardEvent) => {
    if (e.code === 'ArrowRight') this.page = (this.page + 1) % PAGES.length;
    else if (e.code === 'ArrowLeft') this.page = (this.page + PAGES.length - 1) % PAGES.length;
    else if (/^Digit[1-6]$/.test(e.code)) this.page = Number(e.code.slice(5)) - 1;
  };

  enter(): void { addEventListener('keydown', this.onKey); }
  exit(): void { removeEventListener('keydown', this.onKey); }
  update(dt: number): void { this.t += dt; }

  renderWorld(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    ctx.fillStyle = '#2a2632';
    ctx.fillRect(0, 0, s.ww, s.wh);
    this.labels = [];
    const u = s.wunit;
    const a = this.t * 0.5;
    const L = (x: number, y: number, text: string, ext: boolean) => this.labels.push({ x, y, text, ext });
    if (this.page === 0) {
      const classes: [HullClass, GunKind][] = [['scout', 'ap'], ['assault', 'he'], ['heavy', 'flame']];
      const cw = s.ww / 8.5;
      classes.forEach(([cls, gun], row) => {
        for (let t = 0; t < 8; t++) {
          const x = cw * (t + 0.75), y = s.wh * (0.2 + row * 0.27);
          const k = u * 1.25;
          const ang = row === 1 ? a : 0;
          const hull = spriteSet(hullDef(cls, t % 2 && row === 2 ? 'lime' : 'gold', t > 1 ? ['rockets', 'tesla'] : [], t), k);
          const tur = spriteSet(turretDef(cls, gun, t % 2 && row === 2 ? 'lime' : 'gold', t), k);
          ctx.globalAlpha = 0.33;
          drawSprite(ctx, hull, x + 3, y + 4, ang, 0, 2);
          ctx.globalAlpha = 1;
          drawSprite(ctx, hull, x, y, ang);
          const [px, py] = HULLS[cls].pivot;
          drawSprite(ctx, tur, x + (px * Math.cos(ang) - py * Math.sin(ang)) * k, y + (px * Math.sin(ang) + py * Math.cos(ang)) * k, ang + Math.sin(this.t + t) * 0.6);
          L(x, y + 32 * u, `${cls} ${t + 1}`, hasExt(`hull_${cls}_${t + 1}`));
        }
      });
    } else if (this.page === 1 || this.page === 2) {
      const stages = this.page === 1 ? [0, 1, 2, 3] : [4, 5, 6, 7];
      stages.forEach((st, row) => {
        const list = Object.values(ENEMIES).filter(e => e.stage === st);
        list.forEach((e, i) => {
          const art = unitArt(e.art);
          const x = (s.ww / 8.6) * (i + 0.8), y = s.wh * (0.12 + row * 0.235);
          const size = Math.min(70, 26 + e.size * 0.5) * u;
          const k = size / art.size;
          const set = spriteSet(art.hull(art.ramp), k);
          drawSprite(ctx, set, x, y, art.fixed ? 0 : a);
          if (art.turret) drawSprite(ctx, spriteSet(art.turret(art.ramp), k), x, y, a * 1.3);
          if (art.rotor) drawSprite(ctx, spriteSet(art.rotor(art.ramp), k), x, y, this.t * 20);
          L(x, y + size * 0.6 + 4, e.art, hasExt('enemy_' + e.art));
        });
      });
    } else if (this.page === 3) {
      Object.values(BOSSES).forEach((b, i) => {
        const art = unitArt(b.art);
        const x = (s.ww / 4) * ((i % 4) + 0.5), y = s.wh * (i < 4 ? 0.27 : 0.7);
        const size = s.wh * 0.3;
        const k = size / art.size;
        drawSprite(ctx, spriteSet(art.hull(art.ramp), k), x, y, -Math.PI / 2 + Math.sin(this.t * 0.4) * 0.3);
        if (art.turret) drawSprite(ctx, spriteSet(art.turret(art.ramp), k), x, y, a);
        L(x, y + size * 0.55, b.art, hasExt('enemy_' + b.art));
      });
    } else if (this.page === 4) {
      PROPS.forEach((row, r) => row.forEach((kind, i) => {
        const x = (s.ww / 8.6) * (i + 0.8), y = s.wh * (0.07 + r * 0.118);
        const w = 40 * u, h = kind === 'brick' || kind === 'houseWall' || kind === 'steelWall' ? 14 * u : kind === 'water' ? 28 * u : 34 * u;
        const set = spriteSet(propDef(kind, w / u, h / u, 0), u);
        drawSprite(ctx, set, x, y, 0, Math.floor(this.t * 3) % 4);
        L(x - 12 * u, y + 12 * u, kind, hasExt('prop_' + kind));
      }));
    } else {
      // Поверхности (по 96×96 пикселей).
      if (!this.grounds.length) {
        for (let n = 0; n < 8; n++) {
          const c = makeCanvas(96, 96);
          const x = c.getContext('2d')!;
          const img = x.createImageData(96, 96);
          const d = new Uint32Array(img.data.buffer);
          for (let j = 0; j < 96; j++) for (let i = 0; i < 96; i++) d[j * 96 + i] = groundAt(n, 300 + i, 300 + j, 1);
          x.putImageData(img, 0, 0);
          this.grounds.push(c);
        }
      }
      this.grounds.forEach((c, n) => {
        const x = 16 * u + n * 104 * u * 0.85, y = s.wh - 90 * u;
        ctx.drawImage(c, Math.round(x), Math.round(y), Math.round(80 * u), Math.round(80 * u));
        L(x + 40 * u, y - 4, `ground ${n + 1}`, hasExt(`ground_${n + 1}`));
      });
      // Эффекты.
      const fr = extFrames('fx_explosion');
      if (fr) {
        const c = extFrame(`fx_explosion_${(Math.floor(this.t * 12) % fr) + 1}`, 90 * u);
        if (c) ctx.drawImage(c, Math.round(s.ww - 70 * u - c.width / 2), Math.round(s.wh * 0.3 - c.height / 2));
      }
      L(s.ww - 70 * u, s.wh * 0.3 + 50 * u, 'fx_explosion', fr > 0);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    const k = s.w2u;
    for (const l of this.labels) drawText(ctx, (l.ext ? '* ' : '') + l.text, l.x * k, l.y * k, { align: 'center', font: 'small', color: l.ext ? UI.green : UI.faint });
    if (this.page === 5) {
      // Иконки — в разрешении интерфейса, как в игре.
      ICON_IDS.forEach((id, i) => {
        const c = iconCanvas(id, 1);
        const x = 12 + (i % 24) * 25, y = 30 + Math.floor(i / 24) * 26;
        ctx.drawImage(c, x, y);
        if (hasExt('icon_' + id)) { ctx.fillStyle = UI.green; ctx.fillRect(x, y + 19, 18, 1); }
      });
    }
    drawText(ctx, `${this.page + 1}/${PAGES.length} ${PAGES[this.page].toUpperCase()}   ←/→   ВНЕШНИХ КАРТИНОК: ${extKeys().length}`, s.w / 2, 4, { align: 'center', color: UI.gold });
    drawText(ctx, 'ЗЕЛЁНЫЙ * — ИЗ КАРТИНКИ, СЕРЫЙ — ПРОЦЕДУРНЫЙ', s.w / 2, s.h - 12, { align: 'center', font: 'small', color: UI.dim });
  }
}
