// Огонь на земле в 3D-сцене: гарь и языки пламени — плоскости с проверкой глубины (кирпичи, ящики, танки
// их честно закрывают), но картинка на них — пиксельный спрайт в экранной сетке, пиксель в пиксель как в 2D.
// Гарь лежит на земле (глубина каждого пикселя — как у земли), пламя стоит вертикально над точкой.
// Спрайты (src/gfx/flame.ts) складываются в атлас; новые догружаются кусочком (texSubImage2D).

import * as THREE from 'three';
import type { Pix } from '../gfx/flame';

const ATLAS = 2048;
const MAX = 3000;
/** Низ атласа — под спрайты, перерисовываемые каждый кадр (струи огнемёта): DYN_N мест DYN_W×DYN_H. */
export const DYN_W = 512, DYN_H = 320, DYN_N = 4;

const VS = `
attribute vec3 iAnchor; attribute vec4 iDst; attribute vec4 iRect; attribute vec2 iMode;
uniform vec2 res; uniform float zoom; uniform vec3 camR; uniform vec3 camF;
varying vec2 vTL; varying vec4 vRect; varying vec2 vSize; varying float vA;
void main(){
  vec4 ca = projectionMatrix * viewMatrix * vec4(iAnchor, 1.0);
  vec2 ap = vec2((ca.x * 0.5 + 0.5) * res.x, (0.5 - ca.y * 0.5) * res.y);   // точка, пиксели сверху вниз
  vTL = floor(ap + 0.5) + iDst.xy;
  vec2 off = vTL - ap + position.xy * (iDst.zw + 2.0) - 1.0;                 // угол прямоугольника (+1 px запаса)
  vec3 wp = iAnchor + camR * (off.x / zoom);
  if (iMode.x > 0.5) wp.y -= off.y / (zoom * 0.8660254);   // стоячая плоскость (высота камеры 30°: cos)
  else wp += camF * (off.y / (zoom * 0.5));               // на земле (sin 30°)
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  vRect = iRect; vSize = iDst.zw; vA = iMode.y;
}`;

const FS = `
uniform sampler2D atlas; uniform vec2 res;
varying vec2 vTL; varying vec4 vRect; varying vec2 vSize; varying float vA;
vec3 fromSRGB(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void main(){
  vec2 t = floor(vec2(gl_FragCoord.x, res.y - gl_FragCoord.y)) - floor(vTL + 0.5);
  if (t.x < 0.0 || t.y < 0.0 || t.x >= vSize.x || t.y >= vSize.y) discard;
  vec2 st = floor(t * vRect.zw / vSize);
  vec4 c = texture2D(atlas, (vRect.xy + st + 0.5) / ${ATLAS.toFixed(1)});
  if (c.a < 0.5) discard;
  gl_FragColor = vec4(fromSRGB(c.rgb), vA);
}`;
/** Метка пламени в альфе кадра: пост-проход не рисует по ней контур моделей (см. POST_FS). */
export const FX_MARK = 0.5;

export interface Slot { x: number; y: number; w: number; h: number }

/** Набор плоскостей одного вида (на земле или стоячих). */
class Batch {
  readonly geo = new THREE.InstancedBufferGeometry();
  readonly a: THREE.InstancedBufferAttribute[];
  n = 0;
  constructor() {
    const g = this.geo;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const mk = (k: number) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.a = [mk(3), mk(4), mk(4), mk(2)];
    ['iAnchor', 'iDst', 'iRect', 'iMode'].forEach((k, i) => g.setAttribute(k, this.a[i]));
    g.instanceCount = 0;
  }
  push(s: Slot, x: number, hgt: number, y: number, dx: number, dy: number, w: number, h: number, mode: number, alpha: number): void {
    if (this.n >= MAX) return;
    const i = this.n++;
    this.a[0].setXYZ(i, x, hgt, y);
    this.a[1].setXYZW(i, dx, dy, w, h);
    this.a[2].setXYZW(i, s.x, s.y, s.w, s.h);
    this.a[3].setXY(i, mode, alpha);
  }
  /** Передать набор кадра и начать следующий. */
  flush(): void {
    this.geo.instanceCount = this.n;
    for (const a of this.a) { a.clearUpdateRanges(); a.addUpdateRange(0, this.n * a.itemSize); a.needsUpdate = true; }
    this.n = 0;
  }
}

export class FxLayer {
  readonly group = new THREE.Group();
  private ground = new Batch();
  private upright = new Batch();
  private tex: THREE.DataTexture;
  private uni: Record<string, THREE.IUniform>;
  private slots = new Map<string, Slot>();
  private px = 0; private py = 0; private rowH = 0;
  private reset = false;
  /** Сколько раз атлас переполнялся (отладка). */
  resets = 0;
  private uploads: { s: Slot; p: Pix }[] = [];

