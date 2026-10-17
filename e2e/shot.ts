// Быстрый браузерный прогон: npx tsx e2e/shot.ts --q "dev=gallery" --steps "wait:500;key:KeyD:800;shot:a" --size 1920x1080
// Открывает dist/index.html (собранную игру) в headless Chromium, выполняет шаги,
// сохраняет скриншоты в e2e/out/ и печатает ошибки консоли.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const get = (k: string, d = '') => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const q = get('q');
const steps = get('steps', 'wait:800;shot:shot').split(';').filter(Boolean);
const [vw, vh] = get('size', '1920x1080').split('x').map(Number);
const prefix = get('prefix', 'shot');

mkdirSync('e2e/out', { recursive: true });
const url = pathToFileURL(resolve('dist/index.html')).href + (q ? '?' + q : '');

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', ...(process.env.GPU ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] : [])] });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
const errors: string[] = [];
const logs: string[] = [];
page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; if (m.type() === 'error' || m.type() === 'warning') errors.push(t); else logs.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + (e.stack || e.message)));
await page.goto(url);
await page.waitForTimeout(300);

for (const s of steps) {
  const ci = s.indexOf(':');
  const cmd = ci < 0 ? s : s.slice(0, ci), rest = ci < 0 ? '' : s.slice(ci + 1);
  const [a, b] = rest.split(':');
  if (cmd === 'wait') await page.waitForTimeout(Number(a));
  else if (cmd === 'key') { await page.keyboard.down(a); await page.waitForTimeout(Number(b || 100)); await page.keyboard.up(a); }
  else if (cmd === 'keys') { for (const k of a.split('+')) await page.keyboard.down(k); await page.waitForTimeout(Number(b || 100)); for (const k of a.split('+')) await page.keyboard.up(k); }
  else if (cmd === 'press') await page.keyboard.press(a);
  else if (cmd === 'shot') { const p = `e2e/out/${prefix}-${a || 'shot'}.png`; await page.screenshot({ path: p }); console.log('shot', p); }
  else if (cmd === 'eval') { const r = await page.evaluate(decodeURIComponent(rest)); console.log('eval', JSON.stringify(r)?.slice(0, 2000)); }
}

for (const l of logs.slice(-15)) console.log(l);
if (errors.length) { console.log('ERRORS:'); for (const e of errors) console.log(e); }
await browser.close();
process.exit(errors.some(e => e.includes('pageerror') || e.startsWith('[error]')) ? 1 : 0);
