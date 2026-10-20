// Изометрический мир игры: связывает симуляцию с 3D-выводом.
// Земля — нарисованная попиксельно картинка ступени (src/iso/paint), объекты — воксельные модели.
// В бою масштаб постоянный (ART_Z). Переход между ступенями: танк поглощает босса и растёт вчетверо,
// камера отъезжает вчетверо; под старой ареной проступает земля следующей ступени, где старая арена
// заново нарисована «реликвией» в новом масштабе, а затем старая картинка гаснет.

import * as THREE from 'three';
import type { Camera } from '../client/camera';
import { ISO_X, ISO_Y } from '../client/camera';
import type { Sim } from '../sim/sim';
import type { Enemy, Player } from '../sim/entities';
import { STAGE_DEFS } from '../sim/content/stages';
import { STAGE_GROWTH } from '../sim/types';
import { MATS, toyify, type Prop, type ToyPiece } from '../sim/props';
import { Rng } from '../core/rng';
import { IsoRenderer, ModelPool } from './renderer';
import { FxLayer } from './fxgl';
import { TreadMarks } from './treads';
import { TRACK_PHASES, type BuiltModel } from './vox';
import { model } from './models/index';
import { paintStage, paintNow, ART_Z, type PaintResult } from './paint';
import { tierOf } from '../client/tiers';
import { bossDropH, airH } from '../client/render';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const G = STAGE_GROWTH;

export interface Decal { x: number; y: number; r: number; kind: string; col: string; seed: number; a: number }

/** Состояние кат-сцены перехода для вывода. */
export interface TransView {
  from: number;
  /** Симуляция уже на новой ступени (координаты — новые). */
  switched: boolean;
  /** Визуальный рост танков (1 → 4 в старых координатах; после переключения — 1). */
  tankScale: number;
  /** Облик уже новый (поглощение свершилось). */
  evolved: boolean;
  /** Обломки босса: тают и втягиваются в танк (k: 1 → 0). */
  wreck: { x: number; y: number; size: number; angle: number; art: string; k: number } | null;
  /** Непрозрачность старой земли и её полей (мира вокруг арены). */
  oldAlpha: number;
  marginAlpha: number;
  /** Прозрение «это были игрушки» (0..1): стены волной от центра становятся ЛЕГО, кусты — деревцами. */
  lego: number;
}

/** Неподвижные модели (не поворачиваются к цели). */
const FIXED = new Set(['toyBunker', 'jackBox', 'deskLamp', 'tv', 'silo', 'lance', 'mobileFort', 'moonlet']);
/** Нарисованы в земле — моделей нет. */
const PAINTED = new Set(['water']);

/** Гусеницы машины между кадрами: центры лент, путь каждой ленты (знак — вперёд/назад), след. */
interface Treads { x: number; y: number; cx: number[]; cy: number[]; d: number[]; odo: number[]; mx: number[]; my: number[]; seen: number }
const mod = (n: number, m: number) => ((n % m) + m) % m;

