// 3D-вывод мира в изометрическом пиксель-арте.
// Кадр рисуется в низком разрешении (~360 строк), браузер увеличивает его в целое число раз без сглаживания.
// В бою масштаб камеры постоянный: 1 воксель модели ≈ 1 пиксель, земля нарисована попиксельно
// заранее (src/iso/paint) ровно в сетке экрана. Свет — «мультяшный» с цветными тенями: верх светлый и тёплый,
// левая грань — основной тон, правая и тени — темнее и холоднее (сдвиг оттенка к синему/фиолетовому).
// Контур — по перепаду глубины соседних пикселей.

import * as THREE from 'three';
import type { Camera } from '../client/camera';
import type { BuiltModel } from './vox';

const OUTLINE = new THREE.Color('#1a1124');

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
  if (abs(a - 0.5) < 0.1) a = 1.0;                    // пламя (FX_MARK, src/iso/fxgl.ts): контур моделей по нему не рисуем
  else if (c - n > thr) { rgb = a > 0.0 ? mix(rgb, outline, 0.9) : outline; a = 1.0; }
  gl_FragColor = vec4(toSRGB(rgb) * a, a);
}`;

// Земля: две нарисованные картинки (текущая ступень и, при переходе, следующая) в экранной сетке.
const GROUND_FS = `
uniform sampler2D tA; uniform sampler2D tB;
uniform vec4 rA; uniform vec4 rB;      // начало (u0, v0) и размер картинки, пиксели рисунка
uniform vec2 cA; uniform vec2 cB;      // центр камеры в пикселях рисунка
uniform float kA; uniform float kB;    // пикселей экрана на пиксель рисунка
uniform float aA; uniform float aB;    // непрозрачность слоёв
uniform float mA;                      // непрозрачность полей вокруг арены (мир следующей ступени) у слоя A
uniform vec2 res; uniform vec2 shake; uniform vec3 bg;
vec4 layer(sampler2D t, vec4 r, vec2 c, float k, vec2 d){
  vec2 p = c + d / k - r.xy;
  if (p.x < 0.0 || p.y < 0.0 || p.x >= r.z || p.y >= r.w) return vec4(0.0);
  // 1:1 и увеличение — строго центр пикселя рисунка; уменьшение — мип-уровни (миниатюра без «каши»)
  if (k >= 0.999) p = floor(p) + 0.5;
  return texture2D(t, vec2(p.x / r.z, 1.0 - p.y / r.w));
}
void main(){
  vec2 fp = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec2 d = fp - res * 0.5 - shake;
  vec4 b = aB > 0.0 ? layer(tB, rB, cB, kB, d) : vec4(0.0);
  vec4 a = aA > 0.0 ? layer(tA, rA, cA, kA, d) : vec4(0.0);
  vec3 col = mix(bg, b.rgb, step(0.01, b.a) * aB);
  float wa = a.a > 0.75 ? 1.0 : a.a > 0.01 ? mA : 0.0;
  col = mix(col, a.rgb, wa * aA);
  gl_FragColor = vec4(col, 1.0);
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
  parts: { name: string; at: THREE.Vector3; axis: 'x' | 'y' | 'z'; frame?: [string, number]; lit: Pool | null; glow: Pool | null }[];
  constructor(parent: THREE.Object3D, public model: BuiltModel, lit: THREE.Material, glow: THREE.Material, shadow = true) {
    this.parts = model.parts.map(p => ({
      name: p.name, at: p.at, axis: p.axis, frame: p.frame,
      lit: p.lit ? new Pool(parent, p.lit, lit, 16, shadow) : null,
      glow: p.glow ? new Pool(parent, p.glow, glow, 16, false) : null,
    }));
  }
  begin(): void { for (const p of this.parts) { p.lit?.begin(); p.glow?.begin(); } }
  end(): void { for (const p of this.parts) { p.lit?.end(); p.glow?.end(); } }
  /** Добавить экземпляр: root — матрица модели (в вокселях), rot(part) — поворот части вокруг её оси (рад),
   *  frame(group) — номер кадра группы (гусеницы; по умолчанию 0). */
  add(root: THREE.Matrix4, rot?: (name: string) => number, col?: THREE.Color, glowCol?: THREE.Color, frame?: (group: string) => number): void {
    for (const p of this.parts) {
      if (p.frame && p.frame[1] !== (frame ? frame(p.frame[0]) : 0)) continue;
      M.copy(root).multiply(T.makeTranslation(p.at.x, p.at.y, p.at.z));
      const a = rot ? rot(p.name) : 0;
      if (a) M.multiply(p.axis === 'y' ? R.makeRotationY(a) : p.axis === 'x' ? R.makeRotationX(a) : R.makeRotationZ(a));
      p.lit?.push(M, col);
      p.glow?.push(M, glowCol);
    }
  }
}
const M = new THREE.Matrix4(), T = new THREE.Matrix4(), R = new THREE.Matrix4();

