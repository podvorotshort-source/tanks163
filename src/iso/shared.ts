// Общий 3D-вывод на холсте #gl: один на всю игру (бой, финал, фон меню).
import { app } from '../app';
import { IsoWorld } from './world';

let world: IsoWorld | null = null;
export function sharedIso(): IsoWorld {
  if (!world) world = new IsoWorld(app.screen.gl);
  return world;
}
