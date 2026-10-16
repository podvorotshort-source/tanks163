// Центральная симуляция забега. Детерминирована (сид + входы), без DOM.

import { Rng } from '../core/rng';
import { clamp, dist2 } from '../core/math';
import {
  type SimEvent, type ClassId, type WeaponId, type AbilityId, type PowerupId,
  DT, TANK_BASE, STAGE_GROWTH, STAGES, powerOf, stageUnit,
} from './types';
import { Player, Enemy, Shot, Mine, Zone, Pickup, Drone, type WeaponInst } from './entities';
import { CLASSES, ABILITIES } from './content/classes';
import { STAGE_DEFS, type StageDef } from './content/stages';
import { PropWorld, MATS, makeProp, type Prop } from './props';
import { NavGrid } from './nav';
import { FireGrid } from './fire';
import { SpatialHash } from './spatial';
import { offerCards, computeWeaponStats, STAT_UPS, type Card, type UnlockCtx } from './upgrades';
import { WEAPONS } from './content/weapons';
import { updatePlayers } from './playerRun';
import { updateEnemies } from './enemyRun';
import { updateShots, updateMines, updateZones, updateDrones } from './shotsRun';
import { Director } from './director';
import { updatePickups } from './powerups';
import { burnTick } from './combat';

export interface PlayerCmd {
  mx: number;
  my: number;
  /** Нажатия способностей (фронт) по слотам. */
  a: [boolean, boolean, boolean];
}

export const NO_CMD: PlayerCmd = { mx: 0, my: 0, a: [false, false, false] };

export interface MetaBonus {
  lives: number;
  hp: number;
  dmg: number;
  speed: number;
  armor: number;
  xp: number;
  regen: number;
  luck: number;
  rerolls: number;
  banishes: number;
  cards: number;
  revive: number;
  crit: number;
  ability: number;
}

export const NO_META: MetaBonus = { lives: 0, hp: 0, dmg: 0, speed: 0, armor: 0, xp: 0, regen: 0, luck: 0, rerolls: 0, banishes: 0, cards: 0, revive: 0, crit: 0, ability: 0 };

export interface RunConfig {
  seed: number;
  players: { cls: ClassId; main?: WeaponId; aux?: WeaponId[] }[];
  meta?: MetaBonus;
  unlocks?: UnlockCtx;
  /** Уровень угрозы (0 — базовая сложность). */
  threat?: number;
  startStage?: number;
}

export type SimState = 'play' | 'levelup' | 'transition' | 'gameover' | 'victory';

export interface LevelUpState {
  offers: Card[][];
  done: boolean[];
  /** Сколько уровней ещё в очереди. */
  queue: number;
}

export interface TransitionState {
  t: number;
  /** Ступень, с которой уходим. */
  from: number;
  switched: boolean;
  /** Танк в момент перехода (старые координаты). */
  ox: number;
  oy: number;
}

const LEVELS_PER_STAGE = 12;
export const TRANSITION_TIME = 9;
export const TRANSITION_SWITCH = 3.4;

export class Sim {
  rng: Rng;
  cfg: RunConfig;
  meta: MetaBonus;
  unlocks: UnlockCtx;
  threat: number;
  tick = 0;
  /** Время забега, с. */
  time = 0;
  /** Время на текущей ступени, с. */
  stageTime = 0;
  stageIdx = 0;
  stage!: StageDef;
  state: SimState = 'play';
  players: Player[] = [];
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  mines: Mine[] = [];
  zones: Zone[] = [];
  pickups: Pickup[] = [];
  drones: Drone[] = [];
  props!: PropWorld;
  nav!: NavGrid;
  fire!: FireGrid;
  hash = new SpatialHash<Enemy>();
  events: SimEvent[] = [];
  director!: Director;
  levelUp: LevelUpState | null = null;
  transition: TransitionState | null = null;
  /** Опыт команды. */
  xp = 0;
  level = 1;
  /** Экспонента роста (абсолютный размер = 28·G^e). */
  growE = 0;
  /** Текущий размер танка, локальные ед. (сглаженный). */
  size = TANK_BASE;
  sizeTarget = TANK_BASE;
  starTier = 0;
  /** Каска: неуязвимость команды. */
  helmetT = 0;
  freezeT = 0;
  bossSlowT = 0;
  boss: Enemy | null = null;
  bossDefeated = false;
  /** Камера/видимая область (для спавна и удержания игроков). */
  viewX = 0;
  viewY = 0;
  /** Итоги. */
  kills = 0;
  bossesKilled = 0;
  scrapEarned = 0;
  maxStage = 0;
  private nextId = 1;
  private navT = 0;
  private propCompactT = 0;

