// Собственная палитра «Танкороста»: рампы из 6 оттенков (тёмный → светлый)
// со сдвигом тона — тени уходят в холодное, блики в тёплое.

export const RAMPS = {
  ink: ['#07060b', '#0f0d16', '#1a1724', '#272336', '#3a3550', '#55507a'],
  steel: ['#16172a', '#262a40', '#3f4560', '#636b8a', '#959db8', '#d0d6e8'],
  iron: ['#141318', '#24222a', '#3a3742', '#57535f', '#7f7a86', '#b4afb8'],
  olive: ['#151c13', '#25321d', '#3e4f27', '#5f7334', '#8ea14b', '#c6cf7a'],
  khaki: ['#221a12', '#3d2f1e', '#5f4b2d', '#87703f', '#b29d5c', '#e0cf8e'],
  sand: ['#281b14', '#46301f', '#6f4f31', '#9c7547', '#c9a265', '#efd59a'],
  wood: ['#1e110c', '#3a2116', '#5c3722', '#875231', '#b57a45', '#e0ad6d'],
  red: ['#260a16', '#4f1225', '#861d2f', '#c23434', '#ea6a3f', '#fbab6c'],
  rust: ['#24100c', '#47200f', '#753416', '#a9521f', '#d8823a', '#f6b66a'],
  fire: ['#3a1206', '#7a2608', '#c44d0c', '#f08a1c', '#fbc63e', '#fff4b0'],
  /** Огонь вражеских взрывов: краснее, но с горячим ядром. */
  blaze: ['#2a0a10', '#6e1414', '#b8261a', '#e8541e', '#f8a23a', '#fff0a0'],
  gold: ['#2a1806', '#5b3409', '#9c5d0c', '#df981c', '#fbcd4a', '#fff1b4'],
  lime: ['#0d1f10', '#17401c', '#226829', '#349b36', '#6ccc4a', '#c0f07e'],
  grass: ['#0d1a12', '#17311b', '#244d26', '#367036', '#55984a', '#8cc46a'],
  teal: ['#0a1e25', '#123c45', '#1c6467', '#2b9a8e', '#62cfac', '#bdf3dc'],
  blue: ['#0c1230', '#182760', '#22449c', '#3770d2', '#68a6f0', '#bde2ff'],
  sky: ['#14203a', '#21385e', '#2f5788', '#4b84b4', '#7cb8d8', '#c2e8f4'],
  purple: ['#1a0e28', '#33194b', '#572a76', '#8644a4', '#bb70cc', '#ecb4ef'],
  pink: ['#2b0d20', '#56173a', '#922756', '#cf4577', '#f17fa1', '#ffc8d8'],
  cream: ['#3a3542', '#67606f', '#9a92a0', '#c8c0c8', '#ebe5e6', '#fffdf6'],
  skin: ['#2c1714', '#57302a', '#8c5444', '#c08061', '#e2ad86', '#f8dcbc'],
  toyGreen: ['#0f2410', '#1b4a1a', '#2a7424', '#3fa232', '#7bd052', '#c6f590'],
  toyRed: ['#2a0a10', '#5c1018', '#a01c22', '#de3a2c', '#f87650', '#ffbb94'],
  toyBlue: ['#0a1238', '#14286e', '#1d48b0', '#2f74e6', '#69a8fa', '#bfe0ff'],
  toyYellow: ['#2c1c04', '#5e3e06', '#a87010', '#e8b020', '#fcdc4c', '#fff6b8'],
  glass: ['#0b1d2c', '#15405a', '#22708e', '#3aa8c2', '#7ad8e6', '#d2fbff'],
  toxic: ['#122006', '#24410a', '#3d6e10', '#62a41a', '#9ad43a', '#e0fc8c'],
  ice: ['#1a2a44', '#2c4a70', '#4878a4', '#74aed0', '#a8dcf0', '#eafcff'],
  carpet: ['#200c18', '#3e1630', '#64244a', '#8e3a64', '#bb5c84', '#e48eac'],
  asphalt: ['#101015', '#1b1b22', '#282832', '#373744', '#4b4b5a', '#6a6a7c'],
  concrete: ['#1e1d22', '#34323a', '#4e4b55', '#6d6a74', '#938f98', '#c1bdc4'],
  ocean: ['#04102a', '#08204a', '#0e3570', '#195098', '#2f74bc', '#62a6dc'],
  white: ['#5a5868', '#8c8a98', '#b8b6c2', '#dcdae2', '#f2f0f6', '#ffffff'],
} as const;

export type RampId = keyof typeof RAMPS;

/** Предрасчитанные RGBA-цвета рамп для быстрой растеризации. */
const rgbaCache = new Map<string, Uint32Array>();

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Упаковка цвета в uint32 (порядок байт ImageData little-endian: ABGR). */
export function packRgba(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function rampRgba(id: RampId): Uint32Array {
  let c = rgbaCache.get(id);
  if (!c) {
    c = new Uint32Array(RAMPS[id].map(h => {
      const [r, g, b] = hexToRgb(h);
      return packRgba(r, g, b);
    }));
    rgbaCache.set(id, c);
  }
  return c;
}

export const RAMP_IDS = Object.keys(RAMPS) as RampId[];
export const rampIndex = new Map<RampId, number>(RAMP_IDS.map((k, i) => [k, i]));

/** Цвет из рампы по индексу (0..5) — для обычного рисования. */
export const col = (id: RampId, i: number): string => RAMPS[id][Math.max(0, Math.min(5, i | 0))];

export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), bb = Math.round(b1 + (b2 - b1) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bb).toString(16).slice(1);
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Цвета игроков и интерфейса. */
export const UI = {
  bg: '#07060b',
  panel: '#151320',
  panel2: '#1f1c2e',
  line: '#3a3550',
  text: '#ebe5e6',
  dim: '#9a92a0',
  faint: '#5a5868',
  gold: '#fbcd4a',
  red: '#ea6a3f',
  green: '#6ccc4a',
  blue: '#68a6f0',
  purple: '#bb70cc',
  orange: '#f08a1c',
  p1: '#fbcd4a',
  p2: '#6ccc4a',
  common: '#c8c0c8',
  rare: '#68a6f0',
  epic: '#bb70cc',
  legendary: '#fbab6c',
} as const;

export const PLAYER_RAMPS: RampId[] = ['gold', 'lime'];
