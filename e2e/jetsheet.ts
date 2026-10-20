// Лист-превью струи огнемёта и обломков: npx tsx e2e/jetsheet.ts → e2e/out/jets.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { flameJet, type Pix } from '../src/gfx/flame';
import { chip } from '../src/gfx/chips';
import { RAMPS } from '../src/gfx/palette';

const W = 560, H = 360, K = 3;
const buf = new Uint32Array(W * H).fill(0xff3a9a4c);
const put = (p: Pix, x: number, y: number) => {
  for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) {
    const v = p.d[j * p.w + i]; const X = x + i, Y = y + j;
    if (v && X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = v;
  }
};
// Струи: по кадрам времени, разные направления; внизу — разгон и отрыв.
const jet = (x: number, y: number, ang: number, len: number, t: number, head = 1, tail = 0) => {
  const ex = Math.cos(ang) * len, ey = Math.sin(ang) * len * 0.5, w1 = 13, m = w1 * 2 + 4;
  const x0 = Math.min(0, ex) - m, y0 = Math.min(0, ey) - m, x1 = Math.max(0, ex) + m, y1 = Math.max(0, ey) + m;
  const p = flameJet(Math.ceil(x1 - x0), Math.ceil(y1 - y0), { ox: -x0, oy: -y0, ex: ex - x0, ey: ey - y0, w0: 1.5, w1, head, tail, t, flow: 300, seed: 3 }, RAMPS.fire);
  put(p, Math.round(x + x0), Math.round(y + y0));
};
for (let f = 0; f < 3; f++) jet(10, 30 + f * 45, 0, 220, f * 0.05);
jet(300, 40, 0.6, 200, 0); jet(520, 40, Math.PI - 0.5, 200, 0.1);
jet(300, 200, -0.7, 180, 0.2); jet(250, 330, Math.PI + 0.3, 200, 0.3);
for (let k = 0; k < 4; k++) jet(10, 190 + k * 40, 0, 200, k * 0.07, [0.3, 0.6, 1, 1][k], [0, 0, 0.3, 0.6][k]);
// Обломки: красные пластинки, белые, шестерёнки, кирпич; размеры и кадры вращения.
const cols: [string, 'plate' | 'gear'][] = [['#c8302a', 'plate'], ['#ebe5e6', 'plate'], ['#d9a032', 'gear'], ['#8f97ae', 'gear'], ['#a9521f', 'plate']];
cols.forEach(([c, sh], r) => [2, 3, 4, 5, 6, 8].forEach((s, i) => { for (let f = 0; f < 4; f++) put(chip(s, c, sh, i + r, f), 330 + i * 12 + f * 0, 250 + r * 12 + f * 0 * 2); }));
cols.forEach(([c, sh], r) => { for (let f = 0; f < 4; f++) put(chip(7, c, sh, r, f), 420 + f * 12, 250 + r * 12); });
mkdirSync('e2e/out', { recursive: true });
await sharp(Buffer.from(buf.buffer), { raw: { width: W, height: H, channels: 4 } }).resize(W * K, H * K, { kernel: 'nearest' }).png().toFile('e2e/out/jets.png');
console.log('ok');
