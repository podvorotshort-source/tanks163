// Боссы ступеней. У каждого — фазы, набор атак, слабое место (угол
// относительно корпуса, где урон выше).

import type { Sim } from './sim';
import { Enemy, Zone, type Player } from './entities';
import type { EnemyDef } from './content/enemies';
import { powerOf, type ArmorClass } from './types';
import { rotateTowards, angleDiff } from '../core/math';
import { damagePlayer } from './combat';
import { moveGround, lobAt, beamZone, blastZone } from './enemyRun';
import { spawnEnemy } from './director';

export interface BossDef {
  id: string;
  name: string;
  subtitle: string;
  size: number;
  hp: number;
  dmg: number;
  speed: number;
  armor: ArmorClass;
  armorPct: number;
  air?: boolean;
  /** Слабое место: направление (рад, 0 — нос, PI — корма), полуширина дуги, множитель. */
  weak: { dir: number; arc: number; mult: number; name: string };
  art: string;
  minion: string;
}

/** Множитель прочности боссов (балансные прогоны). */
export const BOSS_HP_K = 1.85;
/** Урон боссов (бой длиннее обычной стычки — удары мягче). */
export const BOSS_DMG_K = 0.72;

export const BOSSES: Record<string, BossDef> = {
  windupGeneral: { id: 'windupGeneral', name: 'Заводной генерал', subtitle: 'Пружинный танк-игрушка. Слабое место — заводной ключ на корме', size: 280, hp: 1300, dmg: 16, speed: 34, armor: 'heavy', armorPct: 0.2, weak: { dir: Math.PI, arc: 0.9, mult: 2, name: 'ключ' }, art: 'bossGeneral', minion: 'soldier' },
  rcTyrant: { id: 'rcTyrant', name: 'Пульт-тиран', subtitle: 'Боевой робот на радиоуправлении. Слабое место — антенна на спине', size: 270, hp: 1350, dmg: 18, speed: 40, armor: 'heavy', armorPct: 0.2, weak: { dir: Math.PI, arc: 0.8, mult: 2, name: 'антенна' }, art: 'bossTyrant', minion: 'rcCar' },
  vacuumLeviathan: { id: 'vacuumLeviathan', name: 'Пылесос-левиафан', subtitle: 'Всасывает всё на своём пути. Слабое место — выхлоп сзади', size: 300, hp: 1400, dmg: 20, speed: 36, armor: 'heavy', armorPct: 0.25, weak: { dir: Math.PI, arc: 0.8, mult: 2, name: 'выхлоп' }, art: 'bossVacuum', minion: 'dustBunny' },
  fridgeFortress: { id: 'fridgeFortress', name: 'Холодильник-крепость', subtitle: 'Ледяная артиллерия и заморозка. Бейте в открытую дверцу', size: 290, hp: 1450, dmg: 20, speed: 26, armor: 'structure', armorPct: 0.25, weak: { dir: 0, arc: 0.7, mult: 1.8, name: 'дверца' }, art: 'bossFridge', minion: 'secDrone' },
  roadRoller: { id: 'roadRoller', name: 'Асфальтовый каток', subtitle: 'Раскатывает всё в блин и льёт смолу. Слабое место — мотор сзади', size: 310, hp: 1500, dmg: 24, speed: 40, armor: 'heavy', armorPct: 0.3, weak: { dir: Math.PI, arc: 0.8, mult: 2, name: 'мотор' }, art: 'bossRoller', minion: 'armoredCar' },
  skyFortress: { id: 'skyFortress', name: 'Летающая крепость', subtitle: 'Ковровые бомбардировки с небес. Слабое место — моторы на корме', size: 320, hp: 1450, dmg: 22, speed: 50, armor: 'air', armorPct: 0.15, air: true, weak: { dir: Math.PI, arc: 0.9, mult: 1.8, name: 'моторы' }, art: 'bossSky', minion: 'gunship' },
  cityTitan: { id: 'cityTitan', name: 'Титан-мегаполис', subtitle: 'Город на гусеницах. Слабое место — реактор в корме', size: 340, hp: 1550, dmg: 26, speed: 24, armor: 'heavy', armorPct: 0.3, weak: { dir: Math.PI, arc: 0.8, mult: 2, name: 'реактор' }, art: 'bossTitan', minion: 'crawler' },
  planetEater: { id: 'planetEater', name: 'Пожиратель планет', subtitle: 'Последний враг. Слабое место — ядро в пасти', size: 360, hp: 1800, dmg: 30, speed: 28, armor: 'heavy', armorPct: 0.3, weak: { dir: 0, arc: 0.6, mult: 1.8, name: 'ядро' }, art: 'bossEater', minion: 'voidSpider' },
};

