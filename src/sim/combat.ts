// Урон, взрывы, горение, гибель врагов и игроков.

import type { Sim } from './sim';
import type { Enemy, Player } from './entities';
import { EFFECT, type DmgType, type WeaponId } from './types';
import { MATS, type Prop } from './props';
import { dropPowerup } from './powerups';
import { bossHitMult } from './bosses';

const tmpE: Enemy[] = [];

/** Поправки урона по боссам: бронебойная иначе решает бой в одиночку, фугас и огонь — наоборот. */
const BOSS_TYPE_K: Partial<Record<DmgType, number>> = { ap: 0.62, he: 2.1, fire: 2.3, mg: 1.2 };
const tmpP: Prop[] = [];

export interface DmgOpts {
  noCrit?: boolean;
  /** Не создавать событие попадания (для DoT — копится отдельно). */
  silent?: boolean;
  /** Дополнительный множитель (слабые места боссов). */
  mult?: number;
  /** Игнорировать броню. */
  pierceArmor?: boolean;
  /** Откуда пришёл удар (для слабых мест боссов). */
  fromX?: number;
  fromY?: number;
}

/** Нанести урон врагу. Возвращает фактический урон. */
export function damageEnemy(sim: Sim, e: Enemy, base: number, type: DmgType, owner: number, w: WeaponId | '', o: DmgOpts = {}): number {
  if (e.dead || base <= 0) return 0;
  let eff = EFFECT[type][e.armor];
  if (eff <= 0) return 0;
  const p = owner >= 0 ? sim.players[owner] : null;
  let armorPct = e.armorPct;
  if (p) {
    if (type === 'mg' && p.mods.has('mg_ap') && (e.armor === 'medium' || e.armor === 'heavy')) eff *= 1.8;
    if (type === 'fire' && p.mods.has('fl_blue')) { armorPct = 0; if (e.armor === 'heavy') eff *= 1.6; }
    if (type === 'rocket' && e.markT > 0 && p.mods.has('syn_spotter')) eff *= 1.4;
  }
  if (type === 'ap' || type === 'true' || o.pierceArmor) armorPct = 0;
  // Боссы: различия типов урона сглажены (бой с боссом не решается одним оружием),
  // бронебойные пробивают лишь половину брони.
  const boss = e === sim.boss;
  if (boss) {
    eff = Math.sqrt(eff) * (BOSS_TYPE_K[type] ?? 1);
    if (type === 'ap' || o.pierceArmor) armorPct = e.armorPct * 0.5;
  }
  let dmg = base * eff * (1 - armorPct) * (o.mult ?? 1);
  let weak = false;
  if (e === sim.boss && o.fromX !== undefined && o.fromY !== undefined) {
    const m = bossHitMult(sim, e, o.fromX, o.fromY);
    if (m > 1) { dmg *= m; weak = true; }
  }
  if (e.markT > 0) dmg *= boss ? 1.1 : 1.25;
  if (e.stunT > 0 && p && p.ability('emp') && p.ability('emp')!.level >= 5) dmg *= 1.25;
  if (e.shieldAura > 0) dmg *= 1 - e.shieldAura;
  let crit = false;
  if (p && !o.noCrit && sim.rng.next() < p.stats.crit) { crit = true; dmg *= p.stats.critMult; }
  dmg *= sim.threatDealt();
  if (e === sim.boss && sim.bossLog) { const k = `${type}:${w || '-'}${weak ? '*' : ''}`; sim.bossLog.set(k, (sim.bossLog.get(k) ?? 0) + Math.min(dmg, Math.max(0, e.hp)) / e.maxHp); }
  e.hp -= dmg;
  e.flash = 0.08;
  if (owner >= 0) { e.lastHit = owner; e.lastHitW = w; }
  if (p) {
    p.damageDealt += dmg;
    const wi = w ? p.weapon(w as WeaponId) : undefined;
    if (wi) wi.dmgDealt += dmg;
  }
  if (!o.silent) sim.emit({ t: 'hit', x: e.x, y: e.y, dmg, crit: crit || weak, armor: e.armor, w: type, tgt: 'enemy', p: owner });
  if (e.hp <= 0) killEnemy(sim, e, owner, w, false);
  return dmg;
}

