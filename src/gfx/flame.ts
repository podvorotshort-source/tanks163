// Пиксельный огонь и дым кодом (по образцу листа эффектов): клубы пламени с бело-жёлтым ядром,
// оранжевым телом и красной кромкой; языки пламени для горящей земли и подбитых машин;
// объёмный дым-«цветная капуста» со светом сверху. Чистые функции → буфер ABGR (без холста),
// чтобы их можно было смотреть и вне браузера.

export interface Pix { w: number; h: number; d: Uint32Array }

const rgbCache = new Map<string, number>();
export function abgr(col: string): number {
  let v = rgbCache.get(col);
  if (v === undefined) {
    const n = parseInt(col.slice(1), 16);
    v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
    rgbCache.set(col, v);
  }
  return v;
}

/** Целочисленный хеш → 0..1. */
function h2(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Гладкий шум значений. */
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, s: number): number {
  return vnoise(x, y, s) * 0.6 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.1;
}

/** Клубки «цветной капусты»: центры и радиусы (доли радиуса r) для варианта v. */
function lobes(v: number, n: number): number[] {
  const out: number[] = [0, 0.05, 0.62];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + h2(v, i, 3) * 0.9;
    const d = 0.36 + h2(v, i, 5) * 0.16;
    out.push(Math.cos(a) * d, Math.sin(a) * d * 0.9, 0.34 + h2(v, i, 9) * 0.18);
  }
  return out;
}

/** Тёмные тоны остывшего клуба (дым с жаром внутри). */
const ASH = ['#1a1522', '#2a2434', '#3d3646', '#544c5a'];

/**
 * Клуб пламени радиусом r px. ramp — 6 цветов (тёмный → светлый), age 0..1 — остывание:
 * ядро сжимается, цвета уходят к красному, края темнеют в дым. v — вариант формы.
 */
export function firePuff(r: number, ramp: readonly string[], age: number, v: number): Pix {
  const R = Math.max(1, r);
  const s = Math.ceil(R * 2.3) + 2, c = s / 2;
  const d = new Uint32Array(s * s);
  if (R < 1.6) {
    // Крошечный — один-два пикселя цвета по возрасту.
    const col = abgr(ramp[Math.max(1, Math.min(5, Math.round(5 - age * 4)))]);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if ((i + 0.5 - c) ** 2 + (j + 0.5 - c) ** 2 <= R * R) d[j * s + i] = col;
    return { w: s, h: s, d };
  }
  const L = lobes(v, 5 + (v % 3));
  const pal = ramp.map(abgr), ash = ASH.map(abgr);
  const ns = 0.5 / Math.max(1, R / 7);
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const x = (i + 0.5 - c) / R, y = (j + 0.5 - c) / R;
    let best = -1, bk = 0;
    for (let k = 0; k < L.length; k += 3) {
      const q = 1 - Math.sqrt((x - L[k]) ** 2 + (y - L[k + 1]) ** 2) / L[k + 2];
      if (q > best) { best = q; bk = k; }
    }
    if (best <= 0) continue;
    // Свет своего клубка (пузыри «капусты» со светлым верхом) + общий жар к центру, чуть выше середины.
    const rr = L[bk + 2], lx = (x - L[bk]) / rr, ly = (y - L[bk + 1]) / rr;
    const nz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
    const lit = -lx * 0.3 - ly * 0.55 + nz * 0.5;
    const core = 1 - Math.sqrt(x * x + (y + 0.12) ** 2) / 0.9;
    const n = fbm(i * ns, j * ns, v * 31) - 0.5;
    const heat = core * 0.85 + lit * 0.3 + n * 0.22 - age * 1.05;
    if (best < 0.1 && heat > -0.1) { d[j * s + i] = pal[age > 0.5 ? 0 : 1]; continue; }   // кромка клубка
    if (heat > -0.12) {
      const idx = heat > 0.62 ? 5 : heat > 0.42 ? 4 : heat > 0.22 ? 3 : heat > 0.04 ? 2 : 1;
      d[j * s + i] = pal[idx];
    } else {
      // Остывшее — дым: прозрачнеет к концу жизни (выпадают внешние клубки).
      if (best < (age - 0.55) * 1.6) continue;
      d[j * s + i] = ash[lit > 0.45 ? 3 : lit > 0.15 ? 2 : lit > -0.2 ? 1 : 0];
    }
  }
  return { w: s, h: s, d };
}