interface Brain {
  def: BossDef;
  phase: number;
  t: number;
  atk: string;
  atkT: number;
  next: number;
  i: number;
  spin: number;
  dx: number;
  dy: number;
  entering: number;
}

function brain(e: Enemy): Brain {
  return e.brain as Brain;
}

export function spawnBoss(sim: Sim, id: string, x: number, y: number): Enemy | null {
  const def = BOSSES[id];
  if (!def) return null;
  const edef: EnemyDef = {
    id: 'boss_' + id, name: def.name, stage: sim.stageIdx, size: def.size, maxMul: 1, hp: def.hp, dmg: def.dmg * BOSS_DMG_K, speed: def.speed,
    armor: def.armor, armorPct: def.armorPct, behavior: 'boss', air: def.air, xp: 120, weight: 0, art: def.art, radius: 0.4, crusher: true,
  };
  const pw = powerOf(def.size * sim.unit);
  const e = new Enemy(sim.newId(), edef, def.size, pw);
  const n = sim.players.length;
  // Игрок копит улучшения от ступени к ступени — боссы крепнут так же, как обычные враги (~×1.55 за ступень).
  e.maxHp = e.hp = e.hp * BOSS_HP_K * Math.pow(1.55, sim.stageIdx) * (1 + 0.6 * (n - 1)) * (1 + 0.25 * sim.threat);
  e.x = e.px = x; e.y = e.py = y;
  e.noCrush = true;
  e.spawnT = 0;
  const p = sim.nearestPlayer(x, y);
  e.angle = e.turret = p ? Math.atan2(p.y - y, p.x - x) : 0;
  e.brain = { def, phase: 0, t: 0, atk: 'enter', atkT: 0, next: 0, i: 0, spin: 0, dx: 0, dy: 0, entering: 2.5 } as Brain;
  sim.addEnemy(e);
  sim.boss = e;
  sim.emit({ t: 'bossSpawn', name: def.name });
  return e;
}

/** Множитель урона по боссу от направления попадания. */
export function bossHitMult(sim: Sim, e: Enemy, fromX: number, fromY: number): number {
  if (e !== sim.boss || !e.brain) return 1;
  const b = brain(e);
  const rel = angleDiff(e.angle + b.def.weak.dir, Math.atan2(fromY - e.y, fromX - e.x));
  let m = Math.abs(rel) <= b.def.weak.arc ? b.def.weak.mult : 1;
  if (b.atk === 'stall') m *= 1.5;
  if (b.def.id === 'fridgeFortress' && b.atk !== 'door') m = Math.min(m, 1);
  return m;
}

// ---------------------------------------------------------------------------
// Общие атаки
// ---------------------------------------------------------------------------

function shot(sim: Sim, e: Enemy, a: number, kind: string, spK: number, dmgK = 1, rK = 0.11, blastK = 0, from = 0.45): void {
  const s = sim.makeShot();
  s.team = 1; s.owner = -1; s.w = kind; s.kind = kind;
  const L = e.size * from;
  s.x = s.px = e.x + Math.cos(a) * L; s.y = s.py = e.y + Math.sin(a) * L;
  const sp = sim.size * spK;
  s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
  s.dmg = e.dmg * dmgK;
  s.life = (sim.size * 16) / sp;
  s.r = sim.size * rK; s.size = sim.size * rK * 2.2;
  s.blast = blastK * sim.size;
}

function fan(sim: Sim, e: Enemy, tgt: Player, n: number, spread: number, kind: string, spK: number, dmgK = 1): void {
  const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
  for (let i = 0; i < n; i++) shot(sim, e, a + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), kind, spK, dmgK);
  sim.emit({ t: 'shot', w: 'enemy', x: e.x, y: e.y, a, p: -1, size: e.size, tier: sim.stageIdx });
}

