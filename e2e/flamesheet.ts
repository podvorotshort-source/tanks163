// Лист-превью пиксельного огня и дыма (src/gfx/flame.ts): npx tsx e2e/flamesheet.ts → e2e/out/flames.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { charPatch, firePuff, flameTongues, smokePuff, type Pix } from '../src/gfx/flame';
import { RAMPS } from '../src/gfx/palette';

const W = 520, H = 330, K = 3;
const buf = new Uint32Array(W * H).fill(0xff3a6a2c);
const put = (p: Pix, x: number, y: number) => {
  for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) {
    const v = p.d[j * p.w + i]; const X = x + i, Y = y + j;
    if (v && X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = v;
  }
};
// Клубы пламени: возраст по столбцам, размеры по строкам.
[6, 11, 18].forEach((r, row) => {
  for (let a = 0; a < 8; a++) put(firePuff(r, RAMPS.fire, a / 7, a + row), 6 + a * 46, 4 + row * 44 + (18 - r));
});
for (let a = 0; a < 8; a++) put(firePuff(11, RAMPS.blaze, a / 7, a), 6 + a * 46, 140);
for (let f = 0; f < 10; f++) put(flameTongues(24, RAMPS.fire, f * 0.12, f / 9, 3), 6 + f * 32, 175);
for (let f = 0; f < 10; f++) put(flameTongues(12, RAMPS.fire, f * 0.12, f / 9, 5), 330 + f * 18, 195);
// Дым.
['#3a3550', '#57535f', '#9a92a0', '#272336'].forEach((col, k) => {
  [5, 9, 15, 22].forEach((r, i) => put(smokePuff(r, col, k * 4 + i), 6 + i * 52 + k * 0, 230 + k * 0));
});
['#3a3550', '#57535f', '#9a92a0'].forEach((col, k) => put(smokePuff(20, col, k), 230 + k * 50, 240));
[1, 0.6, 0.3, 0].forEach((g, k) => put(charPatch(40, RAMPS.fire, g, k, k), 380 + k * 0, 0 + 0 * k));
[1, 0.6, 0.3, 0].forEach((g, k) => put(charPatch(36, RAMPS.fire, g, k, k + 3), 6 + k * 44, 300));
mkdirSync('e2e/out', { recursive: true });
const rgba = Buffer.from(buf.buffer);
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).resize(W * K, H * K, { kernel: 'nearest' }).png().toFile('e2e/out/flames.png');
console.log('ok');
