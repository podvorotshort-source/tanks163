// Игровая сцена: симуляция + ввод + камера + отрисовка + звук + переходы.

import type { Scene } from '../app';
import { app } from '../app';
import { Sim, type RunConfig, type PlayerCmd, TRANSITION_SWITCH, TRANSITION_TIME } from '../sim/sim';
import { DT, TANK_BASE, STAGE_GROWTH, type SimEvent } from '../sim/types';
import { Camera } from './camera';
import { GroundLayer, type Relic } from './groundLayer';
import { Fx } from './fx';
import { Hud } from './hud';
import { LevelUpUI } from './levelup';
import { drawWorld, drawWorldLabels, type RenderCtx } from './render';
import { input } from '../input/input';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { STAGE_DEFS } from '../sim/content/stages';
import { BOSSES } from '../sim/bosses';
import { POWERUP_INFO } from '../sim/powerups';
import { WEAPONS } from '../sim/content/weapons';
import { UI } from '../gfx/palette';
import { drawText } from '../gfx/font';
import { makeCanvas } from '../gfx/screen';
import { groundAt } from '../gfx/art/ground';
import { propDef } from '../gfx/art/props';
import { rasterize } from '../gfx/raster';
import { easeInOutCubic, clamp } from '../core/math';
import { setDisplayTier, tierOf, TIER_NAMES, TIER_ROMAN } from './tiers';
import { PauseMenu } from './pause';
import { settings } from '../meta/settings';
import { emitExplosion, emitKill, emitPropBreak, emitShot, emitHit, emitAbility } from './effects';
import { Ending } from './ending';

/** Постепенная отрисовка картинки поверхности (чтобы не было подвисаний). */
class Painter {
  canvas: HTMLCanvasElement;
  private img: ImageData;
  private d: Uint32Array;
  private row = 0;
  done = false;
  constructor(public w: number, public h: number, private fn: (x: number, y: number) => number, private after?: (ctx: CanvasRenderingContext2D) => void) {
    this.canvas = makeCanvas(w, h);
    this.img = this.canvas.getContext('2d')!.createImageData(w, h);
    this.d = new Uint32Array(this.img.data.buffer);
  }
  step(budgetMs: number): void {
    if (this.done) return;
    const end = performance.now() + budgetMs;
    while (this.row < this.h && performance.now() < end) {
      const o = this.row * this.w;
      for (let x = 0; x < this.w; x++) this.d[o + x] = this.fn(x, this.row);
      this.row++;
    }
    if (this.row >= this.h) {
      const ctx = this.canvas.getContext('2d')!;
      ctx.putImageData(this.img, 0, 0);
      this.after?.(ctx);
      this.done = true;
    }
  }
  finish(): void {
    this.step(1e9);
  }
}

interface TransitionFx {
  from: number;
  /** Снимок старой арены (1 px = G старых единиц) — без препятствий (реликвия). */
  snap: Painter;
  /** Снимок с препятствиями — для кинематографичного отъезда. */
  snapFull: HTMLCanvasElement | null;
  /** Обзор нового мира (1 px = 4 новых единицы). */
  overview: Painter;
  ovX0: number;
  ovY0: number;
  ovW: number;
  ovH: number;
  startZoom: number;
  evolved: boolean;
  titled: boolean;
  revealed: boolean;
}