function ring(sim: Sim, e: Enemy, n: number, kind: string, spK: number, off = 0, dmgK = 0.8): void {
  for (let i = 0; i < n; i++) shot(sim, e, off + (i / n) * Math.PI * 2, kind, spK, dmgK);
  sim.emit({ t: 'shot', w: 'enemy', x: e.x, y: e.y, a: off, p: -1, size: e.size, tier: sim.stageIdx });
}

function summon(sim: Sim, e: Enemy, id: string, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = sim.rng.range(0, Math.PI * 2);
    const m = Math.max(1, (sim.size * 0.5) / (spawnSize(id)));
    const s = spawnEnemy(sim, id, e.x + Math.cos(a) * e.r * 1.3, e.y + Math.sin(a) * e.r * 1.3, Math.min(3, m));
    if (s) s.spawnT = 0.3;
  }
}

function spawnSize(id: string): number {
  // Импорт ENEMIES здесь вызвал бы цикл — размер берём из уже созданного экземпляра через фабрику.
  const table: Record<string, number> = { soldier: 9, rcCar: 24, dustBunny: 14, secDrone: 26, armoredCar: 26, gunship: 40, crawler: 36, voidSpider: 34 };
  return table[id] ?? 20;
}

function chargeAt(sim: Sim, e: Enemy, b: Brain, tgt: Player): void {
  const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
  b.dx = Math.cos(a); b.dy = Math.sin(a);
  b.atk = 'windup'; b.atkT = 0.9;
  beamZone(sim, e.x, e.y, a, sim.size * 9, e.r * 0.9, 0, 0.9, -2);
}

function stepCharge(sim: Sim, e: Enemy, b: Brain, dt: number, spK: number, onEnd: () => void): void {
  b.atkT -= dt;
  const ox = e.x, oy = e.y;
  moveGround(sim, e, b.dx, b.dy, sim.size * spK, dt, 10);
  e.angle = Math.atan2(b.dy, b.dx);
  contactAll(sim, e, 1.6);
  const moved = Math.hypot(e.x - ox, e.y - oy);
  if (b.atkT <= 0 || moved < sim.size * spK * dt * 0.25) onEnd();
}

function contactAll(sim: Sim, e: Enemy, k: number): void {
  if (e.contactT > 0) return;
  for (const p of sim.players) {
    if (p.state !== 'alive') continue;
    const rr = e.r + p.r;
    if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < rr * rr) {
      damagePlayer(sim, p, e.dmg * k, 'boss:contact');
      // Отбросить игрока, чтобы не застревал.
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      p.x += (dx / d) * sim.size * 0.8; p.y += (dy / d) * sim.size * 0.8;
      e.contactT = 0.6;
    }
  }
}

function approach(sim: Sim, e: Enemy, tgt: Player, dt: number, keep: number, spdK = 1): void {
  const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
  const want = sim.size * keep;
  const dir = d > want ? 1 : d < want * 0.6 ? -0.6 : 0;
  moveGround(sim, e, (dx / d) * dir, (dy / d) * dir, e.speed * (sim.size / 100) * spdK, dt, 3);
  e.angle = rotateTowards(e.angle, Math.atan2(dy, dx), 0.9 * dt);
  e.turret = rotateTowards(e.turret, Math.atan2(dy, dx), 2 * dt);
  contactAll(sim, e, 1);
}

// ---------------------------------------------------------------------------
// Главный цикл босса
// ---------------------------------------------------------------------------

export function updateBoss(sim: Sim, e: Enemy, dt: number): void {
  const b = brain(e);
  if (sim.freezeT > 0 && sim.bossSlowT <= 0) { /* часы: боссы только замедляются */ }
  const slow = sim.bossSlowT > 0 ? 0.4 : 1;
  dt *= slow;
  if (e.stunT > 0) { e.stunT -= dt; return; }
  b.t += dt;
  const tgt = sim.nearestPlayer(e.x, e.y);
  if (!tgt) return;
  // Вход: подъезжает в кадр.
  if (b.entering > 0) {
    b.entering -= dt;
    approach(sim, e, tgt, dt, 5, 1.6);
    return;
  }
  const hpK = e.hp / e.maxHp;
  const phase = hpK > 0.66 ? 0 : hpK > 0.33 ? 1 : 2;
  if (phase !== b.phase) {
    b.phase = phase;
    sim.emit({ t: 'bossPhase', phase });
    summon(sim, e, b.def.minion, 4 + phase * 2);
  }
  switch (b.def.id) {
    case 'windupGeneral': general(sim, e, b, tgt, dt); break;
    case 'rcTyrant': tyrant(sim, e, b, tgt, dt); break;
    case 'vacuumLeviathan': vacuum(sim, e, b, tgt, dt); break;
    case 'fridgeFortress': fridge(sim, e, b, tgt, dt); break;
    case 'roadRoller': roller(sim, e, b, tgt, dt); break;
    case 'skyFortress': sky(sim, e, b, tgt, dt); break;
    case 'cityTitan': titan(sim, e, b, tgt, dt); break;
    case 'planetEater': eater(sim, e, b, tgt, dt); break;
  }
}

