// Мета-прогрессия: мастерская, арсенал, исследования, гараж, трофеи, угроза.
// Одна валюта — «детали».

import type { ClassId, WeaponId, AbilityId } from '../sim/types';
import type { MetaBonus } from '../sim/sim';
import { MODS, SYNERGIES } from '../sim/upgrades';
import { WEAPONS } from '../sim/content/weapons';
import { ABILITIES } from '../sim/content/classes';

export interface WorkshopDef {
  id: keyof MetaBonus;
  name: string;
  desc: (rank: number) => string;
  costs: number[];
  per: number;
  icon: string;
}

// Мастерская — главный путь к победе: свежий танк до финала не доходит, полностью
// прокачанный (+ удачная синергия) — может. Цены растут, полная прокачка — десятки забегов.
const ramp = (base: number, n: number, k = 1.32) => Array.from({ length: n }, (_, i) => Math.round((base * Math.pow(k, i)) / 5) * 5);

export const WORKSHOP: WorkshopDef[] = [
  { id: 'hp', name: 'Бронекорпус', icon: 's_hull', per: 0.06, costs: ramp(40, 10), desc: r => `Прочность +${r * 6}%` },
  { id: 'dmg', name: 'Калибровка орудий', icon: 's_caliber', per: 0.06, costs: ramp(50, 10), desc: r => `Урон +${r * 6}%` },
  { id: 'armor', name: 'Броневые листы', icon: 's_armor', per: 0.025, costs: ramp(60, 6, 1.45), desc: r => `Получаемый урон −${(r * 2.5).toFixed(1).replace('.0', '')}%` },
  { id: 'speed', name: 'Трансмиссия', icon: 's_engine', per: 0.03, costs: ramp(40, 4, 1.6), desc: r => `Скорость +${r * 3}%` },
  { id: 'xp', name: 'Боевой опыт', icon: 's_tutor', per: 0.05, costs: ramp(60, 5, 1.5), desc: r => `Опыт +${r * 5}%` },
  { id: 'regen', name: 'Ремонтная бригада', icon: 's_regen', per: 0.0012, costs: ramp(80, 5, 1.55), desc: r => `Ремонт ${(r * 0.12).toFixed(2)}% прочности/с` },
  { id: 'crit', name: 'Прицелы', icon: 's_crit', per: 0.02, costs: ramp(60, 5, 1.55), desc: r => `Шанс крита +${r * 2}%` },
  { id: 'ability', name: 'Тактика', icon: 's_tactics', per: 0.04, costs: ramp(70, 5, 1.5), desc: r => `Перезарядка способностей −${r * 4}%` },
  { id: 'luck', name: 'Талисман', icon: 's_luck', per: 0.5, costs: [70, 140, 230], desc: r => `Удача +${r * 0.5}` },
  { id: 'revive', name: 'Спасательный трос', icon: 'a_repair', per: 0.1, costs: [60, 120, 200], desc: r => `Спасение напарника быстрее на ${r * 10}%` },
  { id: 'rerolls', name: 'Штабная связь', icon: 'f_scrap', per: 1, costs: [80, 160, 260], desc: r => `+${r} переброс карт за забег` },
  { id: 'banishes', name: 'Цензор', icon: 'skull', per: 1, costs: [90, 170, 280], desc: r => `+${r} исключение карт за забег` },
  { id: 'lives', name: 'Запасной экипаж', icon: 'p_tank', per: 1, costs: [220, 480, 900], desc: r => `+${r} жизнь в начале забега` },
  { id: 'cards', name: 'Расширенный выбор', icon: 'syn', per: 1, costs: [520], desc: r => (r ? '4 карты при уровне' : '+1 карта при выборе улучшений') },
];

export interface UnlockDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  /** Нужен трофей хотя бы одного босса. */
  needTrophy?: number;
  group: 'arsenal' | 'research' | 'garage';
}

/** Открыто с самого начала. */
export const START_UNLOCKS = [
  'w:ap', 'w:he', 'w:mg', 'w:flame', 'w:mines',
  'a:smoke', 'a:repair', 'a:shockwave', 'a:overdrive',
  'm:ap_ricochet', 'm:he_incendiary', 'm:mg_ap', 'm:fl_napalm', 'm:mn_chain', 'm:rk_seeker',
  'y:syn_firewall', 'y:syn_detonator', 'y:syn_pyre',
];

