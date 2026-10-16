// Враги по ступеням масштаба. Размеры — в локальных единицах ступени
// (танк в начале ступени = 28, к боссу ≈ 100+).

import type { ArmorClass } from '../types';

export type Behavior = 'chase' | 'shooter' | 'charger' | 'kamikaze' | 'artillery' | 'air' | 'spawner' | 'swarm' | 'support' | 'boss';

export interface EnemyDef {
  id: string;
  name: string;
  stage: number;
  /** Базовый размер (длина), локальные ед. */
  size: number;
  /** Максимальный множитель размера при появлении («крупные экземпляры»). */
  maxMul: number;
  hp: number;
  dmg: number;
  /** Скорость, локальных ед./с (при базовом размере). */
  speed: number;
  armor: ArmorClass;
  armorPct?: number;
  behavior: Behavior;
  air?: boolean;
  xp: number;
  /** Радиус коллизии как доля размера. */
  radius?: number;
  fireCd?: number;
  /** Дальность стрельбы в собственных размерах. */
  range?: number;
  /** Скорость снаряда в собственных размерах/с. */
  shotSpeed?: number;
  shot?: string;
  burst?: number;
  /** Разброс выстрела (рад). */
  spreadShot?: number;
  /** Снарядов веером. */
  fan?: number;
  chargeSpeed?: number;
  spawn?: string;
  spawnCd?: number;
  spawnN?: number;
  /** Радиус взрыва камикадзе в размерах. */
  boom?: number;
  turn?: number;
  weight: number;
  /** С какой секунды ступени появляется. */
  minTime?: number;
  /** Спрайт. */
  art: string;
  /** Давит мелкие препятствия. */
  crusher?: boolean;
}

const E = (o: Omit<EnemyDef, 'weight'> & { weight?: number }): EnemyDef => ({ weight: 10, ...o });

export const ENEMIES: Record<string, EnemyDef> = {};
function add(...defs: EnemyDef[]) { for (const d of defs) ENEMIES[d.id] = d; }

// ---------------------------------------------------------------------------
// 1. Игрушечный полигон
// ---------------------------------------------------------------------------
add(
  E({ id: 'soldier', name: 'Пластиковый солдатик', stage: 0, art: 'soldier', size: 9, maxMul: 1.4, hp: 7, dmg: 2.4, speed: 24, armor: 'light', behavior: 'swarm', xp: 1, radius: 0.45, fireCd: 3.2, range: 14, shotSpeed: 14, shot: 'bullet', weight: 16 }),
  E({ id: 'toyTank', name: 'Игрушечный танк', stage: 0, art: 'toyTank', size: 24, maxMul: 3, hp: 38, dmg: 7, speed: 36, armor: 'medium', behavior: 'shooter', xp: 4, fireCd: 2.4, range: 6.5, shotSpeed: 7, shot: 'shell', weight: 12 }),
  E({ id: 'jeep', name: 'Игрушечный джип', stage: 0, art: 'jeep', size: 20, maxMul: 2.2, hp: 20, dmg: 9, speed: 82, armor: 'light', behavior: 'charger', xp: 3, chargeSpeed: 9, weight: 8, minTime: 25 }),
  E({ id: 'heli', name: 'Игрушечный вертолёт', stage: 0, art: 'heli', size: 26, maxMul: 2.6, hp: 24, dmg: 5, speed: 58, armor: 'air', behavior: 'air', air: true, xp: 4, fireCd: 1.6, burst: 3, range: 6, shotSpeed: 9, shot: 'bullet', weight: 6, minTime: 70 }),
  E({ id: 'armorToy', name: 'Броневой танк', stage: 0, art: 'armorToy', size: 34, maxMul: 3, hp: 150, dmg: 13, speed: 26, armor: 'heavy', armorPct: 0.15, behavior: 'shooter', xp: 10, fireCd: 3, range: 6, shotSpeed: 6.5, shot: 'shell', weight: 6, minTime: 100 }),
  E({ id: 'mortar', name: 'Игрушечный миномёт', stage: 0, art: 'mortar', size: 26, maxMul: 2.2, hp: 55, dmg: 16, speed: 20, armor: 'medium', behavior: 'artillery', xp: 7, fireCd: 4.2, range: 11, shot: 'mortar', boom: 1.6, weight: 4, minTime: 140 }),
  E({ id: 'bigToy', name: 'Танк на батарейках', stage: 0, art: 'bigToy', size: 62, maxMul: 1.8, hp: 520, dmg: 22, speed: 30, armor: 'heavy', armorPct: 0.2, behavior: 'shooter', xp: 32, fireCd: 2.6, burst: 2, range: 5.5, shotSpeed: 6, shot: 'shell', weight: 5, minTime: 200, crusher: true }),
  E({ id: 'toyBunker', name: 'Коробка-штаб', stage: 0, art: 'toyBunker', size: 70, maxMul: 1.6, hp: 700, dmg: 10, speed: 12, armor: 'structure', behavior: 'spawner', spawn: 'toyTank', spawnCd: 5, spawnN: 2, xp: 40, weight: 2, minTime: 240, fireCd: 2, range: 5, shotSpeed: 6, shot: 'shell' }),
);