/** Выбор следующей атаки из списка (по кругу с перемешиванием). */
function nextAtk(sim: Sim, b: Brain, list: string[]): string {
  b.i++;
  return list[(b.i + sim.rng.int(0, list.length - 1)) % list.length];
}

// 1. Заводной генерал: залпы веером, пружинный рывок, пехота из люка, «завод кончился».
function general(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  switch (b.atk) {
    case 'windup':
      b.atkT -= dt; e.vx *= 0.8; e.vy *= 0.8;
      if (b.atkT <= 0) { b.atk = 'charge'; b.atkT = 1.1; }
      return;
    case 'charge':
      stepCharge(sim, e, b, dt, 7 + b.phase, () => { b.atk = b.phase >= 1 ? 'stall' : 'idle'; b.atkT = b.phase >= 1 ? 2 : 0; b.next = 1.2; });
      return;
    case 'stall':
      b.atkT -= dt; e.vx *= 0.9; e.vy *= 0.9;
      if (b.atkT <= 0) { b.atk = 'idle'; if (b.phase === 2) ring(sim, e, 14, 'shell', 4.5); }
      return;
  }
  approach(sim, e, tgt, dt, 4.5);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, b.phase === 0 ? ['fan', 'fan', 'summon'] : b.phase === 1 ? ['fan', 'charge', 'summon', 'fan'] : ['fan', 'charge', 'ring', 'charge']);
  switch (atk) {
    case 'fan': fan(sim, e, tgt, 5 + b.phase * 2, 0.9, 'shell', 5.5); b.next = 2.2 - b.phase * 0.3; break;
    case 'summon': summon(sim, e, 'soldier', 8); b.next = 2; break;
    case 'charge': chargeAt(sim, e, b, tgt); b.next = 0; break;
    case 'ring': ring(sim, e, 16, 'shell', 4.5, b.t); b.next = 2; break;
  }
}

// 2. Пульт-тиран: очереди дротиков, вращение с кольцом, прыжок с ударом, радиомашинки.
function tyrant(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  if (b.atk === 'spin') {
    b.atkT -= dt;
    b.spin += dt * 6;
    e.angle += dt * 6;
    if ((b.t * 10 | 0) % 2 === 0) shot(sim, e, b.spin, 'dart', 5, 0.6);
    if ((b.t * 10 | 0) % 2 === 0) shot(sim, e, b.spin + Math.PI, 'dart', 5, 0.6);
    if (b.atkT <= 0) { b.atk = 'idle'; b.next = 1.2; }
    return;
  }
  if (b.atk === 'burst') {
    b.atkT -= dt;
    if (b.atkT <= 0) { b.i++; b.atkT = 0.35; fan(sim, e, tgt, 3, 0.35, 'dart', 7, 0.7); if (b.i % 4 === 0) { b.atk = 'idle'; b.next = 1.4; } }
    approach(sim, e, tgt, dt, 5, 0.5);
    return;
  }
  approach(sim, e, tgt, dt, 5);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, b.phase === 0 ? ['burst', 'cars', 'stomp'] : ['burst', 'spin', 'stomp', 'cars']);
  switch (atk) {
    case 'burst': b.atk = 'burst'; b.atkT = 0; b.i = 0; break;
    case 'spin': b.atk = 'spin'; b.atkT = 2.4 + b.phase * 0.6; break;
    case 'cars': summon(sim, e, 'rcCar', 4 + b.phase * 2); b.next = 2.2; break;
    case 'stomp':
      for (const p of sim.alivePlayers()) blastZone(sim, p.x + p.vx * 0.6, p.y + p.vy * 0.6, sim.size * 1.7, e.dmg * 1.6, 1.2, e.id);
      b.next = 2.4;
      break;
  }
}

