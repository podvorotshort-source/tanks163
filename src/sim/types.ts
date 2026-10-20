// Базовые типы и константы симуляции.

export type ArmorClass = 'light' | 'medium' | 'heavy' | 'air' | 'structure';
export type DmgType = 'mg' | 'ap' | 'he' | 'rocket' | 'fire' | 'mine' | 'tesla' | 'ram' | 'crush' | 'true' | 'energy' | 'cold' | 'blade';
export type WeaponId = 'ap' | 'he' | 'mg' | 'rockets' | 'flame' | 'mines' | 'tesla' | 'ram'
  // трофейные — открываются в мастерской победой над боссом
  | 'blaster' | 'laser' | 'vortex' | 'cryo' | 'autocannon' | 'saw' | 'bombs' | 'railgun' | 'plasma';
export type ClassId = 'scout' | 'assault' | 'heavy';
export type AbilityId =
  | 'dash' | 'volley' | 'fortress' | 'repair' | 'airstrike' | 'emp'
  | 'shockwave' | 'minefield' | 'overdrive' | 'drone' | 'wall' | 'gravity'
  // трофейные — за поглощение боссов
  | 'magma' | 'laserBeam' | 'tornado' | 'iceFront' | 'grad' | 'rotor' | 'carpetBomb' | 'mainBattery' | 'garrison';
export type PowerupId = 'star' | 'clock' | 'helmet' | 'grenade' | 'shovel' | 'tank' | 'repair';

/** Длина корпуса танка в начале ступени (локальные единицы). */
export const TANK_BASE = 28;
/** Физический размер танка на любой ступени (локальные ед.). В бою танк не растёт:
 *  растёт только сила (через «виртуальный» размер Sim.vsize), облик и размер меняются после поглощения босса. */
export const TANK_SIZE = 64;
/** Рост танка за ступень (и отношение единиц соседних ступеней). */
/** Кадр боя в пикселях (= единицах мира при боевом масштабе 1), эталон 16:9. Камера отдалена: два танка
 *  помещаются в один экран с запасом. */
export const VIEW_W = 960;
export const VIEW_H = 540;

export const STAGE_GROWTH = 4;
/** Показатель степени «силы» от абсолютного размера. */
export const POWER_EXP = 1.6;
export const STAGES = 10;
export const DT = 1 / 60;

/** Эффективность типа урона против класса брони. */
export const EFFECT: Record<DmgType, Record<ArmorClass, number>> = {
  mg: { light: 1.5, medium: 0.75, heavy: 0.45, air: 1.2, structure: 0.45 },
  ap: { light: 0.75, medium: 1.3, heavy: 1.6, air: 0.85, structure: 0.9 },
  he: { light: 1.2, medium: 0.95, heavy: 0.7, air: 0.7, structure: 1.6 },
  rocket: { light: 1.0, medium: 1.0, heavy: 0.9, air: 1.3, structure: 1.2 },
  fire: { light: 1.5, medium: 0.9, heavy: 0.6, air: 0.35, structure: 0.7 },
  mine: { light: 1.0, medium: 1.2, heavy: 1.1, air: 0, structure: 0.5 },
  tesla: { light: 1.0, medium: 1.0, heavy: 0.75, air: 1.5, structure: 0.6 },
  ram: { light: 1.2, medium: 1.0, heavy: 0.8, air: 0, structure: 1.5 },
  crush: { light: 1, medium: 1, heavy: 1, air: 0, structure: 1 },
  true: { light: 1, medium: 1, heavy: 1, air: 1, structure: 1 },
  energy: { light: 1.0, medium: 1.2, heavy: 1.0, air: 1.15, structure: 0.85 },
  cold: { light: 1.2, medium: 1.0, heavy: 0.85, air: 0.9, structure: 0.7 },
  blade: { light: 1.4, medium: 1.15, heavy: 0.6, air: 0.8, structure: 1.1 },
};

/** «Сила» по абсолютному размеру: (size/28)^1.6. */
export function powerOf(sizeAbs: number): number {
  return Math.pow(sizeAbs / TANK_BASE, POWER_EXP);
}

/** Абсолютная единица длины ступени n (в единицах ступени 0). */
export function stageUnit(n: number): number {
  return Math.pow(STAGE_GROWTH, n);
}

export interface Vec { x: number; y: number }

/** События симуляции для клиента (графика, звук) — и для тестов. */
export type SimEvent =
  | { t: 'shot'; w: WeaponId | 'enemy'; x: number; y: number; a: number; p: number; size: number; tier: number }
  | { t: 'boom'; x: number; y: number; r: number; kind: 'he' | 'rocket' | 'mine' | 'fire' | 'tesla' | 'enemy' | 'big' | 'boss' | 'plasma'; p: number }
  | { t: 'hit'; x: number; y: number; dmg: number; crit: boolean; armor: ArmorClass; w: DmgType; tgt: 'enemy' | 'player'; p: number }
  | { t: 'kill'; x: number; y: number; size: number; kind: string; by: number; xp: number; crushed: boolean; air: boolean }
  | { t: 'propBreak'; x: number; y: number; w: number; h: number; mat: string; kind: string }
  | { t: 'crush'; x: number; y: number; size: number }
  /** Танки игроков столкнулись (сила — скорость сближения в длинах танка/с). */
  | { t: 'bump'; x: number; y: number; force: number }
  | { t: 'arc'; pts: number[] }
  /** Конус (ледяной фронт). */
  | { t: 'cone'; x: number; y: number; a: number; half: number; r: number; kind: string }
  /** Луч (лазер, рельсотрон, трофейный лазер): от точки до точки, длительность показа. */
  | { t: 'beam'; x: number; y: number; x2: number; y2: number; w: string; p: number; dur: number; width: number }
  | { t: 'flame'; x: number; y: number; a: number; spread: number; range: number; p: number }
  | { t: 'mineDrop'; x: number; y: number }
  | { t: 'pickup'; id: PowerupId; x: number; y: number; p: number }
  | { t: 'levelup'; level: number }
  | { t: 'ability'; id: AbilityId; p: number; x: number; y: number }
  | { t: 'down'; p: number; x: number; y: number }
  | { t: 'revived'; p: number; x: number; y: number }
  | { t: 'respawn'; p: number; x: number; y: number }
  | { t: 'lifeLost'; p: number }
  | { t: 'out'; p: number }
  | { t: 'hurt'; p: number; dmg: number }
  | { t: 'bossSpawn'; name: string }
  | { t: 'bossPhase'; phase: number }
  | { t: 'bossDead'; x: number; y: number }
  | { t: 'warn'; text: string }
  | { t: 'event'; id: string; text: string }
  | { t: 'telegraph'; x: number; y: number; r: number; dur: number }
  | { t: 'stageStart'; stage: number }
  | { t: 'growth'; size: number }
  | { t: 'weaponGot'; p: number; w: WeaponId }
  | { t: 'abilityGot'; p: number; id: AbilityId }
  | { t: 'gameover' }
  | { t: 'victory' };
