// Игроки: движение, давка, автоматическое оружие, спасение и возрождение.

import type { Sim, PlayerCmd } from './sim';
import type { Player, WeaponInst, Enemy } from './entities';
import { Mine } from './entities';
import { rotateTowards, angleDiff, clamp } from '../core/math';
import { WEAPONS } from './content/weapons';
import { EFFECT, type DmgType } from './types';
import { MATS, pushOut, type Prop } from './props';
import { damageEnemy, killEnemy, breakProp, explode, chainLightning, loseLife, applyBurn } from './combat';
import { useAbility, updateAbilities } from './abilities';

const tmpE: Enemy[] = [];
const tmpP: Prop[] = [];

/** Порог давки препятствий (доля размера танка). */
export const PROP_CRUSH = 0.22;

export function updatePlayers(sim: Sim, cmds: PlayerCmd[], dt: number): void {
  for (const p of sim.players) {
    p.px = p.x; p.py = p.y;
    const cmd = cmds[p.idx] ?? { mx: 0, my: 0, a: [false, false, false] };
    if (p.invulnT > 0) p.invulnT -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.slowT > 0) p.slowT -= dt;
    switch (p.state) {
      case 'alive':
        updateAbilities(sim, p, dt);
        for (let i = 0; i < 3; i++) if (cmd.a[i]) useAbility(sim, p, i);
        movePlayer(sim, p, cmd, dt);
        fireWeapons(sim, p, dt);
        if (p.stats.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p.stats.regen * dt);
        if (p.repairT > 0) { p.repairT -= dt; p.hp = Math.min(p.maxHp, p.hp + p.repairRate * dt); }
        break;
      case 'down':
        updateDown(sim, p, dt);
        break;
      case 'dead':
        p.respawnT -= dt;
        if (p.respawnT <= 0) respawn(sim, p);
        break;
      case 'out':
        break;
    }
  }
  if (sim.players.length > 1) collidePlayers(sim, dt);
}

// ---------------------------------------------------------------------------
// Столкновения танков игроков: тяжёлый толкает лёгкого
// ---------------------------------------------------------------------------

/** Масса танка при толчке: класс × рывок / несокрушимость / отвал / форсаж; подбитый — тяжёлые обломки. */
export function playerMass(p: Player): number {
  let m = p.cls.mass;
  if (p.state === 'down') m *= 1.5;
  if (p.fortressT > 0) m = Math.max(m * 6, 40); // несокрушимость — якорь
  if (p.dashT > 0) m *= 4;
  if (p.hasWeapon('ram')) m *= 1.35;
  if (p.overdriveT > 0) m *= 1.25;
  return m;
}

/** Радиус «тела» при столкновении игроков: корпус тяжёлого длиннее круга коллизии. */
const BODY_K: Record<string, number> = { scout: 0.95, assault: 1.05, heavy: 1.18 };
const bodyR = (p: Player) => p.r * (BODY_K[p.classId] ?? 1);

function collidePlayers(sim: Sim, dt: number): void {
  const ps = sim.players.filter(p => p.state === 'alive' || p.state === 'down');
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    if (a.state === 'down' && b.state === 'down') continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.001, ov = bodyR(a) + bodyR(b) - d;
    if (ov <= 0) continue;
    const nx = dx / d, ny = dy / d;
    const ma = playerMass(a), mb = playerMass(b);
    let ka = mb / (ma + mb), kb = ma / (ma + mb);
    // Скорость сближения: тяжёлый передаёт лёгкому часть хода (толчок ощущается, а не только «упор»).
    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    a.x -= nx * ov * ka; a.y -= ny * ov * ka;
    b.x += nx * ov * kb; b.y += ny * ov * kb;
    // Прижатый к стене не проходит сквозь неё: второй проход, прижатый — неподвижен.
    const wa = unstick(sim, a), wb = unstick(sim, b);
    if (wa || wb) {
      const d2 = Math.hypot(b.x - a.x, b.y - a.y) || 0.001, ov2 = bodyR(a) + bodyR(b) - d2;
      if (ov2 > 0) {
        ka = wa && !wb ? 0 : wb && !wa ? 1 : 0.5; kb = 1 - ka;
        const mx = (b.x - a.x) / d2, my = (b.y - a.y) / d2;
        a.x -= mx * ov2 * ka; a.y -= my * ov2 * ka;
        b.x += mx * ov2 * kb; b.y += my * ov2 * kb;
      }
    }
    if (rel > 0) {
      if (b.state === 'alive') { b.vx += nx * rel * kb * 0.6; b.vy += ny * rel * kb * 0.6; }
      if (a.state === 'alive') { a.vx -= nx * rel * ka * 0.6; a.vy -= ny * rel * ka * 0.6; }
      const force = rel / sim.size;
      if (force > 1.2 && a.bumpT <= 0 && b.bumpT <= 0) {
        a.bumpT = b.bumpT = 0.35;
        sim.emit({ t: 'bump', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, force });
      }
    }
    const s = sim.stage;
    for (const p of [a, b]) { p.x = clamp(p.x, p.r, s.w - p.r); p.y = clamp(p.y, p.r, s.h - p.r); }
  }
  for (const p of ps) if (p.bumpT > 0) p.bumpT -= dt;
}

