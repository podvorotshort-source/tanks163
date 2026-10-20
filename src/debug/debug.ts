// Отладочный API в window.__tk — для автотестов (Playwright) и ручной проверки.

import { damagePlayer, damageEnemy } from '../sim/combat';
import type { App } from '../app';
import { GameScene } from '../client/game';
import { input } from '../input/input';
import type { PowerupId, WeaponId, AbilityId } from '../sim/types';
import { dropPowerup, applyPowerup } from '../sim/powerups';
import { spawnEnemy } from '../sim/director';
import { spriteMade } from '../client/fx';

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
      if (!s) return { scene: app.top?.id };
      return {
        scene: app.top?.id, state: s.state, stage: s.stageIdx, level: s.level, xp: s.xp, time: s.time, size: s.size,
        enemies: s.enemies.length, shots: s.shots.length, kills: s.kills, fps: app.fps,
        players: s.players.map(p => ({ cls: p.classId, state: p.state, hp: Math.round(p.hp), maxHp: Math.round(p.maxHp), lives: p.lives, x: Math.round(p.x), y: Math.round(p.y), weapons: p.weapons.map(w => w.id + w.level), abilities: p.abilities.map(a => a.id + a.level), kills: p.kills })),
        levelUp: s.levelUp ? { offers: s.levelUp.offers.map(o => o.map(c => c.id)), done: s.levelUp.done } : null,
        boss: s.boss ? { hp: s.boss.hp, maxHp: s.boss.maxHp } : null,
      };
    },
    /** Время фаз кадра (мс) и число частиц. */
    perf() { const g = game(); const r = { ...app.perf, fps: app.fps, parts: g?.fx.parts.length ?? 0, lights: g?.fx.lights.length ?? 0, ...(g ? g.perf : {}), fxMs: g?.fx.drawMs ?? 0, sprites: spriteMade, fxgl: g?.iso.fx.stats() }; app.perf.peakFrame = 0; if (g) g.fx.drawMs = 0; return r; },
    give(p: number, w: WeaponId) { const s = game()?.sim; if (s) s.addWeapon(s.players[p], w); },
    ability(p: number, a: AbilityId) { const s = game()?.sim; if (s) s.players[p].abilities.push({ id: a, level: 1, t: 0, active: 0, charges: 1 }); },
    power(id: PowerupId) { const s = game()?.sim; if (s) applyPowerup(s, id, 0); },
    /** Уничтожить танк игрока без запасных жизней (проверка экрана поражения). */
    die(p = 0) { const s = game()?.sim; if (!s) return; const pl = s.players[p]; pl.lives = 0; pl.invulnT = 0; damagePlayer(s, pl, 1e12, 'debug'); },
    /** Положить бонус рядом с игроком (подбор — как в игре). */
    drop(id: PowerupId, p = 0) { const s = game()?.sim; if (s) dropPowerup(s, s.players[p].x, s.players[p].y, id); },
    spawn(id: string, n = 1, mul = 1) { const s = game()?.sim; if (!s) return; for (let i = 0; i < n; i++) { const [x, y] = s.director.spawnPoint(1.05); spawnEnemy(s, id, x, y, mul); } },
    xp(levels = 1) { const s = game()?.sim; if (s) for (let i = 0; i < levels; i++) s.gainXp((s.xpNeed() - s.xp + 0.01) * s.director.playersFactor()); },
    skipStage() { game()?.sim.debugSkipStage(); },
    boss() { const s = game()?.sim; if (s) s.stageTime = s.stage.bossAt - 0.1; },
    /** Добить босса (как удар в бою — с обломками и кат-сценой поглощения). */
    killBoss() { const s = game()?.sim; if (s?.boss) damageEnemy(s, s.boss, s.boss.hp * 50 + 1e6, 'true', 0, ''); },
    hurt(p: number, k = 0.5) { const s = game()?.sim; if (s) { const pl = s.players[p]; pl.hp -= pl.maxHp * k; } },
    /** Поджечь землю рядом с игроком (проверка огня): смещение по x, радиус. */
    ignite(dx = 90, r = 40) { const s = game()?.sim; if (!s) return; const p = s.players[0]; s.fire.ignite(p.x + dx, p.y, r, 30, 0, -1, true); },
    /** Поджечь землю вокруг ближайшего к игроку препятствия из материала mat (проверка, что огонь не лезет на блоки). */
    igniteProp(mat = 'brick', r = 60) { const s = game()?.sim; if (!s) return; const p = s.players[0]; let best = null as null | { x: number; y: number }, bd = 1e18; for (const q of s.props.props) { if (q.dead || q.mat !== mat) continue; const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = q; } } if (best) s.fire.ignite(best.x, best.y, r, 30, 0, -1, true); return best && { x: best.x - p.x, y: best.y - p.y }; },
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
