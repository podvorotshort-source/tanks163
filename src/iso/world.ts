// Изометрический мир игры: связывает симуляцию с 3D-выводом.
// Сцена ступени s = арена (земля + препятствия + юниты) + «внешний мир» ступени s+1 вокруг (в 4 раза крупнее).
// Переход между ступенями — непрерывный отъезд камеры: внешний мир уже на месте, после переключения
// он становится ареной, а прежняя арена остаётся в нём «реликвией».

import * as THREE from 'three';
import type { Camera } from '../client/camera';
import type { Sim } from '../sim/sim';
import type { Enemy, Player } from '../sim/entities';
import { STAGE_DEFS } from '../sim/content/stages';
import { STAGE_GROWTH } from '../sim/types';
import { MATS } from '../sim/props';
import { IsoRenderer, ModelPool } from './renderer';
import { model } from './models/index';
import { groundMesh, frameMesh, cellAt } from './ground';
import { decoFor } from './models/deco';
import { tierOf } from '../client/tiers';
import { bossDropH } from '../client/render';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Decal { x: number; y: number; r: number; kind: string; col: string; seed: number; a: number }

/** Неподвижные модели (не поворачиваются к цели). */
const FIXED = new Set(['toyBunker', 'jackBox', 'deskLamp', 'tv', 'silo', 'lance', 'mobileFort', 'moonlet']);

export class IsoWorld {
  readonly r: IsoRenderer;
  private pools = new Map<string, ModelPool>();
  private stage = -1;
  private stageGroup = new THREE.Group();
  private units = new THREE.Group();
  private decals: THREE.InstancedMesh;
  private decalN = 0;
  private decalMax = 400;
  private tmp = new THREE.Matrix4();
  private col = new THREE.Color();

