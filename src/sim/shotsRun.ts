// Снаряды, мины, зоны эффектов, дроны.

import type { Sim } from './sim';
import type { Enemy, Shot } from './entities';
import { segCircle, angleDiff, rotateTowards } from '../core/math';
import { MATS } from './props';
import type { WeaponId } from './types';
import { damageEnemy, damagePlayer, damageProp, explode, enemyExplode, applyBurn, chainLightning } from './combat';

const tmpE: Enemy[] = [];

export function updateShots(sim: Sim, dt: number): void {
  const frozen = sim.freezeT > 0;
  const st = sim.stage;
  const margin = sim.size * 4;
  for (const s of sim.shots) {
    if (s.dead) continue;
    s.px = s.x; s.py = s.y;
    if (s.team === 1 && frozen) continue;
    s.life -= dt;
    if (s.lob) { updateLob(sim, s, dt); continue; }
    if (s.homing >= 0 || s.maxSpeed > 0) steerRocket(sim, s, dt);
    if (s.kind === 'vortex') vortexPull(sim, s, dt);
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    if (s.team === 0) playerShotStep(sim, s, nx, ny);
    else enemyShotStep(sim, s, nx, ny);
    if (s.dead) continue;
    s.x = nx; s.y = ny;
    if (s.life <= 0) {
      s.dead = true;
      if (s.team === 0 && s.blast > 0 && s.kind !== 'flame') shotExplode(sim, s, s.x, s.y, null);
      if (s.team === 0 && s.kind === 'flame' && sim.rng.chance(0.3)) igniteAt(sim, s, s.x, s.y);
      if (s.team === 1 && s.blast > 0) enemyExplode(sim, s.x, s.y, s.blast, s.dmg, 'enemy');
    }
    if (s.x < -margin || s.y < -margin || s.x > st.w + margin || s.y > st.h + margin) s.dead = true;
  }
}

/** Смерч вихревой пушки: тянет мелких врагов к себе; перемалывает каждого не чаще раза в 0.35 с. */
function vortexPull(sim: Sim, s: Shot, dt: number): void {
  s.t += dt;
  if (s.t > 0.35) { s.t = 0; s.hits.length = 0; }
  const R = s.r * 2.2;
  sim.enemiesNear(s.x, s.y, R, tmpE);
  for (const e of tmpE) {
    if (e.dead || e.noCrush || e.size > sim.size * 1.4) continue;
    const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy) || 1;
    const pull = sim.size * s.lobTotal * (1 - d / (R + e.r));
    if (pull > 0) { e.x += (dx / d) * pull * dt; e.y += (dy / d) * pull * dt; }
  }
}

function updateLob(sim: Sim, s: Shot, dt: number): void {
  s.lobT += dt;
  const t = Math.min(1, s.lobT / s.lobTotal);
  s.x = s.sx + (s.tx - s.sx) * t;
  s.y = s.sy + (s.ty - s.sy) * t;
  if (t < 1) return;
  s.dead = true;
  if (s.team === 0) shotExplode(sim, s, s.tx, s.ty, null);
  else {
    enemyExplode(sim, s.tx, s.ty, s.blast, s.dmg, s.kind === 'icbm' || s.kind === 'orbital' ? 'big' : 'enemy');
    if (s.kind === 'toast' || s.kind === 'icbm') { /* без побочных эффектов */ }
  }
}

function steerRocket(sim: Sim, s: Shot, dt: number): void {
  let tgt: Enemy | undefined;
  if (s.homing >= 0) {
    tgt = sim.enemies.find(e => e.id === s.homing && !e.dead);
    if (!tgt) {
      s.homing = -1;
      const p = s.owner >= 0 ? sim.players[s.owner] : null;
      if (p && p.mods.has('rk_seeker')) {
        sim.enemiesNear(s.x, s.y, sim.size * 7, tmpE);
        let bd = Infinity;
        for (const e of tmpE) { if (e.dead) continue; const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2; if (d < bd) { bd = d; tgt = e; } }
        if (tgt) s.homing = tgt.id;
      }
    }
  }
  const sp = Math.hypot(s.vx, s.vy);
  let a = Math.atan2(s.vy, s.vx);
  if (tgt) a = rotateTowards(a, Math.atan2(tgt.y - s.y, tgt.x - s.x), s.turnRate * dt);
  const ns = Math.min(s.maxSpeed, sp + s.accel * dt);
  s.vx = Math.cos(a) * ns; s.vy = Math.sin(a) * ns;
}

