import { App, setApp } from './app';
import { GalleryScene } from './debug/gallery';
import { GameScene } from './client/game';
import { input } from './input/input';
import { audio } from './audio/audio';
import { settings } from './meta/settings';
import { save } from './meta/save';
import type { ClassId } from './sim/types';
import { installDebug } from './debug/debug';
import { TitleScene } from './ui/title';
import { ResultsScene } from './ui/results';
import { VARIANTS } from './meta/meta';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const app = new App(canvas);
setApp(app);
settings.load();
save.load();
input.onAnyInput = () => audio.unlock();
addEventListener('keydown', e => {
  if (e.code === 'F11') { e.preventDefault(); try { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); } catch { /* ignore */ } }
});

const params = new URLSearchParams(location.search);
const dev = params.get('dev');

if (dev === 'gallery') {
  app.set(new GalleryScene());
} else if (dev === 'play') {
  // Прямой запуск боя (для тестов): ?dev=play&cls=assault,heavy&stage=0&seed=7
  const cls = (params.get('cls') ?? 'assault').split(',') as ClassId[];
  const vs = cls.map(c => VARIANTS.find(v => v.id === c)!);
  const scene = new GameScene({ seed: Number(params.get('seed') ?? 7), players: cls.map(c => ({ cls: c })), startStage: Number(params.get('stage') ?? 0), meta: save.bonus(), unlocks: params.get('all') ? undefined : save.unlockCtx() });
  scene.onEnd = sim => app.set(new ResultsScene(sim, vs, 0));
  app.set(scene);
} else {
  app.set(new TitleScene());
}

installDebug(app);
app.start();
canvas.focus();
