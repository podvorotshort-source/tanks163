// Классы танков и способности.

import type { AbilityId, ClassId, WeaponId } from '../types';

export interface ClassDef {
  id: ClassId;
  name: string;
  desc: string;
  /** Скорость, длин танка в секунду. */
  speed: number;
  /** Базовая прочность. */
  hp: number;
  /** Доля снижения урона. */
  armor: number;
  main: WeaponId;
  ability: AbilityId;
  auxSlots: number;
  /** Порог давки (доля от размера танка). */
  crush: number;
  /** Скорость поворота корпуса, рад/с. */
  turn: number;
  /** Множитель дальности. */
  range: number;
  /** Шанс крита. */
  crit: number;
  perks: string[];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  scout: {
    id: 'scout', name: 'Разведчик',
    desc: 'Быстрый и манёвренный. Бьёт издалека и точно, уклоняется рывком.',
    speed: 3.5, hp: 80, armor: 0, main: 'ap', ability: 'dash', auxSlots: 3, crush: 0.42, turn: 11, range: 1.08, crit: 0.12,
    perks: ['Скорость +30%', 'Дальность +8%', 'Шанс крита 12%'],
  },
  assault: {
    id: 'assault', name: 'Штурмовик',
    desc: 'Универсал. Лишний слот для систем — лучший для комбинированных билдов. Залп отбрасывает толпу.',
    speed: 2.75, hp: 115, armor: 0.15, main: 'he', ability: 'volley', auxSlots: 4, crush: 0.45, turn: 8, range: 1, crit: 0.05,
    perks: ['4 слота доп. систем', 'Броня 15%', 'Сбалансирован'],
  },
  heavy: {
    id: 'heavy', name: 'Тяжёлый',
    desc: 'Медленная крепость. Держит позицию, давит крупных врагов, огнемёт и мины — его стихия.',
    speed: 2.1, hp: 180, armor: 0.32, main: 'flame', ability: 'fortress', auxSlots: 3, crush: 0.58, turn: 5.5, range: 1, crit: 0.05,
    perks: ['Броня 32%', 'Прочность +55%', 'Давит врагов до 58% своего размера'],
  },
};

export const CLASS_IDS: ClassId[] = ['scout', 'assault', 'heavy'];

export interface AbilityDef {
  id: AbilityId;
  name: string;
  desc: string;
  /** Перезарядка, с. */
  cd: number;
  /** Длительность эффекта, с (если есть). */
  dur: number;
  /** Только как классовая (не выпадает в улучшениях). */
  classOnly?: boolean;
  levels: string[];
  icon: string;
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  dash: {
    id: 'dash', name: 'Рывок', icon: 'dash', cd: 4.5, dur: 0.24, classOnly: true,
    desc: 'Мгновенный бросок вперёд. Во время рывка неуязвим и давит всех на пути.',
    levels: ['Перезарядка −20%', 'Второй заряд', 'Дальность рывка +30%', 'После рывка — ударная волна'],
  },
  volley: {
    id: 'volley', name: 'Залп', icon: 'volley', cd: 10, dur: 0, classOnly: true,
    desc: 'Фугасные снаряды во все стороны. Отбрасывает и разносит окружение.',
    levels: ['+6 снарядов', 'Урон +35%', 'Перезарядка −20%', 'Второе кольцо залпа'],
  },
  fortress: {
    id: 'fortress', name: 'Несокрушимость', icon: 'fortress', cd: 15, dur: 3, classOnly: true,
    desc: 'Броня на пределе: полная неуязвимость, тройной урон тараном, отталкивание врагов.',
    levels: ['Длительность +1 с', 'Перезарядка −20%', 'В конце — лечение 25%', 'Длительность +1 с, урон тарана ×1.5'],
  },
  smoke: {
    id: 'smoke', name: 'Дымовая завеса', icon: 'smoke', cd: 17, dur: 6,
    desc: 'Облако дыма: враги внутри теряют цель и мажут, игроки внутри получают вдвое меньше урона. Удобно спасать напарника.',
    levels: ['Радиус +25%', 'Длительность +2 с', 'Перезарядка −20%', 'Враги в дыму замедлены'],
  },
  repair: {
    id: 'repair', name: 'Полевой ремонт', icon: 'repair', cd: 24, dur: 3,
    desc: 'Восстанавливает 35% прочности за 3 с себе и напарнику поблизости.',
    levels: ['Лечение +10%', 'Перезарядка −20%', 'Радиус для напарника ×2', 'Броня +30% во время ремонта'],
  },
  airstrike: {
    id: 'airstrike', name: 'Артудар', icon: 'airstrike', cd: 14, dur: 1.6,
    desc: 'Вызывает огневой вал по самому плотному скоплению врагов.',
    levels: ['+4 снаряда', 'Урон +30%', 'Перезарядка −20%', 'Зажигательные снаряды'],
  },
  emp: {
    id: 'emp', name: 'ЭМИ-импульс', icon: 'emp', cd: 15, dur: 2.5,
    desc: 'Оглушает врагов вокруг и стирает вражеские снаряды. Двойной урон по авиации.',
    levels: ['Радиус +25%', 'Оглушение +1 с', 'Перезарядка −20%', 'Оглушённые получают +25% урона'],
  },
  shockwave: {
    id: 'shockwave', name: 'Ударная волна', icon: 'shockwave', cd: 9, dur: 0,
    desc: 'Кольцо давления: урон, сильный отброс и разрушение препятствий вокруг.',
    levels: ['Радиус +25%', 'Урон +40%', 'Перезарядка −20%', 'Оглушает на 1 с'],
  },
  minefield: {
    id: 'minefield', name: 'Минное поле', icon: 'minefield', cd: 13, dur: 0,
    desc: 'Мгновенно выставляет кольцо из 8 мин вокруг танка.',
    levels: ['+4 мины', 'Урон мин +30%', 'Перезарядка −20%', 'Два кольца'],
  },
  overdrive: {
    id: 'overdrive', name: 'Форсаж', icon: 'overdrive', cd: 20, dur: 5,
    desc: '5 с: скорость +50%, перезарядка всех систем −40%.',
    levels: ['Длительность +1.5 с', 'Перезарядка −20%', 'Неуязвимость первую секунду', 'Скорострельность ещё +15%'],
  },
  drone: {
    id: 'drone', name: 'Дрон-турель', icon: 'drone', cd: 21, dur: 12,
    desc: 'Выпускает боевой дрон, который 12 с кружит рядом и стреляет по врагам.',
    levels: ['Длительность +4 с', 'Урон дрона +40%', 'Второй дрон', 'Дрон стреляет ракетами'],
  },
  wall: {
    id: 'wall', name: 'Стальная стена', icon: 'wall', cd: 15, dur: 12,
    desc: 'Ставит дугу стальных блоков перед танком. Ваши снаряды проходят насквозь, вражеские — нет.',
    levels: ['Длиннее стена', 'Держится +6 с', 'Перезарядка −20%', 'Стена отражает снаряды'],
  },
  gravity: {
    id: 'gravity', name: 'Гравиловушка', icon: 'gravity', cd: 16, dur: 3,
    desc: 'Воронка стягивает врагов в одну точку, затем схлопывается взрывом.',
    levels: ['Радиус +25%', 'Урон взрыва +40%', 'Перезарядка −20%', 'Длительность +1.5 с'],
  },
};

export const ABILITY_IDS = Object.keys(ABILITIES) as AbilityId[];
export const MAX_ABILITY_LEVEL = 5;
export const ABILITY_SLOTS = 3;
