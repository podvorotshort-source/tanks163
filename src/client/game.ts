// Игровая сцена: симуляция + ввод + камера + отрисовка + звук + переходы.

import type { Scene } from '../app';
import { app } from '../app';
import { Sim, type RunConfig, type PlayerCmd, TRANSITION_SWITCH, TRANSITION_TIME } from '../sim/sim';
import { DT, TANK_BASE, STAGE_GROWTH, type SimEvent } from '../sim/types';
import { Camera, ISO_X, ISO_Y, ISO_H } from './camera';
import { IsoWorld } from '../iso/world';
import { Fx } from './fx';
import { Hud } from './hud';
import { LevelUpUI } from './levelup';
import { drawWorld, drawWorldLabels, type RenderCtx } from './render';
import { input } from '../input/input';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { STAGE_DEFS } from '../sim/content/stages';
import { BOSSES } from '../sim/bosses';
import { BOSS_LAND } from './render';
import { POWERUP_INFO } from '../sim/powerups';
import { WEAPONS } from '../sim/content/weapons';
import { UI } from '../gfx/palette';
import { drawText } from '../gfx/font';
import { easeInOutCubic, clamp } from '../core/math';
import { setDisplayTier, tierOf, TIER_NAMES, TIER_ROMAN } from './tiers';
import { PauseMenu } from './pause';
import { settings } from '../meta/settings';
import { emitExplosion, emitKill, emitPropBreak, emitShot, emitHit, emitAbility } from './effects';
import { Ending } from './ending';
import { extFrames } from '../gfx/ext';

interface TransitionFx {
  from: number;
  startZoom: number;
  evolved: boolean;
  titled: boolean;
  revealed: boolean;
  prepared: boolean;
  switchedCam?: boolean;
}

export class GameScene implements Scene {
  readonly id = 'game';
  sim: Sim;
  cam = new Camera();
  /** Та же камера в пикселях интерфейса (для подписей, указателей). */
  ucam = new Camera();
  /** Изометрический 3D-мир (создаётся при первом кадре на холсте #gl). */
  private isoWorld: IsoWorld | null = null;
  get iso(): IsoWorld { return (this.isoWorld ??= new IsoWorld(app.screen.gl)); }
  /** Следы на земле — в 3D-мир. */
  readonly ground = { addDecal: (d: Parameters<IsoWorld['addDecal']>[0]) => this.iso.addDecal(d) };
  fx = new Fx();
  hud = new Hud();
  levelUI = new LevelUpUI();
  pause = new PauseMenu();
  private acc = 0;
  private alpha = 0;
  time = 0;
  private endT = 0;
  private trans: TransitionFx | null = null;
  private burnSeen = new Set<number>();
  /** Колбэк по окончании забега (результаты). */
  onEnd: ((sim: Sim) => void) | null = null;
  private zoomSmooth = 1;
  /** Время частей отрисовки мира, мс (отладка). */
  readonly perf = { ground: 0, world: 0, lights: 0, fx: 0 };
  private pend: [boolean, boolean, boolean][] = [[false, false, false], [false, false, false]];

  constructor(cfg: RunConfig) {
    this.sim = new Sim(cfg);
    input.solo = cfg.players.length === 1;
    setDisplayTier(this.sim.stageIdx);
    this.hud.showFps = settings.data.showFps;
  }

  enter(): void {
    const s = app.screen;
    this.cam.setScreen(s.ww, s.wh);
    this.syncCamera(1);
    this.hud.banner(STAGE_DEFS[this.sim.stageIdx].title + ' · ' + STAGE_DEFS[this.sim.stageIdx].subtitle.toUpperCase(), UI.gold, 3.5, 'Модель ' + TIER_ROMAN[this.sim.stageIdx] + ': ' + TIER_NAMES[this.sim.stageIdx], true);
    music.play('stage' + this.sim.stageIdx);
  }

  exit(): void {
    music.stop();
    audio.stopEngines();
  }

  private engineSound(): void {
    const sim = this.sim;
    const running = sim.state === 'play' && !this.pause.open;
    sim.players.forEach((p, i) => {
      const sp = Math.hypot(p.vx, p.vy) / Math.max(1, p.cls.speed * sim.size);
      audio.engine(i, sp, tierOf(sim.stageIdx), running && p.state === 'alive', this.pan(p.x));
    });
  }

