// Предпросмотр процедурной графики без браузера: `npx tsx tools/art-preview.ts [набор]`
// Пишет PNG в tools/out/. Нужен для быстрой итерации над спрайтами.
import { Sheet } from './png';
import { rasterize, type SpriteDef } from '../src/gfx/raster';
import { hullDef, turretDef, HULLS, type HullClass, type GunKind } from '../src/gfx/art/tanks';
import type { RampId } from '../src/gfx/palette';
import { unitArt } from '../src/gfx/art/units';
import { propDef } from '../src/gfx/art/props';
import { iconDef, ICON_IDS } from '../src/gfx/art/icons';

const which = process.argv[2] ?? 'tanks';
const ZOOM = 4;

function composite(sheet: Sheet, hull: SpriteDef, turret: SpriteDef, cls: HullClass, cx: number, cy: number, scale: number, ang: number, tAng: number, frame = 0) {
  const h = rasterize(hull, scale, ang, frame);
  sheet.blit(h, cx * ZOOM - Math.floor(h.w / 2) * ZOOM, cy * ZOOM - Math.floor(h.h / 2) * ZOOM, ZOOM);
  const [px, py] = HULLS[cls].pivot;
  const ox = Math.round((px * Math.cos(ang) - py * Math.sin(ang)) * scale);
  const oy = Math.round((px * Math.sin(ang) + py * Math.cos(ang)) * scale);
  const t = rasterize(turret, scale, tAng, 0);
  sheet.blit(t, (cx + ox) * ZOOM - Math.floor(t.w / 2) * ZOOM, (cy + oy) * ZOOM - Math.floor(t.h / 2) * ZOOM, ZOOM);
}

if (which === 'tanks') {
  const classes: [HullClass, GunKind][] = [['scout', 'ap'], ['assault', 'he'], ['heavy', 'flame']];
  const players: RampId[] = ['gold', 'lime'];
  const angles = [0, Math.PI / 8, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -Math.PI / 3];
  const cell = 44;
  const sheet = new Sheet(cell * angles.length * ZOOM, cell * classes.length * players.length * ZOOM + cell * 2 * ZOOM);
  let row = 0;
  for (const P of players) {
    for (const [cls, gun] of classes) {
      angles.forEach((a, i) => {
        composite(sheet, hullDef(cls, P), turretDef(cls, gun, P), cls, i * cell + cell / 2, row * cell + cell / 2, 1, a, a + (i === 6 ? 1.2 : 0), i % 4);
      });
      row++;
    }
  }
  // С модулями
  const mods: GunKind[][] = [['rockets', 'mines', 'tesla', 'ram'], ['mg', 'flame', 'ap', 'he']];
  mods.forEach((m, k) => {
    const cls: HullClass = k === 0 ? 'assault' : 'heavy';
    angles.forEach((a, i) => {
      composite(sheet, hullDef(cls, 'gold', m), turretDef(cls, k ? 'mg' : 'rockets', 'gold'), cls, i * cell + cell / 2, row * cell + cell / 2, 1, a, a, 0);
    });
    row++;
  });
  sheet.save('tools/out/tanks.png');
  console.log('tools/out/tanks.png');
}

if (which === 'tiers') {
  const classes: [HullClass, GunKind][] = [['scout', 'ap'], ['assault', 'he'], ['heavy', 'flame']];
  const cell = 46;
  const sheet = new Sheet(cell * 8 * ZOOM, cell * 6 * ZOOM);
  classes.forEach(([cls, gun], row) => {
    for (let t = 0; t < 8; t++) {
      const a = -0.5;
      composite(sheet, hullDef(cls, 'gold', [], t), turretDef(cls, gun, 'gold', t), cls, t * cell + cell / 2, row * cell + cell / 2, 1 + t * 0.025, a, a, 0);
      const mods: GunKind[] = t >= 3 ? ['rockets', 'mines', 'tesla'] : ['mines'];
      composite(sheet, hullDef(cls, 'lime', mods, t), turretDef(cls, gun, 'lime', t), cls, t * cell + cell / 2, (row + 3) * cell + cell / 2, 1 + t * 0.025, 0, 0.3, 0);
    }
  });
  sheet.save('tools/out/tiers.png');
  console.log('tools/out/tiers.png');
}