/** Выталкивает танк из твёрдых препятствий; true — если упёрся. */
function unstick(sim: Sim, p: Player): boolean {
  let hit = false;
  sim.props.queryCircle(p.x, p.y, p.r, tmpP);
  for (const pr of tmpP) {
    if (pr.dead || !MATS[pr.mat].move) continue;
    if (pr.friendly && pr.ttl !== undefined) continue;
    const po = pushOut(p.x, p.y, p.r, pr);
    if (po) { p.x += po[0]; p.y += po[1]; hit = true; }
  }
  return hit;
}

// ---------------------------------------------------------------------------
// Движение
// ---------------------------------------------------------------------------

function movePlayer(sim: Sim, p: Player, cmd: PlayerCmd, dt: number): void {
  const size = sim.size;
  let speed = p.cls.speed * p.stats.speed * size;
  if (p.overdriveT > 0) speed *= 1.5;
  if (p.slowT > 0) speed *= 1 - p.slowAmt;
  let mx = cmd.mx, my = cmd.my;
  const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  const tvx = mx * speed, tvy = my * speed;
  const acc = Math.min(1, dt * 12);
  p.vx += (tvx - p.vx) * acc;
  p.vy += (tvy - p.vy) * acc;
  p.moving = m > 0.1;
  if (p.moving) p.angle = rotateTowards(p.angle, Math.atan2(my, mx), p.cls.turn * dt);
  let vx = p.vx, vy = p.vy;
  if (p.dashT > 0) { vx = p.dashVx; vy = p.dashVy; p.dashT -= dt; if (p.dashT <= 0) onDashEnd(sim, p); }
  p.x += vx * dt;
  p.y += vy * dt;
  p.treadDist += Math.hypot(vx, vy) * dt;

  // Препятствия: давка мелких, выталкивание из крупных.
  const dozer = p.mods.has('rm_dozer') ? 2 : 1;
  const crushLimit = size * PROP_CRUSH * dozer * (p.hasWeapon('ram') ? 1.3 : 1);
  sim.props.queryCircle(p.x, p.y, p.r, tmpP);
  for (const pr of tmpP) {
    const mat = MATS[pr.mat];
    if (!mat.move || pr.dead) continue;
    if (!mat.solid && pr.size <= crushLimit) {
      breakProp(sim, pr);
      sim.emit({ t: 'crush', x: pr.x, y: pr.y, size: pr.size });
      continue;
    }
    if (pr.friendly && pr.ttl !== undefined) continue; // свои стены не мешают
    const po = pushOut(p.x, p.y, p.r, pr);
    if (po) { p.x += po[0]; p.y += po[1]; }
  }

  // Враги: давка и толкание.
  const crush = (p.stats.crush + (p.dashT > 0 ? 0.2 : 0) + (p.fortressT > 0 ? 0.15 : 0) + (p.mods.has('rm_dozer') ? 0.1 : 0) + (p.weapon('ram')?.s.extra ?? 0));
  sim.enemiesNear(p.x, p.y, p.r, tmpE);
  for (const e of tmpE) {
    if (e.dead || e.air || e.spawnT > 0) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 0.001, ov = p.r + e.r - d;
    if (ov <= 0) continue;
    if (!e.noCrush && e.size <= size * crush) {
      killEnemy(sim, e, p.idx, '', true);
      sim.emit({ t: 'crush', x: e.x, y: e.y, size: e.size });
      if (p.mods.has('syn_rammine') && p.seismicT <= 0) { dropMine(sim, p, e.x, e.y); p.seismicT = 1; }
      continue;
    }
    // Масса по площади: тяжёлый враг толкает танк сильнее.
    const mp = size * size * (p.classId === 'heavy' ? 1.6 : 1), me = e.size * e.size;
    const kp = me / (mp + me), ke = mp / (mp + me);
    const nx = dx / d, ny = dy / d;
    p.x -= nx * ov * kp; p.y -= ny * ov * kp;
    e.x += nx * ov * ke; e.y += ny * ov * ke;
    // Таран: урон при касании.
    const ram = p.weapon('ram');
    if (ram || p.fortressT > 0) {
      e.contactT -= 0;
      if (p.contactT <= 0) {
        const fort = p.fortressT > 0 ? ((p.ability('fortress')?.level ?? 1) >= 5 ? 4.5 : 3) : 1;
        const base = (ram ? ram.s.dmg : 6) * sim.tankPower() * p.stats.dmg * fort * (p.mods.has('rm_spikes') ? 2 : 1);
        damageEnemy(sim, e, base, 'ram', p.idx, ram ? 'ram' : '');
        const kb = (ram ? ram.s.extra2 : 1) * size * 0.35;
        e.x += nx * kb; e.y += ny * kb;
        if (p.mods.has('syn_rammine') && p.seismicT <= 0) { dropMine(sim, p, p.x - Math.cos(p.angle) * p.r, p.y - Math.sin(p.angle) * p.r); p.seismicT = 1; }
      }
    }
  }
  if (p.contactT > 0) p.contactT -= dt; else if (p.weapon('ram') || p.fortressT > 0) p.contactT = p.weapon('ram')?.s.cd ?? 0.25;
  if (p.seismicT > 0) p.seismicT -= dt;

  // Границы арены и удержание в кадре вдвоём.
  const s = sim.stage;
  p.x = clamp(p.x, p.r, s.w - p.r);
  p.y = clamp(p.y, p.r, s.h - p.r);
  if (sim.players.length > 1) {
    const [hw, hh] = sim.viewHalf();
    const other = sim.players.find(q => q !== p && (q.state === 'alive' || q.state === 'down'));
    if (other) {
      const mx2 = hw * 1.8 - p.r * 2, my2 = hh * 1.8 - p.r * 2;
      p.x = clamp(p.x, other.x - mx2, other.x + mx2);
      p.y = clamp(p.y, other.y - my2, other.y + my2);
    }
  }
}