// ---------------------------------------------------------------------------
// 2. Ковёр и детская
// ---------------------------------------------------------------------------
add(
  E({ id: 'windMouse', name: 'Заводная мышь', stage: 1, art: 'windMouse', size: 14, maxMul: 1.6, hp: 10, dmg: 4, speed: 64, armor: 'light', behavior: 'swarm', xp: 1.2, weight: 16 }),
  E({ id: 'top', name: 'Юла', stage: 1, art: 'top', size: 22, maxMul: 2.4, hp: 34, dmg: 10, speed: 40, armor: 'medium', behavior: 'charger', chargeSpeed: 11, xp: 4, weight: 10, radius: 0.48 }),
  E({ id: 'rcCar', name: 'Радиомашинка', stage: 1, art: 'rcCar', size: 24, maxMul: 2.4, hp: 22, dmg: 26, speed: 110, armor: 'light', behavior: 'kamikaze', boom: 1.3, xp: 3, weight: 8, minTime: 20 }),
  E({ id: 'toyRobot', name: 'Игрушечный робот', stage: 1, art: 'toyRobot', size: 30, maxMul: 3, hp: 70, dmg: 8, speed: 30, armor: 'medium', behavior: 'shooter', fireCd: 2.2, fan: 3, spreadShot: 0.25, range: 6.5, shotSpeed: 6, shot: 'laser', xp: 6, weight: 10 }),
  E({ id: 'plane', name: 'Бумажный самолётик', stage: 1, art: 'plane', size: 30, maxMul: 2.4, hp: 26, dmg: 14, speed: 120, armor: 'air', behavior: 'air', air: true, xp: 4, fireCd: 99, range: 4, weight: 6, minTime: 60 }),
  E({ id: 'blockGolem', name: 'Кубик-голем', stage: 1, art: 'blockGolem', size: 44, maxMul: 2.6, hp: 340, dmg: 20, speed: 24, armor: 'heavy', armorPct: 0.2, behavior: 'chase', xp: 18, weight: 6, minTime: 110, crusher: true }),
  E({ id: 'jackBox', name: 'Чёртик в коробке', stage: 1, art: 'jackBox', size: 40, maxMul: 2, hp: 260, dmg: 12, speed: 14, armor: 'structure', behavior: 'spawner', spawn: 'windMouse', spawnCd: 3.5, spawnN: 4, xp: 20, weight: 3, minTime: 150 }),
  E({ id: 'rcTank', name: 'Радиотанк', stage: 1, art: 'rcTank', size: 70, maxMul: 1.8, hp: 900, dmg: 26, speed: 34, armor: 'heavy', armorPct: 0.2, behavior: 'shooter', fireCd: 2.2, burst: 3, range: 5.5, shotSpeed: 6.5, shot: 'shell', xp: 40, weight: 5, minTime: 210, crusher: true }),
);