if (which === 'enemies') {
  const ids = process.argv[3] ? process.argv[3].split(',') : ['soldier', 'toyTank', 'jeep', 'heli', 'armorToy', 'mortar', 'bigToy', 'toyBunker', 'windMouse', 'top', 'rcCar', 'toyRobot', 'plane', 'blockGolem', 'jackBox', 'rcTank'];
  const cell = 80;
  const cols = 8;
  const sheet = new Sheet(cell * cols * 2, Math.ceil(ids.length / cols) * cell * 2);
  ids.forEach((id, i) => {
    const art = unitArt(id);
    const k = Math.min(1.6, 60 / art.size);
    const cx = (i % cols) * cell + cell / 2, cy = Math.floor(i / cols) * cell + cell / 2;
    const h = rasterize(art.hull(art.ramp), k, -0.4, 0);
    sheet.blit(h, cx * 2 - h.w, cy * 2 - h.h, 2);
    if (art.turret) {
      const t = rasterize(art.turret(art.ramp), k, -0.2, 0);
      const [px, py] = art.pivot ?? [0, 0];
      const ox = Math.round((px * Math.cos(-0.4) - py * Math.sin(-0.4)) * k), oy = Math.round((px * Math.sin(-0.4) + py * Math.cos(-0.4)) * k);
      sheet.blit(t, (cx + ox) * 2 - t.w, (cy + oy) * 2 - t.h, 2);
    }
    if (art.rotor) { const r = rasterize(art.rotor(art.ramp), k, 0.3, 0); sheet.blit(r, cx * 2 - r.w, cy * 2 - r.h, 2); }
  });
  sheet.save('tools/out/enemies.png');
  console.log('tools/out/enemies.png');
}

if (which === 'props') {
  const items: [string, number, number, number][] = [
    ['brick', 8, 8, 0], ['brick', 8, 8, 1], ['steel', 16, 16, 0], ['bush', 16, 16, 1], ['water', 48, 32, 0], ['toyCube', 48, 48, 2], ['crate', 30, 30, 0], ['hq', 44, 44, 0],
    ['block', 40, 28, 1], ['crayon', 130, 14, 2], ['book', 120, 90, 3], ['marble', 18, 18, 1], ['slipper', 160, 80, 0], ['pillow', 160, 80, 0], ['furnitureLeg', 90, 90, 0], ['steelWall', 16, 16, 0],
    ['bed', 260, 180, 0], ['box', 60, 50, 1], ['bookStack', 44, 30, 2], ['houseWall', 120, 30, 0], ['sofa', 130, 55, 0], ['fridge', 55, 45, 0], ['plant', 35, 35, 0], ['stove', 50, 45, 0],
    ['house', 120, 100, 2], ['tree', 26, 26, 1], ['car', 24, 12, 3], ['tower', 110, 110, 1], ['midrise', 30, 36, 2], ['mountain', 200, 150, 1], ['cityDot', 40, 40, 2], ['volcano', 160, 160, 1], ['crystal', 50, 50, 0],
  ];
  const cell = 96, cols = 8;
  const sheet = new Sheet(cell * cols, Math.ceil(items.length / cols) * cell);
  items.forEach(([k, w, h, v], i) => {
    const s = Math.min(1.5, 80 / Math.max(w, h));
    const img = rasterize(propDef(k, w, h, v), s, 0, 1);
    sheet.blit(img, (i % cols) * cell + cell / 2 - img.w / 2, Math.floor(i / cols) * cell + cell / 2 - img.h / 2, 1);
  });
  sheet.save('tools/out/props.png');
  console.log('tools/out/props.png');
}

if (which === 'icons') {
  const sheet = new Sheet(ICON_IDS.length * 36 > 1200 ? 1200 : ICON_IDS.length * 36, Math.ceil(ICON_IDS.length / 33) * 40 + 4);
  ICON_IDS.forEach((id, i) => {
    const img = rasterize(iconDef(id), 1, 0, 0, 0, 18);
    sheet.blit(img, (i % 33) * 36 + 2, Math.floor(i / 33) * 40 + 2, 2);
  });
  sheet.save('tools/out/icons.png');
  console.log('tools/out/icons.png');
}

if (which === 'scales') {
  // Один танк на разных масштабах (LOD).
  const scales = [0.35, 0.5, 0.75, 1, 1.5, 2];
  const sheet = new Sheet(80 * scales.length * 2, 90 * 2);
  scales.forEach((s, i) => {
    const h = rasterize(hullDef('assault', 'gold', ['rockets', 'mines']), s, -0.4, 0);
    sheet.blit(h, i * 160 + 80 - h.w, 90 - h.h, 2);
  });
  sheet.save('tools/out/scales.png');
  console.log('tools/out/scales.png');
}
