// Земля ступеней II–X для художника (paint.ts): материал = рампа (от тени к свету, со сдвигом оттенка) + тон.
// Каждая ступень — своя функция-образец (координаты ступени); реликвия прежней ступени рисуется «прозрением» —
// прежний мир оказывается предметом нового (коврик на ковре, ковёр в комнате, комната в квартире, квартира —
// крыша дома во дворе, …, континенты — глобус-планета в космосе). Фактура — штампы (stampR).

import { STAGE_DEFS } from '../sim/content/stages';

// ---------------------------------------------------------------- цвет (ABGR для ImageData)
export const pack = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
};
const ramp = (...h: string[]) => h.map(pack);

/** Список рамп (индекс — номер материала Mt.R в aux). */
export const RL: number[][] = [];
const R = (...h: string[]): number => { RL.push(ramp(...h)); return RL.length - 1; };

// ковёр ступени II
export const C_RED = R('#3d0f22', '#5e1628', '#83202e', '#a52d34', '#c44a3c', '#d9664a');
export const C_NAVY = R('#10153a', '#1a2554', '#253872', '#344e94', '#4a6ab2', '#6c8ccc');
export const C_GOLD = R('#5c3412', '#8a5a1c', '#b8862a', '#d9a940', '#efcb62', '#fbe496');
export const C_CREAM = R('#7d6a5a', '#a89278', '#cdb896', '#e6d6b6', '#f6ecd4', '#fffaee');
export const C_TEAL = R('#0d2a30', '#154047', '#1f5c5e', '#2e7c74', '#479c8c', '#72bca6');
export const C_BORD = R('#200814', '#330c1e', '#4a1326', '#621c2e', '#7e2836', '#9a3a42');
// паркет, плинтус
export const OAK = R('#3a1d1a', '#5a2f22', '#7d4a2e', '#9c6438', '#b97e45', '#d39a58', '#e8b871');
export const WALNUT = R('#24110f', '#3c1c16', '#56291d', '#703826', '#8a4a30', '#a35f3a');
export const SKIRT = R('#5e5a6a', '#8c8898', '#b6b2c0', '#d8d4de', '#f0eef4');
// квартира
export const TILE_W = R('#6e7286', '#9599ab', '#bcc0ce', '#dcdfe8', '#f2f4f8', '#ffffff');
export const TILE_K = R('#3e1a1a', '#602822', '#853a2a', '#a65234', '#c26e44', '#d88c5a');
export const TILE_B = R('#122848', '#1b3c66', '#28568c', '#3d76b0', '#62a0d2', '#a8d4f0');
export const LINO = R('#4c3e38', '#6c5a4e', '#8e7864', '#ac967c', '#c6b294', '#dccbb0');
export const LAMI = R('#322c2c', '#4c4442', '#6a605a', '#877b70', '#a39684', '#bfb29c');
export const CARP_P = R('#22142e', '#33204a', '#472e64', '#5e4180', '#78589c', '#9878b8');
export const WALLB = R('#3a3646', '#55506a', '#726c88', '#908aa4', '#aca6be');
// улицы, город
export const ASPH = R('#14141c', '#1e1e28', '#292934', '#353541', '#43434f', '#565663');
export const PAVE = R('#433f4a', '#5b5661', '#746e78', '#8e878e', '#a8a0a3', '#c4bcbb');
export const CURB = R('#5c5866', '#827e8a', '#a6a2ac', '#c6c2ca', '#e2dee4');
export const MARKW = R('#a8a6a4', '#d6d4d0', '#f2f0ea');
export const MARKY = R('#a07418', '#d0a022', '#f0c43a');
export const ROOF = R('#18141a', '#231d24', '#2f282f', '#3c343b', '#4b4249', '#5c5259');
export const GRAVEL = R('#4a4038', '#6a5c4e', '#8a7a66', '#a8987e', '#c2b498');
export const SANDB = R('#6a4a2a', '#94703e', '#bc9654', '#d8b46c', '#ecd08c', '#fae8b4');
export const RAIL = R('#2a2228', '#3e3438', '#5a4c4c', '#7a6a66');
// страна
export const WHEAT = R('#6a4a14', '#94701e', '#be9a2c', '#dcbc3e', '#f0d65a', '#fbec8c');
export const PLOW = R('#2a1a16', '#40261c', '#5a3624', '#74482e', '#8e5c38');
export const PASTURE = R('#1e3a1e', '#2a5226', '#3a6c2e', '#4f8838', '#6aa446', '#8cc05a');
export const FOREST = R('#0e1e16', '#14301c', '#1c4424', '#265a2c', '#327034', '#42883e');
export const LAVENDER = R('#2a1e44', '#3e2c64', '#56408a', '#7058a8', '#8c76c0', '#ae9ad6');
export const RIVER = R('#0e2450', '#163a74', '#22569a', '#3474bc', '#5498d6', '#8cc4ec', '#d6f0fa');
// континенты
export const DESERT = R('#6a3e1e', '#8e5628', '#b27236', '#cc8e48', '#e2ac62', '#f2ca86');
export const SAVANNA = R('#4a4a1a', '#6a6624', '#8a8430', '#a8a03e', '#c4ba52', '#dcd270');
export const TUNDRA = R('#3e4a4e', '#56666a', '#728286', '#909ea0', '#b0bcbc', '#d2dcda');
export const SNOW = R('#6c7c98', '#8e9eb8', '#b2c0d4', '#d0dcea', '#eaf2f8', '#ffffff');
export const OCEAN = R('#06103a', '#0a1c58', '#102c78', '#1a4296', '#2a5eb2', '#4a84cc', '#86b8e4');
export const ROCKY = R('#2a2430', '#3e3644', '#544a58', '#6c6070', '#867a88', '#a296a2');
// космос
export const SPACE = R('#05030c', '#0a0718', '#110c24', '#191232', '#221a42', '#2e2454');
export const NEB_P = R('#1a0c2c', '#2c1446', '#441e62', '#5e2a80', '#7c3c9c', '#9e58b6');
export const NEB_B = R('#0a1a2c', '#102a46', '#183e62', '#225680', '#30709c', '#4a8eb6');
export const STARC = R('#8e9ab8', '#c8d2ea', '#ffffff');