function onDashEnd(sim: Sim, p: Player): void {
  const a = p.ability('dash');
  if (a && a.level >= 5) explode(sim, p.x, p.y, sim.size * 2.4 * p.stats.blast, 24 * sim.tankPower() * p.stats.dmg, 'he', p.idx, '', { kind: 'he', knock: 1.5 });
}

// ---------------------------------------------------------------------------
// Оружие
// ---------------------------------------------------------------------------

const ARMOR_RANK: Record<string, number> = { heavy: 4, structure: 3, medium: 2, air: 1, light: 0 };

/** Насколько цель опасна (для «гущи врагов»): стрелки и крупные — важнее мелочи. */
function threatWeight(e: Enemy): number {
  const b = e.def.behavior;
  let w = b === 'shooter' || b === 'artillery' || b === 'spawner' ? 1.6 : b === 'swarm' ? 0.55 : 1;
  if (e.elite) w += 1;
  if (e.armor === 'heavy') w *= 0.8;
  return w;
}

function canHit(type: DmgType, e: Enemy): boolean {
  return EFFECT[type][e.armor] > 0;
}

/**
 * Приоритет целей (решение пользователя): сначала босс, затем командир, затем элита, затем остальные —
 * сильнейшие первыми. Сила — полоса по максимальной прочности (×2 на полосу), чтобы почти равных
 * врагов дальше выбирало правило самого оружия (броня, гуща, близость).
 */
export function targetKey(sim: Sim, e: Enemy): number {
  const tier = e === sim.boss ? 4 : e.elite && e.bonus ? 3 : e.elite ? 2 : 1;
  const band = Math.max(0, Math.floor(Math.log2(1 + e.maxHp / Math.max(1e-9, sim.tankPower()))));
  return tier * 100 + band;
}

const cand: Enemy[] = [];