export class IsoWorld {
  readonly r: IsoRenderer;
  /** Огонь на земле с проверкой глубины (заполняет Fx.syncGl). */
  readonly fx: FxLayer;
  private pools = new Map<string, ModelPool>();
  private units = new THREE.Group();
  private decals: THREE.InstancedMesh;
  private decalN = 0;
  private decalMax = 400;
  /** Следы гусениц на земле и состояние лент каждой машины (кадр анимации, где оставлена последняя метка). */
  private marks = new TreadMarks();
  private treads = new Map<string, Treads>();
  private frameNo = 0;
  private tmp = new THREE.Matrix4();
  private col = new THREE.Color();
  private seed = -1;
  private paints = new Map<string, PaintResult>();
  private jobs = new Map<string, Generator<void, PaintResult>>();
  private nextProps = new Map<number, Prop[]>();
  /** Игрушки, в которые превращаются препятствия старой арены при отъезде камеры. */
  private toys: { from: number; list: { piece: ToyPiece; prop: Prop; t: number; shown: boolean }[] } | null = null;
  /** Кусок стены стал игрушкой (для облачка пыли): центр и размеры. */
  onToySwap: ((x: number, y: number, w: number, h: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.r = new IsoRenderer(canvas);
    this.r.scene.add(this.units);
    const dg = new THREE.CircleGeometry(1, 12); dg.rotateX(-Math.PI / 2);
    this.decals = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }), this.decalMax);
    this.decals.count = 0; this.decals.frustumCulled = false; this.decals.renderOrder = 1;
    this.r.scene.add(this.decals);
    this.r.scene.add(this.marks.mesh);
    this.fx = new FxLayer(this.r.gl);
    this.r.scene.add(this.fx.group);
    // Контактная тень (затенение у основания): тёмный «коврик» со ступенчатым краем под каждым объектом —
    // объекты «стоят» на земле, а не парят над ней.
    const ag = new THREE.PlaneGeometry(1, 1); ag.rotateX(-Math.PI / 2);
    this.ao = new THREE.InstancedMesh(ag, new THREE.MeshBasicMaterial({ color: '#120a24', map: aoTexture(), transparent: true, opacity: 0.62, depthWrite: false }), this.aoMax);
    this.ao.count = 0; this.ao.frustumCulled = false; this.ao.renderOrder = 0;
    this.ao.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.r.scene.add(this.ao);
  }

  private ao: THREE.InstancedMesh;
  private aoN = 0;
  private aoMax = 3000;
  /** Контактная тень под объектом: центр, размеры (ед.), угол. */
  private aoAdd(x: number, y: number, w: number, h: number, a: number): void {
    if (this.aoN >= this.aoMax) return;
    this.tmp.makeRotationY(-a).scale(new THREE.Vector3(w, 1, h)).setPosition(x, 0.03, y);
    this.ao.setMatrixAt(this.aoN++, this.tmp);
  }

  // ------------------------------------------------------------ земля ступеней
  setSeed(seed: number): void {
    if (seed === this.seed) return;
    this.seed = seed;
    this.jobs.clear(); this.nextProps.clear();
  }

  /** Начать рисовать землю ступени s в фоне (по кусочку в кадр, см. pump). */
  prebuild(s: number): void {
    const key = this.seed + ':' + s;
    if (s > 7 || this.paints.has(key) || this.jobs.has(key)) return;
    this.jobs.set(key, paintStage(s, this.seed));
  }

  /** Продвинуть фоновое рисование (бюджет — миллисекунды). */
  pump(ms: number): void {
    const end = performance.now() + ms;
    for (const [key, g] of this.jobs) {
      while (performance.now() < end) {
        const r = g.next();
        if (r.done) { this.store(key, r.value); this.jobs.delete(key); break; }
      }
      if (performance.now() >= end) return;
    }
  }

  /** Земля ступени — готовая (дорисовывается сразу, если не успела в фоне). */
  paint(s: number): PaintResult {
    const key = this.seed + ':' + s;
    let p = this.paints.get(key);
    if (!p) {
      const g = this.jobs.get(key);
      if (g) { for (;;) { const r = g.next(); if (r.done) { p = r.value; break; } } this.jobs.delete(key); }
      else p = paintNow(s, this.seed);
      this.store(key, p);
    }
    return p;
  }

  /** Хранить не больше четырёх картинок (самые давние — освобождаем). */
  private store(key: string, p: PaintResult): void {
    this.paints.delete(key);
    this.paints.set(key, p);
    while (this.paints.size > 4) { const [k, v] = this.paints.entries().next().value!; v.tex.dispose(); this.paints.delete(k); }
  }

  /** Препятствия ступени — те же, что создаст симуляция (для показа мира вокруг при отъезде камеры). */
  private propsOf(s: number): Prop[] {
    let p = this.nextProps.get(s);
    if (!p) {
      const def = STAGE_DEFS[s];
      p = def.props(new Rng((this.seed ^ (s * 7919)) >>> 0), def);
      this.nextProps.set(s, p);
    }
    return p;
  }

  // ------------------------------------------------------------ следы на земле
  /** Стереть следы (новая ступень — координаты другие). */
  clearDecals(): void { this.decalN = 0; this.decals.count = 0; this.marks.clear(); this.treads.clear(); }

  /** Ленты гусениц машины id: путь каждой ленты за кадр (поворот на месте — ленты в разные стороны),
   *  отпечатки на земле. Возвращает выбор кадра ленты для вывода модели. */
  private treadFrame(id: string, m: BuiltModel, x: number, y: number, a: number, s: number, time: number, marks: boolean): ((g: string) => number) | undefined {
    const tk = m.tracks;
    if (!tk) return undefined;
    let st = this.treads.get(id);
    const ca = Math.cos(a), sa = Math.sin(a);
    const jump = !st || (x - st.x) ** 2 + (y - st.y) ** 2 > (m.size * s) ** 2;     // возрождение, телепорт — без следа
    if (!st) { st = { x, y, cx: [], cy: [], d: [], odo: [], mx: [], my: [], seen: 0 }; this.treads.set(id, st); }
    st.seen = this.frameNo;
    const step = 3 * s;                       // метка — каждые 3 вокселя пути ленты
    for (let i = 0; i < tk.length; i++) {
      const off = tk[i].off * s, cx = x - sa * off, cy = y + ca * off;
      if (jump || st.cx[i] === undefined) { st.cx[i] = st.mx[i] = cx; st.cy[i] = st.my[i] = cy; st.d[i] ??= 0; st.odo[i] ??= 0; continue; }
      st.d[i] += (cx - st.cx[i]) * ca + (cy - st.cy[i]) * sa;
      st.cx[i] = cx; st.cy[i] = cy;
      const ml = Math.sqrt((cx - st.mx[i]) ** 2 + (cy - st.my[i]) ** 2);
      if (ml >= step) {
        if (marks) this.marks.add(st.mx[i], st.my[i], cx, cy, tk[i].w * s * 0.86, st.odo[i], step, time);
        st.odo[i] += ml; st.mx[i] = cx; st.my[i] = cy;
      }
    }
    st.x = x; st.y = y;
    return g => { for (let i = 0; i < tk.length; i++) if (tk[i].group === g) return mod(Math.floor(st!.d[i] / s), TRACK_PHASES); return 0; };
  }

  addDecal(d: Decal): void {
    const i = this.decalN % this.decalMax;
    const r = d.r * (d.kind === 'crater' ? 1.1 : 1);
    this.tmp.compose(new THREE.Vector3(d.x, 0.05 + (i % 7) * 0.01, d.y), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.seed), new THREE.Vector3(r, 1, r * (0.75 + ((d.seed >>> 3) % 5) * 0.06)));
    this.decals.setMatrixAt(i, this.tmp);
    this.col.set(d.kind === 'rubble' ? d.col : d.kind === 'splat' ? '#2a2630' : '#1a1222');
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

  // ------------------------------------------------------------ отдельная сцена (финал, фон меню)
  private extra: THREE.Object3D | null = null;
  /** Показать вместо мира другую сцену; ground — ступень, чья нарисованная земля лежит под ней. */
  renderScene(obj: THREE.Object3D, cam: Camera, ground: number | null = null, seed = 1): void {
    if (this.extra !== obj) {
      if (this.extra) this.r.scene.remove(this.extra);
      this.extra = obj; this.r.scene.add(obj);
      this.units.visible = this.decals.visible = this.marks.mesh.visible = this.fx.group.visible = this.ao.visible = false;
    }
    this.r.resize(cam.w, cam.h);
    if (ground !== null) {
      this.setSeed(seed);
      const p = this.paint(ground);
      this.r.groundView('A', p, (cam.cx - cam.cy) * ISO_X * ART_Z, (cam.cx + cam.cy) * ISO_Y * ART_Z, cam.zoom / ART_Z, 1);
    } else this.r.groundView('A', null, 0, 0, 1, 0);
    this.r.groundView('B', null, 0, 0, 1, 0);
    this.r.setMargin(1);
    this.r.setCamera(cam);
    this.r.render();
  }

  // ------------------------------------------------------------ кадр
  render(sim: Sim, cam: Camera, alpha: number, time: number, tv: TransView | null = null): void {
    if (this.extra) { this.r.scene.remove(this.extra); this.extra = null; this.units.visible = this.decals.visible = this.marks.mesh.visible = this.fx.group.visible = this.ao.visible = true; }
    this.setSeed(sim.cfg.seed);
    this.r.resize(cam.w, cam.h);
    this.ground(sim, cam, tv);
    for (const p of this.pools.values()) p.begin();
    this.aoN = 0;
    if (++this.frameNo % 120 === 0) for (const [k, t] of this.treads) if (this.frameNo - t.seen > 60) this.treads.delete(k);
    this.marks.frame(time);
    let hide: Set<number> | null = null;
    if (tv && !tv.switched && tv.lego > 0) {
      const toys = this.toyList(sim, tv.from, cam);
      hide = new Set();
      const shown: Prop[] = [];
      for (const it of toys) {
        if (tv.lego < it.t) continue;
        for (const id of it.piece.ids) hide.add(id);
        shown.push(it.prop);
        if (!it.shown) { it.shown = true; this.onToySwap?.(it.piece.x, it.piece.y, it.piece.w, it.piece.h); }
      }
      this.syncProps(shown, time, cam, 1, null);
    } else if (!tv) this.toys = null;
    this.syncProps(hide ? sim.props.props.filter(p => !hide!.has(p.id)) : sim.props.props, time, cam, 1, null);
    if (tv && !tv.switched && tv.from < 7) {
      // мир следующей ступени вокруг (в старых координатах — вчетверо крупнее)
      const nd = STAGE_DEFS[tv.from + 1], od = STAGE_DEFS[tv.from];
      this.syncProps(this.propsOf(tv.from + 1), time, cam, G, (x, y) => [od.w / 2 + (x - nd.relicX) * G, od.h / 2 + (y - nd.relicY) * G]);
    }
    for (const p of sim.players) this.syncPlayer(sim, p, alpha, time, tv);
    for (const e of sim.enemies) this.syncEnemy(sim, e, alpha, time);
    // Мины — модели в сцене: танки и враги, наехавшие на мину, закрывают её как положено.
    for (const m of sim.mines) {
      if (m.dead || !cam.visible(m.x, m.y, m.r * 2)) continue;
      const lit = m.armT > 0 ? Math.floor(time * 16) % 2 === 0 : Math.floor(time * 2.5 + m.x * 0.01) % 3 === 0;
      const key = `mine:${m.owner}:${lit ? 1 : 0}`;
      this.pool(key).add(this.root(m.x, 0, m.y, m.x * 0.37, (m.r * 2) / model(key).size));
    }
    if (!tv) {
      for (const d of sim.drones) {
        const m = model('drone');
        this.pool('drone').add(this.root(d.x, sim.size * 1.2, d.y, d.a, (sim.size * 0.45) / m.size), n => (n === 'rotor' ? time * 30 : 0));
      }
    } else if (tv.wreck && tv.wreck.k > 0.02) this.syncWreck(tv.wreck, time);
    for (const p of this.pools.values()) p.end();
    this.ao.count = this.aoN; this.ao.instanceMatrix.needsUpdate = true;
    this.r.setCamera(cam);
    this.fx.end(cam.w, cam.h, cam.zoom);
    this.r.render();
  }

  /** Игрушки старой арены (строятся один раз за переход): порог появления — волна от центра кадра. */
  private toyList(sim: Sim, from: number, cam: Camera): { piece: ToyPiece; prop: Prop; t: number; shown: boolean }[] {
    if (this.toys && this.toys.from === from) return this.toys.list;
    const list = toyify(sim.props.props).map(piece => {
      const d = Math.hypot(piece.x - cam.cx, piece.y - cam.cy) / 1500;
      const j = ((piece.ids[0] * 2654435761) >>> 0) / 4294967296;
      const prop: Prop = { id: -1, kind: piece.kind, x: piece.x, y: piece.y, w: piece.w, h: piece.h, round: piece.kind === 'toyTree', mat: piece.mat, hp: 1, maxHp: 1e12, size: Math.max(piece.w, piece.h), dead: false, v: piece.v, a: 0, _q: 0 };
      return { piece, prop, t: 0.04 + Math.min(1, d) * 0.8 + j * 0.12, shown: false };
    });
    this.toys = { from, list };
    return list;
  }

  /** Слои земли: в бою — картинка ступени 1:1; при переходе — старая поверх новой. */
  private ground(sim: Sim, cam: Camera, tv: TransView | null): void {
    const r = this.r;
    const uv = (x: number, y: number): [number, number] => [(x - y) * ISO_X * ART_Z, (x + y) * ISO_Y * ART_Z];
    if (!tv) {
      const p = this.paint(sim.stageIdx);
      const [u, v] = uv(cam.cx, cam.cy);
      r.groundView('A', p, u, v, cam.zoom / ART_Z, 1);
      r.groundView('B', null, 0, 0, 1, 0);
      r.setMargin(1);
      if (sim.boss || sim.stageTime > sim.stage.bossAt - 40) this.prebuild(sim.stageIdx + 1);
      return;
    }
    const od = STAGE_DEFS[tv.from], nd = STAGE_DEFS[Math.min(7, tv.from + 1)];
    let ox: number, oy: number, nx: number, ny: number, zo: number, zn: number;
    if (!tv.switched) { ox = cam.cx; oy = cam.cy; zo = cam.zoom; nx = nd.relicX + (ox - od.w / 2) / G; ny = nd.relicY + (oy - od.h / 2) / G; zn = zo * G; }
    else { nx = cam.cx; ny = cam.cy; zn = cam.zoom; ox = od.w / 2 + (nx - nd.relicX) * G; oy = od.h / 2 + (ny - nd.relicY) * G; zo = zn / G; }
    const po = this.paint(tv.from), pn = this.paint(Math.min(7, tv.from + 1));
    const [ou, ov] = uv(ox, oy), [nu, nv] = uv(nx, ny);
    r.groundView('A', po, ou, ov, zo / ART_Z, tv.oldAlpha);
    r.groundView('B', pn, nu, nv, zn / ART_Z, 1);
    r.setMargin(tv.marginAlpha);
  }

  private syncProps(props: Prop[], time: number, cam: Camera, scale: number, map: ((x: number, y: number) => [number, number]) | null): void {
    for (const p of props) {
      if (p.dead || PAINTED.has(p.kind)) continue;
      let px = p.x, py = p.y;
      if (map) [px, py] = map(p.x, p.y);
      const pw = p.w * scale, ph = p.h * scale;
      if (!cam.visible(px, py, Math.max(pw, ph))) continue;
      // крошечные (реликвии, вид издалека) — упрощённая модель, чтобы не рассыпаться на «кашу»
      const tiny = Math.max(pw, ph) * cam.zoom < 10;
      const key = tiny ? `mini:${p.kind}:${p.v}` : `prop:${p.kind}:${p.v}`;
      const m = model(key), foot = m.foot ?? [m.size, m.size];
      let w = pw, h = ph, a = 0;
      if (foot[0] > foot[1] * 1.3 && ph > pw * 1.3) { a = Math.PI / 2; w = ph; h = pw; }
      const sx = w / foot[0], sz = h / foot[1], sy = Math.min(sx, sz);
      const mat = MATS[p.mat];
      if (p.ttl !== undefined && p.ttl < 2 && Math.floor(time * 8) % 2) continue;
      const k = p.kind === 'bush' || p.round ? 1.1 : 1.15, pad = 14 * scale;
      if (!tiny) this.aoAdd(px, py, pw * k + pad, ph * k + pad, 0);
      this.tmp.makeRotationY(a).scale(new THREE.Vector3(sx, sy, sz)).setPosition(px, 0, py);
      const dmg = p.maxHp < 1e11 && p.hp < p.maxHp * 0.5 && !mat.solid;
      this.pool(key).add(this.tmp, undefined, dmg ? DMG : undefined);
    }
  }

  private syncPlayer(sim: Sim, p: Player, alpha: number, time: number, tv: TransView | null): void {
    if (p.state === 'dead' || p.state === 'out') return;
    if (!tv && p.invulnT > 0 && p.invulnT < 3 && Math.floor(time * 14) % 2 === 0) return;
    const x = lerp(p.px, p.x, alpha), y = lerp(p.py, p.y, alpha);
    let tier = tierOf(sim.stageIdx);
    if (tv && tv.evolved && !tv.switched) tier = Math.min(7, tier + 1);
    const key = p.state === 'down' ? `wreck:${p.classId}:${tier}` : `tank:${p.classId}:${tier}:${p.idx}`;
    const m = model(key);
    const s = (sim.size / m.size) * (tv ? tv.tankScale : 1);
    const col = !tv && p.hurtT > 0.12 ? FLASH : undefined;
    const ts = tv ? tv.tankScale : 1;
    this.aoAdd(x, y, (p.hl * 2 + 18) * ts, (p.hw * 2 + 16) * ts, p.angle);
    const fr = p.state === 'down' ? undefined : this.treadFrame('p' + p.idx, m, x, y, p.angle, s, time, !tv || !tv.switched);
    this.pool(key).add(this.root(x, 0, y, p.angle, s), n => (n === 'turret' ? -(p.turret - p.angle) : n === 'key' ? time * 2.5 : 0), col, undefined, fr);
  }

  private syncWreck(w: NonNullable<TransView['wreck']>, time: number): void {
    const key = `boss:${w.art}`;
    const m = model(key);
    const s = (w.size / m.size) * w.k;
    this.pool(key).add(this.root(w.x, 0, w.y, w.angle, s), n => (n === 'key' ? time * 0.6 : 0), WRECK, WRECK_GLOW);
  }

  private syncEnemy(sim: Sim, e: Enemy, alpha: number, time: number): void {
    if (e.dead) return;
    const x = lerp(e.px, e.x, alpha), y = lerp(e.py, e.y, alpha);
    const art = e.def.art;
    const boss = e === sim.boss;
    const key = boss ? `boss:${art}` : `e:${art}`;
    const m = model(key);
    let s = e.size / m.size;
    if (e.spawnT > 0) s *= Math.max(0.05, 1 - e.spawnT / 0.45);
    const h = (e.air ? airH(sim, e) + Math.sin(time * 3 + e.id) * e.size * 0.05 : 0) + (boss ? bossDropH(e) : 0);
    const fixed = FIXED.has(art);
    const a = fixed ? 0 : e.angle;
    if (!e.air && h < 1) this.aoAdd(x, y, e.size * 1.1 + 10, e.size * 0.9 + 10, a);
    let col: THREE.Color | undefined;
    if (e.flash > 0) col = FLASH;
    else if (e.bonus && Math.floor(time * 5) % 2 === 0) col = BONUS;
    else if (e.elite) col = ELITE;
    else if (e.burnT > 0) col = BURN;
    const fr = !e.air && h < 1 ? this.treadFrame('e' + e.id, m, x, y, a, s, time, true) : undefined;
    this.pool(key).add(this.root(x, h, y, a, s), n => (n === 'turret' ? -(e.turret - a) : n === 'rotor' ? time * 25 + e.id : n === 'key' ? time * 2.5 : n === 'spin' ? time * 6 : n === 'prop' ? time * 30 : 0), col, undefined, fr);
  }
}

