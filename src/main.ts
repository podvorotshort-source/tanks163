import { App, setApp } from './app';
import { ModelsScene } from './debug/models';
import { GameScene } from './client/game';
import { input } from './input/input';
import { touch } from './input/touch';
import { audio } from './audio/audio';
import { settings } from './meta/settings';
import { save } from './meta/save';
import type { ClassId } from './sim/types';
import { installDebug } from './debug/debug';
import { TitleScene } from './ui/title';
import { ResultsScene } from './ui/results';
import { VARIANTS } from './meta/meta';
import { loadExt } from './gfx/ext';


const canvas = document.getElementById('screen') as HTMLCanvasElement;
const worldCanvas = document.getElementById('world') as HTMLCanvasElement;
const app = new App(canvas, worldCanvas, document.getElementById('hi') as HTMLCanvasElement, document.getElementById('gl') as HTMLCanvasElement);
setApp(app);
settings.load();
settings.onApply(() => { app.maxFps = settings.data.lowSpec ? 30 : 0; });
save.load();
input.onAnyInput = () => audio.unlock();
touch.install();
touch.onAny = () => audio.unlock();
addEventListener('keydown', e => {
  if (e.code === 'F11') { e.preventDefault(); try { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); } catch { /* ignore */ } }
});

// Сначала — внешняя графика (assets/sprites), затем запуск.
function boot(): void {
  const params = new URLSearchParams(location.search);
  const dev = params.get('dev');

  if (dev === 'models') {
    app.set(new ModelsScene(params));
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