/** Гибель врага: опыт, бонусы, синергии. */
export function killEnemy(sim: Sim, e: Enemy, owner: number, w: WeaponId | '', crushed: boolean): void {
  if (e.dead) return;
  e.dead = true;
  e.hp = 0;
  const rel = e.pw / sim.tankPower();
  const xp = e.xp * Math.pow(Math.min(25, Math.max(0.01, rel)), 0.85) * (e.elite ? 5 : 1) * (e.bonus ? 1.5 : 1);
  sim.kills++;
  const p = owner >= 0 ? sim.players[owner] : null;
  if (p) {
    p.kills++;
    if (crushed) p.crushed++;
    const wi = w ? p.weapon(w as WeaponId) : undefined;
    if (wi) wi.kills++;
  }
  sim.emit({ t: 'kill', x: e.x, y: e.y, size: e.size, kind: e.def.art, by: owner, xp, crushed, air: e.air });
  if (e === sim.boss) { sim.gainXp(xp); sim.onBossKilled(e); return; }
  if (e.bonus || (e.elite && sim.rng.chance(0.6))) dropPowerup(sim, e.x, e.y);
  // Синергии при гибели.
  if (p) {
    if (e.burnT > 0 && p.mods.has('syn_pyre')) {
      explode(sim, e.x, e.y, Math.max(e.size * 1.3, sim.size * 0.9) * p.stats.blast, 20 * sim.tankPower() * p.stats.dmg, 'he', owner, '', { kind: 'fire', knock: 0.5 });
    }
    if (w === 'tesla' && p.mods.has('ts_overload')) {
      chainLightning(sim, e.x, e.y, null, 2, sim.size * 2.4, 10 * sim.tankPower() * p.stats.dmg, 0.2, owner);
    }
  }
  sim.gainXp(xp);
}

export interface BoomOpts {
  kind?: 'he' | 'rocket' | 'mine' | 'fire' | 'tesla' | 'enemy' | 'big' | 'boss' | 'plasma';
  ignite?: boolean;
  knock?: number;
  /** Множитель урона по препятствиям. */
  props?: number;
  /** Подрывать мины (синергия «Детонатор»). */
  detonate?: boolean;
  /** Пропустить врага (тот, в кого попали напрямую). */
  skip?: Enemy | null;
  /** Урон по воздушным целям (по умолчанию да). */
  air?: boolean;
}

/** Взрыв игрока: урон врагам и препятствиям по области. Игрокам — никогда. */
export function explode(sim: Sim, x: number, y: number, r: number, dmg: number, type: DmgType, owner: number, w: WeaponId | '', o: BoomOpts = {}): void {
  const p = owner >= 0 ? sim.players[owner] : null;
  sim.enemiesNear(x, y, r, tmpE);
  const list = tmpE.slice();
  for (const e of list) {
    if (e === o.skip || e.dead) continue;
    if (e.air && o.air === false) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    const fall = 1 - 0.5 * Math.min(1, Math.max(0, d - e.r) / r);
    damageEnemy(sim, e, dmg * fall, type, owner, w, { noCrit: false, fromX: x, fromY: y });
    const k = o.knock ?? 1;
    if (k > 0 && !e.dead && e.size < sim.size * 0.9 && !e.noCrush) {
      const push = (r * 0.35 * k) / Math.max(1, e.size / (sim.size * 0.4));
      const nx = (e.x - x) / (d || 1), ny = (e.y - y) / (d || 1);
      e.x += nx * push * 0.3; e.y += ny * push * 0.3;
    }
  }
  // Препятствия.
  sim.props.queryCircle(x, y, r * 0.85, tmpP);
  for (const pr of tmpP.slice()) damageProp(sim, pr, dmg * (o.props ?? 1), type);
  // Мины (детонатор).
  if (p && (o.detonate ?? (type === 'he' || type === 'rocket')) && p.mods.has('syn_detonator')) {
    for (const m of sim.mines) {
      if (m.dead || m.armT > 0) continue;
      if ((m.x - x) ** 2 + (m.y - y) ** 2 <= (r * 1.25) ** 2) { m.big = true; m.armT = -1; m.trigger = 1e9; }
    }
  }
  // Поджог.
  if (p && (o.ignite || p.mods.has('syn_firewall'))) {
    const dps = 6 * sim.tankPower() * p.stats.burn * p.stats.dmg;
    sim.fire.ignite(x, y, r * 0.8 * p.stats.fireSpread, 3.5 * p.stats.duration, dps, owner, !!o.ignite && p.mods.has('fl_napalm'));
  }
  sim.emit({ t: 'boom', x, y, r, kind: o.kind ?? 'he', p: owner });
}

