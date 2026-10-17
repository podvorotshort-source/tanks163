// Тестовые «листы как от генератора»: процедурные спрайты крупно на пурпурном фоне,
// со сглаженными краями (примесь фона) и неровной сеткой — для проверки tools/slice.ts.
//   npx tsx tools/fake-sheet.ts  → tools/out/fake/*.png
import { Sheet } from './png';
import { rasterize, type SpriteDef } from '../src/gfx/raster';
import { hullDef, turretDef, type HullClass, type GunKind } from '../src/gfx/art/tanks';

const MAG = 0xffff00ff;

function sheet(name: string, cols: number, rows: number, cell: number, defs: SpriteDef[], scale: number): void {
  const s = new Sheet(cols * cell, rows * cell, MAG);
  defs.forEach((d, i) => {
    const img = rasterize(d, scale, 0, 0, 0);
    const cx = (i % cols) * cell + cell / 2 + ((i * 37) % 23) - 11, cy = Math.floor(i / cols) * cell + cell / 2 + ((i * 53) % 19) - 9;
    s.blit(img, cx - img.w / 2, cy - img.h / 2);
  });
  // Размытие 3×3 — как сглаживание у генератора.
  const out = new Uint32Array(s.data.length);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const xx = Math.min(s.w - 1, Math.max(0, x + i)), yy = Math.min(s.h - 1, Math.max(0, y + j));
      const v = s.data[yy * s.w + xx];
      r += v & 255; g += (v >>> 8) & 255; b += (v >>> 16) & 255; n++;
    }
    out[y * s.w + x] = (0xff000000 | (Math.round(b / n) << 16) | (Math.round(g / n) << 8) | Math.round(r / n)) >>> 0;
  }
  s.data = out;
  s.save(`tools/out/fake/${name}.png`);
  console.log('saved', name);
}

const CLS: HullClass[] = ['scout', 'assault', 'heavy'];
sheet('01_hulls_1-4', 4, 3, 300, CLS.flatMap(c => [0, 1, 2, 3].map(t => hullDef(c, 'gold', [], t))), 7);
sheet('02_hulls_5-8', 4, 3, 300, CLS.flatMap(c => [4, 5, 6, 7].map(t => hullDef(c, 'gold', [], t))), 7);
const GUNS: GunKind[] = ['ap', 'he', 'mg', 'flame'];
sheet('03_turrets', 4, 4, 260, GUNS.flatMap(g => [0, 2, 4, 6].map(t => turretDef('assault', g, 'gold', t))), 7);
