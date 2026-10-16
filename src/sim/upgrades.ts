// Улучшения при повышении уровня: карточки, редкости, пул по билду.

import type { Rng } from '../core/rng';
import type { AbilityId, WeaponId } from './types';
import type { Player } from './entities';
import { WEAPONS, MAX_WEAPON_LEVEL, weaponStatsAt, type WeaponStats } from './content/weapons';
import { ABILITIES, ABILITY_SLOTS, MAX_ABILITY_LEVEL, ABILITY_IDS } from './content/classes';

export type Rarity = 0 | 1 | 2 | 3; // обычная, редкая, эпическая, легендарная
export const RARITY_NAMES = ['Обычное', 'Редкое', 'Эпическое', 'Легендарное'];

export type CardKind = 'weapon' | 'wlevel' | 'stat' | 'mod' | 'synergy' | 'ability' | 'alevel' | 'fallback';

export interface Card {
  id: string;
  kind: CardKind;
  rarity: Rarity;
  title: string;
  text: string;
  icon: string;
  /** Подпись типа карты. */
  tag: string;
  /** Значение (для статов — величина по редкости). */
  value: number;
  /** Уровень после выбора (для оружия/способностей). */
  level?: number;
}

/** Контекст сессии: что открыто в мета-прогрессии. */
export interface UnlockCtx {
  has(id: string): boolean;
}

// ---------------------------------------------------------------------------
// Общие улучшения
// ---------------------------------------------------------------------------
interface StatUp {
  id: string;
  name: string;
  icon: string;
  max: number;
  vals: [number, number, number];
  fmt: (v: number) => string;
  apply: (p: Player, v: number) => void;
  req?: (p: Player) => boolean;
}

const EXPLOSIVE: WeaponId[] = ['he', 'rockets', 'mines'];
const hasExplosive = (p: Player) => EXPLOSIVE.some(w => p.hasWeapon(w)) || p.hasAbility('volley') || p.hasAbility('airstrike') || p.hasAbility('minefield') || p.hasAbility('gravity');
const hasFire = (p: Player) => p.hasWeapon('flame') || p.mods.has('he_incendiary') || p.mods.has('mg_incendiary') || p.mods.has('syn_firewall');