/** Выбор цели: сначала по приоритету (targetKey), среди равных — по правилу оружия. */
export function pickTarget(sim: Sim, p: Player, mode: string, range: number, type: DmgType, blast = 0): Enemy | null {
  sim.enemiesNear(p.x, p.y, range, tmpE);
  const r2 = range * range;
  // Кандидаты в зоне действия орудия с наивысшим приоритетом.
  let top = -1;
  cand.length = 0;
  for (const e of tmpE) {
    if (e.dead || e.spawnT > 0 || !canHit(type, e)) continue;
    const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d2 > r2 + e.r * e.r) continue;
    const k = targetKey(sim, e);
    if (k > top) { top = k; cand.length = 0; }
    if (k === top) cand.push(e);
  }
  if (!cand.length) return null;
  if (cand.length === 1) return cand[0];
  let best: Enemy | null = null, bs = -Infinity;
  if (mode === 'cluster') {
    // Среди равных — где гуще враги в радиусе взрыва (ближайшие 14 кандидатов).
    const list = cand.length > 14 ? cand.slice().sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2)).slice(0, 14) : cand;
    const br = Math.max(blast, sim.size * 0.8);
    const near: Enemy[] = [];
    for (const c of list) {
      sim.enemiesNear(c.x, c.y, br, near);
      let score = 0;
      for (const n of near) if (!n.dead) score += threatWeight(n);
      score -= Math.sqrt((c.x - p.x) ** 2 + (c.y - p.y) ** 2) / range * 0.5;
      if (score > bs) { bs = score; best = c; }
    }
    return best;
  }
  for (const e of cand) {
    const dn = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2) / range;
    let s: number;
    switch (mode) {
      case 'armored': s = ARMOR_RANK[e.armor] * 2 + Math.min(3, e.pw / sim.tankPower()) - dn * 2.5; break;
      case 'far': s = Math.log(1 + e.maxHp / sim.tankPower()) + (e.markT > 0 ? 6 : 0) + dn * 0.5; break;
      default: s = Math.log(1 + e.maxHp / sim.tankPower()) * 0.5 - dn + (e.armor === 'light' && type === 'mg' ? 0.15 : 0);
    }
    if (s > bs) { bs = s; best = e; }
  }
  return best;
}

function muzzle(sim: Sim, p: Player, main: boolean, ang: number, slot: number): [number, number] {
  if (main) {
    const L = sim.size * 0.62;
    return [p.x + Math.cos(ang) * L, p.y + Math.sin(ang) * L];
  }
  // Навесные модули: примерно по бортам/корме.
  const side = slot % 2 ? 1 : -1, back = slot <= 2 ? -0.35 : 0.1;
  const c = Math.cos(p.angle), s = Math.sin(p.angle);
  const ox = back * sim.size, oy = side * sim.size * 0.33;
  return [p.x + ox * c - oy * s, p.y + ox * s + oy * c];
}

function fireWeapons(sim: Sim, p: Player, dt: number): void {
  const od = p.overdriveT > 0 ? (1 / 0.6) * ((p.ability('overdrive')?.level ?? 0) >= 5 ? 1.15 : 1) : 1;
  let mainTarget: Enemy | null = null;
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i];
    const main = i === 0;
    w.t -= dt * od;
    if (w.queue > 0) {
      w.queueT -= dt;
      if (w.queueT <= 0) {
        w.queue--;
        w.queueT = w.id === 'rockets' ? 0.09 : 0.13;
        const tgt = pickTarget(sim, p, WEAPONS[w.id].targeting, w.s.range * sim.size, WEAPONS[w.id].dmgType, w.s.radius * sim.size);
        if (tgt || w.id === 'rockets') fireOnce(sim, p, w, tgt, main, i, 0);
      }
    }
    if (w.id === 'mines') { if (w.t <= 0) { w.t = w.s.cd; layMines(sim, p, w); } continue; }
    if (w.id === 'ram') { updateSeismic(sim, p, w, dt); continue; }
    const def = WEAPONS[w.id];
    const range = w.s.range * sim.size;
    // Основное орудие: башня ведёт цель постоянно.
    let tgt: Enemy | null = null;
    if (main || w.t <= 0) tgt = pickTarget(sim, p, def.targeting, range, def.dmgType, w.s.radius * sim.size);
    if (main) {
      mainTarget = tgt;
      let aim = p.angle;
      if (tgt) aim = leadAngle(sim, p, tgt, w);
      p.turret = rotateTowards(p.turret, tgt ? aim : p.angle, (p.classId === 'heavy' ? 5 : 7) * dt);
      if (!tgt || w.t > 0) continue;
      if (Math.abs(angleDiff(p.turret, aim)) > (w.id === 'flame' ? 0.5 : 0.22)) continue;
    } else if (w.t > 0 || !tgt) {
      if (w.t <= 0) w.t = 0.1;
      continue;
    }
    w.t = w.s.cd;
    w.n++;
    fireOnce(sim, p, w, tgt, main, i, 0);
    if (w.id === 'ap' && w.s.count > 1) { w.queue = w.s.count - 1; w.queueT = 0.14; }
    if (w.id === 'rockets') { w.queue = Math.max(0, Math.round(w.s.count) - 1); w.queueT = 0.09; }
  }
  void mainTarget;
}

