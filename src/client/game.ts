// Игровая сцена: симуляция + ввод + камера + отрисовка + звук + переходы.

import type { Scene } from '../app';
import { app } from '../app';
import { Sim, type RunConfig, type PlayerCmd, TRANSITION_SWITCH, TRANSITION_TIME, TR_DRIVE1, TR_ABSORB1 } from '../sim/sim';
import { DT, TANK_BASE, STAGE_GROWTH, type SimEvent } from '../sim/types';
import { Camera, ISO_X, ISO_Y, ISO_H } from './camera';
import { IsoWorld, type TransView } from '../iso/world';
import { ART_Z } from '../iso/paint';
import { ABILITIES } from '../sim/content/classes';
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
import { sharedIso } from '../iso/shared';

/** Направление на экране → направление в мире (экранное «вправо» = мировое (1, −1)/√2, «вверх» = (−1, −1)/√2). */
function screenToWorld(sx: number, sy: number): [number, number] {
  const k = Math.SQRT1_2;
  return [(sx + sy) * k, (sy - sx) * k];
}
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

interface TransitionFx {
  from: number;
  evolved: boolean;
  titled: boolean;
  zoomed: boolean;
  switchedCam: boolean;
  view: TransView;
}

export class GameScene implements Scene {
  readonly id = 'game';
  sim: Sim;
  cam = new Camera();
  /** Та же камера в пикселях интерфейса (для подписей, указателей). */
  ucam = new Camera();
  /** Изометрический 3D-мир (создаётся при первом кадре на холсте #gl). */
  get iso(): IsoWorld { return sharedIso(); }
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
    this.iso.clearDecals();
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

  /** Боевой масштаб постоянный: 1 пиксель рисунка = 1 пиксель кадра (чёткий пиксель-арт). */
  private gameplayZoom(): number {
    return ART_Z;
  }