const WEAPON_COST: Partial<Record<WeaponId, number>> = { rockets: 120, tesla: 170, ram: 140 };
const ABILITY_COST: Partial<Record<AbilityId, number>> = { airstrike: 110, emp: 140, minefield: 100, drone: 160, wall: 120, gravity: 180 };

export const ARSENAL: UnlockDef[] = [
  ...(Object.keys(WEAPON_COST) as WeaponId[]).map(id => ({ id: 'w:' + id, name: WEAPONS[id].name, desc: WEAPONS[id].desc, cost: WEAPON_COST[id]!, icon: 'w_' + id, group: 'arsenal' as const })),
  ...(Object.keys(ABILITY_COST) as AbilityId[]).map(id => ({ id: 'a:' + id, name: 'Способность: ' + ABILITIES[id].name, desc: ABILITIES[id].desc, cost: ABILITY_COST[id]!, icon: 'a_' + id, group: 'arsenal' as const })),
];

export const RESEARCH: UnlockDef[] = [
  ...MODS.filter(m => !START_UNLOCKS.includes('m:' + m.id)).map((m, i) => ({ id: 'm:' + m.id, name: m.name, desc: `Модификатор (${WEAPONS[m.weapon].name.toLowerCase()}): ${m.text}`, cost: 70 + (i % 4) * 15, icon: 'w_' + m.weapon, group: 'research' as const })),
  ...SYNERGIES.filter(s => !START_UNLOCKS.includes('y:' + s.id)).map((s, i) => ({ id: 'y:' + s.id, name: 'Синергия: ' + s.name, desc: `${s.needs}. ${s.text}`, cost: 160 + (i % 3) * 30, icon: 'syn', needTrophy: 1, group: 'research' as const })),
];

export interface VariantDef {
  id: string;
  cls: ClassId;
  name: string;
  desc: string;
  main: WeaponId;
  aux: WeaponId[];
  cost: number;
}

export const VARIANTS: VariantDef[] = [
  { id: 'scout', cls: 'scout', name: 'Разведчик', desc: 'Бронебойная пушка, рывок.', main: 'ap', aux: [], cost: 0 },
  { id: 'scout_rk', cls: 'scout', name: 'Разведчик-ракетчик', desc: 'Пулемёт в башне и ракетная установка с самого начала.', main: 'mg', aux: ['rockets'], cost: 200 },
  { id: 'assault', cls: 'assault', name: 'Штурмовик', desc: 'Фугасная пушка, залп во все стороны.', main: 'he', aux: [], cost: 0 },
  { id: 'assault_sap', cls: 'assault', name: 'Штурмовик-сапёр', desc: 'Фугасная пушка и минный укладчик с самого начала.', main: 'he', aux: ['mines'], cost: 180 },
  { id: 'heavy', cls: 'heavy', name: 'Тяжёлый', desc: 'Огнемёт, несокрушимость.', main: 'flame', aux: [], cost: 0 },
  { id: 'heavy_ram', cls: 'heavy', name: 'Тяжёлый-громила', desc: 'Бронебойная пушка и отвал-таран с самого начала.', main: 'ap', aux: ['ram'], cost: 220 },
];

export const GARAGE: UnlockDef[] = VARIANTS.filter(v => v.cost > 0).map(v => ({ id: 'v:' + v.id, name: v.name, desc: v.desc, cost: v.cost, icon: 'c_' + v.cls, group: 'garage' as const }));

export const THREATS = [
  { name: 'Базовая', desc: 'Суровая. Победа — после прокачки в мастерской и с удачной синергией.' },
  { name: 'Угроза I', desc: 'Враги крепче, их больше. Детали +25%.' },
  { name: 'Угроза II', desc: 'Ещё крепче и опаснее. Детали +50%.' },
  { name: 'Угроза III', desc: 'Для опытных экипажей. Детали +75%.' },
  { name: 'Угроза IV', desc: 'Почти безнадёжно. Детали +100%.' },
  { name: 'Угроза V', desc: 'Легенда. Детали +125%.' },
];