export const STAT_UPS: StatUp[] = [
  { id: 'caliber', name: 'Калибр', icon: 'caliber', max: 6, vals: [8, 12, 18], fmt: v => `Урон всего оружия +${v}%`, apply: (p, v) => { p.stats.dmg += v / 100; } },
  { id: 'loader', name: 'Автомат заряжания', icon: 'loader', max: 6, vals: [6, 9, 13], fmt: v => `Перезарядка оружия −${v}%`, apply: (p, v) => { p.stats.cd *= 1 - v / 100; } },
  { id: 'ballistics', name: 'Баллистика', icon: 'ballistics', max: 5, vals: [10, 15, 22], fmt: v => `Скорость снарядов +${v}%, дальность +${Math.round(v / 2)}%`, apply: (p, v) => { p.stats.projSpeed += v / 100; p.stats.range += v / 200; } },
  { id: 'explosives', name: 'Взрывчатка', icon: 'explosives', max: 6, vals: [10, 14, 20], fmt: v => `Радиус всех взрывов +${v}% (фугасы, ракеты, мины, способности)`, apply: (p, v) => { p.stats.blast += v / 100; }, req: hasExplosive },
  { id: 'napalmMix', name: 'Горючая смесь', icon: 'napalmMix', max: 5, vals: [15, 22, 30], fmt: v => `Радиус распространения огня +${v}%`, apply: (p, v) => { p.stats.fireSpread += v / 100; }, req: hasFire },
  { id: 'thermite', name: 'Термит', icon: 'thermite', max: 5, vals: [15, 22, 30], fmt: v => `Урон горения +${v}%`, apply: (p, v) => { p.stats.burn += v / 100; }, req: hasFire },
  { id: 'duration', name: 'Стабилизатор', icon: 'duration', max: 5, vals: [10, 15, 22], fmt: v => `Длительность эффектов +${v}%: горение, оглушение, способности`, apply: (p, v) => { p.stats.duration += v / 100; } },
  { id: 'armor', name: 'Композитная броня', icon: 'armor', max: 5, vals: [5, 7, 10], fmt: v => `Получаемый урон −${v}%`, apply: (p, v) => { p.stats.armor = Math.min(0.7, p.stats.armor + v / 100); } },
  { id: 'hull', name: 'Усиленный корпус', icon: 'hull', max: 6, vals: [12, 18, 26], fmt: v => `Прочность +${v}% и ремонт на 25%`, apply: (p, v) => { const k = p.hp / p.maxHp; p.stats.maxHp += v / 100; void k; } },
  { id: 'engine', name: 'Форсированный двигатель', icon: 'engine', max: 5, vals: [6, 9, 13], fmt: v => `Скорость движения +${v}%`, apply: (p, v) => { p.stats.speed += v / 100; } },
  { id: 'optics', name: 'Оптика', icon: 'optics', max: 5, vals: [8, 12, 16], fmt: v => `Дальность +${v}%, шанс крита +2%`, apply: (p, v) => { p.stats.range += v / 100; p.stats.crit += 0.02; } },
  { id: 'regen', name: 'Ремонтный модуль', icon: 'regen', max: 5, vals: [4, 6, 9], fmt: v => `Ремонт ${(v / 10).toFixed(1)}% прочности в секунду`, apply: (p, v) => { p.stats.regen += v / 1000; } },
  { id: 'tactics', name: 'Тактический компьютер', icon: 'tactics', max: 5, vals: [7, 10, 14], fmt: v => `Перезарядка способностей −${v}%`, apply: (p, v) => { p.stats.abilityCd *= 1 - v / 100; } },
  { id: 'crit', name: 'Прицел-дальномер', icon: 'crit', max: 5, vals: [4, 6, 9], fmt: v => `Шанс критического попадания +${v}%`, apply: (p, v) => { p.stats.crit += v / 100; } },
  { id: 'critDmg', name: 'Кумулятивные заряды', icon: 'critDmg', max: 5, vals: [20, 30, 45], fmt: v => `Урон критических попаданий +${v}%`, apply: (p, v) => { p.stats.critMult += v / 100; }, req: p => p.stats.crit >= 0.08 },
  { id: 'luck', name: 'Счастливая звезда', icon: 'luck', max: 4, vals: [1, 1.5, 2], fmt: v => `Удача +${v}: чаще редкие карты и бонусы`, apply: (p, v) => { p.stats.luck += v; } },
  { id: 'tutor', name: 'Боевой опыт', icon: 'tutor', max: 4, vals: [6, 9, 12], fmt: v => `Опыт всей команды +${v}%`, apply: (p, v) => { p.stats.xp += v / 100; } },
  { id: 'press', name: 'Гусеничный пресс', icon: 'press', max: 4, vals: [3, 4, 6], fmt: v => `Давит врагов крупнее: порог +${v}% размера`, apply: (p, v) => { p.stats.crush += v / 100; } },
];

// ---------------------------------------------------------------------------
// Модификаторы оружия (открываются исследованиями)
// ---------------------------------------------------------------------------
export interface ModDef {
  id: string;
  weapon: WeaponId;
  name: string;
  text: string;
}

