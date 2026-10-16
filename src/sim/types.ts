// Базовые типы и константы симуляции.

export type ArmorClass = 'light' | 'medium' | 'heavy' | 'air' | 'structure';
export type DmgType = 'mg' | 'ap' | 'he' | 'rocket' | 'fire' | 'mine' | 'tesla' | 'ram' | 'crush' | 'true';
export type WeaponId = 'ap' | 'he' | 'mg' | 'rockets' | 'flame' | 'mines' | 'tesla' | 'ram';
export type ClassId = 'scout' | 'assault' | 'heavy';
export type AbilityId =
  | 'dash' | 'volley' | 'fortress' | 'smoke' | 'repair' | 'airstrike' | 'emp'
  | 'shockwave' | 'minefield' | 'overdrive' | 'drone' | 'wall' | 'gravity';
export type PowerupId = 'star' | 'clock' | 'helmet' | 'grenade' | 'shovel' | 'tank' | 'repair';

/** Длина корпуса танка в начале ступени (локальные единицы). */
export const TANK_BASE = 28;
/** Рост танка за ступень (и отношение единиц соседних ступеней). */
export const STAGE_GROWTH = 4;
/** Показатель степени «силы» от абсолютного размера. */
export const POWER_EXP = 1.6;
export const STAGES = 8;
export const DT = 1 / 60;

/** Эффективность типа урона против класса брони. */
export const EFFECT: Record<DmgType, Record<ArmorClass, number>> = {
  mg: { light: 1.5, medium: 0.6, heavy: 0.25, air: 1.2, structure: 0.3 },
  ap: { light: 0.7, medium: 1.3, heavy: 1.7, air: 0.8, structure: 0.8 },
  he: { light: 1.2, medium: 0.9, heavy: 0.5, air: 0.6, structure: 1.8 },
  rocket: { light: 1.0, medium: 1.0, heavy: 0.9, air: 1.3, structure: 1.2 },
  fire: { light: 1.5, medium: 0.8, heavy: 0.4, air: 0.3, structure: 0.6 },
  mine: { light: 1.0, medium: 1.2, heavy: 1.1, air: 0, structure: 0.5 },
  tesla: { light: 1.0, medium: 1.0, heavy: 0.6, air: 1.5, structure: 0.4 },
  ram: { light: 1.2, medium: 1.0, heavy: 0.8, air: 0, structure: 1.5 },
  crush: { light: 1, medium: 1, heavy: 1, air: 0, structure: 1 },
  true: { light: 1, medium: 1, heavy: 1, air: 1, structure: 1 },
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
  | { t: 'arc'; pts: number[] }
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
  | { t: 'gameover' }
  | { t: 'victory' };
