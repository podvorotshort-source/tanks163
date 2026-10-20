// Центральная симуляция забега. Детерминирована (сид + входы), без DOM.

import { Rng } from '../core/rng';
import { clamp, dist2 } from '../core/math';
import {
  type SimEvent, type ClassId, type WeaponId, type AbilityId, type PowerupId,
  DT, TANK_BASE, TANK_SIZE, STAGE_GROWTH, STAGES, powerOf, stageUnit,
} from './types';
import { Player, Enemy, Shot, Mine, Zone, Pickup, Drone, type WeaponInst } from './entities';
import { CLASSES, ABILITIES, BOSS_ABILITY } from './content/classes';
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
import { BOSSES } from './bosses';
import { updatePickups } from './powerups';
import { burnTick } from './combat';

export interface PlayerCmd {
  mx: number;
  my: number;
  /** Нажатия способностей (фронт) по слотам. */
  a: [boolean, boolean, boolean];
}

/**
 * Нарастание сложности по ступеням (поверх роста врагов в описаниях): к финалу враги ~×1.85 крепче
 * и ~×1.6 больнее. Это ровно то, что даёт полная мастерская (+60% прочности, +60% урона, −15% урона
 * по себе), — без прокачки поздние ступени — стена (решение пользователя: игра не проходится с первого раза).
 */
export const STAGE_HP_K = [1.05, 1.04, 1.12, 1.22, 1.34, 1.48, 1.64, 1.85];
export const STAGE_DMG_K = [1.12, 1.03, 1.08, 1.15, 1.24, 1.34, 1.46, 1.62];

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
  /** Побеждённый босс (старые координаты): к нему подъезжает танк и поглощает его. */
  bx: number;
  by: number;
  bsize: number;
  bangle: number;
  bart: string;
}