  private gameplayZoom(): number {
    return (app.screen.wunit * TANK_BASE) / this.sim.size;
  }

  private syncCamera(k: number): void {
    const sim = this.sim;
    let z = this.gameplayZoom();
    let tx = sim.viewX, ty = sim.viewY;
    // Бой с боссом: камера отъезжает и держит в кадре и игрока, и босса (при появлении — смотрит на босса).
    const b = sim.boss;
    if (b && b.hp > 0) {
      const entering = ((b.brain as { entering?: number } | undefined)?.entering ?? 0) > 0;
      const w = entering ? 0.55 : 0.32;
      tx = sim.viewX + (b.x - sim.viewX) * w; ty = sim.viewY + (b.y - sim.viewY) * w;
      // модель босса высокая: центр кадра чуть выше, запас сверху
      const up = b.size * (b.air ? 1.6 : 0.85) * ISO_H;
      const sh = (up * 0.5) / (2 * ISO_Y);
      tx -= sh; ty -= sh;
      const fit = (ox: number, oy: number, r: number, u: number) => {
        const ex = Math.abs(ox - oy) * ISO_X + r, ey = Math.abs(ox + oy) * ISO_Y + r * 0.5 + u;
        return Math.min((this.cam.w * 0.44) / Math.max(1, ex), (this.cam.h * 0.42) / Math.max(1, ey));
      };
      const zf = Math.min(fit(b.x - tx, b.y - ty, b.size * 0.6, up * 0.5), fit(sim.viewX - tx, sim.viewY - ty, sim.size * 1.5, 0));
      z = Math.max(z * 0.32, Math.min(z, zf));
    }
    this.zoomSmooth = k >= 1 ? z : this.zoomSmooth + (z - this.zoomSmooth) * k * 0.6;
    this.cam.zoom = this.zoomSmooth;
    // Центр: плавно к центру видимой области симуляции, с ограничением арены по экрану.
    const s = sim.stage;
    const hw = this.cam.w / 2 / this.cam.zoom, hh = this.cam.h / 2 / this.cam.zoom;
    tx = s.w > hw * 2 ? clamp(tx, hw, s.w - hw) : s.w / 2;
    ty = s.h > hh * 2 ? clamp(ty, hh, s.h - hh) : s.h / 2;
    if (k >= 1) { this.cam.x = tx; this.cam.y = ty; } else { this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k; }
  }

