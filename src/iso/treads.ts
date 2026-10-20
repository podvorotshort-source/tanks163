// Следы гусениц на земле: отпечатки траков (поперечные полосы через шаг грунтозацепов) затемняют нарисованную
// землю умножением цвета — трава под ними темнеет, как примятая. Отпечаток — отрезок пути ленты от прошлой метки;
// полосы считаются по пройденному лентой пути, поэтому след непрерывен на поворотах. Со временем след бледнеет
// ступенями (без плавной полупрозрачности — пиксель-арт) и исчезает.

import * as THREE from 'three';

// instanceMatrix и instanceColor объявляет сам three.js (USE_INSTANCING, USE_INSTANCING_COLOR)
const VS = `
varying vec2 vUv; varying vec3 vI;
void main(){
  vUv = uv; vI = instanceColor;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
// vI: x — время рождения, y — путь ленты в начале отрезка, z — длина отрезка (в шагах траков)
const FS = `
uniform float time; uniform float life; uniform vec3 deep; uniform vec3 soft;
varying vec2 vUv; varying vec3 vI;
void main(){
  float age = time - vI.x;
  // ступени угасания: полная сила, затем две бледнее
  float k = age < life * 0.55 ? 1.0 : age < life * 0.8 ? 0.62 : age < life ? 0.3 : 0.0;
  if (k <= 0.0) discard;
  float along = vI.y + (1.0 - vUv.y) * vI.z;             // uv.y = 1 — начало отрезка
  float bar = step(fract(along), 0.5);          // отпечаток грунтозацепа
  float edge = step(abs(vUv.x - 0.5), 0.36);              // края ленты — светлее (неровная кромка)
  vec3 c = mix(soft, deep, bar * edge);
  gl_FragColor = vec4(mix(vec3(1.0), c, k), 1.0);
}`;

export class TreadMarks {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  private uni: Record<string, THREE.IUniform>;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();
  private static UP = new THREE.Vector3(0, 1, 0);

  constructor(private max = 2400) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);                  // плоскость на земле: u — поперёк ленты (x), v — вдоль (−z → +z)
    this.uni = {
      time: { value: 0 }, life: { value: 16 },
      deep: { value: new THREE.Color(0.42, 0.38, 0.44) }, soft: { value: new THREE.Color(0.7, 0.66, 0.7) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uni, vertexShader: VS, fragmentShader: FS, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
    });
    this.mesh = new THREE.InstancedMesh(g, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, this.c.setRGB(-1e9, 0, 0));
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 0;
  }

  clear(): void { this.n = 0; this.mesh.count = 0; }

  /** Отпечаток от (ax, ay) до (bx, by), ширина w; path — путь ленты в начале отрезка; period — шаг траков (ед.). */
  add(ax: number, ay: number, bx: number, by: number, w: number, path: number, period: number, time: number): void {
    const dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;
    const i = this.n % this.max;
    // локальная ось v (+z плоскости) — вдоль движения
    this.q.setFromAxisAngle(TreadMarks.UP, Math.atan2(dx, dy));
    this.m.compose(this.v.set((ax + bx) / 2, 0.04, (ay + by) / 2), this.q, this.s.set(w, 1, len + 0.6));
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.setColorAt(i, this.c.setRGB(time, (path - 0.3) / period, (len + 0.6) / period));
    this.n++;
    this.mesh.count = Math.min(this.n, this.max);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  frame(time: number): void { this.uni.time.value = time; }
}