export const MODS: ModDef[] = [
  { id: 'ap_ricochet', weapon: 'ap', name: 'Рикошет', text: 'Бронебойный снаряд после попадания отскакивает к следующей цели (2 раза).' },
  { id: 'ap_mark', weapon: 'ap', name: 'Метка', text: 'Попадание бронебойным метит цель: 4 с она получает +25% урона от всех.' },
  { id: 'he_incendiary', weapon: 'he', name: 'Зажигательная начинка', text: 'Взрывы фугасов поджигают поверхность.' },
  { id: 'he_cluster', weapon: 'he', name: 'Кассетные снаряды', text: 'Фугас при взрыве разбрасывает 4 малых заряда.' },
  { id: 'mg_incendiary', weapon: 'mg', name: 'Зажигательные пули', text: '15% пуль поджигают цель.' },
  { id: 'mg_ap', weapon: 'mg', name: 'Бронебойные пули', text: 'Урон пулемёта по средней и тяжёлой броне +80%.' },
  { id: 'rk_cluster', weapon: 'rockets', name: 'Кассетные боеголовки', text: 'Каждая ракета разбрасывает 3 суббоеприпаса.' },
  { id: 'rk_seeker', weapon: 'rockets', name: 'Умное наведение', text: 'Ракеты быстрее, перенацеливаются, если цель погибла.' },
  { id: 'fl_napalm', weapon: 'flame', name: 'Липкий напалм', text: 'Огнемёт заливает землю напалмом: горит вдвое дольше даже без топлива.' },
  { id: 'fl_blue', weapon: 'flame', name: 'Голубое пламя', text: 'Пламя игнорирует броню: урон по тяжёлым +60%.' },
  { id: 'mn_chain', weapon: 'mines', name: 'Цепная реакция', text: 'Взрыв мины подрывает мины рядом; каждое звено цепи +20% урона.' },
  { id: 'mn_jump', weapon: 'mines', name: 'Прыгающие мины', text: 'Мины сами прыгают к врагу поблизости.' },
  { id: 'ts_overload', weapon: 'tesla', name: 'Перегрузка', text: 'Убитые молнией враги взрываются разрядом.' },
  { id: 'ts_ball', weapon: 'tesla', name: 'Шаровая молния', text: 'Каждый 3-й разряд — шаровая молния, бьющая всех по пути.' },
  { id: 'rm_spikes', weapon: 'ram', name: 'Шипы', text: 'Враги, касающиеся танка, получают урон тарана ×2.' },
  { id: 'rm_dozer', weapon: 'ram', name: 'Бульдозер', text: 'Ломает препятствия вдвое крупнее и давит врагов на 10% крупнее.' },
];

// ---------------------------------------------------------------------------
// Синергии (требуют двух частей)
// ---------------------------------------------------------------------------
export interface SynDef {
  id: string;
  name: string;
  text: string;
  req: (p: Player) => boolean;
  needs: string;
}

export const SYNERGIES: SynDef[] = [
  { id: 'syn_detonator', name: 'Детонатор', needs: 'Фугас или ракеты + мины', text: 'Взрывы фугасов и ракет подрывают мины в радиусе; мины от этого бьют на 50% сильнее.', req: p => (p.hasWeapon('he') || p.hasWeapon('rockets')) && p.hasWeapon('mines') },
  { id: 'syn_firewall', name: 'Огненный вал', needs: 'Взрывное оружие + огнемёт', text: 'Все ваши взрывы поджигают поверхность.', req: p => EXPLOSIVE.some(w => p.hasWeapon(w)) && p.hasWeapon('flame') },
  { id: 'syn_pyre', name: 'Пылающие останки', needs: 'Источник огня + взрывное оружие', text: 'Горящие враги взрываются при гибели.', req: p => hasFire(p) && EXPLOSIVE.some(w => p.hasWeapon(w)) },
  { id: 'syn_electrolyte', name: 'Электролит', needs: 'Тесла + огнемёт', text: 'Молния по горящему врагу вызывает взрыв.', req: p => p.hasWeapon('tesla') && p.hasWeapon('flame') },
  { id: 'syn_rammine', name: 'Таранный заряд', needs: 'Отвал-таран + мины', text: 'Таран и давка оставляют мину (не чаще раза в секунду).', req: p => p.hasWeapon('ram') && p.hasWeapon('mines') },
  { id: 'syn_spotter', name: 'Корректировщик', needs: 'Бронебойная пушка + ракеты', text: 'Бронебойные помечают цели; ракеты летят в помеченных и бьют на 40% сильнее.', req: p => p.hasWeapon('ap') && p.hasWeapon('rockets') },
  { id: 'syn_hail', name: 'Шрапнельный град', needs: 'Фугасная пушка + пулемёт', text: 'Каждый взрыв фугаса выпускает 6 пуль во все стороны.', req: p => p.hasWeapon('he') && p.hasWeapon('mg') },
  { id: 'syn_firetrail', name: 'Огненный след', needs: 'Рывок + огнемёт', text: 'Рывок оставляет полосу огня.', req: p => p.hasAbility('dash') && p.hasWeapon('flame') },
  { id: 'syn_thunder', name: 'Грозовой фронт', needs: 'Тесла + ракеты', text: 'Разрыв ракеты выпускает цепную молнию.', req: p => p.hasWeapon('tesla') && p.hasWeapon('rockets') },
];

