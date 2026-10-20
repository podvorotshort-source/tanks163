// Финальная сцена в изометрическом пиксель-арте: планета, на которой шёл последний бой, оказывается
// глобусом на детском столе. Рядом — карандаши, кубики, книжка, лампа и игрушечные танки игроков
// (тот самый облик I, с которого всё началось). Камера отъезжает от планеты во весь экран к столу.

import * as THREE from 'three';
import { modelGroup, poseParts } from './meshes';
import { groundMesh, cellAt } from './ground';
import { PAL } from './vox';
import { STAGE_DEFS } from '../sim/content/stages';

export interface EndingScene { group: THREE.Group; globe: THREE.Object3D; center: THREE.Vector3; radius: number }

/** Поставить модель на стол. */
function place(parent: THREE.Object3D, key: string, x: number, z: number, size: number, rotY = 0, lit: THREE.Material, glow: THREE.Material, turret = 0): void {
  const g = modelGroup(key, size, lit, glow);
  poseParts(g, n => (n === 'turret' ? turret : 0));
  g.rotation.y = -rotY;
  g.position.set(x, 0, z);
  parent.add(g);
}

/** Текстура планеты — та же земля ступени VIII, свёрнутая на шар. */
function planetTexture(): THREE.CanvasTexture {
  const W = 256, H = 128, st = STAGE_DEFS[9];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const col = new THREE.Color();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const cell = cellAt(7, (x / W) * st.w, (y / H) * st.h);
    col.set(PAL[cell.c] ?? cell.c);
    const i = (y * W + x) * 4;
    img.data[i] = col.r * 255; img.data[i + 1] = col.g * 255; img.data[i + 2] = col.b * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildEnding(players: { classId: string; idx: number }[], lit: THREE.Material, glow: THREE.Material): EndingScene {
  const group = new THREE.Group();
  const W = 1200, H = 760;
  group.add(groundMesh(8, -700, -600, W + 700, H + 600, 8, lit));
  const cx = 600, cz = 380;
  // подставка глобуса: деревянное основание, латунная ось и полумеридиан
  const wood = new THREE.MeshLambertMaterial({ color: PAL.wood_d }), brass = new THREE.MeshLambertMaterial({ color: PAL.brass });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(44, 50, 10, 24), wood); base.position.set(cx, 5, cz); base.castShadow = base.receiveShadow = true; group.add(base);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(6, 9, 26, 12), wood); neck.position.set(cx, 22, cz); neck.castShadow = true; group.add(neck);
  const R = 62, gy = 34 + R + 6;
  const tilt = new THREE.Group(); tilt.position.set(cx, gy, cz); tilt.rotation.z = 0.41; group.add(tilt);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 7, 2.4, 6, 40, Math.PI), brass); ring.rotation.y = Math.PI / 2; ring.rotation.z = Math.PI / 2; ring.castShadow = true; tilt.add(ring);
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, R * 2 + 18, 8), brass); axis.castShadow = true; tilt.add(axis);
  const tex = planetTexture();
  const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.35 }));
  globe.castShadow = true; globe.receiveShadow = true; tilt.add(globe);
  // предметы на столе
  place(group, 'prop:book:3', 180, 300, 200, 0.3, lit, glow);
  place(group, 'prop:crayon:0', 330, 560, 190, -0.4, lit, glow);
  place(group, 'prop:crayon:2', 420, 600, 170, 0.15, lit, glow);
  place(group, 'prop:crayon:4', 880, 180, 180, 1.2, lit, glow);
  place(group, 'prop:block:1', 900, 520, 60, 0.2, lit, glow);
  place(group, 'prop:block:3', 960, 470, 52, -0.3, lit, glow);
  place(group, 'prop:block:0', 935, 560, 46, 0.5, lit, glow);
  place(group, 'prop:marble:0', 760, 610, 18, 0, lit, glow);
  place(group, 'prop:marble:2', 790, 640, 16, 0, lit, glow);
  place(group, 'e:deskLamp', 920, 280, 190, 2.4, lit, glow, 0.3);
  for (let i = 0; i < 4; i++) place(group, 'e:soldier', 470 + i * 22, 470 + (i % 2) * 18, 16, -0.6, lit, glow);
  place(group, 'e:toyTank', 760, 480, 46, 2.6, lit, glow, 0.4);
  // игрушечные танки игроков — облик I, смотрят на глобус
  players.forEach((p, i) => {
    const x = cx - 150 + i * 70, z = cz + 170 - i * 30;
    place(group, `tank:${p.classId}:0:${p.idx}`, x, z, 58, Math.atan2(cz - z, cx - x), lit, glow, 0.2 * (i ? -1 : 1));
  });
  return { group, globe, center: new THREE.Vector3(cx, gy, cz), radius: R };
}
