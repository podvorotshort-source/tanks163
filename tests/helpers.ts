// Общие помощники тестов: управляемая симуляция без случайных волн.

import { Sim, NO_CMD, type RunConfig, type PlayerCmd } from '../src/sim/sim';
import type { ClassId } from '../src/sim/types';
import { spawnEnemy } from '../src/sim/director';
import type { Enemy } from '../src/sim/entities';
import { PropWorld } from '../src/sim/props';

export function makeSim(classes: ClassId[] = ['assault', 'heavy'], o: Partial<RunConfig> = {}, keepProps = false): Sim {
  const sim = new Sim({ seed: 1234, players: classes.map(c => ({ cls: c })), ...o });
  // Отключаем случайные волны и события — тестируем правила.
  (sim.director as unknown as { update: () => void }).update = () => {};
  sim.enemies = [];
  if (!keepProps) {
    sim.props = new PropWorld(32);
    sim.nav.rebuildBlocked(sim.props);
  }
  return sim;
}

export function step(sim: Sim, n = 1, cmds?: PlayerCmd[]): void {
  for (let i = 0; i < n; i++) sim.step(cmds ?? sim.players.map(() => NO_CMD));
}

/** Враг рядом с точкой (без анимации появления). */
export function enemyAt(sim: Sim, id: string, x: number, y: number, mul = 1): Enemy {
  const e = spawnEnemy(sim, id, x, y, mul)!;
  e.spawnT = 0;
  return e;
}

export function seconds(s: number): number {
  return Math.round(s * 60);
}