function leadAngle(sim: Sim, p: Player, e: Enemy, w: WeaponInst): number {
  const speed = w.s.speed * sim.size;
  const d = Math.hypot(e.x - p.x, e.y - p.y);
  const t = speed > 0 ? Math.min(1.2, d / speed) : 0;
  return Math.atan2(e.y + e.vy * t * 0.85 - p.y, e.x + e.vx * t * 0.85 - p.x);
}

function fireOnce(sim: Sim, p: Player, w: WeaponInst, tgt: Enemy | null, main: boolean, slot: number, _k: number): void {
  const s = w.s, size = sim.size, pw = sim.tankPower();
  const def = WEAPONS[w.id];
  const aim = main ? p.turret : tgt ? leadAngle(sim, p, tgt, w) : p.angle;
  const [mx, my] = muzzle(sim, p, main, aim, slot);
  const tier = sim.stageIdx;
  switch (w.id) {
    case 'ap':
    case 'he':
    case 'mg': {
      const n = w.id === 'ap' ? 1 : Math.max(1, Math.round(s.count));
      for (let k = 0; k < n; k++) {
        let a = aim;
        if (w.id === 'he' && n > 1) a += ((k - (n - 1) / 2) * s.spread * Math.PI) / 180 / Math.max(1, n - 1);
        if (w.id === 'mg') a += sim.rng.range(-1, 1) * (s.spread * Math.PI / 180) * 0.5;
        const sh = sim.makeShot();
        const off = w.id === 'mg' && n > 1 ? (k - (n - 1) / 2) * size * 0.12 : 0;
        sh.team = 0; sh.owner = p.idx; sh.w = w.id; sh.dmgType = def.dmgType; sh.tier = tier;
        sh.x = sh.px = mx - Math.sin(a) * off; sh.y = sh.py = my + Math.cos(a) * off;
        const sp = s.speed * size;
        sh.vx = Math.cos(a) * sp; sh.vy = Math.sin(a) * sp;
        sh.dmg = s.dmg * pw;
        sh.life = (s.range * size * 1.15) / sp;
        sh.pierce = s.pierce;
        sh.blast = s.radius * size;
        sh.r = size * (w.id === 'mg' ? 0.05 : w.id === 'ap' ? 0.07 : 0.09);
        sh.size = size * (w.id === 'mg' ? 0.12 : w.id === 'ap' ? 0.2 : 0.22);
        if (w.id === 'ap') { if (p.mods.has('ap_ricochet')) sh.bounce = 2; if (p.mods.has('ap_mark') || p.mods.has('syn_spotter')) sh.mark = true; }
        if (w.id === 'he') { if (p.mods.has('he_incendiary')) sh.incendiary = true; if (p.mods.has('he_cluster')) sh.cluster = 4; if (p.mods.has('syn_hail')) sh.shrapnel = true; }
        if (w.id === 'mg' && p.mods.has('mg_incendiary') && sim.rng.chance(0.15)) sh.incendiary = true;
        sim.emit({ t: 'shot', w: w.id, x: mx, y: my, a, p: p.idx, size, tier });
      }
      break;
    }
    case 'rockets': {
      // Каждый 3-й залп с «артиллерией» — огневой вал по скоплению.
      if (s.extra >= 1 && w.n % 3 === 0 && w.queue === Math.max(0, Math.round(s.count) - 1) && tgt) {
        barrage(sim, p, tgt.x, tgt.y, 8, s.dmg * pw * 0.9, s.radius * size, 'rocket', 'rockets');
        w.queue = 0;
        break;
      }
      const sh = sim.makeShot();
      const a = aim + sim.rng.range(-0.6, 0.6);
      sh.team = 0; sh.owner = p.idx; sh.w = 'rockets'; sh.dmgType = 'rocket'; sh.tier = tier;
      sh.x = sh.px = mx; sh.y = sh.py = my;
      const sp = s.speed * size * 0.45;
      sh.vx = Math.cos(a) * sp; sh.vy = Math.sin(a) * sp;
      sh.maxSpeed = s.speed * size * (p.mods.has('rk_seeker') ? 1.35 : 1);
      sh.accel = sh.maxSpeed * 2.2;
      sh.turnRate = p.mods.has('rk_seeker') ? 7 : 4.5;
      sh.homing = tgt ? tgt.id : -1;
      sh.dmg = s.dmg * pw;
      sh.life = 3.2;
      sh.blast = s.radius * size;
      sh.r = size * 0.08;
      sh.size = size * 0.26;
      sh.cluster = p.mods.has('rk_cluster') ? 3 : 0;
      if (p.mods.has('syn_thunder')) sh.kind = 'thunder';
      sim.emit({ t: 'shot', w: 'rockets', x: mx, y: my, a, p: p.idx, size, tier });
      break;
    }
    case 'flame': {
      const n = 2;
      for (let k = 0; k < n; k++) {
        const a = aim + sim.rng.range(-0.5, 0.5) * (s.spread * Math.PI / 180);
        const sh = sim.makeShot();
        sh.team = 0; sh.owner = p.idx; sh.w = 'flame'; sh.dmgType = 'fire'; sh.tier = tier;
        sh.x = sh.px = mx; sh.y = sh.py = my;
        const sp = s.speed * size * sim.rng.range(0.85, 1.15);
        sh.vx = Math.cos(a) * sp + p.vx * 0.5; sh.vy = Math.sin(a) * sp + p.vy * 0.5;
        sh.dmg = s.dmg * pw;
        sh.life = (s.range * size) / sp;
        sh.pierce = 999;
        sh.r = size * 0.22;
        sh.size = size * 0.3;
        sh.air = true;
        sh.kind = 'flame';
        sh.incendiary = true;
        // dps горения на цели
        sh.blast = s.extra * pw; sh.lobTotal = s.extra2;
      }
      if (sim.tick % 4 === 0) sim.emit({ t: 'flame', x: mx, y: my, a: aim, spread: s.spread, range: s.range * size, p: p.idx });
      break;
    }
    case 'tesla': {
      if (!tgt) break;
      const ball = p.mods.has('ts_ball') && w.n % 3 === 0;
      if (ball) {
        const sh = sim.makeShot();
        sh.team = 0; sh.owner = p.idx; sh.w = 'tesla'; sh.dmgType = 'tesla'; sh.kind = 'ball'; sh.tier = tier;
        sh.x = sh.px = mx; sh.y = sh.py = my;
        const a = Math.atan2(tgt.y - my, tgt.x - mx), sp = size * 3.2;
        sh.vx = Math.cos(a) * sp; sh.vy = Math.sin(a) * sp;
        sh.dmg = s.dmg * pw * 0.6; sh.life = 3; sh.pierce = 999; sh.r = size * 0.45; sh.size = size * 0.5;
      }
      const n = Math.max(1, Math.round(1 + s.pierce));
      for (let k = 0; k < n; k++) chainLightning(sim, mx, my, k === 0 ? tgt : null, Math.round(s.count), s.extra2 * size, s.dmg * pw, s.extra, p.idx);
      sim.emit({ t: 'shot', w: 'tesla', x: mx, y: my, a: aim, p: p.idx, size, tier });
      break;
    }
  }
}

