// Проверка версии для телефона: крупный интерфейс, касания в меню, сенсорные кнопки в бою.
// npm run build && npx tsx e2e/mobile.ts   (скриншоты — e2e/out/mobile-*.png)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

mkdirSync('e2e/out', { recursive: true });
const base = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch({ args: process.env.GPU ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] : [] });
// слабый телефон: 780×360 css, плотность 2
const ctx = await browser.newContext({ viewport: { width: 780, height: 360 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

const shot = (n: string) => page.screenshot({ path: `e2e/out/mobile-${n}.png` });
const scene = () => page.evaluate('__tk.app.top?.id') as Promise<string>;
/** Тап в координатах интерфейса (виртуальные пиксели). */
async function tapUI(x: number, y: number): Promise<void> {
  const [cx, cy] = await page.evaluate(([x, y]) => {
    const r = document.getElementById('screen')!.getBoundingClientRect(), s = (window as any).__tk.app.screen;
    return [r.left + (x / s.w) * r.width, r.top + (y / s.h) * r.height];
  }, [x, y]);
  await page.touchscreen.tap(cx, cy);
  await page.waitForTimeout(250);
}
/** Тап по прямоугольнику [x, y, w, h] из сцены (путь — выражение JS). */
async function tapRect(expr: string, dx = 0.5): Promise<void> {
  const r = await page.evaluate(expr) as [number, number, number, number] | { x: number; y: number; w: number; h: number };
  const [x, y, w, h] = Array.isArray(r) ? r : [r.x, r.y, r.w, r.h];
  await tapUI(x + w * dx, y + h / 2);
}

await page.goto(base);
await page.waitForTimeout(2500);
console.log('screen', JSON.stringify(await page.evaluate('({ w: __tk.app.screen.w, h: __tk.app.screen.h, compact: __tk.app.screen.compact, fps: __tk.app.maxFps })')));
await shot('1-title');
await tapRect('__tk.app.top.menu.rects[2]');           // настройки
console.log('→', await scene());
await tapRect('__tk.app.top.menu.rects[1]', 0.1);      // громкость: тап слева — меньше
await shot('2-settings');
await tapRect('__tk.app.top.menu.rects[9]');           // сбросить прогресс → диалог
await shot('3-reset');
await tapRect('__tk.app.top.yesNo[1]');                // нет
console.log('confirm closed', !(await page.evaluate('__tk.app.top.confirmReset')));
await tapRect('__tk.app.top.menu.rects[10]');          // назад
await tapRect('__tk.app.top.menu.rects[1]');           // база
console.log('→', await scene());
await shot('4-base');
await tapRect('__tk.app.top.hit.find(h => h.kind === "tab" && h.i === 4)');
await shot('5-trophies');
await tapRect('__tk.app.top.hit.find(h => h.kind === "back")');
console.log('→', await scene());
await tapRect('__tk.app.top.menu.rects[3]');           // управление
await shot('6-controls');
await tapUI(10, 10);
await tapRect('__tk.app.top.menu.rects[0]');           // играть
console.log('→', await scene());
await shot('7-setup');
await tapRect('__tk.app.top.rects.find(r => r.act === "next")');
await tapRect('__tk.app.top.rects.find(r => r.act === "ready")');
await page.waitForTimeout(3000);
console.log('→', await scene());
await shot('8-battle');
// пауза — кнопкой «II»
const vp = page.viewportSize()!;
await page.touchscreen.tap(vp.width - 36, 34);
await page.waitForTimeout(300);
await shot('9-pause');
console.log('pause open', await page.evaluate('__tk.game.pause.open'));
await tapRect('__tk.game.pause.rects[4]', 0.1);       // музыка: тап слева — меньше
await tapRect('__tk.game.pause.rects[9]');             // завершить забег → диалог
await shot('10-quit');
await tapRect('__tk.game.pause.yesNo[1]');             // нет
await tapRect('__tk.game.pause.rects[0]');             // продолжить
console.log('pause closed', !(await page.evaluate('__tk.game.pause.open')));
await page.evaluate('__tk.xp(1)');
await page.waitForTimeout(600);
await tapRect('__tk.game.levelUI.rects[1]');            // карта 2 — выбрать
await shot('11-levelup');
await tapRect('__tk.game.levelUI.btns[1]');             // взять
await page.waitForTimeout(300);
console.log('levelup closed', await page.evaluate('__tk.sim.state'));
await page.evaluate('__tk.die(0)');
await page.waitForTimeout(5000);
console.log('→', await scene());
await shot('12-results');
console.log('perf', JSON.stringify(await page.evaluate('__tk.perf()')));
if (errors.length) console.log('ERRORS', errors);
await browser.close();