export interface Smp { m: number; t: number; a: number }

// ---------------------------------------------------------------- шум
const hash = (x: number, y: number, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
const fbm = (x: number, y: number, s: number) => vnoise(x, y, s) * 0.64 + vnoise(x * 2.3, y * 2.3, s + 7) * 0.36;
const len = (a: number, b: number) => Math.sqrt(a * a + b * b);
function segD(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return len(px - ax - vx * t, py - ay - vy * t);
}
const W0 = 2880, H0 = 1620;

/** Материалы, которые рисует paint.ts сам (трава, грунт… — со своими штампами). Номера совпадают с его Mt. */
export const MT = { GRASS: 1, DIRT: 2, TILE: 3, WATER: 4, RIM: 5, WOOD: 6, R: 10 } as const;
const set = (o: Smp, rid: number, t: number) => { o.m = MT.R; o.a = rid; o.t = t; };

// ============================================================================ II. Ковёр
/** Арена II — огромный ворсистый ковёр: бахрома по краю, каймы (тёмная, золотая, синяя с «бегущей волной»),
 *  поле с решёткой ромбов и цветами-розетками, центральный медальон. Тон дрожит — ворс. */
export function carpetII(x: number, y: number, o: Smp): void {
  const b = Math.min(x, W0 - x, y, H0 - y);
  const pile = hash(x | 0, y | 0, 31) < 0.18 ? -1 : hash(x | 0, y | 0, 32) < 0.08 ? 1 : 0;
  // бахрома: кисточки
  if (b < 22) { const k = Math.floor((x + y) / 7) % 2; set(o, C_CREAM, b < 4 ? 1 : k ? 3 : 2); return; }
  if (b < 40) { set(o, C_BORD, 2 + pile); return; }
  if (b < 50) { set(o, C_GOLD, 3 + ((Math.floor((x + y) / 10) % 2) ? 0 : -1)); return; }
  if (b < 118) {
    // широкая синяя кайма с «бегущей волной» и золотыми звёздочками
    const along = x < 118 || W0 - x < 118 ? y : x, dd = b - 50;
    const wave = Math.abs(dd - 34 - Math.sin(along / 36) * 18);
    if (wave < 6) { set(o, C_RED, 3 + pile); return; }
    if (wave < 9) { set(o, C_CREAM, 3); return; }
    const sx = ((along % 72) + 72) % 72 - 36, sy = dd - 34 + (Math.sin(along / 36) > 0 ? 20 : -20);
    if (Math.abs(sx) + Math.abs(sy) < 7) { set(o, C_GOLD, 4); return; }
    set(o, C_NAVY, 2 + pile); return;
  }
  if (b < 128) { set(o, C_GOLD, 3 + pile); return; }
  if (b < 140) { set(o, C_BORD, 2 + pile); return; }
  // поле: крупный медальон в центре (вокруг детского коврика), решётка ромбов
  const cx = x - W0 / 2, cy = y - H0 / 2;
  const md = Math.abs(cx) / 1.6 + Math.abs(cy);
  if (md < 640 && md > 590) { set(o, md > 625 || md < 605 ? C_GOLD : C_NAVY, md > 625 || md < 605 ? 3 : 2 + pile); return; }
  if (md <= 590) {
    // медальон ярусами: синее поле с цветками → золотое кольцо → кремовая сердцевина с бирюзовыми листьями
    if (md > 400) {
      const lx = ((x % 48) + 48) % 48 - 24, ly = ((y % 48) + 48) % 48 - 24;
      if ((Math.abs(lx) < 2 && Math.abs(ly) < 9) || (Math.abs(ly) < 2 && Math.abs(lx) < 9)) { set(o, C_GOLD, 3); return; }
      if (Math.abs(lx) + Math.abs(ly) < 4) { set(o, C_RED, 4); return; }
      if (md > 575 || md < 415) { set(o, C_CREAM, 3); return; }
      set(o, C_NAVY, 2 + pile); return;
    }
    if (md > 378) { set(o, C_GOLD, md > 394 || md < 384 ? 2 : 4); return; }
    const lx = ((x % 56) + 56) % 56 - 28, ly = ((y % 56) + 56) % 56 - 28, ld = Math.abs(lx) * 0.5 + Math.abs(ly);
    if (ld < 8 && Math.abs(lx) < 16) { set(o, C_TEAL, (lx < 0 ? 4 : 3) + pile); return; }
    if (Math.abs(lx) + Math.abs(ly) > 50) { set(o, C_RED, 3); return; }
    set(o, C_CREAM, 3 + pile); return;
  }
  // решётка ромбов по красному полю, на пересечениях — розетки
  const S = 150, u = x + y, v = x - y;
  const du = ((u % S) + S) % S, dv = ((v % S) + S) % S;
  if (du < 8 || dv < 8) { set(o, du < 3 || dv < 3 ? C_GOLD : C_BORD, du < 3 || dv < 3 ? 3 : 1); return; }
  const ru = du - S / 2, rv = dv - S / 2, rr = len(ru, rv);
  // розетка: четыре золотых лепестка, красная серединка, синий венчик
  if (rr < 5) { set(o, C_RED, 4); return; }
  if (rr < 20 && (Math.abs(ru) < 4 || Math.abs(rv) < 4)) { set(o, C_GOLD, rr < 14 ? 4 : 3); return; }
  if (rr < 13) { set(o, C_NAVY, 2 + pile); return; }
  if (rr < 16 && Math.abs(Math.abs(ru) - Math.abs(rv)) < 3) { set(o, C_CREAM, 3); return; }
  // потёртости ворса
  const wear = fbm(x / 160, y / 160, 41);
  set(o, C_RED, (wear > 0.68 ? 4 : wear < 0.3 ? 2 : 3) + pile);
}

// ============================================================================ III. Комната
/** Комната: паркет «ёлочкой» (дуб и орех), плинтус по краю арены, солнечные «окна» на полу, круглый коврик. */
export function roomIII(x: number, y: number, o: Smp): void {
  const b = Math.min(x, W0 - x, y, H0 - y);
  if (b < 16) { set(o, SKIRT, b < 4 ? 1 : b < 12 ? 3 : 2); return; }
  // круглый вязаный коврик у кровати
  const rx = (x - 640) / 230, ry = (y - 1180) / 150, rr = len(rx, ry);
  if (rr < 1) { const ring = Math.floor(rr * 9); set(o, [C_TEAL, C_CREAM, C_RED, C_CREAM, C_TEAL, C_GOLD, C_CREAM, C_RED, C_BORD][ring], rr > 0.97 ? 1 : (Math.floor((Math.atan2(ry, rx) * 18)) % 2 ? 3 : 2)); return; }
  // ёлочка: планки 18×72, чередуются по диагонали
  const P = 18, Lp = 72;
  const u = x + y, v = y - x;
  const cu = Math.floor(u / (2 * P)), fu = u - cu * 2 * P;
  const horiz = fu < P;
  const along = horiz ? v + cu * 23 : v + cu * 23 + Lp / 2;
  const k = Math.floor(along / Lp), fa = along - k * Lp;
  const rid = hash(cu, k, 5) < 0.5 ? OAK : WALNUT;
  const across = horiz ? fu : fu - P;
  let t = rid === OAK ? 4 : 3;
  if (across < 1.2) t = 1;
  else if (fa < 1.5) t = 1;
  else if (across > P - 2) t = rid === OAK ? 5 : 4;
  else {
    const g = Math.sin(along * 0.35 + hash(cu, k, 6) * 9 + across * 0.2);
    if (g > 0.88) t--; else if (g < -0.93) t++;
    if (hash(cu, k, 7) < 0.25) t--;
  }
  // солнечные пятна из окна (параллелограммы)
  const sun = (sx: number, sy: number) => { const lx = x - sx - (y - sy) * 0.45, ly = y - sy; return lx > 0 && lx < 300 && ly > 0 && ly < 230 && Math.floor(lx / 100) !== 1 || false; };
  if (sun(1750, 140) || sun(2250, 1050)) t += 1;
  set(o, rid, Math.max(0, Math.min(RL[rid].length - 1, t)));
}

// ============================================================================ IV. Квартира
/** Квартира: план из комнат по линиям стен (x = 960, 1920; y = 810): кухня — шахматная плитка, ванная — синяя
 *  мозаика, коридор — линолеум с узором, гостиная — ламинат, спальня — фиолетовый ковролин; пороги в проёмах. */
export function flatIV(x: number, y: number, o: Smp): void {
  const b = Math.min(x, W0 - x, y, H0 - y);
  if (b < 14) { set(o, WALLB, b < 4 ? 0 : 2); return; }
  const cx = x < 960 ? 0 : x < 1920 ? 1 : 2, cy = y < 810 ? 0 : 1;
  const room = cy * 3 + cx;
  const wd = Math.min(Math.abs(x - 960), Math.abs(x - 1920), Math.abs(y - 810));
  if (wd < 24) { set(o, LAMI, wd < 18 ? 1 : 2); return; }                // тень у стены / порог
  switch (room) {
    case 0: { // кухня: крупная шахматная плитка терракота/белая, швы
      const T = 54, i = Math.floor(x / T), j = Math.floor(y / T), fx = x - i * T, fy = y - j * T;
      if (fx < 2 || fy < 2) { set(o, TILE_W, 1); return; }
      const dark = (i + j) % 2 === 0;
      set(o, dark ? TILE_K : TILE_W, (dark ? 3 : 4) + (fx > T - 6 || fy > T - 6 ? -1 : fx < 6 && fy < 6 ? 1 : 0)); return;
    }
    case 1: { // гостиная: ламинат с длинными досками и ковром у дивана (центр — комната III, реликвия)
      const Wd = 40, row = Math.floor(y / Wd), off = hash(row, 3, 9) * 500, fx = ((x + off) % 500) / 500, fy = y / Wd - row;
      if (fy < 0.05 || fx * 500 < 2) { set(o, LAMI, 1); return; }
      const bt = hash(row, Math.floor((x + off) / 500), 4);
      set(o, LAMI, bt < 0.3 ? 2 : bt > 0.7 ? 4 : 3); return;
    }
    case 2: { // ванная: мелкая синяя мозаика, белый коврик
      if (x > 2300 && x < 2560 && y > 520 && y < 690) { set(o, C_CREAM, (Math.floor(x / 6) + Math.floor(y / 6)) % 2 ? 4 : 3); return; }
      const T = 20, fx = x % T, fy = y % T;
      if (fx < 1.5 || fy < 1.5) { set(o, TILE_W, 3); return; }
      const h = hash(Math.floor(x / T), Math.floor(y / T), 12);
      set(o, TILE_B, h < 0.15 ? 2 : h > 0.85 ? 4 : 3); return;
    }
    case 3: { // коридор: линолеум «под паркет» с узором-ромбами
      const S = 80, du = (((x + y) % S) + S) % S, dv = (((x - y) % S) + S) % S;
      set(o, LINO, du < 3 || dv < 3 ? 2 : (Math.floor((x + y) / S) + Math.floor((x - y) / S)) % 2 ? 3 : 4); return;
    }
    case 4: { // спальня: бежевый ковролин (мелкий ворс) и коврик с узором у кровати
      if (x > 1150 && x < 1700 && y > 1080 && y < 1420) {
        const b2 = Math.min(x - 1150, 1700 - x, y - 1080, 1420 - y);
        if (b2 < 10) { set(o, C_CREAM, (Math.floor((x + y) / 6) % 2) ? 4 : 3); return; }
        if (b2 < 26) { set(o, CARP_P, 2); return; }
        const S2 = 60, du2 = (((x + y) % S2) + S2) % S2, dv2 = (((x - y) % S2) + S2) % S2;
        set(o, du2 < 4 || dv2 < 4 ? CARP_P : C_CREAM, du2 < 4 || dv2 < 4 ? 3 : 4); return;
      }
      const p = hash(x | 0, y | 0, 16), n = fbm(x / 220, y / 220, 15);
      set(o, LINO, (n > 0.6 ? 4 : 3) + (p < 0.22 ? -1 : p > 0.92 ? 1 : 0)); return;
    }
    default: { // детская: светлый ламинат и пазловый коврик
      if (x > 2050 && x < 2650 && y > 1000 && y < 1450) {
        const T = 75, i = Math.floor(x / T), j = Math.floor(y / T);
        const c = [C_RED, C_NAVY, C_GOLD, C_TEAL][(i + j * 2) % 4];
        set(o, c, (x % T < 2 || y % T < 2) ? 1 : 3); return;
      }
      const Wd = 36, row = Math.floor(y / Wd), fy = y / Wd - row;
      set(o, OAK, fy < 0.06 ? 2 : hash(row, Math.floor((x + row * 97) / 360), 8) < 0.4 ? 5 : 6); return;
    }
  }
}

// ============================================================================ V. Улицы
/** Сетка улиц ступени V (её же используют препятствия): дороги по x = 480k, y = 405k, ширина 64, тротуар 18. */
export const STREET = { CX: 480, CY: 405, ROAD: 32, WALK: 18 };
function streetDist(x: number, y: number): [number, number] {
  const ax = Math.abs(((x + STREET.CX / 2) % STREET.CX + STREET.CX) % STREET.CX - STREET.CX / 2);
  const ay = Math.abs(((y + STREET.CY / 2) % STREET.CY + STREET.CY) % STREET.CY - STREET.CY / 2);
  return [ax, ay];
}
/** Улицы и дворы: асфальт с разметкой и «зебрами», бордюр, плиточный тротуар, газоны с дорожками, песочницы,
 *  парковки, люки, лужи. */
export function streetsV(x: number, y: number, o: Smp): void {
  const [ax, ay] = streetDist(x, y);
  const R0 = STREET.ROAD, Wk = STREET.WALK;
  const onX = ax < R0, onY = ay < R0;
  if (onX || onY) {
    // перекрёсток: «зебра» перед ним
    if (onX && onY) { set(o, ASPH, 2 + (hash(x | 0, y | 0, 3) < 0.1 ? 1 : 0)); return; }
    const along = onX ? y : x, across = onX ? ax : ay, cross = onX ? ay : ax;
    if (cross < R0 + 22 && cross > R0 + 4 && across < R0 - 4) { const z = Math.floor(across / 6) % 2; if (z) { o.m = MT.R; o.a = MARKW; o.t = 2; return; } }
    if (across < 1.5 && Math.floor(along / 26) % 2 && cross > R0 + 26) { set(o, MARKW, 2); return; }   // прерывистая осевая
    if (Math.abs(across - (R0 - 5)) < 1 && cross > R0 + 26) { set(o, MARKW, 1); return; }               // край проезжей части
    const n = fbm(x / 60, y / 60, 21);
    set(o, ASPH, (n > 0.66 ? 3 : n < 0.3 ? 1 : 2) + (hash(x | 0, y | 0, 4) < 0.06 ? 1 : 0)); return;
  }
  if (ax < R0 + 3 || ay < R0 + 3) { set(o, CURB, 3); return; }                       // бордюр
  if (ax < R0 + Wk || ay < R0 + Wk) {                                                  // тротуар: плитка 9×9
    const fx = Math.floor(x / 9), fy = Math.floor(y / 9);
    if (x % 9 < 1 || y % 9 < 1) { set(o, PAVE, 1); return; }
    set(o, PAVE, hash(fx, fy, 6) < 0.15 ? 2 : hash(fx, fy, 6) > 0.9 ? 4 : 3); return;
  }
  // двор: газон, дорожки, песочница, парковка
  const bx = Math.floor(x / STREET.CX), by = Math.floor(y / STREET.CY), kind = hash(bx, by, 9);
  const lx = ((x % STREET.CX) + STREET.CX) % STREET.CX, ly = ((y % STREET.CY) + STREET.CY) % STREET.CY;
  if (kind < 0.25 && ly > STREET.CY - 140 && lx > 70 && lx < 300) {                     // парковка с разметкой
    const sx = lx % 34;
    set(o, ASPH, sx < 2 && ly < STREET.CY - 70 ? 0 : 3);
    if (sx < 2 && ly < STREET.CY - 70) set(o, MARKW, 1);
    return;
  }
  if (kind > 0.6 && Math.abs(lx - 240) < 40 && Math.abs(ly - 200) < 34) { set(o, SANDB, Math.abs(lx - 240) > 36 || Math.abs(ly - 200) > 30 ? 1 : 3 + (hash(x | 0, y | 0, 7) < 0.1 ? 1 : 0)); return; }
  const path = Math.min(Math.abs(lx - ly * 1.18), Math.abs(lx + ly * 0.6 - 380));
  if (path < 10) { set(o, GRAVEL, path < 8 ? 3 : 1); return; }
  const n = fbm(x / 120, y / 120, 3);
  o.m = MT.GRASS; o.a = 0; o.t = n > 0.66 ? 4 : n < 0.3 ? 2 : 3;
}

/** Реликвия IV в V: квартира — это дом: плоская крыша с парапетом, рубероид, вентшахты, выходы на крышу. */
export function roofRelic(x: number, y: number, o: Smp): void {
  const b = Math.min(x, W0 - x, y, H0 - y);
  if (b < 50) { set(o, CURB, b < 10 ? 1 : b > 40 ? 2 : 3); return; }                 // парапет
  // швы рулонов рубероида и заплатки
  const seam = (x % 180) < 4;
  const n = fbm(x / 200, y / 200, 51), patch = fbm(x / 90, y / 90, 52);
  let t = n > 0.62 ? 3 : n < 0.32 ? 1 : 2;
  if (patch > 0.74) t = 4;
  if (seam) t = 0;
  // светлая разметка вертолётной площадки в центре
  const cx = x - W0 / 2, cy = y - H0 / 2, cr = len(cx, cy * 1.2);
  if (cr < 300 && cr > 270) { set(o, MARKY, 2); return; }
  if (Math.abs(cx) < 120 && Math.abs(cy) < 20 && cr < 260) { set(o, MARKY, 2); return; }
  if ((Math.abs(cx - 100) < 20 || Math.abs(cx + 100) < 20) && Math.abs(cy) < 150) { set(o, MARKY, 2); return; }
  set(o, ROOF, t);
}

// ============================================================================ VI. Район
/** Район с высоты: широкие проспекты, дворы-газоны, парки с прудами, стройплощадка, железная дорога. */
export function districtVI(x: number, y: number, o: Smp): void {
  // проспекты: x = 720k, y = 540k (ширина 48), железная дорога по диагонали
  const ax = Math.abs(((x + 360) % 720) - 360), ay = Math.abs(((y + 270) % 540) - 270);
  const rd = segD(x, y, -100, 1500, 2980, 300);
  if (rd < 14) { set(o, rd < 2 || Math.abs(rd - 6) < 1 || Math.abs(rd - 10) < 1 ? RAIL : GRAVEL, rd < 2 ? 3 : Math.abs(rd - 6) < 1 || Math.abs(rd - 10) < 1 ? 3 : 1 + ((Math.floor((x + y) / 6)) % 2)); return; }
  if (ax < 24 || ay < 24) {
    const across = ax < 24 ? ax : ay, along = ax < 24 ? y : x;
    if (across < 1 && Math.floor(along / 20) % 2) { set(o, MARKW, 2); return; }
    set(o, ASPH, 2 + (hash(x | 0, y | 0, 5) < 0.05 ? 1 : 0)); return;
  }
  if (ax < 32 || ay < 32) { set(o, PAVE, 3); return; }
  const bi = Math.floor(x / 720), bj = Math.floor(y / 540), k = hash(bi, bj, 61);
  const lx = ((x % 720) + 720) % 720, ly = ((y % 540) + 540) % 540;
  if (k < 0.18) {                                                       // стройплощадка: грунт, колеи, бетонные плиты
    const n = fbm(x / 40, y / 40, 62);
    if (Math.abs(((lx + ly * 0.3) % 70) - 35) < 3) { o.m = MT.DIRT; o.a = 0; o.t = 1; return; }
    if (lx > 420 && lx < 600 && ly > 80 && ly < 220) { set(o, CURB, (Math.floor(lx / 30) + Math.floor(ly / 30)) % 2 ? 2 : 3); return; }
    o.m = MT.DIRT; o.a = 0; o.t = n > 0.6 ? 4 : n < 0.35 ? 2 : 3; return;
  }
  if (k > 0.78) {                                                       // парк: аллеи, газон
    const al = Math.min(Math.abs(lx - 360), Math.abs(ly - 270), Math.abs(len(lx - 360, ly - 270) - 150));
    if (al < 7) { set(o, GRAVEL, al < 5 ? 3 : 1); return; }
    const n = fbm(x / 90, y / 90, 63);
    o.m = MT.GRASS; o.a = 0; o.t = n > 0.6 ? 4 : n < 0.36 ? 2 : 3; return;
  }
  // двор: внутриквартальные проезды, газон, площадки
  if (Math.abs(lx - 360) < 10 || Math.abs(ly - 270) < 10) { set(o, ASPH, 3); return; }
  if (k > 0.55 && k < 0.65 && Math.abs(lx - 200) < 50 && Math.abs(ly - 140) < 40) { set(o, C_RED, Math.abs(lx - 200) > 46 || Math.abs(ly - 140) > 36 ? 1 : 2); return; }   // резиновое покрытие площадки
  if (k < 0.4 && lx > 420 && lx < 680 && ly > 300 && ly < 500) { roofMosaic(x, y, o, 65); return; }      // гаражи и пристройки
  const n = fbm(x / 100, y / 100, 64);
  o.m = MT.GRASS; o.a = 0; o.t = n > 0.64 ? 4 : n < 0.3 ? 2 : 3;
}

// ============================================================================ VII. Город
/** Город: плотная сетка улиц, широкий бульвар-диагональ, площади с мощением кругами, набережные реки (вода — препятствия). */
export function cityVII(x: number, y: number, o: Smp): void {
  const ax = Math.abs(((x + 180) % 360) - 180), ay = Math.abs(((y + 135) % 270) - 135);
  const boul = segD(x, y, 0, 0, 2880, 1620);
  if (boul < 34) {
    if (boul < 10) { const n = fbm(x / 30, y / 30, 71); o.m = MT.GRASS; o.a = 0; o.t = n > 0.5 ? 4 : 3; return; }
    set(o, ASPH, boul > 30 ? 4 : 2); return;
  }
  if (ax < 16 || ay < 16) { set(o, ASPH, (ax < 1 || ay < 1) && Math.floor((x + y) / 14) % 2 ? 4 : 2); return; }
  if (ax < 22 || ay < 22) { set(o, PAVE, 2); return; }
  const bi = Math.floor(x / 360), bj = Math.floor(y / 270), k = hash(bi, bj, 72);
  const lx = ((x % 360) + 360) % 360 - 180, ly = ((y % 270) + 270) % 270 - 135;
  if (k < 0.14) {                                                         // площадь: мощение кольцами
    const r = len(lx, ly * 1.3);
    if (r < 26) { set(o, C_GOLD, 2); return; }
    set(o, PAVE, Math.floor(r / 14) % 2 ? 3 : 4); return;
  }
  if (k > 0.86) { const n = fbm(x / 60, y / 60, 73); o.m = MT.GRASS; o.a = 0; o.t = n > 0.55 ? 4 : n < 0.35 ? 2 : 3; return; }   // сквер
  roofMosaic(x, y, o, 74);
}

/** Крыши квартала сверху: участки разных размеров, у каждого — своя крыша (рубероид, жесть, черепица, бетон),
 *  тёмный стык, светлая кромка сверху-слева, кондиционеры и люки. */
const ROOFS = [ROOF, CURB, TILE_K, LAMI, PAVE, ROOF, TILE_W];
function roofMosaic(x: number, y: number, o: Smp, seed: number): void {
  const P = 46, i = Math.floor(x / P), j = Math.floor(y / P);
  // соседние клетки иногда сливаются в один дом (по x)
  const mergeL = hash(i - 1, j, seed) < 0.4, mergeU = hash(i, j - 1, seed + 1) < 0.3;
  const fx = x - i * P, fy = y - j * P;
  const id = hash(mergeL ? i - 1 : i, mergeU ? j - 1 : j, seed + 2);
  const rid = ROOFS[Math.floor(id * ROOFS.length)];
  if ((fx < 2 && !mergeL) || (fy < 2 && !mergeU)) { set(o, ASPH, 0); return; }               // проулок
  if ((fx < 4 && !mergeL) || (fy < 4 && !mergeU)) { set(o, rid, Math.min(RL[rid].length - 1, 4)); return; } // светлая кромка
  if (fx > P - 3 || fy > P - 3) { set(o, rid, 1); return; }                                    // тень у дальнего края
  const d = hash(i, j, seed + 3);
  if (d < 0.22 && Math.abs(fx - 20 - d * 40) < 3 && Math.abs(fy - 22) < 2) { set(o, CURB, 4); return; }   // кондиционер
  if (rid === TILE_K && Math.floor(fy / 4) % 2) { set(o, rid, 2); return; }                   // ряды черепицы
  set(o, rid, (rid === TILE_W ? 2 : 3) + (hash(x | 0, y | 0, seed + 4) < 0.08 ? -1 : 0));
}

// ============================================================================ VIII. Страна
/** Страна: поля-лоскуты (пшеница, пашня, пастбища, лаванда) с бороздами, леса, просёлочные дороги, ручьи. */
export function countryVIII(x: number, y: number, o: Smp): void {
  // ручей
  const sy = 1100 + Math.sin(x / 260) * 120 + Math.sin(x / 97) * 30;
  const sd = Math.abs(y - sy);
  if (sd < 9) { set(o, RIVER, sd < 4 ? 4 : 3); return; }
  if (sd < 13) { o.m = MT.GRASS; o.a = 0; o.t = 2; return; }
  // дороги
  const rd = Math.min(segD(x, y, 0, 420, 2880, 640), segD(x, y, 900, 0, 1300, 1620), segD(x, y, 2100, 0, 2300, 1620));
  if (rd < 8) { set(o, GRAVEL, rd < 5 ? 3 : 2); return; }
  const fo = fbm(x / 340, y / 340, 81);
  if (fo < 0.34) { set(o, FOREST, fo < 0.27 ? 2 : 3); return; }            // лес (кроны — штампы)
  // поля: неровные лоскуты, внутри борозды под своим углом
  const wx = x + Math.sin(y / 170) * 40, wy = y + Math.sin(x / 210) * 30;
  const fi = Math.floor(wx / 260), fj = Math.floor(wy / 200), k = hash(fi, fj, 82);
  const fx = wx - fi * 260, fyy = wy - fj * 200;
  if (fx < 5 || fyy < 5) { o.m = MT.GRASS; o.a = 0; o.t = 2; return; }     // межа
  const ang = hash(fi, fj, 83) * Math.PI, along = x * Math.cos(ang) + y * Math.sin(ang);
  const row = ((along % 10) + 10) % 10 < 3;
  if (k < 0.3) { set(o, WHEAT, row ? 3 : 4); return; }
  if (k < 0.5) { set(o, PLOW, row ? 1 : 3); return; }
  if (k < 0.62) { set(o, LAVENDER, row ? 2 : 4); return; }
  if (k < 0.7) { set(o, WHEAT, row ? 2 : 3); return; }
  set(o, PASTURE, row ? 3 : 4);
}

// ============================================================================ IX. Континенты
/** Континенты: пояса биомов — тундра и снега на севере (малые y), леса, степь/саванна, пустыни с барханами,
 *  каменистые нагорья; у краёв — берега океана. */
export function continentsIX(x: number, y: number, o: Smp): void {
  const coast = Math.min(x, W0 - x, y, H0 - y) + (fbm(x / 160, y / 160, 91) - 0.5) * 140;
  if (coast < 60) { set(o, OCEAN, coast < 20 ? 3 : 4); return; }
  if (coast < 80) { set(o, SANDB, 4); return; }
  const lat = y / H0 + (fbm(x / 300, y / 300, 92) - 0.5) * 0.25;
  const hum = fbm(x / 420, y / 420, 93);
  if (lat < 0.14) { set(o, SNOW, hash(x | 0, y | 0, 1) < 0.1 ? 3 : 4); return; }
  if (lat < 0.26) { set(o, TUNDRA, hum > 0.5 ? 3 : 2); return; }
  if (lat > 0.62 && hum < 0.5) {
    const dune = Math.sin((x * 0.8 + y) / 26 + fbm(x / 80, y / 80, 94) * 6);
    set(o, DESERT, dune > 0.75 ? 4 : dune < -0.6 ? 2 : 3); return;
  }
  if (hum > 0.58) { set(o, FOREST, hum > 0.68 ? 2 : 3); return; }
  if (hum < 0.36) { set(o, ROCKY, 3); return; }
  set(o, lat > 0.5 ? SAVANNA : PASTURE, fbm(x / 60, y / 60, 95) > 0.55 ? 4 : 3);
}

// ============================================================================ X. Планеты
/** Космос: тёмное поле с туманностями (фиолетовой и бирюзовой) и звёздами (штампы). */
export function spaceX(x: number, y: number, o: Smp): void {
  const n1 = fbm(x / 520, y / 520, 101), n2 = fbm(x / 380 + 9, y / 380, 102);
  const d = hash(x | 0, y | 0, 103) < 0.05 ? 1 : 0;
  if (n1 > 0.62) { set(o, NEB_P, Math.min(5, 1 + Math.floor((n1 - 0.62) * 14) + d)); return; }
  if (n2 > 0.64) { set(o, NEB_B, Math.min(5, 1 + Math.floor((n2 - 0.64) * 14) + d)); return; }
  set(o, SPACE, 1 + (n1 > 0.52 ? 1 : 0) + (n2 > 0.55 ? 1 : 0) + d);
}

/** Реликвия IX в X: континенты — это планета Земля: шар с океаном, материками, облаками, терминатором. */
export function earthRelic(x: number, y: number, o: Smp): boolean {
  // круг на экране (а не на земле): проекция изометрии
  const IX = Math.SQRT1_2, IY = Math.SQRT1_2 * 0.5, R = 500;
  const u = (x - y - (W0 - H0) / 2) * IX, v = (x + y - (W0 + H0) / 2) * IY;
  const dx = u / R, dy = v / R, r2 = dx * dx + dy * dy;
  if (r2 > 1) return false;
  const z = Math.sqrt(1 - r2);
  const lon = Math.atan2(dx, z), lat = Math.asin(Math.max(-1, Math.min(1, dy)));
  const land = fbm(lon * 2.2 + 3, lat * 2.6, 111) > 0.52;
  const cloud = fbm(lon * 4 + 1, lat * 5, 112) > 0.66;
  const light = -dx * 0.55 - dy * 0.45 + z * 0.7;                 // свет сверху-слева
  let t = light > 0.7 ? 5 : light > 0.45 ? 4 : light > 0.15 ? 3 : light > -0.15 ? 2 : 1;
  if (r2 > 0.94) t = Math.max(0, t - 1);
  if (cloud) { set(o, SNOW, Math.min(5, t + 1)); return true; }
  if (Math.abs(lat) > 1.15) { set(o, SNOW, t); return true; }
  if (land) { set(o, fbm(lon * 6, lat * 6, 113) > 0.5 ? PASTURE : DESERT, Math.min(5, t)); return true; }
  set(o, OCEAN, Math.min(6, t + 1));
  return true;
}

/** Ступени II–X (у реликвии — своя «прозрение»-функция в paint.ts). */
export const STAGE_SAMPLERS: Record<number, (x: number, y: number, o: Smp) => void> = {
  1: carpetII, 2: roomIII, 3: flatIV, 4: streetsV, 5: districtVI, 6: cityVII, 7: countryVIII, 8: continentsIX, 9: spaceX,
};

// ---------------------------------------------------------------- штампы фактуры
export interface StampCtx {
  put(i: number, j: number, d: number, rid: number): void;
  paint(i: number, j: number, c: number, rid: number): void;
}
/** Штамп для пикселя (i, j) материала rid; r — случайное 0..1 (по пикселю). */
export function stampR(rid: number, i: number, j: number, r: number, c: StampCtx): void {
  if (rid === C_RED || rid === C_NAVY || rid === C_CREAM) {
    if (r < 0.004) { c.put(i, j, 2, rid); c.put(i + 1, j, 1, rid); }                     // ворсинки-блики
    else if (r < 0.0045) { c.paint(i, j, RL[C_GOLD][4], rid); c.paint(i + 1, j + 1, RL[C_GOLD][4], rid); }   // крошки
  } else if (rid === OAK || rid === WALNUT) {
    if (r < 0.0012) { for (let k = 0; k < 6; k++) c.put(i + k, j + (k >> 2), -1, rid); }  // царапина
  } else if (rid === ASPH) {
    if (r < 0.0016) { for (let k = 0; k < 5; k++) c.put(i + k, j + ((k * 7) % 3) - 1, -1, rid); }   // трещина
    else if (r < 0.0019) { for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) if ((dx / 3.4) ** 2 + dy * dy < 1) c.paint(i + dx, j + dy, RL[ASPH][0], rid); }   // пятно масла
    else if (r < 0.00198) { for (let dy = -2; dy <= 2; dy++) for (let dx = -6; dx <= 6; dx++) if ((dx / 6.4) ** 2 + (dy / 2.4) ** 2 < 1) c.paint(i + dx, j + dy, dy < 0 && dx < 0 ? RL[ASPH][5] : RL[RIVER][1], rid); }   // лужа: тёмная, с бликом неба
  } else if (rid === FOREST) {
    if (r < 0.02) {
      // крона: светлый верх-лево, тёмный низ
      for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) {
        if ((dx / 4.4) ** 2 + (dy / 3.3) ** 2 > 1) continue;
        c.put(i + dx, j + dy, dy < -1 && dx < 1 ? 2 : dy > 1 ? -1 : 1, rid);
      }
    }
  } else if (rid === SPACE || rid === NEB_P || rid === NEB_B) {
    if (r < 0.0016) c.paint(i, j, RL[STARC][1 + (r < 0.0005 ? 1 : 0)], rid);
    else if (r < 0.00175) { const w = RL[STARC][2]; c.paint(i, j, w, rid); c.paint(i - 1, j, RL[STARC][0], rid); c.paint(i + 1, j, RL[STARC][0], rid); c.paint(i, j - 1, RL[STARC][0], rid); c.paint(i, j + 1, RL[STARC][0], rid); }
  } else if (rid === WHEAT || rid === PASTURE) {
    if (r < 0.01) c.put(i, j, 1, rid);
  } else if (rid === DESERT) {
    if (r < 0.0008) { c.paint(i, j, RL[ROCKY][3], rid); c.paint(i + 1, j, RL[ROCKY][2], rid); }
  } else if (rid === OCEAN || rid === RIVER) {
    if (r < 0.004) { const L = 2 + Math.floor(r * 1000) % 3; for (let k = 0; k < L; k++) c.put(i + k, j, 1, rid); }
  } else if (rid === ROOF) {
    if (r < 0.001) { for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) c.put(i + dx, j + dy, 2, rid); }
  }
}