/**
 * Языки пламени: ширина w px, высота ≈1.5w, низ — у нижнего края. t — время (языки колышутся и
 * бегут вверх), life 0..1 — стадия (разгорается, потом опадает), v — вариант.
 */
export function flameTongues(w: number, ramp: readonly string[], t: number, life: number, v: number): Pix {
  const W = Math.max(3, Math.round(w)), H = Math.round(W * 1.35) + 2;
  const d = new Uint32Array(W * H);
  const pal = ramp.map(abgr);
  const grow = life < 0.2 ? 0.5 + life / 0.2 * 0.5 : 1 - Math.max(0, life - 0.45) / 0.55 * 0.65;
  // Языки: смещение, высота, ширина, фаза.
  const nt = W < 10 ? 2 : W < 22 ? 3 : 4;
  const tg: number[] = [];
  for (let k = 0; k < nt; k++) {
    const ox = ((k / (nt - 1)) * 1.1 - 0.55) + (h2(v, k, 1) - 0.5) * 0.2;
    const mid = 1 - Math.abs(ox) * 1.1;
    tg.push(ox, (0.3 + mid * 0.5 + h2(v, k, 2) * 0.4) * grow, 0.32 + h2(v, k, 3) * 0.14, h2(v, k, 4) * 6.28);
  }
  const ns = 3.2 / Math.max(6, W);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const xn = (i + 0.5) / W * 2 - 1;
    const yn = (H - 1 - j) / (H - 1);               // 0 низ .. 1 верх
    let heat = -1;
    for (let k = 0; k < tg.length; k += 4) {
      const th = tg[k + 1]; if (yn > th * 1.3) continue;
      const u = yn / th;                            // 0..1 вдоль языка (выше 1 — отрывающийся кончик)
      const cx = tg[k] * (1 - Math.min(1, u) * 0.35) + Math.sin(t * 7 + u * 3.5 + tg[k + 3]) * 0.3 * u * u;
      if (u > 1) {
        const q = 0.7 - Math.abs(u - 1.15) * 6 - Math.abs(xn - cx) / (tg[k + 2] * 0.35);
        if (q > heat && Math.sin(t * 9 + tg[k + 3] * 3) > 0.2) heat = q;
        continue;
      }
      const hw = tg[k + 2] * Math.pow(1 - u, 0.55) * (0.85 + u * (1 - u) * 1.1);
      const q = (1 - Math.abs(xn - cx) / Math.max(0.02, hw)) * (1 - u * 0.25);
      if (q > heat) heat = q;
    }
    // Низ — общая «подушка» пламени.
    const bed = (1 - yn / (0.3 * grow + 0.05)) * (1 - xn * xn);
    if (bed > heat) heat = bed;
    if (heat <= -0.3) continue;
    const n = fbm(i * ns * 0.8 + v * 5.3, (H - j) * ns - t * 4, v * 17 + 1);
    heat += (n - 0.5) * 0.55 + (1 - yn) * 0.15 - Math.abs(xn) * 0.12;
    if (heat < 0.08) continue;
    const idx = heat > 0.85 ? 5 : heat > 0.6 ? 4 : heat > 0.38 ? 3 : heat > 0.2 ? 2 : 1;
    d[j * W + i] = pal[idx];
  }
  // Кромка: краевые пиксели — тёмно-красные, снаружи по бокам и сверху — почти чёрный контур,
  // чтобы языки соседних костров читались по отдельности.
  const m = d.slice();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    const e = (ii: number, jj: number) => ii < 0 || jj < 0 || ii >= W || jj >= H || !m[jj * W + ii];
    if (m[k]) { if ((e(i - 1, j) || e(i + 1, j) || e(i, j - 1)) && m[k] !== pal[5]) d[k] = pal[1]; }
    else if (j < H - 2 && (!e(i - 1, j) || !e(i + 1, j) || !e(i, j + 1))) d[k] = pal[0];
  }
  return { w: W, h: H, d };
}

