// Статичные сетки моделей (для сцен без пулов: финал, витрины меню, фон меню).
import * as THREE from 'three';
import { model } from './models/index';

/** Группа из частей модели key, размер size (по основанию для препятствий). Часть 'turret' — sub.userData.part. */
export function modelGroup(key: string, size: number, lit: THREE.Material, glow: THREE.Material): THREE.Group {
  const m = model(key);
  const g = new THREE.Group();
  const k = size / (m.foot ? Math.max(...m.foot) : m.size);
  for (const p of m.parts) {
    const sub = new THREE.Group();
    sub.position.copy(p.at);
    sub.userData.part = p.name;
    sub.userData.axis = p.axis;
    if (p.lit) { const me = new THREE.Mesh(p.lit, lit); me.castShadow = true; me.receiveShadow = true; sub.add(me); }
    if (p.glow) sub.add(new THREE.Mesh(p.glow, glow));
    g.add(sub);
  }
  g.scale.setScalar(k);
  return g;
}

/** Повернуть части модели (башня, винты) по имени. */
export function poseParts(g: THREE.Object3D, rot: (name: string) => number): void {
  for (const sub of g.children) {
    const n = sub.userData.part as string | undefined;
    if (!n) continue;
    const a = rot(n), ax = sub.userData.axis as string;
    sub.rotation.set(ax === 'x' ? a : 0, ax === 'y' ? a : 0, ax === 'z' ? a : 0);
  }
}
