// Режиссёр ступени: волны, элиты, события, мини-босс и босс.

import type { Sim } from './sim';
import { Enemy, Zone } from './entities';
import { ENEMIES, rosterOf, type EnemyDef } from './content/enemies';
import { powerOf, TANK_BASE } from './types';
import { MATS, makeProp } from './props';
import { spawnBoss, BOSSES } from './bosses';
import { dropPowerup } from './powerups';
import { blastZone } from './enemyRun';

const EVENT_TEXT: Record<string, string> = {
  eliteSquad: 'Элитный отряд!',
  supply: 'Сброс снабжения!',
  barrage: 'Артобстрел! Следите за кругами',
  convoy: 'Конвой с припасами!',
  swarm: 'Рой мелочи!',
  hq: 'Оборона штаба! Не дайте разрушить',
  marbles: 'Шарики катятся!',
};

export function spawnEnemy(sim: Sim, id: string, x: number, y: number, mul: number, o: { elite?: boolean; bonus?: boolean } = {}): Enemy | null {
  const def = ENEMIES[id];
  if (!def) return null;
  let size = def.size * mul;
  if (o.elite) size *= 1.35;
  const pw = powerOf(size * sim.unit);
  const e = new Enemy(sim.newId(), def, size, pw);
  e.x = e.px = x; e.y = e.py = y;
  const p = sim.nearestPlayer(x, y);
  e.angle = e.turret = p ? Math.atan2(p.y - y, p.x - x) : 0;
  e.spawnT = 0.45;
  e.fireT = sim.rng.range(0.6, def.fireCd ?? 2);
  e.t = sim.rng.range(1, def.spawnCd ?? 3);
  e.orbit = sim.rng.chance(0.5) ? 1 : -1;
  e.look = sim.rng.int(0, 3);
  if (o.elite) {
    e.elite = true;
    e.maxHp = e.hp = e.hp * 5;
    e.dmg *= 1.4;
    e.aura = sim.rng.pick(['haste', 'shield', 'regen'] as const);
  }
  if (o.bonus) { e.bonus = true; e.maxHp = e.hp = e.hp * 1.5; }
  sim.addEnemy(e);
  return e;
}

interface Scheduled { at: number; id: string; done: boolean }

export class Director {
  private acc = 0;
  private nextBonus: number;
  private nextElite: number;
  private schedule: Scheduled[] = [];
  private miniBoss = false;
  private bossWarned = false;
  bossSpawned = false;
  /** Активное событие (для интерфейса). */
  event: { id: string; text: string; t: number; dur: number } | null = null;
  hq: import('./props').Prop | null = null;
  private hqT = 0;
  private marbleT = 0;

  constructor(private sim: Sim) {
    const rng = sim.rng;
    this.nextBonus = rng.range(30, 45);
    this.nextElite = rng.range(55, 75);
    const pool = rng.shuffle([...sim.stage.events]);
    const times = [62, 128, 205, 275];
    times.forEach((t, i) => { if (pool[i]) this.schedule.push({ at: t + rng.range(-6, 6), id: pool[i], done: false }); });
  }

  playersFactor(): number {
    // Вдвоём — вдвое больше врагов: двое стреляют и спасают друг друга.
    return 1 + 1.0 * (this.sim.players.filter(p => p.state !== 'out').length - 1);
  }

  cap(): number {
    return Math.round(170 * this.playersFactor());
  }

  targetAlive(): number {
    const s = this.sim, st = s.stageTime, B = s.stage.bossAt;
    const k = Math.pow(Math.min(st, B) / B, 1.1);
    let n = (10 + 38 * k) * this.playersFactor() * (1 + 0.15 * s.threat);
    if (s.boss) n *= 0.4;
    if (st < 6) n *= st / 6;
    return Math.round(n);
  }

  update(dt: number): void {
    const s = this.sim, st = s.stageTime;
    if (this.event) { this.event.t += dt; if (this.event.t >= this.event.dur) this.event = null; }
    this.updateHq(dt);
    if (this.marbleT > 0) this.updateMarbles(dt);

    // Обычные волны.
    const alive = s.enemies.length;
    const target = this.targetAlive();
    this.acc += dt * (1.6 + st / 40) * this.playersFactor();
    while (this.acc >= 1) {
      this.acc -= 1;
      if (alive >= target || s.enemies.length >= this.cap()) { this.acc = Math.min(this.acc, 1); break; }
      this.spawnOne();
    }
    // Несущие бонус (мигающие).
    if (st >= this.nextBonus) {
      this.nextBonus = st + s.rng.range(32, 50);
      this.spawnOne({ bonus: true });
    }
    // Элиты.
    if (st >= this.nextElite && !s.boss) {
      this.nextElite = st + s.rng.range(60, 85);
      this.spawnOne({ elite: true });
    }
    // События.
    for (const ev of this.schedule) if (!ev.done && st >= ev.at && !s.boss) { ev.done = true; this.startEvent(ev.id); }
    // Мини-босс — командир.
    if (!this.miniBoss && st >= 170) { this.miniBoss = true; this.spawnCommander(); }
    // Босс.
    const B = s.stage.bossAt;
    if (!this.bossWarned && st >= B - 6) {
      this.bossWarned = true;
      s.emit({ t: 'warn', text: 'ВНИМАНИЕ: ' + (BOSSES[s.stage.boss]?.name ?? 'БОСС').toUpperCase() });
    }
    if (!this.bossSpawned && st >= B) {
      this.bossSpawned = true;
      const pos = this.spawnPoint(1.0, true);
      spawnBoss(this.sim, s.stage.boss, pos[0], pos[1]);
    }
  }

