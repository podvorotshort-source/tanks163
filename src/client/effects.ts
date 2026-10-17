// Генерация визуальных эффектов из событий симуляции.

import { extFrames } from '../gfx/ext';
import type { Sim } from '../sim/sim';
import type { SimEvent } from '../sim/types';
import type { Camera } from './camera';
import type { Fx } from './fx';
import type { GroundLayer } from './groundLayer';
import { RAMPS } from '../gfx/palette';

type Ev<T extends SimEvent['t']> = Extract<SimEvent, { t: T }>;

const MAT_COL: Record<string, string[]> = {
  brick: ['#a9521f', '#753416', '#d8823a'], steel: ['#959db8', '#636b8a', '#d0d6e8'], concrete: ['#6d6a74', '#938f98', '#4e4b55'],
  wood: ['#875231', '#b57a45', '#5c3722'], plastic: ['#de3a2c', '#2f74e6', '#e8b020', '#3fa232'], glass: ['#7ad8e6', '#d2fbff'],
  fabric: ['#f17fa1', '#ebe5e6', '#7cb8d8'], paper: ['#efd59a', '#c9a265', '#ebe5e6'], bush: ['#55984a', '#367036', '#8cc46a'],
  ice: ['#a8dcf0', '#eafcff'], rock: ['#6d6a74', '#4e4b55'], metal: ['#959db8', '#ebe5e6'], water: ['#2f74bc'], wall: ['#6d6a74'],
};

export function emitShot(fx: Fx, sim: Sim, e: Ev<'shot'>, cam: Camera): void {
  if (!cam.visible(e.x, e.y, e.size * 2)) return;
  const tier = Math.min(7, sim.stageIdx);
  const big = e.w === 'ap' || e.w === 'he';
  // Вспышка у дула.
  const n = e.w === 'mg' ? 1 : big ? 4 + Math.floor(tier / 2) : 2;
  for (let i = 0; i < n; i++) {
    const p = fx.spawn('fire', e.x, e.y);
    const a = e.a + (Math.random() - 0.5) * 0.7;
    const sp = e.size * (big ? 3 : 1.6) * (0.5 + Math.random());
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
    p.r = e.size * (big ? 0.13 : 0.07) * (1 + tier * 0.05); p.r1 = e.size * 0.02; p.life = big ? 0.16 : 0.08; p.drag = 8;
    if (e.p < 0) p.ramp = 'red';
  }
  if (big) {
    fx.light(e.x, e.y, e.size * (1.6 + tier * 0.12), tier >= 6 ? '#7ad8e6' : '#fbc63e', 0.9, 0.08);
    const sm = fx.spawn('smoke', e.x, e.y);
    sm.vx = Math.cos(e.a) * e.size * 1.2; sm.vy = Math.sin(e.a) * e.size * 1.2; sm.r = e.size * 0.1; sm.r1 = e.size * 0.35; sm.life = 0.6; sm.col = '#9a92a0'; sm.alpha = 0.5;
    // Гильза
    if (e.p >= 0) {
      const c = fx.spawn('shell', e.x - Math.cos(e.a) * e.size * 0.3, e.y - Math.sin(e.a) * e.size * 0.3);
      c.vx = Math.cos(e.a + Math.PI / 2) * e.size * 2; c.vy = Math.sin(e.a + Math.PI / 2) * e.size * 2; c.vz = e.size * 1.2; c.r = e.size * 0.05; c.r1 = 1; c.life = 0.8; c.col = '#fbcd4a'; c.va = 20;
    }
    if (e.p >= 0) cam.addShake(0.6 + tier * 0.15);
  } else if (e.w === 'mg') fx.light(e.x, e.y, e.size * 0.6, '#fbc63e', 0.5, 0.05);
  else if (e.w === 'rockets') {
    const sm = fx.spawn('smoke', e.x, e.y);
    sm.r = e.size * 0.1; sm.r1 = e.size * 0.4; sm.life = 0.8; sm.col = '#c8c0c8'; sm.alpha = 0.5;
  } else if (e.w === 'tesla') fx.light(e.x, e.y, e.size * 1.2, '#62cfac', 0.8, 0.1);
}