const FLASH = new THREE.Color(3.2, 3.2, 3.2);
const ELITE = new THREE.Color(1.25, 0.82, 1.4);
const BONUS = new THREE.Color(1.8, 0.7, 0.6);
const BURN = new THREE.Color(0.75, 0.6, 0.55);
const DMG = new THREE.Color(0.72, 0.68, 0.7);
const WRECK = new THREE.Color(0.55, 0.5, 0.56);
const WRECK_GLOW = new THREE.Color(0.8, 0.5, 0.45);

/** Текстура контактной тени: прямоугольник со скруглёнными углами и ступенчатым (пиксельным) краем. */
function aoTexture(): THREE.Texture {
  const N = 32, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d')!, img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = Math.max(0, Math.abs(x + 0.5 - N / 2) - N / 2 + 9), dy = Math.max(0, Math.abs(y + 0.5 - N / 2) - N / 2 + 9);
    const d = Math.sqrt(dx * dx + dy * dy);                                    // 0 внутри, растёт к краю
    const a = d < 3 ? 1 : d < 5.5 ? 0.72 : d < 8 ? 0.42 : 0;                     // три ступени, без плавного размытия
    img.data[(y * N + x) * 4 + 3] = Math.round(a * 255);
    img.data[(y * N + x) * 4] = img.data[(y * N + x) * 4 + 1] = img.data[(y * N + x) * 4 + 2] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