  constructor(cfg: RunConfig) {
    this.cfg = cfg;
    this.rng = new Rng(cfg.seed);
    this.meta = cfg.meta ?? NO_META;
    this.unlocks = cfg.unlocks ?? { has: () => true };
    this.threat = cfg.threat ?? 0;
    const start = cfg.startStage ?? 0;
    this.growE = start;
    cfg.players.forEach((pc, i) => this.players.push(this.makePlayer(i as 0 | 1, pc.cls, pc.main, pc.aux ?? [])));
    this.setupStage(start, null);
  }

  // -------------------------------------------------------------------------
  // Инициализация
  // -------------------------------------------------------------------------

  private makePlayer(idx: 0 | 1, cls: ClassId, main?: WeaponId, aux: WeaponId[] = []): Player {
    const c = CLASSES[cls];
    const p = new Player(idx, c, cls);
    const m = this.meta;
    p.stats.maxHp += m.hp;
    p.stats.dmg += m.dmg;
    p.stats.speed += m.speed;
    p.stats.armor = Math.min(0.7, p.stats.armor + m.armor);
    p.stats.xp += m.xp;
    p.stats.regen += m.regen;
    p.stats.luck += m.luck;
    p.stats.crit += m.crit;
    p.stats.abilityCd *= 1 - m.ability;
    p.lives = 3 + m.lives;
    p.rerolls = 1 + m.rerolls;
    p.banishes = m.banishes;
    this.addWeapon(p, main ?? c.main, false);
    for (const w of aux) this.addWeapon(p, w, false);
    p.abilities.push({ id: c.ability, level: 1, t: 0, active: 0, charges: 1 });
    this.recalc(p);
    p.hp = p.maxHp;
    return p;
  }

  addWeapon(p: Player, id: WeaponId, emit = true): void {
    if (p.hasWeapon(id)) return;
    const w: WeaponInst = { id, level: 1, t: 0.4 + this.rng.next() * 0.4, n: 0, queue: 0, queueT: 0, dmgDealt: 0, kills: 0, s: WEAPONS[id].base };
    p.weapons.push(w);
    if (emit) this.emit({ t: 'weaponGot', p: p.idx, w: id });
    this.recalc(p);
  }

  /** Пересчёт производных параметров игрока. */
  recalc(p: Player): void {
    const pw = this.tankPower();
    const k = p.maxHp > 0 ? p.hp / p.maxHp : 1;
    p.maxHp = p.cls.hp * p.stats.maxHp * pw;
    p.hp = clamp(k * p.maxHp, 0, p.maxHp);
    p.weapons.forEach((w, i) => { w.s = computeWeaponStats(p, w.id, w.level, this.starTier, i === 0); });
    p.r = this.size * (p.classId === 'scout' ? 0.36 : p.classId === 'heavy' ? 0.47 : 0.42);
  }