/** Боковая грань арены: верх (светлые) и низ (тёмные) слои по ступеням. */
export function arenaEdge(s: number): { side: number; top: number[]; edge: number[] } | null {
  const r = (rid: number, ...t: number[]) => t.map(k => RL[rid][k]);
  switch (s) {
    case 1: return { side: 4, top: r(C_CREAM, 4, 3), edge: r(C_BORD, 2, 1) };
    case 2: return { side: 5, top: r(SKIRT, 4, 3), edge: r(SKIRT, 2, 1, 1) };
    case 3: return { side: 6, top: r(WALLB, 4, 3), edge: r(WALLB, 2, 1, 1, 0) };
    case 4: case 5: case 6: return { side: 7, top: r(CURB, 3, 2), edge: [...r(GRAVEL, 2, 2, 1), ...r(PLOW, 1, 0)] };
    case 7: case 8: return { side: 7, top: r(PASTURE, 3, 2), edge: [...r(PLOW, 3, 2, 2, 1, 0)] };
    case 9: return null;
    default: return null;
  }
}

/** Боковая грань реликвии (приподнятый прежний мир). */
export function relicEdge(s: number): { side: number; top: number[]; edge: number[]; windows?: boolean } | null {
  const r = (rid: number, ...t: number[]) => t.map(k => RL[rid][k]);
  switch (s) {
    case 2: return { side: 3, top: r(C_CREAM, 4), edge: r(C_BORD, 2, 1) };                       // ковёр на паркете — толщина ковра
    case 4: return { side: 26, top: r(CURB, 4, 3), edge: r(LINO, 4, 3, 3, 2), windows: true };    // дом: стены с окнами
    default: return null;
  }
}

export { STAGE_DEFS };