  /** Приземление босса: удар, пыль кольцом, воронка. */
  private bossLanding(): void {
    const b = this.sim.boss;
    const ent = ((b?.brain as { entering?: number } | undefined)?.entering ?? 0);
    const above = ent > BOSS_LAND;
    if (b && this.bossAbove && !above && !b.air) {
      const fx = this.fx, cam = this.cam;
      cam.addShake(18);
      input.rumble(0, 1, 0.8, 400); input.rumble(1, 1, 0.8, 400);
      audio.play('boomL', { vol: 1 });
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2, p = fx.spawn('dust', b.x + Math.cos(a) * b.size * 0.4, b.y + Math.sin(a) * b.size * 0.4);
        p.vx = Math.cos(a) * b.size * 1.6; p.vy = Math.sin(a) * b.size * 1.6; p.drag = 3;
        p.r = b.size * 0.08; p.r1 = b.size * 0.22; p.life = 1.1; p.col = '#8a7a66'; p.alpha = 0.7;
      }
      this.ground.addDecal({ x: b.x, y: b.y, r: b.size * 0.55, kind: 'crater', col: '#14111a', seed: (b.id * 2654435761) >>> 0, a: 1 });
    }
    this.bossAbove = !!b && above;
  }
  private bossAbove = false;

  // -------------------------------------------------------------------------

  update(dt: number): void {
    const sim = this.sim;
    const s = app.screen;
    this.cam.setScreen(s.ww, s.wh);
    this.time += dt;
    this.hud.update(dt);
    if (this.pause.open) {
      this.engineSound();
      const r = this.pause.update(dt);
      if (r === 'quit') this.finish(true);
      return;
    }
    if (input.menu.pressed.pause && sim.state !== 'levelup') { this.pause.show(); audio.play('select'); return; }
    if (sim.state === 'levelup') {
      this.engineSound();
      this.levelUI.update(sim, dt);
      this.fx.update(dt * 0.15);
      return;
    }
    // Шаги симуляции.
    let rate = 1;
    if (sim.state === 'transition' && sim.transition && sim.transition.t < 1.2) rate = 0.45;
    this.acc += dt * rate;
    // Нажатия копятся до ближайшего шага симуляции (на 120–144 Гц шаг бывает не в каждом кадре).
    sim.players.forEach((_, i) => {
      const f = input.players[i];
      if (f.pressed.a1) this.pend[i][0] = true;
      if (f.pressed.a2) this.pend[i][1] = true;
      if (f.pressed.a3) this.pend[i][2] = true;
    });
    let steps = 0;
    while (this.acc >= DT && steps < 5) {
      const cmds: PlayerCmd[] = sim.players.map((_, i) => {
        const f = input.players[i];
        return { mx: f.moveX, my: f.moveY, a: [this.pend[i][0], this.pend[i][1], this.pend[i][2]] };
      });
      sim.step(cmds);
      this.handleEvents(sim.events);
      if (steps === 0) { input.consumePressed(); this.pend = [[false, false, false], [false, false, false]]; }
      this.acc -= DT;
      steps++;
      if ((sim.state as string) === 'levelup') { this.acc = 0; break; }
    }
    if (steps === 5) this.acc = 0;
    this.alpha = clamp(this.acc / DT, 0, 1);
    this.fx.update(dt);
    this.ambientFx(dt);
    // Камера.
    if (sim.state === 'transition' && sim.transition) this.transitionCamera(dt);
    else {
      this.trans = null;
      this.syncCamera(Math.min(1, dt * 5));
    }
    this.bossLanding();
    this.cam.update(dt, settings.data.shake);
    this.engineSound();
    if (sim.state === 'gameover') {
      this.endT += dt;
      if (this.endT > 3.2) this.finish(false);
    }
    if (sim.state === 'victory') {
      this.endT += dt;
      if (!this.ending) this.ending = new Ending(sim, this.iso);
      if (this.endT > 1.5) this.ending.prepare(4);
      if (this.endingDone || (this.endT > 10 && (input.menu.pressed.a1 || input.mouse.clicked))) this.finish(false);
    }
  }

  private ending: Ending | null = null;
  private endingDone = false;

  private finish(abandoned: boolean): void {
    if (this.onEnd) {
      const cb = this.onEnd;
      this.onEnd = null;
      this.sim.abandoned = abandoned;
      cb(this.sim);
    }
  }

  // -------------------------------------------------------------------------
  // События симуляции → эффекты и звук
  // -------------------------------------------------------------------------

  /** Панорама звука по экранному положению (изометрия: x − y). */
  private pan(x: number, y = this.cam.cy): number {
    return clamp((this.cam.sxOf(x, y) / this.cam.w) * 2 - 1, -0.9, 0.9) * 0.6;
  }

  private handleEvents(evs: SimEvent[]): void {
    const sim = this.sim, fx = this.fx, cam = this.cam;
    for (const e of evs) {
      switch (e.t) {
        case 'shot': emitShot(fx, sim, e, cam); if (e.p >= 0 || cam.visible(e.x, e.y, 0)) audio.play(e.w === 'enemy' ? 'eshot' : e.w, { pan: this.pan(e.x), gap: e.w === 'mg' ? 55 : 35, vol: e.p >= 0 ? 0.8 : 0.5 }); break;
        case 'boom': {
          emitExplosion(fx, sim, e, cam, this.ground);
          const scr = e.r * cam.zoom;
          if (cam.visible(e.x, e.y, e.r)) {
            audio.play(scr > 60 ? 'boomL' : scr > 18 ? 'boomM' : 'boomS', { pan: this.pan(e.x), vol: Math.min(1, 0.4 + scr / 60), gap: 30 });
            cam.addShake(Math.min(10, scr * (e.kind === 'boss' || e.kind === 'big' ? 0.18 : 0.08)));
          }
          break;
        }
        case 'hit': emitHit(fx, sim, e, cam, settings.data.damageNumbers); if (e.tgt === 'enemy' && e.dmg > 0) audio.play(e.armor === 'heavy' || e.armor === 'structure' ? 'hitArmor' : 'hit', { pan: this.pan(e.x), vol: 0.5, gap: 45 }); break;
        case 'kill': emitKill(fx, sim, e, cam, this.ground); if (cam.visible(e.x, e.y, 0)) audio.play(e.crushed ? 'crush' : 'kill', { pan: this.pan(e.x), vol: Math.min(1, 0.3 + (e.size * cam.zoom) / 40), gap: 30 }); break;
        case 'propBreak': emitPropBreak(fx, sim, e, cam, this.ground); if (cam.visible(e.x, e.y, 0)) audio.play(e.mat === 'glass' ? 'glass' : 'break', { pan: this.pan(e.x), vol: 0.6, gap: 50 }); break;
        case 'crush': for (let i = 0; i < 5; i++) { const p = fx.spawn('dust', e.x, e.y); p.vx = (Math.random() - 0.5) * sim.size * 3; p.vy = (Math.random() - 0.5) * sim.size * 3; p.r = e.size * 0.3; p.r1 = e.size * 0.7; p.life = 0.5; p.col = '#9c7547'; p.alpha = 0.6; } break;
        case 'bump': {
          for (let i = 0; i < 6; i++) { const p = fx.spawn('dust', e.x, e.y); p.vx = (Math.random() - 0.5) * sim.size * 2; p.vy = (Math.random() - 0.5) * sim.size * 2; p.r = sim.size * 0.12; p.r1 = sim.size * 0.4; p.life = 0.45; p.col = '#8a7a66'; p.alpha = 0.55; }
          audio.play('hitArmor', { pan: this.pan(e.x), vol: Math.min(1, 0.35 + e.force * 0.12), gap: 120 });
          cam.addShake(Math.min(4, e.force));
          input.rumble(0, 0.3, 0.2, 90); input.rumble(1, 0.3, 0.2, 90);
          break;
        }
        case 'arc': fx.arc(e.pts.length === 5 ? e.pts.slice(0, 4) : e.pts, e.pts.length === 5 ? '#ea6a3f' : '#bdf3dc', e.pts.length === 5 ? 2 : 1, e.pts.length === 5 ? 0.3 : 0.14); if (e.pts.length !== 5) audio.play('tesla', { gap: 70, vol: 0.6 }); else { audio.play('elaser', { vol: 0.9 }); cam.addShake(3); } break;
        case 'flame': audio.play('flame', { pan: this.pan(e.x), gap: 140 }); break;
        case 'mineDrop': audio.play('mine', { pan: this.pan(e.x), gap: 120, vol: 0.5 }); break;
        case 'pickup': {
          const info = POWERUP_INFO[e.id];
          this.hud.banner(info.name.toUpperCase() + '!', UI.gold, 2, info.text);
          audio.play(e.id === 'star' ? 'star' : e.id === 'clock' ? 'freeze' : e.id === 'helmet' ? 'helmet' : e.id === 'grenade' ? 'grenade' : 'pickup');
          if (e.id === 'grenade') { cam.addShake(12); fx.light(cam.x, cam.y, 9999, '#fff4b0', 1, 0.3); }
          for (let i = 0; i < 16; i++) { const p = fx.spawn('spark', e.x, e.y); const a = (i / 16) * Math.PI * 2; p.vx = Math.cos(a) * sim.size * 5; p.vy = Math.sin(a) * sim.size * 5; p.life = 0.5; p.drag = 3; }
          break;
        }
        case 'levelup': audio.play('levelup'); break;
        case 'ability': emitAbility(fx, sim, e, cam); audio.play(e.id === 'dash' ? 'dash' : e.id === 'emp' ? 'emp' : 'ability', { pan: this.pan(e.x) }); break;
        case 'down': this.hud.banner(`${e.p ? '2P' : '1P'} ПОДБИТ!`, UI.red, 2.4, sim.players.length > 1 ? 'Подъедьте к нему, чтобы спасти' : undefined); audio.play('down'); cam.addShake(8); input.rumble(e.p as 0 | 1, 1, 1, 400); break;
        case 'revived': this.hud.banner(`${e.p ? '2P' : '1P'} СПАСЁН!`, UI.green, 2); audio.play('revive'); break;
        case 'respawn': audio.play('respawn'); break;
        case 'lifeLost': this.hud.banner(`${e.p ? '2P' : '1P'}: −1 ЖИЗНЬ`, UI.red, 2); break;
        case 'out': this.hud.banner(`${e.p ? '2P' : '1P'} ВЫБЫЛ`, UI.red, 3, sim.players.length > 1 ? 'Бонус «Танк» вернёт его в бой' : undefined); break;
        case 'hurt': this.hud.hurtFlash[e.p] = 1; audio.play('hurt', { gap: 140, vol: 0.6 }); input.rumble(e.p as 0 | 1, 0.6, 0.4, 120); break;
        case 'bossSpawn': {
          const def = BOSSES[sim.stage.boss];
          this.hud.banner(e.name.toUpperCase(), UI.red, 4, def?.subtitle, true);
          audio.play('bossIntro');
          music.play('boss');
          cam.addShake(6);
          break;
        }
        case 'bossPhase': this.hud.banner(e.phase === 2 ? 'БОСС В ЯРОСТИ!' : 'БОСС МЕНЯЕТ ТАКТИКУ', UI.orange, 2); audio.play('warn'); cam.addShake(6); break;
        case 'bossDead': {
          audio.play('bossDead');
          cam.addShake(16);
          const R = BOSSES[sim.stage.boss]?.size ?? 280;
          for (let i = 0; i < 14; i++) setTimeout(() => { emitExplosion(this.fx, sim, { t: 'boom', x: e.x + (Math.random() - 0.5) * R * 0.9, y: e.y + (Math.random() - 0.5) * R * 0.9, r: R * (0.15 + Math.random() * 0.15), kind: 'boss', p: -1 }, this.cam, this.ground); this.cam.addShake(8); }, i * 150);
          setTimeout(() => { emitExplosion(this.fx, sim, { t: 'boom', x: e.x, y: e.y, r: R * 0.6, kind: 'boss', p: -1 }, this.cam, this.ground); this.cam.addShake(22); audio.play('boomL', { vol: 1 }); }, 14 * 150 + 120);
          this.hud.banner('БОСС УНИЧТОЖЕН!', UI.gold, 3, undefined, true);
          music.play('victory');
          break;
        }
        case 'warn': this.hud.banner(e.text, UI.red, 2.6); audio.play('warn'); break;
        case 'event': this.hud.banner(e.text, UI.orange, 2.8); audio.play('event'); break;
        case 'weaponGot': this.hud.banner(`${e.p ? '2P' : '1P'}: ${WEAPONS[e.w].name.toUpperCase()}`, e.p ? UI.p2 : UI.p1, 2); break;
        case 'telegraph': break;
        case 'gameover': this.hud.banner('КОНЕЦ ЗАБЕГА', UI.red, 4, undefined, true); audio.play('gameover'); music.stop(); break;
        case 'victory': this.hud.banner('ПОБЕДА!', UI.gold, 5, 'Мир спасён на всех масштабах', true); audio.play('victory'); break;
        case 'stageStart': break;
      }
    }
  }

  /** Постоянные эффекты: горение, дым подбитых, пламя огнемёта. */
  private ambientFx(dt: number): void {
    const sim = this.sim, fx = this.fx;
    if (sim.state === 'levelup') return;
    // Огонь — раскадровкой fx_fire_1..N из внешней графики (если есть), иначе частицами.
    const fireN = extFrames('fx_fire');
    const fireAnim = (x: number, y: number, r: number, life: number) => {
      const p = fx.spawn('anim', x, y);
      p.text = 'fx_fire'; p.va = fireN; p.r = r; p.life = life;
      return p;
    };
    // Пламя огнемётов (снаряды «flame» — частицами).
    for (const s of sim.shots) {
      if (s.kind !== 'flame' || s.dead) continue;
      if (fireN) {
        if (Math.random() < 0.2) {
          const p = fireAnim(s.x, s.y, sim.size * (0.13 + Math.random() * 0.06), 0.26 + Math.random() * 0.1);
          p.vx = s.vx * 0.3; p.vy = s.vy * 0.3; p.drag = 4; p.grow = 1;
        }
      } else if (Math.random() < 0.6) {
        const p = fx.spawn('fire', s.x, s.y);
        p.vx = s.vx * 0.3; p.vy = s.vy * 0.3; p.r = sim.size * 0.12; p.r1 = sim.size * 0.3; p.life = 0.25 + Math.random() * 0.15; p.drag = 4;
      }
    }
    // Горящие враги.
    for (const e of sim.enemies) {
      if (e.burnT > 0 && fireN && Math.random() < dt * 4) {
        const p = fireAnim(e.x + (Math.random() - 0.5) * e.size * 0.5, e.y + (Math.random() - 0.5) * e.size * 0.5, e.size * (0.18 + Math.random() * 0.08), 0.45 + Math.random() * 0.2);
        p.vy = -e.size * 0.35; p.drag = 1;
      } else if (e.burnT > 0 && !fireN && Math.random() < dt * 14) {
        const p = fx.spawn('fire', e.x + (Math.random() - 0.5) * e.size * 0.6, e.y + (Math.random() - 0.5) * e.size * 0.6);
        p.vy = -e.size * 0.6; p.r = e.size * 0.12; p.r1 = e.size * 0.04; p.life = 0.4; p.drag = 1;
      }
    }
    // Огонь на земле.
    const fire = sim.fire;
    const [vx0, vy0, vx1, vy1] = this.cam.view(fire.cell);
    const now = new Set<number>();
    for (const i of fire.active) {
      now.add(i);
      const [x, y] = fire.centerOf(i);
      if (x < vx0 || y < vy0 || x > vx1 || y > vy1) continue;
      if (fireN) {
        if (Math.random() < dt * 2.5) {
          const p = fireAnim(x + (Math.random() - 0.5) * fire.cell * 0.7, y + (Math.random() - 0.5) * fire.cell * 0.7, fire.cell * (0.42 + Math.random() * 0.18), 0.6 + Math.random() * 0.35);
          p.vy = -fire.cell * 0.35; p.drag = 1;
        }
      } else if (Math.random() < dt * 9) {
        const p = fx.spawn('fire', x + (Math.random() - 0.5) * fire.cell, y + (Math.random() - 0.5) * fire.cell);
        p.vy = -fire.cell * 1.2; p.r = fire.cell * 0.32; p.r1 = fire.cell * 0.08; p.life = 0.45 + Math.random() * 0.3; p.drag = 1;
      }
      if (Math.random() < dt * 1.2) {
        const p = fx.spawn('smoke', x, y);
        p.vy = -fire.cell * 1.5; p.vx = (Math.random() - 0.5) * fire.cell; p.r = fire.cell * 0.3; p.r1 = fire.cell; p.life = 1.4; p.col = '#3a3742'; p.alpha = 0.45; p.drag = 0.5;
      }
    }
    // Погасшие клетки — следы гари.
    for (const i of this.burnSeen) if (!now.has(i)) {
      const [x, y] = fire.centerOf(i);
      this.ground.addDecal({ x, y, r: fire.cell * 0.7, kind: 'burn', col: '#1a1724', seed: i, a: 0 });
    }
    this.burnSeen = now;
    // Дым подбитых танков игроков.
    for (const p of sim.players) {
      if (p.state !== 'down' || Math.random() > dt * 10) continue;
      const s = fx.spawn('smoke', p.x, p.y);
      s.vy = -sim.size * 0.8; s.vx = (Math.random() - 0.5) * sim.size * 0.3; s.r = sim.size * 0.15; s.r1 = sim.size * 0.5; s.life = 1.6; s.col = '#272336'; s.alpha = 0.7; s.drag = 0.5;
      if (fireN && Math.random() < 0.25) { const f = fireAnim(p.x + (Math.random() - 0.5) * sim.size * 0.4, p.y, sim.size * 0.22, 0.5); f.vy = -sim.size * 0.4; f.drag = 1; }
      else if (!fireN && Math.random() < 0.4) { const f = fx.spawn('fire', p.x + (Math.random() - 0.5) * sim.size * 0.4, p.y); f.vy = -sim.size * 0.6; f.r = sim.size * 0.1; f.r1 = 0.5; f.life = 0.4; }
    }
    // Выхлоп танков на ходу, следы.
    for (const p of sim.players) {
      if (p.state !== 'alive' || !p.moving) continue;
      if (Math.random() < dt * 8) {
        const bx = p.x - Math.cos(p.angle) * sim.size * 0.5, by = p.y - Math.sin(p.angle) * sim.size * 0.5;
        const s = fx.spawn('dust', bx, by);
        s.vx = -Math.cos(p.angle) * sim.size * 0.5; s.vy = -Math.sin(p.angle) * sim.size * 0.5; s.r = sim.size * 0.08; s.r1 = sim.size * 0.22; s.life = 0.6; s.col = '#57535f'; s.alpha = 0.35;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Переход между масштабами
  // -------------------------------------------------------------------------

  private startTransitionFx(): TransitionFx {
    return { from: this.sim.transition!.from, startZoom: this.cam.zoom, evolved: false, titled: false, revealed: false, prepared: false };
  }

  private transitionCamera(dt: number): void {
    const sim = this.sim;
    const tr = sim.transition!;
    if (!this.trans || this.trans.from !== tr.from) {
      this.trans = this.startTransitionFx();
      audio.play('whoosh');
    }
    const T = this.trans;
    // Мир следующей ступени собираем заранее, пока камера отъезжает (без рывка в момент переключения).
    if (!T.prepared && tr.t > 1.4) { T.prepared = true; this.iso.prebuild(T.from + 1); }
    const G = STAGE_GROWTH;
    const t = tr.t;
    const old = STAGE_DEFS[T.from], next = STAGE_DEFS[T.from + 1];
    if (!tr.switched) {
      // Фаза A–B: отъезд в старых координатах.
      const u = clamp((t - 1.2) / (TRANSITION_SWITCH - 1.2), 0, 1);
      const zEnd = T.startZoom / 24;
      this.cam.zoom = T.startZoom * Math.pow(zEnd / T.startZoom, easeInOutCubic(u));
      const tx = old.w / 2 + (next.w / 2 - next.relicX) * G, ty = old.h / 2 + (next.h / 2 - next.relicY) * G;
      this.cam.x += ((u > 0 ? tx * easeInOutCubic(u) + sim.viewX * (1 - easeInOutCubic(u)) : sim.viewX) - this.cam.x) * Math.min(1, dt * 4);
      this.cam.y += ((u > 0 ? ty * easeInOutCubic(u) + sim.viewY * (1 - easeInOutCubic(u)) : sim.viewY) - this.cam.y) * Math.min(1, dt * 4);
      if (u > 0.4 && !T.revealed) { T.revealed = true; audio.play('reveal'); }
    } else {
      // Переключились: новые единицы (3D-мир сменит ступень в ближайшем кадре — внешний мир становится ареной).
      if (!T.switchedCam) {
        T.switchedCam = true;
        this.cam.zoom *= G;
        this.cam.x = next.relicX + (this.cam.x - old.w / 2) / G;
        this.cam.y = next.relicY + (this.cam.y - old.h / 2) / G;
        music.play('reveal');
      }
      const target = this.gameplayZoom();
      const hold0 = TRANSITION_SWITCH, hold1 = 5.4, zin1 = 7.6;
      if (t < hold1) {
        if (!T.titled && t > hold0 + 0.3) {
          T.titled = true;
          const st = STAGE_DEFS[sim.stageIdx];
          this.hud.banner('МИР ОКАЗАЛСЯ БОЛЬШЕ!', UI.text, 2.4, undefined, false);
          setTimeout(() => this.hud.banner(st.title + ' · ' + st.subtitle.toUpperCase(), UI.gold, 3.2, undefined, true), 900);
        }
      } else {
        const u = clamp((t - hold1) / (zin1 - hold1), 0, 1);
        const zWide = (T.startZoom / 24) * G;
        this.cam.zoom = zWide * Math.pow(target / zWide, easeInOutCubic(u));
        this.cam.x += (sim.viewX - this.cam.x) * Math.min(1, dt * 3);
        this.cam.y += (sim.viewY - this.cam.y) * Math.min(1, dt * 3);
        if (u >= 1 && !T.evolved) {
          T.evolved = true;
          setDisplayTier(sim.stageIdx);
          audio.power = sim.stageIdx;
          audio.play('evolve');
          this.hud.banner('МОДЕЛЬ ' + TIER_ROMAN[sim.stageIdx] + ': ' + TIER_NAMES[sim.stageIdx].toUpperCase(), UI.gold, 3, 'Танк стал сильнее', true);
          for (const p of sim.players) {
            for (let i = 0; i < 30; i++) { const s = this.fx.spawn('spark', p.x, p.y); const a = (i / 30) * Math.PI * 2; s.vx = Math.cos(a) * sim.size * 6; s.vy = Math.sin(a) * sim.size * 6; s.life = 0.6; }
            const r = this.fx.spawn('ring', p.x, p.y); r.r = sim.size * 0.5; r.r1 = sim.size * 4; r.life = 0.6; r.col = '#fbcd4a';
            this.fx.light(p.x, p.y, sim.size * 6, '#fff4b0', 1, 0.5);
          }
          music.play('stage' + sim.stageIdx);
        }
      }
      this.zoomSmooth = this.cam.zoom;
    }
    void TRANSITION_TIME;
  }

  // -------------------------------------------------------------------------
  // Отрисовка
  // -------------------------------------------------------------------------

  /** Мир: 3D-изометрия (холст #gl) + 2D-слой эффектов в той же пиксельной сетке (холст мира). */
  renderWorld(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    const W = s.ww, H = s.wh;
    ctx.clearRect(0, 0, W, H);
    if (this.ending && this.endT > 2.5) { this.ending.renderWorld(W, H); return; }
    const sim = this.sim;
    const t0 = performance.now();
    this.iso.render(sim, this.cam, this.alpha, this.time);
    const t1 = performance.now();
    const rc: RenderCtx = { sim, cam: this.cam, fx: this.fx, alpha: this.alpha, time: this.time };
    drawWorld(ctx, rc);
    const t2 = performance.now(), pf = this.perf;
    pf.ground += (t1 - t0 - pf.ground) * 0.05; pf.world += (t2 - t1 - pf.world) * 0.05;
  }

  /** Камера мира в пикселях интерфейса. */
  private syncUiCamera(): Camera {
    const s = app.screen, k = s.w2u, c = this.ucam, w = this.cam;
    c.setScreen(s.w, s.h);
    c.x = w.x; c.y = w.y; c.cx = w.cx; c.cy = w.cy; c.zoom = w.zoom * k; c.sx = w.sx * k; c.sy = w.sy * k;
    return c;
  }

  /** Интерфейс — прозрачный слой поверх мира. */
  render(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    const W = s.w, H = s.h;
    const sim = this.sim;
    const tr = sim.transition;
    const ucam = this.syncUiCamera();
    const finale = sim.state === 'victory' && !!this.ending && this.endT > 2.5;
    const cinematic = finale || !!(tr && this.trans && ((tr.t > 1.2 && !tr.switched) || (tr.switched && tr.t < 7.6)));
    if (!cinematic) {
      const rc: RenderCtx = { sim, cam: ucam, fx: this.fx, alpha: this.alpha, time: this.time };
      drawWorldLabels(ctx, rc);
      this.fx.draw(ctx, ucam, 2);
    }
    if (!finale) this.hud.draw(ctx, sim, ucam, W, H, app.fps, !(sim.state !== 'transition' || (tr && tr.t > 7.6)));
    if (sim.state === 'levelup') this.levelUI.draw(ctx, sim, W, H);
    if (this.pause.open) this.pause.draw(ctx, W, H, sim);
    if (sim.state === 'gameover' && this.endT > 1.5) {
      ctx.globalAlpha = Math.min(1, (this.endT - 1.5) / 1.5);
      ctx.fillStyle = '#07060b';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (sim.state === 'victory' && this.ending && this.endT > 2.5) {
      // Финал: планета — глобус на столе.
      if (this.ending.draw(ctx, W, H, app.time - this.lastEndDraw > 0.2 ? 0 : app.time - this.lastEndDraw)) this.endingDone = true;
      this.lastEndDraw = app.time;
    } else if (sim.state === 'victory' && this.endT > 1.5) {
      ctx.globalAlpha = Math.min(1, (this.endT - 1.5));
      ctx.fillStyle = '#07060b';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  private lastEndDraw = 0;

}

export { drawText };
