// Раскладка листов из docs/ART_PROMPTS.md: какие ключи (имена файлов) стоят
// на листе в порядке чтения — сверху вниз, слева направо.
// Ключ = имя PNG в assets/sprites (см. src/gfx/ext.ts).

export interface SheetLayout {
  /** Ключи в порядке чтения. */
  keys: string[];
  /** Наибольшая сторона результата, px (картинки крупнее уменьшаются). */
  max: number;
  /** Это бесшовная текстура: не резать, только уменьшить. */
  whole?: boolean;
  /** Сетка: сколько объектов в каждом ряду (сверху вниз). Части одного объекта в ячейке склеиваются. */
  rows?: number[];
}

const CLASSES = ['scout', 'assault', 'heavy'];
const grid = (rows: string[], cols: (string | number)[], f: (r: string, c: string | number) => string) =>
  rows.flatMap(r => cols.map(c => f(r, c)));

export const SHEETS: Record<string, SheetLayout> = {
  '01_hulls_1-4': { keys: grid(CLASSES, [1, 2, 3, 4], (r, c) => `hull_${r}_${c}`), rows: [4, 4, 4], max: 192 },
  '02_hulls_5-8': { keys: grid(CLASSES, [5, 6, 7, 8], (r, c) => `hull_${r}_${c}`), rows: [4, 4, 4], max: 192 },
  '03_turrets': { keys: grid(['ap', 'he', 'mg', 'flame'], [1, 2, 3, 4], (r, c) => `turret_${r}_${c}`), rows: [4, 4, 4, 4], max: 160 },
  '04_modules': { keys: ['rockets', 'mines', 'tesla', 'flame', 'mg', 'ap', 'he', 'ram'].map(k => `module_${k}`), rows: [4, 4], max: 96 },
  '05_enemies_1-2': {
    keys: ['soldier', 'toyTank', 'jeep', 'heli', 'armorToy', 'mortar', 'bigToy', 'toyBunker',
      'windMouse', 'top', 'rcCar', 'toyRobot', 'plane', 'blockGolem', 'jackBox', 'rcTank'].map(k => `enemy_${k}`),
    rows: [4, 4, 4, 4], max: 192,
  },
  '06_enemies_3-4': {
    keys: ['dustBunny', 'quad', 'vacBot', 'tinTank', 'deskLamp', 'toyTrain', 'bookMortar', 'robotDog',
      'cockroachBot', 'toaster', 'secDrone', 'mixerBot', 'kettle', 'washer', 'tv', 'vacGiant'].map(k => `enemy_${k}`),
    rows: [4, 4, 4, 4], max: 192,
  },
  '07_enemies_5-6': {
    keys: ['infantry', 'apc', 'mbt', 'attackHeli', 'spg', 'armoredCar', 'heavyTank', 'mlrs',
      'carsSwarm', 'walker', 'superTank', 'gunship', 'armoredTrain', 'droneCarrier', 'kamikazeDrone', 'mechTitan'].map(k => `enemy_${k}`),
    rows: [4, 4, 4, 4], max: 192,
  },
  '08_enemies_7-8': {
    keys: ['cityBlock', 'crawler', 'dropPod', 'stratoBomber', 'mobileFort', 'silo', 'megaWalker',
      'meteorite', 'contCrawler', 'orbitalSat', 'voidSpider', 'lance', 'moonlet', 'starTitan'].map(k => `enemy_${k}`),
    rows: [4, 3, 4, 3], max: 192,
  },
  '09_bosses_1-2': { keys: ['enemy_bossGeneral', 'enemy_bossTyrant'], rows: [2], max: 512 },
  '09_bosses_3-4': { keys: ['enemy_bossVacuum', 'enemy_bossFridge'], rows: [2], max: 512 },
  '09_bosses_5-6': { keys: ['enemy_bossRoller', 'enemy_bossSky'], rows: [2], max: 512 },
  '09_bosses_7-8': { keys: ['enemy_bossTitan', 'enemy_bossEater'], rows: [2], max: 512 },
  '10_icons': {
    keys: ['p_star', 'p_clock', 'p_helmet', 'p_grenade', 'p_shovel', 'p_tank', 'p_repair', 'w_ap', 'w_he', 'w_mg', 'w_rockets', 'w_flame',
      'w_mines', 'w_tesla', 'w_ram', 'gear', 'lock', 'trophy'].map(k => `icon_${k}`),
    rows: [6, 6, 6], max: 96,
  },
  '10_icons_2': {
    keys: ['a_dash', 'a_volley', 'a_fortress', 'a_smoke', 'a_repair', 'a_airstrike', 'a_emp', 'a_shockwave', 'a_minefield', 'a_overdrive',
      'a_drone', 'a_wall', 'a_gravity', 's_caliber', 's_loader', 's_explosives', 's_napalmMix', 's_thermite', 's_duration', 's_armor',
      's_engine', 's_optics', 's_luck', 's_tutor', 's_press', 'syn'].map(k => `icon_${k}`),
    rows: [6, 6, 6, 6, 2], max: 96,
  },
  '10_icons_3': {
    keys: ['s_ballistics', 's_hull', 's_regen', 's_tactics', 's_crit', 's_critDmg', 'skull'].map(k => `icon_${k}`),
    rows: [7], max: 96,
  },
  '11_effects': {
    keys: [
      ...[1, 2, 3, 4, 5, 6, 7].map(i => `fx_explosion_${i}`),
      ...[1, 2, 3, 4, 5, 6].map(i => `fx_smoke_${i}`),
      ...[1, 2, 3, 4, 5, 6].map(i => `fx_fire_${i}`),
      ...[1, 2, 3, 4].map(i => `fx_muzzle_${i}`), 'fx_ring', 'fx_lightning',
      'proj_bullet', 'proj_shell', 'proj_rocket', 'proj_plasma', 'proj_laser', 'proj_mine',
    ],
    rows: [7, 6, 6, 6, 6], max: 160,
  },
  '12_props_1-2': {
    keys: ['brick', 'steel', 'bush', 'water', 'toyCube', 'crate', 'hq', 'steelWall',
      'block', 'crayon', 'book', 'marble', 'slipper', 'pillow', 'furnitureLeg'].map(k => `prop_${k}`),
    rows: [4, 4, 4, 3], max: 320,
  },
  '12_props_3-4': {
    keys: ['bed', 'wardrobe', 'desk', 'shelf', 'box', 'bookStack', 'toyDebris',
      'houseWall', 'sofa', 'table', 'fridge', 'tvStand', 'plant', 'armchair', 'stove'].map(k => `prop_${k}`),
    rows: [4, 3, 4, 4], max: 320,
  },
  '12_props_5-6': { keys: ['house', 'tree', 'car', 'tower', 'midrise'].map(k => `prop_${k}`), rows: [3, 2], max: 384 },
  '12_props_7-8': { keys: ['mountain', 'cityDot', 'volcano', 'crystal'].map(k => `prop_${k}`), rows: [2, 2], max: 384 },
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [`13_ground_${i}`, { keys: [`ground_${i}`], max: 1280, whole: true }])),
};

/** Лист по имени файла (без расширения, с учётом вариантов вроде «01_hulls_1-4 (2)»). */
export function sheetFor(name: string): [string, SheetLayout] | null {
  const n = name.toLowerCase().replace(/\.(png|webp|jpe?g)$/, '').trim();
  for (const [k, v] of Object.entries(SHEETS)) if (n === k.toLowerCase() || n.startsWith(k.toLowerCase() + ' ') || n.startsWith(k.toLowerCase() + '_v')) return [k, v];
  return null;
}
