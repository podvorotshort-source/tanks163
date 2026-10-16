import { App, setApp } from './app';
import { GalleryScene } from './debug/gallery';
import { GameScene } from './client/game';
import { input } from './input/input';
import { audio } from './audio/audio';
import { settings } from './meta/settings';
import type { ClassId } from './sim/types';
import { installDebug } from './debug/debug';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const app = new App(canvas);
setApp(app);
settings.load();
input.onAnyInput = () => audio.unlock();

const params = new URLSearchParams(location.search);
const dev = params.get('dev');

if (dev === 'gallery') {
  app.set(new GalleryScene());
} else if (dev === 'play') {
  const cls = (params.get('cls') ?? 'assault').split(',') as ClassId[];
  const scene = new GameScene({ seed: Number(params.get('seed') ?? 7), players: cls.map(c => ({ cls: c })), startStage: Number(params.get('stage') ?? 0) });
  scene.onEnd = () => app.set(new GameScene({ seed: Date.now() & 0xffff, players: cls.map(c => ({ cls: c })) }));
  app.set(scene);
} else {
  // Временно: сразу в бой, пока нет меню.
  const scene = new GameScene({ seed: Date.now() & 0xffff, players: [{ cls: 'assault' }, { cls: 'heavy' }] });
  app.set(scene);
}

installDebug(app);
app.start();
canvas.focus();
