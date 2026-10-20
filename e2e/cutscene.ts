// Запись кат-сцены после победы над боссом: GPU=1 npx tsx e2e/cutscene.ts [--q "dev=play&cls=assault&seed=3&stage=0"]
// Вызывает босса, добивает его в бою и пишет видео (e2e/out/cutscene.webm) и ключевые кадры (e2e/out/cs-*.png).
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const get = (k: string, d = '') => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const q = get('q', 'dev=play&cls=assault&seed=3&stage=0');
const W = 1280, H = 720;

mkdirSync('e2e/out/video', { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', ...(process.env.GPU ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] : [])] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: 'e2e/out/video', size: { width: W, height: H } } });
const page = await ctx.newPage();
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?' + q);
await page.waitForTimeout(2500);

// бой с боссом: неуязвимость, босс падает сверху, бой; затем последний удар
await page.evaluate('__tk.god(); __tk.boss()');
await page.waitForTimeout(5000);
await page.evaluate('(() => { const b = __tk.sim.boss; if (b) b.hp = Math.min(b.hp, b.maxHp * 0.04); })()');
await page.waitForTimeout(1500);
await page.evaluate('__tk.killBoss()');
const t0 = Date.now();
let shot = 0;
const snap = async (name: string) => { await page.screenshot({ path: `e2e/out/cs-${String(shot++).padStart(2, '0')}-${name}.png` }); };
// ждём победы (босс исчез, началась кат-сцена)
while (Date.now() - t0 < 25000) {
  const st = await page.evaluate('__tk.sim && __tk.sim.state');
  if (st === 'transition') break;
  await page.waitForTimeout(100);
}
console.log('transition after', Date.now() - t0, 'ms');
// ключевые кадры кат-сцены (TR_DRIVE0 0.9 → TR_ABSORB1 4.4 → TRANSITION_SWITCH 7.8 → конец 9.4 с)
for (const [at, name] of [[300, 'wreck'], [1800, 'drive'], [3300, 'absorb'], [4300, 'evolve'], [5600, 'zoom'], [6800, 'lego'], [8300, 'newworld'], [10500, 'title']] as const) {
  const t = await page.evaluate('__tk.sim.transition ? __tk.sim.transition.t : -1') as number;
  const wait = at - (t >= 0 ? t * 1000 : 99999);
  if (wait > 0) await page.waitForTimeout(wait);
  await snap(name);
}
await page.waitForTimeout(1500);
const video = page.video();
await ctx.close();
if (video) {
  const p = await video.path();
  rmSync('e2e/out/cutscene.webm', { force: true });
  renameSync(p, 'e2e/out/cutscene.webm');
  console.log('video e2e/out/cutscene.webm');
}
if (errors.length) console.log('ERRORS:', errors);
await browser.close();
