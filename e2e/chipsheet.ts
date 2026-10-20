// Лист-превью обломков (src/gfx/chips.ts): npx tsx e2e/chipsheet.ts → e2e/out/chips.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import type { Pix } from '../src/gfx/flame';
import { chip } from '../src/gfx/chips';

const W = 120, H = 70, K = 6;
const buf = new Uint32Array(W * H).fill(0xff3a9a4c);
const put = (p: Pix, x: number, y: number) => {
  for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) {
    const v = p.d[j * p.w + i]; const X = x + i, Y = y + j;
    if (v && X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = v;
  }
};
// Красные и белые пластинки, шестерёнки, кирпич: размеры по столбцам, справа — кадры вращения.
const cols: [string, 'plate' | 'gear'][] = [['#c8302a', 'plate'], ['#ebe5e6', 'plate'], ['#d9a032', 'gear'], ['#8f97ae', 'gear'], ['#a9521f', 'plate']];
cols.forEach(([c, sh], r) => [2, 3, 4, 5, 6, 8].forEach((s, i) => put(chip(s, c, sh, i + r, 0), 4 + i * 12, 4 + r * 12)));
cols.forEach(([c, sh], r) => { for (let f = 0; f < 4; f++) put(chip(7, c, sh, r, f), 76 + f * 11, 4 + r * 12); });
mkdirSync('e2e/out', { recursive: true });
await sharp(Buffer.from(buf.buffer), { raw: { width: W, height: H, channels: 4 } }).resize(W * K, H * K, { kernel: 'nearest' }).png().toFile('e2e/out/chips.png');
console.log('ok');