/** Взрыв врага: урон игрокам (и только им). */
export function enemyExplode(sim: Sim, x: number, y: number, r: number, dmg: number, kind: 'enemy' | 'big' | 'boss' | 'plasma' = 'enemy', breakProps = true): void {
  for (const p of sim.players) {
    if (p.state !== 'alive') continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d > r + p.r) continue;
    const fall = 1 - 0.5 * Math.min(1, Math.max(0, d - p.r) / r);
    damagePlayer(sim, p, dmg * fall, 'boom:' + kind);
  }
  if (breakProps) {
    sim.props.queryCircle(x, y, r * 0.7, tmpP);
    for (const pr of tmpP.slice()) if (!pr.friendly) damageProp(sim, pr, dmg * 0.6, 'he');
  }
  sim.emit({ t: 'boom', x, y, r, kind, p: -1 });
}

export function damageProp(sim: Sim, pr: Prop, dmg: number, type: DmgType): void {
  if (pr.dead) return;
  const m = MATS[pr.mat];
  if (m.solid) return;
  const res = m.res?.[type] ?? 1;
  if (res <= 0) return;
  pr.hp -= dmg * res;
  if (pr.hp <= 0) breakProp(sim, pr);
}

export function breakProp(sim: Sim, pr: Prop): void {
  if (pr.dead) return;
  sim.props.remove(pr);
  sim.emit({ t: 'propBreak', x: pr.x, y: pr.y, w: pr.w, h: pr.h, mat: pr.mat, kind: pr.kind });
  if (pr.kind === 'crate') { dropPowerup(sim, pr.x - pr.w * 0.3, pr.y); dropPowerup(sim, pr.x + pr.w * 0.3, pr.y); }
}

/** Урон игроку от врага. */
export function damagePlayer(sim: Sim, p: Player, dmg: number, src = '?'): number {
  if (p.state !== 'alive' || p.invulnT > 0 || p.dashT > 0 || p.fortressT > 0 || sim.helmetT > 0) return 0;
  let k = 1 - p.stats.armor;
  if (p.inSmoke) k *= 0.5;
  const rep = p.ability('repair');
  if (p.repairT > 0 && rep && rep.level >= 5) k *= 0.7;
  const d = dmg * k * sim.threatTaken();
  p.hp -= d;
  p.hurtT = 0.25;
  p.damageTaken += d;
  if (sim.dmgLog) sim.dmgLog.set(src, (sim.dmgLog.get(src) ?? 0) + d / p.maxHp);
  sim.emit({ t: 'hurt', p: p.idx, dmg: d });
  if (p.hp <= 0) downPlayer(sim, p);
  return d;
}

export function downPlayer(sim: Sim, p: Player): void {
  p.hp = 0;
  p.dashT = 0; p.fortressT = 0; p.overdriveT = 0;
  sim.emit({ t: 'down', p: p.idx, x: p.x, y: p.y });
  const partners = sim.players.filter(q => q !== p && q.state === 'alive');
  if (sim.players.length === 1 || !partners.length && sim.players.every(q => q === p || q.state === 'out')) {
    loseLife(sim, p);
    return;
  }
  p.state = 'down';
  p.downT = sim.boss ? 30 : 20;
  p.reviveProg = 0;
}