function playerShotStep(sim: Sim, s: Shot, nx: number, ny: number): void {
  const segLen = Math.hypot(nx - s.x, ny - s.y);
  // Ближайший враг на отрезке.
  sim.enemiesNear((s.x + nx) / 2, (s.y + ny) / 2, segLen / 2 + s.r, tmpE);
  let hitE: Enemy | null = null, te = 2;
  for (const e of tmpE) {
    if (e.dead || e.spawnT > 0 || s.hits.includes(e.id)) continue;
    if (e.air && !s.air) continue;
    const t = segCircle(s.x, s.y, nx, ny, e.x, e.y, e.r + s.r);
    if (t >= 0 && t < te) { te = t; hitE = e; }
  }
  // Препятствие на отрезке (свои стены пропускают); смерч идёт сквозь всё.
  const ph = s.kind === 'vortex' ? null : sim.props.raycast(s.x, s.y, nx, ny, s.r * 0.5, pr => MATS[pr.mat].shots && !pr.friendly && !(s.kind === 'flame' && MATS[pr.mat].canopy));
  if (ph && ph.t < te) {
    const hx = s.x + (nx - s.x) * ph.t, hy = s.y + (ny - s.y) * ph.t;
    s.dead = true;
    if (s.kind === 'flame') { damageProp(sim, ph.p, s.dmg * 0.6, 'fire'); igniteAt(sim, s, hx, hy); return; }
    if (s.blast > 0) shotExplode(sim, s, hx, hy, null);
    else damageProp(sim, ph.p, s.dmg, s.dmgType);
    sim.emit({ t: 'hit', x: hx, y: hy, dmg: 0, crit: false, armor: 'structure', w: s.dmgType, tgt: 'enemy', p: s.owner });
    return;
  }
  if (!hitE) return;
  const e = hitE;
  const hx = s.x + (nx - s.x) * te, hy = s.y + (ny - s.y) * te;
  const p = s.owner >= 0 ? sim.players[s.owner] : null;
  if (s.kind === 'flame') {
    s.hits.push(e.id);
    damageEnemy(sim, e, s.dmg, 'fire', s.owner, 'flame', { silent: sim.rng.next() > 0.3 });
    applyBurn(e, s.blast, s.lobTotal, s.owner);
    return;
  }
  if (s.kind === 'vortex') {
    s.hits.push(e.id);
    damageEnemy(sim, e, s.dmg, 'blade', s.owner, 'vortex', { silent: sim.rng.next() > 0.4 });
    return;
  }
  if (s.kind === 'shard') {
    // Криопушка: замедляет; третье попадание подряд замораживает.
    e.slowT = Math.max(e.slowT, 1.6);
    e.chill++; e.chillT = 2;
    if (e.chill >= 3) { e.chill = 0; e.frozenT = Math.max(e.frozenT, s.lobTotal); e.stunT = Math.max(e.stunT, s.lobTotal * (e.noCrush ? 0.25 : 1)); }
  }
  if (s.kind === 'plasma' && s.pierce > 0 && e.armor === 'light') {
    s.hits.push(e.id); s.pierce--;
    damageEnemy(sim, e, s.dmg * 0.6, 'energy', s.owner, 'plasma', { fromX: s.x, fromY: s.y });
    return;
  }
  if (s.kind === 'ball') {
    s.hits.push(e.id);
    chainLightning(sim, hx, hy, e, 1, sim.size * 2, s.dmg, 0.3, s.owner);
    return;
  }
  if (s.blast > 0) {
    s.dead = true;
    if (s.mark) e.markT = 4;
    shotExplode(sim, s, hx, hy, e);
    return;
  }
  // Кинетический снаряд.
  const k = Math.pow(0.85, s.hits.length);
  if (s.mark) e.markT = 4;
  damageEnemy(sim, e, s.dmg * k, s.dmgType, s.owner, s.w as WeaponId, { fromX: s.x, fromY: s.y });
  if (s.incendiary && p) applyBurn(e, 5 * sim.tankPower() * p.stats.burn * p.stats.dmg, 2 * p.stats.duration, s.owner);
  s.hits.push(e.id);
  const passes = s.dmgType === 'ap' ? (e.armor === 'light' || e.armor === 'medium' || e.armor === 'air') : e.armor === 'light';
  if (s.pierce > 0 && passes) { s.pierce--; return; }
  if (s.bounce > 0) {
    s.bounce--;
    sim.enemiesNear(hx, hy, sim.size * 5, tmpE);
    let best: Enemy | null = null, bd = Infinity;
    for (const n of tmpE) { if (n.dead || s.hits.includes(n.id)) continue; const d = (n.x - hx) ** 2 + (n.y - hy) ** 2; if (d < bd) { bd = d; best = n; } }
    if (best) {
      const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(best.y - hy, best.x - hx);
      s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
      s.x = hx; s.y = hy; s.life = Math.max(s.life, 0.6);
      s.dead = false;
      s.px = hx; s.py = hy;
      return;
    }
  }
  s.dead = true;
}

