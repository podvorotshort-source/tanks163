// Фон меню: живой кусочек мира ступени в той же изометрии, что и бой. Камера медленно плывёт,
// по полю катаются враги этой ступени и два танка игроков.
import * as THREE from 'three';
import { groundMesh } from './ground';
import { modelGroup, poseParts } from './meshes';
import { ENEMIES } from '../sim/content/enemies';
import type { Camera } from '../client/camera';
import { tierOf } from '../client/tiers';

const PROPS: [string, number][][] = [
  [['brick', 16], ['steel', 16], ['bush', 20], ['crate', 14]],
  [['block', 30], ['crayon', 110], ['marble', 16], ['book', 120]],
  [['box', 50], ['bookStack', 40], ['toyDebris', 16]],
  [['clutter', 24], ['plant', 60], ['armchair', 100]],
  [['house', 120], ['tree', 26], ['car', 24]],
  [['midrise', 32], ['tower', 110]],
  [['cityDot', 36], ['mountain', 200]],
  [['crystal', 50], ['volcano', 220]],
];

interface Mover { g: THREE.Group; cx: number; cz: number; r: number; sp: number; ph: number; h: number; spin: boolean }

const hash = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

export class MenuShowcase {
  readonly group = new THREE.Group();
  private movers: Mover[] = [];

  constructor(readonly stage: number, lit: THREE.Material, glow: THREE.Material) {
    const W = 1800, H = 1200;
    this.group.add(groundMesh(stage, 0, 0, W, H, 10, lit));
    const props = PROPS[stage];
    for (let i = 0; i < 70; i++) {
      const [kind, size] = props[i % props.length];
      const g = modelGroup(`prop:${kind}:${i % 5}`, size * (0.8 + hash(i, 3) * 0.4), lit, glow);
      g.position.set(hash(i, 1) * W, 0, hash(i, 2) * H);
      if (kind === 'crayon' || kind === 'car') g.rotation.y = hash(i, 4) > 0.5 ? Math.PI / 2 : 0;
      this.group.add(g);
    }
    const roster = Object.values(ENEMIES).filter(e => e.stage === stage);
    const add = (key: string, size: number, i: number, air = false) => {
      const g = modelGroup(key, size, lit, glow);
      this.group.add(g);
      this.movers.push({ g, cx: 500 + hash(i, 5) * 800, cz: 350 + hash(i, 6) * 500, r: 90 + hash(i, 7) * 200, sp: (0.15 + hash(i, 8) * 0.2) * (i % 2 ? 1 : -1), ph: hash(i, 9) * 7, h: air ? size * 0.9 : 0, spin: key.includes('top') });
    };
    roster.slice(0, 7).forEach((e, i) => add(`e:${e.art}`, e.size * 1.3, i, !!e.air));
    const tier = tierOf(stage);
    add(`tank:assault:${tier}:0`, 30, 20);
    add(`tank:heavy:${tier}:1`, 32, 21);
  }

  update(t: number): void {
    for (const m of this.movers) {
      const a = m.ph + t * m.sp;
      m.g.position.set(m.cx + Math.cos(a) * m.r, m.h, m.cz + Math.sin(a) * m.r);
      m.g.rotation.y = -(a + (m.sp > 0 ? Math.PI / 2 : -Math.PI / 2));
      poseParts(m.g, n => (n === 'turret' ? Math.sin(t * 0.7 + m.ph) * 0.8 : n === 'rotor' ? t * 25 : n === 'spin' ? t * 6 : n === 'key' ? t * 2 : n === 'prop' ? t * 30 : 0));
    }
  }

  frame(cam: Camera, W: number, H: number, t: number): void {
    cam.setScreen(W, H);
    cam.zoom = H / 300;
    cam.x = 900 + Math.sin(t * 0.05) * 220; cam.y = 600 + Math.cos(t * 0.04) * 160;
    cam.snap();
  }
}