/** «Мультяшный» Ламберт: ступени света со сдвигом оттенка (тени холоднее, блики теплее);
 *  падающая тень на объекте (грань к солнцу, но в тени) — темнее собственной тени грани. */
function toon(mat: THREE.MeshLambertMaterial): THREE.MeshLambertMaterial {
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      {
        vec3 base = diffuseColor.rgb;
        float lb = max(dot(base, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
        float k = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)) / lb;
        vec3 c;
        if (k > 1.06) c = base * vec3(1.13, 1.09, 0.93) + vec3(0.035, 0.028, 0.0);
        else if (k > 0.86) c = base;
        else if (k > 0.66) {
          // грань смотрит на солнце, но света нет — на неё упала тень другого объекта: темнее собственной тени
          if (dot(normal, directionalLights[0].direction) > 0.08) c = base * vec3(0.44, 0.43, 0.66) + vec3(0.01, 0.005, 0.03);
          else c = base * vec3(0.62, 0.62, 0.80) + vec3(0.008, 0.004, 0.022);                // собственная тень
        }
        else c = base * vec3(0.46, 0.44, 0.64) + vec3(0.012, 0.006, 0.03);
        outgoingLight = c;
      }
      #include <opaque_fragment>`);
  };
  return mat;
}

export interface GroundLayer { tex: THREE.Texture; u0: number; v0: number; w: number; h: number }