function enemyShotStep(sim: Sim, s: Shot, nx: number, ny: number): void {
  let hitP = null, tp = 2;
  for (const p of sim.players) {
    if (p.state !== 'alive' || s.hits.includes(p.idx)) continue;
    const t = segCircle(s.x, s.y, nx, ny, p.x, p.y, p.r + s.r);
    if (t >= 0 && t < tp) { tp = t; hitP = p; }
  }
  const ph = sim.props.raycast(s.x, s.y, nx, ny, s.r * 0.5, pr => MATS[pr.mat].shots && pr.size > s.size * 0.4);
  if (ph && ph.t < tp) {
    const hx = s.x + (nx - s.x) * ph.t, hy = s.y + (ny - s.y) * ph.t;
    if (ph.p.friendly && ph.p.v === 1) {
      // Отражающая стена: снаряд становится нашим.
      s.team = 0; s.owner = 0; s.vx = -s.vx; s.vy = -s.vy; s.dmgType = 'ap'; s.x = hx; s.y = hy; s.px = hx; s.py = hy;
      s.dmg = 20 * sim.tankPower(); s.hits = [];
      return;
    }
    s.dead = true;
    if (s.blast > 0) enemyExplode(sim, hx, hy, s.blast, s.dmg, 'enemy');
    // Обычный снаряд врага выбивает кирпич (за пару попаданий), сталь ему не по зубам — за ней можно укрыться.
    else if (!ph.p.friendly && ph.p.mat !== 'steel') damageProp(sim, ph.p, s.dmg * 0.8, 'ap');
    return;
  }
  if (!hitP) return;
  if (s.pierce > 0) { s.hits.push(hitP.idx); damagePlayer(sim, hitP, s.dmg, 'shot:' + s.kind); return; }
  s.dead = true;
  if (s.blast > 0) enemyExplode(sim, s.x + (nx - s.x) * tp, s.y + (ny - s.y) * tp, s.blast, s.dmg, 'enemy');
  else damagePlayer(sim, hitP, s.dmg, 'shot:' + s.kind);
}

function igniteAt(sim: Sim, s: Shot, x: number, y: number): void {
  const p = s.owner >= 0 ? sim.players[s.owner] : null;
  if (!p) return;
  const napalm = p.mods.has('fl_napalm');
  sim.fire.ignite(x, y, sim.size * 0.45 * p.stats.fireSpread, (napalm ? 6 : 3) * p.stats.duration, s.blast * 0.7, s.owner, napalm);
}

/** Взрыв снаряда игрока + кассеты, шрапнель, молнии. */
export function shotExplode(sim: Sim, s: Shot, x: number, y: number, direct: Enemy | null): void {
  const kind = s.dmgType === 'rocket' ? 'rocket' : 'he';
  const p = s.owner >= 0 ? sim.players[s.owner] : null;
  explode(sim, x, y, s.blast, s.dmg, s.dmgType, s.owner, (s.w as WeaponId) || '', { kind: s.kind === 'plasma' || sim.stageIdx >= 8 ? 'plasma' : s.kind === 'big' ? 'big' : kind, ignite: s.incendiary });
  void direct;
  if (s.cluster > 0) {
    for (let i = 0; i < s.cluster; i++) {
      const b = sim.makeShot();
      const a = sim.rng.range(0, Math.PI * 2), sp = sim.size * sim.rng.range(3, 5);
      b.team = 0; b.owner = s.owner; b.w = s.w; b.dmgType = s.dmgType; b.kind = 'bomblet'; b.tier = s.tier;
      b.x = b.px = x; b.y = b.py = y; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      b.dmg = s.dmg * 0.35; b.blast = s.blast * 0.55; b.life = sim.rng.range(0.25, 0.45); b.r = sim.size * 0.05; b.size = sim.size * 0.12;
    }
  }
  if (s.shrapnel && p) {
    const mg = p.weapon('mg');
    const dmg = (mg ? mg.s.dmg : 4) * sim.tankPower() * 1.2;
    for (let i = 0; i < 6; i++) {
      const b = sim.makeShot();
      const a = (i / 6) * Math.PI * 2 + sim.rng.range(-0.2, 0.2), sp = sim.size * 16;
      b.team = 0; b.owner = s.owner; b.w = 'mg'; b.dmgType = 'mg'; b.kind = ''; b.tier = s.tier;
      b.x = b.px = x; b.y = b.py = y; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      b.dmg = dmg; b.life = 0.3; b.r = sim.size * 0.05; b.size = sim.size * 0.1; b.pierce = 1;
    }
  }
  if (s.kind === 'thunder' && p) chainLightning(sim, x, y, null, 3, sim.size * 2.5, s.dmg * 0.4, 0.3, s.owner);
}