  setupStage(n: number, carry: TransitionState | null): void {
    this.stageIdx = n;
    this.maxStage = Math.max(this.maxStage, n);
    this.stage = STAGE_DEFS[n];
    this.stageTime = 0;
    this.bossDefeated = false;
    this.boss = null;
    const s = this.stage;
    this.props = new PropWorld(32);
    const stageRng = new Rng((this.cfg.seed ^ (n * 7919)) >>> 0);
    for (const p of s.props(stageRng, s)) this.props.add(p);
    const navCell = 14;
    this.nav = new NavGrid(0, 0, s.w, s.h, navCell);
    this.nav.rebuildBlocked(this.props);
    this.fire = new FireGrid(0, 0, s.w, s.h, 16);
    this.fire.fillFuel(s.fuel);
    this.enemies = [];
    this.shots = [];
    this.mines = [];
    this.zones = [];
    this.pickups = [];
    this.drones = [];
    this.director = new Director(this);
    this.sizeTarget = TANK_BASE * Math.pow(STAGE_GROWTH, this.growE - n);
    this.size = this.sizeTarget;
    if (!carry) {
      // Старт забега: игроки в центре.
      this.players.forEach((p, i) => {
        p.x = p.px = s.w / 2 + (this.players.length > 1 ? (i ? 22 : -22) : 0);
        p.y = p.py = s.h / 2 + 30;
        p.angle = p.turret = -Math.PI / 2;
      });
    } else {
      // После перехода: координаты уже пересчитаны в transition.
    }
    for (const p of this.players) { p.revivesThisStage = 0; this.recalc(p); }
    const c = this.center();
    this.viewX = c.x; this.viewY = c.y;
    this.emit({ t: 'stageStart', stage: n });
  }

  // -------------------------------------------------------------------------
  // Вспомогательное
  // -------------------------------------------------------------------------

  emit(e: SimEvent): void {
    this.events.push(e);
  }

  newId(): number {
    return this.nextId++;
  }

  /** Абсолютный масштаб единицы текущей ступени. */
  get unit(): number {
    return stageUnit(this.stageIdx);
  }

  tankPower(): number {
    return powerOf(this.size * this.unit);
  }

  /** Множитель получаемого игроками урона от уровня угрозы. */
  threatTaken(): number {
    return 1 + 0.18 * this.threat;
  }

  /** Множитель урона игроков от уровня угрозы. */
  threatDealt(): number {
    return 1 / (1 + 0.22 * this.threat);
  }

  /** Половина видимой области (игровая, 16:9). */
  viewHalf(): [number, number] {
    const k = this.size / TANK_BASE;
    return [330 * k, 186 * k];
  }

  center(): { x: number; y: number } {
    let sx = 0, sy = 0, n = 0;
    for (const p of this.players) {
      if (p.state === 'out' || p.state === 'dead') continue;
      sx += p.x; sy += p.y; n++;
    }
    if (!n) for (const p of this.players) { sx += p.x; sy += p.y; n++; }
    return { x: sx / n, y: sy / n };
  }

  alivePlayers(): Player[] {
    return this.players.filter(p => p.state === 'alive');
  }

