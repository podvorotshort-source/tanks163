// Витрина изометрических моделей: ?dev=models&g=tanks|s0..s7|bosses|props0..&zoom=2.5
// Модели стоят сеткой на поле, медленно поворачиваются; подписи — в слое интерфейса.
import * as THREE from 'three';
import type { Scene } from '../app';
import { app } from '../app';
import { drawText } from '../gfx/font';
import { Camera } from '../client/camera';
import { IsoRenderer, ModelPool } from '../iso/renderer';
import { model } from '../iso/models/index';
import { ENEMIES } from '../sim/content/enemies';
import { BOSSES } from '../sim/bosses';
import { PAL } from '../iso/vox';

const STAGE_PROPS: string[][] = [
  ['brick', 'steel', 'bush', 'water', 'crate', 'hq', 'steelWall'],
  ['block', 'book', 'crayon', 'furnitureLeg', 'marble', 'slipper', 'pillow'],
  ['bed', 'bookStack', 'box', 'desk', 'shelf', 'toyDebris', 'wardrobe'],
  ['clutter', 'houseWall', 'sofa', 'table', 'fridge', 'tvStand', 'plant', 'armchair', 'stove'],
  ['car', 'house', 'tree'],
  ['midrise', 'tower'],
  ['cityDot', 'mountain'],
  ['crystal', 'volcano'],
];

export class ModelsScene implements Scene {
  readonly id = 'models';
  private r: IsoRenderer | null = null;
  private cam = new Camera();
  private items: { key: string; label: string; x: number; y: number; size: number; boss?: boolean; foot?: [number, number] }[] = [];
  private pools = new Map<string, ModelPool>();
  private t = 0;
  private zoom: number;
  private spin: boolean;
  private ang: number;

  constructor(params: URLSearchParams) {
    const g = params.get('g') ?? 's0';
    this.zoom = Number(params.get('zoom') ?? 2.4);
    this.spin = !params.has('a');
    this.ang = Number(params.get('a') ?? 0);
    const keys: { key: string; label: string; size: number; boss?: boolean; foot?: [number, number] }[] = [];
    if (g === 'tanks') {
      for (const cls of ['scout', 'assault', 'heavy']) for (let t = 0; t < 8; t++) keys.push({ key: `tank:${cls}:${t}:${t % 2 && cls === 'assault' ? 1 : 0}`, label: `${cls} ${t + 1}`, size: 28 });
    } else if (g === 'bosses') {
      for (const b of Object.values(BOSSES)) keys.push({ key: `boss:${b.art}`, label: b.name, size: 110, boss: true });
    } else if (g === 'one') {
      for (const k of (params.get('k') ?? '').split(',')) keys.push({ key: k, label: k, size: 100 });
    } else if (g.startsWith('s')) {
      const st = Number(g.slice(1));
      for (const e of Object.values(ENEMIES)) if (e.stage === st) keys.push({ key: `e:${e.art}`, label: e.name, size: e.size });
      for (const k of STAGE_PROPS[st] ?? []) keys.push({ key: `prop:${k}:0`, label: k, size: 30, foot: [30, 30] });
    }
    const cols = g === 'one' ? keys.length : g === 'bosses' ? 4 : Math.ceil(Math.sqrt(keys.length * 1.6));
    const cell = g === 'one' ? 130 : g === 'bosses' ? 150 : g === 'tanks' ? 46 : Math.max(46, ...keys.map(k => k.size)) * 1.25;
    keys.forEach((k, i) => this.items.push({ ...k, x: (i % cols) * cell, y: Math.floor(i / cols) * cell }));
    this.cam.x = ((cols - 1) * cell) / 2; this.cam.y = (Math.floor((keys.length - 1) / cols) * cell) / 2;
  }

  update(dt: number): void { this.t += dt; }

  renderWorld(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    ctx.clearRect(0, 0, s.ww, s.wh);
    if (!this.r) {
      this.r = new IsoRenderer(s.gl);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: PAL.grass }));
      g.receiveShadow = true; this.r.scene.add(g);
    }
    this.cam.setScreen(s.ww, s.wh);
    this.cam.zoom = this.zoom * (s.wh / 540);
    this.cam.snap();
    this.r.resize(s.ww, s.wh);
    for (const p of this.pools.values()) p.begin();
    const m4 = new THREE.Matrix4();
    for (const it of this.items) {
      let p = this.pools.get(it.key);
      const mdl = model(it.key);
      if (!p) { p = new ModelPool(this.r.scene, mdl, this.r.litMat, this.r.glowMat); this.pools.set(it.key, p); }
      const a = this.spin ? this.t * 0.4 : this.ang;
      if (it.foot && mdl.foot) {
        const sc = it.size / Math.max(...mdl.foot);
        m4.makeRotationY(-a).scale(new THREE.Vector3(sc, sc, sc)).setPosition(it.x, 0, it.y);
      } else {
        const sc = it.size / mdl.size;
        m4.makeRotationY(-a).scale(new THREE.Vector3(sc, sc, sc)).setPosition(it.x, 0, it.y);
      }
      p.add(m4, n => (n === 'turret' ? Math.sin(this.t) * 0.6 : n === 'rotor' ? this.t * 20 : n === 'key' ? this.t * 2 : n === 'prop' ? this.t * 20 : n === 'spin' ? this.t * 6 : 0));
    }
    for (const p of this.pools.values()) p.end();
    this.r.setCamera(this.cam);
    this.r.render();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = app.screen, k = s.w2u;
    for (const it of this.items) {
      const x = this.cam.sxOf(it.x, it.y) * k, y = this.cam.syOf(it.x, it.y) * k;
      drawText(ctx, it.label, x, y + 10, { align: 'center', color: '#fff4b0', font: 'small', outline: '#07060b' });
    }
  }
}