// ---------------------------------------------------------------------------
// Мины
// ---------------------------------------------------------------------------

export function updateMines(sim: Sim, dt: number): void {
  for (const m of sim.mines) {
    if (m.dead) continue;
    m.life -= dt;
    if (m.life <= 0) { m.dead = true; continue; }
    if (m.armT > 0) { m.armT -= dt; continue; }
    let boom = m.armT === -1;
    if (!boom) {
      sim.enemiesNear(m.x, m.y, m.trigger * (m.jump ? 2.5 : 1), tmpE);
      let near: Enemy | null = null, bd = Infinity;
      for (const e of tmpE) { if (e.dead || e.air || e.spawnT > 0) continue; const d = (e.x - m.x) ** 2 + (e.y - m.y) ** 2; if (d < bd) { bd = d; near = e; } }
      if (near) {
        const d = Math.sqrt(bd);
        if (d <= m.trigger + near.r) boom = true;
        else if (m.jump) { const k = Math.min(1, (sim.size * 5 * dt) / d); m.x += (near.x - m.x) * k; m.y += (near.y - m.y) * k; }
      }
    }
    if (boom) detonateMine(sim, m, 0);
  }
}

function detonateMine(sim: Sim, m: import('./entities').Mine, chain: number): void {
  if (m.dead) return;
  m.dead = true;
  const k = (m.big ? 1.5 : 1) * (1 + chain * 0.2);
  explode(sim, m.x, m.y, m.blast, m.dmg * k, 'mine', m.owner, 'mines', { kind: 'mine', detonate: false });
  if (m.chain && chain < 12) {
    for (const o of sim.mines) {
      if (o.dead || o === m) continue;
      if ((o.x - m.x) ** 2 + (o.y - m.y) ** 2 <= (m.blast * 1.4) ** 2) { o.armT = 0; detonateMine(sim, o, chain + 1); }
    }
  }
}

// ---------------------------------------------------------------------------
// Зоны
// ---------------------------------------------------------------------------