  nearestPlayer(x: number, y: number): Player | null {
    let best: Player | null = null, bd = Infinity;
    for (const p of this.players) {
      if (p.state !== 'alive') continue;
      const d = dist2(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /** Врагов в радиусе (через сетку). */
  enemiesNear(x: number, y: number, r: number, out: Enemy[]): Enemy[] {
    return this.hash.query(x, y, r, out);
  }

  addEnemy(e: Enemy): void {
    this.enemies.push(e);
  }

  makeShot(): Shot {
    const s = new Shot();
    this.shots.push(s);
    return s;
  }

  xpNeed(level = this.level): number {
    return Math.round(16 + level * 2.2 + Math.pow(level, 1.25) * 0.8);
  }

  /** Начислить опыт команде (мгновенно при убийстве). */
  gainXp(v: number): void {
    if (this.state !== 'play' && this.state !== 'levelup') return;
    let xm = 1;
    for (const p of this.players) xm = Math.max(xm, p.stats.xp);
    this.xp += v * xm;
    let gained = 0;
    while (this.xp >= this.xpNeed()) {
      this.xp -= this.xpNeed();
      this.level++;
      gained++;
      this.grow();
    }
    if (gained) this.queueLevelUps(gained);
  }

  private grow(): void {
    const cap = this.stageIdx + (this.bossDefeated ? 1 : 1.08);
    this.growE = Math.min(cap, this.growE + 1 / LEVELS_PER_STAGE);
    this.sizeTarget = TANK_BASE * Math.pow(STAGE_GROWTH, this.growE - this.stageIdx);
  }

  private queueLevelUps(n: number): void {
    if (this.levelUp) { this.levelUp.queue += n; return; }
    this.levelUp = { offers: [], done: [], queue: n - 1 };
    this.makeOffers();
    this.state = 'levelup';
    this.emit({ t: 'levelup', level: this.level });
  }

  private makeOffers(): void {
    const lu = this.levelUp!;
    lu.offers = this.players.map(p => offerCards(p, 3 + this.meta.cards, { rng: this.rng, unlocks: this.unlocks, level: this.level, starTier: this.starTier }));
    lu.done = this.players.map(() => false);
  }

  /** Выбор карты игроком. */
  choose(pi: number, ci: number): boolean {
    const lu = this.levelUp;
    if (!lu || lu.done[pi]) return false;
    const card = lu.offers[pi][ci];
    if (!card) return false;
    this.applyCard(this.players[pi], card);
    lu.done[pi] = true;
    if (lu.done.every(Boolean)) {
      if (lu.queue > 0) { lu.queue--; this.makeOffers(); this.emit({ t: 'levelup', level: this.level }); } else { this.levelUp = null; this.state = 'play'; }
    }
    return true;
  }

  reroll(pi: number): boolean {
    const lu = this.levelUp, p = this.players[pi];
    if (!lu || lu.done[pi] || p.rerolls <= 0) return false;
    p.rerolls--;
    lu.offers[pi] = offerCards(p, 3 + this.meta.cards, { rng: this.rng, unlocks: this.unlocks, level: this.level, starTier: this.starTier });
    return true;
  }

  banish(pi: number, ci: number): boolean {
    const lu = this.levelUp, p = this.players[pi];
    if (!lu || lu.done[pi] || p.banishes <= 0) return false;
    const c = lu.offers[pi][ci];
    if (!c || c.kind === 'fallback') return false;
    p.banishes--;
    p.banned.add(c.id.startsWith('s:') ? c.id : c.id);
    lu.offers[pi] = offerCards(p, 3 + this.meta.cards, { rng: this.rng, unlocks: this.unlocks, level: this.level, starTier: this.starTier });
    return true;
  }

  applyCard(p: Player, c: Card): void {
    const [kind, , rest] = c.id.split(':');
    if (c.id.startsWith('w:new:')) this.addWeapon(p, c.id.slice(6) as WeaponId);
    else if (c.id.startsWith('w:lvl:')) { const w = p.weapon(c.id.slice(6) as WeaponId); if (w) w.level++; }
    else if (kind === 's') {
      const up = STAT_UPS.find(s => s.id === c.id.slice(2));
      if (up) {
        up.apply(p, c.value);
        p.ranks.set(up.id, p.rank(up.id) + 1);
        if (up.id === 'hull') { this.recalc(p); p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25); }
      }
    } else if (kind === 'm' || kind === 'y') p.mods.add(c.id.slice(2));
    else if (c.id.startsWith('a:new:')) {
      const id = c.id.slice(6) as AbilityId;
      p.abilities.push({ id, level: 1, t: 0, active: 0, charges: 1 });
    } else if (c.id.startsWith('a:lvl:')) {
      const a = p.ability(c.id.slice(6) as AbilityId);
      if (a) a.level++;
    } else if (c.id === 'f:repair') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
    else if (c.id === 'f:scrap') this.scrapEarned += 40;
    else if (c.id === 'f:power') { p.stats.dmg += 0.04; p.stats.maxHp += 0.04; }
    void rest;
    this.recalc(p);
  }

  // -------------------------------------------------------------------------
  // Шаг
  // -------------------------------------------------------------------------

  step(cmds: PlayerCmd[]): void {
    this.events.length = 0;
    this.tick++;
    if (this.state === 'levelup' || this.state === 'gameover' || this.state === 'victory') return;
    if (this.state === 'transition') { this.stepTransition(); return; }
    const dt = DT;
    this.time += dt;
    this.stageTime += dt;
    // Плавный рост.
    if (Math.abs(this.size - this.sizeTarget) > 1e-4) {
      const prev = this.size;
      this.size += (this.sizeTarget - this.size) * Math.min(1, dt * 2.2);
      if (Math.abs(this.size - this.sizeTarget) < 0.01) this.size = this.sizeTarget;
      if (Math.floor(prev * 4) !== Math.floor(this.size * 4)) for (const p of this.players) this.recalc(p);
    }
    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.helmetT > 0) this.helmetT -= dt;
    if (this.bossSlowT > 0) this.bossSlowT -= dt;

    // Сетка врагов.
    this.hash.reset(Math.max(24, this.size * 1.2));
    for (const e of this.enemies) if (!e.dead) this.hash.insert(e);

    // Навигация — пересчёт раз в 0.4 с.
    this.navT -= dt;
    if (this.navT <= 0) {
      this.navT = 0.4;
      this.nav.rebuildBlocked(this.props);
      const src = this.players.filter(p => p.state === 'alive').map(p => ({ x: p.x, y: p.y }));
      const hq = this.director.hq;
      if (hq && !hq.dead) src.push({ x: hq.x, y: hq.y + hq.h * 0.6 }, { x: hq.x, y: hq.y - hq.h * 0.6 });
      this.nav.compute(src);
    }

    updatePlayers(this, cmds, dt);
    updateEnemies(this, dt);
    updateShots(this, dt);
    updateMines(this, dt);
    updateZones(this, dt);
    updateDrones(this, dt);
    this.fire.update(dt, this.rng, o => (o >= 0 && this.players[o] ? this.players[o].stats.fireSpread : 1));
    burnTick(this, dt);
    updatePickups(this, dt);
    this.director.update(dt);

    // Временные препятствия (стены лопаты/способности).
    for (const p of this.props.props) {
      if (p.ttl !== undefined && !p.dead) { p.ttl -= dt; if (p.ttl <= 0) { this.props.remove(p); this.emit({ t: 'propBreak', x: p.x, y: p.y, w: p.w, h: p.h, mat: p.mat, kind: p.kind }); } }
    }
    this.propCompactT -= dt;
    if (this.propCompactT <= 0) { this.propCompactT = 5; this.props.compact(); }

    // Уборка.
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
    if (this.shots.some(s => s.dead)) this.shots = this.shots.filter(s => !s.dead);
    if (this.mines.some(m => m.dead)) this.mines = this.mines.filter(m => !m.dead);
    if (this.zones.some(z => z.dead)) this.zones = this.zones.filter(z => !z.dead);
    if (this.pickups.some(p => p.dead)) this.pickups = this.pickups.filter(p => !p.dead);
    if (this.drones.some(d => d.dead)) this.drones = this.drones.filter(d => !d.dead);

    // Камера: плавно к центру игроков, в пределах арены.
    const c = this.center();
    const [hw, hh] = this.viewHalf();
    const s = this.stage;
    const tx = s.w > hw * 2 ? clamp(c.x, hw, s.w - hw) : s.w / 2;
    const ty = s.h > hh * 2 ? clamp(c.y, hh, s.h - hh) : s.h / 2;
    this.viewX += (tx - this.viewX) * Math.min(1, dt * 4);
    this.viewY += (ty - this.viewY) * Math.min(1, dt * 4);

    // Конец забега.
    if (this.players.every(p => p.state === 'out')) {
      this.state = 'gameover';
      this.emit({ t: 'gameover' });
    }
  }

  // -------------------------------------------------------------------------
  // Босс и переход между масштабами
  // -------------------------------------------------------------------------

  /** Побеждённые боссы этого забега (id). */
  defeated: string[] = [];
  abandoned = false;

  onBossKilled(b: Enemy): void {
    this.bossDefeated = true;
    this.bossesKilled++;
    this.defeated.push(this.stage.boss);
    this.boss = null;
    this.emit({ t: 'bossDead', x: b.x, y: b.y });
    // Рост танка при переходе не меняется: раскрывается мир, а не танк.
    if (this.stageIdx >= STAGES - 1) {
      this.state = 'victory';
      this.emit({ t: 'victory' });
      return;
    }
    // Все игроки возвращаются в строй (выбывшие — нет).
    for (const p of this.players) {
      if (p.state === 'down' || p.state === 'dead') { p.state = 'alive'; p.hp = p.maxHp * 0.5; p.invulnT = 3; }
    }
    this.transition = { t: 0, from: this.stageIdx, switched: false, ox: this.viewX, oy: this.viewY };
    this.state = 'transition';
  }

  private stepTransition(): void {
    const tr = this.transition!;
    tr.t += DT;
    // Мир замирает: враги гибнут волной, снаряды гаснут.
    if (tr.t < 1.2) {
      for (const e of this.enemies) if (!e.dead && this.rng.chance(0.06)) { e.dead = true; this.emit({ t: 'kill', x: e.x, y: e.y, size: e.size, kind: e.def.art, by: -1, xp: 0, crushed: false, air: e.air }); }
      for (const s of this.shots) s.dead = true;
      this.shots = [];
    }
    if (!tr.switched && tr.t >= TRANSITION_SWITCH) {
      tr.switched = true;
      const old = this.stage;
      const next = STAGE_DEFS[tr.from + 1];
      const G = STAGE_GROWTH;
      const map = (x: number, y: number): [number, number] => [next.relicX + (x - old.w / 2) / G, next.relicY + (y - old.h / 2) / G];
      for (const p of this.players) { [p.x, p.y] = map(p.x, p.y); p.px = p.x; p.py = p.y; }
      [this.viewX, this.viewY] = map(this.viewX, this.viewY);
      // Препятствия прежней арены переезжают в новый мир уменьшенными — их можно давить.
      const carry = this.props.props.filter(p => !p.dead && p.ttl === undefined && p.kind !== 'water' && p.kind !== 'hq' && !MATS[p.mat].solid);
      this.setupStage(tr.from + 1, tr);
      for (const p of carry) {
        const [x, y] = map(p.x, p.y);
        this.props.add(makeProp(p.kind, p.mat, x, y, p.w / G, p.h / G, p.hp, { round: p.round, v: p.v, a: p.a }));
      }
      this.nav.rebuildBlocked(this.props);
      for (const p of this.players) { p.px = p.x; p.py = p.y; }
      // Камера ровно над игроками.
    }
    if (tr.t >= TRANSITION_TIME) {
      this.transition = null;
      this.state = 'play';
      for (const p of this.players) if (p.state === 'alive') p.invulnT = Math.max(p.invulnT, 2);
    }
  }

  /** Отладка: перейти к ступени (через переход). */
  debugSkipStage(): void {
    if (this.state !== 'play') return;
    const fake = this.enemies[0] ?? null;
    this.growE = this.stageIdx + 1;
    this.sizeTarget = TANK_BASE * Math.pow(STAGE_GROWTH, this.growE - this.stageIdx);
    this.size = this.sizeTarget;
    if (fake) fake.dead = true;
    this.onBossKilled(fake ?? ({ x: this.viewX, y: this.viewY } as Enemy));
  }

  // -------------------------------------------------------------------------
  // Итоги
  // -------------------------------------------------------------------------

  /** Детали за забег (валюта мастерской). */
  scrapTotal(): number {
    const stageScore = this.maxStage * 60 + (this.state === 'victory' ? 300 : 0);
    const kills = Math.floor(this.kills * 0.12);
    const bosses = this.bossesKilled * 45;
    const time = Math.floor(this.time / 20);
    return Math.round((stageScore + kills + bosses + time + this.scrapEarned) * (1 + this.threat * 0.25));
  }

  get abilityDefs() {
    return ABILITIES;
  }

  /** Помощник для тестов: прогнать N шагов без ввода. */
  run(steps: number, cmds: PlayerCmd[] = []): void {
    for (let i = 0; i < steps; i++) this.step(cmds.length ? cmds : this.players.map(() => NO_CMD));
  }

  get propsList(): Prop[] {
    return this.props.props;
  }
}
