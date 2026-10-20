// Фон меню: живой кусочек мира ступени в той же изометрии, что и бой. Камера медленно плывёт,
// по полю катаются враги этой ступени и два танка игроков.
import * as THREE from 'three';
import { ART_Z } from './paint';
import { modelGroup, poseParts } from './meshes';
import { ENEMIES } from '../sim/content/enemies';
import { STAGE_DEFS } from '../sim/content/stages';
import { Rng } from '../core/rng';
import type { Camera } from '../client/camera';
import { tierOf } from '../client/tiers';

const _PROPS: [string, number][][] = [
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
    // препятствия — те же, что на ступени (пруды и т. п. нарисованы в земле)
    const def = STAGE_DEFS[stage];
    for (const p of def.props(new Rng((1 ^ (stage * 7919)) >>> 0), def)) {
      if (p.kind === 'water' || p.x > 2200 || p.y > 1500) continue;
      const g = modelGroup(`prop:${p.kind}:${p.v}`, Math.max(p.w, p.h), lit, glow);
      if (p.h > p.w * 1.3) g.rotation.y = Math.PI / 2;
      g.position.set(p.x, 0, p.y);
      this.group.add(g);
    }
    const roster = Object.values(ENEMIES).filter(e => e.stage === stage);
    const add = (key: string, size: number, i: number, air = false) => {
      const g = modelGroup(key, size, lit, glow);
      this.group.add(g);
      this.movers.push({ g, cx: 850 + hash(i, 5) * 300, cz: 560 + hash(i, 6) * 260, r: 120 + hash(i, 7) * 220, sp: (0.15 + hash(i, 8) * 0.2) * (i % 2 ? 1 : -1), ph: hash(i, 9) * 7, h: air ? size * 0.9 : 0, spin: key.includes('top') });
    };
    roster.slice(0, 7).forEach((e, i) => add(`e:${e.art}`, e.size * 1.9, i, !!e.air));
    const tier = tierOf(stage);
    add(`tank:assault:${tier}:0`, 64, 20);
    add(`tank:heavy:${tier}:1`, 64, 21);
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
    cam.zoom = ART_Z;
    cam.x = 1000 + Math.sin(t * 0.05) * 260; cam.y = 700 + Math.cos(t * 0.04) * 180;
    cam.snap();
  }
}

void _PROPS;
