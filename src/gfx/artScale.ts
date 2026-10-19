// Масштабы внешней графики (assets/sprites): множители поверх размеров из кода.
// Меняют только вид — хитбоксы, баланс и опорные точки прежние.
// Источник — assets/sprites/scales.json; поверх него — правки из инструмента
// настройки (?dev=tune), сохранённые в браузере.

export type ArtGroup = 'tank' | 'enemy' | 'boss' | 'prop' | 'ground' | 'fx' | 'proj';

export const ART_GROUPS: { id: ArtGroup; name: string }[] = [
  { id: 'tank', name: 'Танк игрока' },
  { id: 'enemy', name: 'Враги' },
  { id: 'boss', name: 'Боссы' },
  { id: 'prop', name: 'Препятствия' },
  { id: 'ground', name: 'Земля (текстура)' },
  { id: 'fx', name: 'Эффекты' },
  { id: 'proj', name: 'Снаряды' },
];

export interface ArtScales {
  groups: Partial<Record<ArtGroup, number>>;
  keys: Record<string, number>;
}

const LS_KEY = 'tk.artScale';

const FILE: ArtScales = (() => {
  try {
    const m = import.meta.glob('../../assets/sprites/scales.json', { eager: true, import: 'default' }) as Record<string, ArtScales>;
    const f = Object.values(m)[0];
    return { groups: { ...(f?.groups ?? {}) }, keys: { ...(f?.keys ?? {}) } };
  } catch {
    return { groups: {}, keys: {} };
  }
})();

function loadLocal(): ArtScales | null {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return null;
    const v = JSON.parse(s) as ArtScales;
    return { groups: { ...(v.groups ?? {}) }, keys: { ...(v.keys ?? {}) } };
  } catch {
    return null;
  }
}

let cur: ArtScales = loadLocal() ?? clone(FILE);
let version = 0;
const listeners: (() => void)[] = [];

function clone(s: ArtScales): ArtScales {
  return { groups: { ...s.groups }, keys: { ...s.keys } };
}

/** Группа картинки по имени файла. */
export function artGroupOf(key: string): ArtGroup | null {
  if (key.startsWith('hull_') || key.startsWith('turret_') || key.startsWith('module_')) return 'tank';
  if (key.startsWith('enemy_boss')) return 'boss';
  if (key.startsWith('enemy_')) return 'enemy';
  if (key.startsWith('prop_')) return 'prop';
  if (key.startsWith('ground_')) return 'ground';
  if (key.startsWith('fx_')) return 'fx';
  if (key.startsWith('proj_')) return 'proj';
  return null;
}

/** Ключ настройки: кадры раскадровки и детали врагов настраиваются вместе с основой. */
export function artScaleKey(key: string): string {
  if (key.startsWith('fx_')) return key.replace(/_\d+$/, '');
  return key.replace(/_(turret|rotor)$/, '');
}

/** Итоговый множитель размера картинки. */
export function artK(key: string): number {
  const g = artGroupOf(key);
  return (g ? cur.groups[g] ?? 1 : 1) * (cur.keys[artScaleKey(key)] ?? 1);
}

export function artScales(): ArtScales {
  return cur;
}

/** Номер версии (растёт при каждой правке) — для сброса кешей. */
export function artScaleVersion(): number {
  return version;
}

export function onArtScale(fn: () => void): void {
  listeners.push(fn);
}

function changed(): void {
  version++;
  try { localStorage.setItem(LS_KEY, JSON.stringify(cur)); } catch { /* нет хранилища */ }
  for (const fn of listeners) fn();
}

export function setGroupScale(g: ArtGroup, v: number): void {
  if (Math.abs(v - 1) < 1e-3) delete cur.groups[g]; else cur.groups[g] = round(v);
  changed();
}

export function setKeyScale(key: string, v: number): void {
  if (Math.abs(v - 1) < 1e-3) delete cur.keys[key]; else cur.keys[key] = round(v);
  changed();
}

/** Вернуть значения из файла проекта (правки в браузере отбрасываются). */
export function resetToFile(): void {
  cur = clone(FILE);
  try { localStorage.removeItem(LS_KEY); } catch { /* нет хранилища */ }
  version++;
  for (const fn of listeners) fn();
}

/** Все множители = 1. */
export function resetAll(): void {
  cur = { groups: {}, keys: {} };
  changed();
}

/** Есть правки, не записанные в файл проекта. */
export function artScaleDirty(): boolean {
  return JSON.stringify(sorted(cur)) !== JSON.stringify(sorted(FILE));
}

export function artScaleJson(): string {
  return JSON.stringify(sorted(cur), null, 2) + '\n';
}

function sorted(s: ArtScales): ArtScales {
  const o = <T>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).sort(([a], [b]) => a.localeCompare(b))) as Record<string, T>;
  return { groups: o(s.groups as Record<string, number>), keys: o(s.keys) };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
