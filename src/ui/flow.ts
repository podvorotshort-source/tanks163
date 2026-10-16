// Переходы между экранами: запуск забега и итоги.

import { app } from '../app';
import { GameScene } from '../client/game';
import { save } from '../meta/save';
import type { VariantDef } from '../meta/meta';
import { ResultsScene } from './results';

export function startRun(vs: VariantDef[], threat: number): void {
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const scene = new GameScene({
    seed,
    players: vs.map(v => ({ cls: v.cls, main: v.main, aux: v.aux })),
    meta: save.bonus(),
    unlocks: save.unlockCtx(),
    threat,
  });
  scene.onEnd = sim => app.set(new ResultsScene(sim, vs, threat));
  app.set(scene);
}