// 3. Пылесос: всасывание, дробь мусором, таран по прямой, пылевые комки.
function vacuum(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  if (b.atk === 'suck') {
    b.atkT -= dt;
    e.vx *= 0.9; e.vy *= 0.9;
    e.angle = rotateTowards(e.angle, Math.atan2(tgt.y - e.y, tgt.x - e.x), 0.8 * dt);
    for (const p of sim.alivePlayers()) {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      const inCone = Math.abs(angleDiff(e.angle, Math.atan2(-dy, -dx))) < 0.7;
      if (inCone && d < sim.size * 9) {
        const pull = sim.size * 2.4 * (1 - d / (sim.size * 9.5));
        p.x += (dx / d) * pull * dt; p.y += (dy / d) * pull * dt;
        if (d < e.r + p.r + sim.size * 0.3 && e.contactT <= 0) { damagePlayer(sim, p, e.dmg * 1.2, 'boss:suck'); e.contactT = 0.5; }
      }
    }
    if ((b.t * 6 | 0) % 3 === 0) {
      // Затягиваемый мусор — визуально, и он же летит обратно выстрелом.
    }
    if (b.atkT <= 0) { b.atk = 'idle'; b.next = 0.6; fan(sim, e, tgt, 9, 1.1, 'debris', 6, 0.7); }
    return;
  }
  if (b.atk === 'windup') { b.atkT -= dt; e.vx *= 0.8; e.vy *= 0.8; if (b.atkT <= 0) { b.atk = 'charge'; b.atkT = 1.4; } return; }
  if (b.atk === 'charge') { stepCharge(sim, e, b, dt, 8, () => { b.atk = 'idle'; b.next = 1.2; ring(sim, e, 10 + b.phase * 4, 'debris', 4); }); return; }
  approach(sim, e, tgt, dt, 4);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, ['suck', 'shotgun', 'charge', b.phase ? 'summon' : 'shotgun']);
  switch (atk) {
    case 'suck': b.atk = 'suck'; b.atkT = 2.6 + b.phase * 0.5; sim.emit({ t: 'warn', text: 'Всасывание!' }); break;
    case 'shotgun': fan(sim, e, tgt, 7 + b.phase * 2, 0.8, 'debris', 6.5, 0.8); b.next = 1.8; break;
    case 'charge': chargeAt(sim, e, b, tgt); break;
    case 'summon': summon(sim, e, 'dustBunny', 10); b.next = 1.5; break;
  }
}

function addZone(sim: Sim, kind: 'tar' | 'freeze', x: number, y: number, r: number, dur: number, dps: number): void {
  const z = new Zone();
  z.kind = kind; z.x = x; z.y = y; z.r = r; z.dur = dur; z.team = 1; z.dps = dps;
  sim.zones.push(z);
}

// 4. Холодильник: ледяная артиллерия, морозное дыхание, открытая дверца (уязвима), дроны.
function fridge(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  if (b.atk === 'door') {
    b.atkT -= dt;
    e.vx *= 0.9; e.vy *= 0.9;
    e.angle = rotateTowards(e.angle, Math.atan2(tgt.y - e.y, tgt.x - e.x), 0.6 * dt);
    if ((b.t * 4 | 0) !== ((b.t - dt) * 4 | 0)) fan(sim, e, tgt, 5, 0.9, 'ice', 5, 0.7);
    if (b.atkT <= 0) { b.atk = 'idle'; b.next = 1; summon(sim, e, 'secDrone', 2 + b.phase); }
    return;
  }
  approach(sim, e, tgt, dt, 6, 0.8);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, ['ice', 'breath', 'door', 'ice']);
  switch (atk) {
    case 'ice':
      for (let i = 0; i < 6 + b.phase * 3; i++) {
        const p = sim.alivePlayers()[i % Math.max(1, sim.alivePlayers().length)];
        if (p) lobAt(sim, e, p.x + sim.rng.range(-1, 1) * sim.size * 3, p.y + sim.rng.range(-1, 1) * sim.size * 3, 'ice', 0.9, 0.5);
      }
      b.next = 2.3;
      break;
    case 'breath': {
      const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
      for (let k = 1; k <= 4; k++) addZone(sim, 'freeze', e.x + Math.cos(a) * sim.size * 1.6 * k, e.y + Math.sin(a) * sim.size * 1.6 * k, sim.size * (0.8 + k * 0.25), 5, e.dmg * 0.3);
      fan(sim, e, tgt, 7, 0.6, 'ice', 4, 0.6);
      b.next = 2.4;
      break;
    }
    case 'door':
      b.atk = 'door'; b.atkT = 3;
      sim.emit({ t: 'warn', text: 'Дверца открыта — бейте в неё!' });
      break;
  }
}

