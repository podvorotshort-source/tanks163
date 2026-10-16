// Отладочный API в window.__tk — для автотестов (Playwright) и ручной проверки.

import type { App } from '../app';
import { GameScene } from '../client/game';
import { input } from '../input/input';
import type { PowerupId, WeaponId, AbilityId } from '../sim/types';
import { applyPowerup } from '../sim/powerups';
import { spawnEnemy } from '../sim/director';

export function installDebug(app: App): void {
  const game = () => (app.top instanceof GameScene ? app.top : (app as unknown as { stack?: unknown[] }) && findGame(app));
  const api = {
    app,
    input,
    get game(): GameScene | null { return game() || null; },
    get sim() { return game()?.sim ?? null; },
    /** Ускорение времени. */
    speed(k: number) { app.timeScale = k; },
    /** Состояние для проверки. */
    state() {
      const s = game()?.sim;
      if (!s) return { scene: app.top?.constructor.name };
      return {
        scene: app.top?.constructor.name, state: s.state, stage: s.stageIdx, level: s.level, xp: s.xp, time: s.time, size: s.size,
        enemies: s.enemies.length, shots: s.shots.length, kills: s.kills, fps: app.fps,
        players: s.players.map(p => ({ cls: p.classId, state: p.state, hp: Math.round(p.hp), maxHp: Math.round(p.maxHp), lives: p.lives, x: Math.round(p.x), y: Math.round(p.y), weapons: p.weapons.map(w => w.id + w.level), abilities: p.abilities.map(a => a.id + a.level), kills: p.kills })),
        levelUp: s.levelUp ? { offers: s.levelUp.offers.map(o => o.map(c => c.id)), done: s.levelUp.done } : null,
        boss: s.boss ? { hp: s.boss.hp, maxHp: s.boss.maxHp } : null,
      };
    },
    give(p: number, w: WeaponId) { const s = game()?.sim; if (s) s.addWeapon(s.players[p], w); },
    ability(p: number, a: AbilityId) { const s = game()?.sim; if (s) s.players[p].abilities.push({ id: a, level: 1, t: 0, active: 0, charges: 1 }); },
    power(id: PowerupId) { const s = game()?.sim; if (s) applyPowerup(s, id, 0); },
    spawn(id: string, n = 1, mul = 1) { const s = game()?.sim; if (!s) return; for (let i = 0; i < n; i++) { const [x, y] = s.director.spawnPoint(1.05); spawnEnemy(s, id, x, y, mul); } },
    xp(levels = 1) { const s = game()?.sim; if (s) for (let i = 0; i < levels; i++) s.gainXp(s.xpNeed() - s.xp + 0.01); },
    skipStage() { game()?.sim.debugSkipStage(); },
    boss() { const s = game()?.sim; if (s) s.stageTime = s.stage.bossAt - 0.1; },
    hurt(p: number, k = 0.5) { const s = game()?.sim; if (s) { const pl = s.players[p]; pl.hp -= pl.maxHp * k; } },
    god(on = true) { const s = game()?.sim; if (s) for (const p of s.players) p.invulnT = on ? 1e9 : 0; },
  };
  (window as unknown as { __tk: typeof api }).__tk = api;
}

function findGame(app: App): GameScene | null {
  const st = (app as unknown as { stack: unknown[] }).stack;
  if (!st) return null;
  for (let i = st.length - 1; i >= 0; i--) if (st[i] instanceof GameScene) return st[i] as GameScene;
  return null;
}