  constructor(canvas: HTMLCanvasElement) {
    this.r = new IsoRenderer(canvas);
    this.r.scene.add(this.stageGroup, this.units);
    const dg = new THREE.CircleGeometry(1, 12); dg.rotateX(-Math.PI / 2);
    this.decals = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }), this.decalMax);
    this.decals.count = 0; this.decals.frustumCulled = false; this.decals.renderOrder = 1;
    this.r.scene.add(this.decals);
  }

  // ------------------------------------------------------------ ступень: земля, рамка, внешний мир
  private built = new Map<number, THREE.Group>();

  /** Заранее собрать сцену ступени s (дорого: земля из десятков тысяч клеток). */
  prebuild(s: number): void { if (s <= 7 && !this.built.has(s)) this.built.set(s, this.buildStage(s)); }

  private buildStage(s: number): THREE.Group {
    const grp = new THREE.Group();
    const st = STAGE_DEFS[s], mat = this.r.litMat;
    grp.add(groundMesh(s, 0, 0, st.w, st.h, 10, mat));
    grp.add(frameMesh(s, st.w, st.h, mat));
    this.addDeco(grp, s);
    // внешний мир — следующая ступень (или стол с глобусом за планетой), в 4 раза крупнее, чуть ниже
    const G = STAGE_GROWTH, ns = s + 1, nd = STAGE_DEFS[Math.min(ns, 7)];
    const relX = ns <= 7 ? nd.relicX : 1440, relY = ns <= 7 ? nd.relicY : 810;
    const outer = groundMesh(ns, 0, 0, ns <= 7 ? nd.w : 2880, ns <= 7 ? nd.h : 1620, 32, mat);
    outer.scale.set(G, G, G);
    outer.position.set(st.w / 2 - relX * G, -3, st.h / 2 - relY * G);
    grp.add(outer);
    // ещё дальше — ровная поверхность, чтобы при отъезде ×24 не было пустоты
    const far = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: ['#c58a4e', '#a06a3a', '#6e6a6a', '#7a8a6a', '#5a7a4a', '#2a4a7a', '#14101e', '#14101e', '#14101e'][Math.min(ns, 8)] }));
    far.scale.set(st.w * 400, 1, st.h * 400); far.position.set(st.w / 2, -8, st.h / 2); far.receiveShadow = true;
    grp.add(far);
    return grp;
  }

  /** Мелкие детали на земле арены (статичные экземпляры, без теней). */
  private addDeco(grp: THREE.Group, s: number): void {
    const st = STAGE_DEFS[s], G = STAGE_GROWTH;
    const prev = s > 0 ? STAGE_DEFS[s - 1] : null;
    const rx0 = prev ? st.relicX - prev.w / G / 2 : 0, ry0 = prev ? st.relicY - prev.h / G / 2 : 0;
    const byKey = new Map<string, THREE.Matrix4[]>();
    let seed = 1234567 + s * 999;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    const N = 4200;
    for (let i = 0; i < N; i++) {
      const x = rnd() * st.w, y = rnd() * st.h;
      if (prev && x > rx0 - 10 && y > ry0 - 10 && x < rx0 + prev.w / G + 10 && y < ry0 + prev.h / G + 10) continue;
      const d = decoFor(s, cellAt(s, x, y).c);
      if (!d) continue;
      const key = `deco:${d[0]}:${Math.floor(rnd() * 5)}`;
      const m = model(key), k = (d[1] / m.size) * (0.8 + rnd() * 0.5);
      const mx = new THREE.Matrix4().makeRotationY(rnd() * 6.283).scale(new THREE.Vector3(k, k, k)).setPosition(x, 0, y);
      let arr = byKey.get(key); if (!arr) byKey.set(key, (arr = []));
      arr.push(mx);
    }
    for (const [key, arr] of byKey) {
      const part = model(key).parts[0];
      if (!part.lit) continue;
      const im = new THREE.InstancedMesh(part.lit, this.r.litMat, arr.length);
      arr.forEach((mx, i) => im.setMatrixAt(i, mx));
      im.receiveShadow = true; im.frustumCulled = false; im.userData.shared = true;
      grp.add(im);
    }
  }

  /** Показать сцену ступени s. */
  setStage(s: number): void {
    if (s === this.stage) return;
    const old = this.stage;
    this.stage = s;
    this.prebuild(s);
    this.stageGroup.clear();
    this.stageGroup.add(this.built.get(s)!);
    // прежняя ступень больше не нужна — освобождаем память
    const g = this.built.get(old);
    if (g && old !== s) { g.traverse(o => { if ((o as THREE.Mesh).geometry && !o.userData.shared) (o as THREE.Mesh).geometry.dispose(); }); this.built.delete(old); }
    this.decalN = 0; this.decals.count = 0;
  }

  // ------------------------------------------------------------ следы на земле
  clearDecals(): void { this.decalN = 0; this.decals.count = 0; }

  addDecal(d: Decal): void {
    const i = this.decalN % this.decalMax;
    const r = d.r * (d.kind === 'crater' ? 1.1 : 1);
    this.tmp.compose(new THREE.Vector3(d.x, 0.05 + (i % 7) * 0.01, d.y), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.seed), new THREE.Vector3(r, 1, r * (0.75 + ((d.seed >>> 3) % 5) * 0.06)));
    this.decals.setMatrixAt(i, this.tmp);
    this.col.set(d.kind === 'rubble' ? d.col : d.kind === 'splat' ? '#2a2630' : '#14111a');
    this.decals.setColorAt(i, this.col);
    this.decalN++;
    this.decals.count = Math.min(this.decalN, this.decalMax);
    this.decals.instanceMatrix.needsUpdate = true;
    if (this.decals.instanceColor) this.decals.instanceColor.needsUpdate = true;
  }

  // ------------------------------------------------------------ пулы моделей
  private pool(key: string): ModelPool {
    let p = this.pools.get(key);
    if (!p) { p = new ModelPool(this.units, model(key), this.r.litMat, this.r.glowMat); this.pools.set(key, p); }
    return p;
  }

  private root(x: number, h: number, y: number, a: number, s: number): THREE.Matrix4 {
    return this.tmp.makeRotationY(-a).scale(new THREE.Vector3(s, s, s)).setPosition(x, h, y);
  }

  // ------------------------------------------------------------ отдельная сцена (финал)
  private extra: THREE.Object3D | null = null;
  /** Показать вместо мира другую сцену (финальный стол с глобусом). */
  renderScene(obj: THREE.Object3D, cam: Camera): void {
    if (this.extra !== obj) {
      if (this.extra) this.r.scene.remove(this.extra);
      this.extra = obj; this.r.scene.add(obj);
      this.stageGroup.visible = this.units.visible = this.decals.visible = false;
    }
    this.r.resize(cam.w, cam.h);
    this.r.setCamera(cam);
    this.r.render();
  }

  // ------------------------------------------------------------ кадр
  render(sim: Sim, cam: Camera, alpha: number, time: number, opts: { hideProps?: boolean; hideUnits?: boolean } = {}): void {
    if (this.extra) { this.r.scene.remove(this.extra); this.extra = null; this.stageGroup.visible = this.units.visible = this.decals.visible = true; }
    this.r.resize(cam.w, cam.h);
    this.setStage(sim.stageIdx);
    for (const p of this.pools.values()) p.begin();
    if (!opts.hideProps) this.syncProps(sim, time);
    if (!opts.hideUnits) {
      for (const p of sim.players) this.syncPlayer(sim, p, alpha, time);
      for (const e of sim.enemies) this.syncEnemy(sim, e, alpha, time);
      for (const d of sim.drones) {
        const m = model('drone');
        this.pool('drone').add(this.root(d.x, sim.size * 1.2, d.y, d.a, (sim.size * 0.45) / m.size), n => (n === 'rotor' ? time * 30 : 0));
      }
    }
    for (const p of this.pools.values()) p.end();
    this.r.setCamera(cam);
    this.r.render();
  }

  private syncProps(sim: Sim, time: number): void {
    const under = (px: number, py: number, w: number, h: number) => sim.players.some(pl => pl.state === 'alive' && Math.abs(pl.x - px) < w / 2 + pl.r && Math.abs(pl.y - py) < h / 2 + pl.r);
    for (const p of sim.props.props) {
      if (p.dead) continue;
      const key = `prop:${p.kind}:${p.v}`;
      const m = model(key), foot = m.foot ?? [m.size, m.size];
      let w = p.w, h = p.h, a = 0;
      if (foot[0] > foot[1] * 1.3 && p.h > p.w * 1.3) { a = Math.PI / 2; w = p.h; h = p.w; }
      const sx = w / foot[0], sz = h / foot[1], sy = Math.min(sx, sz);
      const mat = MATS[p.mat];
      let ky = 1;
      if (mat.canopy && under(p.x, p.y, p.w, p.h)) ky = 0.3;               // танк под кустом — куст «приминается»
      if (p.ttl !== undefined && p.ttl < 2 && Math.floor(time * 8) % 2) continue;
      this.tmp.makeRotationY(a).scale(new THREE.Vector3(sx, sy * ky, sz)).setPosition(p.x, 0, p.y);
      const dmg = p.maxHp < 1e11 && p.hp < p.maxHp * 0.5 && !mat.solid;
      this.pool(key).add(this.tmp, undefined, dmg ? DMG : undefined);
    }
  }

  private syncPlayer(sim: Sim, p: Player, alpha: number, time: number): void {
    if (p.state === 'dead' || p.state === 'out') return;
    if (p.invulnT > 0 && p.invulnT < 3 && Math.floor(time * 14) % 2 === 0) return;
    const x = lerp(p.px, p.x, alpha), y = lerp(p.py, p.y, alpha);
    const tier = tierOf(sim.stageIdx);
    const key = p.state === 'down' ? `wreck:${p.classId}:${tier}` : `tank:${p.classId}:${tier}:${p.idx}`;
    const m = model(key);
    const s = sim.size / m.size;
    const col = p.hurtT > 0.12 ? FLASH : undefined;
    this.pool(key).add(this.root(x, 0, y, p.angle, s), n => (n === 'turret' ? -(p.turret - p.angle) : 0), col);
  }

  private syncEnemy(sim: Sim, e: Enemy, alpha: number, time: number): void {
    const x = lerp(e.px, e.x, alpha), y = lerp(e.py, e.y, alpha);
    const art = e.def.art;
    const boss = e === sim.boss;
    const key = boss ? `boss:${art}` : `e:${art}`;
    const m = model(key);
    let s = e.size / m.size;
    if (e.spawnT > 0) s *= Math.max(0.05, 1 - e.spawnT / 0.45);
    const h = (e.air ? e.size * 0.9 + Math.sin(time * 3 + e.id) * e.size * 0.05 : 0) + (boss ? bossDropH(e) : 0);
    const fixed = FIXED.has(art);
    const a = fixed ? 0 : e.angle;
    let col: THREE.Color | undefined;
    if (e.flash > 0) col = FLASH;
    else if (e.bonus && Math.floor(time * 5) % 2 === 0) col = BONUS;
    else if (e.elite) col = ELITE;
    else if (e.burnT > 0) col = BURN;
    this.pool(key).add(this.root(x, h, y, a, s), n => (n === 'turret' ? -(e.turret - a) : n === 'rotor' ? time * 25 + e.id : n === 'key' ? time * 2.5 : n === 'spin' ? time * 6 : n === 'prop' ? time * 30 : 0), col);
  }
}

const FLASH = new THREE.Color(3.2, 3.2, 3.2);
const ELITE = new THREE.Color(1.25, 0.82, 1.4);
const BONUS = new THREE.Color(1.8, 0.7, 0.6);
const BURN = new THREE.Color(0.75, 0.6, 0.55);
const DMG = new THREE.Color(0.72, 0.68, 0.7);
