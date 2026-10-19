// Снимок модели в просмотрщике Three.js: node .claude/skills/lowpoly-3d/scripts/shot.mjs <model.glb> <out.png> [layout] [style]
// layout: styles (3 варианта света рядом) | turn (4 ракурса) | single
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [, , model, out, layout = 'styles', style = 'soft'] = process.argv;
const here = dirname(fileURLToPath(import.meta.url));
const W = 1800, H = layout === 'turn' ? 1200 : 700;
const url = pathToFileURL(resolve(here, 'viewer.html')).href +
  `?model=${encodeURIComponent(pathToFileURL(resolve(model)).href)}&layout=${layout}&style=${style}&w=${W}&h=${H}&dist=${process.env.DIST || 13}&el=${process.env.EL || 0.62}&bg=${process.env.BG || ''}${process.env.MODEL2 ? '&model2=' + encodeURIComponent(pathToFileURL(resolve(process.env.MODEL2)).href) : ''}`;
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await page.goto(url);
await page.waitForFunction('document.title !== "lowpoly-3d viewer"', null, { timeout: 60000 });
console.log(await page.title());
await page.screenshot({ path: out });
await browser.close();