/** Огневой вал — навесные снаряды по области. */
export function barrage(sim: Sim, p: Player, x: number, y: number, n: number, dmg: number, blast: number, type: DmgType, w: string, spreadK = 2.6, incendiary = false): void {
  for (let i = 0; i < n; i++) {
    const sh = sim.makeShot();
    sh.team = 0; sh.owner = p.idx; sh.w = w; sh.dmgType = type; sh.kind = 'shell';
    const a = sim.rng.range(0, Math.PI * 2), r = Math.sqrt(sim.rng.next()) * sim.size * spreadK;
    sh.lob = true;
    sh.sx = p.x; sh.sy = p.y;
    sh.tx = x + Math.cos(a) * r; sh.ty = y + Math.sin(a) * r;
    sh.x = sh.px = p.x; sh.y = sh.py = p.y;
    sh.lobTotal = 0.9 + i * (0.8 / n) + sim.rng.range(0, 0.15);
    sh.lobT = 0;
    sh.life = sh.lobTotal + 0.1;
    sh.dmg = dmg; sh.blast = blast; sh.size = sim.size * 0.25;
    sh.incendiary = incendiary;
    sim.emit({ t: 'telegraph', x: sh.tx, y: sh.ty, r: blast, dur: sh.lobTotal });
  }
}