  constructor(private gl: THREE.WebGLRenderer) {
    this.tex = new THREE.DataTexture(new Uint8Array(ATLAS * ATLAS * 4), ATLAS, ATLAS);
    this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.needsUpdate = true;
    this.uni = {
      atlas: { value: this.tex }, res: { value: new THREE.Vector2(2, 2) }, zoom: { value: 1 },
      camR: { value: new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2) }, camF: { value: new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2) }
    };
    // Ось y квадрата идёт вниз по экрану — обход по часовой, поэтому обе стороны.
    // Гарь — обычное смешение (тает к концу); пламя — непрозрачно, с меткой FX_MARK в альфе.
    const gm = new THREE.ShaderMaterial({ uniforms: this.uni, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const um = new THREE.ShaderMaterial({
      uniforms: this.uni, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.ZeroFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.ZeroFactor,
    });
    const gMesh = new THREE.Mesh(this.ground.geo, gm), uMesh = new THREE.Mesh(this.upright.geo, um);
    gMesh.frustumCulled = uMesh.frustumCulled = false;
    gMesh.renderOrder = 2; uMesh.renderOrder = 3;
    this.group.add(gMesh, uMesh);
  }

  /** Место спрайта в атласе (строит и догружает при первом обращении). */
  slot(key: string, make: () => Pix): Slot | null {
    let s = this.slots.get(key);
    if (s) return s;
    if (this.reset) return null;
    const p = make();
    if (p.w > ATLAS || p.h > ATLAS) return null;
    if (this.px + p.w > ATLAS) { this.px = 0; this.py += this.rowH + 1; this.rowH = 0; }
    if (this.py + p.h > ATLAS - DYN_H) { this.reset = true; this.resets++; return null; }   // атлас полон — начнём заново со следующего кадра
    s = { x: this.px, y: this.py, w: p.w, h: p.h };
    this.px += p.w + 1; this.rowH = Math.max(this.rowH, p.h);
    this.slots.set(key, s);
    this.uploads.push({ s, p });
    return s;
  }

  /** Место i под спрайт, который перерисовывается каждый кадр (догружается в end). */
  dyn(i: number, p: Pix, fresh = true): Slot | null {
    if (i >= DYN_N || p.w > DYN_W || p.h > DYN_H) return null;
    const s = { x: i * DYN_W, y: ATLAS - DYN_H, w: p.w, h: p.h };
    if (fresh || this.reset) this.uploads.push({ s, p });
    return s;
  }

  /** Отладка: плоскостей в прошлом кадре и спрайтов в атласе. */
  stats(): { ground: number; upright: number; slots: number; resets: number } {
    return { ground: this.ground.geo.instanceCount, upright: this.upright.geo.instanceCount, slots: this.slots.size, resets: this.resets };
  }

  /** Начало кадра (до push). */
  begin(): void {
    if (this.reset) { this.reset = false; this.slots.clear(); this.px = this.py = this.rowH = 0; }
  }

  /**
   * Спрайт s в точке (x, h, y) мира; dx, dy — смещение левого верхнего угла от точки (px), w×h — размер на экране.
   * upright — стоячая плоскость (пламя), иначе лежит на земле (гарь).
   */
  push(s: Slot, x: number, hgt: number, y: number, dx: number, dy: number, w: number, h: number, upright: boolean, alpha = 1): void {
    if (upright) this.upright.push(s, x, hgt, y, dx, dy, w, h, 1, FX_MARK);
    else this.ground.push(s, x, hgt, y, dx, dy, w, h, 0, alpha);
  }

  /** Перед выводом сцены: набор кадра, размер кадра и догрузка новых спрайтов. */
  end(w: number, h: number, zoom: number): void {
    this.ground.flush(); this.upright.flush();
    (this.uni.res.value as THREE.Vector2).set(w, h);
    this.uni.zoom.value = zoom;
    if (!this.uploads.length) return;
    const gl = this.gl, c = gl.getContext();
    gl.initTexture(this.tex);
    const t = (gl.properties.get(this.tex) as { __webglTexture?: WebGLTexture }).__webglTexture;
    if (!t) return;
    gl.state.bindTexture(c.TEXTURE_2D, t);
    c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL, false);
    c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    c.pixelStorei(c.UNPACK_ALIGNMENT, 4);
    for (const { s, p } of this.uploads) c.texSubImage2D(c.TEXTURE_2D, 0, s.x, s.y, s.w, s.h, c.RGBA, c.UNSIGNED_BYTE, new Uint8Array(p.d.buffer, p.d.byteOffset, p.w * p.h * 4));
    this.uploads.length = 0;
  }
}