// ---------------------------------------------------------------------------
// 3. Комната
// ---------------------------------------------------------------------------
add(
  E({ id: 'dustBunny', name: 'Пылевой комок', stage: 2, art: 'dustBunny', size: 14, maxMul: 1.6, hp: 12, dmg: 4, speed: 48, armor: 'light', behavior: 'swarm', xp: 1, weight: 14 }),
  E({ id: 'quad', name: 'Квадрокоптер', stage: 2, art: 'quad', size: 26, maxMul: 2.6, hp: 30, dmg: 6, speed: 70, armor: 'air', behavior: 'air', air: true, fireCd: 1.4, burst: 2, range: 6, shotSpeed: 10, shot: 'bullet', xp: 4, weight: 8 }),
  E({ id: 'vacBot', name: 'Робот-пылесос', stage: 2, art: 'vacBot', size: 40, maxMul: 2.4, hp: 180, dmg: 16, speed: 42, armor: 'medium', behavior: 'chase', xp: 9, weight: 10, radius: 0.5, crusher: true }),
  E({ id: 'tinTank', name: 'Жестяной танк', stage: 2, art: 'tinTank', size: 32, maxMul: 3, hp: 110, dmg: 12, speed: 32, armor: 'heavy', armorPct: 0.15, behavior: 'shooter', fireCd: 2.4, range: 6, shotSpeed: 7, shot: 'shell', xp: 8, weight: 10 }),
  E({ id: 'deskLamp', name: 'Лампа-турель', stage: 2, art: 'deskLamp', size: 34, maxMul: 2.2, hp: 140, dmg: 14, speed: 14, armor: 'structure', behavior: 'shooter', fireCd: 3, range: 9, shotSpeed: 0, shot: 'beam', xp: 9, weight: 5, minTime: 60 }),
  E({ id: 'toyTrain', name: 'Заводной паровоз', stage: 2, art: 'toyTrain', size: 52, maxMul: 2, hp: 420, dmg: 30, speed: 90, armor: 'heavy', behavior: 'charger', chargeSpeed: 6, xp: 20, weight: 5, minTime: 120, crusher: true }),
  E({ id: 'bookMortar', name: 'Книжная катапульта', stage: 2, art: 'bookMortar', size: 40, maxMul: 2.2, hp: 200, dmg: 26, speed: 18, armor: 'structure', behavior: 'artillery', fireCd: 4, range: 9, shot: 'mortar', boom: 1.4, xp: 12, weight: 4, minTime: 150 }),
  E({ id: 'robotDog', name: 'Робопёс', stage: 2, art: 'robotDog', size: 64, maxMul: 1.8, hp: 1100, dmg: 30, speed: 60, armor: 'heavy', armorPct: 0.2, behavior: 'charger', chargeSpeed: 6, xp: 44, weight: 5, minTime: 210, crusher: true }),
);

// ---------------------------------------------------------------------------
// 4. Квартира / дом
// ---------------------------------------------------------------------------
add(
  E({ id: 'cockroachBot', name: 'Таракан-бот', stage: 3, art: 'cockroachBot', size: 14, maxMul: 1.5, hp: 12, dmg: 4, speed: 72, armor: 'light', behavior: 'swarm', xp: 1, weight: 14 }),
  E({ id: 'toasterMortar', name: 'Тостер-миномёт', stage: 3, art: 'toaster', size: 30, maxMul: 2.4, hp: 120, dmg: 22, speed: 22, armor: 'medium', behavior: 'artillery', fireCd: 3.6, range: 10, shot: 'toast', boom: 1.4, xp: 8, weight: 7 }),
  E({ id: 'secDrone', name: 'Дрон охраны', stage: 3, art: 'secDrone', size: 26, maxMul: 2.4, hp: 40, dmg: 8, speed: 76, armor: 'air', behavior: 'air', air: true, fireCd: 1.2, burst: 3, range: 6, shotSpeed: 11, shot: 'laser', xp: 5, weight: 8 }),
  E({ id: 'mixerBot', name: 'Миксер-бот', stage: 3, art: 'mixerBot', size: 34, maxMul: 2.6, hp: 150, dmg: 18, speed: 46, armor: 'medium', behavior: 'charger', chargeSpeed: 9, xp: 8, weight: 9 }),
  E({ id: 'kettleTank', name: 'Чайник-огнемёт', stage: 3, art: 'kettle', size: 38, maxMul: 2.4, hp: 260, dmg: 6, speed: 28, armor: 'heavy', armorPct: 0.15, behavior: 'shooter', fireCd: 0.25, range: 3, shotSpeed: 5, shot: 'steam', xp: 12, weight: 7, minTime: 50 }),
  E({ id: 'washer', name: 'Стиралка-таран', stage: 3, art: 'washer', size: 54, maxMul: 2, hp: 700, dmg: 34, speed: 30, armor: 'heavy', armorPct: 0.25, behavior: 'chase', xp: 30, weight: 5, minTime: 120, crusher: true }),
  E({ id: 'tvTurret', name: 'Телевизор-излучатель', stage: 3, art: 'tv', size: 48, maxMul: 2, hp: 500, dmg: 20, speed: 10, armor: 'structure', behavior: 'shooter', fireCd: 3.4, range: 10, shotSpeed: 0, shot: 'beam', xp: 22, weight: 4, minTime: 150 }),
  E({ id: 'vacGiant', name: 'Пылесос-громила', stage: 3, art: 'vacGiant', size: 70, maxMul: 1.8, hp: 1600, dmg: 36, speed: 34, armor: 'heavy', armorPct: 0.25, behavior: 'spawner', spawn: 'cockroachBot', spawnCd: 3, spawnN: 3, xp: 50, weight: 4, minTime: 210, crusher: true }),
);