  private syncCamera(k: number): void {
    const sim = this.sim;
    let z = this.gameplayZoom();
    let tx = sim.viewX, ty = sim.viewY;
    // Бой с боссом: масштаб не меняется (пиксели остаются чёткими) — кадр смещается в сторону босса.
    const b = sim.boss;
    if (b && b.hp > 0) {
      const entering = ((b.brain as { entering?: number } | undefined)?.entering ?? 0) > 0;
      const w = entering ? 0.5 : 0.3;
      tx = sim.viewX + (b.x - sim.viewX) * w; ty = sim.viewY + (b.y - sim.viewY) * w;
      const up = b.size * (b.air ? 1.4 : 0.6) * ISO_H, sh = (up * 0.5) / (2 * ISO_Y);
      tx -= sh * w; ty -= sh * w;
    }
    this.zoomSmooth = k >= 1 ? z : this.zoomSmooth + (z - this.zoomSmooth) * k * 0.6;
    this.cam.zoom = this.zoomSmooth;
    // Центр: плавно к центру видимой области симуляции, с ограничением арены по экрану.
    const s = sim.stage;
    // изометрия: край арены может попадать в кадр — там нарисован мир следующей ступени
    tx = clamp(tx, 220, s.w - 220);
    ty = clamp(ty, 160, s.h - 160);
    // Игроки всегда в кадре: у углов арены кадр сдвигается за её край (там нарисован мир следующей ступени).
    // Поля — по осям экрана изометрии, сверху шире (интерфейс).
    const cz = this.cam.zoom, hu = this.cam.w / 2 - 70, vt = this.cam.h / 2 - 90, vb = this.cam.h / 2 - 50;
    for (const p of sim.players) {
      if (p.state !== 'alive' && p.state !== 'down') continue;
      const du = ((p.x - tx) - (p.y - ty)) * ISO_X * cz, dv = ((p.x - tx) + (p.y - ty)) * ISO_Y * cz;
      const su = du > hu ? du - hu : du < -hu ? du + hu : 0, sv = dv > vb ? dv - vb : dv < -vt ? dv + vt : 0;
      if (!su && !sv) continue;
      const ou = su / (ISO_X * cz), ov = sv / (ISO_Y * cz);
      tx += (ou + ov) / 2; ty += (ov - ou) / 2;
    }
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
        // Управление по экрану: «вправо» — вправо по экрану, «вверх» — вверх (изометрия повёрнута на 45°).
        const [mx, my] = screenToWorld(f.moveX, f.moveY);
        return { mx, my, a: [this.pend[i][0], this.pend[i][1], this.pend[i][2]] };
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
    this.iso.pump(sim.state === 'transition' ? 6 : 3);
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
        case 'abilityGot': this.hud.banner(`${sim.players.length > 1 ? (e.p ? '2P: ' : '1P: ') : ''}ТРОФЕЙ — ${ABILITIES[e.id].name.toUpperCase()}`, UI.gold, 3.4, 'Новая способность босса — в свободном слоте'); break;
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
    // Пламя огнемётов: клубы огня летят за струёй и разрастаются.
    for (const s of sim.shots) {
      if (s.kind !== 'flame' || s.dead) continue;
      if (Math.random() < 0.55) {
        const p = fx.spawn('fire', s.x + (Math.random() - 0.5) * sim.size * 0.08, s.y + (Math.random() - 0.5) * sim.size * 0.08);
        p.vx = s.vx * 0.3; p.vy = s.vy * 0.3; p.r = sim.size * 0.07; p.r1 = sim.size * (0.17 + Math.random() * 0.07); p.life = 0.26 + Math.random() * 0.14; p.drag = 4;
      }
      if (Math.random() < 0.08) {
        const p = fx.spawn('ember', s.x, s.y);
        p.vx = s.vx * 0.4 + (Math.random() - 0.5) * sim.size; p.vy = s.vy * 0.4; p.vz = sim.size * 0.6; p.r = 0.6; p.r1 = 0.5; p.life = 0.5; p.drag = 2;
      }
    }
    // Горящие враги: языки пламени на корпусе.
    for (const e of sim.enemies) {
      if (e.burnT <= 0 || Math.random() > dt * 7) continue;
      const p = fx.spawn('flame', e.x + (Math.random() - 0.5) * e.size * 0.5, e.y + (Math.random() - 0.5) * e.size * 0.4);
      p.z = e.size * 0.35; p.r = e.size * (0.35 + Math.random() * 0.2); p.life = 0.5 + Math.random() * 0.3; p.drag = 0;
    }
    // Огонь на земле: гарь с угольками, языки пламени, искры и дым.
    const fire = sim.fire;
    const [vx0, vy0, vx1, vy1] = this.cam.view(fire.cell);
    const now = new Set<number>();
    for (const i of fire.active) {
      now.add(i);
      const [x, y] = fire.centerOf(i);
      if (x < vx0 || y < vy0 || x > vx1 || y > vy1) continue;
      if (!this.burnSeen.has(i)) {
        const c = fx.spawn('char', x + (Math.random() - 0.5) * fire.cell * 0.3, y + (Math.random() - 0.5) * fire.cell * 0.3);
        c.r = fire.cell * (0.85 + Math.random() * 0.3); c.life = fire.burn[i] + 3 + Math.random() * 2; c.drag = 0;
      }
      if (Math.random() < dt * 1.1) {
        const p = fx.spawn('flame', x + (Math.random() - 0.5) * fire.cell * 0.8, y + (Math.random() - 0.5) * fire.cell * 0.8);
        p.r = fire.cell * (0.55 + Math.random() * 0.65); p.life = 0.7 + Math.random() * 0.5; p.drag = 0;
      }
      if (Math.random() < dt * 2) {
        const p = fx.spawn('ember', x + (Math.random() - 0.5) * fire.cell, y + (Math.random() - 0.5) * fire.cell);
        p.vz = fire.cell * (1.5 + Math.random()); p.vx = (Math.random() - 0.5) * fire.cell; p.r = 0.6; p.r1 = 0.5; p.life = 0.7 + Math.random() * 0.4; p.drag = 0.8;
      }
      if (Math.random() < dt * 0.5) {
        const p = fx.spawn('smoke', x, y);
        p.z = fire.cell * 1.5; p.vz = fire.cell * 1.4; p.vx = (Math.random() - 0.5) * fire.cell * 0.6; p.r = fire.cell * 0.3; p.r1 = fire.cell * 0.85; p.life = 1.8; p.col = Math.random() < 0.5 ? '#3a3742' : '#57535f'; p.alpha = 0.8; p.drag = 0.5;
      }
    }
    // Погасшие клетки — следы гари.
    for (const i of this.burnSeen) if (!now.has(i)) {
      const [x, y] = fire.centerOf(i);
      this.ground.addDecal({ x, y, r: fire.cell * 0.7, kind: 'burn', col: '#1a1724', seed: i, a: 0 });
    }
    this.burnSeen = now;
    // Дым и огонь подбитых танков игроков.
    for (const p of sim.players) {
      if (p.state !== 'down' || Math.random() > dt * 10) continue;
      const s = fx.spawn('smoke', p.x, p.y);
      s.z = sim.size * 0.3; s.vz = sim.size * 0.8; s.vx = (Math.random() - 0.5) * sim.size * 0.3; s.r = sim.size * 0.12; s.r1 = sim.size * 0.4; s.life = 1.6; s.col = '#272336'; s.alpha = 0.7; s.drag = 0.5;
      if (Math.random() < 0.35) { const f = fx.spawn('flame', p.x + (Math.random() - 0.5) * sim.size * 0.4, p.y + (Math.random() - 0.5) * sim.size * 0.3); f.z = sim.size * 0.3; f.r = sim.size * 0.3; f.life = 0.6; f.drag = 0; }
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
    const tr = this.sim.transition!;
    return {
      from: tr.from, evolved: false, titled: false, zoomed: false, switchedCam: false,
      view: { from: tr.from, switched: false, tankScale: 1, evolved: false, wreck: { x: tr.bx, y: tr.by, size: tr.bsize, angle: tr.bangle, art: tr.bart, k: 1 }, oldAlpha: 1, marginAlpha: 1 },
    };
  }

  /** Кат-сцена: танк въезжает в обломки босса, поглощает их (облик, сила, размер ×4), камера отъезжает вчетверо,
   *  старая арена становится реликвией нового, заново нарисованного мира. */
  private transitionCamera(dt: number): void {
    const sim = this.sim;
    const tr = sim.transition!;
    if (!this.trans || this.trans.from !== tr.from) this.trans = this.startTransitionFx();
    const T = this.trans, v = T.view;
    const G = STAGE_GROWTH, t = tr.t;
    const old = STAGE_DEFS[T.from], next = STAGE_DEFS[Math.min(7, T.from + 1)];
    this.iso.prebuild(T.from + 1);
    this.iso.pump(6);
    const lead = sim.players.find(p => p.state === 'alive') ?? sim.players[0];
    v.switched = tr.switched;
    if (!tr.switched) {
      // поглощение: обломки тают и втягиваются, танк растёт вчетверо и принимает облик босса
      const ua = clamp((t - TR_DRIVE1) / (TR_ABSORB1 - TR_DRIVE1), 0, 1);
      v.wreck!.k = 1 - easeInOutCubic(ua);
      v.tankScale = 1 + (G - 1) * easeInOutCubic(clamp((ua - 0.25) / 0.75, 0, 1));
      if (ua > 0 && ua < 1) this.absorbFx(dt, lead);
      if (ua > 0.55 && !T.evolved) this.evolveFx(lead);
      v.evolved = T.evolved;
      // отъезд камеры: ×4 (танк остаётся того же размера на экране — он вырос вчетверо)
      const uz = clamp((t - TR_ABSORB1) / (TRANSITION_SWITCH - TR_ABSORB1), 0, 1);
      if (uz > 0 && !T.zoomed) { T.zoomed = true; audio.play('whoosh'); }
      this.cam.zoom = ART_Z / Math.pow(G, easeInOutCubic(uz));
      v.marginAlpha = 1 - clamp((uz - 0.05) / 0.35, 0, 1);
      v.oldAlpha = 1 - clamp((uz - 0.7) / 0.3, 0, 1);
      const fx = t < TR_DRIVE1 ? (lead.x + tr.bx) / 2 : tr.bx, fy = t < TR_DRIVE1 ? (lead.y + tr.by) / 2 : tr.by;
      this.cam.x += (fx - this.cam.x) * Math.min(1, dt * 3);
      this.cam.y += (fy - this.cam.y) * Math.min(1, dt * 3);
    } else {
      if (!T.switchedCam) {
        T.switchedCam = true;
        this.cam.zoom = ART_Z;
        this.cam.x = next.relicX + (this.cam.x - old.w / 2) / G;
        this.cam.y = next.relicY + (this.cam.y - old.h / 2) / G;
        v.tankScale = 1; v.oldAlpha = 0; v.marginAlpha = 0; v.wreck = null;
        setDisplayTier(sim.stageIdx);
        audio.power = sim.stageIdx;
        music.play('reveal');
      }
      if (!T.titled && t > TRANSITION_SWITCH + 0.2) {
        T.titled = true;
        const st = STAGE_DEFS[sim.stageIdx];
        this.hud.banner('МИР СТАЛ ВЧЕТВЕРО БОЛЬШЕ', UI.text, 2.2, undefined, false);
        setTimeout(() => this.hud.banner(st.title + ' · ' + st.subtitle.toUpperCase(), UI.gold, 3.2, undefined, true), 800);
        music.play('stage' + sim.stageIdx);
      }
      this.cam.x += (sim.viewX - this.cam.x) * Math.min(1, dt * 2);
      this.cam.y += (sim.viewY - this.cam.y) * Math.min(1, dt * 2);
    }
    this.zoomSmooth = this.cam.zoom;
    void TRANSITION_TIME;
  }

  /** Поглощение: искры из обломков летят в танк, лёгкая тряска. */
  private absorbFx(dt: number, p: { x: number; y: number; idx: number }): void {
    const w = this.trans!.view.wreck!, n = Math.ceil(dt * 90);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = w.size * 0.45 * w.k * Math.random();
      const sx = w.x + Math.cos(a) * r, sy = w.y + Math.sin(a) * r;
      const s = this.fx.spawn('spark', sx, sy);
      s.vx = (p.x - sx) * 2.4; s.vy = (p.y - sy) * 2.4; s.life = 0.42; s.drag = 0;
      s.col = Math.random() < 0.5 ? (p.idx ? '#7cff5a' : '#ffd23a') : '#ff6a3a';
    }
    this.cam.addShake(2.5);
  }

