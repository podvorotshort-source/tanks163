// Проверка сенсорного управления: телефон в альбомной ориентации (касания), бой, стик и кнопки.
// GPU=1 npx tsx e2e/touch.ts
import { chromium, devices } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href + '?dev=play&cls=assault&seed=3&stage=0';
const browser = await chromium.launch({ args: process.env.GPU ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] : [] });
const ctx = await browser.newContext({ ...devices['Pixel 7 landscape'] });
const page = await ctx.newPage();
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.waitForTimeout(2500);
const cdp = await ctx.newCDPSession(page);
const touch = (type: string, pts: { x: number; y: number; id: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(p => ({ x: p.x, y: p.y, id: p.id })) });
const vp = page.viewportSize()!;
const p0 = await page.evaluate('({ x: __tk.sim.players[0].x, y: __tk.sim.players[0].y })') as { x: number; y: number };
// стик: палец в левой половине, ведём вправо
await touch('touchStart', [{ x: 160, y: vp.height - 120, id: 1 }]);
for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: 160 + i * 12, y: vp.height - 120, id: 1 }]); await page.waitForTimeout(30); }
await page.waitForTimeout(900);
await page.screenshot({ path: 'e2e/out/touch-a.png' });
await touch('touchEnd', []);
const p1 = await page.evaluate('({ x: __tk.sim.players[0].x, y: __tk.sim.players[0].y })') as { x: number; y: number };
console.log('moved', Math.round(p1.x - p0.x), Math.round(p1.y - p0.y));
// пауза кнопкой
await touch('touchStart', [{ x: vp.width - 36, y: 34, id: 2 }]); await page.waitForTimeout(120); await touch('touchEnd', []);
await page.waitForTimeout(400);
console.log('scene', await page.evaluate('__tk.app.top?.id'));
await page.screenshot({ path: 'e2e/out/touch-b.png' });
if (errors.length) console.log('ERRORS', errors);
await browser.close();
