import { describe, it, expect } from 'vitest';
import { makeSim, enemyAt } from './helpers';
import { pickTarget } from '../src/sim/playerRun';
import { spawnBoss } from '../src/sim/bosses';
import { spawnEnemy } from '../src/sim/director';
import type { Sim } from '../src/sim/sim';

/** Все правила выбора цели основных и навесных орудий. */
const MODES: [string, 'ap' | 'he' | 'mg' | 'rocket'][] = [['armored', 'ap'], ['cluster', 'he'], ['default', 'mg'], ['far', 'rocket']];

function setup(): Sim {
  const sim = makeSim(['assault']);
  const p = sim.players[0];
  p.x = sim.stage.w / 2; p.y = sim.stage.h / 2;
  return sim;
}

/** Сетка поиска врагов обновляется в шаге симуляции — здесь вручную. */
function refreshGrid(sim: Sim): void {
  const h = (sim as unknown as { hash: { reset(c: number): void; insert(e: unknown): void } }).hash;
  h.reset(Math.max(24, sim.size * 1.2));
  for (const e of sim.enemies) if (!e.dead) h.insert(e);
}

const pick = (sim: Sim, mode: string, type: 'ap' | 'he' | 'mg' | 'rocket') => {
  refreshGrid(sim);
  return pickTarget(sim, sim.players[0], mode, sim.size * 12, type, sim.size * 1.5);
};

describe('приоритет целей: босс → элита → сильнейшие', () => {
  it('босс в зоне действия — цель всех орудий, даже если рядом толпа', () => {
    const sim = setup();
    const p = sim.players[0];
    for (let i = 0; i < 6; i++) enemyAt(sim, 'toyTank', p.x + sim.size * 2, p.y + (i - 3) * sim.size * 0.6);
    const elite = spawnEnemy(sim, 'armorToy', p.x - sim.size * 3, p.y, 1, { elite: true })!;
    elite.spawnT = 0;
    const boss = spawnBoss(sim, 'windupGeneral', p.x, p.y - sim.size * 9)!;
    for (const [mode, type] of MODES) expect(pick(sim, mode, type), mode).toBe(boss);
  });

  it('без босса — элита раньше обычных', () => {
    const sim = setup();
    const p = sim.players[0];
    enemyAt(sim, 'bigToy', p.x + sim.size * 2, p.y);
    for (let i = 0; i < 6; i++) enemyAt(sim, 'soldier', p.x + sim.size * 1.5, p.y + (i - 3) * sim.size * 0.4);
    const elite = spawnEnemy(sim, 'toyTank', p.x - sim.size * 8, p.y, 1, { elite: true })!;
    elite.spawnT = 0;
    for (const [mode, type] of MODES) expect(pick(sim, mode, type), mode).toBe(elite);
  });

  it('среди обычных — сильнейший, а не ближайший', () => {
    const sim = setup();
    const p = sim.players[0];
    for (let i = 0; i < 8; i++) enemyAt(sim, 'soldier', p.x + sim.size * 1.2, p.y + (i - 4) * sim.size * 0.4);
    const big = enemyAt(sim, 'bigToy', p.x - sim.size * 9, p.y);
    for (const [mode, type] of MODES) expect(pick(sim, mode, type), mode).toBe(big);
  });

  it('вне зоны действия приоритет не действует', () => {
    const sim = setup();
    const p = sim.players[0];
    const near = enemyAt(sim, 'toyTank', p.x + sim.size * 2, p.y);
    spawnBoss(sim, 'windupGeneral', p.x, p.y - sim.size * 40);
    expect(pick(sim, 'armored', 'ap')).toBe(near);
  });
});
