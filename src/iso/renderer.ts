// 3D-вывод мира в изометрическом пиксель-арте.
// Кадр рисуется в низком разрешении (≈ 480–540 строк), затем браузер увеличивает его в целое число раз
// без сглаживания. Поэтому любой масштаб камеры, рост танка и отъезд при переходе остаются честным
// пиксель-артом: мир каждый кадр заново растрируется в одной и той же сетке пикселей.
// Контур — по разнице глубины соседних пикселей (как у нарисованных спрайтов).

import * as THREE from 'three';
import { ISO_H, type Camera } from '../client/camera';
import type { BuiltModel } from './vox';

const OUTLINE = new THREE.Color('#1a1322');

const POST_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float thr; uniform vec3 outline;
varying vec2 vUv;
float d(vec2 o){ return texture2D(tDepth, vUv + o / res).x; }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  float c = d(vec2(0.0));
  float n = min(min(d(vec2(1.0,0.0)), d(vec2(-1.0,0.0))), min(d(vec2(0.0,1.0)), d(vec2(0.0,-1.0))));
  vec4 col = texture2D(tColor, vUv);
  vec3 rgb = col.rgb;
  float a = col.a;
  if (c - n > thr) { rgb = a > 0.0 ? mix(rgb, outline, 0.88) : outline; a = 1.0; }
  gl_FragColor = vec4(toSRGB(rgb) * a, a);
}`;

/** Пул экземпляров одной геометрии (части модели). */
class Pool {
  mesh: THREE.InstancedMesh;
  n = 0;
  constructor(private parent: THREE.Object3D, private geo: THREE.BufferGeometry, private mat: THREE.Material, private cap = 16, private shadow = true) {
    this.mesh = this.make(cap);
  }
  private make(cap: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = this.shadow; m.receiveShadow = true;
    m.frustumCulled = false;
    m.count = 0;
    this.parent.add(m);
    return m;
  }
  push(mx: THREE.Matrix4, col?: THREE.Color): void {
    if (this.n >= this.cap) {
      const old = this.mesh;
      this.cap *= 2;
      this.mesh = this.make(this.cap);
      this.mesh.instanceMatrix.array.set(old.instanceMatrix.array);
      if (old.instanceColor) { this.mesh.setColorAt(0, WHITE); this.mesh.instanceColor!.array.set(old.instanceColor.array); }
      this.parent.remove(old); old.dispose();
    }
    this.mesh.setMatrixAt(this.n, mx);
    if (col || this.mesh.instanceColor) this.mesh.setColorAt(this.n, col ?? WHITE);
    this.n++;
  }
  begin(): void { this.n = 0; }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
const WHITE = new THREE.Color(1, 1, 1);

/** Экземпляры модели: по пулу на каждую часть (освещённую и светящуюся). */
export class ModelPool {
  parts: { name: string; at: THREE.Vector3; axis: 'x' | 'y' | 'z'; lit: Pool | null; glow: Pool | null }[];
  constructor(parent: THREE.Object3D, public model: BuiltModel, lit: THREE.Material, glow: THREE.Material, shadow = true) {
    this.parts = model.parts.map(p => ({
      name: p.name, at: p.at, axis: p.axis,
      lit: p.lit ? new Pool(parent, p.lit, lit, 16, shadow) : null,
      glow: p.glow ? new Pool(parent, p.glow, glow, 16, false) : null,
    }));
  }
  begin(): void { for (const p of this.parts) { p.lit?.begin(); p.glow?.begin(); } }
  end(): void { for (const p of this.parts) { p.lit?.end(); p.glow?.end(); } }
  /** Добавить экземпляр: root — матрица модели (в вокселях), rot(part) — поворот части вокруг её оси (рад). */
  add(root: THREE.Matrix4, rot?: (name: string) => number, col?: THREE.Color): void {
    for (const p of this.parts) {
      M.copy(root).multiply(T.makeTranslation(p.at.x, p.at.y, p.at.z));
      const a = rot ? rot(p.name) : 0;
      if (a) M.multiply(p.axis === 'y' ? R.makeRotationY(a) : p.axis === 'x' ? R.makeRotationX(a) : R.makeRotationZ(a));
      p.lit?.push(M, col);
      p.glow?.push(M, undefined);
    }
  }
}
const M = new THREE.Matrix4(), T = new THREE.Matrix4(), R = new THREE.Matrix4();

export class IsoRenderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam3 = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  readonly sun: THREE.DirectionalLight;
  readonly litMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  readonly glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  private rt: THREE.WebGLRenderTarget;
  private post: THREE.Mesh;
  private postScene = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private uni: Record<string, THREE.IUniform>;
  w = 2; h = 2;

  /** transparent — прозрачный фон (витрины моделей поверх интерфейса). */
  constructor(canvas: HTMLCanvasElement, transparent = false) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: transparent, premultipliedAlpha: true });
    if (transparent) this.gl.setClearColor(0x000000, 0);
    this.gl.setPixelRatio(1);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.BasicShadowMap;          // жёсткие пиксельные тени
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;   // перевод в sRGB — в последнем проходе
    if (!transparent) this.scene.background = new THREE.Color('#14121c');
    // В three.js освещённость делится на π (физически корректный Ламберт) — поэтому множитель π.
    this.scene.add(new THREE.AmbientLight('#e6ecff', 0.56 * Math.PI));
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#3a3448', 0.1 * Math.PI));
    this.sun = new THREE.DirectionalLight('#fff3dc', 0.62 * Math.PI);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.rt = this.makeTarget(2, 2);
    this.uni = {
      tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, res: { value: new THREE.Vector2(2, 2) },
      thr: { value: 0.002 }, outline: { value: OUTLINE },
    };
    this.post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.uni, vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false }));
    this.postScene.add(this.post);
  }

  private makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    rt.depthTexture = new THREE.DepthTexture(w, h, THREE.FloatType);
    rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
    return rt;
  }

  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.gl.setSize(w, h, false);
    this.rt.dispose();
    this.rt = this.makeTarget(w, h);
    this.uni.tColor.value = this.rt.texture;
    this.uni.tDepth.value = this.rt.depthTexture;
    (this.uni.res.value as THREE.Vector2).set(w, h);
  }

  /** Поставить камеру по 2D-камере игры (те же центр, масштаб и тряска). Масштаб мира k — для вложенных миров. */
  setCamera(cam: Camera): void {
    const z = cam.zoom, w = this.w, h = this.h;
    const c = this.cam3;
    // центр сдвигаем на тряску: экранный сдвиг (sx, sy) → смещение рамки
    const ox = -cam.sx / z, oy = cam.sy / z;
    c.left = -w / 2 / z + ox; c.right = w / 2 / z + ox; c.top = h / 2 / z + oy; c.bottom = -h / 2 / z + oy;
    const el = Math.PI / 6, az = Math.PI / 4, D = 2000;
    c.position.set(cam.cx + Math.cos(el) * Math.sin(az) * D, Math.sin(el) * D, cam.cy + Math.cos(el) * Math.cos(az) * D);
    c.up.set(0, 1, 0);
    c.lookAt(cam.cx, 0, cam.cy);
    c.near = 1; c.far = D * 2;
    c.updateProjectionMatrix();
    // порог контура: перепад глубины больше «ступеньки» земли на пиксель и не меньше ~0.6 ед.
    this.uni.thr.value = Math.max(2.4 / z, 0.6) / (c.far - c.near);
    // солнце сверху-слева экрана; тень покрывает видимое
    const span = Math.max(w, h) / z * 0.75 + 20;
    const sc = this.sun.shadow.camera;
    sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = span * 8 + 400;
    sc.updateProjectionMatrix();
    this.sun.position.set(cam.cx - span * 0.9, span * 2.6 + 100, cam.cy + span * 0.35);
    this.sun.target.position.set(cam.cx, 0, cam.cy);
    void ISO_H;
  }

  render(): void {
    this.gl.setRenderTarget(this.rt);
    this.gl.render(this.scene, this.cam3);
    this.gl.setRenderTarget(null);
    this.gl.render(this.postScene, this.postCam);
  }
}
