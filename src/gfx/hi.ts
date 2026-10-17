// Слой высокой чёткости поверх интерфейса: иконки и витрины танков из внешней графики
// рисуются в разрешении мира, а не крупными пикселями интерфейса.
// Координаты — в пикселях интерфейса (как у остального UI).
// Слой лежит поверх всего интерфейса, поэтому рисовать в него можно только то,
// что ничем не перекрывается (allowHi = false — нарисовать по-старому, в интерфейс).

import { app } from '../app';
import { pickExt, extIcon } from './ext';
import { iconCanvas } from './art/icons';
import { spriteSet, drawSprite } from './sprites';
import { hullDef, turretDef, type HullClass, type GunKind } from './art/tanks';

function hi(): [CanvasRenderingContext2D, number] {
  const s = app.screen;
  s.hiUsed = true;
  return [s.hctx, s.ww / s.w];
}

const iconCache = new Map<string, HTMLCanvasElement | null>();

/** Иконка размером size пикселей интерфейса с левым верхним углом (x, y). */
export function drawIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size = 18, allowHi = true): void {
  const ek = allowHi ? pickExt('icon_' + id) : null;
  if (ek) {
    const [h, k] = hi();
    const px = Math.max(4, Math.round(size * k));
    const key = ek + '@' + px;
    let c = iconCache.get(key);
    if (c === undefined) { c = extIcon(ek, px); iconCache.set(key, c); }
    if (c) {
      const a = ctx.globalAlpha;
      h.globalAlpha = a;
      h.drawImage(c, Math.round(x * k), Math.round(y * k));
      h.globalAlpha = 1;
      return;
    }
  }
  const scale = Math.max(1, Math.round(size / 18));
  const c = iconCanvas(id, scale);
  ctx.drawImage(c, Math.round(x), Math.round(y), size, size);
}

/** Танк-витрина (меню): в слое высокой чёткости. */
export function hiTank(cls: HullClass, ramp: 'gold' | 'lime', main: string, aux: string[], x: number, y: number, scale: number, a: number, tier = 0): void {
  const [h, k] = hi();
  const sc = scale * k;
  const hull = spriteSet(hullDef(cls, ramp, aux as GunKind[], tier), sc);
  const tur = spriteSet(turretDef(cls, main as GunKind, ramp, tier), sc);
  const X = x * k, Y = y * k;
  h.globalAlpha = 0.35;
  drawSprite(h, hull, X + 3 * k, Y + 4 * k, a, 0, 2);
  h.globalAlpha = 1;
  drawSprite(h, hull, X, Y, a, 0);
  drawSprite(h, tur, X, Y, a);
}
