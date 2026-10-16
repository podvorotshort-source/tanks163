// Сущности симуляции.

import type { AbilityId, ArmorClass, ClassId, DmgType, PowerupId, WeaponId } from './types';
import type { ClassDef } from './content/classes';
import type { EnemyDef } from './content/enemies';
import type { WeaponStats } from './content/weapons';

export interface Stats {
  dmg: number;
  cd: number;
  projSpeed: number;
  range: number;
  blast: number;
  fireSpread: number;
  burn: number;
  duration: number;
  armor: number;
  maxHp: number;
  regen: number;
  speed: number;
  abilityCd: number;
  crit: number;
  critMult: number;
  luck: number;
  xp: number;
  crush: number;
  knock: number;
  chain: number;
}

export function baseStats(c: ClassDef): Stats {
  return {
    dmg: 1, cd: 1, projSpeed: 1, range: c.range, blast: 1, fireSpread: 1, burn: 1, duration: 1,
    armor: c.armor, maxHp: 1, regen: 0, speed: 1, abilityCd: 1, crit: c.crit, critMult: 2, luck: 0, xp: 1,
    crush: c.crush, knock: 1, chain: 0,
  };
}

export interface WeaponInst {
  id: WeaponId;
  level: number;
  t: number;
  /** Счётчик выстрелов (для «каждый N-й»). */
  n: number;
  /** Очередь отложенных выстрелов (двойной выстрел и т.п.). */
  queue: number;
  queueT: number;
  dmgDealt: number;
  kills: number;
  /** Кеш итоговых параметров (пересчитывается при изменениях). */
  s: WeaponStats;
}

export interface AbilityInst {
  id: AbilityId;
  level: number;
  t: number;
  /** Активна (длительность), с. */
  active: number;
  charges: number;
}

export type PlayerState = 'alive' | 'down' | 'dead' | 'out';

export class Player {
  x = 0; y = 0; px = 0; py = 0;
  vx = 0; vy = 0;
  angle = 0;
  turret = 0;
  r = 10;
  hp = 100;
  maxHp = 100;
  lives = 3;
  state: PlayerState = 'alive';
  /** Таймер ожидания спасения / возрождения. */
  downT = 0;
  reviveProg = 0;
  revivesThisStage = 0;
  respawnT = 0;
  invulnT = 0;
  hurtT = 0;
  weapons: WeaponInst[] = [];
  abilities: AbilityInst[] = [];
  stats: Stats;
  /** Ранги улучшений по id. */
  ranks = new Map<string, number>();
  mods = new Set<string>();
  /** Запрещённые (исключённые) улучшения. */
  banned = new Set<string>();
  rerolls = 1;
  banishes = 0;
  kills = 0;
  crushed = 0;
  damageDealt = 0;
  damageTaken = 0;
  revivesDone = 0;
  treadDist = 0;
  moving = false;
  slowT = 0;
  slowAmt = 0;
  /** Рывок. */
  dashT = 0;
  dashVx = 0; dashVy = 0;
  fortressT = 0;
  overdriveT = 0;
  repairT = 0;
  repairRate = 0;
  inSmoke = false;
  contactT = 0;
  seismicT = 0;
  /** Звёзды основного орудия (общие для команды, но храним у каждого). */
  _q = 0;

  constructor(readonly idx: 0 | 1, readonly cls: ClassDef, readonly classId: ClassId) {
    this.stats = baseStats(cls);
  }

  get alive(): boolean {
    return this.state === 'alive';
  }

  get main(): WeaponInst {
    return this.weapons[0];
  }

  hasWeapon(id: WeaponId): boolean {
    return this.weapons.some(w => w.id === id);
  }

  weapon(id: WeaponId): WeaponInst | undefined {
    return this.weapons.find(w => w.id === id);
  }

  hasAbility(id: AbilityId): boolean {
    return this.abilities.some(a => a.id === id);
  }

  ability(id: AbilityId): AbilityInst | undefined {
    return this.abilities.find(a => a.id === id);
  }

  rank(id: string): number {
    return this.ranks.get(id) ?? 0;
  }
}

export type EnemyState = 'move' | 'aim' | 'windup' | 'charge' | 'recover' | 'spawnIn' | 'flee';

