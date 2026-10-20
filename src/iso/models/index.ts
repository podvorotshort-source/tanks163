// Реестр моделей: ключ → построитель. Модели строятся лениво (при первой встрече) и кешируются.
import { Vox, buildModel, type BuiltModel, type ModelDef } from '../vox';
import { tankModel, wreckModel, type TankClass } from './tanks';
import { heroII } from './hero';
import { rotor } from './kit';
import * as s0 from './stage0';
import * as army from './army';
import * as s1 from './stage1';
import * as s2 from './stage2';
import * as s3 from './stage3';
import * as s4 from './stage4';
import * as s5 from './stage5';
import * as s6 from './stage6';
import { DECO } from './deco';

type Builder = () => ModelDef;
type PropBuilder = (v: number) => ModelDef;

export const ENEMIES: Record<string, Builder> = {
  soldier: army.soldier, toyTank: army.toyTank, jeep: army.jeep, heli: army.heli, armorToy: army.armorToy, mortar: army.mortar, bigToy: army.bigToy, toyBunker: army.toyBunker,
  windMouse: s1.windMouse, top: s1.top, rcCar: s1.rcCar, toyRobot: s1.toyRobot, plane: s1.plane, blockGolem: s1.blockGolem, jackBox: s1.jackBox, rcTank: s1.rcTank,
  dustBunny: s2.dustBunny, quad: s2.quad, vacBot: s2.vacBot, tinTank: s2.tinTank, deskLamp: s2.deskLamp, toyTrain: s2.toyTrain, bookMortar: s2.bookMortar, robotDog: s2.robotDog,
  cockroachBot: s3.cockroachBot, toaster: s3.toaster, secDrone: s3.secDrone, mixerBot: s3.mixerBot, kettle: s3.kettle, washer: s3.washer, tv: s3.tv, vacGiant: s3.vacGiant,
  infantry: s4.infantry, apc: s4.apc, mbt: s4.mbt, attackHeli: s4.attackHeli, spg: s4.spg, armoredCar: s4.armoredCar, heavyTank: s4.heavyTank, mlrs: s4.mlrs,
  carsSwarm: s5.carsSwarm, walker: s5.walker, superTank: s5.superTank, gunship: s5.gunship, armoredTrain: s5.armoredTrain, droneCarrier: s5.droneCarrier, kamikazeDrone: s5.kamikazeDrone, mechTitan: s5.mechTitan,
  cityBlock: s6.cityBlock, crawler: s6.crawler, dropPod: s6.dropPod, stratoBomber: s6.stratoBomber, mobileFort: s6.mobileFort, silo: s6.silo, megaWalker: s6.megaWalker,
  meteorite: s6.meteorite, contCrawler: s6.contCrawler, orbitalSat: s6.orbitalSat, voidSpider: s6.voidSpider, lance: s6.lance, moonlet: s6.moonlet, starTitan: s6.starTitan,
};
export const BOSSES: Record<string, Builder> = {
  bossGeneral: () => heroII('heavy', 'glow_r', true), bossTyrant: s1.bossTyrant, bossVacuum: s2.bossVacuum, bossFridge: s3.bossFridge, bossRoller: s4.bossRoller, bossSky: s5.bossSky, bossTitan: s6.bossTitan, bossEater: s6.bossEater,
};
export const PROPS: Record<string, PropBuilder> = {
  brick: s0.brick, steel: s0.steel, bush: s0.bush, water: () => s0.water(), crate: () => army.crate(), hq: () => army.hq(), steelWall: s0.steelWall,
  block: s1.block, book: s1.book, crayon: s1.crayon, furnitureLeg: () => s1.furnitureLeg(), marble: s1.marble, slipper: s2.slipper, pillow: s2.pillow,
  bed: () => s2.bed(), wardrobe: () => s2.wardrobe(), desk: () => s2.desk(), shelf: () => s2.shelf(), box: s2.box, bookStack: s2.bookStack, toyDebris: s2.toyDebris,
  clutter: s3.clutter, houseWall: () => s3.houseWall(), sofa: s3.sofa, table: () => s3.table(), fridge: () => s3.fridge(), tvStand: () => s3.tvStand(), plant: s3.plant, armchair: s3.armchair, stove: () => s3.stove(),
  car: s4.car, house: s4.house, tree: s4.tree, midrise: s5.midrise, tower: s5.tower,
  cityDot: s6.cityDot, mountain: s6.mountain, crystal: s6.crystal, volcano: s6.volcano,
};

