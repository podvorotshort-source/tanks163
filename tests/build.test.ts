import { describe, it, expect } from 'vitest';
import { makeSim, step, enemyAt, seconds } from './helpers';
import { offerCards, MODS, SYNERGIES, STAT_UPS, computeWeaponStats } from '../src/sim/upgrades';
import { Rng } from '../src/core/rng';
import { WEAPONS, WEAPON_IDS } from '../src/sim/content/weapons';
import { ABILITIES } from '../src/sim/content/classes';
import type { WeaponId } from '../src/sim/types';
import { explode } from '../src/sim/combat';
import { dropMine } from '../src/sim/playerRun';
import { useAbility } from '../src/sim/abilities';

describe('предложения улучшений учитывают билд', () => {
  it('никогда не предлагает уровень/модификатор оружия, которого нет, и синергии без частей', () => {
    const rng = new Rng(5);
    for (let trial = 0; trial < 300; trial++) {
      const sim = makeSim(['assault']);
      const p = sim.players[0];
      // Случайный билд.
      const n = rng.int(0, 3);
      for (let i = 0; i < n; i++) sim.addWeapon(p, rng.pick(WEAPON_IDS), false);
      for (const w of p.weapons) w.level = rng.int(1, 6);
      for (let k = 0; k < 20; k++) {
        const cards = offerCards(p, 4, { rng, unlocks: { has: () => true }, level: rng.int(1, 40), starTier: 0 });
        expect(new Set(cards.map(c => c.id)).size).toBe(cards.length);
        for (const c of cards) {
          if (c.id.startsWith('w:lvl:')) expect(p.hasWeapon(c.id.slice(6) as WeaponId)).toBe(true);
          if (c.id.startsWith('w:new:')) { expect(p.hasWeapon(c.id.slice(6) as WeaponId)).toBe(false); expect(p.weapons.length - 1).toBeLessThan(p.cls.auxSlots); }
          if (c.id.startsWith('m:')) { const m = MODS.find(x => x.id === c.id.slice(2))!; expect(p.hasWeapon(m.weapon)).toBe(true); }
          if (c.id.startsWith('y:')) { const s = SYNERGIES.find(x => x.id === c.id.slice(2))!; expect(s.req(p)).toBe(true); }
          if (c.id.startsWith('s:')) { const s = STAT_UPS.find(x => x.id === c.id.slice(2))!; if (s.req) expect(s.req(p)).toBe(true); }
          if (c.id.startsWith('a:new:')) expect(ABILITIES[c.id.slice(6) as keyof typeof ABILITIES].classOnly).toBeFalsy();
        }
      }
    }
  });

  it('закрытое в мета-прогрессии не выпадает', () => {
    const sim = makeSim(['assault']);
    const p = sim.players[0];
    const rng = new Rng(1);
    for (let k = 0; k < 200; k++) {
      const cards = offerCards(p, 4, { rng, unlocks: { has: id => id !== 'w:tesla' && !id.startsWith('y:') }, level: 10, starTier: 0 });
      for (const c of cards) { expect(c.id).not.toBe('w:new:tesla'); expect(c.id.startsWith('y:')).toBe(false); }
    }
  });

  it('радиус взрыва и радиус огня — разные характеристики', () => {
    const sim = makeSim(['assault']);
    const p = sim.players[0];
    sim.addWeapon(p, 'mines', false);
    const he0 = computeWeaponStats(p, 'he', 1, 0, true).radius;
    const mine0 = computeWeaponStats(p, 'mines', 1, 0, false).radius;
    const spread0 = p.stats.fireSpread;
    p.stats.blast += 0.2;
    expect(computeWeaponStats(p, 'he', 1, 0, true).radius).toBeGreaterThan(he0);
    expect(computeWeaponStats(p, 'mines', 1, 0, false).radius).toBeGreaterThan(mine0);
    expect(p.stats.fireSpread).toBe(spread0);
    // Огнемёт не получает радиус взрыва.
    const fl0 = computeWeaponStats(p, 'flame', 1, 0, false);
    p.stats.blast += 0.5;
    expect(computeWeaponStats(p, 'flame', 1, 0, false).range).toBe(fl0.range);
  });
});

describe('каждое оружие стреляет и наносит урон само', () => {
  for (const id of WEAPON_IDS) {
    it(WEAPONS[id].name, () => {
      const sim = makeSim(['assault']);
      const p = sim.players[0];
      p.weapons = [];
      sim.addWeapon(p, id, false);
      p.invulnT = 1e9;
      const targetType = id === 'tesla' ? 'heli' : 'toyTank';
      const dist = id === 'flame' || id === 'ram' ? 30 : id === 'mines' ? 0 : 150;
      const e = enemyAt(sim, targetType, p.x + dist, p.y, 1);
      e.maxHp = e.hp = 1e9;
      e.speed = id === 'mines' ? 30 : 0;
      if (id === 'mines') { e.x = p.x + 200; }
      if (id === 'ram') { e.x = p.x + 18; }
      const cmds = id === 'mines' ? [{ mx: -1, my: 0, a: [false, false, false] as [boolean, boolean, boolean] }] : undefined;
      step(sim, seconds(id === 'mines' ? 8 : 4), cmds);
      expect(e.hp).toBeLessThan(1e9);
    });
  }
});

describe('синергии', () => {
  it('Детонатор: фугасный взрыв подрывает мины', () => {
    const sim = makeSim(['assault']);
    const p = sim.players[0];
    p.mods.add('syn_detonator');
    dropMine(sim, p, p.x + 200, p.y);
    step(sim, seconds(1));
    expect(sim.mines.filter(m => !m.dead).length).toBe(1);
    explode(sim, p.x + 210, p.y, 60, 10, 'he', 0, 'he');
    step(sim, 2);
    expect(sim.mines.filter(m => !m.dead).length).toBe(0);
  });

  it('Пылающие останки: горящий враг взрывается при гибели', () => {
    const sim = makeSim(['heavy']);
    const p = sim.players[0];
    p.mods.add('syn_pyre');
    const a = enemyAt(sim, 'toyTank', p.x + 300, p.y);
    const b = enemyAt(sim, 'toyTank', p.x + 335, p.y);
    a.speed = b.speed = 0;
    a.burnT = 2; a.burnDps = 1; a.burnOwner = 0;
    sim.hash.reset(40); for (const e of sim.enemies) sim.hash.insert(e);
    const hb = b.hp;
    a.hp = 0.001;
    step(sim, 2);
    expect(b.hp).toBeLessThan(hb);
  });

  it('Цепная реакция мин: одна мина подрывает соседние', () => {
    const sim = makeSim(['assault']);
    const p = sim.players[0];
    p.mods.add('mn_chain');
    for (let i = 0; i < 4; i++) dropMine(sim, p, p.x + 300 + i * 25, p.y);
    step(sim, seconds(1));
    enemyAt(sim, 'toyTank', p.x + 300, p.y);
    step(sim, 3);
    expect(sim.mines.filter(m => !m.dead).length).toBe(0);
  });
});

describe('способности', () => {
  it('каждая способность применяется и уходит на перезарядку', () => {
    for (const id of Object.keys(ABILITIES) as (keyof typeof ABILITIES)[]) {
      const sim = makeSim(['assault']);
      const p = sim.players[0];
      enemyAt(sim, 'toyTank', p.x + 150, p.y);
      p.abilities = [{ id, level: 5, t: 0, active: 0, charges: 1 }];
      expect(useAbility(sim, p, 0)).toBe(true);
      expect(useAbility(sim, p, 0)).toBe(false);
      step(sim, seconds(1));
    }
  });
});
