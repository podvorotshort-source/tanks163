// Проверка геймпадов эмуляцией Gamepad API (реальные DS4/DualSense здесь недоступны).
// npx tsx e2e/gamepad.ts
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// Два виртуальных геймпада: DualSense (стандартная раскладка) и DualShock 4 в раскладке Firefox.
await page.addInitScript(`
  (function () {
    function mk(index, id, mapping) {
      var b = []; for (var i = 0; i < 17; i++) b.push({ pressed: false, value: 0, touched: false });
      return { index: index, id: id, mapping: mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3.28], buttons: b };
    }
    var pads = [
      mk(0, 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', 'standard'),
      mk(1, '054c-09cc-Wireless Controller', ''),
    ];
    window.__pads = pads;
    Object.defineProperty(navigator, 'getGamepads', { value: function () { return pads; } });
  })();
`);
await page.goto(url);
await page.waitForTimeout(800);

const setBtn = (pad: number, b: number, v: boolean) => page.evaluate(([p, bi, val]) => { const w = window as unknown as { __pads: { buttons: { pressed: boolean; value: number }[] }[] }; w.__pads[p as number].buttons[bi as number] = { pressed: val as boolean, value: val ? 1 : 0 }; }, [pad, b, v]);
const setAxes = (pad: number, x: number, y: number) => page.evaluate(([p, ax, ay]) => { const w = window as unknown as { __pads: { axes: number[] }[] }; w.__pads[p as number].axes[0] = ax as number; w.__pads[p as number].axes[1] = ay as number; }, [pad, x, y]);
const tap = async (pad: number, b: number) => { await setBtn(pad, b, true); await page.waitForTimeout(80); await setBtn(pad, b, false); await page.waitForTimeout(150); };
const state = () => page.evaluate(() => (window as unknown as { __tk: { state(): unknown; app: { top: { constructor: { name: string } } } } }).__tk.state());
const scene = () => page.evaluate(() => (window as unknown as { __tk: { app: { top: { id?: string } } } }).__tk.app.top.id);

const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, info = '') => { results.push([name, ok, info]); console.log((ok ? 'OK   ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

// 1. Меню: крест (кнопка 0 стандартной раскладки) на титуле → «ИГРАТЬ».
await tap(0, 0);
await page.waitForTimeout(400);
const s1 = await scene();
check('Крест DualSense выбирает пункт меню', s1 === 'setup', String(s1));
// 2. Подготовка: второй геймпад (Firefox-раскладка, крест = кнопка 1) присоединяет 2P.
await tap(1, 1);
await page.waitForTimeout(300);
const joined = await page.evaluate(() => { const t = (window as unknown as { __tk: { app: { top: { players?: number } } } }).__tk.app.top; return t.players; });
check('Второй геймпад присоединяет 2P', joined === 2, 'players=' + joined);
// Стик вправо — смена варианта у 2P.
const v0 = await page.evaluate(() => (window as unknown as { __tk: { app: { top: { sel: number[] } } } }).__tk.app.top.sel.slice());
await setAxes(1, 1, 0); await page.waitForTimeout(120); await setAxes(1, 0, 0); await page.waitForTimeout(150);
const v1 = await page.evaluate(() => (window as unknown as { __tk: { app: { top: { sel: number[] } } } }).__tk.app.top.sel.slice());
check('Стик 2P листает вариант танка', v1[1] !== v0[1] && v1[0] === v0[0], JSON.stringify([v0, v1]));
// Оба «Готов».
await tap(0, 0);
await tap(1, 1);
await page.waitForTimeout(1500);
check('Старт забега с геймпадов', (await scene()) === 'game', String(await scene()));
await page.waitForTimeout(1200);
// 3. Движение: левый стик 1P вправо, 2P (крестовина-«hat» Firefox) вниз.
const st0 = await state() as { players: { x: number; y: number }[] };
await setAxes(0, 1, 0);
await page.evaluate(() => { const w = window as unknown as { __pads: { axes: number[] }[] }; w.__pads[1].axes[9] = 0.14285; }); // hat: вниз
await page.waitForTimeout(800);
await setAxes(0, 0, 0);
await page.evaluate(() => { const w = window as unknown as { __pads: { axes: number[] }[] }; w.__pads[1].axes[9] = 3.28; });
const st1 = await state() as { players: { x: number; y: number }[] };
check('Стик 1P двигает танк вправо', st1.players[0].x > st0.players[0].x + 20, `${st0.players[0].x} → ${st1.players[0].x}`);
check('Крестовина 2P (Firefox) двигает танк вниз', st1.players[1].y > st0.players[1].y + 20, `${st0.players[1].y} → ${st1.players[1].y}`);
// 4. Способность 1: R2 у 1P.
const cd = async (p: number) => page.evaluate(i => (window as unknown as { __tk: { sim: { players: { abilities: { charges: number }[] }[] } } }).__tk.sim.players[i as number].abilities[0].charges, p);
await tap(0, 7);
await page.waitForTimeout(100);
check('R2 применяет способность 1 у 1P', (await cd(0)) === 0);
await tap(1, 1);
await page.waitForTimeout(100);
check('Крест (Firefox) применяет способность 1 у 2P', (await cd(1)) === 0);
// 5. Пауза кнопкой Options.
await tap(0, 9);
await page.waitForTimeout(200);
const paused = await page.evaluate(() => (window as unknown as { __tk: { game: { pause: { open: boolean } } } }).__tk.game.pause.open);
check('Options ставит паузу', paused === true);
await page.screenshot({ path: 'e2e/out/gamepad-pause.png' });

if (errors.length) console.log('ERRORS', errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(`${results.length - failed}/${results.length} проверок геймпада пройдено`);
process.exit(failed || errors.length ? 1 : 0);