/** Смешать два цвета #rrggbb. */
function mix(a: string, b: string, k: number): string {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((x >> sh) & 255) * (1 - k) + ((y >> sh) & 255) * k);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
const smokeTones = new Map<string, string[]>();
/** Тоны дыма от базового цвета: тень (сине-фиолетовая), основа, свет (тёплый), блик. */
function tonesOf(col: string): string[] {
  let t = smokeTones.get(col);
  if (!t) {
    t = [mix(col, '#140f24', 0.42), col, mix(col, '#d8cfc4', 0.28), mix(col, '#efe6da', 0.5)];
    smokeTones.set(col, t);
  }
  return t;
}

/** Клуб дыма радиусом r px: «капуста» из клубков, свет сверху-слева, тень снизу.
 *  cut 0..1 — рассыпание к концу жизни (края съедаются, внутри редеет). */
export function smokePuff(r: number, col: string, v: number, cut = 0): Pix {
  const R = Math.max(1, r);
  const s = Math.ceil(R * 2.3) + 2, c = s / 2;
  const d = new Uint32Array(s * s);
  const tn = tonesOf(col).map(abgr);
  if (R < 2) {
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if ((i + 0.5 - c) ** 2 + (j + 0.5 - c) ** 2 <= R * R) d[j * s + i] = tn[1];
    return { w: s, h: s, d };
  }
  const L = lobes(v + 100, 4 + (v % 3));
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const x = (i + 0.5 - c) / R, y = (j + 0.5 - c) / R;
    let best = -1, bk = 0;
    for (let k = 0; k < L.length; k += 3) {
      const q = 1 - Math.sqrt((x - L[k]) ** 2 + (y - L[k + 1]) ** 2) / L[k + 2];
      if (q > best) { best = q; bk = k; }
    }
    if (best <= cut * 0.55 || h2(i, j, v + 77) < cut * 0.6) continue;
    // Освещение своего клубка: нормаль сферы · свет сверху-слева.
    const rr = L[bk + 2], lx = (x - L[bk]) / rr, ly = (y - L[bk + 1]) / rr;
    const nz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
    const lit = -lx * 0.45 - ly * 0.65 + nz * 0.6 - y * 0.25;
    const idx = lit > 0.62 ? 3 : lit > 0.25 ? 2 : lit > -0.15 ? 1 : 0;
    d[j * s + i] = tn[idx];
  }
  return { w: s, h: s, d };
}

const CHAR = ['#120c16', '#1e1420', '#2c1d22', '#3d2a26'];
/**
 * Гарь под огнём (изометрический овал шириной w px): тёмная обугленная земля с тлеющими угольками.
 * glow 0..1 — накал угольков (0 — потухли), f — кадр мерцания.
 */
export function charPatch(w: number, ramp: readonly string[], glow: number, f: number, v: number): Pix {
  const W = Math.max(4, Math.round(w)), H = Math.max(2, Math.round(W * 0.5));
  const d = new Uint32Array(W * H);
  const ch = CHAR.map(abgr), pal = ramp.map(abgr);
  const ns = 6 / W;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = (i + 0.5) / W * 2 - 1, y = (j + 0.5) / H * 2 - 1;
    const n = fbm(i * ns + v * 3.1, j * ns * 2, v * 7 + 3);
    const m = 1 - (x * x + y * y) + (n - 0.5) * 0.9;
    if (m < 0) continue;
    let c = ch[m > 0.75 ? 0 : m > 0.45 ? 1 : m > 0.18 ? 2 : 3];
    if (glow > 0 && m > 0.25) {
      // Угольки: редкие точки, мерцают по кадрам; в центре гуще и ярче.
      const e = h2(i, j, v * 13 + 5);
      if (e < 0.05 + m * 0.07) {
        const k = h2(i, j, f * 7 + v) * 0.7 + glow * 0.6 + m * 0.3;
        c = pal[k > 1.15 ? 5 : k > 0.9 ? 4 : k > 0.6 ? 3 : 2];
      } else if (e < 0.1 + m * 0.1 && glow > 0.5) c = pal[1];
    }
    d[j * W + i] = c;
  }
  return { w: W, h: H, d };
}
