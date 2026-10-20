// Слой высокой чёткости поверх интерфейса: иконки и витрины танков из внешней графики
// рисуются в разрешении мира, а не крупными пикселями интерфейса.
// Координаты — в пикселях интерфейса (как у остального UI).
// Слой лежит поверх всего интерфейса, поэтому рисовать в него можно только то,
// что ничем не перекрывается (allowHi = false — нарисовать по-старому, в интерфейс).

import { app } from '../app';
import { pickExt, extIcon } from './ext';
import { iconCanvas } from './art/icons';

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
