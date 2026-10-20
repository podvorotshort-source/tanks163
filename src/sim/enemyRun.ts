// Враги: ИИ по типам поведения, движение, столкновения, стрельба.

import type { Sim } from './sim';
import { Zone, type Enemy, type Player } from './entities';
import { rotateTowards, clamp } from '../core/math';
import { MATS, pushOut, type Prop } from './props';
import { damagePlayer, enemyExplode, breakProp, damageProp } from './combat';
import { updateBoss } from './bosses';
import { spawnEnemy } from './director';

/** Множитель перезарядки вражеского оружия (базовая сложность). */
export const ENEMY_FIRE_K = 1.5;

const tmpE: Enemy[] = [];
const tmpP: Prop[] = [];

export function updateEnemies(sim: Sim, dt: number): void {
  const frozen = sim.freezeT > 0;
  // Ауры элит.
  for (const e of sim.enemies) { e.shieldAura = 0; e.hasteAura = 0; }
  for (const e of sim.enemies) {
    if (e.dead || !e.elite || !e.aura || e.spawnT > 0) continue;
    sim.enemiesNear(e.x, e.y, e.size * 3, tmpE);
    for (const n of tmpE) {
      if (n === e) continue;
      if (e.aura === 'shield') n.shieldAura = 0.4;
      else if (e.aura === 'haste') n.hasteAura = 0.35;
      else if (e.aura === 'regen' && n.hp < n.maxHp) n.hp = Math.min(n.maxHp, n.hp + n.maxHp * 0.04 * dt);
    }
  }
  for (const e of sim.enemies) {
    if (e.dead) continue;
    e.px = e.x; e.py = e.y;
    if (e.flash > 0) e.flash -= dt;
    if (e.markT > 0) e.markT -= dt;
    if (e.contactT > 0) e.contactT -= dt;
    if (e.spawnT > 0) { e.spawnT -= dt; continue; }
    if (e === sim.boss) { updateBoss(sim, e, dt); continue; }
    if (frozen) { e.vx = e.vy = 0; continue; }
    if (e.stunT > 0) { e.stunT -= dt; e.vx *= 0.8; e.vy *= 0.8; continue; }
    if (e.slowT > 0) e.slowT -= dt;
    e.frame += dt;
    const tgt = sim.nearestPlayer(e.x, e.y);
    if (!tgt) { wander(sim, e, dt); continue; }
    switch (e.def.behavior) {
      case 'swarm': case 'chase': chase(sim, e, tgt, dt, 1); contact(sim, e, tgt, 1); if (e.def.fireCd) shootLogic(sim, e, tgt, dt); break;
      case 'shooter': shooter(sim, e, tgt, dt); contact(sim, e, tgt, 0.6); break;
      case 'charger': charger(sim, e, tgt, dt); break;
      case 'kamikaze': kamikaze(sim, e, tgt, dt); break;
      case 'artillery': artillery(sim, e, tgt, dt); break;
      case 'air': air(sim, e, tgt, dt); break;
      case 'spawner': spawner(sim, e, tgt, dt); break;
      default: chase(sim, e, tgt, dt, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Движение
// ---------------------------------------------------------------------------

function speedOf(sim: Sim, e: Enemy): number {
  let s = e.speed * (1 + e.hasteAura);
  if (e.slowT > 0) s *= 0.55;
  return s;
}

/** Двигаться в направлении (dx, dy) с учётом препятствий и соседей. */
export function moveGround(sim: Sim, e: Enemy, dx: number, dy: number, speed: number, dt: number, accel = 6): void {
  const tvx = dx * speed, tvy = dy * speed;
  const k = Math.min(1, dt * accel);
  e.vx += (tvx - e.vx) * k;
  e.vy += (tvy - e.vy) * k;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.vx * e.vx + e.vy * e.vy > 1) e.angle = rotateTowards(e.angle, Math.atan2(e.vy, e.vx), (e.def.turn ?? 6) * dt);
  collide(sim, e);
}

function collide(sim: Sim, e: Enemy): void {
  if (!e.air) {
    sim.props.queryCircle(e.x, e.y, e.r, tmpP);
    for (const pr of tmpP) {
      const m = MATS[pr.mat];
      if (!m.move || pr.dead) continue;
      if ((e.def.crusher || e === sim.boss) && !m.solid && pr.size <= e.size * 0.3) { breakProp(sim, pr); continue; }
      const po = pushOut(e.x, e.y, e.r, pr);
      if (po) { e.x += po[0]; e.y += po[1]; }
    }
  }
  // Расталкивание соседей (каждая пара один раз).
  sim.enemiesNear(e.x, e.y, e.r * 1.1, tmpE);
  for (const n of tmpE) {
    if (n === e || n.dead || n.air !== e.air || n.id < e.id) continue;
    const dx = n.x - e.x, dy = n.y - e.y, d = Math.hypot(dx, dy) || 0.01, ov = e.r + n.r - d;
    if (ov <= 0) continue;
    const me = e.size * e.size, mn = n.size * n.size, s = ov / (me + mn);
    const nx = dx / d, ny = dy / d;
    if (n !== sim.boss) { n.x += nx * s * me * 0.8; n.y += ny * s * me * 0.8; }
    if (e !== sim.boss) { e.x -= nx * s * mn * 0.8; e.y -= ny * s * mn * 0.8; }
  }
  const st = sim.stage;
  e.x = clamp(e.x, e.r * 0.5, st.w - e.r * 0.5);
  e.y = clamp(e.y, e.r * 0.5, st.h - e.r * 0.5);
}

function flowDir(sim: Sim, e: Enemy, tgt: Player): [number, number] {
  const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (e.air || d < sim.nav.cell * 3 + e.r * 2) return [dx / d, dy / d];
  const [fx, fy, dist] = sim.nav.dirAt(e.x, e.y);
  if (dist === 65535 || (fx === 0 && fy === 0)) return [dx / d, dy / d];
  // Смешиваем с прямым направлением для плавности.
  const mx = fx * 0.8 + (dx / d) * 0.2, my = fy * 0.8 + (dy / d) * 0.2, m = Math.hypot(mx, my) || 1;
  return [mx / m, my / m];
}

function chase(sim: Sim, e: Enemy, tgt: Player, dt: number, mul: number): void {
  const [dx, dy] = flowDir(sim, e, tgt);
  moveGround(sim, e, dx, dy, speedOf(sim, e) * mul, dt);
}

function wander(sim: Sim, e: Enemy, dt: number): void {
  const a = e.id * 1.7 + sim.time * 0.3;
  moveGround(sim, e, Math.cos(a), Math.sin(a), e.speed * 0.3, dt);
}

function contact(sim: Sim, e: Enemy, tgt: Player, mul: number): void {
  if (e.contactT > 0) return;
  const hq = sim.director.hq;
  if (hq && !hq.dead && Math.abs(e.x - hq.x) < hq.w / 2 + e.r + 2 && Math.abs(e.y - hq.y) < hq.h / 2 + e.r + 2) {
    damageProp(sim, hq, e.dmg * mul * 1.5, 'true');
    e.contactT = 0.75;
    return;
  }
  for (const p of sim.players) {
    if (p.state !== 'alive') continue;
    const rr = e.r + p.r + 1;
    if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 > rr * rr) continue;
    damagePlayer(sim, p, e.dmg * mul, 'contact:' + e.def.id);
    e.contactT = 0.75;
    return;
  }
  void tgt;
}

// ---------------------------------------------------------------------------
// Типы поведения
// ---------------------------------------------------------------------------

function los(sim: Sim, e: Enemy, p: Player): boolean {
  if (e.air) return true;
  const hit = sim.props.raycast(e.x, e.y, p.x, p.y, 0, pr => MATS[pr.mat].shots && pr.size > e.size * 0.3);
  return !hit;
}

function shooter(sim: Sim, e: Enemy, tgt: Player, dt: number): void {
  const range = (e.def.range ?? 6) * e.size;
  const d = Math.hypot(tgt.x - e.x, tgt.y - e.y);
  const sees = d < range * 1.1 && los(sim, e, tgt);
  if (d > range * 0.8 || !sees) chase(sim, e, tgt, dt, 1);
  else {
    // Держит дистанцию и смещается вбок.
    const a = Math.atan2(tgt.y - e.y, tgt.x - e.x) + Math.PI / 2 * e.orbit;
    const back = d < range * 0.45 ? -0.7 : 0;
    moveGround(sim, e, Math.cos(a) * 0.5 + Math.cos(a - Math.PI / 2 * e.orbit) * back, Math.sin(a) * 0.5 + Math.sin(a - Math.PI / 2 * e.orbit) * back, speedOf(sim, e) * 0.45, dt);
    if (sim.rng.next() < dt * 0.3) e.orbit = -e.orbit;
  }
  shootLogic(sim, e, tgt, dt);
}

function shootLogic(sim: Sim, e: Enemy, tgt: Player, dt: number): void {
  const range = (e.def.range ?? 6) * e.size;
  const aim = Math.atan2(tgt.y - e.y, tgt.x - e.x);
  e.turret = rotateTowards(e.turret, aim, 4 * dt);
  e.fireT -= dt;
  if (e.burstLeft > 0 && e.fireT <= 0) {
    e.burstLeft--;
    e.fireT = e.burstLeft > 0 ? 0.13 : (e.def.fireCd ?? 2) * ENEMY_FIRE_K * sim.rng.range(0.85, 1.2);
    fireAt(sim, e, tgt);
    return;
  }
  if (e.fireT > 0) return;
  const d = Math.hypot(tgt.x - e.x, tgt.y - e.y);
  if (d > range || !los(sim, e, tgt)) { e.fireT = 0.3; return; }
  const burst = e.def.burst ?? 1;
  e.burstLeft = burst - 1;
  e.fireT = burst > 1 ? 0.13 : (e.def.fireCd ?? 2) * ENEMY_FIRE_K * sim.rng.range(0.85, 1.2);
  fireAt(sim, e, tgt);
}

/** Выстрел врага по игроку (учитывает дым и веер). */
export function fireAt(sim: Sim, e: Enemy, tgt: Player): void {
  const kind = e.def.shot ?? 'bullet';
  const lobKinds = ['mortar', 'toast', 'icbm', 'orbital', 'rocketLob', 'bomb'];
  if (lobKinds.includes(kind)) { lobAt(sim, e, tgt.x + tgt.vx * 0.9, tgt.y + tgt.vy * 0.9, kind); return; }
  if (kind === 'beam') { beam(sim, e, tgt); return; }
  const sp = (e.def.shotSpeed ?? 8) * e.size;
  const d = Math.hypot(tgt.x - e.x, tgt.y - e.y);
  const t = Math.min(1, d / Math.max(1, sp));
  let a = Math.atan2(tgt.y + tgt.vy * t * 0.5 - e.y, tgt.x + tgt.vx * t * 0.5 - e.x);
  a += sim.rng.range(-1, 1) * (kind === 'bullet' ? 0.16 : 0.1);
  const fan = e.def.fan ?? 1;
  for (let i = 0; i < fan; i++) {
    const off = fan > 1 ? (i - (fan - 1) / 2) * (e.def.spreadShot ?? 0.2) : 0;
    enemyShot(sim, e, a + off, kind, sp);
  }
}

export function enemyShot(sim: Sim, e: Enemy, a: number, kind: string, sp: number, dmgK = 1): void {
  const s = sim.makeShot();
  s.team = 1; s.owner = -1; s.w = kind; s.kind = kind;
  const L = e.size * 0.55;
  s.x = s.px = e.x + Math.cos(a) * L; s.y = s.py = e.y + Math.sin(a) * L;
  const slow = kind === 'steam' ? 0.6 : kind === 'shell' || kind === 'plasma' ? 0.7 : 0.85;
  s.vx = Math.cos(a) * sp * slow; s.vy = Math.sin(a) * sp * slow;
  s.dmg = e.dmg * dmgK * (kind === 'bullet' ? 0.5 : kind === 'steam' ? 0.35 : 0.75);
  s.life = kind === 'steam' ? 0.7 : ((e.def.range ?? 6) * e.size * 1.4) / Math.max(1, sp);
  s.r = e.size * (kind === 'bullet' ? 0.07 : kind === 'shell' ? 0.1 : kind === 'plasma' ? 0.14 : 0.09);
  s.size = e.size * (kind === 'bullet' ? 0.13 : kind === 'shell' ? 0.2 : kind === 'plasma' ? 0.28 : 0.2);
  s.blast = kind === 'rocket' || kind === 'plasma' ? e.size * 0.6 : 0;
  s.pierce = kind === 'steam' ? 999 : 0;
  sim.emit({ t: 'shot', w: 'enemy', x: s.x, y: s.y, a, p: -1, size: e.size, tier: sim.stageIdx });
}

export function lobAt(sim: Sim, e: Enemy, tx: number, ty: number, kind: string, dmgK = 1, blastK = 1): void {
  const s = sim.makeShot();
  s.team = 1; s.owner = -1; s.w = kind; s.kind = kind;
  s.lob = true;
  s.sx = s.x = s.px = e.x; s.sy = s.y = s.py = e.y;
  s.tx = tx + sim.rng.range(-1, 1) * e.size * 0.3; s.ty = ty + sim.rng.range(-1, 1) * e.size * 0.3;
  const d = Math.hypot(s.tx - e.x, s.ty - e.y);
  s.lobTotal = 1.1 + Math.min(1.2, d / (e.size * 12));
  s.lobT = 0;
  s.life = s.lobTotal + 0.1;
  s.dmg = e.dmg * dmgK;
  s.blast = (e.def.boom ?? 1.4) * e.size * blastK;
  s.size = e.size * 0.3;
  sim.emit({ t: 'telegraph', x: s.tx, y: s.ty, r: s.blast, dur: s.lobTotal });
}

/** Луч (лампа, телевизор): прицел с задержкой, затем удар по линии. */
function beam(sim: Sim, e: Enemy, tgt: Player): void {
  if (sim.zones.some(z2 => z2.kind === 'hazard' && z2.owner === e.id && !z2.dead)) return;
  const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
  beamZone(sim, e.x, e.y, a, (e.def.range ?? 9) * e.size, e.size * 0.35, e.dmg * 1.4, 0.9, e.id);
}

/** Линия-луч: предупреждение, затем удар по всем игрокам на линии. */
export function beamZone(sim: Sim, x: number, y: number, a: number, len: number, width: number, dmg: number, delay: number, owner: number): Zone {
  const z = new Zone();
  z.kind = 'hazard'; z.n = 0;
  z.x = x; z.y = y; z.r = len; z.dur = delay; z.owner = owner; z.team = 1; z.dps = dmg; z.power = a;
  z.data = [width];
  sim.zones.push(z);
  return z;
}

/** Круг-предупреждение, затем удар по области. */
export function blastZone(sim: Sim, x: number, y: number, r: number, dmg: number, delay: number, owner: number): Zone {
  const z = new Zone();
  z.kind = 'hazard'; z.n = 1;
  z.x = x; z.y = y; z.r = r; z.dur = delay; z.owner = owner; z.team = 1; z.dps = dmg;
  sim.zones.push(z);
  sim.emit({ t: 'telegraph', x, y, r, dur: delay });
  return z;
}

function charger(sim: Sim, e: Enemy, tgt: Player, dt: number): void {
  const d = Math.hypot(tgt.x - e.x, tgt.y - e.y);
  switch (e.state) {
    case 'spawnIn':
    case 'move':
      e.state = 'move';
      chase(sim, e, tgt, dt, 1);
      contact(sim, e, tgt, 1);
      if (d < e.size * 7 && d > e.size * 1.5 && los(sim, e, tgt) && sim.rng.next() < dt * 2) {
        e.state = 'windup'; e.t = 0.55;
        const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
        e.dx = Math.cos(a); e.dy = Math.sin(a);
      }
      break;
    case 'windup':
      e.t -= dt;
      e.vx *= 0.85; e.vy *= 0.85;
      e.angle = rotateTowards(e.angle, Math.atan2(e.dy, e.dx), 10 * dt);
      if (e.t <= 0) { e.state = 'charge'; e.t = 0.75; }
      break;
    case 'charge': {
      e.t -= dt;
      const sp = (e.def.chargeSpeed ?? 8) * e.size;
      const ox = e.x, oy = e.y;
      moveGround(sim, e, e.dx, e.dy, sp, dt, 20);
      contact(sim, e, tgt, 1.5);
      const moved = Math.hypot(e.x - ox, e.y - oy);
      if (e.t <= 0 || moved < sp * dt * 0.3) { e.state = 'recover'; e.t = 0.7; }
      break;
    }
    case 'recover':
      e.t -= dt;
      e.vx *= 0.9; e.vy *= 0.9;
      if (e.t <= 0) e.state = 'move';
      break;
    default: e.state = 'move';
  }
}

function kamikaze(sim: Sim, e: Enemy, tgt: Player, dt: number): void {
  if (e.air) {
    const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
    moveGround(sim, e, dx / d, dy / d, speedOf(sim, e), dt, 3);
  } else chase(sim, e, tgt, dt, 1);
  for (const p of sim.players) {
    if (p.state !== 'alive') continue;
    const rr = e.r + p.r + e.size * 0.15;
    if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < rr * rr) {
      e.dead = true;
      enemyExplode(sim, e.x, e.y, (e.def.boom ?? 1.2) * e.size, e.dmg, 'enemy');
      sim.emit({ t: 'kill', x: e.x, y: e.y, size: e.size, kind: e.def.art, by: -1, xp: 0, crushed: false, air: e.air });
      return;
    }
  }
}

function artillery(sim: Sim, e: Enemy, tgt: Player, dt: number): void {
  const range = (e.def.range ?? 10) * e.size;
  const d = Math.hypot(tgt.x - e.x, tgt.y - e.y);
  if (e.speed > 0) {
    if (d > range * 0.85) chase(sim, e, tgt, dt, 1);
    else if (d < range * 0.45) { const dx = e.x - tgt.x, dy = e.y - tgt.y; moveGround(sim, e, dx / d, dy / d, speedOf(sim, e) * 0.8, dt); }
    else moveGround(sim, e, 0, 0, 0, dt);
  }
  e.turret = rotateTowards(e.turret, Math.atan2(tgt.y - e.y, tgt.x - e.x), 3 * dt);
  e.fireT -= dt;
  if (e.burstLeft > 0 && e.fireT <= 0) { e.burstLeft--; e.fireT = 0.18; lobAt(sim, e, tgt.x + sim.rng.range(-1, 1) * tgt.r * 3, tgt.y + sim.rng.range(-1, 1) * tgt.r * 3, e.def.shot ?? 'mortar'); return; }
  if (e.fireT <= 0 && d < range) {
    e.fireT = (e.def.fireCd ?? 4) * sim.rng.range(0.85, 1.2);
    e.burstLeft = (e.def.burst ?? 1) - 1;
    fireAt(sim, e, tgt);
  }
}

function air(sim: Sim, e: Enemy, tgt: Player, dt: number): void {
  const diver = (e.def.fireCd ?? 2) >= 50;
  if (diver) {
    // Пикирует сквозь игрока, разворачивается и повторяет.
    if (e.state !== 'charge') {
      const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.dx = dx / d; e.dy = dy / d;
      e.state = 'charge'; e.t = d / e.speed + 0.8;
    }
    e.t -= dt;
    moveGround(sim, e, e.dx, e.dy, e.speed, dt, 2.5);
    contact(sim, e, tgt, 1);
    if (e.t <= 0) e.state = 'move';
    return;
  }
  const range = (e.def.range ?? 6) * e.size;
  const R = range * 0.65;
  const ang = Math.atan2(e.y - tgt.y, e.x - tgt.x) + 0.6 * e.orbit;
  const ox = tgt.x + Math.cos(ang) * R, oy = tgt.y + Math.sin(ang) * R;
  const dx = ox - e.x, dy = oy - e.y, d = Math.hypot(dx, dy) || 1;
  moveGround(sim, e, dx / d, dy / d, speedOf(sim, e) * Math.min(1, d / (e.size * 2) + 0.3), dt, 2.5);
  e.angle = rotateTowards(e.angle, Math.atan2(tgt.y - e.y, tgt.x - e.x), 3 * dt);
  shootLogic(sim, e, tgt, dt);
}

function spawner(sim: Sim, e: Enemy, tgt: Player, dt: number): void {
  if (e.speed > 0) chase(sim, e, tgt, dt, 0.7);
  contact(sim, e, tgt, 0.8);
  e.t -= dt;
  if (e.t <= 0) {
    e.t = (e.def.spawnCd ?? 4) * sim.rng.range(0.9, 1.2);
    const cap = sim.director.cap();
    const n = e.def.spawnN ?? 2;
    for (let i = 0; i < n && sim.enemies.length < cap * 1.2; i++) {
      const a = sim.rng.range(0, Math.PI * 2);
      const m = spawnEnemy(sim, e.def.spawn ?? 'soldier', e.x + Math.cos(a) * e.r * 1.2, e.y + Math.sin(a) * e.r * 1.2, 1);
      if (m) m.spawnT = 0.25;
    }
  }
  if (e.def.fireCd) shootLogic(sim, e, tgt, dt);
}
