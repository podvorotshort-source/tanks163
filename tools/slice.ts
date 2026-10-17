// Нарезка листов спрайтов (сгенерированных по docs/ART_PROMPTS.md) на отдельные PNG.
//
//   npx tsx tools/slice.ts art/01_hulls_1-4.png [ещё листы...] [--dry] [--skip 3,7] [--keys a,b,c]
//
// - фон (пурпурный или любой однотонный, определяется по краям) удаляется, края очищаются от пурпурного ореола;
// - объекты находятся как связные области (близкие части склеиваются), упорядочиваются по строкам;
// - ключи берутся из tools/sheets.ts по имени файла; результат — assets/sprites/<ключ>.png;
// - для проверки рисуется контактный лист tools/out/slice-<лист>.png с номерами и ключами.
// Декодирование и обработка картинок — в headless Chromium (Playwright), поэтому понимает PNG/WebP/JPEG.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { sheetFor } from './sheets';

const args = process.argv.slice(2);
const flag = (k: string) => args.includes('--' + k);
const opt = (k: string) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const files = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--skip', '--keys', '--out', '--gap'].includes(args[i - 1])));
const dry = flag('dry');
const skip = new Set((opt('skip') ?? '').split(',').filter(Boolean).map(Number));
const keysOverride = opt('keys')?.split(',');
const outDir = opt('out') ?? 'assets/sprites';
const gapOpt = opt('gap');

