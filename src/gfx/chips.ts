// Обломки подбитых врагов и разбитых препятствий — маленькие пиксельные спрайты вместо голых квадратиков:
// осколки-пластинки (свет сверху-слева, тень снизу-справа, тёмный контур) и шестерёнки заводных игрушек.
// Кадр вращения f (0..3) — чтобы обломок кувыркался в полёте.

import { abgr, type Pix } from './flame';

const OUT = '#1a1124';

function h2(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function mix(a: string, b: string, k: number): string {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((x >> sh) & 255) * (1 - k) + ((y >> sh) & 255) * k);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
/** Тени холоднее, свет теплее (сдвиг оттенка, как в остальной графике). */
function tones(col: string): number[] {
  return [mix(col, '#2a1640', 0.5), col, mix(col, '#fff2c8', 0.42)].map(abgr);
}

export type ChipShape = 'plate' | 'gear';

/** Обломок размером s px (без контура), цвет col, вариант v, кадр вращения f. */
export function chip(s: number, col: string, shape: ChipShape, v: number, f: number): Pix {
  const S = Math.max(1, Math.round(s)), W = S + 2, R = S / 2, c = W / 2;
  const d = new Uint32Array(W * W), m = new Uint8Array(W * W);
  const [dk, base, lt] = tones(col);
  if (S <= 2) {
    // Крошка: пиксель основы + блик.
    for (let j = 1; j <= S; j++) for (let i = 1; i <= S; i++) d[j * W + i] = base;
    d[W + 1] = lt;
    return { w: W, h: W, d };
  }
  const rot = f * Math.PI / 4 + h2(v, 1, 3) * 6.28;
  if (shape === 'gear') {
    const teeth = S >= 7 ? 7 : 5;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = i + 0.5 - c, y = j + 0.5 - c, r = Math.sqrt(x * x + y * y) / R, a = Math.atan2(y, x);
      const inside = r < 0.72 || (r < 1.02 && Math.cos(teeth * (a - rot)) > 0.15);
      if (inside && !(S >= 6 && r < 0.26)) m[j * W + i] = 1;
    }
  } else {
    // Осколок: неровный выпуклый многоугольник 4–5 вершин.
    const nv = 4 + (v & 1), px: number[] = [], py: number[] = [];
    for (let k = 0; k < nv; k++) {
      const a = rot + (k / nv) * Math.PI * 2 + (h2(v, k, 5) - 0.5) * 0.9, rr = R * (0.62 + h2(v, k, 7) * 0.45);
      px.push(c + Math.cos(a) * rr); py.push(c + Math.sin(a) * rr * 0.85);
    }
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = i + 0.5, y = j + 0.5;
      let ok = true;
      for (let k = 0; k < nv && ok; k++) {
        const k2 = (k + 1) % nv;
        if ((px[k2] - px[k]) * (y - py[k]) - (py[k2] - py[k]) * (x - px[k]) < 0) ok = false;
      }
      if (ok) m[j * W + i] = 1;
    }
  }
  const at = (i: number, j: number) => i >= 0 && j >= 0 && i < W && j < W && m[j * W + i] === 1;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    if (m[k]) d[k] = !at(i, j - 1) || !at(i - 1, j) ? lt : !at(i, j + 1) || !at(i + 1, j) ? dk : base;
    else if (S >= 4 && (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1))) d[k] = abgr(OUT);
  }
  return { w: W, h: W, d };
}