// ---------------------------------------------------------------------------
// 5. Улицы и район
// ---------------------------------------------------------------------------
add(
  E({ id: 'infantry', name: 'Пехотинцы', stage: 4, art: 'infantry', size: 10, maxMul: 1.4, hp: 9, dmg: 3, speed: 26, armor: 'light', behavior: 'swarm', fireCd: 2.6, range: 12, shotSpeed: 16, shot: 'bullet', xp: 1, weight: 14 }),
  E({ id: 'apc', name: 'БТР', stage: 4, art: 'apc', size: 30, maxMul: 2.6, hp: 120, dmg: 8, speed: 52, armor: 'medium', behavior: 'shooter', fireCd: 0.9, burst: 3, range: 6, shotSpeed: 12, shot: 'bullet', xp: 6, weight: 10 }),
  E({ id: 'mbt', name: 'Танк', stage: 4, art: 'mbt', size: 34, maxMul: 3, hp: 240, dmg: 18, speed: 36, armor: 'heavy', armorPct: 0.2, behavior: 'shooter', fireCd: 2.6, range: 7, shotSpeed: 8, shot: 'shell', xp: 12, weight: 10 }),
  E({ id: 'attackHeli', name: 'Ударный вертолёт', stage: 4, art: 'attackHeli', size: 36, maxMul: 2.4, hp: 160, dmg: 14, speed: 64, armor: 'air', behavior: 'air', air: true, fireCd: 2.4, burst: 4, range: 8, shotSpeed: 9, shot: 'rocket', xp: 12, weight: 7, minTime: 40 }),
  E({ id: 'spg', name: 'САУ', stage: 4, art: 'spg', size: 38, maxMul: 2.2, hp: 260, dmg: 34, speed: 22, armor: 'medium', behavior: 'artillery', fireCd: 4.4, range: 12, shot: 'mortar', boom: 1.6, xp: 16, weight: 5, minTime: 90 }),
  E({ id: 'armoredCar', name: 'Бронеавтомобиль', stage: 4, art: 'armoredCar', size: 26, maxMul: 2.4, hp: 70, dmg: 22, speed: 120, armor: 'light', behavior: 'charger', chargeSpeed: 8, xp: 5, weight: 7, minTime: 30 }),
  E({ id: 'heavyTank', name: 'Тяжёлый танк', stage: 4, art: 'heavyTank', size: 54, maxMul: 2, hp: 1200, dmg: 32, speed: 28, armor: 'heavy', armorPct: 0.3, behavior: 'shooter', fireCd: 2.8, burst: 2, range: 7, shotSpeed: 8, shot: 'shell', xp: 40, weight: 5, minTime: 160, crusher: true }),
  E({ id: 'mlrs', name: 'Реактивная установка', stage: 4, art: 'mlrs', size: 60, maxMul: 1.8, hp: 900, dmg: 22, speed: 26, armor: 'medium', behavior: 'artillery', fireCd: 5, burst: 6, range: 12, shot: 'rocketLob', boom: 1.2, xp: 36, weight: 4, minTime: 210 }),
);

