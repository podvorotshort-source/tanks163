// Проверка живой сцены (страницы на Three.js): снимки на нескольких приближениях, FPS, ошибки консоли.
// node .claude/skills/lowpoly-3d/scripts/scene_check.mjs <page.html> <папка-для-снимков> [--csp] [--zooms 1,4,24]
// --csp: тот же запрет, что на площадке артефактов (нет fetch по data:/blob:) — ловит ошибки загрузки моделей.
// Страница должна выставлять window.__scene.setZoom(z) и скрывать #ld после загрузки.
import { chromium } from 'playwright';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const args = process.argv.slice(2);
const [page0, outDir] = args;
const csp = args.includes('--csp');
const zi = args.indexOf('--zooms');
const zooms = zi >= 0 ? args[zi + 1].split(',').map(Number) : [1, 4, 24];
let page = resolve(page0), tmp = null;
if (csp) {
  tmp = join(dirname(page), '_csp_check.html');
  const src = readFileSync(page, 'utf8').replace(/(<title>[^<]*<\/title>)/, '$1\n<meta http-equiv="Content-Security-Policy" content="connect-src file: https:; img-src file: blob: data:">');
  writeFileSync(tmp, src); page = tmp;
}
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1312, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('pageerror ' + (e.stack || e.message)));
p.on('console', m => { if (m.type() === 'error') errs.push('error ' + m.text()); });
try {
  await p.goto(pathToFileURL(page).href);
  await p.waitForFunction('document.getElementById("ld")?.hidden', null, { timeout: 90000 });
  await p.waitForTimeout(3000);
  for (const z of zooms) {
    await p.evaluate(`window.__scene.setZoom(${z})`);
    await p.waitForTimeout(1500);
    const box = await p.locator('#v').boundingBox();
    await p.screenshot({ path: join(outDir, `scene_z${z}.png`), clip: box });
  }
  const fps = await p.evaluate('new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); })');
  console.log('fps', fps);
} finally {
  console.log(errs.length ? errs.slice(0, 10).join('\n') : 'ошибок нет');
  await browser.close();
  if (tmp) unlinkSync(tmp);
}