export function emitExplosion(fx: Fx, sim: Sim, e: Ev<'boom'>, cam: Camera, ground: GroundLayer): void {
  const r = e.r;
  if (!cam.visible(e.x, e.y, r * 1.5)) {
    if (e.kind !== 'tesla') ground.addDecal({ x: e.x, y: e.y, r: r * 0.5, kind: 'scorch', col: '#1a1724', seed: (e.x * 13 + e.y * 7) | 0, a: 0 });
    return;
  }
  const tier = Math.min(7, sim.stageIdx);
  if (e.kind === 'tesla') {
    const ring = fx.spawn('ring', e.x, e.y); ring.r = r * 0.1; ring.r1 = r; ring.life = 0.35; ring.col = '#bdf3dc';
    fx.light(e.x, e.y, r * 1.3, '#62cfac', 1, 0.25);
    for (let i = 0; i < 14; i++) { const p = fx.spawn('pixel', e.x, e.y); const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a) * r * 3; p.vy = Math.sin(a) * r * 3; p.r = 1 / cam.zoom; p.life = 0.3; p.col = '#bdf3dc'; }
    return;
  }
  const plasma = e.kind === 'plasma';
  const ramp = plasma ? 'purple' as const : e.kind === 'enemy' ? 'red' as const : 'fire' as const;
  const k = e.kind === 'boss' || e.kind === 'big' ? 1.5 : 1;
  // Вспышка света
  fx.light(e.x, e.y, r * 2.6 * k, plasma ? '#bb70cc' : '#fbc63e', 1, 0.22 + r * cam.zoom * 0.002);
  // Раскадровка взрыва из внешней графики (если есть) — вместо части частиц.
  const frames = plasma ? 0 : extFrames('fx_explosion');
  if (frames) {
    const p = fx.spawn('anim', e.x, e.y);
    p.text = 'fx_explosion'; p.va = frames; p.r = r * 1.3 * k; p.life = 0.5 + Math.min(0.3, r * cam.zoom * 0.004); p.drag = 0;
  }
  // Огненный шар
  const nf = Math.round(Math.min(26, Math.round(6 + r * cam.zoom * 0.25)) * k * (frames ? 0.4 : 1));
  for (let i = 0; i < nf; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r * 0.6;
    const p = fx.spawn('fire', e.x + Math.cos(a) * d * 0.3, e.y + Math.sin(a) * d * 0.3);
    p.vx = Math.cos(a) * d * 4; p.vy = Math.sin(a) * d * 4 - r * 0.4;
    p.r = r * (0.22 + Math.random() * 0.2); p.r1 = r * 0.05; p.life = 0.3 + Math.random() * 0.35; p.drag = 5; p.ramp = ramp;
  }
  // Дым
  const ns = Math.min(14, Math.round(3 + r * cam.zoom * 0.12)) * k;
  for (let i = 0; i < ns; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * r * 0.6;
    const p = fx.spawn('smoke', e.x + Math.cos(a) * d, e.y + Math.sin(a) * d);
    p.vx = Math.cos(a) * r * 0.6; p.vy = Math.sin(a) * r * 0.6 - r * 0.5;
    p.r = r * 0.25; p.r1 = r * (0.55 + Math.random() * 0.3); p.life = 0.9 + Math.random() * 0.9; p.drag = 1.5;
    p.col = Math.random() < 0.5 ? '#3a3550' : '#57535f'; p.alpha = 0.55;
  }
  // Искры
  const nk = Math.min(20, Math.round(6 + r * cam.zoom * 0.2));
  for (let i = 0; i < nk; i++) {
    const a = Math.random() * Math.PI * 2, sp = r * (3 + Math.random() * 5);
    const p = fx.spawn('spark', e.x, e.y);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = 0.25 + Math.random() * 0.35; p.drag = 3;
  }
  // Ударная волна
  const ring = fx.spawn('ring', e.x, e.y);
  ring.r = r * 0.3; ring.r1 = r * 1.25; ring.life = 0.28; ring.col = plasma ? '#ecb4ef' : '#fff4b0'; ring.alpha = 0.8;
  if (tier >= 4 && (e.kind === 'he' || e.kind === 'rocket' || e.kind === 'big')) { const r2 = fx.spawn('ring', e.x, e.y); r2.r = r * 0.5; r2.r1 = r * 1.8; r2.life = 0.45; r2.col = '#ebe5e6'; r2.alpha = 0.4; }
  // Воронка
  ground.addDecal({ x: e.x, y: e.y, r: r * 0.55, kind: r * cam.zoom > 10 ? 'crater' : 'scorch', col: '#141318', seed: (e.x * 13 + e.y * 7) | 0, a: 0 });
}