// ---------------------------------------------------------------------------
// 6. Мегаполис
// ---------------------------------------------------------------------------
add(
  E({ id: 'cars', name: 'Броневики', stage: 5, art: 'carsSwarm', size: 14, maxMul: 1.6, hp: 14, dmg: 5, speed: 60, armor: 'light', behavior: 'swarm', xp: 1, weight: 12 }),
  E({ id: 'walker', name: 'Шагоход', stage: 5, art: 'walker', size: 34, maxMul: 2.8, hp: 220, dmg: 10, speed: 30, armor: 'medium', behavior: 'shooter', fireCd: 1.6, burst: 2, fan: 2, spreadShot: 0.2, range: 7, shotSpeed: 9, shot: 'laser', xp: 10, weight: 10 }),
  E({ id: 'superTank', name: 'Сверхтяжёлый танк', stage: 5, art: 'superTank', size: 46, maxMul: 2.6, hp: 900, dmg: 30, speed: 26, armor: 'heavy', armorPct: 0.3, behavior: 'shooter', fireCd: 2.8, burst: 2, range: 7, shotSpeed: 8, shot: 'shell', xp: 30, weight: 8, crusher: true }),
  E({ id: 'gunship', name: 'Штурмовик', stage: 5, art: 'gunship', size: 40, maxMul: 2.4, hp: 300, dmg: 16, speed: 90, armor: 'air', behavior: 'air', air: true, fireCd: 2, burst: 5, range: 7, shotSpeed: 11, shot: 'bullet', xp: 14, weight: 7, minTime: 30 }),
  E({ id: 'armoredTrain', name: 'Бронепоезд', stage: 5, art: 'armoredTrain', size: 64, maxMul: 2, hp: 1600, dmg: 40, speed: 110, armor: 'heavy', armorPct: 0.25, behavior: 'charger', chargeSpeed: 5, xp: 40, weight: 4, minTime: 90, crusher: true }),
  E({ id: 'droneCarrier', name: 'Дронолёт', stage: 5, art: 'droneCarrier', size: 60, maxMul: 1.8, hp: 1200, dmg: 14, speed: 30, armor: 'air', behavior: 'spawner', air: true, spawn: 'kamikazeDrone', spawnCd: 3.5, spawnN: 3, xp: 40, weight: 4, minTime: 120 }),
  E({ id: 'kamikazeDrone', name: 'Дрон-камикадзе', stage: 5, art: 'kamikazeDrone', size: 16, maxMul: 1.8, hp: 20, dmg: 24, speed: 130, armor: 'air', behavior: 'kamikaze', air: true, boom: 1.4, xp: 1.5, weight: 6, minTime: 60 }),
  E({ id: 'mechTitan', name: 'Боевой мех', stage: 5, art: 'mechTitan', size: 74, maxMul: 1.7, hp: 2600, dmg: 34, speed: 30, armor: 'heavy', armorPct: 0.3, behavior: 'shooter', fireCd: 2.2, burst: 3, fan: 3, spreadShot: 0.22, range: 7, shotSpeed: 7, shot: 'plasma', xp: 70, weight: 4, minTime: 210, crusher: true }),
);

// ---------------------------------------------------------------------------
// 7. Танки размером с города
// ---------------------------------------------------------------------------
add(
  E({ id: 'cityBlock', name: 'Кварталы на гусеницах', stage: 6, art: 'cityBlock', size: 16, maxMul: 1.6, hp: 20, dmg: 6, speed: 40, armor: 'medium', behavior: 'swarm', xp: 1.2, weight: 12 }),
  E({ id: 'crawler', name: 'Краулер-титан', stage: 6, art: 'crawler', size: 36, maxMul: 2.8, hp: 420, dmg: 20, speed: 30, armor: 'heavy', armorPct: 0.25, behavior: 'shooter', fireCd: 2.4, burst: 2, range: 7, shotSpeed: 8, shot: 'shell', xp: 14, weight: 10, crusher: true }),
  E({ id: 'dropPod', name: 'Десантная капсула', stage: 6, art: 'dropPod', size: 28, maxMul: 2.4, hp: 160, dmg: 34, speed: 140, armor: 'medium', behavior: 'kamikaze', boom: 1.6, xp: 5, weight: 8 }),
  E({ id: 'stratoBomber', name: 'Стратобомбер', stage: 6, art: 'stratoBomber', size: 50, maxMul: 2.2, hp: 600, dmg: 28, speed: 100, armor: 'air', behavior: 'air', air: true, fireCd: 3, burst: 6, range: 5, shotSpeed: 3, shot: 'bomb', xp: 22, weight: 6, minTime: 40 }),
  E({ id: 'mobileFort', name: 'Мобильная крепость', stage: 6, art: 'mobileFort', size: 64, maxMul: 2, hp: 2400, dmg: 26, speed: 18, armor: 'structure', behavior: 'spawner', spawn: 'cityBlock', spawnCd: 3, spawnN: 3, fireCd: 2.2, range: 7, shotSpeed: 7, shot: 'shell', xp: 60, weight: 4, minTime: 100, crusher: true }),
  E({ id: 'siloMortar', name: 'Ракетная шахта', stage: 6, art: 'silo', size: 40, maxMul: 2.2, hp: 700, dmg: 40, speed: 0, armor: 'structure', behavior: 'artillery', fireCd: 4.5, range: 14, shot: 'icbm', boom: 2, xp: 24, weight: 4, minTime: 120 }),
  E({ id: 'megaWalker', name: 'Мегашагоход', stage: 6, art: 'megaWalker', size: 76, maxMul: 1.7, hp: 3600, dmg: 40, speed: 34, armor: 'heavy', armorPct: 0.3, behavior: 'shooter', fireCd: 2.4, burst: 3, fan: 3, spreadShot: 0.25, range: 7.5, shotSpeed: 7, shot: 'plasma', xp: 80, weight: 5, minTime: 200, crusher: true }),
);