/** Регистрация моделей других ступеней (модули добавляют себя сами). */
export function register(e: Record<string, Builder>, b: Record<string, Builder>, p: Record<string, PropBuilder>): void {
  Object.assign(ENEMIES, e); Object.assign(BOSSES, b); Object.assign(PROPS, p);
}

function fallback(col: string, n = 12): ModelDef {
  const v = new Vox(n, n, n);
  v.box(1, n - 1, 0, n - 2, 1, n - 1, col);
  return { size: n, parts: [{ name: 'body', vox: v }], foot: [n, n] };
}

/** Упрощённая модель крошечного препятствия (реликвии, вид издалека): одна-две краски, без мелочи. */
const MINI: Record<string, [string, string]> = {
  brick: ['brick', 'brick_l'], steel: ['steel', 'steel_l'], bush: ['leaf', 'leaf_l'], crate: ['wood', 'wood_l'], hq: ['army', 'army_l'],
  steelWall: ['steel', 'steel_l'], block: ['red', 'toy_y'], book: ['fabric_b', 'paper'], crayon: ['red', 'paper'], marble: ['water_l', 'white'],
  furnitureLeg: ['wood_d', 'wood'], slipper: ['pink', 'cream'], pillow: ['white', 'fabric_y'],
};
function mini(kind: string, v: number): ModelDef {
  const [a, b] = MINI[kind] ?? ['concrete', 'concrete_l'];
  const n = 6, x = new Vox(n, n, n);
  if (kind === 'bush' || kind === 'marble') x.sphere(3, 2.6, 3, 2.7, a);
  else { x.box(0, n, 0, n - 1, 0, n, a); x.box(0, n, n - 1.6, n - 1, 0, n, b); }
  void v;
  return { size: n, parts: [{ name: 'body', vox: x }], foot: [n, n] };
}

function drone(): ModelDef {
  const v = new Vox(14, 6, 14);
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) v.seg([7, 2, 7], [7 + a * 5, 2, 7 + b * 5], 0.6, 'gun');
  v.ell(7, 2.5, 7, 3, 1.8, 3, 'teal'); v.set(10, 3, 7, 'lamp_g');
  return { size: 12, parts: [{ name: 'body', vox: v }, { name: 'rotor', vox: rotor(6, 'steel_l', 2), pivot: [7, 0, 7], at: [0, 4, 0] }] };
}

const cache = new Map<string, BuiltModel>();
const defs: Record<string, () => ModelDef> = {};

/** Ключи: tank:<класс>:<поколение>:<игрок>, wreck:<класс>:<поколение>, e:<art>, boss:<art>, prop:<вид>:<вариант>, drone. */
export function model(key: string): BuiltModel {
  let m = cache.get(key);
  if (m) return m;
  const [kind, a, b, c] = key.split(':');
  let def: ModelDef;
  if (defs[key]) def = defs[key]();
  else if (kind === 'tank') def = tankModel(a as TankClass, +b, (+c as 0 | 1));
  else if (kind === 'wreck') def = wreckModel(a as TankClass, +b);
  else if (kind === 'e') def = ENEMIES[a] ? ENEMIES[a]() : fallback('red', 10);
  else if (kind === 'boss') def = BOSSES[a] ? BOSSES[a]() : fallback('purple', 30);
  else if (kind === 'prop') def = PROPS[a] ? PROPS[a](+b || 0) : fallback('concrete');
  else if (kind === 'deco') def = DECO[a] ? DECO[a](+b || 0) : fallback('grass', 4);
  else if (kind === 'mini') def = mini(a, +b || 0);
  else if (kind === 'drone') def = drone();
  else def = fallback('pink');
  m = buildModel(def);
  cache.set(key, m);
  return m;
}

export function hasModel(key: string): boolean { return cache.has(key); }