export function updateZones(sim: Sim, dt: number): void {
  for (const z of sim.zones) {
    if (z.dead) continue;
    z.t += dt;
    switch (z.kind) {
      case 'gravity': {
        sim.enemiesNear(z.x, z.y, z.r, tmpE);
        for (const e of tmpE) {
          if (e.dead) continue;
          const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1;
          const pull = sim.size * 7 * (1 - d / (z.r + e.r)) * (e.noCrush ? 0.15 : 1) * (e.size > sim.size * 1.5 ? 0.4 : 1);
          if (pull > 0) { e.x += (dx / d) * pull * dt; e.y += (dy / d) * pull * dt; }
        }
        if (z.t >= z.dur) {
          explode(sim, z.x, z.y, z.r * 0.8, z.power, 'he', z.owner, '', { kind: 'big', knock: 0.5 });
          z.dead = true;
        }
        break;
      }
      case 'tornado': {
        // Смерч Пылесоса-левиафана: идёт вперёд, затягивает и перемалывает.
        z.x += z.data[0] * dt; z.y += z.data[1] * dt;
        const st = sim.stage;
        if (z.x < 0 || z.y < 0 || z.x > st.w || z.y > st.h) { z.data[0] *= -1; z.data[1] *= -1; }
        sim.enemiesNear(z.x, z.y, z.r * 1.6, tmpE);
        for (const e of tmpE) {
          if (e.dead) continue;
          const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1;
          const pull = sim.size * 4 * (1 - d / (z.r * 1.6 + e.r)) * (e.noCrush ? 0.1 : 1) * (e.size > sim.size * 1.5 ? 0.35 : 1);
          if (pull > 0) { e.x += (dx / d) * pull * dt; e.y += (dy / d) * pull * dt; }
        }
        if ((sim.tick % 10) === 0) explode(sim, z.x, z.y, z.r, z.dps / 6, 'blade', z.owner, '', { knock: 0, props: 1.5, silent: true });
        if (z.t >= z.dur) z.dead = true;
        break;
      }
      case 'tar':
      case 'freeze':
        for (const p of sim.players) {
          if (p.state !== 'alive') continue;
          if ((p.x - z.x) ** 2 + (p.y - z.y) ** 2 < (z.r + p.r * 0.5) ** 2) {
            p.slowT = 0.15; p.slowAmt = z.kind === 'tar' ? 0.45 : 0.35;
            if (z.dps > 0) damagePlayer(sim, p, z.dps * dt, 'zone:' + z.kind);
          }
        }
        if (z.t >= z.dur) z.dead = true;
        break;
      case 'hazard':
        if (z.t >= z.dur) {
          z.dead = true;
          if (z.n === 0) {
            // Луч по линии.
            const ex = z.x + Math.cos(z.power) * z.r, ey = z.y + Math.sin(z.power) * z.r;
            for (const p of sim.players) {
              if (p.state !== 'alive') continue;
              if (segCircle(z.x, z.y, ex, ey, p.x, p.y, p.r + (z.data[0] ?? 4)) >= 0) damagePlayer(sim, p, z.dps, 'beam');
            }
            sim.emit({ t: 'arc', pts: [z.x, z.y, ex, ey, -1] });
          } else {
            enemyExplode(sim, z.x, z.y, z.r, z.dps, 'big');
          }
        }
        break;
      default:
        if (z.t >= z.dur) z.dead = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Дроны
// ---------------------------------------------------------------------------

export function updateDrones(sim: Sim, dt: number): void {
  for (const d of sim.drones) {
    d.t -= dt;
    if (d.t <= 0) { d.dead = true; continue; }
    const p = sim.players[d.owner];
    if (!d.fixed) {
      d.a += dt * 2.2;
      const tx = p.x + Math.cos(d.a) * sim.size * 1.9, ty = p.y + Math.sin(d.a) * sim.size * 1.9;
      d.x += (tx - d.x) * Math.min(1, dt * 5);
      d.y += (ty - d.y) * Math.min(1, dt * 5);
    }
    d.fireT -= dt;
    if (d.fireT <= 0) {
      sim.enemiesNear(d.x, d.y, sim.size * 7, tmpE);
      let best: Enemy | null = null, bd = Infinity;
      for (const e of tmpE) { if (e.dead || e.spawnT > 0) continue; const dd = (e.x - d.x) ** 2 + (e.y - d.y) ** 2; if (dd < bd) { bd = dd; best = e; } }
      if (best) {
        d.fireT = 0.16;
        const a = Math.atan2(best.y - d.y, best.x - d.x) + sim.rng.range(-0.05, 0.05);
        const s = sim.makeShot();
        s.team = 0; s.owner = d.owner; s.w = 'drone'; s.dmgType = 'mg'; s.kind = '';
        s.x = s.px = d.x; s.y = s.py = d.y;
        const sp = sim.size * 18;
        s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
        s.dmg = d.dmg; s.life = 0.5; s.r = sim.size * 0.05; s.size = sim.size * 0.1;
        if (d.rockets) {
          d.rocketT -= 0.16;
          if (d.rocketT <= 0) {
            d.rocketT = 1.4;
            const r = sim.makeShot();
            r.team = 0; r.owner = d.owner; r.w = 'drone'; r.dmgType = 'rocket'; r.kind = '';
            r.x = r.px = d.x; r.y = r.py = d.y; r.vx = Math.cos(a) * sim.size * 4; r.vy = Math.sin(a) * sim.size * 4;
            r.maxSpeed = sim.size * 11; r.accel = sim.size * 20; r.turnRate = 5; r.homing = best.id;
            r.dmg = d.dmg * 5; r.blast = sim.size * 1.2; r.life = 2.5; r.r = sim.size * 0.08; r.size = sim.size * 0.2;
          }
        }
      } else d.fireT = 0.2;
    }
  }
  void angleDiff;
}