// ---------------------------------------------------------------------------
// 8. Планета
// ---------------------------------------------------------------------------
add(
  E({ id: 'meteorite', name: 'Метеоритный рой', stage: 7, art: 'meteorite', size: 16, maxMul: 1.8, hp: 22, dmg: 7, speed: 70, armor: 'air', behavior: 'swarm', air: true, xp: 1.2, weight: 12 }),
  E({ id: 'contCrawler', name: 'Континентальный краулер', stage: 7, art: 'contCrawler', size: 40, maxMul: 2.6, hp: 600, dmg: 24, speed: 30, armor: 'heavy', armorPct: 0.3, behavior: 'shooter', fireCd: 2.2, burst: 3, range: 7, shotSpeed: 8, shot: 'plasma', xp: 16, weight: 10, crusher: true }),
  E({ id: 'orbitalSat', name: 'Боевой спутник', stage: 7, art: 'orbitalSat', size: 32, maxMul: 2.4, hp: 260, dmg: 14, speed: 80, armor: 'air', behavior: 'air', air: true, fireCd: 1.8, burst: 3, range: 8, shotSpeed: 12, shot: 'laser', xp: 10, weight: 8 }),
  E({ id: 'voidSpider', name: 'Пустотный паук', stage: 7, art: 'voidSpider', size: 34, maxMul: 2.6, hp: 300, dmg: 30, speed: 70, armor: 'medium', behavior: 'charger', chargeSpeed: 9, xp: 10, weight: 9 }),
  E({ id: 'lanceStation', name: 'Орбитальное копьё', stage: 7, art: 'lance', size: 44, maxMul: 2, hp: 900, dmg: 50, speed: 10, armor: 'structure', behavior: 'artillery', fireCd: 4.5, range: 15, shot: 'orbital', boom: 2.2, xp: 30, weight: 4, minTime: 60 }),
  E({ id: 'moonlet', name: 'Луна-крепость', stage: 7, art: 'moonlet', size: 70, maxMul: 1.8, hp: 4400, dmg: 36, speed: 22, armor: 'heavy', armorPct: 0.3, behavior: 'spawner', spawn: 'meteorite', spawnCd: 2.5, spawnN: 4, fireCd: 2, range: 8, shotSpeed: 7, shot: 'plasma', xp: 90, weight: 4, minTime: 120, crusher: true }),
  E({ id: 'starTitan', name: 'Звёздный титан', stage: 7, art: 'starTitan', size: 80, maxMul: 1.7, hp: 5200, dmg: 44, speed: 32, armor: 'heavy', armorPct: 0.35, behavior: 'shooter', fireCd: 2.2, burst: 4, fan: 3, spreadShot: 0.3, range: 8, shotSpeed: 8, shot: 'plasma', xp: 100, weight: 5, minTime: 200, crusher: true }),
);

export function rosterOf(stage: number): EnemyDef[] {
  return Object.values(ENEMIES).filter(e => e.stage === stage && e.behavior !== 'boss');
}
