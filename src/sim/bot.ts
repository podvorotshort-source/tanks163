// Простой бот для балансных прогонов и тестов: уклоняется, собирает бонусы,
// спасает напарника, применяет способности, выбирает улучшения.

import type { Sim, PlayerCmd } from './sim';
import type { Player, Enemy } from './entities';
import type { Card } from './upgrades';

export interface BotOpts {
  /** 0..1 — насколько «умно» уклоняется. */
  skill: number;
  /** Предпочтения карт: функция оценки. */
  pick?: (p: Player, c: Card, sim: Sim) => number;
}

const tmpE: Enemy[] = [];

export function botCommand(sim: Sim, p: Player, o: BotOpts): PlayerCmd {
  const cmd: PlayerCmd = { mx: 0, my: 0, a: [false, false, false] };
  if (p.state !== 'alive') return cmd;
  const L = sim.size;
  let fx = 0, fy = 0;
  // Отталкивание от врагов (взвешено по силе) и вражеских снарядов.
  sim.enemiesNear(p.x, p.y, L * 7, tmpE);
  let threat = 0;
  for (const e of tmpE) {
    if (e.dead) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.max(L * 0.5, Math.hypot(dx, dy) - e.r);
    const w = Math.min(4, e.pw / sim.tankPower()) * (e === sim.boss ? 3 : 1);
    if (e.size <= L * p.stats.crush * 0.95 && !e.noCrush) { fx -= (dx / d) * 0.3; fy -= (dy / d) * 0.3; continue; } // давить мелочь
    fx += (dx / (d * d)) * w * L; fy += (dy / (d * d)) * w * L;
    threat += w / (d / L);
  }
  for (const s of sim.shots) {
    if (s.team !== 1 || s.dead) continue;
    const dx = p.x - s.x, dy = p.y - s.y, d2 = dx * dx + dy * dy;
    if (d2 > (L * 4) ** 2) continue;
    // Уходим перпендикулярно траектории.
    const sp = Math.hypot(s.vx, s.vy) || 1;
    const px = -s.vy / sp, py = s.vx / sp;
    const side = px * dx + py * dy > 0 ? 1 : -1;
    fx += px * side * 1.4 * o.skill; fy += py * side * 1.4 * o.skill;
  }
  // Опасные зоны.
  for (const z of sim.zones) {
    if (z.team !== 1 || z.dead || z.kind === 'smoke') continue;
    if (z.kind === 'hazard' && z.n === 0) continue;
    const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1;
    if (d < z.r + p.r * 2) { fx += (dx / d) * 3 * o.skill; fy += (dy / d) * 3 * o.skill; }
  }
  // Напарник подбит — едем спасать.
  const mate = sim.players.find(q => q !== p && q.state === 'down');
  if (mate) {
    const dx = mate.x - p.x, dy = mate.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d > L * 1.2) { fx += (dx / d) * 2.5; fy += (dy / d) * 2.5; }
    else { fx *= 0.2; fy *= 0.2; }
  }
  // Бонусы.
  for (const pu of sim.pickups) {
    const dx = pu.x - p.x, dy = pu.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < L * 8) { fx += (dx / d) * 1.2; fy += (dy / d) * 1.2; }
  }
  // Ящики снабжения и центр арены (не жаться к краю).
  const st = sim.stage;
  fx += ((st.w / 2 - p.x) / st.w) * 0.6;
  fy += ((st.h / 2 - p.y) / st.h) * 0.6;
  // Немного кружения, чтобы не стоять.
  const a = sim.time * 0.4 + p.idx * 3;
  fx += Math.cos(a) * 0.35; fy += Math.sin(a) * 0.35;
  const m = Math.hypot(fx, fy);
  if (m > 0.05) { cmd.mx = fx / m; cmd.my = fy / m; }
  // Способности.
  for (let i = 0; i < p.abilities.length; i++) {
    const ab = p.abilities[i];
    if (ab.charges <= 0) continue;
    const id = ab.id;
    if (id === 'repair' && p.hp < p.maxHp * 0.6) cmd.a[i] = true;
    else if (id === 'dash' && threat > 2.5) cmd.a[i] = true;
    else if (id === 'fortress' && (threat > 3 || p.hp < p.maxHp * 0.35)) cmd.a[i] = true;
    else if (id === 'smoke' && (mate || p.hp < p.maxHp * 0.4)) cmd.a[i] = true;
    else if (!['repair', 'dash', 'fortress', 'smoke'].includes(id) && (threat > 2 || sim.boss)) cmd.a[i] = true;
  }
  return cmd;
}

export function defaultPick(p: Player, c: Card): number {
  let s = Math.random() * 0.5;
  switch (c.kind) {
    case 'wlevel': s += c.id.endsWith(p.weapons[0].id) ? 3 : 2.4; break;
    case 'weapon': s += p.weapons.length < 3 ? 3.2 : 2; break;
    case 'synergy': s += 4; break;
    case 'mod': s += 2.8; break;
    case 'stat': s += 1.6 + c.rarity * 0.4; break;
    case 'ability': s += 2.2; break;
    case 'alevel': s += 1.2; break;
    default: s += 0.5;
  }
  return s;
}

/** Выбор карт ботом на экране уровня. */
export function botChoose(sim: Sim, o: BotOpts): void {
  const lu = sim.levelUp;
  if (!lu) return;
  for (let i = 0; i < sim.players.length; i++) {
    if (lu.done[i]) continue;
    const p = sim.players[i];
    const offers = lu.offers[i];
    let best = 0, bs = -Infinity;
    offers.forEach((c, k) => { const v = (o.pick ?? defaultPick)(p, c, sim); if (v > bs) { bs = v; best = k; } });
    sim.choose(i, best);
  }
}
