// Минимальный PNG-кодировщик для инструментов предпросмотра (Node).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Пишет RGBA-изображение (Uint32 ABGR как в ImageData) в PNG. */
export function writePng(path: string, w: number, h: number, pixels: Uint32Array): void {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const v = pixels[y * w + x];
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = v & 255; raw[o + 1] = (v >>> 8) & 255; raw[o + 2] = (v >>> 16) & 255; raw[o + 3] = (v >>> 24) & 255;
    }
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, out);
}

/** Простой холст в памяти для сборки листов предпросмотра. */
export class Sheet {
  data: Uint32Array;
  constructor(public w: number, public h: number, bg = 0xff1a1416) {
    this.data = new Uint32Array(w * h).fill(bg);
  }
  blit(img: { w: number; h: number; data: Uint32Array }, x: number, y: number, k = 1): void {
    x = Math.floor(x); y = Math.floor(y);
    for (let j = 0; j < img.h * k; j++) {
      const ty = y + j;
      if (ty < 0 || ty >= this.h) continue;
      for (let i = 0; i < img.w * k; i++) {
        const tx = x + i;
        if (tx < 0 || tx >= this.w) continue;
        const v = img.data[Math.floor(j / k) * img.w + Math.floor(i / k)];
        const a = v >>> 24;
        if (a === 0) continue;
        if (a === 255) { this.data[ty * this.w + tx] = v; continue; }
        const d = this.data[ty * this.w + tx];
        const t = a / 255;
        const mix = (s: number) => Math.round(((v >>> s) & 255) * t + ((d >>> s) & 255) * (1 - t));
        this.data[ty * this.w + tx] = (0xff000000 | (mix(16) << 16) | (mix(8) << 8) | mix(0)) >>> 0;
      }
    }
  }
  fill(x: number, y: number, w: number, h: number, v: number): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.data[j * this.w + i] = v;
  }
  save(path: string): void {
    writePng(path, this.w, this.h, this.data);
  }
}
