// Классические бонусы. Подобранный бонус действует на всю команду, но
// срабатывает ОДИН раз (граната бьёт один раз, а не за каждого игрока).

import type { Sim } from './sim';
import type { PowerupId } from './types';
import { Pickup, type Enemy } from './entities';
import { damageEnemy, killEnemy } from './combat';
import { makeProp } from './props';

export const POWERUP_INFO: Record<PowerupId, { name: string; text: string }> = {
  star: { name: 'Звезда', text: 'Основное орудие обоих танков мощнее (до 3 звёзд)' },
  clock: { name: 'Часы', text: 'Враги и их снаряды замирают' },
  helmet: { name: 'Каска', text: 'Неуязвимость команды' },
  grenade: { name: 'Граната', text: 'Удар по всем врагам на экране' },
  shovel: { name: 'Лопата', text: 'Стальные укрепления вокруг танков' },
  tank: { name: 'Танк', text: '+1 жизнь каждому' },
  repair: { name: 'Ремкомплект', text: 'Ремонт обоих танков на 50%' },
};

const WEIGHTS: Record<PowerupId, number> = { star: 16, clock: 12, helmet: 12, grenade: 14, shovel: 9, tank: 5, repair: 16 };

export function dropPowerup(sim: Sim, x: number, y: number, id?: PowerupId): Pickup {
  let luck = 0;
  for (const p of sim.players) luck = Math.max(luck, p.stats.luck);
  const ids = Object.keys(WEIGHTS) as PowerupId[];
  const w = ids.map(k => WEIGHTS[k] * (k === 'tank' ? 1 + luck * 0.3 : 1) * (k === 'star' && sim.starTier >= 3 ? 0.3 : 1));
  const pu = new Pickup();
  pu.id = id ?? ids[Math.max(0, sim.rng.weightedIndex(w))];
  pu.x = x; pu.y = y;
  pu.r = sim.size * 0.45;
  pu.life = 22;
  sim.pickups.push(pu);
  return pu;
}

export function updatePickups(sim: Sim, dt: number): void {
  for (const pu of sim.pickups) {
    if (pu.dead) continue;
    pu.t += dt;
    pu.r = sim.size * 0.45;
    if (pu.t >= pu.life) { pu.dead = true; continue; }
    for (const p of sim.players) {
      if (p.state !== 'alive') continue;
      const rr = p.r + pu.r;
      if ((p.x - pu.x) ** 2 + (p.y - pu.y) ** 2 > rr * rr) continue;
      pu.dead = true;
      applyPowerup(sim, pu.id, p.idx);
      sim.emit({ t: 'pickup', id: pu.id, x: pu.x, y: pu.y, p: p.idx });
      break;
    }
  }
}

const tmpE: Enemy[] = [];

export function applyPowerup(sim: Sim, id: PowerupId, by: number): void {
  let dur = 1;
  for (const p of sim.players) dur = Math.max(dur, p.stats.duration);
  switch (id) {
    case 'star':
      if (sim.starTier < 3) {
        sim.starTier++;
        for (const p of sim.players) sim.recalc(p);
      } else sim.gainXp(sim.xpNeed() * 0.3);
      break;
    case 'clock':
      sim.freezeT = Math.max(sim.freezeT, 8 * dur);
      sim.bossSlowT = Math.max(sim.bossSlowT, 4 * dur);
      break;
    case 'helmet':
      sim.helmetT = Math.max(sim.helmetT, 10 * dur);
      break;
    case 'grenade': {
      // Масштабируется: обычных — уничтожает, элитам — треть, боссу — 6%.
      // Доли прочности точные: делим на множитель «крепости» врагов ступени/угрозы.
      const pct = 1 / sim.threatDealt();
      const [hw, hh] = sim.viewHalf();
      sim.enemiesNear(sim.viewX, sim.viewY, Math.hypot(hw, hh), tmpE);
      for (const e of tmpE.slice()) {
        if (e.dead || Math.abs(e.x - sim.viewX) > hw || Math.abs(e.y - sim.viewY) > hh) continue;
        if (e === sim.boss) damageEnemy(sim, e, e.maxHp * 0.06 * pct, 'true', by, '', { noCrit: true });
        else if (e.elite) damageEnemy(sim, e, e.maxHp * 0.35 * pct, 'true', by, '', { noCrit: true });
        else if (e.size <= sim.size * 1.6) killEnemy(sim, e, by, '', false);
        else damageEnemy(sim, e, e.maxHp * 0.5 * pct, 'true', by, '', { noCrit: true });
      }
      sim.emit({ t: 'boom', x: sim.viewX, y: sim.viewY, r: Math.hypot(hw, hh), kind: 'big', p: by });
      break;
    }
    case 'shovel': {
      const hq = sim.director.hq;
      const centers = hq && !hq.dead ? [{ x: hq.x, y: hq.y, r: hq.w * 0.9 }] : sim.alivePlayers().map(p => ({ x: p.x, y: p.y, r: sim.size * 2.2 }));
      for (const c of centers) {
        const n = 16, bs = sim.size * 0.55;
        for (let i = 0; i < n; i++) {
          if (!hq && i % 4 === 0) continue; // проёмы, чтобы выехать
          const a = (i / n) * Math.PI * 2;
          sim.props.add(makeProp('steelWall', 'steel', c.x + Math.cos(a) * c.r, c.y + Math.sin(a) * c.r, bs, bs, 1e12, { ttl: 15 * dur, friendly: true }));
        }
      }
      break;
    }
    case 'tank':
      for (const p of sim.players) {
        p.lives++;
        if (p.state === 'out') { p.lives--; p.state = 'dead'; p.respawnT = 0.5; }
      }
      break;
    case 'repair':
      for (const p of sim.players) if (p.state === 'alive') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
      break;
  }
}
