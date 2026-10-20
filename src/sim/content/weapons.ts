// Оружие: базовые параметры и уровни. Дальности и скорости — в длинах
// танка (L), урон — базовый (умножается на силу танка).

import type { DmgType, WeaponId } from '../types';

export interface WeaponStats {
  /** Перезарядка, с. */
  cd: number;
  /** Базовый урон. */
  dmg: number;
  /** Дальность, L. */
  range: number;
  /** Скорость снаряда, L/с. */
  speed: number;
  /** Снарядов за выстрел / ракет в залпе / звеньев цепи. */
  count: number;
  /** Радиус взрыва, L (0 — без взрыва). */
  radius: number;
  /** Пробитие (сколько целей насквозь). */
  pierce: number;
  /** Разброс, градусы. */
  spread: number;
  /** Особый параметр: мины — максимум на поле; огонь — урон горения/с; тесла — оглушение, с. */
  extra: number;
  /** Второй особый параметр: огонь — длительность горения; тесла — дальность прыжка L. */
  extra2: number;
}

export type Targeting = 'nearest' | 'armored' | 'cluster' | 'far' | 'none';
export type WeaponTag = 'explosive' | 'fire' | 'projectile' | 'kinetic' | 'electric' | 'contact' | 'area' | 'mine';

export interface WeaponLevel {
  text: string;
  apply: (s: WeaponStats) => void;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  desc: string;
  role: string;
  dmgType: DmgType;
  /** Может стоять в башне (основное орудие). */
  main: boolean;
  tags: WeaponTag[];
  targeting: Targeting;
  base: WeaponStats;
  /** Уровни 2..6. */
  levels: WeaponLevel[];
}

