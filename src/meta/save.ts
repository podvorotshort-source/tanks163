// Постоянный прогресс: версия, контрольная сумма, резервная копия,
// защита от повреждённых и отсутствующих данных.

import { storage } from './storage';
import { hashStr } from '../core/math';
import type { ClassId } from '../sim/types';
import type { MetaBonus } from '../sim/sim';
import { WORKSHOP, START_UNLOCKS, VARIANTS } from './meta';
import type { UnlockCtx } from '../sim/upgrades';
import { STAGE_DEFS } from '../sim/content/stages';
import { BOSS_WEAPON } from '../sim/content/weapons';

export interface RunStats {
  runs: number;
  wins: number;
  bestStage: number;
  bestTime: number;
  kills: number;
  bossKills: number;
  playTime: number;
}

export interface SaveData {
  v: 1;
  scrap: number;
  totalScrap: number;
  workshop: Record<string, number>;
  unlocked: string[];
  trophies: Record<string, number>;
  stats: RunStats;
  threatUnlocked: number;
  /** Последний выбор на экране подготовки. */
  last: { players: number; variants: string[]; threat: number };
}

export const SAVE_KEY = 'tankorost.save.v1';
const BAK_KEY = SAVE_KEY + '.bak';

export function defaultSave(): SaveData {
  return {
    v: 1, scrap: 0, totalScrap: 0, workshop: {}, unlocked: [...START_UNLOCKS], trophies: {},
    stats: { runs: 0, wins: 0, bestStage: 0, bestTime: 0, kills: 0, bossKills: 0, playTime: 0 },
    threatUnlocked: 0,
    last: { players: 1, variants: ['assault', 'heavy'], threat: 0 },
  };
}

const num = (v: unknown, d: number, min = 0, max = 1e12): number => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : d);

/** Приводит произвольные данные к корректной структуре (поля по умолчанию, границы). */
export function sanitize(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  d.scrap = Math.floor(num(r.scrap, 0));
  d.totalScrap = Math.floor(num(r.totalScrap, d.scrap));
  if (r.workshop && typeof r.workshop === 'object') {
    for (const w of WORKSHOP) d.workshop[w.id] = Math.floor(num((r.workshop as Record<string, unknown>)[w.id], 0, 0, w.costs.length));
  }
  if (Array.isArray(r.unlocked)) d.unlocked = [...new Set([...START_UNLOCKS, ...r.unlocked.filter((x): x is string => typeof x === 'string' && x.length < 40)])];
  if (r.trophies && typeof r.trophies === 'object') for (const [k, v] of Object.entries(r.trophies as Record<string, unknown>)) d.trophies[k] = Math.floor(num(v, 0, 0, 1e6));
  if (r.stats && typeof r.stats === 'object') {
    const s = r.stats as Record<string, unknown>;
    for (const k of Object.keys(d.stats) as (keyof RunStats)[]) d.stats[k] = num(s[k], 0);
  }
  d.threatUnlocked = Math.floor(num(r.threatUnlocked, 0, 0, 5));
  if (r.last && typeof r.last === 'object') {
    const l = r.last as Record<string, unknown>;
    d.last.players = num(l.players, 1, 1, 2) === 2 ? 2 : 1;
    if (Array.isArray(l.variants)) d.last.variants = l.variants.filter((x): x is string => typeof x === 'string' && VARIANTS.some(v => v.id === x)).slice(0, 2);
    while (d.last.variants.length < 2) d.last.variants.push('assault');
    d.last.threat = Math.floor(num(l.threat, 0, 0, d.threatUnlocked));
  }
  return d;
}

function pack(d: SaveData): string {
  const body = JSON.stringify(d);
  return JSON.stringify({ body, sum: hashStr(body) });
}

function unpack(s: string | null): SaveData | null {
  if (!s) return null;
  try {
    const o = JSON.parse(s) as { body?: unknown; sum?: unknown };
    if (typeof o.body !== 'string' || hashStr(o.body) !== o.sum) return null;
    return sanitize(JSON.parse(o.body));
  } catch {
    return null;
  }
}

export type LoadStatus = 'ok' | 'new' | 'restored' | 'reset';

class SaveManager {
  data: SaveData = defaultSave();
  status: LoadStatus = 'new';

  load(): LoadStatus {
    const main = storage.get(SAVE_KEY);
    const a = unpack(main);
    if (a) { this.data = a; this.status = 'ok'; return this.status; }
    const b = unpack(storage.get(BAK_KEY));
    if (b) { this.data = b; this.status = 'restored'; this.save(); return this.status; }
    this.data = defaultSave();
    this.status = main ? 'reset' : 'new';
    if (main) storage.set(SAVE_KEY + '.broken', main.slice(0, 200000));
    return this.status;
  }

  save(): boolean {
    const cur = storage.get(SAVE_KEY);
    if (cur && unpack(cur)) storage.set(BAK_KEY, cur);
    return storage.set(SAVE_KEY, pack(this.data));
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }

  has(id: string): boolean {
    return this.data.unlocked.includes(id);
  }

  rank(id: string): number {
    return this.data.workshop[id] ?? 0;
  }

  trophyCount(): number {
    return Object.values(this.data.trophies).filter(v => v > 0).length;
  }

  /** Бонусы мастерской для симуляции. */
  bonus(): MetaBonus {
    const b: MetaBonus = { lives: 0, hp: 0, dmg: 0, speed: 0, armor: 0, xp: 0, regen: 0, luck: 0, rerolls: 0, banishes: 0, cards: 0, revive: 0, crit: 0, ability: 0 };
    for (const w of WORKSHOP) b[w.id] = this.rank(w.id) * w.per;
    return b;
  }

  unlockCtx(): UnlockCtx {
    const set = new Set(this.data.unlocked);
    // Трофейное оружие: открывается победой над боссом его ступени.
    STAGE_DEFS.forEach((s, i) => { const w = BOSS_WEAPON[i]; if (w && (this.data.trophies[s.boss] ?? 0) > 0) set.add('w:' + w); });
    return { has: (id: string) => set.has(id) };
  }

  spend(cost: number): boolean {
    if (this.data.scrap < cost) return false;
    this.data.scrap -= cost;
    return true;
  }

  variantsOf(cls: ClassId) {
    return VARIANTS.filter(v => v.cls === cls && (v.cost === 0 || this.has('v:' + v.id)));
  }
}

export const save = new SaveManager();