// 5. Каток: раскатка по прямой со смолой, веера, бронемашины.
function roller(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  if (b.atk === 'windup') { b.atkT -= dt; e.vx *= 0.8; e.vy *= 0.8; if (b.atkT <= 0) { b.atk = 'charge'; b.atkT = 2; } return; }
  if (b.atk === 'charge') {
    if ((b.t * 5 | 0) !== ((b.t - dt) * 5 | 0)) addZone(sim, 'tar', e.x - b.dx * e.r, e.y - b.dy * e.r, sim.size * 1.1, 9, e.dmg * 0.15);
    stepCharge(sim, e, b, dt, 6.5 + b.phase, () => { b.atk = 'idle'; b.next = 1; fan(sim, e, tgt, 6, 1, 'shell', 5); });
    return;
  }
  approach(sim, e, tgt, dt, 5);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, ['charge', 'fan', 'cars', 'charge', 'mortar']);
  switch (atk) {
    case 'charge': chargeAt(sim, e, b, tgt); break;
    case 'fan': fan(sim, e, tgt, 7, 1.2, 'shell', 5.5); b.next = 1.8; break;
    case 'cars': summon(sim, e, 'armoredCar', 3 + b.phase); b.next = 1.6; break;
    case 'mortar': for (const p of sim.alivePlayers()) for (let i = 0; i < 3; i++) lobAt(sim, e, p.x + sim.rng.range(-1, 1) * sim.size * 2, p.y + sim.rng.range(-1, 1) * sim.size * 2, 'mortar', 1, 0.6); b.next = 2; break;
  }
}

// 6. Летающая крепость: заходы с бомбёжкой, зенитные кольца, штурмовики.
function sky(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  if (b.atk === 'run') {
    b.atkT -= dt;
    moveGround(sim, e, b.dx, b.dy, sim.size * 4.5, dt, 2);
    e.angle = rotateTowards(e.angle, Math.atan2(b.dy, b.dx), 2 * dt);
    if ((b.t * 5 | 0) !== ((b.t - dt) * 5 | 0)) blastZone(sim, e.x + sim.rng.range(-1, 1) * e.r * 0.5, e.y + sim.rng.range(-1, 1) * e.r * 0.5, sim.size * 1.3, e.dmg * 1.3, 1.1, e.id);
    if (b.atkT <= 0) { b.atk = 'idle'; b.next = 1; }
    return;
  }
  // Кружит над игроком.
  const R = sim.size * 5;
  const ang = Math.atan2(e.y - tgt.y, e.x - tgt.x) + 0.4;
  const ox = tgt.x + Math.cos(ang) * R, oy = tgt.y + Math.sin(ang) * R;
  const dx = ox - e.x, dy = oy - e.y, d = Math.hypot(dx, dy) || 1;
  moveGround(sim, e, dx / d, dy / d, sim.size * 2.4, dt, 1.5);
  e.angle = rotateTowards(e.angle, Math.atan2(e.vy, e.vx), 1.5 * dt);
  contactAll(sim, e, 0.8);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, ['run', 'flak', 'gunships', 'run']);
  switch (atk) {
    case 'run': {
      const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
      b.dx = Math.cos(a); b.dy = Math.sin(a); b.atk = 'run'; b.atkT = 2.6;
      sim.emit({ t: 'warn', text: 'Бомбардировка!' });
      break;
    }
    case 'flak': ring(sim, e, 18 + b.phase * 6, 'bullet', 4.2, b.t); b.next = 1.6; break;
    case 'gunships': summon(sim, e, 'gunship', 2 + b.phase); b.next = 2; break;
  }
}