export class IsoRenderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam3 = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  readonly sun: THREE.DirectionalLight;
  readonly litMat = toon(new THREE.MeshLambertMaterial({ vertexColors: true }));
  readonly glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  private rt: THREE.WebGLRenderTarget;
  private postScene = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private uni: Record<string, THREE.IUniform>;
  private bgScene = new THREE.Scene();
  readonly gu: Record<string, THREE.IUniform>;
  private shadowPlane: THREE.Mesh;
  w = 2; h = 2;

  /** transparent — прозрачный фон (витрины моделей поверх интерфейса). */
  constructor(canvas: HTMLCanvasElement, private transparent = false) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: transparent, premultipliedAlpha: true });
    this.gl.setClearColor(0x000000, 0);
    this.gl.setPixelRatio(1);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.BasicShadowMap;          // жёсткие пиксельные тени
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;   // перевод в sRGB — в последнем проходе
    this.gl.autoClear = false;
    // В three.js освещённость делится на π — поэтому множитель π. Ступени: верх ≈1.15, левая грань ≈0.95, правая ≈0.72.
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.72 * Math.PI));
    this.sun = new THREE.DirectionalLight('#ffffff', 0.54 * Math.PI);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    // Тени на нарисованной земле: прозрачная плоскость, принимающая тень (цвет — холодный фиолетовый).
    this.shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: '#150c2c', opacity: 0.68, depthWrite: false }));
    this.shadowPlane.receiveShadow = true; this.shadowPlane.renderOrder = -1;
    this.scene.add(this.shadowPlane);
    this.rt = this.makeTarget(2, 2);
    this.uni = {
      tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, res: { value: new THREE.Vector2(2, 2) },
      thr: { value: 0.002 }, outline: { value: OUTLINE },
    };
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.uni, vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false })));
    const empty = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    empty.needsUpdate = true;
    this.gu = {
      tA: { value: empty }, tB: { value: empty }, rA: { value: new THREE.Vector4(0, 0, 1, 1) }, rB: { value: new THREE.Vector4(0, 0, 1, 1) },
      cA: { value: new THREE.Vector2() }, cB: { value: new THREE.Vector2() }, kA: { value: 1 }, kB: { value: 1 }, aA: { value: 0 }, aB: { value: 0 }, mA: { value: 1 },
      res: { value: new THREE.Vector2(2, 2) }, shake: { value: new THREE.Vector2() }, bg: { value: new THREE.Color('#120e1a') },
    };
    this.bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.gu, vertexShader: POST_VS, fragmentShader: GROUND_FS, depthTest: false, depthWrite: false })));
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
    (this.gu.res.value as THREE.Vector2).set(w, h);
  }

  /** Камера по 2D-камере игры (те же центр, масштаб и тряска). */
  setCamera(cam: Camera): void {
    const z = cam.zoom, w = this.w, h = this.h;
    const c = this.cam3;
    const ox = -cam.sx / z, oy = cam.sy / z;
    c.left = -w / 2 / z + ox; c.right = w / 2 / z + ox; c.top = h / 2 / z + oy; c.bottom = -h / 2 / z + oy;
    const el = Math.PI / 6, az = Math.PI / 4, D = 3000;
    c.position.set(cam.cx + Math.cos(el) * Math.sin(az) * D, Math.sin(el) * D, cam.cy + Math.cos(el) * Math.cos(az) * D);
    c.up.set(0, 1, 0);
    c.lookAt(cam.cx, 0, cam.cy);
    c.near = 1; c.far = D * 2;
    c.updateProjectionMatrix();
    // порог контура: перепад глубины больше «ступеньки» в пиксель
    this.uni.thr.value = Math.max(2.2 / z, 0.6) / (c.far - c.near);
    // солнце сверху-слева экрана (освещает левые грани, правые — в тени), тень — вправо-вниз
    const span = Math.max(w, h) / z * 0.8 + 40;
    const sc = this.sun.shadow.camera;
    sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = span * 8 + 600;
    sc.updateProjectionMatrix();
    const L = new THREE.Vector3(-0.55, 0.65, 0.5).normalize().multiplyScalar(span * 3 + 300);
    this.sun.position.set(cam.cx + L.x, L.y, cam.cy + L.z);
    this.sun.target.position.set(cam.cx, 0, cam.cy);
    this.shadowPlane.scale.set(span * 4, 1, span * 4);
    this.shadowPlane.position.set(cam.cx, 0.02, cam.cy);
    (this.gu.shake.value as THREE.Vector2).set(cam.sx, cam.sy);
  }

  /** Вид слоя земли: центр камеры (пиксели рисунка), пикселей экрана на пиксель рисунка, непрозрачность. */
  groundView(which: 'A' | 'B', layer: GroundLayer | null, cu: number, cv: number, k: number, alpha: number): void {
    const g = this.gu;
    if (!layer) { g['a' + which].value = 0; return; }
    g['t' + which].value = layer.tex;
    (g['r' + which].value as THREE.Vector4).set(layer.u0, layer.v0, layer.w, layer.h);
    (g['c' + which].value as THREE.Vector2).set(cu, cv);
    g['k' + which].value = k;
    g['a' + which].value = alpha;
  }

  /** Непрозрачность полей вокруг арены у слоя A (при переходе гаснут раньше арены). */
  setMargin(a: number): void { this.gu.mA.value = a; }

  /** Цвет пустоты вокруг (когда земли нет). */
  setVoid(col: string): void { (this.gu.bg.value as THREE.Color).set(col); }

  render(): void {
    this.gl.setRenderTarget(this.rt);
    this.gl.clear();
    const ground = !this.transparent && ((this.gu.aA.value as number) > 0 || (this.gu.aB.value as number) > 0);
    if (ground) this.gl.render(this.bgScene, this.postCam);
    this.shadowPlane.visible = ground;
    this.gl.render(this.scene, this.cam3);
    this.gl.setRenderTarget(null);
    this.gl.clear();
    this.gl.render(this.postScene, this.postCam);
  }
}