  /** Подбор типа и размера с учётом текущего роста танка. */
  private pick(filter?: (d: EnemyDef) => boolean): { def: EnemyDef; mul: number } | null {
    const s = this.sim, st = s.stageTime;
    const roster = rosterOf(s.stageIdx).filter(d => !filter || filter(d));
    const opts: { def: EnemyDef; mul: number; w: number }[] = [];
    for (const d of roster) {
      if ((d.minTime ?? 0) > st) continue;
      const swarm = d.behavior === 'swarm';
      const want = s.size * (swarm ? s.rng.range(0.22, 0.42) : s.rng.range(0.45, 1.05));
      const mul = Math.max(1, Math.min(d.maxMul, want / d.size));
      const rel = (d.size * mul) / s.size;
      let band = 0;
      if (rel >= 0.17 && rel < 0.3) band = 0.35;
      else if (rel >= 0.3 && rel <= 2.4) band = 1;
      if (swarm && rel >= 0.12 && rel < 0.3) band = 1;
      if (!band) continue;
      opts.push({ def: d, mul, w: d.weight * band });
    }
    if (!opts.length) return null;
    const i = s.rng.weightedIndex(opts.map(o => o.w));
    return i < 0 ? null : opts[i];
  }

  /** Точка появления за краем видимой области (внутри арены). */
  spawnPoint(extra = 1.12, ground = true): [number, number] {
    const s = this.sim;
    const [hw, hh] = s.viewHalf();
    const st = s.stage;
    for (let tries = 0; tries < 10; tries++) {
      const a = s.rng.range(0, Math.PI * 2);
      const r = Math.hypot(hw, hh) * extra * s.rng.range(1, 1.18);
      let x = s.viewX + Math.cos(a) * r, y = s.viewY + Math.sin(a) * r;
      const m = s.size * 0.6;
      x = Math.max(m, Math.min(st.w - m, x));
      y = Math.max(m, Math.min(st.h - m, y));
      const inView = Math.abs(x - s.viewX) < hw * 0.95 && Math.abs(y - s.viewY) < hh * 0.95;
      if (inView && tries < 8) continue;
      if (ground && s.nav.isBlocked(x, y) && tries < 9) continue;
      // Не прямо на игроке.
      if (s.players.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < (s.size * 3) ** 2)) continue;
      return [x, y];
    }
    return [s.viewX + hw * 1.1, s.viewY];
  }

  spawnOne(o: { elite?: boolean; bonus?: boolean; filter?: (d: EnemyDef) => boolean; at?: [number, number] } = {}): Enemy | null {
    const pk = this.pick(o.filter ?? (o.elite || o.bonus ? d => d.behavior !== 'swarm' && d.behavior !== 'kamikaze' : undefined));
    if (!pk) return null;
    const [x, y] = o.at ?? this.spawnPoint(1.08, !pk.def.air);
    return spawnEnemy(this.sim, pk.def.id, x, y, pk.mul, { elite: o.elite, bonus: o.bonus });
  }

  private spawnCommander(): void {
    const s = this.sim;
    const roster = rosterOf(s.stageIdx).filter(d => d.behavior === 'shooter' || d.behavior === 'chase');
    roster.sort((a, b) => b.size * b.maxMul - a.size * a.maxMul);
    const d = roster[0];
    if (!d) return;
    const [x, y] = this.spawnPoint(1.1);
    const mul = Math.max(1, Math.min(d.maxMul * 1.2, (s.size * 1.6) / d.size));
    const e = spawnEnemy(s, d.id, x, y, mul, { elite: true });
    if (e) {
      e.maxHp = e.hp = e.hp * 2.5;
      e.xp *= 3;
      e.aura = 'shield';
      e.bonus = true;
      s.emit({ t: 'event', id: 'commander', text: 'Командир: ' + d.name });
    }
  }

  // -------------------------------------------------------------------------
  // События
  // -------------------------------------------------------------------------

  startEvent(id: string): void {
    const s = this.sim;
    const text = EVENT_TEXT[id] ?? id;
    this.event = { id, text, t: 0, dur: id === 'hq' ? 50 : 8 };
    s.emit({ t: 'event', id, text });
    switch (id) {
      case 'eliteSquad': {
        const lead = this.spawnOne({ elite: true });
        if (lead) {
          for (let i = 0; i < 6; i++) {
            const a = s.rng.range(0, Math.PI * 2);
            this.spawnOne({ at: [lead.x + Math.cos(a) * lead.size * 2, lead.y + Math.sin(a) * lead.size * 2], filter: d => d.behavior === 'shooter' || d.behavior === 'chase' || d.behavior === 'charger' });
          }
        }
        break;
      }
      case 'supply': {
        const [hw, hh] = s.viewHalf();
        const x = s.viewX + s.rng.range(-hw * 0.6, hw * 0.6), y = s.viewY + s.rng.range(-hh * 0.6, hh * 0.6);
        const sz = s.size * 0.9;
        const crate = makeProp('crate', 'wood', x, y, sz, sz, 26 * MATS.wood.hp * powerOf(sz * s.unit) * 2, { v: 2 });
        s.props.add(crate);
        s.emit({ t: 'telegraph', x, y, r: sz, dur: 1 });
        break;
      }
      case 'barrage': {
        for (let i = 0; i < 16; i++) {
          const p = s.players[i % s.players.length];
          if (!p) break;
          const x = p.x + s.rng.range(-1, 1) * s.size * 6, y = p.y + s.rng.range(-1, 1) * s.size * 4;
          const z = blastZone(s, x, y, s.size * 1.4, 22 * s.tankPower(), 1.4 + i * 0.35, -1);
          void z;
        }
        break;
      }
      case 'convoy': {
        const [x0, y0] = this.spawnPoint(1.1);
        for (let i = 0; i < 3; i++) this.spawnOne({ bonus: true, at: [x0 + i * s.size * 1.5, y0], filter: d => d.behavior !== 'air' && d.behavior !== 'swarm' });
        break;
      }
      case 'swarm': {
        const swarmDef = rosterOf(s.stageIdx).find(d => d.behavior === 'swarm');
        if (swarmDef) {
          for (let i = 0; i < 46; i++) {
            const [x, y] = this.spawnPoint(1.05);
            const mul = Math.max(1, Math.min(swarmDef.maxMul, (s.size * 0.3) / swarmDef.size));
            spawnEnemy(s, swarmDef.id, x, y, mul);
          }
        }
        break;
      }
      case 'hq': {
        const p = s.alivePlayers()[0] ?? s.players[0];
        const sz = s.size * 1.6;
        let x = p.x + s.size * 2.5, y = p.y;
        x = Math.max(sz, Math.min(s.stage.w - sz, x)); y = Math.max(sz, Math.min(s.stage.h - sz, y));
        // Расчистить место.
        const tmp: import('./props').Prop[] = [];
        s.props.queryRect(x - sz, y - sz, x + sz, y + sz, tmp);
        for (const pr of tmp.slice()) if (!MATS[pr.mat].solid) s.props.remove(pr);
        const hp = 30 * powerOf(sz * s.unit) * 9;
        this.hq = makeProp('hq', 'concrete', x, y, sz, sz, hp, { v: 0 });
        s.props.add(this.hq);
        this.hqT = 50;
        break;
      }
      case 'marbles':
        this.marbleT = 10;
        break;
    }
  }

  private updateHq(dt: number): void {
    const hq = this.hq;
    if (!hq) return;
    const s = this.sim;
    if (hq.dead) {
      this.hq = null;
      s.emit({ t: 'event', id: 'hqLost', text: 'Штаб разрушен…' });
      this.event = null;
      return;
    }
    this.hqT -= dt;
    // Чаще подкрепления, идущие на штаб.
    if (s.rng.next() < dt * 0.8) this.spawnOne();
    if (this.hqT <= 0) {
      s.emit({ t: 'event', id: 'hqWin', text: 'Штаб устоял! Награда' });
      dropPowerup(s, hq.x + s.size, hq.y);
      dropPowerup(s, hq.x - s.size, hq.y);
      s.gainXp(s.xpNeed() * 0.8);
      s.props.remove(hq);
      this.hq = null;
      this.event = null;
    }
  }

  private updateMarbles(dt: number): void {
    const s = this.sim;
    this.marbleT -= dt;
    if (s.rng.next() < dt * 1.6) {
      const [hw, hh] = s.viewHalf();
      const fromLeft = s.rng.chance(0.5);
      const y = s.viewY + s.rng.range(-hh * 0.9, hh * 0.9);
      const x = fromLeft ? s.viewX - hw * 1.1 : s.viewX + hw * 1.1;
      const sh = s.makeShot();
      sh.team = 1; sh.owner = -1; sh.kind = 'marble'; sh.w = 'marble';
      sh.x = sh.px = x; sh.y = sh.py = y;
      const sp = s.size * 3.2;
      sh.vx = fromLeft ? sp : -sp; sh.vy = s.rng.range(-0.2, 0.2) * sp;
      sh.r = s.size * 0.42; sh.size = s.size * 0.85; sh.pierce = 999;
      sh.dmg = 14 * s.tankPower(); sh.life = (hw * 2.4) / sp;
      s.emit({ t: 'telegraph', x: fromLeft ? s.viewX - hw * 0.95 : s.viewX + hw * 0.95, y, r: sh.r, dur: 0.6 });
    }
  }
}

export { TANK_BASE, Zone };
