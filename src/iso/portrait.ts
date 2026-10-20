// Витрина модели для меню: маленький отдельный 3D-вывод с прозрачным фоном, кадр копируется в 2D.
import * as THREE from 'three';
import { IsoRenderer } from './renderer';
import { Camera, ISO_H, ISO_Y } from '../client/camera';
import { modelGroup, poseParts } from './meshes';

let r: IsoRenderer | null = null;
const cam = new Camera();
const holder = new THREE.Group();
const cache = new Map<string, THREE.Group>();

/** Нарисовать модель key в квадрате px×px (центр модели — в центре), повернув на угол a. Возвращает холст. */
export function portrait(key: string, px: number, a: number, rot?: (part: string) => number): HTMLCanvasElement {
  if (!r) {
    r = new IsoRenderer(document.createElement('canvas'), true);
    r.scene.add(holder);
  }
  let g = cache.get(key);
  if (!g) { g = modelGroup(key, 40, r.litMat, r.glowMat); cache.set(key, g); }
  holder.clear(); holder.add(g);
  g.rotation.y = -a;
  if (rot) poseParts(g, rot);
  px = Math.max(16, Math.round(px));
  r.resize(px, px);
  cam.setScreen(px, px);
  cam.zoom = px / 62;
  const lift = (12 * ISO_H) / (2 * ISO_Y);
  cam.x = -lift; cam.y = -lift;
  cam.snap();
  r.setCamera(cam);
  r.render();
  return r.gl.domElement;
}