export class GameScene implements Scene {
  readonly id = 'game';
  sim: Sim;
  cam = new Camera();
  /** Та же камера в пикселях интерфейса (для подписей, указателей). */
  ucam = new Camera();
  ground = new GroundLayer();
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
    this.ground.reset(this.sim.stageIdx, null);
    this.hud.showFps = settings.data.showFps;
  }

  enter(): void {
    const s = app.screen;
    this.cam.setScreen(s.ww, s.wh);
    this.syncCamera(1);
    this.ground.prewarm(this.cam, this.cam.zoom);
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
    const z = this.gameplayZoom();
    this.zoomSmooth = k >= 1 ? z : this.zoomSmooth + (z - this.zoomSmooth) * k;
    this.cam.zoom = this.zoomSmooth;
    // Центр: плавно к центру видимой области симуляции, с ограничением арены по экрану.
    const s = sim.stage;
    const hw = this.cam.w / 2 / this.cam.zoom, hh = this.cam.h / 2 / this.cam.zoom;
    let tx = sim.viewX, ty = sim.viewY;
    tx = s.w > hw * 2 ? clamp(tx, hw, s.w - hw) : s.w / 2;
    ty = s.h > hh * 2 ? clamp(ty, hh, s.h - hh) : s.h / 2;
    if (k >= 1) { this.cam.x = tx; this.cam.y = ty; } else { this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k; }
  }

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
    this.cam.update(dt, settings.data.shake);
    this.engineSound();
    if (sim.state === 'gameover') {
      this.endT += dt;
      if (this.endT > 3.2) this.finish(false);
    }
    if (sim.state === 'victory') {
      this.endT += dt;
      if (!this.ending) this.ending = new Ending(sim);
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

  private pan(x: number): number {
    return clamp((this.cam.sxOf(x) / this.cam.w) * 2 - 1, -0.9, 0.9) * 0.6;
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
          for (let i = 0; i < 6; i++) setTimeout(() => emitExplosion(this.fx, sim, { t: 'boom', x: e.x + (Math.random() - 0.5) * sim.size * 3, y: e.y + (Math.random() - 0.5) * sim.size * 3, r: sim.size * (1.5 + Math.random()), kind: 'boss', p: -1 }, this.cam, this.ground), i * 180);
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
    // Пламя огнемётов (снаряды «flame» — частицами).
    for (const s of sim.shots) {
      if (s.kind !== 'flame' || s.dead) continue;
      if (Math.random() < 0.6) {
        const p = fx.spawn('fire', s.x, s.y);
        p.vx = s.vx * 0.3; p.vy = s.vy * 0.3; p.r = sim.size * 0.12; p.r1 = sim.size * 0.3; p.life = 0.25 + Math.random() * 0.15; p.drag = 4;
      }
    }
    // Горящие враги.
    for (const e of sim.enemies) {
      if (e.burnT > 0 && Math.random() < dt * 14) {
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
      if (Math.random() < dt * 9) {
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
      if (Math.random() < 0.4) { const f = fx.spawn('fire', p.x + (Math.random() - 0.5) * sim.size * 0.4, p.y); f.vy = -sim.size * 0.6; f.r = sim.size * 0.1; f.r1 = 0.5; f.life = 0.4; }
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
    const sim = this.sim;
    const from = sim.transition!.from;
    const old = STAGE_DEFS[from], next = STAGE_DEFS[from + 1];
    const G = STAGE_GROWTH;
    const ground = this.ground;
    // Снимок старой арены: 1 px = G старых ед. (= 1 новая единица).
    const sw = Math.round(old.w / G), sh = Math.round(old.h / G);
    const relicPrev = ground.relic;
    const props = sim.props.props.filter(p => !p.dead);
    const fx: TransitionFx = { snapFull: null } as unknown as TransitionFx;
    const snap = new Painter(sw, sh, (x, y) => {
      return groundAt(from, (x + 0.5) * G, (y + 0.5) * G, 1 / G);
    }, ctx => {
      ctx.imageSmoothingEnabled = false;
      if (relicPrev) ctx.drawImage(relicPrev.canvas, relicPrev.x0 / G, relicPrev.y0 / G, relicPrev.w / G, relicPrev.h / G);
      // Воронки и гарь прежней арены остаются на «реликвии».
      ground.drawDecalsInto(snap.canvas, 1 / G);
      // Для кинематографичного отъезда — копия с препятствиями (в игре они станут настоящими).
      const full = makeCanvas(sw, sh);
      const fc = full.getContext('2d')!;
      fc.imageSmoothingEnabled = false;
      fc.drawImage(snap.canvas, 0, 0);
      for (const p of props) {
        const img = rasterize(propDef(p.kind, p.w, p.h, p.v), 1 / G, 0, 0);
        const c = makeCanvas(img.w, img.h);
        c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data.buffer as ArrayBuffer), img.w, img.h), 0, 0);
        fc.drawImage(c, Math.round(p.x / G - img.w / 2), Math.round(p.y / G - img.h / 2));
      }
      fx.snapFull = full;
      void ctx;
    });
    // Обзор нового мира вокруг: 1 px = 4 новых ед.
    const ovW = next.w * 1.5, ovH = next.h * 1.5;
    const ovX0 = next.w / 2 - ovW / 2, ovY0 = next.h / 2 - ovH / 2;
    const k = 4;
    const overview = new Painter(Math.round(ovW / k), Math.round(ovH / k), (x, y) => groundAt(from + 1, ovX0 + (x + 0.5) * k, ovY0 + (y + 0.5) * k, 1 / k));
    return Object.assign(fx, { from, snap, overview, ovX0, ovY0, ovW, ovH, startZoom: this.cam.zoom, evolved: false, titled: false, revealed: false });
  }

  private transitionCamera(dt: number): void {
    const sim = this.sim;
    const tr = sim.transition!;
    if (!this.trans || this.trans.from !== tr.from) {
      this.trans = this.startTransitionFx();
      audio.play('whoosh');
    }
    const T = this.trans;
    // Готовим картинки в фоне.
    if (!T.snap.done) T.snap.step(5);
    else if (!T.overview.done) T.overview.step(5);
    const G = STAGE_GROWTH;
    const t = tr.t;
    const old = STAGE_DEFS[T.from], next = STAGE_DEFS[T.from + 1];
    if (!tr.switched) {
      // Фаза A–B: отъезд в старых координатах.
      if (t > TRANSITION_SWITCH - 0.3) { T.snap.finish(); T.overview.finish(); }
      const u = clamp((t - 1.2) / (TRANSITION_SWITCH - 1.2), 0, 1);
      const zEnd = T.startZoom / 24;
      this.cam.zoom = T.startZoom * Math.pow(zEnd / T.startZoom, easeInOutCubic(u));
      const tx = old.w / 2 + (next.w / 2 - next.relicX) * G, ty = old.h / 2 + (next.h / 2 - next.relicY) * G;
      this.cam.x += ((u > 0 ? tx * easeInOutCubic(u) + sim.viewX * (1 - easeInOutCubic(u)) : sim.viewX) - this.cam.x) * Math.min(1, dt * 4);
      this.cam.y += ((u > 0 ? ty * easeInOutCubic(u) + sim.viewY * (1 - easeInOutCubic(u)) : sim.viewY) - this.cam.y) * Math.min(1, dt * 4);
      if (u > 0.4 && !T.revealed) { T.revealed = true; audio.play('reveal'); }
    } else {
      // Переключились: новые единицы. Сброс поверхности с реликвией.
      if (this.ground.stage !== sim.stageIdx) {
        const relic: Relic = { canvas: T.snap.canvas, x0: next.relicX - old.w / G / 2, y0: next.relicY - old.h / G / 2, w: old.w / G, h: old.h / G };
        this.ground.reset(sim.stageIdx, relic);
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
        // Готовим куски поверхности для конечного масштаба.
        const saveZ = this.cam.zoom, sx = this.cam.x, sy = this.cam.y;
        this.cam.zoom = target; this.cam.x = sim.viewX; this.cam.y = sim.viewY;
        this.ground.prewarmStep(this.cam, target, 6);
        this.cam.zoom = saveZ; this.cam.x = sx; this.cam.y = sy;
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

  /** Мир — в холсте высокого разрешения. */
  renderWorld(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    const W = s.ww, H = s.wh;
    ctx.fillStyle = '#07060b';
    ctx.fillRect(0, 0, W, H);
    if (this.ending && this.endT > 2.5) return;
    const sim = this.sim;
    const tr = sim.transition;
    const T = this.trans;
    const cinematic = !!(tr && T && ((tr.t > 1.2 && !tr.switched) || (tr.switched && tr.t < 7.6)));
    if (cinematic && T) this.drawTransitionBackdrop(ctx, T);
    const groundAlpha = cinematic && T ? this.chunkAlpha(T) : 1;
    const t0 = performance.now();
    if (groundAlpha > 0) {
      ctx.globalAlpha = groundAlpha;
      this.ground.draw(ctx, this.cam, cinematic ? 2 : 4, cinematic && !(tr?.switched));
      ctx.globalAlpha = 1;
    }
    const t1 = performance.now();
    const rc: RenderCtx = { sim, cam: this.cam, fx: this.fx, alpha: this.alpha, time: this.time, hideProps: cinematic && groundAlpha < 0.5 };
    drawWorld(ctx, rc);
    const t2 = performance.now();
    this.fx.drawLights(ctx, this.cam, add => {
      for (const p of sim.players) if (p.state === 'alive' && (sim.helmetT > 0 || p.fortressT > 0)) add(p.x, p.y, sim.size * 2, '#68a6f0', 0.25);
      for (const pu of sim.pickups) add(pu.x, pu.y, sim.size * 1.6, '#fbcd4a', 0.25);
    });
    vignette(ctx, W, H);
    const t3 = performance.now(), pf = this.perf;
    pf.ground += (t1 - t0 - pf.ground) * 0.05; pf.world += (t2 - t1 - pf.world) * 0.05; pf.lights += (t3 - t2 - pf.lights) * 0.05;
  }

  /** Камера мира в пикселях интерфейса. */
  private syncUiCamera(): Camera {
    const s = app.screen, k = s.w2u, c = this.ucam, w = this.cam;
    c.setScreen(s.w, s.h);
    c.x = w.x; c.y = w.y; c.zoom = w.zoom * k; c.sx = w.sx * k; c.sy = w.sy * k;
    return c;
  }

  /** Интерфейс — прозрачный слой поверх мира. */
  render(ctx: CanvasRenderingContext2D): void {
    const s = app.screen;
    const W = s.w, H = s.h;
    const sim = this.sim;
    const tr = sim.transition;
    const ucam = this.syncUiCamera();
    const cinematic = !!(tr && this.trans && ((tr.t > 1.2 && !tr.switched) || (tr.switched && tr.t < 7.6)));
    if (!cinematic) {
      const rc: RenderCtx = { sim, cam: ucam, fx: this.fx, alpha: this.alpha, time: this.time };
      drawWorldLabels(ctx, rc);
      this.fx.draw(ctx, ucam, 2);
    }
    this.hud.draw(ctx, sim, ucam, W, H, app.fps, !(sim.state !== 'transition' || (tr && tr.t > 7.6)));
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

  private chunkAlpha(T: TransitionFx): number {
    const tr = this.sim.transition!;
    if (!tr.switched) {
      const k = this.cam.zoom / T.startZoom;
      return clamp((k - 0.12) / 0.25, 0, 1);
    }
    const target = this.gameplayZoom();
    const k = this.cam.zoom / target;
    return clamp((k - 0.55) / 0.35, 0, 1);
  }

  /** Фон кинематографичного отъезда: обзор нового мира + снимок старой арены. */
  private drawTransitionBackdrop(ctx: CanvasRenderingContext2D, T: TransitionFx): void {
    const tr = this.sim.transition!;
    const G = STAGE_GROWTH;
    const old = STAGE_DEFS[T.from], next = STAGE_DEFS[T.from + 1];
    const cam = this.cam;
    ctx.imageSmoothingEnabled = false;
    // Перевод «новых» координат в текущие.
    const toCur = (x: number, y: number): [number, number] => (tr.switched ? [x, y] : [old.w / 2 + (x - next.relicX) * G, old.h / 2 + (y - next.relicY) * G]);
    const k = tr.switched ? 1 : G;
    if (T.overview.done) {
      const [x0, y0] = toCur(T.ovX0, T.ovY0);
      ctx.drawImage(T.overview.canvas, Math.round(cam.sxOf(x0)), Math.round(cam.syOf(y0)), Math.round(T.ovW * k * cam.zoom), Math.round(T.ovH * k * cam.zoom));
    }
    if (T.snap.done) {
      const [x0, y0] = toCur(next.relicX - old.w / G / 2, next.relicY - old.h / G / 2);
      const w = (old.w / G) * k * cam.zoom, h = (old.h / G) * k * cam.zoom;
      ctx.drawImage(T.snapFull ?? T.snap.canvas, Math.round(cam.sxOf(x0)), Math.round(cam.syOf(y0)), Math.round(w), Math.round(h));
      // Подсветка прежней арены, пока она мала.
      if (w < cam.w * 0.6) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.time * 4);
        ctx.strokeStyle = '#fbcd4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(cam.sxOf(x0)) - 1.5, Math.round(cam.syOf(y0)) - 1.5, Math.round(w) + 3, Math.round(h) + 3);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function vignette(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(7,6,11,0)');
  g.addColorStop(1, 'rgba(7,6,11,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export { drawText };
