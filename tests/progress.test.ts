import { describe, it, expect, beforeEach } from 'vitest';
import { makeSim, step, seconds } from './helpers';
import { Sim } from '../src/sim/sim';
import { STAGE_GROWTH, TANK_BASE, stageUnit } from '../src/sim/types';
import { STAGE_DEFS } from '../src/sim/content/stages';
import { save, sanitize, defaultSave, SAVE_KEY } from '../src/meta/save';
import { storage } from '../src/meta/storage';
import { WORKSHOP } from '../src/meta/meta';
import { baseStats } from '../src/sim/entities';
import { PROP_CRUSH } from '../src/sim/playerRun';

describe('переход между масштабами', () => {
  it('танк поглощает босса и растёт вчетверо: в новом мире тот же размер, мир крупнее', () => {
    const sim = makeSim(['assault', 'heavy'], {}, true);
    sim.growE = 0.95;
    const p = sim.players[0];
    const sizeBefore = sim.size;
    const boss = { x: p.x + 300, y: p.y - 120, size: sim.size * STAGE_GROWTH, angle: 0, def: { art: 'bossGeneral' } };
    sim.onBossKilled(boss as never);
    expect(sim.state).toBe('transition');
    step(sim, seconds(9.5));
    expect(['play', 'levelup']).toContain(sim.state);
    expect(sim.stageIdx).toBe(1);
    // Физический размер танка в локальных единицах тот же — а единицы ступени вчетверо крупнее.
    expect(sim.size).toBe(sizeBefore);
    expect(stageUnit(1) / stageUnit(0)).toBeCloseTo(STAGE_GROWTH, 6);
    // Танк подъехал к боссу — и оказался в соответствующей точке «реликвии» нового мира.
    const next = STAGE_DEFS[1];
    expect(p.x).toBeCloseTo(next.relicX + (boss.x - STAGE_DEFS[0].w / 2) / STAGE_GROWTH - sizeBefore * 0.6, 0);
    expect(p.y).toBeCloseTo(next.relicY + (boss.y - STAGE_DEFS[0].h / 2) / STAGE_GROWTH, 0);
    // Трофей — способность босса.
    expect(p.abilities.some(a => a.id === 'magma')).toBe(true);
    void TANK_BASE;
    // Старые препятствия переехали уменьшенными и давятся танком.
    expect(sim.props.props.some(pr => pr.kind === 'brick')).toBe(true);
    const brick = sim.props.props.find(pr => pr.kind === 'brick')!;
    expect(brick.size).toBeLessThan(sim.size * PROP_CRUSH);
  });

  it('после последнего босса — победа', () => {
    const sim = new Sim({ seed: 3, players: [{ cls: 'scout' }], startStage: 7 });
    (sim.director as unknown as { update: () => void }).update = () => {};
    sim.onBossKilled(sim.players[0] as never);
    expect(sim.state).toBe('victory');
  });
});

describe('сохранения', () => {
  beforeEach(() => { storage.remove(SAVE_KEY); storage.remove(SAVE_KEY + '.bak'); });

  it('новая игра — значения по умолчанию', () => {
    expect(save.load()).toBe('new');
    expect(save.data.scrap).toBe(0);
    expect(save.has('w:ap')).toBe(true);
  });

  it('прогресс переживает «перезагрузку»', () => {
    save.load();
    save.data.scrap = 345;
    save.data.workshop.hp = 2;
    save.data.unlocked.push('w:tesla');
    save.save();
    save.data = defaultSave();
    expect(save.load()).toBe('ok');
    expect(save.data.scrap).toBe(345);
    expect(save.rank('hp')).toBe(2);
    expect(save.has('w:tesla')).toBe(true);
  });

  it('повреждённое сохранение восстанавливается из резервной копии', () => {
    save.load();
    save.data.scrap = 100; save.save();
    save.data.scrap = 200; save.save(); // резерв = 100
    storage.set(SAVE_KEY, '{"body":"garbage","sum":1}');
    expect(save.load()).toBe('restored');
    expect(save.data.scrap).toBe(100);
  });

  it('оба файла испорчены — чистый прогресс и сообщение', () => {
    storage.set(SAVE_KEY, 'not json');
    storage.set(SAVE_KEY + '.bak', '{also bad');
    expect(save.load()).toBe('reset');
    expect(save.data.scrap).toBe(0);
  });

  it('очистка мусорных значений', () => {
    const d = sanitize({ scrap: -5, workshop: { hp: 99, dmg: 'x' }, unlocked: ['w:tesla', 42], threatUnlocked: 17, stats: { runs: NaN } });
    expect(d.scrap).toBe(0);
    expect(d.workshop.hp).toBe(WORKSHOP.find(w => w.id === 'hp')!.costs.length);
    expect(d.workshop.dmg).toBe(0);
    expect(d.unlocked).toContain('w:tesla');
    expect(d.threatUnlocked).toBe(5);
    expect(d.stats.runs).toBe(0);
  });

  it('мастерская применяется, временный билд не переносится между забегами', () => {
    save.load();
    save.data.workshop.hp = 3; save.data.workshop.lives = 1;
    const run1 = new Sim({ seed: 1, players: [{ cls: 'assault' }], meta: save.bonus() });
    run1.addWeapon(run1.players[0], 'tesla');
    run1.players[0].mods.add('syn_detonator');
    run1.players[0].stats.dmg += 1;
    const run2 = new Sim({ seed: 2, players: [{ cls: 'assault' }], meta: save.bonus() });
    const p = run2.players[0];
    expect(p.weapons.length).toBe(1);
    expect(p.mods.size).toBe(0);
    expect(p.stats.dmg).toBeCloseTo(1, 6);
    expect(p.lives).toBe(4);
    expect(p.stats.maxHp).toBeCloseTo(baseStats(p.cls).maxHp + 0.18, 6);
  });
});