/** Потеря жизни: возрождение или выбывание. */
export function loseLife(sim: Sim, p: Player): void {
  if (p.lives > 0) {
    p.lives--;
    p.state = 'dead';
    p.respawnT = 2.2;
    sim.emit({ t: 'lifeLost', p: p.idx });
  } else {
    p.state = 'out';
    sim.emit({ t: 'out', p: p.idx });
  }
}

export function applyBurn(e: Enemy, dps: number, dur: number, owner: number): void {
  if (e.dead) return;
  if (dps > e.burnDps || e.burnT <= 0) { e.burnDps = dps; e.burnOwner = owner; }
  e.burnT = Math.max(e.burnT, dur);
}

const burnAcc = new Map<number, number>();

/** Горение врагов, огонь на земле, перекидывание пламени. */
export function burnTick(sim: Sim, dt: number): void {
  const fire = sim.fire;
  for (const e of sim.enemies) {
    if (e.dead) continue;
    if (!e.air && fire.active.length) {
      const [dps, owner] = fire.at(e.x, e.y);
      if (dps > 0) applyBurn(e, dps, 0.8, owner);
    }
    if (e.burnT <= 0) continue;
    e.burnT -= dt;
    const owner = e.burnOwner;
    const dmg = e.burnDps * dt;
    const done = damageEnemy(sim, e, dmg, 'fire', owner, owner >= 0 && sim.players[owner]?.hasWeapon('flame') ? 'flame' : '', { noCrit: true, silent: true });
    const acc = (burnAcc.get(e.id) ?? 0) + done;
    if (acc > 0 && sim.tick % 15 === 0) {
      sim.emit({ t: 'hit', x: e.x, y: e.y, dmg: acc, crit: false, armor: e.armor, w: 'fire', tgt: 'enemy', p: owner });
      burnAcc.delete(e.id);
    } else burnAcc.set(e.id, acc);
    if (e.dead) { burnAcc.delete(e.id); continue; }
    // Перекидывание огня на соседей.
    const p = owner >= 0 ? sim.players[owner] : null;
    const spread = p ? p.stats.fireSpread : 1;
    if (sim.rng.next() < 0.9 * spread * dt) {
      sim.enemiesNear(e.x, e.y, e.r + sim.size * 0.5 * spread, tmpE);
      for (const n of tmpE) if (n !== e && !n.dead && n.burnT <= 0 && !n.air) { applyBurn(n, e.burnDps * 0.8, 1.6, owner); break; }
    }
    // Горящий враг поджигает горючую землю.
    if (!e.air && sim.rng.next() < 0.5 * dt) fire.ignite(e.x, e.y, e.r, 2, e.burnDps * 0.5, owner, false);
  }
}

/** Цепная молния: от точки к цели и дальше по соседям. */
export function chainLightning(sim: Sim, x: number, y: number, first: Enemy | null, count: number, jump: number, dmg: number, stun: number, owner: number): number {
  const pts: number[] = [x, y];
  const hit = new Set<number>();
  let cur: Enemy | null = first;
  let cx = x, cy = y;
  let n = 0;
  const p = owner >= 0 ? sim.players[owner] : null;
  for (let i = 0; i <= count; i++) {
    if (!cur) {
      sim.enemiesNear(cx, cy, jump, tmpE);
      let best: Enemy | null = null, bd = Infinity;
      for (const e of tmpE) {
        if (e.dead || hit.has(e.id)) continue;
        const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
    }
    if (!cur) break;
    hit.add(cur.id);
    pts.push(cur.x, cur.y);
    const wasBurning = cur.burnT > 0;
    damageEnemy(sim, cur, dmg, 'tesla', owner, 'tesla');
    if (!cur.dead && stun > 0) cur.stunT = Math.max(cur.stunT, stun);
    if (p && wasBurning && p.mods.has('syn_electrolyte')) explode(sim, cur.x, cur.y, sim.size * 0.9, dmg * 0.8, 'he', owner, '', { kind: 'fire', knock: 0.3 });
    cx = cur.x; cy = cur.y;
    cur = null;
    n++;
  }
  if (pts.length > 2) sim.emit({ t: 'arc', pts });
  return n;
}
