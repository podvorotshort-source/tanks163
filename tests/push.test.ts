import { describe, it, expect } from 'vitest';
import { makeSim, step, seconds } from './helpers';
import { makeProp } from '../src/sim/props';
import type { Sim } from '../src/sim/sim';
import type { ClassId } from '../src/sim/types';

const RIGHT = { mx: 1, my: 0, a: [false, false, false] as [boolean, boolean, boolean] };
const IDLE = { mx: 0, my: 0, a: [false, false, false] as [boolean, boolean, boolean] };

/** Первый танк стоит слева, второй — вплотную справа; едет только первый. */
function duel(classes: [ClassId, ClassId], sec = 1.5): { sim: Sim; moved: number; pusherMoved: number } {
  const sim = makeSim(classes);
  const [a, b] = sim.players;
  a.invulnT = b.invulnT = 0;
  a.x = a.px = sim.stage.w / 2 - 60; a.y = a.py = sim.stage.h / 2;
  b.x = b.px = a.x + a.r + b.r + 1; b.y = b.py = a.y;
  const ax = a.x, bx = b.x;
  step(sim, seconds(sec), [RIGHT, IDLE]);
  return { sim, moved: b.x - bx, pusherMoved: a.x - ax };
}

describe('толкание танков игроков', () => {
  it('тяжёлый толкает разведчика почти без потери хода', () => {
    const { sim, moved, pusherMoved } = duel(['heavy', 'scout']);
    expect(moved).toBeGreaterThan(sim.size * 1.5);
    expect(pusherMoved).toBeGreaterThan(moved * 0.9);
  });

  it('разведчик тяжёлого почти не сдвигает', () => {
    const heavyPushed = duel(['heavy', 'scout']).moved;
    const scoutPushes = duel(['scout', 'heavy']).moved;
    expect(scoutPushes).toBeLessThan(heavyPushed * 0.6);
  });

  it('танки не проезжают друг сквозь друга', () => {
    const { sim } = duel(['heavy', 'scout'], 2);
    const [a, b] = sim.players;
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan((a.r + b.r) * 0.85);
  });

  it('прижатый к стене не проходит сквозь неё', () => {
    const sim = makeSim(['heavy', 'scout']);
    const [a, b] = sim.players;
    a.invulnT = b.invulnT = 0;
    a.x = a.px = sim.stage.w / 2 - 60; a.y = a.py = sim.stage.h / 2;
    b.x = b.px = a.x + a.r + b.r + 1; b.y = b.py = a.y;
    const wallX = b.x + b.r + 20;
    sim.props.add(makeProp('steel', 'steel', wallX + 10, a.y, 20, 200, 1e12));
    step(sim, seconds(3), [RIGHT, IDLE]);
    // корпус — повёрнутый прямоугольник: его край по x не заходит за стену
    const ext = Math.abs(Math.cos(b.angle)) * b.hl + Math.abs(Math.sin(b.angle)) * b.hw;
    expect(b.x + ext).toBeLessThanOrEqual(wallX + 1);
    expect(a.x + a.r).toBeLessThanOrEqual(b.x - b.r + (a.r + b.r) * 0.2);
  });

  it('несокрушимость делает тяжёлым даже разведчика', () => {
    const sim = makeSim(['heavy', 'scout']);
    const [a, b] = sim.players;
    a.invulnT = b.invulnT = 0;
    a.x = a.px = sim.stage.w / 2 - 60; a.y = a.py = sim.stage.h / 2;
    b.x = b.px = a.x + a.r + b.r + 1; b.y = b.py = a.y;
    b.fortressT = 99;
    const bx = b.x;
    step(sim, seconds(1.5), [RIGHT, IDLE]);
    expect(b.x - bx).toBeLessThan(sim.size * 0.6);
  });
});