  /** Миг эволюции: вспышка, кольцо, новый облик и надпись. */
  private evolveFx(p: { x: number; y: number }): void {
    const T = this.trans!, sim = this.sim;
    T.evolved = true;
    const tier = Math.min(7, T.from + 1);
    audio.play('evolve');
    this.cam.addShake(14);
    this.hud.banner('МОДЕЛЬ ' + TIER_ROMAN[tier] + ': ' + TIER_NAMES[tier].toUpperCase(), UI.gold, 3, 'Облик, сила и размер поглощённого босса', true);
    for (let i = 0; i < 40; i++) { const s = this.fx.spawn('spark', p.x, p.y); const a = (i / 40) * Math.PI * 2; s.vx = Math.cos(a) * sim.size * 9; s.vy = Math.sin(a) * sim.size * 9; s.life = 0.7; }
    const r = this.fx.spawn('ring', p.x, p.y); r.r = sim.size; r.r1 = sim.size * 7; r.life = 0.7; r.col = '#fff4b0';
    this.fx.light(p.x, p.y, sim.size * 10, '#fff4b0', 1, 0.6);
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
    this.fx.gl = this.iso.fx;
    this.fx.syncGl(this.cam);
    this.iso.render(sim, this.cam, this.alpha, this.time, sim.state === 'transition' && this.trans ? this.trans.view : null);
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
    const cinematic = finale || !!(tr && this.trans && tr.t > 0.9 && tr.t < TRANSITION_TIME - 0.4);
    if (!cinematic) {
      const rc: RenderCtx = { sim, cam: ucam, fx: this.fx, alpha: this.alpha, time: this.time };
      drawWorldLabels(ctx, rc);
      this.fx.draw(ctx, ucam, 2);
    }
    if (!finale) this.hud.draw(ctx, sim, ucam, W, H, app.fps, !(sim.state !== 'transition' || (tr && tr.t > TRANSITION_TIME - 0.4)));
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
