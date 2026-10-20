// Модели для игры: models3d/*/*.glb → assets/models/*.glb (сжатие геометрии meshopt, текстуры WebP как есть).
// Запуск: node tools/pack-models.mjs [--all]  (без --all — только изменившиеся).
import { readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';

const all = process.argv.includes('--all');
const out = 'assets/models';
mkdirSync(out, { recursive: true });
let n = 0;
for (const dir of readdirSync('models3d')) {
  const d = join('models3d', dir);
  if (!statSync(d).isDirectory()) continue;
  for (const f of readdirSync(d)) {
    if (!f.endsWith('.glb')) continue;
    const src = join(d, f), dst = join(out, basename(f));
    if (!all && existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) continue;
    execSync(`npx gltf-transform optimize "${src}" "${dst}" --compress meshopt --texture-compress false --simplify false --join false --flatten false --instance false --palette false --prune false`, { stdio: 'pipe' });
    console.log(f, (statSync(src).size / 1024).toFixed(0) + ' КБ →', (statSync(dst).size / 1024).toFixed(0) + ' КБ');
    n++;
  }
}
console.log('готово, обновлено моделей:', n);