// ---------------------------------------------------------------------------
// Итоговые параметры оружия
// ---------------------------------------------------------------------------

export function computeWeaponStats(p: Player, id: WeaponId, level: number, starTier: number, isMain: boolean): WeaponStats {
  const s = weaponStatsAt(id, level);
  const st = p.stats;
  const d = WEAPONS[id];
  s.dmg *= st.dmg;
  s.cd *= st.cd;
  s.speed *= st.projSpeed;
  s.range *= st.range;
  if (d.tags.includes('explosive')) s.radius *= st.blast;
  if (id === 'flame') { s.extra *= st.burn; s.extra2 *= st.duration; }
  if (id === 'tesla') { s.count += st.chain; s.extra *= st.duration; }
  if (isMain && starTier > 0) {
    s.dmg *= 1 + 0.2 * starTier;
    s.cd *= 1 - 0.1 * starTier;
    if (starTier >= 3 && id !== 'flame') s.count += 1;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Формирование предложения
// ---------------------------------------------------------------------------

const RARITY_W = [1, 0.42, 0.14, 0.05];

function rollRarity(rng: Rng, luck: number, min: Rarity = 0): Rarity {
  const w = RARITY_W.map((v, i) => (i < min ? 0 : v * (i > 0 ? 1 + luck * 0.25 : 1)));
  return Math.max(min, rng.weightedIndex(w)) as Rarity;
}

export interface OfferCtx {
  rng: Rng;
  unlocks: UnlockCtx;
  /** Уровень команды. */
  level: number;
  starTier: number;
}

export function offerCards(p: Player, n: number, ctx: OfferCtx): Card[] {
  const { rng, unlocks } = ctx;
  const pool: { w: number; make: () => Card; key: string }[] = [];
  const auxCount = p.weapons.length - 1;
  const freeSlots = p.cls.auxSlots - auxCount;
  const ban = (id: string) => p.banned.has(id);

  // Новое оружие
  if (freeSlots > 0) {
    for (const id of Object.keys(WEAPONS) as WeaponId[]) {
      if (p.hasWeapon(id) || !unlocks.has('w:' + id) || ban('w:new:' + id)) continue;
      const boost = auxCount === 0 && ctx.level >= 2 ? 1.8 : 1;
      pool.push({
        key: 'w:' + id, w: 9 * boost, make: () => ({
          id: 'w:new:' + id, kind: 'weapon', rarity: 1, title: WEAPONS[id].name, tag: 'Новая система',
          text: WEAPONS[id].desc, icon: 'w_' + id, value: 0, level: 1,
        }),
      });
    }
  }
  // Уровни оружия
  for (const w of p.weapons) {
    if (w.level >= MAX_WEAPON_LEVEL || ban('w:lvl:' + w.id)) continue;
    const lv = w.level + 1;
    pool.push({
      key: 'w:' + w.id, w: 11 + w.level, make: () => ({
        id: 'w:lvl:' + w.id, kind: 'wlevel', rarity: (lv >= 6 ? 2 : lv >= 4 ? 1 : 0) as Rarity,
        title: WEAPONS[w.id].name, tag: `Уровень ${lv}`, text: WEAPONS[w.id].levels[lv - 2].text, icon: 'w_' + w.id, value: 0, level: lv,
      }),
    });
  }
  // Общие
  for (const s of STAT_UPS) {
    if (p.rank(s.id) >= s.max || ban('s:' + s.id) || (s.req && !s.req(p))) continue;
    pool.push({
      key: 's:' + s.id, w: 4.2, make: () => {
        const r = Math.min(2, rollRarity(rng, p.stats.luck)) as 0 | 1 | 2;
        const v = s.vals[r];
        return { id: 's:' + s.id, kind: 'stat', rarity: r, title: s.name, tag: 'Общее', text: s.fmt(v), icon: 's_' + s.icon, value: v };
      },
    });
  }
  // Модификаторы
  for (const m of MODS) {
    if (!p.hasWeapon(m.weapon) || p.mods.has(m.id) || !unlocks.has('m:' + m.id) || ban('m:' + m.id)) continue;
    const wl = p.weapon(m.weapon)!.level;
    pool.push({
      key: 'm:' + m.id, w: 3 + wl, make: () => ({
        id: 'm:' + m.id, kind: 'mod', rarity: 2, title: m.name, tag: 'Модификатор: ' + WEAPONS[m.weapon].name.toLowerCase(),
        text: m.text, icon: 'w_' + m.weapon, value: 0,
      }),
    });
  }
  // Синергии
  for (const s of SYNERGIES) {
    if (p.mods.has(s.id) || !unlocks.has('y:' + s.id) || !s.req(p) || ban('y:' + s.id)) continue;
    pool.push({
      key: 'y:' + s.id, w: 7, make: () => ({
        id: 'y:' + s.id, kind: 'synergy', rarity: 3, title: s.name, tag: 'Синергия: ' + s.needs.toLowerCase(), text: s.text, icon: 'syn', value: 0,
      }),
    });
  }
  // Способности
  if (p.abilities.length < ABILITY_SLOTS && ctx.level >= 2) {
    for (const id of ABILITY_IDS) {
      const a = ABILITIES[id];
      if (a.classOnly || p.hasAbility(id) || !unlocks.has('a:' + id) || ban('a:new:' + id)) continue;
      pool.push({
        key: 'a:' + id, w: p.abilities.length === 1 ? 5 : 3.2, make: () => ({
          id: 'a:new:' + id, kind: 'ability', rarity: 1, title: a.name, tag: 'Новая способность', text: a.desc, icon: 'a_' + id, value: 0, level: 1,
        }),
      });
    }
  }
  for (const ai of p.abilities) {
    if (ai.level >= MAX_ABILITY_LEVEL || ban('a:lvl:' + ai.id)) continue;
    const a = ABILITIES[ai.id];
    pool.push({
      key: 'a:' + ai.id, w: 4, make: () => ({
        id: 'a:lvl:' + ai.id, kind: 'alevel', rarity: (ai.level >= 3 ? 1 : 0) as Rarity, title: a.name, tag: `Способность, уровень ${ai.level + 1}`,
        text: a.levels[ai.level - 1], icon: 'a_' + ai.id, value: 0, level: ai.level + 1,
      }),
    });
  }

  const out: Card[] = [];
  const usedKeys = new Set<string>();
  while (out.length < n && pool.length) {
    const i = rng.weightedIndex(pool.map(e => (usedKeys.has(e.key) ? 0 : e.w)));
    if (i < 0) break;
    usedKeys.add(pool[i].key);
    out.push(pool[i].make());
  }
  // Запасные карты, если пул иссяк.
  const fallbacks: Card[] = [
    { id: 'f:repair', kind: 'fallback', rarity: 0, title: 'Капремонт', tag: 'Ремонт', text: 'Восстановить 50% прочности.', icon: 'f_repair', value: 50 },
    { id: 'f:scrap', kind: 'fallback', rarity: 0, title: 'Трофейные детали', tag: 'Награда', text: '+40 деталей для мастерской.', icon: 'f_scrap', value: 40 },
    { id: 'f:power', kind: 'fallback', rarity: 1, title: 'Тренировка экипажа', tag: 'Общее', text: 'Урон +4%, прочность +4%.', icon: 's_caliber', value: 4 },
  ];
  let fi = 0;
  while (out.length < n) out.push(fallbacks[fi++ % fallbacks.length]);
  return out;
}

/** Есть ли у игрока что-то горящее/поджигающее (для логики синергий). */
export { hasFire, hasExplosive };

export function cardIcon(c: Card): string {
  return c.icon;
}

export const ALL_MOD_IDS = MODS.map(m => m.id);
export const ALL_SYN_IDS = SYNERGIES.map(s => s.id);
export type { AbilityId };
