import { App, setApp } from './app';
import { GalleryScene } from './debug/gallery';
import { ArtViewScene } from './debug/artView';
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
import { loadExt } from './gfx/ext';
import { mountTunePanel, startTune } from './debug/tune';

// Инструмент настройки масштабов графики: панель слева, игра справа.
const tunePanel = new URLSearchParams(location.search).get('dev') === 'tune' ? mountTunePanel() : null;

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const worldCanvas = document.getElementById('world') as HTMLCanvasElement;
const app = new App(canvas, worldCanvas, document.getElementById('hi') as HTMLCanvasElement);
setApp(app);
settings.load();
save.load();
input.onAnyInput = () => audio.unlock();
addEventListener('keydown', e => {
  if (e.code === 'F11') { e.preventDefault(); try { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); } catch { /* ignore */ } }
});

// Сначала — внешняя графика (assets/sprites), затем запуск.
function boot(): void {
  const params = new URLSearchParams(location.search);
  const dev = params.get('dev');

  if (dev === 'gallery') {
    app.set(new GalleryScene());
  } else if (dev === 'art') {
    app.set(new ArtViewScene());
  } else if (dev === 'tune' && tunePanel) {
    startTune(app, tunePanel, params);
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
}

void loadExt().catch(e => console.warn('Внешняя графика не загружена', e)).then(() => {
  boot();
  installDebug(app);
  app.start();
  canvas.focus();
});