const LEVELS_PER_STAGE = 12;
/** Переход: взрывы босса → танк подъезжает к обломкам → поглощение → отъезд камеры (новый масштаб) → бой. */
export const TR_DRIVE0 = 0.9, TR_DRIVE1 = 2.8, TR_ABSORB1 = 4.4;
export const TRANSITION_SWITCH = 7.8;
export const TRANSITION_TIME = 9.4;

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
  /** Уровней получено на текущей ступени. */
  levelsThisStage = 0;
  /** Экспонента роста (абсолютный размер = 28·G^e). */
  growE = 0;
  /** Физический размер танка (постоянный). */
  size = TANK_SIZE;
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
    this.levelsThisStage = 0;
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
    const near: Prop[] = [];
    this.fire.blocked = (x, y) => {
      for (const p of this.props.queryRect(x, y, x, y, near)) {
        const m = MATS[p.mat];
        if (!m.move || m.canopy) continue;                          // кусты горят
        if (!p.round || (x - p.x) ** 2 + (y - p.y) ** 2 <= (p.w / 2) ** 2) return true;
      }
      return false;
    };
    this.enemies = [];
    this.shots = [];
    this.mines = [];
    this.zones = [];
    this.pickups = [];
    this.drones = [];
    this.director = new Director(this);
    if (!carry) {
      // Старт забега: игроки в центре.
      this.players.forEach((p, i) => {
        p.x = p.px = s.w / 2 + (this.players.length > 1 ? (i ? 1 : -1) * this.size * 0.6 : 0);
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

  /** «Виртуальный» размер для силы: растёт с уровнями 28 → 112 за ступень, как прежний рост танка. */
  get vsize(): number {
    return TANK_BASE * Math.pow(STAGE_GROWTH, this.growE - this.stageIdx);
  }

  /** Во сколько раз физические размеры врагов меньше «силовых» (враги подбираются по vsize, рисуются рядом с танком). */
  get compress(): number {
    return this.size / this.vsize;
  }

  tankPower(): number {
    return powerOf(this.vsize * this.unit);
  }

  /** Множитель получаемого игроками урона: угроза × нарастание по ступеням. */
  threatTaken(): number {
    return (1 + 0.18 * this.threat) * STAGE_DMG_K[Math.min(7, this.stageIdx)] * (1 + 0.15 * this.extraPlayers());
  }

  /** Сколько игроков в строю сверх первого (вдвоём враги крепче и больнее). */
  extraPlayers(): number {
    let n = 0;
    for (const p of this.players) if (p.state !== 'out') n++;
    return Math.max(0, n - 1);
  }

  /** Множитель урона игроков (враги «крепче»): угроза × нарастание по ступеням. */
  threatDealt(): number {
    return 1 / ((1 + 0.22 * this.threat) * STAGE_HP_K[Math.min(7, this.stageIdx)] * (1 + 0.25 * this.extraPlayers()));
  }

  /** Половина видимой области (игровая, 16:9). */
  viewHalf(): [number, number] {
    // Изометрическая камера (1 пиксель на единицу, 640×360): видимая область — повёрнутый прямоугольник ~±320×±360 ед.;
    // берём квадрат с той же диагональю (по ней — кольцо появления врагов).
    const r = 345 * (this.size / TANK_SIZE);
    return [r, r];
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

  /** Множитель кривой опыта (подбирается балансными прогонами). */
  static XP_K = 1.3;

  xpNeed(level = this.level): number {
    return Math.round((40 + 10 * level + 0.05 * level * level) * Sim.XP_K);
  }

  /** Начислить опыт команде (мгновенно при убийстве). */
  gainXp(v: number): void {
    if (this.state !== 'play' && this.state !== 'levelup' && this.state !== 'transition') return;
    let xm = 1;
    for (const p of this.players) xm = Math.max(xm, p.stats.xp);
    // Вдвоём врагов больше — опыт за каждого делится, темп уровней одинаковый.
    const pf = this.director ? this.director.playersFactor() : 1;
    // Убывающая отдача после ~13 уровней за ступень: темп роста ровный при любом билде.
    const excess = Math.max(0, this.levelsThisStage - 13);
    this.xp += (v * xm) / pf / (1 + excess * 0.3);
    let gained = 0;
    while (this.xp >= this.xpNeed()) {
      this.xp -= this.xpNeed();
      this.level++;
      this.levelsThisStage++;
      gained++;
      this.grow();
    }
    if (gained) this.queueLevelUps(gained);
  }

  private grow(): void {
    const cap = this.stageIdx + (this.bossDefeated ? 1 : 1.08);
    this.growE = Math.min(cap, this.growE + 1 / LEVELS_PER_STAGE);
    for (const p of this.players) this.recalc(p);
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
    } else if (kind === 'b') {
      // Трофей босса: заменить способность в слоте (или оставить как есть).
      const [, id, slot] = c.id.split(':');
      if (slot !== 'keep') p.abilities[+slot] = { id: id as AbilityId, level: 1, t: 0, active: 0, charges: 1 };
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
  /** Журнал урона по источникам (доли макс. прочности) — для балансных прогонов. */
  dmgLog: Map<string, number> | null = null;
  /** Урон по боссу по источникам (доли его прочности) — для балансных прогонов. */
  bossLog: Map<string, number> | null = null;

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
    const lead = this.nearestPlayer(b.x, b.y);
    this.transition = {
      t: 0, from: this.stageIdx, switched: false, ox: lead?.x ?? this.viewX, oy: lead?.y ?? this.viewY,
      bx: b.x, by: b.y, bsize: b.size ?? this.size * STAGE_GROWTH, bangle: b.angle ?? 0, bart: b.def?.art ?? '',
    };
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
    } else if (this.enemies.length) {
      for (const e of this.enemies) if (!e.dead) { e.dead = true; this.emit({ t: 'kill', x: e.x, y: e.y, size: e.size, kind: e.def.art, by: -1, xp: 0, crushed: false, air: e.air }); }
    }
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
    this.zones = [];
    // Танки подъезжают к обломкам босса и «въезжают» в них.
    if (tr.t >= TR_DRIVE0 && !tr.switched) {
      const alive = this.players.filter(p => p.state === 'alive');
      alive.forEach((p, i) => {
        const tx = tr.bx + (alive.length > 1 ? (i ? 1 : -1) * this.size * 0.6 : 0), ty = tr.by;
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        p.px = p.x; p.py = p.y;
        if (d > 1) {
          const sp = Math.max(d / Math.max(0.2, TR_DRIVE1 - tr.t), p.cls.speed * this.size * 0.8) * DT;
          const k = Math.min(1, sp / d);
          p.x += dx * k; p.y += dy * k;
          p.vx = (dx / d) * sp / DT; p.vy = (dy / d) * sp / DT;
          p.angle = Math.atan2(dy, dx); p.turret = p.angle;
        } else { p.vx = p.vy = 0; }
      });
      if (tr.t >= TR_DRIVE1) { tr.ox = tr.bx; tr.oy = tr.by; this.viewX = tr.bx; this.viewY = tr.by; }
    }
    if (!tr.switched && tr.t >= TRANSITION_SWITCH) {
      tr.switched = true;
      const old = this.stage;
      const next = STAGE_DEFS[tr.from + 1];
      const G = STAGE_GROWTH;
      const map = (x: number, y: number): [number, number] => [next.relicX + (x - old.w / 2) / G, next.relicY + (y - old.h / 2) / G];
      // Танки выросли вчетверо вместе с миром: точка босса переносится в реликвию, а их взаимное
      // расположение (в собственных размерах) сохраняется.
      const [mbx, mby] = map(tr.bx, tr.by);
      for (const p of this.players) { p.x = mbx + (p.x - tr.bx); p.y = mby + (p.y - tr.by); p.px = p.x; p.py = p.y; }
      [this.viewX, this.viewY] = map(this.viewX, this.viewY);
      // Препятствия прежней арены переезжают в новый мир уменьшенными — их можно давить.
      const carry = this.props.props.filter(p => !p.dead && p.ttl === undefined && p.kind !== 'water' && p.kind !== 'hq' && !MATS[p.mat].solid);
      this.setupStage(tr.from + 1, tr);
      for (const p of carry) {
        const [x, y] = map(p.x, p.y);
        // Под танками обломки не оставляем — танк стоит на месте поглощённого босса.
        if (this.players.some(q => Math.abs(q.x - x) < this.size * 0.9 + p.w / G / 2 && Math.abs(q.y - y) < this.size * 0.9 + p.h / G / 2)) continue;
        this.props.add(makeProp(p.kind, p.mat, x, y, p.w / G, p.h / G, p.hp, { round: p.round, v: p.v, a: p.a }));
      }
      this.nav.rebuildBlocked(this.props);
      for (const p of this.players) { p.px = p.x; p.py = p.y; p.vx = p.vy = 0; }
      this.grantBossAbility(tr.from);
    }
    if (tr.t >= TRANSITION_TIME) {
      this.transition = null;
      this.state = 'play';
      if (this.pendingTrophy) {
        const offers = this.pendingTrophy;
        this.pendingTrophy = null;
        this.levelUp = { offers, done: offers.map(o => !o.length), queue: 0 };
        this.state = 'levelup';
        this.emit({ t: 'levelup', level: this.level });
      }
      for (const p of this.players) if (p.state === 'alive') p.invulnT = Math.max(p.invulnT, 2);
    }
  }

  /** Трофей: способность поглощённого босса. Свободный слот — сразу; все заняты — выбор, что заменить. */
  private grantBossAbility(fromStage: number): void {
    const id = BOSS_ABILITY[fromStage];
    if (!id) return;
    const offers: Card[][] = [];
    let need = false;
    for (const p of this.players) {
      if (p.state === 'out') { offers.push([]); continue; }
      const own = p.ability(id);
      if (own) { own.level = Math.min(5, own.level + 1); offers.push([]); continue; }
      if (p.abilities.length < 3) {
        p.abilities.push({ id, level: 1, t: 0, active: 0, charges: 1 });
        this.emit({ t: 'abilityGot', p: p.idx, id });
        offers.push([]);
        continue;
      }
      need = true;
      offers.push(bossCards(p, id));
    }
    if (!need) return;
    this.pendingTrophy = offers;
  }

  /** Отложенный выбор трофея (показывается после перехода). */
  pendingTrophy: Card[][] | null = null;

  /** Отладка: перейти к ступени (через переход). */
  debugSkipStage(): void {
    if (this.state !== 'play') return;
    const fake = this.enemies[0] ?? null;
    this.growE = this.stageIdx + 1;
    for (const p of this.players) this.recalc(p);
    if (fake) fake.dead = true;
    const [x, y] = fake ? [fake.x, fake.y] : [this.viewX + 200, this.viewY];
    this.onBossKilled(({ x, y, size: this.size * STAGE_GROWTH, angle: Math.PI, def: { art: BOSSES[this.stage.boss]?.art ?? '' } } as unknown) as Enemy);
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

/** Карточки выбора трофейной способности, когда все слоты заняты. */
function bossCards(p: Player, id: AbilityId): Card[] {
  const d = ABILITIES[id];
  const cards: Card[] = p.abilities.map((a, i) => ({
    id: `b:${id}:${i}`, kind: 'ability', rarity: 3, title: d.name.toUpperCase(), icon: 'a_' + id, tag: 'Трофей босса', value: 0,
    text: `Заменит «${ABILITIES[a.id].name}». ${d.desc}`,
  }));
  cards.push({ id: `b:${id}:keep`, kind: 'fallback', rarity: 0, title: 'ОСТАВИТЬ КАК ЕСТЬ', icon: 'gear', tag: 'Трофей босса', value: 0, text: 'Не брать трофейную способность.' });
  return cards;
}
