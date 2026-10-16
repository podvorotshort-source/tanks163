// Общая математика. Без DOM — используется и в симуляции (Node), и в клиенте.

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number): number => (b === a ? 0 : (v - a) / (b - a));
export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.sqrt(dist2(ax, ay, bx, by));
export const len = (x: number, y: number): number => Math.sqrt(x * x + y * y);

/** Нормализует угол в диапазон (-PI, PI]. */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Кратчайшая разница углов b - a. */
export const angleDiff = (a: number, b: number): number => wrapAngle(b - a);

/** Поворачивает угол a к b не более чем на step радиан. */
export function rotateTowards(a: number, b: number, step: number): number {
  const d = angleDiff(a, b);
  if (Math.abs(d) <= step) return b;
  return wrapAngle(a + Math.sign(d) * step);
}

/** Экспоненциальное сглаживание, не зависящее от частоты кадров. */
export const damp = (a: number, b: number, rate: number, dt: number): number => lerp(a, b, 1 - Math.exp(-rate * dt));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number): number => t * t * t;
export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Пересечение отрезка (x1,y1)-(x2,y2) с окружностью — возвращает параметр t или -1. */
export function segCircle(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return fx * fx + fy * fy <= r * r ? 0 : -1;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  const t = (-b - s) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}

/** Ближайшая точка прямоугольника к точке — расстояние^2 (для круг-прямоугольник). */
export function rectDist2(px: number, py: number, rx: number, ry: number, rw: number, rh: number): number {
  const qx = clamp(px, rx, rx + rw), qy = clamp(py, ry, ry + rh);
  return dist2(px, py, qx, qy);
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Склонение русских существительных: plural(5, ['деталь','детали','деталей']). */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** Строковый хеш (FNV-1a) — для контрольных сумм и сидов. */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Целочисленный хеш двух/трёх координат — для детерминированного шума. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Гладкий value-noise в [0,1). */
export function vnoise(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

/** Фрактальный шум (несколько октав). */
export function fbm(x: number, y: number, oct = 3, seed = 0): number {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += vnoise(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}
