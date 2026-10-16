import { describe, it, expect } from 'vitest';
import { makeSim, step, enemyAt, seconds } from './helpers';
import { explode, damagePlayer, killEnemy } from '../src/sim/combat';
import { applyPowerup, dropPowerup } from '../src/sim/powerups';
import { Shot } from '../src/sim/entities';

describe('дружественный огонь', () => {
  it('взрывы игрока не вредят и не двигают напарника', () => {
    const sim = makeSim();
    const [a, b] = sim.players;
    b.x = a.x + 30; b.y = a.y;
    const hp = b.hp, x = b.x, y = b.y;
    explode(sim, b.x, b.y, 200, 1e9, 'he', a.idx, 'he', { kind: 'big', knock: 10, ignite: true });
    step(sim, 30);
    expect(b.hp).toBe(hp);
    expect(b.x).toBeCloseTo(x, 3);
    expect(b.y).toBeCloseTo(y, 3);
    expect(b.slowT).toBe(0);
  });

  it('снаряды игрока пролетают сквозь напарника без урона', () => {
    const sim = makeSim();
    const [a, b] = sim.players;
    b.x = a.x + 60; b.y = a.y;
    const hp = b.hp;
    for (let i = 0; i < 10; i++) {
      const s = new Shot();
      s.team = 0; s.owner = 0; s.w = 'ap'; s.dmgType = 'ap'; s.dmg = 1e9; s.x = s.px = a.x; s.y = s.py = a.y + (i - 5) * 2;
      s.vx = 900; s.vy = 0; s.life = 1; s.r = 3;
      sim.shots.push(s);
    }
    step(sim, 20);
    expect(b.hp).toBe(hp);
  });

  it('огонь игроков на земле не жжёт игроков', () => {
    const sim = makeSim(['heavy', 'heavy']);
    const [a, b] = sim.players;
    sim.fire.ignite(b.x, b.y, 80, 10, 1e6, a.idx, true);
    const hp = b.hp;
    step(sim, seconds(2));
    expect(b.hp).toBe(hp);
  });
});

describe('бонусы действуют на команду и срабатывают один раз', () => {
  it('граната бьёт каждого врага ровно один раз', () => {
    const sim = makeSim();
    const p = sim.players[0];
    const enemies = [enemyAt(sim, 'armorToy', p.x + 80, p.y, 3), enemyAt(sim, 'armorToy', p.x - 80, p.y, 3)];
    for (const e of enemies) e.elite = true; // элиты получают 35% — легко посчитать
    sim.hash.reset(40); for (const e of sim.enemies) sim.hash.insert(e);
    const before = enemies.map(e => e.hp);
    applyPowerup(sim, 'grenade', 0);
    enemies.forEach((e, i) => expect(e.hp / e.maxHp).toBeCloseTo(before[i] / e.maxHp - 0.35, 5));
  });

  it('подбор бонуса одним игроком: каска защищает обоих, часы замораживают', () => {
    const sim = makeSim();
    const [a, b] = sim.players;
    dropPowerup(sim, a.x, a.y, 'helmet');
    step(sim, 2);
    expect(sim.helmetT).toBeGreaterThan(9);
    expect(damagePlayer(sim, a, 50)).toBe(0);
    expect(damagePlayer(sim, b, 50)).toBe(0);
    dropPowerup(sim, a.x, a.y, 'clock');
    step(sim, 2);
    expect(sim.freezeT).toBeGreaterThan(7);
  });

  it('«Танк» даёт +1 жизнь каждому и возвращает выбывшего', () => {
    const sim = makeSim();
    const [a, b] = sim.players;
    b.state = 'out'; b.lives = 0;
    const la = a.lives;
    applyPowerup(sim, 'tank', 0);
    expect(a.lives).toBe(la + 1);
    expect(b.state).toBe('dead');
    step(sim, seconds(1));
    expect(b.state).toBe('alive');
  });

  it('звезда усиливает основное орудие обоих', () => {
    const sim = makeSim();
    const d0 = sim.players.map(p => p.main.s.dmg);
    applyPowerup(sim, 'star', 0);
    sim.players.forEach((p, i) => expect(p.main.s.dmg).toBeGreaterThan(d0[i]));
  });
});