if (!files.length) {
  console.log('Использование: npx tsx tools/slice.ts <лист.png> [...] [--dry] [--skip 3,7] [--keys k1,k2] [--gap 12]');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
mkdirSync('tools/out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
// tsx добавляет в функции вызовы __name — в странице это пустышка.
await page.evaluate('globalThis.__name = (f) => f');

interface Piece { x: number; y: number; w: number; h: number; png: string; area: number }
interface Result { w: number; h: number; bg: number[]; pieces: Piece[]; contact: string }

for (const file of files) {
  const name = basename(file, extname(file));
  const found = sheetFor(name);
  if (!found) console.log(`⚠ ${name}: лист не найден в tools/sheets.ts — сохраню как ${name}_N`);
  const [sheet, layout] = found ?? [name, { keys: [], max: 320 }];
  const mime = /\.webp$/i.test(file) ? 'image/webp' : /\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/png';
  const url = `data:${mime};base64,${readFileSync(file).toString('base64')}`;
  const res = (await page.evaluate(sliceInPage, { url, whole: !!layout.whole, max: layout.max, gap: gapOpt ? Number(gapOpt) : 0 })) as Result;
  const keys = keysOverride ?? layout.keys;
  const pieces = res.pieces.filter((_, i) => !skip.has(i));
  console.log(`${sheet}: ${res.w}×${res.h}, фон rgb(${res.bg.join(',')}), найдено объектов: ${res.pieces.length}${skip.size ? `, пропущено: ${[...skip].join(',')}` : ''}, ожидалось: ${keys.length || '—'}`);
  if (keys.length && pieces.length !== keys.length) console.log(`⚠ число объектов не совпадает с раскладкой — проверьте контактный лист и используйте --skip / --keys / --gap`);
  writeFileSync(`tools/out/slice-${sheet}.png`, Buffer.from(res.contact.split(',')[1], 'base64'));
  console.log(`  контактный лист: tools/out/slice-${sheet}.png`);
  pieces.forEach((p, i) => {
    const key = keys[i] ?? `${sheet}_${i}`;
    const path = resolve(outDir, key.toLowerCase() + '.png');
    if (!dry) writeFileSync(path, Buffer.from(p.png.split(',')[1], 'base64'));
    console.log(`  #${String(i).padStart(2)} ${key.padEnd(26)} ${p.w}×${p.h}${dry ? '' : ' → ' + path.replace(resolve('.') + '\\', '')}${existsSync(path) && dry ? ' (есть)' : ''}`);
  });
}

await browser.close();

// ---------------------------------------------------------------------------
// Код ниже выполняется в браузере.
// ---------------------------------------------------------------------------

async function sliceInPage({ url, whole, max, gap }: { url: string; whole: boolean; max: number; gap: number }): Promise<Result> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0);
  const src = cx.getImageData(0, 0, W, H);
  const d = src.data;
  const toUrl = (c: HTMLCanvasElement) => c.toDataURL('image/png');
  const fit = (w: number, h: number, m: number) => { const k = Math.min(1, m / Math.max(w, h)); return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))]; };

  if (whole) {
    // Бесшовная текстура: только уменьшение.
    const [tw, th] = fit(W, H, max);
    const o = document.createElement('canvas');
    o.width = tw; o.height = th;
    const ox = o.getContext('2d')!;
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(img, 0, 0, tw, th);
    const u = toUrl(o);
    return { w: W, h: H, bg: [], pieces: [{ x: 0, y: 0, w: tw, h: th, png: u, area: W * H }], contact: u };
  }

  // Цвет фона — медиана пикселей рамки.
  const border: number[][] = [];
  for (let x = 0; x < W; x += 2) { border.push([d[x * 4], d[x * 4 + 1], d[x * 4 + 2]]); const i = ((H - 1) * W + x) * 4; border.push([d[i], d[i + 1], d[i + 2]]); }
  for (let y = 0; y < H; y += 2) { let i = y * W * 4; border.push([d[i], d[i + 1], d[i + 2]]); i = (y * W + W - 1) * 4; border.push([d[i], d[i + 1], d[i + 2]]); }
  const med = (k: number) => { const a = border.map(p => p[k]).sort((p, q) => p - q); return a[a.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const isMagentaBg = bg[0] > 150 && bg[2] > 150 && bg[1] < 110;

  // «Фоновость» пикселя: 0 — объект, 1 — фон.
  const bgness = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const dist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
    let v = 1 - Math.min(1, Math.max(0, (dist - 40) / 70));
    if (isMagentaBg) {
      // Пурпурный оттенок с высокой насыщенностью — тоже фон (сглаженные края, тени на фоне).
      const mag = Math.min(r, b) - g;
      const hueOk = Math.abs(r - b) < Math.max(40, Math.min(r, b) * 0.35);
      if (hueOk && mag > 90) v = Math.max(v, Math.min(1, (mag - 90) / 60));
    }
    bgness[i] = v;
  }
  const fg = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) fg[i] = bgness[i] < 0.5 ? 1 : 0;

  // Склейка близких частей: расширение маски на G px (раздельно по осям — быстро).
  const G = gap || Math.max(3, Math.round(Math.min(W, H) * 0.008));
  const tmp = new Uint8Array(W * H), dil = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let last = -1e9;
    for (let x = 0; x < W; x++) { if (fg[y * W + x]) last = x; if (x - last <= G) tmp[y * W + x] = 1; }
    last = 1e9;
    for (let x = W - 1; x >= 0; x--) { if (fg[y * W + x]) last = x; if (last - x <= G) tmp[y * W + x] = 1; }
  }
  for (let x = 0; x < W; x++) {
    let last = -1e9;
    for (let y = 0; y < H; y++) { if (tmp[y * W + x]) last = y; if (y - last <= G) dil[y * W + x] = 1; }
    last = 1e9;
    for (let y = H - 1; y >= 0; y--) { if (tmp[y * W + x]) last = y; if (last - y <= G) dil[y * W + x] = 1; }
  }

  // Связные области (по расширенной маске).
  const lab = new Int32Array(W * H).fill(-1);
  const comps: { x0: number; y0: number; x1: number; y1: number; area: number; id: number }[] = [];
  const stack: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!dil[i] || lab[i] >= 0) continue;
    const id = comps.length;
    const c = { x0: W, y0: H, x1: -1, y1: -1, area: 0, id };
    lab[i] = id; stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % W, y = (j / W) | 0;
      if (fg[j]) { c.area++; if (x < c.x0) c.x0 = x; if (y < c.y0) c.y0 = y; if (x > c.x1) c.x1 = x; if (y > c.y1) c.y1 = y; }
      if (x > 0 && dil[j - 1] && lab[j - 1] < 0) { lab[j - 1] = id; stack.push(j - 1); }
      if (x < W - 1 && dil[j + 1] && lab[j + 1] < 0) { lab[j + 1] = id; stack.push(j + 1); }
      if (y > 0 && dil[j - W] && lab[j - W] < 0) { lab[j - W] = id; stack.push(j - W); }
      if (y < H - 1 && dil[j + W] && lab[j + W] < 0) { lab[j + W] = id; stack.push(j + W); }
    }
    if (c.area > 0) comps.push(c); else comps.push({ ...c, area: 0 });
  }
  let list = comps.filter(c => c.area > 0);
  const areas = list.map(c => c.area).sort((a, b) => a - b);
  const medArea = areas[areas.length >> 1] ?? 1;
  list = list.filter(c => c.area >= Math.max(40, medArea * 0.06));

  // Порядок чтения: строки по вертикальным центрам.
  const hs = list.map(c => c.y1 - c.y0 + 1).sort((a, b) => a - b);
  const medH = hs[hs.length >> 1] ?? 1;
  list.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const rows: (typeof list)[] = [];
  for (const c of list) {
    const cy = (c.y0 + c.y1) / 2;
    const row = rows[rows.length - 1];
    const rcy = row ? row.reduce((s, q) => s + (q.y0 + q.y1) / 2, 0) / row.length : -1e9;
    if (row && Math.abs(cy - rcy) < medH * 0.55) row.push(c); else rows.push([c]);
  }
  const ordered = rows.flatMap(r => r.sort((a, b) => a.x0 + a.x1 - b.x0 - b.x1));

  // Вырезка с мягкой альфой и очисткой ореола.
  const pieces: Piece[] = [];
  for (const c of ordered) {
    const pad = 1;
    const x0 = Math.max(0, c.x0 - pad), y0 = Math.max(0, c.y0 - pad), x1 = Math.min(W - 1, c.x1 + pad), y1 = Math.min(H - 1, c.y1 + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const pc = document.createElement('canvas');
    pc.width = w; pc.height = h;
    const px = pc.getContext('2d')!;
    const out = px.createImageData(w, h);
    const o = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = (y0 + y) * W + x0 + x, oi = (y * w + x) * 4;
      if (lab[si] !== c.id) continue;
      const a = 1 - bgness[si];
      if (a <= 0.02) continue;
      let r = d[si * 4], g = d[si * 4 + 1], b = d[si * 4 + 2];
      if (isMagentaBg && a < 0.999) {
        // Убираем примесь фона: c = (c - bg*(1-a)) / a.
        r = Math.min(255, Math.max(0, (r - bg[0] * (1 - a)) / a));
        g = Math.min(255, Math.max(0, (g - bg[1] * (1 - a)) / a));
        b = Math.min(255, Math.max(0, (b - bg[2] * (1 - a)) / a));
      }
      if (isMagentaBg) {
        // Пурпурный оттенок у кромки — гасим.
        const m = Math.min(r, b) - g;
        if (m > 40 && a < 1) { r -= m * 0.6; b -= m * 0.6; }
      }
      o[oi] = r; o[oi + 1] = g; o[oi + 2] = b; o[oi + 3] = Math.round(a * 255);
    }
    px.putImageData(out, 0, 0);
    // Уменьшение до предела.
    const [tw, th] = fit(w, h, max);
    let fin = pc;
    if (tw !== w) {
      fin = document.createElement('canvas');
      fin.width = tw; fin.height = th;
      const fx = fin.getContext('2d')!;
      fx.imageSmoothingQuality = 'high';
      fx.drawImage(pc, 0, 0, tw, th);
    }
    pieces.push({ x: x0, y: y0, w: tw, h: th, png: toUrl(fin), area: c.area });
  }

  // Контактный лист: исходник, рамки, номера.
  const k = Math.min(1, 1400 / Math.max(W, H));
  const cs = document.createElement('canvas');
  cs.width = Math.round(W * k); cs.height = Math.round(H * k);
  const sx = cs.getContext('2d')!;
  sx.fillStyle = '#20202a';
  sx.fillRect(0, 0, cs.width, cs.height);
  sx.globalAlpha = 0.35;
  sx.drawImage(img, 0, 0, cs.width, cs.height);
  sx.globalAlpha = 1;
  sx.strokeStyle = '#3cf';
  sx.lineWidth = 2;
  for (const c of ordered) sx.strokeRect(c.x0 * k, c.y0 * k, (c.x1 - c.x0) * k, (c.y1 - c.y0) * k);
  for (let i = 0; i < ordered.length; i++) {
    const c = ordered[i];
    const im = new Image();
    im.src = pieces[i].png;
    await im.decode();
    sx.drawImage(im, c.x0 * k, c.y0 * k, (c.x1 - c.x0 + 1) * k, (c.y1 - c.y0 + 1) * k);
    sx.font = 'bold 22px sans-serif';
    sx.fillStyle = '#000';
    sx.fillText(String(i), c.x0 * k + 3, c.y0 * k + 21);
    sx.fillStyle = '#ff0';
    sx.fillText(String(i), c.x0 * k + 2, c.y0 * k + 20);
  }
  return { w: W, h: H, bg, pieces, contact: toUrl(cs) };
}