export class Enemy {
  id: number;
  x = 0; y = 0; px = 0; py = 0;
  vx = 0; vy = 0;
  angle = 0;
  turret = 0;
  size: number;
  r: number;
  hp: number;
  maxHp: number;
  pw: number;
  dmg: number;
  speed: number;
  armor: ArmorClass;
  armorPct: number;
  air: boolean;
  elite = false;
  aura: '' | 'haste' | 'shield' | 'regen' = '';
  /** Несёт бонус (мигает). */
  bonus = false;
  state: EnemyState = 'spawnIn';
  t = 0;
  fireT = 0;
  burstLeft = 0;
  spawnT = 0;
  stunT = 0;
  slowT = 0;
  burnT = 0;
  burnDps = 0;
  burnOwner = -1;
  markT = 0;
  contactT = 0;
  flash = 0;
  dead = false;
  xp: number;
  /** Последний нанёсший урон игрок. */
  lastHit = -1;
  lastHitW: WeaponId | '' = '';
  /** Направление рывка/орбиты. */
  dx = 0; dy = 0;
  orbit = 1;
  /** Ведомый группой (стая). */
  frame = 0;
  hazeT = 0;
  shieldAura = 0;
  /** Множитель скорости от ауры. */
  hasteAura = 0;
  /** Поле для логики боссов. */
  brain: unknown = null;
  /** Номер оформления (вариант сборки спрайта). */
  look = 0;
  /** Невосприимчив к давке (боссы). */
  noCrush = false;
  /** Убит давкой. */
  crushedBy = -1;
  _q = 0;

  constructor(id: number, readonly def: EnemyDef, size: number, pw: number) {
    this.id = id;
    this.size = size;
    this.r = size * (def.radius ?? 0.42);
    this.pw = pw;
    this.maxHp = this.hp = def.hp * pw;
    this.dmg = def.dmg * pw;
    this.speed = def.speed * (size / def.size) ** 0.35;
    this.armor = def.armor;
    this.armorPct = def.armorPct ?? 0;
    this.air = !!def.air;
    this.xp = def.xp;
  }
}

export type ShotTeam = 0 | 1; // 0 — игроки, 1 — враги

export class Shot {
  x = 0; y = 0; px = 0; py = 0;
  vx = 0; vy = 0;
  team: ShotTeam = 0;
  owner = -1;
  w: WeaponId | string = '';
  dmg = 0;
  dmgType: DmgType = 'ap';
  r = 1;
  pierce = 0;
  life = 1;
  blast = 0;
  hits: number[] = [];
  homing = -1;
  turnRate = 0;
  accel = 0;
  maxSpeed = 0;
  bounce = 0;
  /** Навесной снаряд: цель и время полёта. */
  lob = false;
  lobT = 0;
  lobTotal = 0;
  tx = 0; ty = 0;
  sx = 0; sy = 0;
  /** Визуальный размер (в локальных ед.). */
  size = 2;
  tier = 0;
  crit = false;
  incendiary = false;
  cluster = 0;
  mark = false;
  shrapnel = false;
  dead = false;
  /** Поражает воздушные цели. */
  air = true;
  kind = '';
  _q = 0;
}

export class Mine {
  x = 0; y = 0;
  owner = 0;
  dmg = 0;
  blast = 0;
  trigger = 0;
  armT = 0.5;
  life = 60;
  dead = false;
  chain = false;
  jump = false;
  big = false;
  _q = 0;
  r = 0;
}

export type ZoneKind = 'smoke' | 'gravity' | 'tar' | 'freeze' | 'barrage' | 'hazard' | 'shock' | 'hqField';

export class Zone {
  x = 0; y = 0; r = 0;
  t = 0;
  dur = 1;
  kind: ZoneKind = 'smoke';
  owner = -1;
  team: ShotTeam = 0;
  dps = 0;
  power = 0;
  n = 0;
  dead = false;
  data: number[] = [];
}

export class Pickup {
  x = 0; y = 0;
  id: PowerupId = 'star';
  t = 0;
  life = 22;
  r = 8;
  dead = false;
}

export class Drone {
  x = 0; y = 0;
  owner = 0;
  t = 0;
  fireT = 0;
  rocketT = 0;
  a = 0;
  dead = false;
  rockets = false;
  dmg = 0;
}