// 7. Титан-мегаполис: батареи с бортов, ракетный дождь, лучи, краулеры.
function titan(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  approach(sim, e, tgt, dt, 6, 0.7);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, ['broadside', 'rain', 'beams', 'crawlers', 'broadside']);
  switch (atk) {
    case 'broadside':
      for (const side of [-1, 1]) {
        const a = e.angle + side * Math.PI / 2;
        for (let i = 0; i < 5 + b.phase; i++) shot(sim, e, a + (i - 2.5) * 0.18, 'shell', 4.8, 0.9);
      }
      fan(sim, e, tgt, 5, 0.5, 'plasma', 5.5);
      b.next = 2;
      break;
    case 'rain':
      for (let i = 0; i < 10 + b.phase * 4; i++) {
        const p = sim.alivePlayers()[i % Math.max(1, sim.alivePlayers().length)];
        if (p) lobAt(sim, e, p.x + sim.rng.range(-1, 1) * sim.size * 4, p.y + sim.rng.range(-1, 1) * sim.size * 4, 'rocketLob', 0.9, 0.4);
      }
      b.next = 2.6;
      break;
    case 'beams':
      for (let i = 0; i < 3 + b.phase; i++) {
        const a = Math.atan2(tgt.y - e.y, tgt.x - e.x) + (i - 1) * 0.5;
        beamZone(sim, e.x, e.y, a, sim.size * 12, sim.size * 0.4, e.dmg * 1.5, 1.1 + i * 0.25, e.id);
      }
      b.next = 2.2;
      break;
    case 'crawlers': summon(sim, e, 'crawler', 3 + b.phase); b.next = 1.8; break;
  }
}

// 8. Пожиратель планет: вращающиеся лучи, метеоритный дождь, гравитация, рывок пастью.
function eater(sim: Sim, e: Enemy, b: Brain, tgt: Player, dt: number): void {
  if (b.atk === 'gravity') {
    b.atkT -= dt;
    for (const p of sim.alivePlayers()) {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      p.x += (dx / d) * sim.size * 1.6 * dt; p.y += (dy / d) * sim.size * 1.6 * dt;
    }
    if ((b.t * 3 | 0) !== ((b.t - dt) * 3 | 0)) ring(sim, e, 12, 'plasma', 3.5, b.t * 0.7);
    contactAll(sim, e, 1.4);
    if (b.atkT <= 0) { b.atk = 'idle'; b.next = 1.2; }
    return;
  }
  if (b.atk === 'windup') { b.atkT -= dt; e.vx *= 0.8; e.vy *= 0.8; if (b.atkT <= 0) { b.atk = 'charge'; b.atkT = 1.2; } return; }
  if (b.atk === 'charge') { stepCharge(sim, e, b, dt, 8, () => { b.atk = 'stall'; b.atkT = 1.5; }); return; }
  if (b.atk === 'stall') { b.atkT -= dt; if (b.atkT <= 0) { b.atk = 'idle'; b.next = 0.6; } return; }
  approach(sim, e, tgt, dt, 6, 0.8);
  b.next -= dt;
  if (b.next > 0) return;
  const atk = nextAtk(sim, b, b.phase < 2 ? ['beams', 'meteors', 'charge', 'summon'] : ['beams', 'meteors', 'gravity', 'charge']);
  switch (atk) {
    case 'beams': {
      const base = sim.rng.range(0, Math.PI * 2);
      const n = 6 + b.phase * 2;
      for (let i = 0; i < n; i++) beamZone(sim, e.x, e.y, base + (i / n) * Math.PI * 2, sim.size * 14, sim.size * 0.35, e.dmg * 1.5, 1.2, e.id);
      b.next = 2.2;
      break;
    }
    case 'meteors':
      for (let i = 0; i < 12 + b.phase * 5; i++) {
        const p = sim.alivePlayers()[i % Math.max(1, sim.alivePlayers().length)];
        if (p) blastZone(sim, p.x + sim.rng.range(-1, 1) * sim.size * 5, p.y + sim.rng.range(-1, 1) * sim.size * 4, sim.size * 1.2, e.dmg * 1.2, 0.9 + i * 0.12, e.id);
      }
      b.next = 2.5;
      break;
    case 'gravity': b.atk = 'gravity'; b.atkT = 3; sim.emit({ t: 'warn', text: 'Гравитационный колодец!' }); break;
    case 'charge': chargeAt(sim, e, b, tgt); break;
    case 'summon': summon(sim, e, 'voidSpider', 3 + b.phase); b.next = 1.6; break;
  }
}