export function dropMine(sim: Sim, p: Player, x: number, y: number, dmgK = 1): void {
  const w = p.weapon('mines');
  const base = w ? w.s : { dmg: 44 * p.stats.dmg, radius: 1.35 * p.stats.blast, range: 0.8, extra: 6 };
  const m = new Mine();
  m.x = x; m.y = y; m.owner = p.idx;
  m.dmg = base.dmg * sim.tankPower() * dmgK;
  m.blast = base.radius * sim.size;
  m.trigger = Math.max(base.range, 0.6) * sim.size;
  m.armT = 0.45;
  m.r = sim.size * 0.18;
  m.chain = p.mods.has('mn_chain');
  m.jump = p.mods.has('mn_jump');
  sim.mines.push(m);
  sim.emit({ t: 'mineDrop', x, y });
}

function layMines(sim: Sim, p: Player, w: WeaponInst): void {
  const mine = sim.mines.filter(m => m.owner === p.idx && !m.dead);
  const max = Math.round(w.s.extra);
  const n = Math.max(1, Math.round(w.s.count));
  for (let k = 0; k < n; k++) {
    if (mine.length + k >= max) {
      // Старейшую убираем — кладём новую позади (выгодно при движении).
      const oldest = mine.shift();
      if (oldest) oldest.dead = true; else break;
    }
    const back = sim.size * (0.55 + k * 0.3);
    dropMine(sim, p, p.x - Math.cos(p.angle) * back + (k ? sim.rng.range(-1, 1) * sim.size * 0.2 : 0), p.y - Math.sin(p.angle) * back);
  }
}

function updateSeismic(sim: Sim, p: Player, w: WeaponInst, dt: number): void {
  if (w.s.count < 2) return;
  w.t -= dt;
  if (w.t <= 0) {
    w.t = 4;
    explode(sim, p.x, p.y, sim.size * 2.2 * p.stats.blast, w.s.dmg * 3 * sim.tankPower(), 'ram', p.idx, 'ram', { kind: 'he', knock: 2, props: 2 });
  }
}

// ---------------------------------------------------------------------------
// Спасение и возрождение
// ---------------------------------------------------------------------------

function updateDown(sim: Sim, p: Player, dt: number): void {
  const reviveR = sim.size * 1.8;
  const partner = sim.players.find(q => q !== p && q.state === 'alive' && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 <= reviveR * reviveR);
  const allDown = !sim.players.some(q => q.state === 'alive');
  if (partner) {
    const time = 3 * Math.pow(1.25, p.revivesThisStage) * (1 - sim.meta.revive);
    p.reviveProg += dt / time;
    if (p.reviveProg >= 1) {
      p.state = 'alive';
      p.hp = p.maxHp * 0.5;
      p.invulnT = 2;
      p.revivesThisStage++;
      partner.revivesDone++;
      p.reviveProg = 0;
      sim.emit({ t: 'revived', p: p.idx, x: p.x, y: p.y });
      return;
    }
  } else {
    p.reviveProg = Math.max(0, p.reviveProg - dt * 0.35);
    p.downT -= dt * (allDown ? 4 : 1);
  }
  if (p.downT <= 0) loseLife(sim, p);
}

function respawn(sim: Sim, p: Player): void {
  const mate = sim.players.find(q => q !== p && q.state === 'alive');
  if (mate) {
    p.x = mate.x - Math.cos(mate.angle) * sim.size * 1.6;
    p.y = mate.y - Math.sin(mate.angle) * sim.size * 1.6;
  }
  const s = sim.stage;
  p.x = clamp(p.x, p.r, s.w - p.r); p.y = clamp(p.y, p.r, s.h - p.r);
  p.px = p.x; p.py = p.y;
  p.state = 'alive';
  p.hp = p.maxHp;
  p.invulnT = 3;
  p.vx = p.vy = 0;
  sim.emit({ t: 'respawn', p: p.idx, x: p.x, y: p.y });
}

export { applyBurn };