export function emitHit(fx: Fx, sim: Sim, e: Ev<'hit'>, cam: Camera, numbers: boolean): void {
  if (!cam.visible(e.x, e.y, 10)) return;
  const n = e.armor === 'heavy' || e.armor === 'structure' ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const p = fx.spawn('spark', e.x + (Math.random() - 0.5) * sim.size * 0.3, e.y + (Math.random() - 0.5) * sim.size * 0.3);
    const a = Math.random() * Math.PI * 2, sp = sim.size * (2 + Math.random() * 4);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = 0.15 + Math.random() * 0.15; p.drag = 6;
  }
  if (numbers && e.dmg > 0 && e.tgt === 'enemy' && (e.crit || fx.texts < 45)) {
    fx.texts++;
    const p = fx.spawn('text', e.x + (Math.random() - 0.5) * sim.size * 0.5, e.y - sim.size * 0.3);
    p.text = fmtDmg(e.dmg / sim.tankPower());
    p.col = e.crit ? '#fbcd4a' : e.w === 'fire' ? '#f08a1c' : e.w === 'tesla' ? '#bdf3dc' : '#ebe5e6';
    p.life = e.crit ? 0.8 : 0.55;
    p.scaleText = e.crit ? 2 : 1;
  }
}

/** Урон показываем относительно «силы» танка — числа читаемые на любом масштабе. */
function fmtDmg(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e4) return Math.round(v / 1e3) + 'K';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  if (v >= 10) return String(Math.round(v));
  return v.toFixed(1);
}

export function emitKill(fx: Fx, sim: Sim, e: Ev<'kill'>, cam: Camera, ground: GroundLayer): void {
  if (!cam.visible(e.x, e.y, e.size)) return;
  const sz = e.size;
  if (e.crushed) {
    ground.addDecal({ x: e.x, y: e.y, r: sz * 0.55, kind: 'splat', col: '#24222a', seed: (e.x * 3 + e.y) | 0, a: 0 });
    for (let i = 0; i < 6; i++) {
      const p = fx.spawn('debris', e.x, e.y);
      const a = Math.random() * Math.PI * 2, sp = sz * (2 + Math.random() * 3);
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.vz = sz * 2; p.r = sz * 0.15; p.r1 = sz / 10; p.life = 0.7; p.col = RAMPS.iron[2 + (i % 3)]; p.va = 10;
    }
    return;
  }
  // Взрыв корпуса.
  fx.light(e.x, e.y, sz * 2.2, '#fbc63e', 0.9, 0.18);
  for (let i = 0; i < 8 + Math.min(16, sz * cam.zoom * 0.4); i++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * sz * 0.4;
    const p = fx.spawn('fire', e.x + Math.cos(a) * d, e.y + Math.sin(a) * d);
    p.vx = Math.cos(a) * sz * 2; p.vy = Math.sin(a) * sz * 2 - sz; p.r = sz * 0.25; p.r1 = sz * 0.05; p.life = 0.35 + Math.random() * 0.3; p.drag = 4;
  }
  for (let i = 0; i < 5; i++) {
    const p = fx.spawn('smoke', e.x, e.y);
    p.vx = (Math.random() - 0.5) * sz * 1.5; p.vy = -sz * (0.5 + Math.random()); p.r = sz * 0.2; p.r1 = sz * 0.6; p.life = 1.2; p.col = '#3a3550'; p.alpha = 0.6;
  }
  for (let i = 0; i < 6 + Math.min(10, sz * cam.zoom * 0.2); i++) {
    const p = fx.spawn('debris', e.x, e.y);
    const a = Math.random() * Math.PI * 2, sp = sz * (2 + Math.random() * 4);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.vz = sz * (1 + Math.random() * 2); p.r = sz * (0.06 + Math.random() * 0.1); p.r1 = sz / 10; p.life = 0.8 + Math.random() * 0.6; p.col = RAMPS.iron[1 + (i % 4)]; p.va = (Math.random() - 0.5) * 30;
  }
  const ring = fx.spawn('ring', e.x, e.y); ring.r = sz * 0.2; ring.r1 = sz * 0.9; ring.life = 0.25; ring.col = '#fff4b0';
  if (!e.air) ground.addDecal({ x: e.x, y: e.y, r: sz * 0.5, kind: 'scorch', col: '#141318', seed: (e.x * 5 + e.y * 11) | 0, a: 0 });
  if (sz * cam.zoom > 20) cam.addShake(Math.min(8, sz * cam.zoom * 0.06));
}

