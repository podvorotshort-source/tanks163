// 3D-модели игры: .glb из assets/models (собираются в Blender, см. навык lowpoly-3d и tools/pack-models.mjs).
// Модель раскладывается на куски «геометрия + материал + матрица в пространстве модели»; куски внутри узлов
// turret*/rotor* вращаются отдельно. Нет файла — подставляется простая заготовка (см. fallback.ts).

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Узел, вокруг которого вращается кусок: нет / башня (угол башни) / винт (крутится со временем). */
export type Spin = '' | 'turret' | 'rotor';

export interface ModelPart {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  spin: Spin;
  /** Матрица узла вращения в пространстве модели (для spin = ''). */
  node: THREE.Matrix4;
  /** Матрица куска относительно узла вращения (для spin = '' — относительно модели). */
  rel: THREE.Matrix4;
}

export interface Model {
  key: string;
  parts: ModelPart[];
  /** Габариты (м): длина по X (нос), ширина по Z, высота по Y. */
  box: THREE.Box3;
  len: number;
  wid: number;
  hgt: number;
  /** Длина «корпуса» для масштаба: X-размер узла hull (без торчащих деталей), иначе len. */
  body: number;
}

const files = import.meta.glob('../../assets/models/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urls = new Map<string, string>();
for (const [path, url] of Object.entries(files)) urls.set(path.split('/').pop()!.replace(/\.glb$/, ''), url);

const models = new Map<string, Model>();

export function hasModelFile(key: string): boolean {
  return urls.has(key);
}

export function model(key: string): Model | undefined {
  return models.get(key);
}

export function registerModel(m: Model): void {
  models.set(m.key, m);
}

/** Разбор сцены glTF на куски. */
export function fromObject(key: string, root: THREE.Object3D): Model {
  root.updateMatrixWorld(true);
  const parts: ModelPart[] = [];
  const box = new THREE.Box3();
  let hullBox: THREE.Box3 | null = null;
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Ближайший предок-узел вращения.
    let spin: Spin = '';
    let nodeObj: THREE.Object3D | null = null;
    for (let p: THREE.Object3D | null = mesh; p && p !== root; p = p.parent) {
      const n = p.name.toLowerCase();
      if (n.startsWith('turret')) { spin = 'turret'; nodeObj = p; break; }
      if (n.startsWith('rotor') || n.startsWith('spin')) { spin = 'rotor'; nodeObj = p; break; }
    }
    const node = nodeObj ? nodeObj.matrixWorld.clone() : new THREE.Matrix4();
    const rel = node.clone().invert().multiply(mesh.matrixWorld);
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const b = geo.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
    box.union(b);
    let isHull = false;
    for (let p: THREE.Object3D | null = mesh; p && p !== root; p = p.parent) if (p.name.toLowerCase() === 'hull') isHull = true;
    if (isHull && !spin) hullBox = hullBox ? hullBox.union(b) : b.clone();
    const mat = mesh.material as THREE.Material;
    parts.push({ geo, mat, spin, node, rel });
  });
  const s = box.getSize(new THREE.Vector3());
  const hb = hullBox as THREE.Box3 | null;
  const body = hb ? hb.getSize(new THREE.Vector3()).x : s.x;
  return { key, parts, box, len: s.x, wid: s.z, hgt: s.y, body: Math.max(body, s.x * 0.6) };
}

let loader: GLTFLoader | null = null;

/** Загрузка всех моделей (по мере готовности вызывает onProgress). */
export async function loadModels(onProgress?: (done: number, total: number) => void): Promise<void> {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  const keys = [...urls.keys()].filter(k => !models.has(k));
  let done = 0;
  await Promise.all(keys.map(async key => {
    try {
      const g = await loader!.loadAsync(urls.get(key)!);
      const m = fromObject(key, g.scene);
      for (const p of m.parts) {
        const mat = p.mat as THREE.MeshStandardMaterial;
        if (mat.map) { mat.map.anisotropy = 4; }
      }
      models.set(key, m);
    } catch (e) {
      console.warn('Модель не загрузилась', key, e);
    }
    onProgress?.(++done, keys.length);
  }));
}
