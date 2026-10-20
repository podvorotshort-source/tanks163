// Активные способности (до 3 у игрока).

import type { Sim } from './sim';
import type { Player, Enemy } from './entities';
import { Zone, Drone } from './entities';
import { ABILITIES } from './content/classes';
import { explode, chainLightning, damageEnemy } from './combat';
import { barrage, dropMine, beamHit, lobShot } from './playerRun';
import { makeProp } from './props';

const tmpE: Enemy[] = [];

export function abilityCooldown(p: Player, slot: number): number {
  const a = p.abilities[slot];
  if (!a) return 0;
  const d = ABILITIES[a.id];
  let cd = d.cd * p.stats.abilityCd;
  // «Перезарядка −20%» в уровнях — у большинства способностей на 2-м или 3-м улучшении.
  const cdLevel: Record<string, number> = {
    dash: 2, volley: 4, fortress: 3, repair: 3, airstrike: 4, emp: 4, shockwave: 4, minefield: 4, overdrive: 3, drone: 99, wall: 4, gravity: 4, magma: 4,
    laserBeam: 4, tornado: 4, iceFront: 4, grad: 4, rotor: 4, carpetBomb: 4, mainBattery: 4, garrison: 99,
  };
  if (a.level >= (cdLevel[a.id] ?? 99)) cd *= 0.8;
  return cd;
}

export function updateAbilities(sim: Sim, p: Player, dt: number): void {
  for (let i = 0; i < p.abilities.length; i++) {
    const a = p.abilities[i];
    const max = a.id === 'dash' && a.level >= 3 ? 2 : 1;
    if (a.charges < max) {
      a.t -= dt;
      if (a.t <= 0) { a.charges++; if (a.charges < max) a.t = abilityCooldown(p, i); else a.t = 0; }
    }
    if (a.active > 0) a.active -= dt;
  }
  if (p.fortressT > 0) {
    p.fortressT -= dt;
    // Отталкивание врагов вокруг.
    sim.enemiesNear(p.x, p.y, sim.size * 1.3, tmpE);
    for (const e of tmpE) {
      if (e.dead || e.air || e.noCrush) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * sim.size * 2 * dt; e.y += (dy / d) * sim.size * 2 * dt;
    }
    if (p.fortressT <= 0) {
      const a = p.ability('fortress');
      if (a && a.level >= 4) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25);
    }
  }
  if (p.overdriveT > 0) p.overdriveT -= dt;
  updateTrophies(sim, p, dt);
}

/** Длящиеся трофейные способности: луч Пульт-тирана, ротор «Крота», второй пакет «Града». */
function updateTrophies(sim: Sim, p: Player, dt: number): void {
  const size = sim.size, pw = sim.tankPower(), st = p.stats;
  if (p.beamT > 0) {
    p.beamT -= dt;
    const a = p.ability('laserBeam'), L = a?.level ?? 1;
    if ((sim.tick & 3) === 0) {
      const k = L >= 5 ? 1.4 : 1, len = size * 11 * k;
      const mx = p.x + Math.cos(p.turret) * size * 0.6, my = p.y + Math.sin(p.turret) * size * 0.6;
      beamHit(sim, p, mx, my, p.turret, len, size * 0.32 * k, 70 * pw * st.dmg * (L >= 3 ? 1.3 : 1) * (4 / 60), 'energy', 99, true, 'laserBeam', 0.09);
    }
  }
  if (p.rotorT > 0) {
    p.rotorT -= dt;
    const a = p.ability('rotor'), L = a?.level ?? 1;
    if ((sim.tick % 9) === 0) {
      const R = size * 0.8 * (L >= 5 ? 1.4 : 1);
      const cx = p.x + Math.cos(p.angle) * size * 0.85, cy = p.y + Math.sin(p.angle) * size * 0.85;
      explode(sim, cx, cy, R, 48 * pw * st.dmg * (L >= 3 ? 1.3 : 1) * 0.15, 'blade', p.idx, '', { kind: 'he', knock: L >= 5 ? 1.5 : 0.3, props: 2, silent: true });
    }
  }
  if (p.gradT > 0) {
    p.gradT -= dt;
    if (p.gradT <= 0) gradSalvo(sim, p, p.ability('grad')?.level ?? 1);
  }
}

function gradSalvo(sim: Sim, p: Player, L: number): void {
  const size = sim.size, pw = sim.tankPower(), st = p.stats;
  const t = densest(sim, p.x, p.y, size * 11) ?? { x: p.x + Math.cos(p.turret) * size * 5, y: p.y + Math.sin(p.turret) * size * 5 };
  barrage(sim, p, t.x, t.y, 20 + (L >= 2 ? 8 : 0), 22 * pw * st.dmg * (L >= 3 ? 1.3 : 1), size * 1.0 * st.blast, 'rocket', 'grad', 3.2);
}