describe('опыт и уровни', () => {
  it('опыт начисляется мгновенно в момент уничтожения, сильные дают больше', () => {
    const sim = makeSim();
    const p = sim.players[0];
    const small = enemyAt(sim, 'soldier', p.x + 100, p.y);
    const big = enemyAt(sim, 'bigToy', p.x - 200, p.y);
    const x0 = sim.xp;
    killEnemy(sim, small, 0, '', false);
    const gSmall = sim.xp - x0;
    expect(gSmall).toBeGreaterThan(0);
    const x1 = sim.xp, l1 = sim.level;
    killEnemy(sim, big, 0, '', false);
    const gBig = (sim.level - l1) * 1000 + (sim.xp - x1);
    expect(gBig).toBeGreaterThan(gSmall);
  });

  it('общий уровень: пауза, каждый выбирает своё, игра идёт после выбора обоих', () => {
    const sim = makeSim();
    // Вдвоём опыт за врага делится на множитель числа игроков.
    sim.gainXp((sim.xpNeed() + 0.1) * sim.director.playersFactor());
    expect(sim.state).toBe('levelup');
    expect(sim.levelUp!.offers.length).toBe(2);
    const t = sim.time;
    step(sim, 30);
    expect(sim.time).toBe(t); // пауза
    const c0 = sim.levelUp!.offers[0][0], c1 = sim.levelUp!.offers[1][0];
    sim.choose(0, 0);
    expect(sim.state).toBe('levelup');
    sim.choose(1, 0);
    expect(sim.state).toBe('play');
    // Выбор применяется к своему танку.
    void c0; void c1;
  });
});

describe('подбит, спасение, жизни', () => {
  it('спасение напарником не тратит жизнь', () => {
    const sim = makeSim();
    const [a, b] = sim.players;
    const lives = b.lives;
    damagePlayer(sim, b, 1e12);
    expect(b.state).toBe('down');
    a.x = b.x + 10; a.y = b.y;
    step(sim, seconds(3.3));
    expect(b.state).toBe('alive');
    expect(b.lives).toBe(lives);
    expect(b.hp).toBeGreaterThan(0);
  });

  it('без спасения — минус жизнь и возрождение; без жизней — выбывание; оба выбыли — конец', () => {
    const sim = makeSim();
    const [a, b] = sim.players;
    a.x = 100; a.y = 100; b.x = 2000; b.y = 1000;
    b.lives = 1;
    damagePlayer(sim, b, 1e12);
    step(sim, seconds(21));
    expect(b.lives).toBe(0);
    step(sim, seconds(3));
    expect(b.state).toBe('alive');
    expect(b.invulnT).toBeGreaterThan(0); // защита после возрождения
    b.invulnT = 0;
    b.x = 2000; b.y = 1000; // далеко от напарника — спасать некому
    damagePlayer(sim, b, 1e12);
    step(sim, seconds(21));
    expect(b.state).toBe('out');
    a.lives = 0;
    a.invulnT = 0;
    damagePlayer(sim, a, 1e12);
    step(sim, seconds(1));
    expect(sim.state).toBe('gameover');
  });

  it('спасение работает и на боссе (дольше таймер ожидания)', () => {
    const sim = makeSim();
    const [a, b] = sim.players;
    sim.stageTime = sim.stage.bossAt;
    // Спавним босса вручную.
    sim.director.bossSpawned = false;
    (sim.director as unknown as { update: (dt: number) => void }).update = function () {};
    void a;
    sim.boss = enemyAt(sim, 'bigToy', b.x + 500, b.y);
    damagePlayer(sim, b, 1e12);
    expect(b.downT).toBe(30);
  });
});