export function emitPropBreak(fx: Fx, sim: Sim, e: Ev<'propBreak'>, cam: Camera, ground: GroundLayer): void {
  const cols = MAT_COL[e.mat] ?? MAT_COL.concrete;
  const sz = Math.max(e.w, e.h);
  ground.addDecal({ x: e.x, y: e.y, r: sz * 0.5, kind: 'rubble', col: cols[0], seed: (e.x + e.y * 3) | 0, a: 0 });
  if (!cam.visible(e.x, e.y, sz)) return;
  const n = Math.min(14, 4 + Math.round(sz * cam.zoom * 0.3));
  for (let i = 0; i < n; i++) {
    const p = fx.spawn('debris', e.x + (Math.random() - 0.5) * e.w, e.y + (Math.random() - 0.5) * e.h);
    const a = Math.random() * Math.PI * 2, sp = sz * (1 + Math.random() * 2) + sim.size;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.vz = sz * (0.5 + Math.random()) + sim.size; p.r = Math.max(sz * 0.12, 1.2 / cam.zoom); p.r1 = sz / 12; p.life = 0.6 + Math.random() * 0.5; p.col = cols[i % cols.length]; p.va = (Math.random() - 0.5) * 30;
  }
  for (let i = 0; i < 3; i++) {
    const p = fx.spawn('dust', e.x, e.y);
    p.vx = (Math.random() - 0.5) * sz * 2; p.vy = (Math.random() - 0.5) * sz * 2; p.r = sz * 0.3; p.r1 = sz * 0.8; p.life = 0.7; p.col = '#9a92a0'; p.alpha = 0.45;
  }
}

export function emitAbility(fx: Fx, sim: Sim, e: Ev<'ability'>, cam: Camera): void {
  const s = sim.size;
  switch (e.id) {
    case 'dash':
      for (let i = 0; i < 8; i++) { const p = fx.spawn('dust', e.x, e.y); p.vx = (Math.random() - 0.5) * s * 4; p.vy = (Math.random() - 0.5) * s * 4; p.r = s * 0.2; p.r1 = s * 0.5; p.life = 0.5; p.col = '#c8c0c8'; p.alpha = 0.5; }
      break;
    case 'volley': case 'shockwave': case 'emp': {
      const r = fx.spawn('ring', e.x, e.y); r.r = s * 0.5; r.r1 = s * (e.id === 'emp' ? 6 : 4); r.life = 0.4; r.col = e.id === 'emp' ? '#bdf3dc' : '#fff4b0';
      fx.light(e.x, e.y, s * 5, e.id === 'emp' ? '#62cfac' : '#fbc63e', 0.8, 0.25);
      cam.addShake(4);
      break;
    }
    case 'fortress': case 'overdrive': case 'repair': {
      const r = fx.spawn('ring', e.x, e.y); r.r = s * 1.2; r.r1 = s * 0.4; r.life = 0.4; r.col = e.id === 'repair' ? '#6ccc4a' : '#fbcd4a';
      break;
    }
    default: {
      const r = fx.spawn('ring', e.x, e.y); r.r = s * 0.3; r.r1 = s * 1.5; r.life = 0.3; r.col = '#ebe5e6';
    }
  }
}