/** Попытка применить способность из слота. */
export function useAbility(sim: Sim, p: Player, slot: number): boolean {
  const a = p.abilities[slot];
  if (!a || a.charges <= 0 || p.state !== 'alive') return false;
  a.charges--;
  if (a.t <= 0) a.t = abilityCooldown(p, slot);
  const size = sim.size, pw = sim.tankPower(), st = p.stats, L = a.level;
  const dur = (base: number) => base * st.duration;
  const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
  switch (a.id) {
    case 'dash': {
      const speed = p.cls.speed * st.speed * size * 4.6 * (L >= 4 ? 1.3 : 1);
      let dx = p.vx, dy = p.vy;
      const m = Math.hypot(dx, dy);
      if (m < 1) { dx = fx; dy = fy; } else { dx /= m; dy /= m; }
      p.dashVx = dx * speed; p.dashVy = dy * speed;
      p.dashT = 0.24;
      p.angle = Math.atan2(dy, dx);
      if (p.mods.has('syn_firetrail')) {
        const dps = 7 * pw * st.burn * st.dmg;
        for (let k = 0; k < 6; k++) sim.fire.ignite(p.x + dx * speed * 0.04 * k, p.y + dy * speed * 0.04 * k, size * 0.6, 4 * st.duration, dps, p.idx, true);
      }
      break;
    }
    case 'volley': {
      const n = 16 + (L >= 2 ? 6 : 0);
      const dmg = 28 * pw * st.dmg * (L >= 3 ? 1.35 : 1);
      const ring = (k: number) => {
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + k * 0.13;
          const sh = sim.makeShot();
          sh.team = 0; sh.owner = p.idx; sh.w = 'volley'; sh.dmgType = 'he'; sh.kind = 'volley'; sh.tier = sim.stageIdx;
          sh.x = sh.px = p.x; sh.y = sh.py = p.y;
          const sp = size * 9;
          sh.vx = Math.cos(ang) * sp; sh.vy = Math.sin(ang) * sp;
          sh.dmg = dmg; sh.blast = size * 1.3 * st.blast; sh.life = (size * 6) / sp + k * 0.15; sh.r = size * 0.08; sh.size = size * 0.22;
        }
      };
      ring(0);
      if (L >= 5) ring(1);
      break;
    }
    case 'magma': {
      // Двойная пушка поглощённого генерала: веер раскалённых снарядов по направлению башни, на месте взрывов — магма.
      const n = 6 + (L >= 2 ? 2 : 0);
      const dmg = 34 * pw * st.dmg * (L >= 3 ? 1.3 : 1);
      for (let i = 0; i < n; i++) {
        const ang = p.turret + (i / (n - 1) - 0.5) * 0.62;
        const sh = sim.makeShot();
        sh.team = 0; sh.owner = p.idx; sh.w = 'magma'; sh.dmgType = 'he'; sh.kind = 'magma'; sh.tier = sim.stageIdx;
        const L0 = size * 0.55;
        sh.x = sh.px = p.x + Math.cos(ang) * L0; sh.y = sh.py = p.y + Math.sin(ang) * L0;
        const sp = size * 10;
        sh.vx = Math.cos(ang) * sp; sh.vy = Math.sin(ang) * sp;
        sh.dmg = dmg; sh.blast = size * 1.1 * st.blast * (L >= 5 ? 1.3 : 1); sh.incendiary = true;
        sh.life = ((size * 7) / sp) * (0.75 + (i % 2) * 0.3); sh.r = size * 0.1; sh.size = size * 0.26;
      }
      sim.emit({ t: 'shot', x: p.x, y: p.y, a: p.turret, w: 'he', p: p.idx, size: size * 0.5, tier: sim.stageIdx });
      break;
    }
    case 'fortress':
      p.fortressT = dur(3 + (L >= 2 ? 1 : 0) + (L >= 5 ? 1 : 0));
      break;
    // --- трофеи боссов ---
    case 'laserBeam':
      p.beamT = dur(2 + (L >= 2 ? 0.6 : 0));
      break;
    case 'tornado': {
      const n = L >= 5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const ang = p.turret + (n > 1 ? (i - 0.5) * 0.5 : 0);
        const z = new Zone();
        z.kind = 'tornado'; z.owner = p.idx; z.team = 0;
        z.x = p.x + Math.cos(ang) * size * 1.2; z.y = p.y + Math.sin(ang) * size * 1.2;
        z.r = size * 1.6 * st.blast; z.dur = dur(4 + (L >= 2 ? 1.5 : 0));
        z.dps = 45 * pw * st.dmg * (L >= 3 ? 1.3 : 1);
        z.data = [Math.cos(ang) * size * 2.2, Math.sin(ang) * size * 2.2];
        sim.zones.push(z);
      }
      break;
    }
    case 'iceFront': {
      const R = size * 6.5, half = L >= 2 ? 0.85 : 0.65, stun = dur(2.5 + (L >= 5 ? 1.5 : 0));
      sim.enemiesNear(p.x, p.y, R, tmpE);
      for (const e of tmpE.slice()) {
        if (e.dead) continue;
        let da = Math.atan2(e.y - p.y, e.x - p.x) - p.turret;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > half) continue;
        const k = e.noCrush ? 0.3 : 1;
        e.stunT = Math.max(e.stunT, stun * k); e.frozenT = Math.max(e.frozenT, stun * k); e.slowT = Math.max(e.slowT, stun + 2);
        damageEnemy(sim, e, 36 * pw * st.dmg * (L >= 3 ? 1.3 : 1), 'cold', p.idx, '');
      }
      for (const s of sim.shots) {
        if (s.team !== 1 || s.dead || (s.x - p.x) ** 2 + (s.y - p.y) ** 2 > R * R) continue;
        let da = Math.atan2(s.y - p.y, s.x - p.x) - p.turret;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) <= half) s.dead = true;
      }
      sim.emit({ t: 'cone', x: p.x, y: p.y, a: p.turret, half, r: R, kind: 'ice' });
      break;
    }
    case 'grad':
      gradSalvo(sim, p, L);
      if (L >= 5) p.gradT = 0.9;
      break;
    case 'rotor':
      p.rotorT = dur(3 + (L >= 2 ? 1 : 0));
      break;
    case 'carpetBomb': {
      const lines = L >= 5 ? [-0.35, 0, 0.35] : [0];
      const n = 10 + (L >= 2 ? 4 : 0);
      for (const off of lines) for (let i = 0; i < n; i++) {
        const a = p.turret + off, d = size * (1.6 + i * 0.85);
        lobShot(sim, p, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 0.35 + i * 0.11, 30 * pw * st.dmg * (L >= 3 ? 1.3 : 1), size * 1.1 * st.blast, 'he', 'carpetBomb', 'bomb');
      }
      break;
    }
    case 'mainBattery': {
      const n = 3 + (L >= 2 ? 1 : 0);
      sim.enemiesNear(p.x, p.y, size * 14, tmpE);
      const big = tmpE.filter(e => !e.dead && e.spawnT <= 0).sort((u, v) => v.maxHp - u.maxHp).slice(0, n);
      for (let i = 0; i < n; i++) {
        const e = big.length ? big[i % big.length] : null;
        const j = e && i >= big.length ? 1 : 0;
        const tx = e ? e.x + j * sim.rng.range(-1, 1) * size * 2 : p.x + Math.cos(p.turret) * size * (5 + i * 2);
        const ty = e ? e.y + j * sim.rng.range(-1, 1) * size * 2 : p.y + Math.sin(p.turret) * size * (5 + i * 2);
        lobShot(sim, p, tx, ty, 1.0 + i * 0.18, 150 * pw * st.dmg * (L >= 3 ? 1.3 : 1), size * 2.4 * st.blast, 'he', 'mainBattery', 'big', L >= 5);
      }
      break;
    }
    case 'garrison': {
      const n = 3 + (L >= 4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const d = new Drone();
        const ang = p.angle + (i / n) * Math.PI * 2 + Math.PI / n;
        d.owner = p.idx; d.fixed = true; d.a = ang;
        d.x = p.x + Math.cos(ang) * size * 2.2; d.y = p.y + Math.sin(ang) * size * 2.2;
        d.t = dur(14 + (L >= 2 ? 5 : 0));
        d.dmg = 8 * pw * st.dmg * (L >= 3 ? 1.4 : 1); d.rockets = L >= 5;
        sim.drones.push(d);
      }
      break;
    }
    case 'repair': {
      const heal = 0.35 + (L >= 2 ? 0.1 : 0);
      const T = 3;
      p.repairT = T; p.repairRate = (p.maxHp * heal) / T;
      const R = size * 6 * (L >= 4 ? 2 : 1);
      for (const q of sim.players) if (q !== p && q.state === 'alive' && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < R * R) { q.repairT = T; q.repairRate = (q.maxHp * heal) / T; }
      break;
    }
    case 'airstrike': {
      const t = densest(sim, p.x, p.y, size * 10) ?? { x: p.x + fx * size * 4, y: p.y + fy * size * 4 };
      barrage(sim, p, t.x, t.y, 10 + (L >= 2 ? 4 : 0), 34 * pw * st.dmg * (L >= 3 ? 1.3 : 1), size * 1.3 * st.blast, 'he', 'airstrike', 2.6, L >= 5);
      break;
    }
    case 'emp': {
      const R = size * 6 * (L >= 2 ? 1.25 : 1);
      const stun = dur(2.5 + (L >= 3 ? 1 : 0));
      sim.enemiesNear(p.x, p.y, R, tmpE);
      for (const e of tmpE.slice()) {
        if (e.dead) continue;
        if (!e.noCrush) e.stunT = Math.max(e.stunT, stun); else e.stunT = Math.max(e.stunT, stun * 0.3);
        // Урон через «тесла»-тип, двойной по авиации.
        chainLightning(sim, p.x, p.y, e, 0, 0, 20 * pw * st.dmg * (e.air ? 2 : 1), 0, p.idx);
      }
      for (const s of sim.shots) if (s.team === 1 && !s.dead && (s.x - p.x) ** 2 + (s.y - p.y) ** 2 < R * R) s.dead = true;
      sim.emit({ t: 'boom', x: p.x, y: p.y, r: R, kind: 'tesla', p: p.idx });
      break;
    }
    case 'shockwave': {
      const R = size * 4 * (L >= 2 ? 1.25 : 1) * st.blast;
      explode(sim, p.x, p.y, R, 30 * pw * st.dmg * (L >= 3 ? 1.4 : 1), 'he', p.idx, '', { kind: 'big', knock: 4, props: 3 });
      if (L >= 5) { sim.enemiesNear(p.x, p.y, R, tmpE); for (const e of tmpE) if (!e.dead) e.stunT = Math.max(e.stunT, 1); }
      break;
    }
    case 'minefield': {
      const n = 8 + (L >= 2 ? 4 : 0);
      const rings = L >= 5 ? 2 : 1;
      for (let k = 0; k < rings; k++) for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + k * 0.4;
        const r = size * (1.8 + k * 1.2);
        dropMine(sim, p, p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, L >= 3 ? 1.3 : 1);
      }
      break;
    }
    case 'overdrive':
      p.overdriveT = dur(5 + (L >= 2 ? 1.5 : 0));
      if (L >= 4) p.invulnT = Math.max(p.invulnT, 1);
      break;
    case 'drone': {
      const n = L >= 4 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const d = new Drone();
        d.owner = p.idx; d.x = p.x; d.y = p.y; d.t = dur(12 + (L >= 2 ? 4 : 0)); d.a = i * Math.PI;
        d.dmg = 5 * pw * st.dmg * (L >= 3 ? 1.4 : 1); d.rockets = L >= 5;
        sim.drones.push(d);
      }
      break;
    }
    case 'wall': {
      const n = 7 + (L >= 2 ? 4 : 0);
      const R = size * 2.2, bs = size * 0.55;
      for (let i = 0; i < n; i++) {
        const ang = p.angle + ((i - (n - 1) / 2) / n) * Math.PI * 0.9;
        const x = p.x + Math.cos(ang) * R, y = p.y + Math.sin(ang) * R;
        const pr = makeProp('steelWall', 'steel', x, y, bs, bs, 1e12, { ttl: dur(12 + (L >= 3 ? 6 : 0)), friendly: true, v: L >= 5 ? 1 : 0 });
        sim.props.add(pr);
      }
      break;
    }
    case 'gravity': {
      const t = densest(sim, p.x, p.y, size * 8) ?? { x: p.x + fx * size * 5, y: p.y + fy * size * 5 };
      const z = new Zone();
      z.kind = 'gravity'; z.x = t.x; z.y = t.y; z.r = size * 3.5 * (L >= 2 ? 1.25 : 1) * st.blast; z.dur = dur(3 + (L >= 5 ? 1.5 : 0)); z.owner = p.idx;
      z.power = 50 * pw * st.dmg * (L >= 3 ? 1.4 : 1);
      sim.zones.push(z);
      break;
    }
  }
  a.active = ABILITIES[a.id].dur;
  sim.emit({ t: 'ability', id: a.id, p: p.idx, x: p.x, y: p.y });
  return true;
}

/** Самое плотное скопление врагов в радиусе. */
export function densest(sim: Sim, x: number, y: number, R: number): { x: number; y: number } | null {
  sim.enemiesNear(x, y, R, tmpE);
  const cands = tmpE.filter(e => !e.dead).slice(0, 24);
  if (!cands.length) return null;
  let best = cands[0], bs = -1;
  const near: Enemy[] = [];
  for (const c of cands) {
    sim.enemiesNear(c.x, c.y, sim.size * 2, near);
    const s = near.length + (c === sim.boss ? 4 : 0);
    if (s > bs) { bs = s; best = c; }
  }
  return { x: best.x, y: best.y };
}