const S = (o: Partial<WeaponStats>): WeaponStats => ({
  cd: 1, dmg: 10, range: 8, speed: 12, count: 1, radius: 0, pierce: 0, spread: 0, extra: 0, extra2: 0, ...o,
});

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ap: {
    id: 'ap', name: 'Бронебойная пушка', role: 'против брони',
    desc: 'Мощные точные выстрелы. Пробивает броню и лёгкие цели насквозь. Выбирает самые бронированные цели.',
    dmgType: 'ap', main: true, tags: ['projectile', 'kinetic'], targeting: 'armored',
    base: S({ cd: 1.15, dmg: 34, range: 9.5, speed: 16, pierce: 2 }),
    levels: [
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Пробитие +1, перезарядка −10%', apply: s => { s.pierce += 1; s.cd *= 0.9; } },
      { text: 'Двойной выстрел', apply: s => { s.count += 1; } },
      { text: 'Урон +30%', apply: s => { s.dmg *= 1.3; } },
      { text: 'Подкалиберный: скорость +50%, урон +20%', apply: s => { s.speed *= 1.5; s.dmg *= 1.2; s.pierce += 1; } },
    ],
  },
  he: {
    id: 'he', name: 'Фугасная пушка', role: 'по группам и укреплениям',
    desc: 'Снаряды взрываются при попадании. Сильны против групп, лёгких целей и стен, слабее против тяжёлой брони.',
    dmgType: 'he', main: true, tags: ['projectile', 'explosive'], targeting: 'cluster',
    base: S({ cd: 1.35, dmg: 24, range: 8.5, speed: 11, radius: 1.5 }),
    levels: [
      { text: 'Радиус взрыва +15%', apply: s => { s.radius *= 1.15; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Перезарядка −15%', apply: s => { s.cd *= 0.85; } },
      { text: '+1 снаряд веером', apply: s => { s.count += 1; s.spread += 12; } },
      { text: 'Урон +30%, радиус +10%', apply: s => { s.dmg *= 1.3; s.radius *= 1.1; } },
    ],
  },
  mg: {
    id: 'mg', name: 'Пулемёт', role: 'против пехоты и лёгких',
    desc: 'Очень высокая скорострельность. Косит пехоту и лёгкую технику, почти бесполезен против тяжёлой брони.',
    dmgType: 'mg', main: true, tags: ['projectile', 'kinetic'], targeting: 'nearest',
    base: S({ cd: 0.12, dmg: 4.2, range: 7, speed: 20, spread: 5 }),
    levels: [
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Скорострельность +18%', apply: s => { s.cd *= 0.82; } },
      { text: 'Второй ствол', apply: s => { s.count += 1; } },
      { text: 'Пробитие лёгких +1, дальность +15%', apply: s => { s.pierce += 1; s.range *= 1.15; } },
      { text: 'Роторная очередь: урон +35%', apply: s => { s.dmg *= 1.35; s.cd *= 0.9; } },
    ],
  },
  rockets: {
    id: 'rockets', name: 'Ракеты и артиллерия', role: 'дальние мощные взрывы',
    desc: 'Залп самонаводящихся ракет по дальним и крупным целям. Большой радиус взрыва, долгая перезарядка, плохо попадает по быстрым.',
    dmgType: 'rocket', main: false, tags: ['projectile', 'explosive'], targeting: 'far',
    base: S({ cd: 3.4, dmg: 30, range: 13, speed: 9, count: 3, radius: 1.5 }),
    levels: [
      { text: '+1 ракета в залпе', apply: s => { s.count += 1; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Радиус взрыва +15%, перезарядка −10%', apply: s => { s.radius *= 1.15; s.cd *= 0.9; } },
      { text: '+2 ракеты в залпе', apply: s => { s.count += 2; } },
      { text: 'Артиллерия: каждый 3-й залп — огневой вал', apply: s => { s.extra = 1; s.dmg *= 1.15; } },
    ],
  },
  flame: {
    id: 'flame', name: 'Огнемёт', role: 'ближний бой, горение',
    desc: 'Конус пламени поджигает врагов и поверхность. Огонь перекидывается на соседей. Слаб против тяжёлой брони.',
    dmgType: 'fire', main: true, tags: ['fire', 'area'], targeting: 'nearest',
    base: S({ cd: 0.07, dmg: 2.7, range: 3.6, speed: 7, spread: 26, extra: 7, extra2: 2.2 }),
    levels: [
      { text: 'Дальность +15%', apply: s => { s.range *= 1.15; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Горение +40%', apply: s => { s.extra *= 1.4; s.extra2 *= 1.2; } },
      { text: 'Шире конус, дальность +10%', apply: s => { s.spread += 12; s.range *= 1.1; } },
      { text: 'Урон +30%, горение +30%', apply: s => { s.dmg *= 1.3; s.extra *= 1.3; } },
    ],
  },
  mines: {
    id: 'mines', name: 'Мины', role: 'ловушки позади',
    desc: 'Танк оставляет мины позади. Преследователи подрываются. Прятаться от погони — выгодно.',
    dmgType: 'mine', main: false, tags: ['explosive', 'mine'], targeting: 'none',
    base: S({ cd: 1.5, dmg: 44, range: 0.8, radius: 1.35, extra: 6 }),
    levels: [
      { text: '+2 мины на поле', apply: s => { s.extra += 2; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Интервал −15%', apply: s => { s.cd *= 0.85; } },
      { text: 'Радиус взрыва +15%, +2 мины', apply: s => { s.radius *= 1.15; s.extra += 2; } },
      { text: 'Урон +35%, сдвоенная укладка', apply: s => { s.dmg *= 1.35; s.count += 1; } },
    ],
  },
  tesla: {
    id: 'tesla', name: 'Тесла-катушка', role: 'цепная молния, против воздуха',
    desc: 'Молния бьёт ближайшую цель и перескакивает на соседние, оглушая. Особенно сильна против авиации.',
    dmgType: 'tesla', main: false, tags: ['electric'], targeting: 'nearest',
    base: S({ cd: 1.25, dmg: 15, range: 5.5, count: 3, extra: 0.3, extra2: 2.6 }),
    levels: [
      { text: '+1 прыжок молнии', apply: s => { s.count += 1; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Перезарядка −15%', apply: s => { s.cd *= 0.85; } },
      { text: '+2 прыжка, оглушение +50%', apply: s => { s.count += 2; s.extra *= 1.5; } },
      { text: 'Двойной разряд, урон +20%', apply: s => { s.dmg *= 1.2; s.pierce += 1; } },
    ],
  },
  ram: {
    id: 'ram', name: 'Отвал-таран', role: 'урон наездом',
    desc: 'Бульдозерный нож: урон при касании, давит более крупных врагов, отбрасывает и ломает препятствия.',
    dmgType: 'ram', main: false, tags: ['contact'], targeting: 'none',
    base: S({ cd: 0.25, dmg: 9, range: 0, radius: 0, extra: 0.12, extra2: 1 }),
    levels: [
      { text: 'Урон +30%', apply: s => { s.dmg *= 1.3; } },
      { text: 'Давит крупнее (+5% порог)', apply: s => { s.extra += 0.05; } },
      { text: 'Отброс и урон +25%', apply: s => { s.extra2 *= 1.4; s.dmg *= 1.25; } },
      { text: 'Давит крупнее (+5%), урон +20%', apply: s => { s.extra += 0.05; s.dmg *= 1.2; } },
      { text: 'Сейсмоудар каждые 4 с', apply: s => { s.count = 2; s.dmg *= 1.2; } },
    ],
  },
  // -------------------------------------------------------------------------
  // Трофейное оружие: открывается в мастерской (арсенал) победой над боссом.
  // -------------------------------------------------------------------------
  blaster: {
    id: 'blaster', name: 'Бластер', role: 'быстрые заряды с рикошетом',
    desc: 'Трофей Заводного генерала. Очереди энергетических зарядов: средний урон по всем целям, заряды отскакивают к соседним врагам.',
    dmgType: 'energy', main: true, tags: ['projectile', 'electric'], targeting: 'nearest',
    base: S({ cd: 0.42, dmg: 11, range: 8, speed: 15, count: 1, spread: 4, extra: 1 }),
    levels: [
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Сдвоенный заряд', apply: s => { s.count += 1; s.spread += 6; } },
      { text: 'Рикошет +1, перезарядка −10%', apply: s => { s.extra += 1; s.cd *= 0.9; } },
      { text: 'Урон +30%', apply: s => { s.dmg *= 1.3; } },
      { text: 'Тройной заряд, рикошет +1', apply: s => { s.count += 1; s.extra += 1; s.spread += 4; } },
    ],
  },
  laser: {
    id: 'laser', name: 'Лазер', role: 'луч насквозь',
    desc: 'Трофей Пульт-тирана. Непрерывный луч прожигает всех на линии, пока держит цель. Останавливается стенами.',
    dmgType: 'energy', main: true, tags: ['electric', 'area'], targeting: 'armored',
    base: S({ cd: 0.1, dmg: 5.2, range: 8.5, pierce: 3, extra: 0.16 }),
    levels: [
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Луч длиннее (+20%), +1 цель', apply: s => { s.range *= 1.2; s.pierce += 1; } },
      { text: 'Шире луч', apply: s => { s.extra *= 1.5; } },
      { text: 'Урон +30%', apply: s => { s.dmg *= 1.3; } },
      { text: 'Прожигает стены, урон +20%', apply: s => { s.extra2 = 1; s.dmg *= 1.2; s.pierce += 2; } },
    ],
  },
  vortex: {
    id: 'vortex', name: 'Вихревая пушка', role: 'стягивает и перемалывает',
    desc: 'Трофей Пылесоса-левиафана. Медленный смерч идёт вперёд, затягивает мелких врагов и перемалывает всех на пути.',
    dmgType: 'blade', main: false, tags: ['area', 'projectile'], targeting: 'cluster',
    base: S({ cd: 3.2, dmg: 9, range: 7, speed: 3.2, radius: 1.1, extra: 2.6 }),
    levels: [
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Смерч шире (+20%)', apply: s => { s.radius *= 1.2; } },
      { text: 'Перезарядка −15%', apply: s => { s.cd *= 0.85; } },
      { text: 'Сильнее тянет, урон +20%', apply: s => { s.extra *= 1.5; s.dmg *= 1.2; } },
      { text: 'Два смерча', apply: s => { s.count += 1; } },
    ],
  },
  cryo: {
    id: 'cryo', name: 'Криопушка', role: 'замедляет и замораживает',
    desc: 'Трофей Холодильника-крепости. Ледяные осколки замедляют врагов; третье попадание подряд замораживает, замёрзшие получают +30% урона.',
    dmgType: 'cold', main: true, tags: ['projectile'], targeting: 'nearest',
    base: S({ cd: 0.55, dmg: 12, range: 7.5, speed: 13, count: 2, spread: 10, extra: 1.2 }),
    levels: [
      { text: '+1 осколок', apply: s => { s.count += 1; s.spread += 6; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Заморозка дольше (+50%)', apply: s => { s.extra *= 1.5; } },
      { text: 'Перезарядка −15%', apply: s => { s.cd *= 0.85; } },
      { text: 'Осколки пробивают, урон +25%', apply: s => { s.pierce += 2; s.dmg *= 1.25; } },
    ],
  },
  autocannon: {
    id: 'autocannon', name: 'Автопушка', role: 'очереди по броне и авиации',
    desc: 'Трофей танка «Командарм». Очереди 30-мм снарядов: хорошо пробивают среднюю броню и сбивают авиацию.',
    dmgType: 'ap', main: true, tags: ['projectile', 'kinetic'], targeting: 'nearest',
    base: S({ cd: 1.0, dmg: 13, range: 9, speed: 18, count: 3, spread: 3, pierce: 1 }),
    levels: [
      { text: '+1 снаряд в очереди', apply: s => { s.count += 1; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Перезарядка −15%', apply: s => { s.cd *= 0.85; } },
      { text: '+2 снаряда, пробитие +1', apply: s => { s.count += 2; s.pierce += 1; } },
      { text: 'Бронебойно-разрывные: урон +30%', apply: s => { s.dmg *= 1.3; s.radius = 0.5; } },
    ],
  },
  saw: {
    id: 'saw', name: 'Дисковая пила', role: 'рикошеты, режет пехоту',
    desc: 'Трофей экскаватора «Крот». Пильные диски режут насквозь и отскакивают от цели к цели.',
    dmgType: 'blade', main: false, tags: ['projectile', 'kinetic'], targeting: 'nearest',
    base: S({ cd: 1.6, dmg: 16, range: 6.5, speed: 9, count: 1, pierce: 4 }),
    levels: [
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: '+1 диск', apply: s => { s.count += 1; } },
      { text: 'Пробитие +3', apply: s => { s.pierce += 3; } },
      { text: 'Перезарядка −15%, урон +15%', apply: s => { s.cd *= 0.85; s.dmg *= 1.15; } },
      { text: '+2 диска', apply: s => { s.count += 2; } },
    ],
  },
  bombs: {
    id: 'bombs', name: 'Кассетные бомбы', role: 'накрывает скопления',
    desc: 'Трофей Летающей крепости. Навесом бросает кассету, которая рассыпается бомбами над скоплением врагов.',
    dmgType: 'he', main: false, tags: ['explosive'], targeting: 'cluster',
    base: S({ cd: 3.6, dmg: 26, range: 10, count: 5, radius: 1.1 }),
    levels: [
      { text: '+2 бомбы', apply: s => { s.count += 2; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Радиус +15%, перезарядка −10%', apply: s => { s.radius *= 1.15; s.cd *= 0.9; } },
      { text: '+3 бомбы', apply: s => { s.count += 3; } },
      { text: 'Зажигательные, урон +20%', apply: s => { s.extra = 1; s.dmg *= 1.2; } },
    ],
  },
  railgun: {
    id: 'railgun', name: 'Рельсотрон', role: 'пробивает всё по линии',
    desc: 'Трофей линкора «Гроза». Редкий сверхскоростной выстрел пробивает всех врагов и стены по линии. Лучшее против тяжёлых.',
    dmgType: 'ap', main: true, tags: ['kinetic'], targeting: 'armored',
    base: S({ cd: 2.6, dmg: 95, range: 13, pierce: 99, extra: 0.2 }),
    levels: [
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Перезарядка −15%', apply: s => { s.cd *= 0.85; } },
      { text: 'Двойной выстрел', apply: s => { s.count += 1; } },
      { text: 'Урон +30%', apply: s => { s.dmg *= 1.3; } },
      { text: 'Луч шире, перезарядка −15%', apply: s => { s.extra *= 2.5; s.cd *= 0.85; } },
    ],
  },
  plasma: {
    id: 'plasma', name: 'Плазменная пушка', role: 'огромные взрывы',
    desc: 'Трофей Титана-мегаполиса. Медленный сгусток плазмы прожигает лёгких насквозь и взрывается широкой вспышкой.',
    dmgType: 'energy', main: true, tags: ['projectile', 'explosive'], targeting: 'cluster',
    base: S({ cd: 1.9, dmg: 48, range: 9, speed: 6.5, radius: 2.1, pierce: 2 }),
    levels: [
      { text: 'Радиус +15%', apply: s => { s.radius *= 1.15; } },
      { text: 'Урон +25%', apply: s => { s.dmg *= 1.25; } },
      { text: 'Перезарядка −15%', apply: s => { s.cd *= 0.85; } },
      { text: 'Второй сгусток', apply: s => { s.count += 1; } },
      { text: 'Урон +30%, радиус +10%', apply: s => { s.dmg *= 1.3; s.radius *= 1.1; } },
    ],
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
/** Трофейное оружие по ступени босса: открывается в мастерской (арсенал) победой над ним и сразу — в этом забеге. */
export const BOSS_WEAPON: Partial<Record<number, WeaponId>> = {
  0: 'blaster', 1: 'laser', 2: 'vortex', 3: 'cryo', 4: 'autocannon', 5: 'saw', 6: 'bombs', 7: 'railgun', 8: 'plasma',
};
export const TROPHY_WEAPONS = Object.values(BOSS_WEAPON) as WeaponId[];
export const MAX_WEAPON_LEVEL = 6;

export function weaponStatsAt(id: WeaponId, level: number): WeaponStats {
  const d = WEAPONS[id];
  const s = { ...d.base };
  for (let i = 0; i < Math.min(level - 1, d.levels.length); i++) d.levels[i].apply(s);
  return s;
}
